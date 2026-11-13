# Tasks

## 1. 渲染层重写（`plugin/mcp/lib/dashboard.ts`）

- [x] 1.1 删除两代叠加 CSS，重建单一 token 层（深海军蓝/暖白/Lava Red，深色默认 + 亮色覆盖，间距/圆角/边框/阴影 token 化）
- [x] 1.2 Hero 区：标题 + metric 元信息行 + baseline→best→overall 构图 + KPI 四卡（Total/Kept/Reverted/No-op）+ 置信度徽章；元信息含 segment 数与最后更新时间（不虚构运行状态）
- [x] 1.3 趋势图：保留双变体 SVG 与 niceTicks；数据点带 `data-run` + 富化 `<title>`；页面级 tooltip 元素 + 复用脚本（编号/metric/Δ/状态）
- [x] 1.4 实验记录表格：状态药丸 / 等宽右对齐 / commit 徽标 / 行 hover 背景；长描述 `<details>` 展开收起；筛选与锚点联动保留
- [x] 1.5 细节：hover/focus/active 状态、滚动条、移动端重排（≤760px）、空状态、打印样式、少量内联图标（Lucide path data）
- [x] 1.6 功能保护逐项对照（SSE/滚动恢复/锚点/筛选/Δ 语义/±0/revisits/r-asi/转义/容错）——live script 与 filter script 语义不变

## 2. 测试（`plugin/tests/dashboard.test.ts`）

- [x] 2.1 结构断言按新 DOM 更新（KPI 卡、tooltip 数据、details 长文）；行为断言（Δ 语义、±0、noop 中性、revisits、转义、刻度不变量、容错）全保留
- [x] 2.2 新增：KPI 计数正确性、tooltip 数据来自真实账本、长文默认收起可展开、深色 token 集为默认

## 3. 校验与验证

- [x] 3.1 `openspec validate --strict redesign-dashboard-console-ui` + `npm test` 全量通过
- [x] 3.2 真实会话渲染实测：迷你实验生成真实账本 → 渲染截图，检查桌面/390/320 × 亮暗主题、KPI/图表/表格/筛选/锚点/tooltip
- [x] 3.3 功能重放：SSE 自动刷新 + 滚动位置恢复、筛选、图点锚点、无 JS 可读性（禁 JS 截图）
- [x] 3.4 更新 `docs/design/dashboard.md`（设计意图、数据口径、验收清单）
