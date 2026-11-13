# Dashboard 设计与验收

修改 `plugin/mcp/lib/dashboard.ts` 前读本页。行为契约以 `openspec/specs/autoresearch/dashboard/spec.md` 为准；数据投影以 `rebuildHistory` 为准；具体字号、间距和颜色以渲染器的 CSS 为准。本页只保存设计意图和验收方法，不另抄参数表。

## 设计语言

Modern AI Research Console（2026-11 起取代编辑部式档案页）：深海军蓝暗色基底为默认 token 集，暖白为亮色覆盖（`prefers-color-scheme: light`），Lava Red 只用于 overall 强调与 focus ring。设计 token（颜色/圆角/阴影）单一来源，禁止两代样式叠加。数字一律 tabular-nums 等宽对齐；状态色只表达语义。零第三方运行依赖：图表为内联 SVG 双变体（桌面 960×240 / 移动 390×240 1:1），轨迹呈现借鉴 ml-auto 实验轨迹图（点层级/稀疏刻度/segment 边界/图头图尾，2026-11-13），图标为手工内联的 Lucide 风格 path data，不引字体、不引库。

## 页面填什么

| 位置            | 来源与口径                                                                                                                                                                                                                                                                                                                                                     |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 标题            | 最新 config 的 `name`，原样转义显示；缺失回退为 `session`。创建会话或示例时用具体目标，如“降低实验循环延迟”，不写宣传口号，不由渲染器改写用户名称。                                                                                                                                                                                                            |
| 指标说明        | 最新 config 的 `metricName`、可选 `metricUnit`、`direction`；缺失名称回退 `metric`，缺失单位省略，方向默认 lower（越低越好/越高越好 pill）。                                                                                                                                                                                                                   |
| baseline / best | 全账本首个有限 metric / 按最新 direction 选择的 keep 最优值。不是当前 segment 统计。                                                                                                                                                                                                                                                                           |
| overall         | `(best - baseline) / abs(baseline)`；符号表达数值升降，颜色结合 direction 表达改善或恶化。零基线或缺少结果时省略。                                                                                                                                                                                                                                             |
| KPI 四卡        | 全部 run、keep、其余非 noop 的回退记录、noop 分别计数；NO-OP 不计入 reverted。数字来自真实账本。                                                                                                                                                                                                                                                               |
| 元信息行        | 置信度判定（`<verdict> <ratio>× noise`，按级别着色）、segment 数、最后一条 run 的日期。不虚构“运行中”状态——渲染器只知道账本里的事实。                                                                                                                                                                                                                          |
| 趋势            | 全量有限 metric，按账本全局序号绘制；实心为 keep，空心为未保留；首测基线虚线参考线。筛选不改变趋势；<2 个有效点不画。                                                                                                                                                                                                                                          |
| 图表 tooltip    | hover/聚焦数据点展示编号、metric、Δ（方向化）、状态与描述摘要——全部来自该点锚上的真实账本 data 属性，JS 用 textContent 填充；无 JS 降级原生 `<title>`。                                                                                                                                                                                                        |
| 实验记录        | 表格行：原始状态、metric、相对全局 baseline 的方向化绝对差、description（该轮改动——完整文本常驻 DOM，超一行由 JS 钳制单行 + 右侧渐隐，点击/Enter 展开；无 JS 全文可读，打印不丢失，无展开按钮/预览副本）、commit；缺值中性占位，不编造结果。asi（hypothesis/next_action_hint/rollback）不在页面渲染——真实账本不携带该字段，该轮推理由 agent 写入 description。 |
| 页脚            | 最后一条 run 的时间戳日期；可用时附实际 git 短哈希，不以导出时间替代实验时间。                                                                                                                                                                                                                                                                                 |

空账本显示空状态（无 KPI 卡、无折线）。所有账本文案必须转义；不要把用户内容作为 HTML 或脚本插入（tooltip 只用 textContent）。

## 怎么组织与呈现

- 阅读顺序是结果、计数、趋势、实验结论。overall 是首屏唯一最强数字；KPI 卡紧凑克制（非营销大卡），置信度与 segment/日期在 quiet meta 行。
- 卡片圆角/边框/阴影统一走 token；行 hover 轻背景反馈；focus-visible 为 Lava Red 环。不添加装饰性动效、营销口号和无数据依据的总结。
- 描述列承载主要阅读内容，commit 是次要证据；长文收起是显式交互（details），打印时强制展开完整内容，不算裁切隐藏。
- 长文本值统一钳制语言（2026-11-13 二次裁决）：渐隐只作用于该轮改动（description）整体——无展开按钮、无 `…` 预览副本，渐隐本身即展开暗示；无 JS 时不钳制、全文可读。asi 分项 UI 已移除。
- 图点用原生锚点定位并高亮对应记录，键盘可访问；激活图点会重置筛选以恢复被隐藏记录。状态筛选用按钮与 `aria-pressed`。
- 窄屏（≤760px）重排而非整体缩小：KPI 2×2、移动 1:1 图表变体、行重排为紧凑两行；保留完整描述、单位和状态文字，页面不得横向溢出。

## 怎么验收

先跑 `node --test plugin/tests/dashboard.test.ts`（投影、计数、tooltip 数据、details、转义、刻度不变量均有行为测试）；视觉对齐不能靠匹配 CSS 字符串证明。

用真实 `renderDashboard(rebuildHistory(entries))` 生成预览，样例放根 `archived/dashboard-preview/`，不进插件包；不要单独手写一个与生产渲染器脱离的演示页。浏览器检查桌面、390px、320px，覆盖亮暗主题。

- 普通混合状态：结果层级清楚，KPI 计数正确，NO-OP 中性，数字与箭头对齐。
- 长标题、长描述、长 commit：内容可读，无页面横向溢出；长文展开收起可用。
- 空账本、单个度量点、零与负数基线、higher 方向：空值诚实，改善方向正确，少于两个点不画趋势。
- 筛选回退记录后激活 keep 图点：恢复全部记录并定位正确实验；键盘焦点可见。
- hover 数据点：tooltip 数据与账本一致，位置不溢出视口。
- live 页：SSE `jsonl-updated` 自动刷新且滚动位置恢复（`sessionStorage` 键 `autoresearch-dash-scroll`）。

交付时区分测试通过与视觉实测，写明未检查项。保持零第三方运行依赖、自包含导出及静态/live 共用渲染边界（ADR-1/6）；不改变循环控制与护栏（ADR-2/4/5）。

## 当前核验与待办

2026-11-13：console 风格重写落地。已实测（IAB，真实渲染器样例 + 真实 SSE 会话）：暗色桌面/390/320、亮色桌面（强制媒体查询的预览副本）、tooltip（数据核对）、筛选、图点锚点联动与 :target 高亮、长文展开、KPI 计数、横向溢出检查（320px scrollWidth 310）、SSE 自动刷新 + 滚动位置恢复（225px 精确恢复）。未逐项截图：亮色 390/320、无 JS 渲染（details 与原生 title 为平台行为，测试覆盖 markup）、打印样式。单测 21/21、全量 npm test 通过。

已知取舍：Δ 颜色表达数值方向（如 checks_failed 行 Δ 为改善方向但状态药丸红色标败），状态药丸承载判定语义；tooltip 由 JS textContent 填充，无 JS 时信息不丢失。
