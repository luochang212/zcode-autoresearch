## MODIFIED Requirements

### Requirement: 从账本导出静态 dashboard

`/autoresearch:export` 命令 SHALL 读取 `.auto/log.jsonl`，生成自包含的静态 HTML（无外部网络依赖、无外部资源引用），展示：会话配置（度量、方向）、统计卡片（experiments/kept/reverted/baseline/best/confidence）、**度量趋势折线**、全部实验记录（iteration/status/metric/delta/description）、基线对比、best 与置信度信息。呈现 SHALL 满足：

- **统计卡片 SHALL 等宽网格布局**（CSS grid，`auto-fit + minmax`）：confidence 卡存在时（6 卡）在标准宽度（900px 级容器）内单行放下，更窄视口下均匀折行，不得出现单卡孤行；
- **度量趋势折线** SHALL 为内联 SVG（零外部依赖）：按 run 顺序绘制有效 metric 点（keep 实心、非 keep 空心），基线以虚线参考线标注；有效点少于 2 时不绘制；
- **亮暗双主题**：颜色 SHALL 经 CSS 变量定义并以 `prefers-color-scheme` 适配深色（表头、徽章、代码底、弱化文字在深色下均可读），不依赖硬编码单主题色值；
- **溢出治理**：描述等长字段 SHALL 可断行（`overflow-wrap`），表格 SHALL 置于横向滚动容器中，页面整体不得因长字段产生横向溢出。

`export_dashboard` 工具 SHALL 额外支持 **live server 模式**：在本机 127.0.0.1 随机端口启动 HTTP 服务，提供 `/`（live HTML）、`/autoresearch.jsonl`（账本原文）与 `/events`（SSE）三个路由；`init_experiment` 与 `log_experiment` 写账本后 SHALL 广播 `jsonl-updated` 事件使浏览器自动刷新；工具返回 SHALL 包含 live URL 与静态文件路径。live server 与 MCP server 同进程，路由处理 SHALL 容错：`/autoresearch.jsonl` 在账本文件不存在时 SHALL 返回 404（不抛未捕获异常）；SSE 广播对已断开/写失败的客户端 SHALL 容错并把它从广播列表剔除——任何单个请求或客户端故障都不得使 MCP server 进程崩溃。

#### Scenario: 导出成功

- **WHEN** 用户执行 `/autoresearch:export`
- **THEN** 生成 `autoresearch-dashboard.html`（或等价路径）并告知用户文件位置，HTML 内包含完整实验列表、统计卡片与统计信息

#### Scenario: 统计卡片无孤行

- **WHEN** 会话产生 confidence 卡（共 6 张统计卡）且页面以 900px 级宽度渲染
- **THEN** 六张卡等宽排布在同一行；更窄视口下折行为均匀多行，不出现单卡独占一行

#### Scenario: 度量趋势折线

- **WHEN** 当前 segment 含 ≥2 个有效 metric 记录
- **THEN** 表格上方渲染内联 SVG 折线：有效度量点按 run 顺序连线（keep 实心、非 keep 空心），baseline 呈虚线参考线；无外部资源引用

#### Scenario: 深色系统下可读

- **WHEN** 系统处于深色外观（prefers-color-scheme: dark）打开导出的 HTML
- **THEN** 页面以深色主题渲染：表头文字与背景对比可读、徽章与代码块降饱和适配，不出现"浅底浅字"或刺眼亮块

#### Scenario: 长字段不断页

- **WHEN** 某 run 的 description 含不可断行的长字符串（如长 URL）
- **THEN** 描述在单元格内断行显示，表格在横向滚动容器内滚动，页面不产生整体横向溢出

#### Scenario: live server 模式

- **WHEN** agent 调用 `export_dashboard` 且返回含 `url`
- **THEN** 返回包含 `http://127.0.0.1:<port>` 的 URL；浏览器打开后能收到后续实验的 SSE 更新（页面自动刷新）

#### Scenario: 账本不存在时账本路由容错

- **WHEN** live server 已启动，`.auto/log.jsonl` 被删除（如 `clear_experiments` 之后），客户端 GET `/autoresearch.jsonl`
- **THEN** 路由返回 404，MCP server 进程存活，`/` 路由仍可正常响应

#### Scenario: SSE 死客户端容错

- **WHEN** 一个 SSE 客户端异常断开后，账本写入触发 `jsonl-updated` 广播
- **THEN** 广播对死客户端容错（跳过并剔除），MCP server 进程存活，其余客户端仍收到事件

#### Scenario: 无实验数据

- **WHEN** `.auto/log.jsonl` 不存在或为空
- **THEN** 命令返回提示，不生成文件或生成空状态页（不渲染折线）

### Requirement: dashboard 反映度量方向与判定语义

导出内容 SHALL 按 direction 标注每个实验相对基线的改善/恶化（lower 时数值下降为改善），并区分 keep/discard/crash/checks_failed/noop 状态：keep 绿色、discard 橙色、crash 与 checks_failed 红色系、**noop 中性灰**（no-op 不是失败，不得使用失败红色）。

#### Scenario: 状态着色与方向标注

- **WHEN** 账本包含 mixed 状态的记录（含 no-op 行）
- **THEN** dashboard 按状态分类着色（noop 为中性灰而非红），并标注每个实验的改善/恶化
