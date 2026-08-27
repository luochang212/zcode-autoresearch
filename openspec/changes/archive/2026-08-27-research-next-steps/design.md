## Context

前置：`docs/research/pi-gap-analysis.md`（28 项差距 + 5 项平台不可行结论）、`autoresearch-survey.md`（三项目机制研究）、9 个已归档 change。本轮基于最新代码复核结论并扩展视野。实证基线：zcode v0.16.5（bundle mtime 2026-08-26，关键事件确认无 PreCompact/无会话注入/无 UI 扩展点）。

## Goals / Non-Goals

**Goals:**

- 把"平台不可行"从结论升级为"成本-收益"评估（替代方案是否值得做）。
- 发现 pi 之外的可借鉴项目，避免视野局限。
- 产出可直接开工的下一步路线图。

**Non-Goals:**

- 不实现任何推荐项（研究先行）。
- 不重复已有研究（三项目机制不重挖）。
- 不为推荐而推荐——诚实标注"维持现状"的项。

## Decisions

**1. 不可行项重审方法 = 替代方案原型思维，而非文档复查。** 平台侧已实证（bundle 零命中），重审聚焦"有没有变通"：

- 确定性 compaction → 替代 = memory-inject 增强（聚合摘要：已尝试方向去重、best 轨迹、最近 N 条 + ASI）——低成本，能追平"信息连续性"的大部分；平台硬顶的是"注入时机绑定 compaction 事件"。
- 无限 auto-resume → 替代 = 无头多轮驱动（`--prompt` 循环）/ Stop 3 次窗口；平台硬顶的是"会话内无限续跑"。评估无头自动循环脚本作为"无人值守"替代的可行性（成本中等）。
- widget/overlay → 替代 = 无（zcode 无 UI 扩展点）；维持浏览器 dashboard。分类：平台硬顶。
- settle 窗口 → 平台行为，无需追平。
  每项给成本量级（代码行数/新模块/复杂度）。

**2. 生态扫描范围：** GitHub 搜 "autoresearch" / "self-improving" / "agent experiment loop"；已知待查：Westland 的 harness、Shopify 内部工具公开材料、karpathy 后续、langchain/smolagents 类框架的 loop 组件、以及新兴的 autoresearch 项目（2026 年出现的新仓库）。评估维度：定位、亮点、与 zcode 插件契合度。

**3. 路线图排序公式沿用：价值×可感知÷成本。** 含三类项：低成本变相（memory-inject 增强等）、生态借鉴（若发现高价值）、工程项（版本管理、账本性能）。

## Risks / Trade-offs

- [生态扫描命中噪声（同名无关项目）] → 用 gh 搜索精确关键词 + 人工筛选定位相关者。
- [替代方案评估过乐观] → 每项标注"平台硬顶边界"（哪些部分不可变通）。
- [路线图过载] → 严格按排序给 top 项，不堆清单。

## Open Questions

（研究中的未知在报告开放问题章节交付。）
