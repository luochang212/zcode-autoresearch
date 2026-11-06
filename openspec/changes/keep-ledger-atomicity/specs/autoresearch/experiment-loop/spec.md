## ADDED Requirements

### Requirement: keep 两步写的失败路径

keep 是两步写：先 git commit（`experiment:` 前缀），再向 `.auto/log.jsonl` 追加含真实短 hash 的 run 行；顺序不可换。账本追加失败 SHALL NOT 留下孤儿 commit：keep 的追加抛错时，工具 SHALL 撤销该 commit 并返回错误、保留 `pendingObservation`；撤销自身失败时 SHALL 响亮返回孤儿 commit hash 与「无对应账本行」警示，SHALL NOT 静默。非 keep 状态的追加失败 SHALL 返回错误并保留 pending 快照。被拒绝的 log SHALL NOT 消费 pending 快照。keep 的两条失败消息（无改动可 commit / git commit failed）SHALL 说明 index 状况。

#### Scenario: 追加失败撤销孤儿 commit

- **WHEN** keep 的 commit 成功后账本追加抛错（如 `.auto/log.jsonl` 不可写）
- **THEN** 以 keep 前 HEAD 执行 `git reset --mixed`（分支退回、index 复位、工作树不动，commit 的改动回到树中呈未暂存态），返回错误说明 commit 已撤销，`pendingObservation` 未被消费

#### Scenario: 修复后重试与首次尝试同形

- **WHEN** 追加失败被撤销后，文件系统问题修复，agent 以同参数重试 log_experiment
- **THEN** keep 正常完成：commit 落库、账本行含新 commit hash、pending 快照被消费

#### Scenario: 撤销失败响亮报孤儿

- **WHEN** 追加失败且 `git reset --mixed` 撤销自身也抛错（或无可撤销的 pre-keep HEAD）
- **THEN** 返回错误同时含追加失败原因、孤儿 commit hash 与「无对应账本行」警示

#### Scenario: 非 keep 追加失败保留快照

- **WHEN** discard 的账本追加抛错（树已由回滚复位）
- **THEN** 返回错误说明无行落账，`pendingObservation` 未被消费，重试可再次落账

#### Scenario: 失败消息说明 index 状况

- **WHEN** keep 因「无改动可 commit」或「git commit failed」被拒
- **THEN** 错误消息注明实验外预暂存条目已被 unstage（后者另注明实验改动仍在 index 中暂存）
