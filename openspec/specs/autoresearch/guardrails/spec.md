## Purpose

定义 zcode autoresearch 插件的护栏与记忆行为契约：benchmark 脚本锁定、checks 正确性背压、`.auto/` 写保护、Stop 续跑窗口、以及实验记忆的注入。

## Requirements

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

### Requirement: 会话目录写保护

PreToolUse hook SHALL 拦截对 `.auto/` 下受保护文件（measure.sh、checks.sh）的 Write/Edit，返回 deny；对 `.auto/` 其它文件的写入放行。

#### Scenario: 修改度量脚本

- **WHEN** agent 尝试编辑 `.auto/measure.sh`
- **THEN** PreToolUse hook 返回 permissionDecision=deny 及原因

### Requirement: Stop hook 驱动循环续跑

当实验循环进行中且账本显示未达停止条件（迭代上限未到、最近结果非全失败）时，Stop hook SHALL 返回 `decision:block` 与进度摘要 reason，让主模型继续；连续续跑由 zcode 平台限制（3 次窗口）。连续失败判定 SHALL 使用 `.auto/config.json` 的 `consecutiveFailures`（默认 3）作为阈值。

#### Scenario: 循环未结束

- **WHEN** 模型准备结束但当前 segment 未达迭代上限且未进入平台期
- **THEN** Stop hook 返回 block + reason（进度与下一步），模型继续一轮

#### Scenario: 平台期收敛

- **WHEN** 当前 segment 最近 `window` 轮无净改善（plateau 检测为 true）
- **THEN** Stop hook 放行，reason 中说明循环已进入平台期，建议收尾或开启新 segment

#### Scenario: 连续失败达到阈值

- **WHEN** 连续 discard/crash/checks_failed 数量达到 `consecutiveFailures`（默认 3，可配）
- **THEN** Stop hook 放行，模型正常收尾

#### Scenario: 循环已结束

- **WHEN** 迭代上限已达成
- **THEN** Stop hook 放行，模型正常收尾

### Requirement: 实验记忆注入

UserPromptSubmit/SessionStart hook SHALL 把 `.auto/log.jsonl` 的会话记忆注入模型上下文，注入内容 SHALL 包含：会话进度（segment/metric/direction/已跑数/上限/baseline/best）、**已尝试方向去重列表**（从各 run 的 description 与 asi.hypothesis 提炼方向标签并去重，提示避免重复尝试）、**best 轨迹**（baseline → 各关键 keep 的 metric 变化）、最近记录摘要（含 ASI 的 hyp/next/rollback 提炼）、以及 **doom-loop 提示**（最近记录呈连续重复或 A→B→A→B 震荡时，提示停止重复并换方向）。注入内容 SHALL 保持精简（聚合后单块文本）。SessionStart hook SHALL 在检测到活动会话（存在 `.auto/log.jsonl` 且 `.auto/config.json` 未设置 `autoresearchOff: true`）时注入续跑引导；设置了 `autoresearchOff` 时不注入续跑提示。

#### Scenario: 会话继续

- **WHEN** 会话内存在 `.auto/` 且用户提交新 prompt
- **THEN** 模型上下文包含聚合摘要（进度 + 已尝试方向去重 + best 轨迹 + 最近记录 + 下一步提示）

#### Scenario: ASI 三字段提炼

- **WHEN** 最近记录含 `asi: {hypothesis, next_action_hint, rollback}`
- **THEN** 注入文本中该记录显示 `hyp:` / `next:` / `rollback:` 提炼行

#### Scenario: 已尝试方向去重

- **WHEN** 账本含 4 条 run，description 分别为"试 sqrt 截断"、"试埃氏筛"、"试 sqrt 截断变体"、"试位运算"
- **THEN** 注入的"已尝试方向"去重后列出 sqrt 截断 / 埃氏筛 / 位运算（不重复列出变体）

#### Scenario: doom-loop 提示

- **WHEN** 最近 4 条 run 的假设呈 A→B→A→B 震荡或最近 3 条相同
- **THEN** 注入含"检测到重复/震荡，停止重复尝试，换结构性方向"提示

#### Scenario: 自动激活提示

- **WHEN** 会话启动且存在活动会话（log.jsonl 存在、config 无 autoresearchOff）
- **THEN** SessionStart 注入"存在 autoresearch 会话，可 /autoresearch:autoresearch 续跑"

#### Scenario: 显式关闭后不提示

- **WHEN** `.auto/config.json` 含 `autoresearchOff: true`
- **THEN** SessionStart 不注入续跑提示（会话仍可手动进入）

### Requirement: PermissionRequest 工具门禁

PermissionRequest hook SHALL 在工作区无活动实验会话（`.auto/log.jsonl` 不存在）时，对实验工具（init_experiment、run_experiment、log_experiment、export_dashboard、clear_experiments）的权限询问返回 `deny`（附原因），防止误启动实验循环；存在活动会话时放行。该门禁为近似（仅覆盖经过权限询问路径的调用），工具内检查与 skill 指引为兜底。

#### Scenario: 无会话时拒绝实验工具

- **WHEN** 工作区无 `.auto/log.jsonl` 且实验工具触发权限询问
- **THEN** hook 返回 deny（decision.behavior=deny + message 说明需先 /autoresearch:autoresearch 建立会话）

#### Scenario: 有会话时放行

- **WHEN** 工作区存在 `.auto/log.jsonl` 且实验工具触发权限询问
- **THEN** hook 放行（无 deny 输出）
