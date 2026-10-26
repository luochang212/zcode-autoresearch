# 任务：区分基础设施故障与代码故障

## 1. 信号层（工具）

- [x] 1.1 `plugin/mcp/lib/experiment.ts`：`detectDoomLoop` 入口剔除 `asi.infra === true` 的 run 行（先剔除再取末窗），更新 JSDoc 说明 infra 语义。验证：`cd plugin && node --test tests/experiment.test.ts`
- [x] 1.2 `plugin/tests/experiment.test.ts`：新增断言——(a) 同假设反复 crash 且均 `asi.infra: true` 不触发；(b) 剔除 infra 行后 3 连相似仍触发；(c) A→B→A→B 非 infra 行为不变。验证：同上全绿
- [x] 1.3 `plugin/mcp/server.ts`：doom-loop 分支的 `next_action_hint` 文案加入「先做一轮调研（重读 prompt.md 的 What's Been Tried/相关文档/近失实验）再换结构性不同方向」。验证：`node --test tests/` 相关用例全绿

## 2. 规程层（SKILL.md）

- [x] 2.1 `plugin/skills/autoresearch/SKILL.md` 步骤 4：crash 记录指引区分代码故障与基础设施故障，环境问题加 `asi.infra: true`（说明仅限环境问题、advisory 透传）
- [x] 2.2 `plugin/skills/autoresearch/SKILL.md` 步骤 5：`doom_loop: true` 应对补"先做一轮调研（重读已试清单/文档/近失实验）再换结构性不同方向"
- [x] 2.3 `plugin/skills/autoresearch/SKILL.md` 步骤 4 keep/discard 权衡：补简单性判据（同等提升偏好更简单的实现；删代码获得同等性能是明确的 win）

## 3. 文档与全量验证

- [x] 3.1 `plugin/README.md` 与 `plugin/README_CN.md`：log_experiment 字段说明补 `asi.infra` 约定。验证：通读对应表格行
- [x] 3.2 全量检查：根目录 `npm test`（101 单测 + 契约 6 项全过）、`npm run lint`、`npm run fmt:check`、`npm run typecheck`
- [x] 3.3 `openspec validate --strict infra-failure-separation` 通过
