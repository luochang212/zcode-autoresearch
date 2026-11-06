# Design

## Context

keep 的两步写（commit → append 行）之间没有原子性保证：append 抛错即孤儿 commit，且重试死胡同（树干净 → 「无改动可 commit」）。undo-to-pre-head 把故障从「永久静默分叉」收敛为「undo 也失败」的罕上罕，同时保住重试闭环。

## Goals / Non-Goals

**Goals**

1. append 失败 → 孤儿 commit 撤销 → 错误返回 + pending 保留 → 重试同形。
2. 撤销失败 → 响亮孤儿警示（hash + 无行）。
3. 失败消息诚实说明 index 状况。

**Non-Goals**

- 不改两步写的顺序（append 先行需占位行/回填语义，破坏行内真实 hash 约定）。
- 不做 index 快照恢复（成功路径语义有意；说明性消息已满足诚实性）。

## Decisions

**D1 `git reset -q --mixed <preHead>` 而非 `reset --hard` / `revert`**。--mixed 移动分支 + 复位 index、工作树不动——commit 的改动精确回到「未暂存修改」态，即 keep 前状态；--hard 会重新改写文件（对 tracked 文件等价，但对 undo 时可能出现的其他未跟踪/已修改状态有破坏面）；revert 产生正向抵消 commit，污染「git 历史即被接受的实验链」（ADR-2）。preHead 在 commitExperiment 之前以 `headSha()` 捕获；init_experiment 拒绝空仓库，preHead 为 null 属防御分支（响亮报孤儿、不尝试 undo）。

**D2 失败路径不消费 pending**。`setPendingChecksFailed(false)`/`setPendingObservation(null)` 都在 append 成功之后（现状即如此），失败分支直接 return——重试闭环免费获得。非 keep 的 append 失败同理（回滚已在 append 前发生，树已复位，重试再走一次回滚是幂等无害的）。

**D3 undo 自身失败也响亮**。reset 抛错（index.lock 争用、对象库损坏）时无法自动恢复一致性，此时唯一诚实的输出是把两个失败原因与孤儿 hash 都摆上桌，让 agent/用户介入——自动重试只会叠加未知态。

**D4 index 说明只进消息，不改顺序**。`reset -q HEAD` 清 index 是成功路径语义的一部分（commit 恰好描述本次实验）；把「unstage 发生过」写进两条失败消息的成本是一句话，收益是 agent 不需要对 index 状态做侦探工作。

## Risks / Trade-offs

- undo 在多用户/多进程同一仓库上与外部 git 操作竞争：与 commit/rollback 既有暴露面同级（仓库规程假定单 agent 持有实验分支），未新增风险类。
- 测试用 chmod 0o444 触发 EACCES：Windows 上 chmod 写位映射只读属性，append 同样抛错，用例跨平台成立。
