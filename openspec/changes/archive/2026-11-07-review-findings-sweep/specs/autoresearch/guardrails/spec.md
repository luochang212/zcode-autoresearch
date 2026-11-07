## MODIFIED Requirements

### Requirement: 会话目录写保护

PreToolUse hook SHALL 拦截对 `.auto/` 下受保护文件（measure.sh、checks.sh、goal.md、scope.md）**已存在版本**的 Write/Edit/ApplyPatch，返回 deny；目标文件尚不存在时 hook SHALL 放行。ApplyPatch 的目标路径 SHALL 从 `tool_input.patch_text` 解析（`*** Update File:`、`*** Add File:`、`*** Delete File:`、`*** Move File:`、`*** Move to:` 行），任一目标命中已存在的冻结文件时 SHALL deny 整个补丁；解析不出任何目标时放行（fail-open 纪律不变）。冻结语义为「记录后不可改写」：setup 在用户在场时创建这些文件（逐字记录深层目标、用户同意的范围边界、基准与检查脚本）是协议的正当步骤，hook 区分创建与改写的判据是文件是否已在磁盘。对 `.auto/` 其它文件的写入放行。deny 时 hook SHALL 尝试向账本追加一行 `{type:"frozen_attempt", ts, file, tool}`，因为被拦截的改写企图是事实，须与 deny 同步留痕；账本写入失败 SHALL 不影响 deny 本身（fail-open 纪律不变），首次创建放行路径 SHALL 不产生任何账本行。goal.md 承载用户的深层目标原文（setup 时逐字记录），scope.md 承载用户同意的范围边界（Files-in-scope 与 Off-Limits）。二者是 harness 编辑步不可触碰的锚：深层目标为根，范围边界为栏，表层目标表示（度量代理、章程措辞、方向池）可被证据驱动的编辑步修订，但 SHALL 不与二者矛盾。deny 的建议文案 SHALL 指向**实际可行**的正当路径（ADR-11：犯错给指引，指引不得自指一个不能解除写保护的步骤）：goal/scope 指向用户手改或新 segment；measure.sh 需要新度量时 SHALL 指明先移除已记录文件（用户手删或经用户明确授权的命令删除）、再搭建新基准并开新 segment——SHALL NOT 建议仅 `init_experiment`（它重立哈希基线，不解除写保护）。命令与规程文档（/autoresearch:clear、setup 分支）SHALL 载明同一替换路径。

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

#### Scenario: measure.sh 的 deny 建议指向可行替换路径

- **WHEN** agent 在 clear 之后为新的优化目标重写仍存在的 `.auto/measure.sh` 而被 deny
- **THEN** deny 建议含「先移除已记录文件（用户手删或经明确授权删除）→ 搭建新基准 → init_experiment 新 segment」的可行路径，SHALL NOT 仅建议 `init_experiment`（该步骤不解除写保护，照做将再次被拒）
