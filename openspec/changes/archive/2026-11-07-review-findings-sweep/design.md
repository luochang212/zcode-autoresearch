# Design

## 1. niceTicks：条件挂在步长尾数上，不是 norm 精确值

根因一句话：+1 小数位想表达「步长尾数是 2.5」（0.25、2.5e-7 需要"+1"才装得下），却写成了「归一化跨度恰等于 2.5」，而步长选择把 `(2, 2.5]` 整段都映射到 2.5 系数——判断区间比映射区间窄。

修法：`Math.min(20, -exp + (norm > 2 && norm <= 2.5 ? 1 : 0))`，与 `norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : …` 的选择逻辑共用同一组边界。不改为「从 `String(step)` 推导」：step<1 时 String 是指数字符串（`2.5e-7`），正是上一轮修掉的坑；step≥1 分支已由 String 路径正确处理，不动。

回归钉真实发病带：`niceTicks(0, 0.63)`（step 0.25 → decimals 2，标签 "0.25"）与 `niceTicks(0, 6.3e-7)`（step 2.5e-7 → decimals 8）；既有 `niceTicks(0, 0.25, 1)` 特例保留。

## 2. crash 行回放排除：过滤点收在度量收集处，不改账本

根因一句话：ADR-10 之后「crash 测了 nothing」成了不变量，但只改了写入侧（记 null），四个回放消费点的收集器仍只看 `metric != null`，v0.1.0 时代的 0 占位行就从这条缝漏进 baseline/置信度/平台期。

修法：在收集谓词统一加 `status !== "crash"`——`rebuildState` 的 baseline 判定与 values 收集、`rebuildHistory` 的 firstMetric 判定与 values 收集、`confidenceForSegment`（server.ts，与 rebuildState 同谓词）、`detectPlateau` 的 valid 过滤。**不过滤 runs 主列表**：`consecutiveFailures`/`isStopReached`/best 判定按 status 语义必须看到 crash 行（crash 计失败、keep/noop 之外的 status 不更新 best）。不选「回放时把占位 0 规整为 null」的归一路线：账本 append-only，不改写历史；过滤是只读语义，旧账本在新代码与旧代码间可随时互换。

`detectPlateau` 是纯函数、签名收 `RunLike[]`（status 可缺省）：`r.status !== "crash"` 对缺省 status 的测试形状恒真，不破坏既有调用。

## 3. pending 清除失败：成功收尾 + 显式警告，而非报错

根因一句话：落账是已提交事实，其后的簿记（清 pending）失败把整个调用变成报错，agent 只能重试，而重试的守门人（观测快照）恰是没被清掉的那个——报错本身制造了重复落账。

修法：`setPendingChecksFailed(false)`/`setPendingObservation(null)` 各自 try/catch（一个失败不挡另一个），失败时 stderr 诊断（never-silent）+ 响应附 `pending_reset_warning`，正文三点：行已落账、pending 态未能清除、**在再次 run_experiment 之前勿再次 log**（陈旧快照会被下一次 run 覆盖，这是自愈路径）。不选返回错误：那是本次修的 bug 本身；不选重试写入：本失败类（EACCES/ENOSPC）通常持续存在，重试只会把错误延后。诚实边界：警告后若 agent 无视指引仍 log，重复行仍可发生——协作但会犯错的模型下（ADR-11），显式警告是语义层能做的正确收尾。

字段名取 `pending_reset_warning`（与既有 `warning`（noop 脏树）、`*_warning`（run 侧）不碰撞）。

## 4. deny 建议指向可行路径

`FROZEN_REASONS["measure.sh"]` 的建议改为：先移除已记录的文件（用户手删，或经用户明确授权的命令删除——守卫只保护仍存在于磁盘上的记录），再搭建新基准并 `init_experiment` 开新 segment。goal/scope 的既有文案不动（其建议「用户手改 / 新 segment」本就可行）。`commands/clear.md` 与 `commands/autoresearch.md` 的 setup 分支各补一句：新目标需要不同基准脚本时，先移除旧冻结文件，guard 只拦「已存在文件的改写」。不改 guard 代码语义（判据仍是文件存在性）——这是指引修正，不是放宽。

## 5. 文档批次（无行为变更）

- README（root EN/CN、plugin EN/CN）：「Anti-cheating / reward hacking」→ 完整性 + 错误引导框架（ADR-11 口径），约束条目的功能描述不变
- `skills/autoresearch-hooks/SKILL.md`：「No environment variables」→ 契约在 stdin、不依赖 env（env 实际透传，示例的内部可调参数是例外）
- `references/loop-protocol.md`：「Reset everything」→「clear the ledger（其余 .auto/ 文件保留）」
- `commands/off.md`：补「用 Edit 改单键，勿整文件重写（benchmarkHashes/harnessHashes/pending* 是服务端管理键）」
- `stop-continue.ts` 缺省窗口提示句补「与 AR_MAX_ITERATIONS 环境变量」（memory-inject 的 "X/20" 显示不动——纯展示，口径提示由 Stop 侧承载）

## 测试策略

红→绿：niceTicks 与 crash 回放先以最小脚本坐实现状（已完成，证据在 proposal），修后把同场景翻转为回归（dashboard.test.ts / ledger.test.ts）；pending 清除失败用 mcp-integration 既有 spawn 套路 + `chmodSync(cfg, 0o444)`（Windows runner 无 chmod(1)，套件已用 fs.chmodSync 先例）断言 ok:true + 警告字段 + 账本恰一行；deny 文案变更核对 hooks.test.ts 是否钉了旧句子（无则不新增文案断言，文案语义由 guardrails delta 场景承载）。
