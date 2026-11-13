# Proposal: improve-trend-trajectory

## Why

对照 ml-auto 训练页的「实验轨迹」图（实拍对比），当前趋势折线有五处可确证的差距：点无视觉层级（keep 与未保留同大小同权重）、每个点都标注 `#N`（几十轮后必然重叠）、X 轴无刻度无轴题、图头语义说明不足、跨 segment 轨迹无边界感知。借鉴 ml-auto 的呈现（仅借鉴，不引 Plotly、不引依赖），将趋势图升级为「实验轨迹」级呈现。

## What Changes

- **点与线的视觉层级**：连线弱化（次级色细线），keep 点放大实心（keep 绿），未保留点缩小空心（红环）——重要信息权重更高。
- **X 轴改稀疏整数刻度 + 轴题「全局轮次」**：取消每点 `#N` 文字标注（多轮不重叠），序号改经悬停 tooltip 与原生 `<title>` 获取（无 JS 不丢事实）。
- **跨 segment 边界感知**：多 segment 时在边界画竖虚线并标注 `segment N`；账本列表保持单一平铺不变（仅图表允许边界标注——修订现行 spec 的「不出现任何分隔标注」条款，该条款在设计评审中确认为过度限制：边界标注是事实呈现而非视觉分组）。
- **图头副行**：一句话说明语义（实心 keep · 空心未保留 · 虚线为 segment 边界 · 悬停看详情）。
- **图下统计行**：`segment 数 N · 轮次数 M · keep K · 首轮→最优 <方向化差值>`，紧贴图表可读。
- 基线虚线参考线、桌面/移动双变体、<2 点不画、SSE/tooltip 数据真实性等全部保留。

## Capabilities

### New Capabilities

（无）

### Modified Capabilities

- `autoresearch/dashboard`: MODIFIED「从账本导出静态 dashboard」——度量趋势折线 bullet 重写（点层级/稀疏刻度/segment 边界/图头图尾），「config 行不产生分组」bullet 修订为「列表平铺、图表允许边界标注」；对应 scenario 增改。

## Impact

- `plugin/mcp/lib/dashboard.ts`（renderTrendSvg 重构 + 图区 markup）、`plugin/mcp/lib/ledger.ts`（SessionHistory 增加 segmentCount 投影）、`plugin/tests/dashboard.test.ts`、`docs/design/dashboard.md`。
- 不改：工具行为、SSE、循环控制、账本格式。
