## Purpose

定义 zcode autoresearch 插件 dashboard 导出的行为契约：`/autoresearch:export` 命令从实验账本生成静态 HTML 报告。

## ADDED Requirements

### Requirement: 从账本导出静态 dashboard

`/autoresearch:export` 命令 SHALL 读取 `.auto/log.jsonl`，生成自包含的静态 HTML（无外部网络依赖），展示：会话配置（度量、方向）、全部实验记录（iteration/status/metric/delta/description）、基线对比、best 与置信度信息。

#### Scenario: 导出成功
- **WHEN** 用户执行 `/autoresearch:export`
- **THEN** 生成 `autoresearch-dashboard.html`（或等价路径）并告知用户文件位置，HTML 内包含完整实验列表与统计

#### Scenario: 无实验数据
- **WHEN** `.auto/log.jsonl` 不存在或为空
- **THEN** 命令返回提示，不生成文件或生成空状态页

### Requirement: dashboard 反映度量方向与判定语义

导出内容 SHALL 按 direction 标注每个实验相对基线的改善/恶化（lower 时数值下降为改善），并区分 keep/discard/crash/checks_failed 状态。

#### Scenario: 状态着色与方向标注
- **WHEN** 账本包含 mixed 状态的记录
- **THEN** dashboard 按状态分类展示，并标注每个实验的改善/恶化
