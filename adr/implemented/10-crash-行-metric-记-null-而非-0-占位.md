---
status: implemented
date: 2026-11-01
description: 改 crash 行的 metric 语义、或任何「无测量值如何入账」的边界时读；修正 ADR-5 §1 的占位声称。
raised-by: agent
decided-by: human
created: 2026-11-01
commit: "7025605"
paths: [plugin/mcp/**]
---

# ADR: 10 crash 行 metric 记 null 而非 0 占位

## Problem

ADR-5 §1 曾定格「crash 的 metric=0 是占位符，无测量语义（不参与改进比较）」。占位 0 有两个真实代价：其一，0 在 `lower` 方向下是「最好值」，后续任何 run 与之比较都会被误判为倒退，confidence/plateau 的统计被一个没发生过的测量污染；其二，仪表盘与导出会把 0 渲染成一个真实成绩。占位语义靠下游各自「记得跳过 0」来成立，是分散的隐式约定，容易在新增消费方时被遗忘。2026-09-02 的已归档 change 将实现改为 null，但 ADR-5 的事实性声称未同步，形成规范-决策记录漂移。

## Decision

crash 行的 `metric` 记为 JSON `null`（`server.ts` 的 run/log 路径与 `lib/validate.ts` 均按 null 实现）：null 表示「没有测量」，confidence/baseline/best/plateau 的计算天然跳过 null 值，无需任何下游特判；导出与仪表盘渲染为「无值」而非 0。crash 行仍照常入账并参与审计顺序，status 字段承载语义，metric 不再承载任何测量含义。

本条修正 ADR-5 §1 中「crash 的 metric=0 是占位符」的声称；ADR-5 其余内容（审计不变量、漂移检测、次级度量约束、auditBypass 统一出口）仍然有效、保持 active。

## Alternatives considered

- **维持 ADR-5 的 0 占位**：否决。0 是合法的测量值，占位与真值在类型上不可区分，每个下游都要带「这是占位」的隐式知识，污染基线与统计（见 Problem）。
- **crash 行不入账**：否决。crash 是实验事实，账本必须完整记录循环发生过什么（审计顺序、doom-loop 检测都依赖 crash 行存在），只是不带测量值。
- **另设 `metric: {measured: false}` 复合类型**：否决。账本行是 append-only JSONL，消费方（dashboard、导出、confidence）都要为复合类型分叉；null 是 JSON 生态表达「无值」的惯用法。

## Consequences

- 换来：无测量语义与测量值在类型上可区分，下游零特判，统计不再被假值污染。
- 代价：消费 metric 的代码必须容忍 null（类型上 `number | null`），崩溃段的 confidence 样本变少（这是如实反映，不是损失）。
- ADR-5 §1 的占位声称已按本条勘误，并加了指回本条的注记；两处表述冲突时以本条为准。
