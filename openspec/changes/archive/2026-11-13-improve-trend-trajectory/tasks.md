# Tasks

## 1. 投影（`plugin/mcp/lib/ledger.ts`）

- [x] 1.1 `SessionHistory` 增加 `segmentCount`（runs 的 distinct segment 数），补单测

## 2. 轨迹图重构（`plugin/mcp/lib/dashboard.ts`）

- [x] 2.1 点与线层级：连线弱色细线；keep 放大实心、未保留缩小空心红环；删除逐点 `#N` 文字
- [x] 2.2 X 轴稀疏整数刻度（≤8 个）+ 轴题「全局轮次」；Y 轴刻度沿 niceTicks 不变量
- [x] 2.3 segment 边界竖虚线 + `segment N` 标注（>1 segment 时）
- [x] 2.4 图头副行语义说明 + 具名图例三项；图下统计行（segment 数 · 轮次数 · keep 数 · 首轮→最优方向化差值）
- [x] 2.5 tooltip/原生 title/锚点保留，序号移入 tooltip；移动变体同步

## 3. 测试与验收

- [x] 3.1 更新趋势测试（无 dv 文字、新尺寸/类名）+ 新增：segment 边界、X 刻度、统计行、segmentCount 投影
- [x] 3.2 `openspec validate --strict` + 全量 `npm test` 通过
- [x] 3.3 预览重生成目检（含多 segment 样例边界标注、30+ 轮长样例刻度稀疏）
