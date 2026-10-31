# 任务：harness-edit-hardening

## 1. 机械保障

- [x] 1.1 `plugin/hooks/guard-frozen.ts`：FROZEN 集合加入 `.auto/scope.md`（含 FROZEN_REASON：范围边界由用户设定，扩大/收窄须经用户手改或新 segment）。验证：`plugin/tests/hooks.test.ts` 扩展，Edit scope.md 返回 deny（回归测试：先红后绿）
- [x] 1.2 `cd plugin && node --test tests/hooks.test.ts` 全绿（既有 goal.md deny 与 prompt.md 放行断言不回归）

## 2. 规程资产

- [x] 2.1 `plugin/skills/autoresearch/SKILL.md`：Session state 清单补 scope.md（冻结）；Harness editing 节可编辑面收窄（prompt.md 表层区块不含范围；范围修订向用户提出或新 segment）
- [x] 2.2 `plugin/skills/autoresearch/references/loop-protocol.md`：Root vs Surface 补 scope.md（根=goal、栏=scope、表=其余）；编辑步加"不得扩大范围"出口（向用户提出或新 segment）
- [x] 2.3 `plugin/skills/autoresearch/references/setup-guide.md`：新增 scope.md 步骤（用户同意的 Files-in-scope 与 Off-Limits 原文，冻结）；章程模板的范围段改引用；编号顺延核验
- [x] 2.4 `plugin/commands/finalize.md`：cron 清理后插入正式步骤，与用户人审 `.auto/experience.md`、幸存 lesson 并入项目 AGENTS.md；step 6 清理注释前提化（人审完成后才执行 `rm -r .auto`）

## 3. 文档与全量验证

- [x] 3.1 `plugin/README.md` / `plugin/README_CN.md`：写保护行补 scope.md
- [x] 3.2 全量检查：根目录 `npm test` 全过、`npm run lint`、`npm run fmt:check`、`npm run typecheck`
- [x] 3.3 `openspec validate --strict harness-edit-hardening` 通过
