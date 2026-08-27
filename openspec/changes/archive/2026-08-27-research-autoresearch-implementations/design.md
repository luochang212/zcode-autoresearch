## Context

本 change 的"实现"是一份研究文档，不涉及代码改动。研究素材只读：三个 autoresearch 仓库 + zcode-plugins 官方仓库（均为 archived/ 下的 git clone，含 .git 历史，可查证提交信息）。仓库规模差异大：karpathy 极小（3 个核心文件），uditgoenka 较大（plugins/、guide/、scripts/、tests/ 多目录），需要并行子任务控制单次阅读量。

报告语言为中文；报告落位 `docs/research/autoresearch-survey.md`；决策记录用 adrkit（`adrkit decide`）生成于 `adr/decisions/`。

## Goals / Non-Goals

**Goals:**
- 每个实现的分析都达到"机制级"深度：循环步骤、度量定义、状态文件、命令入口可复述。
- 所有关键论断可溯源到具体文件与行号（报告内引用 `archived/<repo>/<file>` 路径）。
- 设计建议直接映射 zcode-plugins 中真实存在的插件组成单元。

**Non-Goals:**
- 不实现 zcode 插件本身（后续 change）。
- 不运行任何实验或训练代码（无 GPU，且 archived 只读）。
- 不评价三个项目的研究结论优劣（如谁的模型更好），只分析机制。

## Decisions

**1. 研究方法：静态代码分析 + git 历史佐证，不执行代码。**
理由：目标产出是机制理解与形态选型，静态分析足够；执行训练代码不可行（H100 依赖、overnight 时长）。备选：跑通最小示例——放弃，成本高且不改变结论。

**2. 并行分工：三个仓库各派一个 Explore 子代理深读，主线程汇总。**
理由：三个仓库相互独立，并行可将深读时间压缩到三分之一；Explore 是只读代理，符合 archived 只读约束。zcode-plugins 较小，由主线程直接核实插件组成单元。

**3. 报告结构：背景 → 三个实现各一章 → 对比章 → zcode 插件建议章 → 开放问题。**
理由：对比维度在三章分析中统一小节标题（形态/循环/度量/状态/护栏/token），使对比章可直接横向引用，避免二次阅读。

**4. 事实核实用本地统计而非 README 声称。**
理由：uditgoenka README 声称 "630-line"、"95% token reduction"、"94–120 lines each" 等，必须用 `wc -l` 实测对照；spec 要求差异显式标注。

**5. ADR 在报告定稿后记录，而非边写边记。**
理由：ADR 应记录研究得出的结论（推荐形态等），结论在报告撰写中才收敛；报告引用 ADR 编号，故先定结论、后 `adrkit decide`、再回填编号。

## Risks / Trade-offs

- [子代理摘要遗漏关键机制细节] → 分析章节的小节标题由主线程统一定义并写进子代理提示词；子代理必须返回具体文件路径+行号证据。
- [三个项目版本不同期（karpathy 2026.3 原始版 vs uditgoenka v2.2.2）导致对比不公平] → 报告对比章显式标注各项目版本/日期，按"路线"而非"成熟度"对比。
- [zcode-plugins 仓库结构可能与 zcode 实际插件机制有出入（如 CLI 版本差异）] → 建议章标注核实到的仓库版本（git log），开放问题中列出未验证项。

## Open Questions

（无——插件的具体功能范围（优化目标类型、是否要 dashboard 等）属于后续 change 的规划输入，报告以"开放问题清单"形式交付，不在本 change 内决定。）
