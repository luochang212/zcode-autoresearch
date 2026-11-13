# Spec Delta

## MODIFIED Requirements

### Requirement: 从账本导出静态 dashboard

`/autoresearch:export` 命令与 `export_dashboard` 工具 SHALL 读取 `.auto/log.jsonl`，生成自包含的静态 HTML（无外部网络依赖、无外部资源引用、零第三方运行时依赖），以 **Modern AI Research Console 风格**呈现全部实验历史：**hero 区**（无衬线会话标题开场；metric 名称/单位/方向元信息行；baseline → best 的大字排版与 overall 改善幅度，数字等宽 tabular-nums；下方为 **KPI 指标卡行**——Total Experiments / Kept / Reverted / No-op 四张紧凑卡片，每张含清晰数字与标签，置信度判定 `<verdict> <ratio>× noise` 以小徽章呈现在 hero 元信息）、**单张度量趋势折线**（覆盖全部有效 metric 点）、**实验记录表格**（全局序号/状态药丸/metric/Δ vs baseline/假设与结论/commit，假设与结论为主要阅读内容，长描述可展开收起）、页脚（`autoresearch · <最后 run 日期>` 与 `<N> runs · pinned at <短哈希>`）。呈现 SHALL 满足：

- **设计 token 单一来源**：颜色/字体/间距/圆角/边框/阴影 SHALL 经 CSS 变量统一为单一 token 层，SHALL NOT 存在两代样式叠加互相覆盖；基色为深海军蓝（暗色基底）与暖白（亮色基底），Lava Red 仅作少量强调；状态色只表达语义（keep 绿、discard 橙、crash/checks_failed 红系、noop 中性灰）；
- **深色优先双主题**：颜色 SHALL 经 CSS 变量定义并以 `prefers-color-scheme` 适配；深色（深海军蓝基底）为默认 token 集，亮色（暖白基底）经媒体查询覆盖，不依赖硬编码单主题色值；
- **无 segment 视觉分组**：会话在页面上 SHALL 呈现为单一平铺的 run 序列，config 行不产生分隔线、章节标题或边界标注（仅刷新标题与 metric/direction 口径）；Δ 统一相对全局首测基线；
- **度量趋势折线** SHALL 为内联 SVG（零外部依赖）：按全局顺序绘制全部有效 metric 点（keep 实心、非 keep 空心并标注序号），全局首测基线以虚线参考线标注；全账本有效点少于 2 时不绘制；桌面（960×240）与移动（390×240，1:1 比例）两个变体 SHALL 同时渲染并以 CSS 按视口切换；
- **图表 tooltip**：趋势数据点 hover SHALL 展示实验编号、metric 值、Δ（方向化）与状态，数据全部来自真实账本记录；有 JS 时以页面内 tooltip 呈现，无 JS 时 SHALL 降级为原生 `<title>`（不得产生不可读或伪造数据）；
- **实验记录表格与溢出治理**：账本 SHALL 为表格化行布局（状态药丸、metric 与 Δ 等宽数字右对齐、commit 以 monospace 徽标呈现、行 hover 轻微背景反馈）；描述等长字段 SHALL 可断行（`min-width: 0` + `overflow-wrap`）；超长描述 SHALL 以 `<details>` 展开收起（无 JS 可用，默认展开状态不丢失信息）；≤760px 视口下每行重排为紧凑布局（重排而非整体缩小），页面整体不得产生横向溢出；
- **页脚定格信息**：左侧 `autoresearch · <日期>`（账本最后一条 run 的时间戳日期）；右侧 `<N> runs`，且当 `git rev-parse --short HEAD` 可用时 SHALL 附加 ` · pinned at <短哈希>`（非 git 目录或命令失败时省略该段，渲染不失败）；≤760px 视口下页脚 SHALL 只保留左侧日期段。

`export_dashboard` 工具 SHALL 额外支持 **live server 模式**：在本机 127.0.0.1 随机端口启动 HTTP 服务，提供 `/`（live HTML）、`/autoresearch.jsonl`（账本原文）与 `/events`（SSE）三个路由；`init_experiment` 与 `log_experiment` 写账本后 SHALL 广播 `jsonl-updated` 事件使浏览器自动刷新（刷新前后 SHALL 恢复滚动位置）；工具返回 SHALL 包含 live URL 与静态文件路径。live server 与 MCP server 同进程，路由处理 SHALL 容错：`/autoresearch.jsonl` 在账本文件不存在时 SHALL 返回 404（不抛未捕获异常）；SSE 广播对已断开/写失败的客户端 SHALL 容错并把它从广播列表剔除，任何单个请求或客户端故障都不得使 MCP server 进程崩溃。

#### Scenario: 导出成功

- **WHEN** 用户执行 `/autoresearch:export`
- **THEN** 生成 `autoresearch-dashboard.html`（或等价路径）并告知用户文件位置，HTML 内包含完整实验列表、KPI 指标卡、结果构图与趋势折线

#### Scenario: 统计卡片无孤行

- **WHEN** 页面以标准宽度渲染（hero 结果构图 + KPI 卡行）
- **THEN** 结果构图在一行内呈现 baseline → best → overall；更窄视口下自然折行，不出现独占整行的单元素被拉伸变形

#### Scenario: KPI 指标卡计数

- **WHEN** 账本包含 keep、discard、noop 混合状态
- **THEN** 四张 KPI 卡分别呈现 Total Experiments / Kept / Reverted / No-op 计数（NO-OP 不计入 reverted），数字等宽对齐

#### Scenario: 度量趋势折线

- **WHEN** 账本含 ≥2 个有效 metric 记录
- **THEN** 渲染内联 SVG 折线：有效度量点按全局顺序连线（keep 实心、非 keep 空心并标注序号），全局 baseline 呈虚线参考线；无外部资源引用，无 segment 边界标注

#### Scenario: 图表 hover tooltip 来自真实账本

- **WHEN** 用户 hover（或键盘聚焦）趋势图数据点
- **THEN** tooltip 展示该实验的编号、metric 值、Δ 与状态，数值与账本记录一致；无 JS 时原生 `<title>` 提供同等信息

#### Scenario: 超长描述展开收起

- **WHEN** 某 run 的描述很长（超过收起阈值）
- **THEN** 该描述默认收起、可展开收起（`<details>` 或等价机制），无 JS 时仍可展开阅读完整内容，打印时不丢失

#### Scenario: config 行不产生分组

- **WHEN** 账本含多个 segment（多条 config 行）
- **THEN** 页面仍为单一平铺列表与单张折线图，不出现任何 `SEGMENT`/`seg` 文字或分隔标注；标题与 metric/direction 口径取最新 config 行，每行 Δ 相对全局首测基线计算

#### Scenario: 深色系统下可读

- **WHEN** 系统处于深色外观（prefers-color-scheme: dark）打开导出的 HTML
- **THEN** 页面以深海军蓝基底渲染：KPI 卡、结果构图、账本行、状态药丸与代码徽标对比可读，不出现"浅底浅字"或刺眼亮块

#### Scenario: 长字段不断页

- **WHEN** 某 run 的 description 含不可断行的长字符串（如长 URL）
- **THEN** 描述在行内断行显示，页面不产生整体横向溢出；窄视口下账本行重排为紧凑布局

#### Scenario: 页脚定格信息

- **WHEN** 账本最后一条 run 带时间戳，且导出发生在 git 仓库内
- **THEN** 页脚左侧显示 `autoresearch · <该时间戳日期>`，右侧显示 `<N> runs · pinned at <短哈希>`

#### Scenario: 非 git 目录省略 pin

- **WHEN** 导出发生在非 git 目录（或 rev-parse 失败）
- **THEN** 页脚仅显示 `<N> runs`，不含 pinned 段，导出不失败

#### Scenario: live server 模式

- **WHEN** agent 调用 `export_dashboard` 且返回含 `url`
- **THEN** 返回包含 `http://127.0.0.1:<port>` 的 URL；浏览器打开后能收到后续实验的 SSE 更新（页面自动刷新且滚动位置恢复）

#### Scenario: 账本不存在时账本路由容错

- **WHEN** live server 已启动，`.auto/log.jsonl` 被删除（如 `clear_experiments` 之后），客户端 GET `/autoresearch.jsonl`
- **THEN** 路由返回 404，MCP server 进程存活，`/` 路由仍可正常响应

#### Scenario: SSE 死客户端容错

- **WHEN** 一个 SSE 客户端异常断开后，账本写入触发 `jsonl-updated` 广播
- **THEN** 广播对死客户端容错（跳过并剔除），MCP server 进程存活，其余客户端仍收到事件

#### Scenario: 无实验数据

- **WHEN** `.auto/log.jsonl` 不存在或为空
- **THEN** 命令返回提示，不生成文件或生成空状态页（不渲染折线与 KPI 卡）

### Requirement: 报告阅读与证据导航

dashboard SHALL 突出 overall 改善幅度，显示指标名称、单位和方向，NO-OP 独立计数且不计入 reverted。趋势 SHALL 显示全量历史图例，并提供到对应账本行的可聚焦链接；数据点 hover SHALL 呈现实验编号、metric、Δ 与状态（来自真实账本）。账本 SHALL 提供全部、保留、回退、无改动筛选，按钮状态可访问（`aria-pressed`）；行 hover SHALL 有轻微背景反馈；超长描述 SHALL 可展开收起；无 JavaScript 时仍显示全部实验与完整信息。

#### Scenario: 计数与筛选

- **WHEN** 账本包含 keep、discard 和 noop
- **THEN** 三者分别计数，筛选只隐藏不匹配账本行，不改变趋势的全量历史

#### Scenario: 证据定位

- **WHEN** 用户通过键盘或指针激活趋势点
- **THEN** 页面定位到对应全局序号的实验行并突出该行；从图点进入被隐藏记录时恢复全部记录

#### Scenario: 行 hover 反馈

- **WHEN** 用户将指针悬停在账本行上
- **THEN** 该行呈现轻微背景变化（不改变布局与内容）

#### Scenario: 移动端阅读

- **WHEN** 页面在 390px 或 320px 视口打开
- **THEN** 描述、指标和控件可读且不产生页面横向溢出（重排而非缩小）
