## MODIFIED Requirements

### Requirement: 实验记忆注入

UserPromptSubmit/SessionStart hook SHALL 把 `.auto/log.jsonl` 的最近记录摘要注入模型上下文（compaction 后记忆恢复），注入内容 SHALL 保持精简（尾 N 行单行化）。当最近记录含 `asi` 字段时，注入 SHALL 提炼 `asi.hypothesis`、`asi.next_action_hint`、`asi.rollback` 三个字段并附在对应记录之后。SessionStart hook SHALL 在检测到活动会话（存在 `.auto/log.jsonl` 且 `.auto/config.json` 未设置 `autoresearchOff: true`）时注入"会话可续跑"引导（指向 `/autoresearch:autoresearch`）；设置了 `autoresearchOff` 时不注入续跑提示。

#### Scenario: 会话继续
- **WHEN** 会话内存在 `.auto/` 且用户提交新 prompt
- **THEN** 模型上下文包含账本最近几条记录摘要与下一步提示

#### Scenario: ASI 三字段提炼
- **WHEN** 最近记录含 `asi: {hypothesis, next_action_hint, rollback}`
- **THEN** 注入文本中该记录显示 `hyp:` / `next:` / `rollback:` 提炼行

#### Scenario: 自动激活提示
- **WHEN** 会话启动且存在活动会话（log.jsonl 存在、config 无 autoresearchOff）
- **THEN** SessionStart 注入"存在 autoresearch 会话，可 /autoresearch:autoresearch 续跑"

#### Scenario: 显式关闭后不提示
- **WHEN** `.auto/config.json` 含 `autoresearchOff: true`
- **THEN** SessionStart 不注入续跑提示（会话仍可手动进入）

## ADDED Requirements

### Requirement: PermissionRequest 工具门禁

PermissionRequest hook SHALL 在工作区无活动实验会话（`.auto/log.jsonl` 不存在）时，对实验工具（init_experiment、run_experiment、log_experiment、export_dashboard、clear_experiments）的权限询问返回 `deny`（附原因），防止误启动实验循环；存在活动会话时放行。该门禁为近似（仅覆盖经过权限询问路径的调用），工具内检查与 skill 指引为兜底。

#### Scenario: 无会话时拒绝实验工具
- **WHEN** 工作区无 `.auto/log.jsonl` 且实验工具触发权限询问
- **THEN** hook 返回 deny（decision.behavior=deny + message 说明需先 /autoresearch:autoresearch 建立会话）

#### Scenario: 有会话时放行
- **WHEN** 工作区存在 `.auto/log.jsonl` 且实验工具触发权限询问
- **THEN** hook 放行（无 deny 输出）
