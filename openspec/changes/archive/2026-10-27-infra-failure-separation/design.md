# 设计：区分基础设施故障与代码故障

## Context

- `detectDoomLoop`（`plugin/mcp/lib/experiment.ts:203`）是纯文本层检测，取末窗（默认 6）行、normalize 假设文本（`asi.hypothesis` 优先、回退 `description`）、判 3 连相似（repeat）或 A→B→A→B（oscillate）。
- crash 行 metric=null 已保证不污染 baseline/best/置信度/平台期（主规范既有语义）；受污染的 advisory 信号是 doom-loop 与连续失败计数。
- 信号均为 advisory（ADR-5）：本改动全部落在信号层与提示文案，不新增硬校验。
- SKILL.md 的循环规程（`plugin/skills/autoresearch/SKILL.md` 步骤 4/5）是 agent 侧唯一的行为约定面。

## Goals / Non-Goals

**Goals**

- 环境故障不再污染 doom-loop 信号
- 两类失败在账本可事后区分（`asi.infra`）
- doom-loop 应对含调研逃逸指引；keep/discard 权衡含简单性判据

**Non-Goals**

- 不自动重试基础设施故障：重试与否仍是 agent 决策（zcode 侧无美团平台那样的调度器，"不占轮次预算"无对应机制，保持 advisory）
- 不改 crash 的 metric=null / 回滚 / 审计语义
- 不动连续失败计数（`consecutiveFailures`）对 crash 的计入：它供 Stop hook 续跑语义使用（guardrails 规范面），环境故障风暴触发"换方法或停止"的建议并不错误；扩此范围需单独评估
- 不动平台期/置信度计算（metric=null 已天然隔离）

## Decisions

**D1：成因判断放 agent（`asi.infra` 自标），工具不自动识别。**
同一 crash 现象两种成因都可能（OOM 可能是想法超内存也可能是机器被占），工具侧无可靠判据；agent 有报错全文与上下文。与 ASI 既有约定（`rollback`/`next_action_hint`/`revisits_run`）同构：agent 写、工具透传、账本为事实源。备选"工具按 exit code/超时自动归类"被否：判据不可靠且跨基准不可迁移。

**D2：过滤时机在 detectDoomLoop 入口，先剔除 `asi.infra === true` 行、再取末窗。**
语义 = "infra 行从时间线上拿掉"，与"环境故障不占假设历史"直觉一致；不改 normalize/相似度逻辑，改动面最小。备选"保留行但匹配时跳过"被否：会在窗口内挤出真实行，边界更绕。

**D3：调研逃逸只改提示文案，不引入强制阻断。**
"强制调研逃逸"（美团 V3）依赖平台级调研机制；zcode 侧硬阻断违背 advisory 原则（ADR-5）。文案落在 `next_action_hint`（工具侧）与 SKILL.md 步骤 5（规程侧）两处，保持一致。

**D4：简单性判据只进 SKILL.md，不进工具。**
"更简单的实现"无法机械化判定（LoC 只是粗糙代理），属 agent 决策权衡指导；来源为 Karpathy program.md（`archived/karpathy-autoresearch/program.md`）。

## Risks / Trade-offs

- agent 可能滥用 `infra: true` 规避 doom-loop 信号 → 文案明确"仅环境问题"；advisory 层本就信任 agent（与 `auditBypass` 同级风险，可接受）
- 旧账本行无 `asi.infra` → 按缺省（非 infra）处理，行为不变，无迁移

## Open Questions

无。
