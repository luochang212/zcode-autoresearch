# 任务：harness 编辑步（二阶自循环）

## 1. 机械保障（写保护）

- [x] 1.1 `plugin/hooks/guard-frozen.ts`：FROZEN 集合加入 `.auto/goal.md`。验证：扩展 `plugin/tests/hooks.test.ts` 的写保护用例——Write/Edit goal.md 返回 deny，Edit prompt.md/ideas.md 放行
- [x] 1.2 `cd plugin && node --test tests/hooks.test.ts` 全绿

## 2. 规程资产（技能与参考）

- [x] 2.1 `plugin/skills/autoresearch/SKILL.md`：新增「Harness editing（二阶循环）」节（触发条件、编辑行格式、verdict 四值与 confounded 优先、KEEP_BASE、可编辑面白名单、goal.md 不可变）；步骤 5 读信号处接线触发点；Session state 清单补 goal.md 与 experience.md
- [x] 2.2 `plugin/skills/autoresearch/references/loop-protocol.md`：详细规程——编辑行模板（component/change/observed/verdict）、lesson 模板（cue/lesson/evidence/confidence）、NO_ENTRY 条件、KEEP_BASE 纪律、来源标注（Harness²）；写作三分法（workspace fact / procedure / too-generic）
- [x] 2.3 `plugin/skills/autoresearch/references/setup-guide.md`：setup 流程插入 goal.md 步骤（逐字记录用户深层目标原话，先于 prompt.md）；prompt.md 模板的目标段改为对 goal.md 的逐字引用；补 experience.md 约定（每 segment 至多一条、finalize 人审并入 AGENTS.md、跨项目复用按假设重新验证）

## 3. 文档与全量验证

- [x] 3.1 `plugin/README.md` / `plugin/README_CN.md`：会话状态清单（.auto/ 文件表）补 goal.md（冻结）与 experience.md；护栏段补一句"深层目标写保护"
- [x] 3.2 全量检查：根目录 `npm test` 全过、`npm run lint`、`npm run fmt:check`、`npm run typecheck`
- [x] 3.3 `openspec validate --strict harness-edit-loop` 通过
