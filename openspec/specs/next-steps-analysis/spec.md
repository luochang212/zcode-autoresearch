## Purpose

定义"下一步方向"研究报告的内容契约：基于最新代码与实证，重审不可行项（替代方案×成本×收益），扫描 pi 之外的 autoresearch 生态，产出可执行的下一步路线图。

## Requirements

### Requirement: 不可行项重审必须给出三分类与实证依据

报告 SHALL 对差距矩阵中标为「平台不可行」的每一项（确定性 compaction、无限 auto-resume、TUI widget/overlay、settle 窗口），逐一评估替代方案，分类为「平台硬顶」（zcode 无任何变通原语）、「高成本替代」（可行但成本/收益不成比例）、「低成本变相」（用现有原语可部分追平），每项 MUST 附实证依据（zcode bundle/文档核对或原型验证）与成本量级。

#### Scenario: 读者可据此决策是否投入

- **WHEN** 读者查看某一不可行项
- **THEN** 该行包含：平台现状证据、替代方案、成本量级、收益评估、最终分类

### Requirement: 生态扫描必须评估可借鉴性

报告 SHALL 搜索并评估 pi-autoresearch 之外的 autoresearch 类项目（GitHub/npm/社区/博客提及的工具），每个 MUST 标注定位、亮点能力、以及移植到 zcode 插件的可行性与价值（是否已有或可借鉴）。

#### Scenario: 生态借鉴点可执行

- **WHEN** 读者查看某一外部项目
- **THEN** 能判断其亮点是否值得引入 zcode 插件（引用来源）

### Requirement: 路线图必须可执行

报告 SHALL 产出下一步路线图，每项含 交付物、验证方式、成本分级（quick win / 中等 / 高），并按价值×成本排序；涉及低成本变相项与生态借鉴项的需给出具体方案。

#### Scenario: 路线图直接可开工

- **WHEN** 读者按路线图实施
- **THEN** 每项有明确交付物与验收，无需重新调研
