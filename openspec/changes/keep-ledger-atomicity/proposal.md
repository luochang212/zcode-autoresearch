# Proposal

## Why

全仓库 review（2026-11-07）轴 1 #3/#4：keep 是两步写——先 `commitExperiment`（git commit）再 `appendLedgerEntry`（账本行，行内含 commit hash，顺序不可换）。第二步失败（ENOSPC、EACCES、进程级故障）时 commit 成为**孤儿**：账本无此 run 行，审计链与 git 历史静默分叉；且重试死胡同——树已干净，下次 keep「无改动可 commit」，而 discard 会回滚到**含孤儿 commit** 的 HEAD，账面记 discard 实际改动已永久落库。另有 index 卫生问题：`commitExperiment` 开头无条件 `git reset -q HEAD` 清空 index，失败路径（无改动可 commit / git commit 被目标仓库 hooks 拒绝）时 index 已被搅乱，返回消息只字未提。

## What Changes

- **append 失败即撤销孤儿 commit**：keep 的 append 抛错时 `git reset -q --mixed <pre-keep HEAD>`（分支退回、index 复位、工作树不动——commit 的改动回到树中呈未暂存态，恰为 keep 前状态），返回错误并保留 pending 快照；修复文件系统问题后重试与首次尝试完全同形
- **撤销也失败时响亮报孤儿**：指明 commit hash 与「无对应账本行」，提示先检查 git log 与账本再继续——绝不静默
- **非 keep 的 append 失败**：无 commit 可撤（回滚已使树复位），返回错误并保留 pending 快照（重试可再 log）
- **index 状况入错误消息**：「无改动可 commit」与「git commit failed」两条失败消息补说明 index 在尝试过程中被清空/实验改动仍暂存，agent 不必靠猜

## 明确不修（worth-fix 判定，留痕防复审）

| 发现                                                      | 判定 | 理由                                                                                                                         |
| --------------------------------------------------------- | ---- | ---------------------------------------------------------------------------------------------------------------------------- |
| 先 append（占位行）后 commit 再回填 hash                  | 不修 | 账本 append-only 无回填语义；占位行破坏「行内 commit 是真实短 hash」的既有序列化约定，且两次写账本的崩溃窗口反而变宽         |
| 两步写合并为单事务（git notes / commit message 反查对账） | 不修 | 需要独立协议设计与迁移；undo-to-pre-head 已把孤儿窗口从「永久静默分叉」缩到「reset 也失败」这一罕上罕，性价比到此为止        |
| 保留用户 index 的暂存态（reset 前快照恢复）               | 不修 | 成功路径语义已文档化且有意（commit 恰好描述本次实验）；快照/恢复 index 引入第二份 index 状态真相源，失败路径说明已满足诚实性 |

## Capabilities

### New Capabilities

（无）

### Modified Capabilities

- `autoresearch/experiment-loop`：新增 requirement「keep 两步写的失败路径」——append 失败撤销孤儿 commit、撤销失败响亮报孤儿、pending 不被失败 log 消费、index 状况入失败消息
