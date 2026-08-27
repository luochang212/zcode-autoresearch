## MODIFIED Requirements

### Requirement: 从账本导出静态 dashboard

`/autoresearch:export` 命令 SHALL 读取 `.auto/log.jsonl`，生成自包含的静态 HTML（无外部网络依赖），展示：会话配置（度量、方向）、全部实验记录（iteration/status/metric/delta/description）、基线对比、best 与置信度信息。`export_dashboard` 工具 SHALL 额外支持 **live server 模式**：在本机 127.0.0.1 随机端口启动 HTTP 服务，提供 `/`（live HTML）、`/autoresearch.jsonl`（账本原文）与 `/events`（SSE）三个路由；`init_experiment` 与 `log_experiment` 写账本后 SHALL 广播 `jsonl-updated` 事件使浏览器自动刷新；工具返回 SHALL 包含 live URL 与静态文件路径。

#### Scenario: 导出成功
- **WHEN** 用户执行 `/autoresearch:export`
- **THEN** 生成 `autoresearch-dashboard.html`（或等价路径）并告知用户文件位置，HTML 内包含完整实验列表与统计

#### Scenario: live server 模式
- **WHEN** agent 调用 `export_dashboard` 且返回含 `url`
- **THEN** 返回包含 `http://127.0.0.1:<port>` 的 URL；浏览器打开后能收到后续实验的 SSE 更新（页面自动刷新）

#### Scenario: 无实验数据
- **WHEN** `.auto/log.jsonl` 不存在或为空
- **THEN** 命令返回提示，不生成文件或生成空状态页

### Requirement: dashboard 反映度量方向与判定语义

导出内容 SHALL 按 direction 标注每个实验相对基线的改善/恶化（lower 时数值下降为改善），并区分 keep/discard/crash/checks_failed 状态。

#### Scenario: 状态着色与方向标注
- **WHEN** 账本包含 mixed 状态的记录
- **THEN** dashboard 按状态分类展示，并标注每个实验的改善/恶化
