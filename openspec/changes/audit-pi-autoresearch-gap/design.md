# Design: pi-parity 验收审计

## 审计方法

1. **对比基线**：pi v1.6.2 归档源码（`archived/pi-autoresearch/`）↔ 我方 `plugin/`（commit `6c52535`，58/58 测试通过）。
2. **实态核对**：逐项读 `plugin/mcp/server.mjs`、`plugin/mcp/lib/*.mjs`、`plugin/hooks/*`（含 hooks.json）、`plugin/scripts/finalize.sh`、`plugin/skills/`、`plugin/commands/`，对照 pi 的 28 项能力清单判定，不做"规划态"推断。
3. **一致性三查**：实现 ↔ SKILL.md 声称 ↔ 示例脚本依赖（三方对齐才是"已对齐"；两方对齐一方掉队即记 G1）。
4. **测试佐证**：跑 `node --test tests/*.test.mjs` 确认基线健康；同时记录测试盲区（如 hooks.test.mjs 无 asi 覆盖）。

## 关键判定依据（审计中已核实）

- 追平验收：#1 permission-gate、#2 session-start、#3 off.md→config `autoresearchOff`、#19 resolveWorkCwd、#22 dashboard-server（HTTP+SSE+jsonl 重拉）、#23 before/after 钩子、#25 finalize.sh、#26 SKILL+6 示例、#28 clear_experiments。
- G1 契约不一致：server.mjs `runBeforeHook`/`runAfterHook` 的 payload 不含 `asi`（`skills/autoresearch-hooks/SKILL.md:20` 声称 `asi?`、`hooks/examples/before/hypothesis-reflection.sh:13` 依赖 `last.asi`）；hook 失败/超时静默（pi 契约为 error steer）。
- G2 观测缺口：hook fire 不写 `{"type":"hook"}` 条目；confidence 不持久化到 run 条目（rebuildState 仅计算，appendLedgerEntry 不写）。
- G3 缩水：finalize 仅 union 验证（pi 另有 no-overlap/no-empty-commits/no-session-artifacts 三道）；示例 6/9（缺 external-search、qmd-search、context-rotation）；before.sh 缺激活时触发点。
- 平台硬顶维持原判（ADR-4）：无限 auto-resume、compaction 事件、widget/overlay、无头 hooks。

## 备选方案

- **只更新 pi-gap-analysis.md 而不新开报告**：否决——那份是规划期文档，验收结论与其"缺失 14 项"结论冲突，混写会丢历史；新报告可显式声明取代关系。
- **审计+修复同 change**：否决——审计结论需先沉淀为可信基线；G1 修复涉及 SKILL/示例/测试三方联动，独立 change 更干净。

## 风险

- 报告判定依赖静态阅读；缓解：所有判定附代码位置，测试佐证基线健康，后续修复 change 会以测试覆盖回归。
