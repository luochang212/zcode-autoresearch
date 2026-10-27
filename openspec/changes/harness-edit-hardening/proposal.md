# 提案：harness-edit-loop 收口——范围冻结与经验保真

## Why

harness-edit-loop 落地后经审视（worth-fix 流程验证）发现两个必须修的缺口：

- **P1（约束绕过）**：可编辑面包含 `prompt.md` 表层区块，而 Off-Limits / Files-in-scope 就写在其中——hook 是路径级的（`plugin/tests/hooks.test.ts` 实测 prompt.md 写请求放行），范围漂移机械可行。安全不变量 4（只碰约定范围）被编辑步的合法出口绕开，plateau 下 agent 扩大范围的动机最强。
- **P2（数据丢失）**：`plugin/commands/finalize.md` 第 6 步的清理注释指示 `rm -r .auto`，而 experience.md 的"人审并入 AGENTS.md"在该命令流程中零提及（已核实：`finalize.sh` 自身不删 `.auto`，删除责任在命令文本）——每次 finalize 按注释清理都会无声丢掉经验库。

## What Changes

- 新增冻结会话文件 `.auto/scope.md`：用户同意的 Files-in-scope 与 Off-Limits 原文，加入 PreToolUse 写保护（与 goal.md 同一 FROZEN 机制）；`prompt.md` 对应段落改为对 scope.md 的逐字引用；范围修订不经编辑步——只能由用户手改或 `init_experiment` 新 segment
- `plugin/commands/finalize.md`：在清理前插入正式步骤——与用户人审 `.auto/experience.md`，幸存 lesson 并入项目 AGENTS.md；清理（含 `rm -r .auto`）SHALL 在该步完成后执行

## Capabilities

### New Capabilities

（无）

### Modified Capabilities

- `autoresearch/guardrails`：「会话目录写保护」受保护集合加入 `.auto/scope.md`（用户同意的范围边界，与深层目标同级不可变）
- `autoresearch/experiment-loop`：「harness 编辑步与经验库资产」可编辑面收窄（范围边界移入冻结的 scope.md）；finalize 清理 SHALL 以 experience 人审并入完成为前提

## Impact

- 代码：`plugin/hooks/guard-frozen.ts`（FROZEN 加 scope.md，一行）+ hooks 测试扩展
- 命令：`plugin/commands/finalize.md`（插 experience 人审步骤，清理前提化）
- 技能与参考：SKILL.md（Session state 清单、可编辑面白名单）、`references/loop-protocol.md`（Root vs Surface 补 scope.md）、`references/setup-guide.md`（scope.md 步骤与章程模板）
- 文档：`plugin/README.md` / `plugin/README_CN.md` 写保护行补 scope.md
- 兼容性：旧会话无 scope.md 时 hook 无感（路径不存在自然放行），规程跳过 scope 引用检查（advisory）；无迁移

## 验证记录（worth-fix 留痕）

- P1 实测：`plugin/tests/hooks.test.ts` "guard-frozen denies deep-goal edits, allows charter and ideas" 实证 prompt.md 写请求放行（hook 路径级、内容不可区分）。
- P2 实证：`plugin/scripts/finalize.sh` 仅在 git 文件集里剔除 `.auto`（第 66/85/132 行），不删除磁盘文件；删除指令在 `plugin/commands/finalize.md` 第 6 步；`grep experience|AGENTS plugin/commands/finalize.md` 无命中。
- 修复后同一场景固化为回归测试：goal.md 之外追加 scope.md 的 deny 断言（apply 阶段红→绿）。
