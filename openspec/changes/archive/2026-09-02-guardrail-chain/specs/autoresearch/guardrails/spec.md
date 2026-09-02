## MODIFIED Requirements

### Requirement: benchmark 脚本锁定

当 `.auto/measure.sh` 存在时，`run_experiment` SHALL 拒绝执行任何非该脚本的命令（允许 env/time/nice 等包装，但核心命令必须是脚本本身）。脚本之后的参数 SHALL 走白名单校验：只允许由字母数字与 `_ . / : = + -` 组成、以空格或制表符分隔的参数；含换行、回车、重定向、反引号、引号或其余 shell 元字符的命令 SHALL 被拒绝。

#### Scenario: 尝试运行任意命令

- **WHEN** `.auto/measure.sh` 已存在且 agent 让 `run_experiment` 运行其它命令
- **THEN** 工具拒绝并提示只能运行 `.auto/measure.sh`

#### Scenario: 包装命令放行

- **WHEN** agent 通过 `time .auto/measure.sh` 运行
- **THEN** 工具接受并执行

#### Scenario: 换行注入拒绝

- **WHEN** agent 提交的命令为 `bash .auto/measure.sh` 后拼接换行与第二条命令（如 `"bash .auto/measure.sh \necho PWNED"`）
- **THEN** 工具拒绝执行，第二条命令不会运行

#### Scenario: 重定向注入拒绝

- **WHEN** agent 提交的命令在脚本后含 `>` 重定向（如 `bash .auto/measure.sh > /tmp/x`）
- **THEN** 工具拒绝执行

#### Scenario: 合法参数放行

- **WHEN** agent 在脚本后附带常规参数（如 `--verbose`、`--foo=bar`、`-n 3`）
- **THEN** 工具接受并执行

### Requirement: checks 正确性背压

当 `.auto/checks.sh` 存在时，`run_experiment` SHALL 在 benchmark 通过后自动执行它，并把 checks 结果作为「待记录」状态持久化到 `.auto/config.json`（`pendingChecksFailed`：checks 跑了且失败为 true，其余为 false），MCP server 重启后仍有效；该状态为 true 时 `log_experiment` 的 keep SHALL 被拒绝（提示改用 checks_failed/discard），任意 status 成功记录后 SHALL 清除该状态，`init_experiment`/`clear_experiments` SHALL 重置它。`log_experiment` 以 `status=checks_failed` 记录时 SHALL 在账本行写入 `checksFailed: true`；会话状态重建 SHALL 按每 run 覆盖方式判定「最近一条账本 run 是否 checks 失败」（账本行 `checksFailed === true` 或 `status === "checks_failed"` 均视为失败），不单向闩锁。

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
