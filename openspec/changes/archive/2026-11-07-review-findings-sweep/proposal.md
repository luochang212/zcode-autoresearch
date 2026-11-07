# Proposal

## Why

全仓 review（2026-11-07）产出 20 项发现，逐项过 worth-fix（真实性判定与价值判定分离，最小复现直击生产函数）后，4 项坐实且值得修、5 项文档级坐实且顺手修、其余判定不修。值得修的四项：

1. **niceTicks 刻度小数位在 2.5 系数步长的整段区间标错（P1，实测复现）**：`dashboard.ts` 的 +1 小数位条件判 `norm === 2.5` 精确相等，而步长选择逻辑在 `norm ∈ (2, 2.5]` 整段都选 2.5 系数。span 0..0.63 时网格线在 0.25、标签渲染 "0.3"；span 0..6.3e-7 时 2.5e-7 标成 7 位小数。触发带宽大（任意 span ∈ [6,7.5)×10ᵏ 全中招），违反「刻度小数位的跨度不变性」requirement 明文（"含 2.5 系数步长多一位"按步长系数而非 norm 精确值）。现有测试只钉住 norm 恰为 2.5 的特例。
2. **legacy crash 占位行污染 baseline/置信度/平台期（P2，实测复现）**：ADR-10（2026-11-01）起 crash 行记 null，但 v0.1.0（2026-09-25 发布）写的是 0 占位行。`rebuildState`/`rebuildHistory`/`confidenceForSegment`/`detectPlateau` 的度量收集只看 `metric != null`，不排 crash 行：实测 legacy 账本（crash-0 → keep 42 → keep 40）的 baseline 为 0（应 42）、confidence 为 20×green 的荒谬值；同一账本 `validateLedger` 零违规（审计侧正确跳过 crash）。spec 明文「crash 行不参与 baseline/best/置信度/平台期计算」，回放侧四个消费点违背该语义。
3. **log 落账成功后 pending 态清除失败 → 重复落账窗口（P2，链条+物理前提实证）**：`appendLedgerEntry` 成功后 `setPendingChecksFailed`/`setPendingObservation` 走 `patchSessionConfig`（writeFileSync，0o444/ENOSPC 即抛，已实测 EACCES）。抛错时行已落账但 handler 报错，agent 重试 → 观测快照未被消费 → 同一观测落两行（run 号连续、metric 相同，审计无法察觉）。这是已修的 keep 两步写（commit→append）的镜像窗口（append→config 重置）。
4. **frozen deny 建议文案循环（P2，结构链审查）**：`FROZEN_REASONS["measure.sh"]` 建议「start over: init_experiment with a new target」，但 init 只重立哈希基线、不解除写保护——照做后重写 measure.sh 仍被 deny；clear → 新目标的文档化路径同样死锁（clear 保留冻结文件，setup 第一步重写即被拒）。ADR-11 把「犯错给指引」定为护栏语义，指引必须指向实际可行的路径。

文档级顺手修（同批，无行为变更）：root/plugin README 的「Anti-cheating / reward hacking」措辞与 ADR-11 威胁模型正面冲突；`autoresearch-hooks` SKILL「No environment variables」与自带示例 `self-check.sh` 读 env 矛盾（`spawnEnv` 透传完整 process.env，已核实）；`loop-protocol.md`「Reset everything with clear_experiments」与工具描述「其余文件保留」打架；`off.md` 未提醒 config.json 须 Edit 单键（整文件 Write 会静默丢 `benchmarkHashes`/`harnessHashes`，护栏静默失明——已核实两条静默重立基线路径）；`stop-continue` 缺省窗口提示只提 userConfig 不可见，`AR_MAX_ITERATIONS` env 同样不可见。

## What Changes

- `dashboard.ts` `niceTicks`：+1 小数位条件改为按步长尾数（`norm ∈ (2, 2.5]`，与步长选择逻辑同一区间），补非精确 2.5 回归
- crash 行回放口径统一：`rebuildState`（baseline/values）、`rebuildHistory`（firstMetric/values）、`confidenceForSegment`、`detectPlateau` 的度量集合跳过 crash 行（含遗留占位行），与 `validateLedger` 及 spec「crash 行不参与」对齐
- `log_experiment`：落账成功后的 pending 态清除包 try/catch——清除失败 SHALL NOT 使已落账的记录报错（报错会诱发重复落账），改为成功收尾 + 显式 `pending_reset_warning` + stderr 诊断，警告指明「勿未重跑 run 就再次 log」
- `frozen.ts` deny 文案：measure.sh 的建议改为实际可行的替换路径（先移除已记录文件再重建 + 新 segment）；`commands/clear.md`、`commands/autoresearch.md` 补新目标需先移除旧冻结文件的说明
- 文档批次：README（root EN/CN + plugin EN/CN）反作弊措辞对齐 ADR-11；hooks skill env 声明修正；loop-protocol "Reset everything" 修正；off.md 补 Edit 单键提醒；stop-continue 提示句补 `AR_MAX_ITERATIONS`

## 明确不修（worth-fix 判定，留痕防复审）

| 发现                                                                                                                       | 判定     | 理由                                                                                                        |
| -------------------------------------------------------------------------------------------------------------------------- | -------- | ----------------------------------------------------------------------------------------------------------- |
| dashboard-server listen 回调竞态（并发 export 泄漏一个监听端口）                                                           | 不修     | 后果≈无：进程内 127.0.0.1 临时端口、内容相同、随进程消亡；修复引入 starting-promise 状态复杂度，期望值为负  |
| `steerFor` 信号死亡的 hook 显示 "exited null"                                                                              | 不修     | 纯文案，触发需外部信号杀 hook，罕见                                                                         |
| dashboard 把 crash/checks_failed 计入 reverted                                                                             | 部分证伪 | `docs/design/dashboard.md` 明文定义该口径（"其余非 noop 的回退记录"）；非 bug                               |
| spec「实验记忆注入」首句把 SessionStart 并入记忆注入                                                                       | 不修     | 同 requirement 后文表述准确，属措辞松散；改 spec 文字需为措辞开 change，不值                                |
| session-start 对损坏 config 视为 active                                                                                    | 不修     | 两个方向各有错法（active 错放提示 / off 错压提示）；hook 只注入指针提示，低风险；损坏 config 在工具层已响亮 |
| status 白名单不独立于 audit（bypass + 拼错 status 落账）                                                                   | 不修     | auditBypass 是文档化的整体退出，跳过此类检查即其语义                                                        |
| 基准只发次级 METRIC 时仅 crash 可落账                                                                                      | 不修     | setup 文档要求 baseline 先行，该错误在 setup 期即暴露（尚无行可落）；改语义属设计决策，触发面窄             |
| directionLabel 40 字符截断致长假设去重碰撞、hooks 5s 超时对超大账本、dispatch 不 await 的流水线交错、finalize 制表符文件名 | 不修     | advisory/推测/极端边缘，无观察到实际失败                                                                    |

## Capabilities

### New Capabilities

（无）

### Modified Capabilities

- `autoresearch/experiment-loop`：「crash 返回值与账本一致」补回放侧排除语义与场景；「keep 两步写的失败路径」补落账成功后 pending 清除失败路径与场景
- `autoresearch/dashboard`：「刻度小数位的跨度不变性」按步长尾数修订条件并补场景；「全量历史渲染」补首测基线跳过 crash 行与场景
- `autoresearch/guardrails`：「会话目录写保护」补 deny 建议文案须指向可行路径
