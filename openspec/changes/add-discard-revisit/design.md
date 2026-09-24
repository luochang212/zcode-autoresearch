# Design: add-discard-revisit

## 术语与背景

机制对齐 pi-autoresearch 1.8.0（#94）：discard 是「关于现在的决定，不是永远的决定」。价值场景：run #7 因「CPU 已满载」被弃，run #12（缓存）让 CPU 空闲后，#7 的 rollback 理由已不成立——需要在假设失效的时刻把这一句提问送到 agent 面前。依据：docs/research/change-queue-worth-fix.md §B1/§B3。

## Decisions

### D1. `revisit_nudge` 独立返回字段，不拼进 `next_action_hint`

pi 把提问追加到 tool result 文本（其返回是自然语言文本）；我方返回是结构化 JSON，`next_action_hint` 语义是「下一步建议」且有优先级分支（上限 > doom > 连败 > 平台期 > 默认），重访提问是**常驻检查项**，与该优先级正交——重访恰恰可能是打破 doom loop 的出口，把它挤进分支链会在 doom/连败分支丢失。独立字段：语义干净、可独立测试、消费方（agent）按字段名理解。

### D2. 触发条件：segment 内存在带 `asi.rollback` 的 discard/checks_failed 行（而非 pi 的无条件）

pi 无条件追加提问。我方加存在性条件：无 discard、或有 discard 但全无理由时，提问的信息量为零、纯噪音。账本行数与字段判断成本可忽略（rebuildState 已有 runs）。限定当前 segment：跨 segment 的目标是不同优化问题，旧 segment 的 discard 理由对新目标通常无意义。文案英文（与 `next_action_hint` 现有英文一致），单句约两行，内容覆盖三要素：判断什么（最新结果 vs rollback 理由）、推翻了怎么办（说明变化、定向重试、标 `asi.revisits_run`）、没推翻怎么办（跳过；验证性重跑不适用该标注）。

### D3. `asi.revisits_run` 纯透传，零新校验

`Asi` 类型已有索引签名（mcp/lib/types.ts:24），asi 整体已随 run_entry 透传进账本与 after 钩子——**无需改任何传输代码**。按 ADR-5（advisory 语义）与「对账不裁判」原则：不校验 run 号存在性（账本是事实源，照实记录）、不进审计不变量。dashboard 渲染时对非正整数静默跳过（防怪值污染 UI，不构成校验）。

### D4. confidence 快照：写 entry 前同源计算

现状：entry 写入后才 rebuildState 算 confidence、仅放返回值。改法：构造 entry 时用「state.runs + 本 entry」在内存中调 lib/experiment 的 confidence 纯函数预计算，写入 `entry.confidence = {level, value}`；返回值的 confidence 复用**同一次计算**（避免两次计算在边界输入下不一致）。细节：

- crash 行 metric 为 null——confidence 函数对无效行已有处理（与现状 rebuildState 一致），快照照常写入（记录的是「记录时刻」的置信状态）；
- validate.ts 不变量不检查未知字段，`confidence` 为新增可缺省字段，旧行回放不受影响（spec 已有 scenario 钉死）；
- dashboard 统计卡的 confidence 仍读重算值，不改（读快照留给后续需求）。

### D5. memory-inject 弃用理由行：与方向列表同窗、单条截断

现状「最近记录」仅 3 条 run（slice(-3)）带 rollback 提炼，旧 discard 理由不可见。新增独立聚合行「弃用方向与理由」：取当前 segment 内 status ∈ {discard, checks_failed} 且 `asi.rollback` 非空的行，窗口与「已尝试方向」一致（8 条），单条理由截断（约 60 字符）。独立成行而非扩「最近记录」窗口：理由行是按需检索的索引（重访判断用），逐 run 详情维持 3 条（上下文预算）。注入总量仍受 hook 8KB stdout 自限约束。

### D6. prompt.md 模板补「重访条件」；SKILL 同步

setup-guide 的 What's Been Tried 模板行示例追加重访条件字段说明；SKILL.md：asi 字段说明补 `revisits_run`，循环规程第 1 步 Review 补「重访检查」动作。均为文档改动，规程与工具返回字段互为印证。

## 非目标

- 不做 pi 的 `↻ Revisiting #N` 在 MCP 返回文本中的渲染（我方无 transcript 渲染面；dashboard 标注即等价物）。
- 不为 `revisits_run` 建重试队列/调度（pi 同样明确不做：agent 自主判断，无调度器）。
- 不动审计不变量与硬校验层。
