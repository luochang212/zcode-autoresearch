---
status: accepted
date: 2026-08-27
created: 2026-08-27
---

# ADR: 4 next steps: low-cost variants first (memory-inject, doom-loop), keep platform hard-limits

## Problem

追平 pi 的 28 项能力后需要确定下一步方向。三个问题：原判"平台不可行"的 5 项是否真的无法追平；pi 之外是否有可借鉴项目；下一步做什么。研究产出 `docs/research/next-steps.md`。

## Decision

1. **不可行项重审结论**：4 项维持平台硬顶（无限 auto-resume 为"高成本替代不值得"，widget/overlay/settle 为无变通），**确定性 compaction 升级为"低成本变相"**——memory-inject 增强（聚合摘要：方向去重 + best 轨迹 + 最近 N 条 + ASI），可追平信息连续性 70-80%，列入 P0。
2. **生态借鉴（pi 之外，已亲自核实源码）**：优先吸收确定性逻辑——**审计不变量**（leo-lilinxiao/codex-autoresearch：事件溯源 + keep 必须改进 / discard 改进必须有 failed guard / commit 溯源 / error 未 revert 禁续跑，P1）、**doom-loop 检测**（ml-intern，P0）、**基准信任预检与漂移检测**（P1）、**次级度量阻塞约束**（Westland，P1）。TheGreenCedar/codex-autoresearch 的"决策引擎"经源码核实实为**决策引导**（组装上下文给 LLM，非硬决策）——降级为 `session_status` 建议（P2）。
3. **不做**：无头循环驱动（护栏损失）、widget/overlay（平台硬顶）、OS 级沙箱（超出插件边界）、论文生成类（超出定位）。
4. 防作弊原则沿用 Westland/Gomoku 教训：结构性控制胜过 prompt 契约；实现审计不变量时保留"人工解锁"出口，避免 leo 式 resume 卡死副作用。

## Alternatives considered

- **先做决策引擎（P1）再补 P0**：否决——P0 两件（memory-inject 增强 + doom-loop）成本近零且直接补长跑健壮性，决策引擎在其之上收益更大。
- **做 holdout 验收（P2）**：否决——价值高但成本中高，且依赖先有决策引擎与信任预检（证据基础）。
- **维持全部不可行项原判**：否决——memory-inject 增强证明 compaction 可低成本变相，放弃是次优。

## Consequences

- 买到了：下一步有明确、低成本、可执行的前置项；视野从"追平 pi"扩展到"吸收生态最佳实践"；防作弊从 prompt 升级为结构性控制的路径明确。
- 付出的：auto-resume/widget/overlay 仍是永久能力差（如实文档化）；P1/P2 项需后续 change 逐个实施，非一次到位。
