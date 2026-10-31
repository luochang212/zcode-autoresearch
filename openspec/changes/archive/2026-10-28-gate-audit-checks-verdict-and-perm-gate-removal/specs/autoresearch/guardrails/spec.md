## MODIFIED Requirements

### Requirement: checks 正确性背压

当 `.auto/checks.sh` 存在时，`run_experiment` SHALL 在 benchmark 通过后自动执行它，并把 checks 结果作为「待记录」状态持久化到 `.auto/config.json`（`pendingChecksFailed`：checks 产生**判定**且判定为失败时为 true，其余为 false。判定指脚本运行到完成并以 0（通过）或 1–125（判定失败）退出；126/127（不可执行/不存在）、null（被信号终止）及更大的致命退出码表示门禁未产生判定，属基础设施故障（infra），SHALL NOT 置位该状态（不否决 keep），并 SHALL 在返回中如实呈现 `verdict: false` 供 agent 披露），MCP server 重启后仍有效；该状态为 true 时 `log_experiment` 的 keep SHALL 被拒绝（提示改用 checks_failed/discard），任意 status 成功记录后 SHALL 清除该状态，`init_experiment`/`clear_experiments` SHALL 重置它。`log_experiment` 以 `status=checks_failed` 记录时 SHALL 在账本行写入 `checksFailed: true`；会话状态重建 SHALL 按每 run 覆盖方式判定「最近一条账本 run 是否 checks 失败」（账本行 `checksFailed === true` 或 `status === "checks_failed"` 均视为失败），不单向闩锁。

#### Scenario: checks 失败

- **WHEN** benchmark 度量改善但 `.auto/checks.sh` 以非零退出，agent 试图以 keep 记录该轮
- **THEN** 工具拒绝 keep 并提示改用 checks_failed 或 discard

#### Scenario: checks_failed 落账本

- **WHEN** agent 以 `status=checks_failed` 调用 `log_experiment`
- **THEN** 账本行包含 `checksFailed: true`，工作区改动被回滚

#### Scenario: 修复后恢复放行

- **WHEN** 一轮 checks 失败被拒后，agent 修复并重新 `run_experiment`（checks 通过），再以 keep 记录
- **THEN** keep 正常放行（待记录状态已随新一轮 run 更新，非单向闩锁）

#### Scenario: server 重启后门禁仍生效

- **WHEN** checks 失败后 MCP server 进程重启，agent 试图以 keep 记录该轮
- **THEN** 工具仍拒绝 keep（待记录状态持久化于 `.auto/config.json`）

#### Scenario: checks 未产生判定不否决 keep

- **WHEN** `.auto/checks.sh` 以 127（解释器/脚本缺失）或被信号终止（无判定退出码）结束，agent 以 keep 记录该轮
- **THEN** keep 放行，返回中 `checks.verdict` 为 false 且 `checks.failed` 为 false（基础设施故障由 agent 在描述中披露，不冒充正确性判定）

## REMOVED Requirements

### Requirement: PermissionRequest 工具门禁

**Reason**: 有用场景（防误启动）与副作用（approval 模式下 init_experiment 被自身门禁拒绝而自锁）是同一行为；仅因 auto-approve 调用绕过权限询问路径才不触发。工具内检查（log_experiment 无会话即拒）与权限询问本身已覆盖残余风险。
