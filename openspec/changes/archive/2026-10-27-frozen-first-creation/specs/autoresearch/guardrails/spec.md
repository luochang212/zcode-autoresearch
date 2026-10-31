## MODIFIED Requirements

### Requirement: 会话目录写保护

PreToolUse hook SHALL 拦截对 `.auto/` 下受保护文件（measure.sh、checks.sh、goal.md、scope.md）**已存在版本**的 Write/Edit，返回 deny；目标文件尚不存在时 hook SHALL 放行。冻结语义为「记录后不可改写」：setup 在用户在场时创建这些文件（逐字记录深层目标、用户同意的范围边界、基准与检查脚本）是协议的正当步骤，hook 区分创建与改写的判据是文件是否已在磁盘。对 `.auto/` 其它文件的写入放行。goal.md 承载用户的深层目标原文（setup 时逐字记录），scope.md 承载用户同意的范围边界（Files-in-scope 与 Off-Limits）。二者是 harness 编辑步不可触碰的锚：深层目标为根，范围边界为栏，表层目标表示（度量代理、章程措辞、方向池）可被证据驱动的编辑步修订，但 SHALL 不与二者矛盾。

#### Scenario: setup 首次创建放行

- **WHEN** `.auto/goal.md`（或 scope.md、measure.sh、checks.sh）尚不存在，agent 尝试 Write 创建
- **THEN** PreToolUse hook 放行（setup 的正当步骤）；文件落盘后同一 Write/Edit 即被拒绝

#### Scenario: 修改度量脚本

- **WHEN** agent 尝试编辑已存在的 `.auto/measure.sh`
- **THEN** PreToolUse hook 返回 permissionDecision=deny 及原因

#### Scenario: 编辑深层目标

- **WHEN** agent（含 harness 编辑步）尝试 Write/Edit 已存在的 `.auto/goal.md`
- **THEN** PreToolUse hook 返回 permissionDecision=deny 及原因（深层目标不可变，修订表层诉求应走编辑步的表层区块或新 segment）

#### Scenario: 编辑范围边界

- **WHEN** agent（含 harness 编辑步）尝试 Write/Edit 已存在的 `.auto/scope.md`
- **THEN** PreToolUse hook 返回 permissionDecision=deny 及原因（范围边界由用户设定，扩大或收窄须经用户手改或 `init_experiment` 新 segment）

#### Scenario: 编辑其它会话文件放行

- **WHEN** agent 尝试编辑 `.auto/prompt.md` 或 `.auto/ideas.md`
- **THEN** PreToolUse hook 放行（harness 编辑步的可编辑面；范围内容以对 scope.md 的引用呈现，引用不被改写由规程与人审保障）
