# Design: polish-dashboard

证据：`archived/worth-fix-dash/gen.ts`（调真实 `renderDashboard` 生成样例）+ 浏览器量测（卡片 offsetTop/宽度、溢出 scrollWidth、computed style）+ 深色系统截图。复现方法留痕于本文件与 proposal。

## D1 卡片网格（P1）

孤行根因：`min-width:120px` 作用于 content-box（无 `box-sizing:border-box`），实卡宽 = 120 + 2×19.2 padding + 2×1 border ≈ 160px；5 卡 + 4×16 gap = 864px，容器 868px（900 - 2×16 body padding），擦边放下；第 6 卡（confidence，≥3 有效度量即出现）必换孤行。

修法：`* { box-sizing: border-box }` + `.cards { display:grid; grid-template-columns: repeat(auto-fit, minmax(110px, 1fr)); }`。6 卡：6×110 + 5×16 = 740 ≤ 868 → 单行 6 等宽（1fr 分配 ≈131px/卡）；窄屏 auto-fit 均匀折行（如 375px 视口 → 2 列×3 行），任何宽度都不出现孤行。grid 而非 flex+calc：一行声明同时解决等宽与折行。

## D2 no-op 中性色（P3）

现有映射 `keep→keep, discard→discard, 其余→crash` 把 noop 与 checks_failed 一起染红。修法：加 `noop` 分支——`.noop { color: var(--muted) }`、`.badge.noop { 中性灰底 }`；checks_failed 维持红色系（它确实是失败）。

## D3 亮暗双主题（P4）

`color-scheme: light dark` 已声明（画布/文字自动适配），但 7 处硬编码亮色不跟随。修法：全部颜色收敛为 `:root` CSS 变量——`--bg/--fg/--muted/--border/--card-bg/--th-bg/--code-bg` + 三态徽章 `--badge-keep-bg` 等（前景色沿用状态色，深色下用调亮变体）。`@media (prefers-color-scheme: dark)` 覆盖：深底、浅字、边框/表头/代码底取深色面、徽章底降饱和。表头文字色显式 `var(--fg)` 修"浅底浅字"。

## D4 溢出治理（P5/P6）

- `.desc { overflow-wrap: anywhere }`：不可断行长串在格内断行。选 `anywhere` 而非 `break-word`：后者不缩小 min-content 宽度，表格仍会被撑开。
- 表格外包 `<div class="tablewrap">`，`overflow-x: auto`：断行后表格通常已收进容器，真正窄屏（6 列最小宽度）在容器内滚动，页面不再整体横向溢出。sticky 表头需 `th` 背景不透明（var(--th-bg)），滚动时遮挡内容。

## D5 度量趋势折线（P7）

纯字符串拼内联 SVG（保持自包含、零依赖）：

- 数据：当前 segment 全部 run 中 `metric != null` 的点，按 run 顺序。
- 坐标：x 均分 [pad, W-pad]（按**有效点的序号**，跳过 crash/noop 造成的时间空洞，避免点挤在一侧）；y 线性映射 [min,max]（min==max 时居中偏移）。W=860、H=120、pad=8。
- 元素：`<polyline>` 连线（`var(--fg)` 60% 透明度）+ baseline 虚线（`stroke-dasharray`，标注数值文本）+ 每点 `<circle>` r=3.5（keep `fill=状态绿`；非 keep 空心 `fill=var(--card-bg)` + 状态色描边）。y 轴不画刻度——卡片与表格已有数值，图只看形状与相对基线。
- <2 个有效点不渲染（单点无趋势可言）。
- escapeHtml 处理数值文本（数值本身安全，防御性统一）。

## D6 数值格式化

`fmtMetric(v)`：`Number(v.toFixed(4))` 去尾零再 String()——42、38.5、0.1234 保持可读，41.999980001 → 42.0000 → 42。卡片（baseline/best）与折线基线标注共用；表格 metric 列同步（delta 列原本就 toFixed(4)）。confidence 卡显示 `green · 3.0`（level + 数值 toFixed(2)? 置信度值保留 2 位）。

## D7 测试策略（CI 无浏览器，字符串级断言 + 本地浏览器复测）

- 断言 HTML 含：`box-sizing: border-box`、`grid-template-columns: repeat(auto-fit, minmax(110px, 1fr))`、`prefers-color-scheme: dark`、`overflow-wrap: anywhere`（或 anywhere）、`.tablewrap` + `overflow-x: auto`、`.badge.noop`/`.noop` 中性样式存在；
- 构造含 noop + ≥2 有效度量的 state（复用 gen.ts 的数据形状）：断言 `<svg`、`<polyline` 存在、circle 数 = 有效点数、baseline 虚线存在；单有效点 state → 无 svg；
- 既有断言兼容：`<table` 仍在（包一层不影响）、EventSource 不变；
- 浏览器复测（本地，非 CI）：修复后重新生成页面，量 cardRowCount=1（900px）、无 descOverflow、table 无页面级溢出、深色截图目检。证据回填 archive。
