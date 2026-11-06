# Design

## Context

全仓库 review（2026-11-07）四项第一批发现，全部落在 run 生命周期与跨调用状态机的交界处。共同主题：**「必然结算」与「同族 pending 键描述同一次 run」这两个不变量各有一个漏网路径**，外加一处已失去消费者的冗余状态推导。

## Goals / Non-Goals

**Goals**

1. `runCommand` 在「进程已退出但 `close` 不触发」时仍有界结算——把「工具调用必然返回」从超时路径扩展到 exit 路径。
2. spawn 失败分支的 pending 家族与正常路径同构：快照 + checks 标记成对写入。
3. 删除 `rebuildState` 的两个无消费者字段，消除「同一事实两份推导」的复发实例。
4. 测试 harness 的 `call()` 有 deadline，server 挂起表现为带诊断的测试失败而非 CI 吊死。

**Non-Goals**

- 不绑定次级度量到观测快照：先定「次级度量是否也须转写观测」的政策再立项（proposal 明确不修表）。
- 不做 keep 原子性（commit/append 对账）：需要独立协议设计。
- 不改超时 kill 语义本身（SIGTERM→SIGKILL 组杀、Windows taskkill 路径均不动）。

## Decisions

**D1 exit 时无条件武装有界 fallback finalize，而不是「exit 即 finalize」**。立即 finalize 会丢掉「close 前排空 stdio」的保证（正常路径的输出完整性依赖 close 语义）。fallback 复用 `KILL_GRACE_MS`（5s）：exit 与 close 的正常间隔是毫秒级，5s 足以让在途数据到达；`close` 先到则幂等胜出，fallback 定时器随 finalize 一并清理。超时路径行为不变（exit 处理器原本就在超时分支武装同一 fallback，现在只是不再要求 `didTimeout` 前置）。`runChecks` 走同一 `runCommand`，自动受益。

**D2 spawn 失败分支显式 `setPendingChecksFailed(false)`，而非 `resetPendingState()` 后重写快照**。语义依据：快照与 checks 标记是**同一次 run 的两个事实**（观测 + 判定），正常路径就是成对写入（server.ts run 尾部先 `setPendingChecksFailed` 再 `setPendingObservation`）；spawn 失败路径补齐成对性即可，与正常路径形状一致。wholesale reset 是**边界**（init/clear）语义——segment 之间不留任何跨段残留；run 与 run 之间是覆盖语义，逐键写「本次 run 的事实」更精确。无判定 → false 的取值依据 `setPendingChecksFailed` 既有注释：checks 未执行是 infra，不得 veto keep。

**D3 删除而非接线死键**。`lastRunChecksFailed` 的唯一语义替身 `pendingChecksFailed` 在 config 侧，且两者语义不同源：前者是「账本最后一条 run 行的 status 派生」（行级事实），后者是「run_experiment 实际执行的 checks 判定」（跨重启机制态，无判定 ≠ false 的区分就在这）。接线意味着让某个消费者改用行级派生——没有这样的消费者。`totalExperiments` 可由 `state.runs` 长度派生（segment 内）或账本行数派生（全局），零消费场景下删除无信息损失。spec 的重置枚举同步修订（「跨 segment 状态重置」scenario 的 checks 断言改指 `pendingChecksFailed`，其边界行为已由 reset-pending-state-at-boundaries 的红测钉住）。

**D4 `call()` deadline 默认 30s、可传参覆盖**。既有最慢调用是 kill 升级链（SIGTERM 1s + KILL_GRACE 5s + 断言余量，<15s）；30s 默认不误伤，慢测试显式传更大的值即自文档化。deadline 到期 reject 并带工具名与超时值，pending map 同步清理避免句柄泄漏。

## Risks / Trade-offs

- exit-fallback 使「极慢排空 stdio 的正常进程」在 5s 后被提前结算：exit 后进程已死，pipe 缓冲中的数据早已被读取（reader 持续在读），唯一「迟到」的数据来源是滞留后代——那正是要放弃等待的对象。可接受。
- spawn 失败路径新增一次 config 写（`setPendingChecksFailed(false)`）：与正常路径的写次数一致，无新增失败模式（patchSessionConfig 已有 `.auto/` 目录创建保证）。
- 删键影响面：`SessionState` 的其他消费者（dashboard 渲染、hooks payload、plateau/confidence）经 grep 确认不读这两个字段；ledger.test.ts 两个针对死键的测试随之删除，其余断言不动。
