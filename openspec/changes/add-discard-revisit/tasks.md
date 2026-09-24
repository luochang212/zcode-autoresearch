# Tasks: add-discard-revisit

## 1. revisit_nudge 返回字段（server.ts）

- [x]1.1 在 `log_experiment` 返回构造中实现 `revisit_nudge`：扫描当前 segment 的 runs（内存 state，无需重读账本），存在 status ∈ {discard, checks_failed} 且 `asi.rollback` 非空的行时输出固定文案；否则省略字段（文案要素见 design D2）
- [x]1.2 单测（server 或 hooks 测试风格，临时 git 仓库 + 真 server）：有带理由 discard 行 → 返回含字段；无 discard 行 → 无字段；discard 行无理由 → 无字段；跨 segment 的 discard 行不触发
- [x]1.3 断言 `revisit_nudge` 出现在返回 JSON 中且不影响既有字段（跑一遍既有 log_experiment 契约测试）

## 2. asi.revisits_run 透传与 dashboard 渲染

- [x]2.1 透传验证测试：以含 `revisits_run` 的 asi 调用 log_experiment，断言账本行与 after 钩子 payload 均含该字段（预期无需改传输代码，测试钉死契约）；含指向不存在 run 号的用例（写入不被拒）
- [x]2.2 `lib/dashboard.ts` run 行渲染 `↻ Revisiting #N`（正整数才渲染），静态导出与 live HTML 共用路径
- [x]2.3 dashboard 测试：含标注行渲染标记、无标注/非正整数不渲染

## 3. confidence 快照入账本

- [x]3.1 `server.ts`：entry 构造时用「现有 runs + 本 entry」调 confidence 纯函数预计算，写入 `entry.confidence = {level, value}`；返回值 confidence 复用同一次计算（移除写入后的重复计算路径，注意 rebuildState 仍需为 baseline/delta 等字段服务）
- [x]3.2 单测：记录后账本行含 `confidence` 且与返回值相等；crash 行（metric null）写入不抛错；历史无 confidence 字段的账本 rebuildState/validate 回放正常

## 4. memory-inject 弃用理由行

- [x]4.1 `hooks/memory-inject.ts`：新增「弃用方向与理由」聚合行（segment 内、status ∈ {discard, checks_failed}、`asi.rollback` 非空、窗口 8 条、单条截断约 60 字符）
- [x]4.2 单测：窗口外的旧 discard 理由仍注入；截断生效；无带理由 discard 行时不输出该行

## 5. 文档同步

- [x]5.1 `skills/autoresearch/SKILL.md`：asi 字段说明补 `revisits_run`（含「验证性重跑不适用」边界）；循环规程 Review 步骤补重访检查动作
- [x]5.2 `skills/autoresearch/references/setup-guide.md`：prompt.md 模板 What's Been Tried 节补「重访条件」示例与说明
- [x]5.3 `plugin/README.md` / `README_CN.md`：log_experiment 返回字段说明与 asi 字段表同步

## 6. 收尾

- [x]6.1 `cd plugin && node --test tests/*.test.ts` 全量通过；根目录 `npm run lint` + `npm run typecheck` 通过
- [x]6.2 `openspec validate --specs` 主规范校验通过（归档前合并 delta 后复验）
