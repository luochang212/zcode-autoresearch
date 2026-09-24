# Proposal: add-discard-revisit

## Why

pi-autoresearch 1.8.0 落地了 discard 重访机制（#94 revisit discards when their assumptions change）：agent 弃掉想法的依据（rollback 理由）可能被后续实验悄悄推翻——例如 run #7 因「CPU 已满载」被弃，run #12 加缓存后 CPU 空闲了，#7 就值得重试——但没有任何机制在假设失效的时刻提醒 agent 回头检查。我方追平队列已将该机制列为 P1（worth-fix 审计 docs/research/change-queue-worth-fix.md §B1）：memory-inject 仅注入最近 3 条 run 的 ASI（含 rollback），3 轮以外的 discard 理由不可见；`next_action_hint` 只覆盖上限/doom/连败/平台期四种分支，无重访逻辑。审计同时判定 confidence 持久化（G2.2）为卫生级顺手项，并入本 change。

## What Changes

- `log_experiment` 返回新增 `revisit_nudge` 字段：当前 segment 存在带 `asi.rollback` 理由的 discard/checks_failed 行时，返回固定重访提问（选择下一实验前，先判断最新结果是否推翻某条 discard 的 rollback 理由；有则说明变化并权衡定向重试，无则跳过；验证性重跑不适用该标注）
- 支持重试标注 `asi.revisits_run: <run 号>`：agent 有意重试旧 discard 时标注来源 run，账本自然透传（`Asi` 已有索引签名，无类型变更）；dashboard 在对应 run 行渲染 `↻ Revisiting #N` 标记，把「有依据的重访」与「忘了失败」区分开
- memory-inject 注入增强：新增「弃用方向与理由」聚合行——带 `asi.rollback` 的 discard/checks_failed 行（与已尝试方向同窗 8 条、单条截断），让旧 discard 的理由在 3 条 run 窗口之外仍可见
- confidence 快照进账本 run 行（worth-fix 审计 §B3 / 上轮审计 G2.2 收尾）：`log_experiment` 写 entry 时把本次计算出的 confidence 持久化为 `confidence: {level, value}`，事后分析无需依赖账本完整重算
- `.auto/prompt.md` 章程模板（setup-guide）的 What's Been Tried 节增加「重访条件」记录要求：弃掉想法时写下「何种条件成立时值得重访」，使该判断跨 compaction 存活
- `skills/autoresearch/SKILL.md` 循环规程与 asi 字段文档同步（revisits_run 用法、重访检查步骤）

信号语义遵循 ADR-5：重访提问与标注均为 advisory（提示与透传），不新增硬校验、不改动审计不变量。

## Capabilities

### Modified Capabilities

- `autoresearch/experiment-loop`：`log_experiment` 返回契约变化——新增 `revisit_nudge` 字段；`confidence` 由「仅返回」扩展为「返回并持久化到账本 run 行」
- `autoresearch/guardrails`：实验记忆注入的注入内容清单新增「弃用方向与理由」聚合行

### New Capabilities

（无——均为既有能力的行为扩展）

## Impact

- `plugin/mcp/server.ts`：`log_experiment` 返回构造（revisit_nudge）、entry 构造（confidence 快照；需在写 entry 前用「现有 runs + 本 entry」内存计算 confidence，返回值复用同一计算避免双算不一致）
- `plugin/hooks/memory-inject.ts`：新增弃用理由聚合行
- `plugin/mcp/lib/dashboard.ts`：run 行重试标注渲染（静态导出与 live 共用渲染层）
- `plugin/skills/autoresearch/`：SKILL.md（asi 字段说明、循环规程第 1 步 Review 补重访检查）、references/setup-guide.md（prompt.md 模板补重访条件）
- 测试：server/hooks/dashboard/memory-inject 相应扩展；新增 revisit_nudge 触发条件与 confidence 快照断言
- 兼容性：账本旧行无 `confidence` 字段——rebuildState 与审计不变量按「字段可缺省」处理；`revisit_nudge` 为新增返回字段，不影响既有消费者
