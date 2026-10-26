## MODIFIED Requirements

### Requirement: 会话目录写保护

PreToolUse hook SHALL 拦截对 `.auto/` 下受保护文件（measure.sh、checks.sh、goal.md）的 Write/Edit，返回 deny；对 `.auto/` 其它文件的写入放行。goal.md 承载用户的深层目标原文（setup 时逐字记录），是 harness 编辑步唯一不可触碰的会话文件：深层目标为根，表层目标表示（度量代理、章程措辞、方向池）可被证据驱动的编辑步修订，但 SHALL 不与 goal.md 矛盾。

#### Scenario: 修改度量脚本

- **WHEN** agent 尝试编辑 `.auto/measure.sh`
- **THEN** PreToolUse hook 返回 permissionDecision=deny 及原因

#### Scenario: 编辑深层目标

- **WHEN** agent（含 harness 编辑步）尝试 Write/Edit `.auto/goal.md`
- **THEN** PreToolUse hook 返回 permissionDecision=deny 及原因（深层目标不可变，修订表层诉求应走编辑步的表层区块或新 segment）

#### Scenario: 编辑其它会话文件放行

- **WHEN** agent 尝试编辑 `.auto/prompt.md` 或 `.auto/ideas.md`
- **THEN** PreToolUse hook 放行（harness 编辑步的可编辑面）
