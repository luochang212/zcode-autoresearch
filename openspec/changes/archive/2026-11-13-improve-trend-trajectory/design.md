# Design: improve-trend-trajectory

## Context

实拍对比 ml-auto 训练页「实验轨迹」（Plotly）：具名三系列图例、连线弱色 + keep 大实心、稀疏 X 刻度 + 轴题、图头语义副行、图下统计行、segment 边界虚线。我们全部可用零依赖 SVG 实现。现行 spec 有两处条款被本次推翻：「每点标注序号」（多轮重叠）与「不出现任何 segment 分隔标注」（跨 segment 轨迹需要边界感知——经用户确认为过度限制，账本列表仍平铺）。

## 决策

### 1. renderTrendSvg 重构

- 连线：`stroke: var(--muted)`，width 1.5，无 opacity 折损（弱色本身就是层级）。
- keep 点：r=5.5，fill var(--keep)，白描边（暗色下 panel 色）突出；未保留点：r=3.8，fill var(--panel)，stroke var(--crash) 1.4。
- 删除每点 `<text class="dv">#N</text>`；X 轴整数刻度：步长从 {1,2,5}×10^k 中取使刻度数 ≤8 的最小值，起止对齐 1..total；轴题「全局轮次」。
- segment 边界：遍历 pts 时 segment 值变化且非首点 → 竖虚线（y 全高）+ 顶部 `segment N` 文字；仅 distinct segments > 1 时绘制。
- 图头：figcaption 主行（图标 + 「度量趋势」+ metric 名）+ 副行说明文字；图例以三个具名小项呈现（连线样 / 实心样 / 空心样）。
- 图下统计行：`<div class="t-stats">`，数据来自 history（segmentCount、有效点数、kept 中有效者、首轮→最优方向化差值 = overallPct 同源计算，带单位，零差/缺值中性）。
- tooltip/原生 title/锚点 `#run-N` 全保留；序号移入 tooltip 首行（实验 #N）。

### 2. 投影：SessionHistory.segmentCount

`rebuildHistory` 计算 runs 的 distinct segment 数（含仅有 config 无 run 的 segment 不计——轨迹图只呈现已发生轮次）。加单测。

### 3. 不动的

基线虚线参考线、<2 点不画、双变体 960/390、niceTicks 小数位不变量、tooltip 数据真实性、SSE、表格平铺。

## Risks / Trade-offs

- 去掉逐点序号后，无 JS 用户只能靠 `<title>` 悬停看序号——可接受（title 是平台原生行为）。
- 边界标注推翻旧 spec 条款：已在 proposal 记录理由，archived 场景「config 行不产生分组」改述为列表语义。

## Migration

纯渲染层 + 投影增字段；旧账本无需迁移。
