# Proposal

## Why

全仓库多角度 review（2026-11-07，四轴并行：核心 server、外围 hooks/scripts、文档规范一致性、测试质量）发现的问题中，第一批值得修的四项全部集中在 run 生命周期与跨调用状态机：

1. **`runCommand` 可能无限挂起（P1，已核验）**：`exit` 事件在「未超时」分支直接 return，等 `close` 收尾。若 benchmark 提前退出、但 stdio 管道被脱离进程组的后代进程（daemon 化后代）占住，`close` 永不触发；超时 kill 打不到组外进程，而 `exit` 已消费——Promise 永不 resolve，工具调用无限挂起。这打穿「命令超时」scenario 的明文保证（「工具调用必然返回」）。`runChecks` 走同一 spawn 路径，同样暴露。
2. **spawn 失败分支写 `pendingObservation` 不写 `pendingChecksFailed`（P2）**：上一 run 的陈旧失败判定存活过 spawn 失败的 run。当前靠门禁顺序兜底（快照 metric=null 挡住非 crash 落账），属涌现安全而非设计安全——pending 前缀约定（reset-pending-state-at-boundaries）的本意就是同族键描述同一次 run。
3. **死状态键 `lastRunChecksFailed` / `totalExperiments`（P2）**：`rebuildState` 写、无人读（全仓库 grep 仅类型与测试引用）；且 `lastRunChecksFailed` 与真正门禁用的 `pendingChecksFailed` 是同一事实的两份推导——正是 pending 前缀重置要消灭的漂移模式。
4. **测试客户端 `call()` 无 deadline（P2）**：server 挂起（恰是本仓库重点防守的 bug 类）时整个套件吊死到 CI 超时，无诊断信息。

## What Changes

- `runCommand`：`exit` 时无条件武装有界 fallback finalize（`close` 先到则幂等胜出），同时覆盖「提前退出 + close 不触发」与既有「超时 + close 不触发」两类；`runChecks` 自动受益
- `run_experiment` spawn 失败分支：与快照同点重置 `pendingChecksFailed` 为 false（本次 run 无判定），与正常路径的成对写入对齐
- `rebuildState`/`SessionState`：删除无消费者的 `lastRunChecksFailed` 与 `totalExperiments`（spec 的重置枚举同步修订）
- 测试：`call()` 加默认 30s deadline（可传参覆盖）；新增两个回归测试（滞留 stdio 结算、spawn 失败 sibling 重置）；死键既有测试删除

## 明确不修（worth-fix 判定，留痕防复审）

| 发现                                                                                    | 判定           | 理由                                                                                                      |
| --------------------------------------------------------------------------------------- | -------------- | --------------------------------------------------------------------------------------------------------- |
| 次级度量不绑定观测快照（hard gate 近邻消费可编造数字）                                  | 本 change 不修 | 语义决策未定：绑定意味着「次级度量也须转写观测」，会收紧现有申报自由，需先定政策再立项（候选独立 change） |
| keep 非原子（commit 成功、账本追加失败 → 孤儿 commit）                                  | 本 change 不修 | 需要先设计检测/恢复协议（如 commit-message 反查对账），不是一行修；触发面窄（ENOSPC/进程死亡）            |
| 失败 keep 也 unstage 用户 index                                                         | 本 change 不修 | 成功路径语义已文档化且有意（commit 恰好描述本次实验）；失败路径提示可改进，属 UX 打磨非正确性             |
| 其余 review P3（溢出截断边界、timeout env 校验、JSON-RPC -32700、dashboard CSS 分层等） | 积压           | 无正确性影响，遇相邻改动顺手收                                                                            |

## Capabilities

### New Capabilities

（无）

### Modified Capabilities

- `autoresearch/experiment-loop`：run_experiment 结算保证补全（exit-fallback 场景）；观测快照 requirement 补 spawn 失败 sibling 重置；「实验工具入口前置条件与段边界」的 rebuildState 重置枚举移除 `lastRunChecksFailed`
