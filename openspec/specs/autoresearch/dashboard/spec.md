## Purpose

定义 zcode autoresearch 插件 dashboard 导出的行为契约：`/autoresearch:export` 命令从实验账本生成静态 HTML 报告。

## Requirements

### Requirement: 从账本导出静态 dashboard

`/autoresearch:export` 命令与 `export_dashboard` 工具 SHALL 读取 `.auto/log.jsonl`，生成自包含的静态 HTML（无外部网络依赖、无外部资源引用、零第三方运行时依赖），以 **Modern AI Research Console 风格**呈现全部实验历史：**hero 区**（无衬线会话标题开场；metric 名称/单位/方向元信息行；baseline → best 的大字排版与 overall 改善幅度，数字等宽 tabular-nums；下方为 **KPI 指标卡行**——实验总数 / 保留 / 回退 / 无改动 四张紧凑卡片，每张含清晰数字与标签，置信度判定（通过/偏弱/未过）以 `<verdict> <ratio>× 噪声` 形式小徽章呈现在 hero 元信息）、**单张度量趋势轨迹图**（覆盖全部有效 metric 点）、**实验记录表格**（全局序号/状态药丸/指标/Δ 相对基线/该轮改动/提交，该轮改动（description 字段）为主要阅读内容，长描述统一钳制语言）、页脚（`autoresearch · <最后 run 日期>` 与 `<N> 次实验 · 锚定 <短哈希>`）。呈现 SHALL 满足：

- **设计 token 单一来源**：颜色/字体/间距/圆角/边框/阴影 SHALL 经 CSS 变量统一为单一 token 层，SHALL NOT 存在两代样式叠加互相覆盖；基色为深海军蓝（暗色基底）与暖白（亮色基底），Lava Red 仅作少量强调；状态色只表达语义（keep 绿、discard 橙、crash/checks_failed 红系、noop 中性灰）；
- **深色优先双主题**：颜色 SHALL 经 CSS 变量定义并以 `prefers-color-scheme` 适配；深色（深海军蓝基底）为默认 token 集，亮色（暖白基底）经媒体查询覆盖，不依赖硬编码单主题色值；
- **列表平铺、图表可标注边界**：实验记录表格 SHALL 呈现为单一平铺的 run 序列，config 行不产生分隔线、章节标题或分组（仅刷新标题与 metric/direction 口径）；Δ 统一相对全局首测基线；趋势轨迹图 SHALL 允许以边界虚线与 segment 序号标注呈现 segment 分界（这是跨 segment 轨迹的事实呈现，不是列表分组）；
- **度量趋势轨迹图** SHALL 为内联 SVG（零外部依赖）：按全局顺序绘制全部有效 metric 点，视觉层级为——连线以弱化次级色细线呈现，keep 点放大实心（keep 绿），未保留点缩小空心（红环）；全局首测基线以虚线参考线标注；X 轴 SHALL 为「全局轮次」稀疏整数刻度（SHALL NOT 在每个数据点上标注序号文字，单点序号经悬停 tooltip 与原生 `<title>` 获取）；账本含多于一个 segment 时 SHALL 在边界处绘制竖虚线并以 `分段 N` 标注；图头 SHALL 附一句话语义说明（实心保留 · 空心未保留 · 虚线为分段边界 · 悬停看详情），图下 SHALL 附统计行（segment 数 · 轮次数 · keep 数 · 首轮→最优方向化差值）；全账本有效点少于 2 时不绘制；桌面（960×240）与移动（390×240，1:1 比例）两个变体 SHALL 同时渲染并以 CSS 按视口切换；
- **图表 tooltip**：趋势数据点 hover SHALL 展示实验编号、metric 值、Δ（方向化）与状态，数据全部来自真实账本记录；有 JS 时以页面内 tooltip 呈现，无 JS 时 SHALL 降级为原生 `<title>`（不得产生不可读或伪造数据）；
- **实验记录表格与溢出治理**：账本 SHALL 为表格化行布局（状态药丸、metric 与 Δ 等宽数字右对齐、commit 以 monospace 徽标呈现、行 hover 轻微背景反馈）；描述等长字段 SHALL 可断行（`min-width: 0` + `overflow-wrap`）；超长描述与其它长文本值 SHALL 采用统一钳制语言——完整文本常驻 DOM，超出一行的值由 JS 钳制为单行并做右侧渐隐（mask），点击/Enter 展开；无 JS 时不钳制、全文可读，SHALL NOT 使用展开按钮或预览省略号复制文本；≤760px 视口下每行重排为紧凑布局（重排而非整体缩小），页面整体不得产生横向溢出；
- **页脚定格信息**：左侧 `autoresearch · <日期>`（账本最后一条 run 的时间戳日期）；右侧 `<N> 次实验`，且当 `git rev-parse --short HEAD` 可用时 SHALL 附加 ` · 锚定 <短哈希>`（非 git 目录或命令失败时省略该段，渲染不失败）；≤760px 视口下页脚 SHALL 只保留左侧日期段。

`export_dashboard` 工具 SHALL 额外支持 **live server 模式**：在本机 127.0.0.1 随机端口启动 HTTP 服务，提供 `/`（live HTML）、`/autoresearch.jsonl`（账本原文）与 `/events`（SSE）三个路由；`init_experiment` 与 `log_experiment` 写账本后 SHALL 广播 `jsonl-updated` 事件使浏览器自动刷新（刷新前后 SHALL 恢复滚动位置）；工具返回 SHALL 包含 live URL 与静态文件路径。live server 与 MCP server 同进程，路由处理 SHALL 容错：`/autoresearch.jsonl` 在账本文件不存在时 SHALL 返回 404（不抛未捕获异常）；SSE 广播对已断开/写失败的客户端 SHALL 容错并把它从广播列表剔除，任何单个请求或客户端故障都不得使 MCP server 进程崩溃。

#### Scenario: 导出成功

- **WHEN** 用户执行 `/autoresearch:export`
- **THEN** 生成 `autoresearch-dashboard.html`（或等价路径）并告知用户文件位置，HTML 内包含完整实验列表、KPI 指标卡、结果构图与趋势轨迹图

#### Scenario: 统计卡片无孤行

- **WHEN** 页面以标准宽度渲染（hero 结果构图 + KPI 卡行）
- **THEN** 结果构图在一行内呈现 baseline → best → overall；更窄视口下自然折行，不出现独占整行的单元素被拉伸变形

#### Scenario: KPI 指标卡计数

- **WHEN** 账本包含 keep、discard、noop 混合状态
- **THEN** 四张 KPI 卡分别呈现 实验总数 / 保留 / 回退 / 无改动 计数（无改动不计入回退），数字等宽对齐

#### Scenario: 度量趋势折线

- **WHEN** 账本含 ≥2 个有效 metric 记录
- **THEN** 渲染内联 SVG 轨迹：连线为弱化次级色，keep 点放大实心、未保留点缩小空心，全局 baseline 呈虚线参考线；数据点不标注序号文字，X 轴为「全局轮次」稀疏整数刻度；无外部资源引用

#### Scenario: X 轴刻度多轮不重叠

- **WHEN** 账本含大量有效 metric 点（如 30+）
- **THEN** X 轴以稀疏整数刻度标注（约 ≤8 个刻度），不出现逐点序号文字，轨迹不产生文字重叠

#### Scenario: 跨 segment 边界标注

- **WHEN** 账本含多于一个 segment 的有效 metric 点
- **THEN** 轨迹图在 segment 边界绘制竖虚线并以 `分段 N` 标注；实验记录表格仍为单一平铺列表，不产生分组

#### Scenario: 图下统计行

- **WHEN** 趋势轨迹图渲染
- **THEN** 图下方一行呈现 segment 数、轮次数（有效 metric 点数）、keep 数与首轮→最优的方向化差值，数值与账本一致

#### Scenario: 图表 hover tooltip 来自真实账本

- **WHEN** 用户 hover（或键盘聚焦）趋势图数据点
- **THEN** tooltip 展示该实验的编号、metric 值、Δ 与状态，数值与账本记录一致；无 JS 时原生 `<title>` 提供同等信息

#### Scenario: 超长描述展开收起

- **WHEN** 某 run 的描述超出一行
- **THEN** 该值被钳制为单行并在行尾右侧渐隐，点击/Enter 展开完整内容；无 JS 时全文直接可读，打印时不丢失，页面上不出现展开按钮或 `…` 预览副本

#### Scenario: config 行不产生分组

- **WHEN** 账本含多个 segment（多条 config 行）
- **THEN** 实验记录表格仍为单一平铺列表与单张轨迹图，不出现任何列表级分隔线或章节标题；标题与 metric/direction 口径取最新 config 行，每行 Δ 相对全局首测基线计算

#### Scenario: 深色系统下可读

- **WHEN** 系统处于深色外观（prefers-color-scheme: dark）打开导出的 HTML
- **THEN** 页面以深海军蓝基底渲染：KPI 卡、结果构图、账本行、状态药丸与代码徽标对比可读，不出现"浅底浅字"或刺眼亮块

#### Scenario: 长字段不断页

- **WHEN** 某 run 的 description 含不可断行的长字符串（如长 URL）
- **THEN** 描述在行内断行显示，页面不产生整体横向溢出；窄视口下账本行重排为紧凑布局

#### Scenario: 页脚定格信息

- **WHEN** 账本最后一条 run 带时间戳，且导出发生在 git 仓库内
- **THEN** 页脚左侧显示 `autoresearch · <该时间戳日期>`，右侧显示 `<N> 次实验 · 锚定 <短哈希>`

#### Scenario: 非 git 目录省略 pin

- **WHEN** 导出发生在非 git 目录（或 rev-parse 失败）
- **THEN** 页脚仅显示 `<N> 次实验`，不含锚定段，导出不失败

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

dashboard（静态导出与 live 模式共用渲染层）SHALL 渲染账本的全部历史而非仅当前 segment：以单一平铺序列呈现全部 run（config 行不产生视觉分组，仅刷新标题与 metric/direction 口径），hero 标题取最新 config 行的名称，baseline/best/overall 统计取全局口径（首测基线、全局 best、总改善幅度），置信度对全部有效 metric 值计算。首测基线与有效度量集合 SHALL 排除 crash 行——包括携带遗留占位 metric（如 0）的旧格式行（crash 测了 nothing，占位值不是测量；语义与 experiment-loop 的 crash 行回放排除一致），账本本身不改写。循环控制语义（`rebuildState` 的 plateau/doom/stop 判定）SHALL 不受影响，历史渲染只读账本，不参与 keep/discard 门禁。

#### Scenario: 全局口径统计

- **WHEN** 账本首测基线 412.6，全局 best 186.2
- **THEN** hero 结果构图 baseline 显示 412.6、best 显示 186.2、overall 显示全局改善幅度

#### Scenario: 遗留 crash 占位行不充当首测基线

- **WHEN** 账本首条 run 为 crash 行且携带占位 metric 0（旧格式），其后 keep 42
- **THEN** hero 的 baseline 显示 42（非 0），overall 不以 0 为分母，账本文件不被改写

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

### Requirement: 刻度小数位的跨度不变性

静态与实时 dashboard 的坐标轴刻度标签 SHALL 在任意度量跨度下携带正确的小数位：步长小于 1 时按数量级推导小数位，步长尾数为 2.5（步长选择逻辑在归一化跨度 ∈ (2, 2.5] 整段选出 2.5 系数步长）时 SHALL 多一位——按步长尾数判断，SHALL NOT 以归一化跨度恰等于 2.5 的精确相等代替；SHALL NOT 因步长的指数字符串形式（如 `2.5e-7`）误判而把标签塌缩为 `0.0000`。

#### Scenario: 次微跨度刻度可读

- **WHEN** 度量跨度使刻度步长为 `2.5e-7`
- **THEN** 刻度标签以 8 位小数渲染（`0.00000025` 形态），SHALL NOT 全部显示为 `0.0000`

#### Scenario: 非 2.5 精确值的 2.5 系数步长同样多一位

- **WHEN** 度量跨度使归一化跨度为 2.1（如 span 0.63、步长 0.25，或 span 6.3e-7、步长 2.5e-7）
- **THEN** 刻度标签按步长尾数 2.5 渲染正确小数位（0.25 两位小数、2.5e-7 八位小数），SHALL NOT 出现网格线在 0.25 而标签为 "0.3" 的错标

### Requirement: 循环规程观看引导

循环规程（`SKILL.md` 与 `references/loop-protocol.md`）与 `/autoresearch:export` 命令文本 SHALL 载明观看行为，与工具行为解耦：

- 首次 `export_dashboard` 成功返回 live URL 后，agent SHALL 在**交互会话且运行在用户本机**的前提下，用平台命令（macOS `open <url>` / Linux `xdg-open <url>` / Windows `cmd /c start <url>`）打开该 URL **一次**；SSE 已保证 live 页在后续每次实验后自动刷新，SHALL NOT 每轮重复打开。
- headless 环境（SSH 会话、CI、远程 executor——打开动作发生在用户看不到的机器上）或用户已明确表示不想观看时，SHALL NOT 执行打开命令。
- 循环收尾的最终 `export_dashboard` 是报告归档：若此前从未打开过浏览器 SHALL NOT 补开，SHALL 在响应文本中给出 live URL 与静态文件路径，由用户自行决定是否点击。
- 静态文件 `autoresearch-dashboard.html` SHALL 保持 export 时刻快照的语义：规程 SHALL NOT 承诺或要求每轮重写静态文件，实时观看由 live server 承担。

工具行为不变：`export_dashboard` 的返回结构、live server 路由、SSE 广播语义均不受本 Requirement 约束（沿用既有 Requirement）。

#### Scenario: 首次导出后代开一次

- **WHEN** 交互会话中 agent 首次调用 `export_dashboard` 成功且返回含 `url`，用户未拒绝观看
- **THEN** 规程要求 agent 用平台命令打开该 URL 一次，且后续实验轮次不再重复打开（页面由 SSE 自动刷新）

#### Scenario: headless 环境不弹窗

- **WHEN** 会话运行在 SSH / CI / 远程 executor 等 headless 环境，或用户此前明确拒绝过观看
- **THEN** 规程要求 agent 不执行浏览器打开命令，仅在文本中给出 URL

#### Scenario: 结束时不补开

- **WHEN** 循环结束的最终 `export_dashboard` 执行时，本会话此前从未打开过浏览器
- **THEN** 规程要求不补开浏览器，仅在收尾摘要中给出 live URL 与静态文件路径

#### Scenario: 静态文件快照语义

- **WHEN** live server 已启动且实验循环继续运行
- **THEN** 规程不要求每轮重写 `autoresearch-dashboard.html`；实时进度由 live 页承担，静态文件仅在下一次显式 export 时更新
