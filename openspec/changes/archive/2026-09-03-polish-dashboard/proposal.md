## Why

worth-fix 实测（真实 `renderDashboard()` 生成页面 + 浏览器量测 + 截图，复现脚本与证据在 `archived/worth-fix-dash/`，不进 git）坐实一组 dashboard 呈现缺陷：

- **P1 confidence 卡孤行**：统计卡片 flex 行在 6 卡（confidence 存在）时，第 6 卡必然单独换行（实测 top 126→227 两行）。根因：`min-width:120px` 作用于 content-box，实卡宽 160px，5 卡+间隙 864px 贴着容器 868px 极限。
- **P3 no-op 被套 crash 红色**：状态色 class 只认 keep/discard，noop 与 checks_failed 一律落入 crash 红（实测 `badge crash` + rgb(198,40,40)）。no-op 不是失败（连败语义刚在 fix-runtime-robustness 中定为中立），红色误导。
- **P4 暗色模式不可读**：`color-scheme: light dark` 使画布/文字自动适配深色，但表头 `#fafafa`、徽章浅色底、`code` 背景、meta `#666` 等 7 处硬编码亮色不跟随——深色系统下表头呈"浅底+浅字"不可读（实测于深色系统：thBg rgb(250,250,250) + 透明 body 深色画布）。
- **P5/P6 长字段溢出无滚动**：`.desc` 只限宽不断词，长 URL 实测 scrollW 659 > clientW 419；表格 scrollW 1108 撑出 900px 视口，页面整体横向溢出（截图可见右侧截断的重复面板）。
- **P7 无度量趋势可视化**：账本 metric 轨迹是进度 dashboard 最有信息量的呈现，目前只有表格。

证伪修正：原报告称"卡片宽窄不齐"——实测六卡全部等宽 160px（min-width 主导），不齐不成立，唯一卡片缺陷是孤行换行。

## What Changes

- **卡片网格**：`.cards` 改 CSS grid（`repeat(auto-fit, minmax(110px, 1fr))`）+ 全局 `box-sizing: border-box`；6 卡等宽单行，窄屏均匀折行，不出现孤行。
- **no-op 中性样式**：状态 class 映射补 noop 分支，灰色中性徽章与文字色（checks_failed 维持红色系）。
- **亮暗双主题**：颜色全部收敛为 CSS 变量（背景/前景/弱化文字/边框/表头/代码底/三态徽章），`@media (prefers-color-scheme: dark)` 覆盖深色值；深色下表头可读、徽章降饱和。
- **溢出治理**：`.desc` 补 `overflow-wrap: anywhere`；表格包 `overflow-x: auto` 容器，页面不再横向溢出，窄屏在容器内滚动。
- **度量趋势折线**：表格上方新增内联 SVG 折线图（零依赖，保持自包含契约）：按 run 顺序绘制有效 metric 点（keep 绿实心/其余空心），基线虚线参考，<2 个有效点不画；direction 标注 improvement 方向。
- **小打磨**：confidence 卡同时显示 level 与数值；metric/baseline/best 数值统一去尾零格式化。

## Capabilities

### New Capabilities

（无。）

### Modified Capabilities

- `autoresearch/dashboard`: 「从账本导出静态 dashboard」展示要求补卡片网格、趋势折线、亮暗适配、溢出治理；「dashboard 反映度量方向与判定语义」状态枚举补 noop 中性样式。

## Impact

- `plugin/mcp/lib/dashboard.ts`：CSS 重做（变量/网格/暗色/换行/滚动）、SVG 折线渲染、noop class、数值格式化。
- `plugin/tests/dashboard.test.ts`：回归断言（grid/box-sizing/暗色变量/svg 折线点数/noop 中性 class/overflow-wrap/滚动容器）。
- 无依赖、无 schema、无平台变更；静态与 live 模式共用同一渲染器，自动同享。
