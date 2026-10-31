## Purpose

定义 zcode autoresearch 插件 dashboard 导出的行为契约：`/autoresearch:export` 命令从实验账本生成静态 HTML 报告。

## Requirements

### Requirement: 从账本导出静态 dashboard

`/autoresearch:export` 命令与 `export_dashboard` 工具 SHALL 读取 `.auto/log.jsonl`，生成自包含的静态 HTML（无外部网络依赖、无外部资源引用），以**编辑部式档案页**呈现全部实验历史：hero 区（衬线会话标题直接开场，无 eyebrow 装饰；**结果构图**为 baseline → best 的大字排版，overall 改善幅度以强调色呈现；**元信息行**为点分隔的 experiments/kept/reverted 计数与置信判定 `<verdict> <ratio>× noise`，判定按红黄绿着色显示 PASS/WEAK/FAIL）、**单张度量趋势折线**（覆盖全部有效 metric 点）、平铺账本列表（全局序号/状态徽章/metric/Δ vs baseline/描述/commit）、页脚（`autoresearch · <最后 run 日期>` 与 `<N> runs · pinned at <短哈希>`）。呈现 SHALL 满足：

- **无 segment 视觉分组**：会话在页面上 SHALL 呈现为单一平铺的 run 序列，config 行不产生分隔线、章节标题或边界标注（仅刷新标题与 metric/direction 口径）；Δ 统一相对全局首测基线；
- **双主题**：颜色 SHALL 经 CSS 变量定义并以 `prefers-color-scheme` 适配（亮：暖纸底 + 纸纹 + 锈红强调；暗：深面板 + 青强调），不依赖硬编码单主题色值；
- **度量趋势折线** SHALL 为内联 SVG（零外部依赖）：按全局顺序绘制全部有效 metric 点（keep 实心、非 keep 空心并标注序号），全局首测基线以虚线参考线标注；全账本有效点少于 2 时不绘制；桌面（960×190）与移动（390×240，1:1 比例）两个变体 SHALL 同时渲染并以 CSS 按视口切换；
- **账本网格与溢出治理**：账本 SHALL 为 CSS grid 行布局（非表格），描述等长字段 SHALL 可断行（`min-width: 0` + `overflow-wrap`）；≤760px 视口下每行重排为紧凑表格行（编号+徽章+commit / metric+Δ 同行，描述次行），页面整体不得产生横向溢出；
- **页脚定格信息**：左侧 `autoresearch · <日期>`（账本最后一条 run 的时间戳日期）；右侧 `<N> runs`，且当 `git rev-parse --short HEAD` 可用时 SHALL 附加 ` · pinned at <短哈希>`（非 git 目录或命令失败时省略该段，渲染不失败）；≤760px 视口下页脚 SHALL 只保留左侧日期段。

`export_dashboard` 工具 SHALL 额外支持 **live server 模式**：在本机 127.0.0.1 随机端口启动 HTTP 服务，提供 `/`（live HTML）、`/autoresearch.jsonl`（账本原文）与 `/events`（SSE）三个路由；`init_experiment` 与 `log_experiment` 写账本后 SHALL 广播 `jsonl-updated` 事件使浏览器自动刷新；工具返回 SHALL 包含 live URL 与静态文件路径。live server 与 MCP server 同进程，路由处理 SHALL 容错：`/autoresearch.jsonl` 在账本文件不存在时 SHALL 返回 404（不抛未捕获异常）；SSE 广播对已断开/写失败的客户端 SHALL 容错并把它从广播列表剔除，任何单个请求或客户端故障都不得使 MCP server 进程崩溃。

#### Scenario: 导出成功

- **WHEN** 用户执行 `/autoresearch:export`
- **THEN** 生成 `autoresearch-dashboard.html`（或等价路径）并告知用户文件位置，HTML 内包含完整实验列表、结果构图与趋势折线

#### Scenario: 统计卡片无孤行

- **WHEN** 页面以标准宽度渲染（无网格统计带，历史场景的继承：卡片网格 → 编辑部统计带 → 结果构图 + 元信息行）
- **THEN** 结果构图在一行内呈现 baseline → best → overall；更窄视口下自然折行，不出现独占整行的单元素被拉伸变形

#### Scenario: 度量趋势折线

- **WHEN** 账本含 ≥2 个有效 metric 记录
- **THEN** 渲染内联 SVG 折线：有效度量点按全局顺序连线（keep 实心、非 keep 空心并标注序号），全局 baseline 呈虚线参考线；无外部资源引用，无 segment 边界标注

#### Scenario: config 行不产生分组

- **WHEN** 账本含多个 segment（多条 config 行）
- **THEN** 页面仍为单一平铺列表与单张折线图，不出现任何 `SEGMENT`/`seg` 文字或分隔标注；标题与 metric/direction 口径取最新 config 行，每行 Δ 相对全局首测基线计算

#### Scenario: 深色系统下可读

- **WHEN** 系统处于深色外观（prefers-color-scheme: dark）打开导出的 HTML
- **THEN** 页面以深色主题渲染：结果构图、元信息行、账本行、徽章与代码块对比可读，不出现"浅底浅字"或刺眼亮块

#### Scenario: 长字段不断页

- **WHEN** 某 run 的 description 含不可断行的长字符串（如长 URL）
- **THEN** 描述在行内断行显示，页面不产生整体横向溢出；窄视口下账本行重排为两列网格

#### Scenario: 页脚定格信息

- **WHEN** 账本最后一条 run 带时间戳，且导出发生在 git 仓库内
- **THEN** 页脚左侧显示 `autoresearch · <该时间戳日期>`，右侧显示 `<N> runs · pinned at <短哈希>`

#### Scenario: 非 git 目录省略 pin

- **WHEN** 导出发生在非 git 目录（或 rev-parse 失败）
- **THEN** 页脚仅显示 `<N> runs`，不含 pinned 段，导出不失败

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

导出内容 SHALL 按 direction 标注每个实验相对**全局首测基线**的改善/恶化（lower 时数值下降为改善），并区分 keep/discard/crash/checks_failed/noop 状态：keep 绿色、discard 橙色、crash 与 checks_failed 红色系、**noop 中性灰**（no-op 不是失败，不得使用失败红色）。状态以正式徽章呈现（等宽小字号、语义色文字 + 低饱和底、无旋转/装饰）。delta 恰为 0 的行 SHALL 渲染中性 `±0`（不得落入改善▲或恶化▼分支）。

#### Scenario: 状态着色与方向标注

- **WHEN** 账本包含 mixed 状态的记录（含 no-op 行）
- **THEN** dashboard 按状态分类着色（noop 为中性灰而非红），并标注每个实验的改善/恶化

#### Scenario: delta 为零渲染中性

- **WHEN** 某 run 的 metric 恰等于全局首测基线
- **THEN** 该行 Δ 列渲染中性 `±0`，不显示 ▲/▼ 箭头

### Requirement: 重试标注渲染

dashboard（静态导出与 live 模式共用渲染层）SHALL 在 run 行携带 `asi.revisits_run`（正整数）时，于该行渲染 `↻ Revisiting #N` 标记（N 为该字段值），使「有依据的重访」在记录表中与普通实验可区分；无该字段或值非正整数时 SHALL 不渲染标记（照常显示该行其余信息）。

#### Scenario: 重访行渲染标记

- **WHEN** 账本某 run 行含 `asi: {revisits_run: 7}`
- **THEN** 该 run 行显示 `↻ Revisiting #7` 标记，其余列（status/metric/delta/description）照常渲染

#### Scenario: 无标注不渲染

- **WHEN** 账本 run 行无 `asi.revisits_run`（或值非正整数）
- **THEN** 该行不出现重访标记，渲染与现状一致

### Requirement: 全量历史渲染

dashboard（静态导出与 live 模式共用渲染层）SHALL 渲染账本的全部历史而非仅当前 segment：以单一平铺序列呈现全部 run（config 行不产生视觉分组，仅刷新标题与 metric/direction 口径），hero 标题取最新 config 行的名称，baseline/best/overall 统计取全局口径（首测基线、全局 best、总改善幅度），置信度对全部有效 metric 值计算。循环控制语义（`rebuildState` 的 plateau/doom/stop 判定）SHALL 不受影响，历史渲染只读账本，不参与 keep/discard 门禁。

#### Scenario: 全局口径统计

- **WHEN** 账本首测基线 412.6，全局 best 186.2
- **THEN** hero 结果构图 baseline 显示 412.6、best 显示 186.2、overall 显示全局改善幅度

#### Scenario: 循环控制不受影响

- **WHEN** dashboard 全量渲染开启后实验循环继续运行
- **THEN** plateau/doom-loop/stop 判定仍基于当前 segment（`rebuildState` 语义不变）

### Requirement: dashboard 汇总边界语义

dashboard SHALL 以 baseline 绝对值为 overall 百分比的分母，按 direction 判断改善；页脚 SHALL 按账本顺序使用最后一条 run 的时间戳，而非时间戳最大值。

#### Scenario: 负数基线改善

- **WHEN** lower 指标从 -10 改善到 -20，或 higher 指标从 -10 改善到 -5
- **THEN** overall 分别显示 −100% 与 +50%，均使用改善颜色

#### Scenario: 时钟回拨

- **WHEN** 最后一条 run 的时间戳早于前一条
- **THEN** 页脚仍使用最后一条 run 的日期

### Requirement: 报告阅读与证据导航

dashboard SHALL 突出 overall 改善幅度，显示指标名称、单位和方向，NO-OP 独立计数且不计入 reverted。趋势 SHALL 显示全量历史图例，并提供到对应账本行的可聚焦链接。账本 SHALL 提供全部、保留、回退、无改动筛选，按钮状态可访问；无 JavaScript 时仍显示全部实验。

#### Scenario: 计数与筛选

- **WHEN** 账本包含 keep、discard 和 noop
- **THEN** 三者分别计数，筛选只隐藏不匹配账本行，不改变趋势的全量历史

#### Scenario: 证据定位

- **WHEN** 用户通过键盘或指针激活趋势点
- **THEN** 页面定位到对应全局序号的实验行并突出该行

#### Scenario: 移动端阅读

- **WHEN** 页面在 390px 或 320px 视口打开
- **THEN** 描述、指标和控件可读且不产生页面横向溢出

### Requirement: dashboard 输入防御与故障隔离

dashboard 渲染 SHALL 对账本字段做运行时类型防御：最后一条 run 的 `timestamp` 不是字符串时 SHALL 省略日期，不得抛异常；是字符串时 SHALL 先 escape 再截取日期。live server SHALL 仅在读取与渲染成功后发送成功响应；请求处理 SHALL 捕获渲染/读取异常并返回 500，任何单个请求失败都不得使 MCP server 进程退出。

#### Scenario: 非字符串 timestamp 不炸渲染

- **WHEN** 账本最后一条 run 的 timestamp 为数字或对象
- **THEN** 静态/live dashboard 正常渲染，页脚省略日期，不抛 `slice is not a function`

#### Scenario: timestamp 中的 HTML 被转义

- **WHEN** 账本 timestamp 为包含 `<b>hi</b>` 的字符串
- **THEN** 页面显示转义后的文本，不产生可执行 HTML

#### Scenario: live 渲染异常返回 500 且进程存活

- **WHEN** live server 收到 GET /，账本内容使渲染抛出异常
- **THEN** 该请求返回 500，MCP server 进程继续运行，后续 /autoresearch.jsonl 仍可响应

#### Scenario: 渲染失败不得返回空白成功响应

- **WHEN** config.name 为 `{ "toString": null }` 导致 GET / 渲染失败
- **THEN** 请求返回 500 和可读错误文本，随后 GET /autoresearch.jsonl 仍返回 200
