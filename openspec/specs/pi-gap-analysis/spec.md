## Purpose

定义 pi-autoresearch 差距分析研究报告的内容契约：以代码与数据核实为准，覆盖 pi 的触发机制、架构、能力、效果四维，产出我方插件审计、三分类差距矩阵与追平路线图。

## Requirements

### Requirement: 报告必须覆盖 pi 四维全貌

报告 SHALL 分别剖析 pi-autoresearch 的触发机制（用户触发路径、自动激活判定、会话生命周期事件）、架构（extension/skill/command 三层边界与状态流）、能力清单（工具、auto-resume、compaction、dashboard、finalize、hooks 教学、confidence/ASI/segment 等逐项）、效果证据（npm 下载量、GitHub stars、README/CHANGELOG 声称、用户证据），每项 MUST 标注核实来源。

#### Scenario: 读者可据此判断追平可行性
- **WHEN** 读者阅读某能力的分析
- **THEN** 能明确该能力的行为细节与实现位置（文件路径+行号），以及是否有第三方效果证据

### Requirement: 报告必须审计我方插件并产出三分类差距矩阵

报告 SHALL 逐项对照 `plugin/` 现有能力与 pi 能力清单，产出差距矩阵；每个差距 MUST 标注为「可追平」（zcode 有能力等价物，直接实现）、「zcode 受限」（有替代方案但有损/降级）或「平台不可行」（依赖 zcode 不存在的 API，无法实现），并附原因。

#### Scenario: 差距有明确分类
- **WHEN** 读者查看任一差距项
- **THEN** 该行包含：pi 行为、我方现状、分类、分类理由、潜在替代方案（若受限）

### Requirement: 报告必须产出按优先级排序的追平路线图

报告 SHALL 按「差距大小 × 对核心循环价值 × 实现成本」对可追平项排序，给出里程碑（每阶段含目标能力、验证方式）；zcode 受限项 SHALL 单独列出替代方案评估。

#### Scenario: 路线图可直接作为后续 change 输入
- **WHEN** 读者按路线图实施
- **THEN** 每个里程碑有明确交付物与验收方式，无需重新调研

### Requirement: 关键决策沉淀为 ADR

追平优先级与"受限/不可行"取舍 SHALL 以 adr-kit 记录，报告 MUST 引用 ADR 编号。

#### Scenario: 报告与 ADR 互相引用
- **WHEN** 报告给出追平优先级推荐
- **THEN** 存在对应 ADR 记录且报告标注编号
