## Purpose

定义「autoresearch 实现调研」研究报告的内容契约：报告必须以仓库实际代码为依据覆盖三个既有实现，并产出可直接支撑 zcode 插件设计的对比结论与建议。

## ADDED Requirements

### Requirement: 报告必须逐一剖析三个 autoresearch 实现

报告 SHALL 为 archived/ 下三个实现（karpathy-autoresearch、pi-autoresearch、uditgoenka-autoresearch）各提供一章完整分析，每章 MUST 覆盖：架构形态与组成文件、实验循环的具体步骤（含输入输出）、度量与验证机制、状态与记忆管理（git/日志/会话文件）、安全护栏（若有）、以及上下文/token 开销的控制方式。

#### Scenario: 读者只读单章即可复现该项目循环

- **WHEN** 读者阅读报告中任一实现的分析章节
- **THEN** 该章包含足够的机制细节（循环步骤、度量定义、状态文件路径、命令入口），使读者无需翻阅原仓库即可描述该项目一次完整实验迭代是怎么跑的

### Requirement: 报告结论必须以代码事实为准

报告中关于实现机制的关键论断（如文件行数、工具数量、命令清单、token 声称）SHALL 以仓库实际代码为准进行核实；README 的单方面声称若与代码不符或无法核实，报告 MUST 显式标注差异，不得直接采信。

#### Scenario: README 声称与代码不符时

- **WHEN** 某项目的 README 声称（如 "95% token reduction"、行数、命令数量）与实际代码统计不一致
- **THEN** 报告给出实测数字并标注与声称的差异

### Requirement: 报告必须包含跨实现对比

报告 SHALL 提供统一维度的对比章节，MUST 至少覆盖：架构形态（纯 prompt vs extension vs skill 套件）、循环驱动方式、度量定义与获取、回滚/保留策略、护栏、token 效率、可移植性（迁移到 zcode 的成本）。

#### Scenario: 对比结论可指导选型

- **WHEN** 读者想知道"为 zcode 做插件该选哪种形态"
- **THEN** 对比章节能直接回答各形态在 zcode 上的可行性，而不是仅罗列差异

### Requirement: 报告必须产出面向 zcode 插件的设计建议

报告 SHALL 基于 archived/zcode-plugins 官方仓库核实 zcode 插件的组成单元（如 skills、commands、hooks、MCP 等），并给出 zcode autoresearch 插件的形态建议：推荐的插件组成、从三个实现分别借鉴什么、需要新增决策的开放问题清单。

#### Scenario: 建议落到插件的具体组成单元

- **WHEN** 读者阅读设计建议章节
- **THEN** 建议明确指出插件应包含哪些组成单元（对应 zcode-plugins 中真实存在的单元类型），而不是泛泛的架构描述

### Requirement: 关键决策必须沉淀为 ADR

研究产出的关键结论（如推荐形态、核心机制取舍）SHALL 以 adr-kit 记录为编号决策（`adrkit decide`），报告 MUST 引用对应 ADR 编号。

#### Scenario: 报告与 ADR 互相引用

- **WHEN** 报告给出某项关键设计推荐
- **THEN** 存在对应的 ADR 记录，且报告章节标注其编号
