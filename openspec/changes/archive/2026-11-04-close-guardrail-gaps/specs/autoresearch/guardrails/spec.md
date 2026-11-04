## MODIFIED Requirements

### Requirement: benchmark 脚本锁定

当 `.auto/measure.sh` 存在时，`run_experiment` SHALL 拒绝执行任何非该脚本的命令（允许 env/time/nice 等包装，但核心命令必须是脚本本身）。脚本之后的参数 SHALL 走白名单校验：只允许由字母数字与 `_ . / : = + -` 组成、以空格或制表符分隔的参数；含换行、回车、重定向、反引号、引号或其余 shell 元字符的命令 SHALL 被拒绝。前导环境变量赋值的**值**同样 SHALL 走该白名单：赋值前缀不是免检通道，含 `$(`、反引号或其它 shell 元字符的赋值（命令替换会随赋值前缀一起执行）SHALL 使整条命令被拒绝。

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

#### Scenario: 赋值前缀注入拒绝

- **WHEN** agent 提交的命令为 `X=$(id) bash .auto/measure.sh` 或含反引号命令替换的赋值前缀
- **THEN** 工具拒绝执行（赋值前缀的值走与参数相同的白名单，命令替换不被夹带）

#### Scenario: 良性赋值前缀放行

- **WHEN** agent 提交的命令为 `FOO=1 bash .auto/measure.sh`
- **THEN** 工具接受并执行（白名单字符内的赋值不受影响）

### Requirement: 会话目录写保护

PreToolUse hook SHALL 拦截对 `.auto/` 下受保护文件（measure.sh、checks.sh、goal.md、scope.md）**已存在版本**的 Write/Edit/ApplyPatch，返回 deny；目标文件尚不存在时 hook SHALL 放行。ApplyPatch 的目标路径 SHALL 从 `tool_input.patch_text` 解析（`*** Update File:`、`*** Add File:`、`*** Delete File:`、`*** Move File:`、`*** Move to:` 行），任一目标命中已存在的冻结文件时 SHALL deny 整个补丁；解析不出任何目标时放行（fail-open 纪律不变）。冻结语义为「记录后不可改写」：setup 在用户在场时创建这些文件（逐字记录深层目标、用户同意的范围边界、基准与检查脚本）是协议的正当步骤，hook 区分创建与改写的判据是文件是否已在磁盘。对 `.auto/` 其它文件的写入放行。deny 时 hook SHALL 尝试向账本追加一行 `{type:"frozen_attempt", ts, file, tool}`，因为被拦截的改写企图是事实，须与 deny 同步留痕；账本写入失败 SHALL 不影响 deny 本身（fail-open 纪律不变），首次创建放行路径 SHALL 不产生任何账本行。goal.md 承载用户的深层目标原文（setup 时逐字记录），scope.md 承载用户同意的范围边界（Files-in-scope 与 Off-Limits）。二者是 harness 编辑步不可触碰的锚：深层目标为根，范围边界为栏，表层目标表示（度量代理、章程措辞、方向池）可被证据驱动的编辑步修订，但 SHALL 不与二者矛盾。

#### Scenario: setup 首次创建放行

- **WHEN** `.auto/goal.md`（或 scope.md、measure.sh、checks.sh）尚不存在，agent 尝试 Write 创建
- **THEN** PreToolUse hook 放行（setup 的正当步骤）且不写账本行；文件落盘后同一 Write/Edit 即被拒绝

#### Scenario: 修改度量脚本

- **WHEN** agent 尝试编辑已存在的 `.auto/measure.sh`
- **THEN** PreToolUse hook 返回 permissionDecision=deny 及原因，账本出现 `frozen_attempt` 行

#### Scenario: 编辑深层目标

- **WHEN** agent（含 harness 编辑步）尝试 Write/Edit 已存在的 `.auto/goal.md`
- **THEN** PreToolUse hook 返回 permissionDecision=deny 及原因（深层目标不可变，修订表层诉求应走编辑步的表层区块或新 segment），账本出现 `frozen_attempt` 行

#### Scenario: 编辑范围边界

- **WHEN** agent（含 harness 编辑步）尝试 Write/Edit 已存在的 `.auto/scope.md`
- **THEN** PreToolUse hook 返回 permissionDecision=deny 及原因（范围边界由用户设定，扩大或收窄须经用户手改或 `init_experiment` 新 segment），账本出现 `frozen_attempt` 行

#### Scenario: ApplyPatch 改写冻结文件被拒

- **WHEN** agent 以 ApplyPatch 提交含 `*** Update File: .auto/goal.md` 的 patch_text，且该文件已存在
- **THEN** PreToolUse hook 返回 permissionDecision=deny，账本出现 `frozen_attempt` 行（ApplyPatch 不是写保护的盲区）

#### Scenario: ApplyPatch 多目标命中任一即拒

- **WHEN** ApplyPatch 的 patch_text 同时更新 `code.py` 与已存在的 `.auto/measure.sh`
- **THEN** 整个补丁被 deny，deny 原因列出命中的冻结文件

#### Scenario: ApplyPatch 目标均非冻结时放行

- **WHEN** ApplyPatch 的 patch_text 只更新研究代码文件（不含冻结目标）
- **THEN** PreToolUse hook 放行，不写账本行

#### Scenario: 编辑其它会话文件放行

- **WHEN** agent 尝试编辑 `.auto/prompt.md` 或 `.auto/ideas.md`
- **THEN** PreToolUse hook 放行（harness 编辑步的可编辑面；范围内容以对 scope.md 的引用呈现，引用不被改写由规程与人审保障）；放行路径不写 `frozen_attempt` 行，可编辑面的变更由 harness 留痕机制在记账时点记录

### Requirement: checks 正确性背压

当 `.auto/checks.sh` 存在时，`run_experiment` SHALL 在 benchmark 通过后自动执行它，并把 checks 结果作为「待记录」状态持久化到 `.auto/config.json`（`pendingChecksFailed`：checks 产生**判定**且判定为失败时为 true，其余为 false。判定指脚本运行到完成并以 0（通过）或 1–125（判定失败）退出；126/127（不可执行/不存在）、null（被信号终止）及更大的致命退出码表示门禁未产生判定，属基础设施故障（infra），SHALL NOT 置位该状态（不否决 keep），并 SHALL 在返回中如实呈现 `verdict: false` 供 agent 披露），MCP server 重启后仍有效；该状态为 true 时 `log_experiment` 的 keep SHALL 被拒绝（提示改用 checks_failed/discard），任意 status 成功记录后 SHALL 清除该状态，`init_experiment`/`clear_experiments` SHALL 重置它。`log_experiment` 以 `status=checks_failed` 记录时 SHALL 在账本行写入 `checksFailed: true`；会话状态重建 SHALL 按每 run 覆盖方式判定「最近一条账本 run 是否 checks 失败」（账本行 `checksFailed === true` 或 `status === "checks_failed"` 均视为失败），不单向闩锁。benchmark 自身失败（任一 run 非零退出或超时）时，`run_experiment` 的返回 SHALL 携带显式警告字段，说明失败次数；若 checks 因此未执行，警告 SHALL 说明 checks 被跳过（advisory：不改变 `pendingChecksFailed` 语义、不否决 keep，但不得静默——失败 run 的 metric 可靠性由 agent 依据警告判断）。

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

#### Scenario: 基准失败不再静默

- **WHEN** `repeat: 3` 且其中一次非零退出（或最后一次超时导致 checks 被跳过）
- **THEN** 返回携带 `benchmark_warning`，说明失败的 run 数与 checks 是否因此未执行；`pendingChecksFailed` 保持 false（advisory，keep 门政策不变）
