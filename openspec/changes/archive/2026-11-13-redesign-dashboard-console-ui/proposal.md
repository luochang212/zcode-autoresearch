# Proposal: redesign-dashboard-console-ui

## Why

当前 dashboard 视觉是「编辑部式档案页」，且 `dashboard.ts` 内部存在两代 CSS 叠加（基础版 + "Report hierarchy" 覆盖版，同选择器互相覆盖），维护性差、观感偏简陋。用户要求升级为专业、现代、高信息密度的 AI Research Experiment Dashboard（参考 Linear / Vercel / Weights & Biases 的设计语言，仅借鉴审美）：深海军蓝 + 暖白基底、Lava Red 少量强调、深色优先、统一设计 token、KPI 卡片、增强图表 tooltip 与表格交互。

## What Changes

- **视觉体系重写**（`plugin/mcp/lib/dashboard.ts` 渲染层，静态/live 共用渲染器不变）：
  - 设计 token 重建：深海军蓝/暖白基底 + Lava Red 强调，`prefers-color-scheme` 双主题（深色为默认 token 集），单一 token 层替代两代叠加 CSS；统一圆角/边框/间距/阴影，数字等宽（tabular-nums），现代无衬线字体。
  - Hero 区：标题 + metric 名称/单位/方向 + 元信息（实验总数、segment、最后更新时间），收敛留白层级。
  - KPI 指标卡：Total Experiments / Kept / Reverted / No-op 四张紧凑卡片（替代横向点分隔文字行），置信度判定以小徽章保留在 hero 元信息。
  - 趋势图：保留内联 SVG 双变体（桌面 960×240 / 移动 390×240 1:1）、baseline 虚线、keep 实心/非 keep 空心；增强 hover——JS tooltip 展示实验编号、metric、Δ、状态（数据全部来自真实账本，无 JS 降级为原生 `<title>`）；网格/坐标轴/图例按新 token 重绘。
  - 实验记录区：精致表格行（状态药丸、metric/Δ 等宽右对齐、假设与结论为主阅读内容、commit monospace 徽标），行 hover 背景反馈，长描述用 `<details>` 展开收起（无 JS 可用），筛选（全部/保留/回退/无改动）与锚点跳转保留。
  - 细节：hover/focus/active 状态、滚动条样式、移动端重排（非缩小）、空状态、少量内联 SVG 图标（Lucide 风格 path data，零依赖）。
- **功能保护（全部不变）**：SSE EventSource + `jsonl-updated` 自动刷新、刷新前后滚动位置恢复、锚点跳转与筛选联动、baseline/delta 全局口径与 direction 语义、noop 中性、revisits 标注、r-asi 折叠块、全部转义防御、输入容错（非字符串 timestamp / 渲染异常 500）、刻度小数位跨度不变量。
- **不引入任何依赖**：无字体文件、无图标库、无图表库；Lucide 仅借 path data 手工内联。

## Capabilities

### New Capabilities

（无）

### Modified Capabilities

- `autoresearch/dashboard`: MODIFIED「从账本导出静态 dashboard」——视觉契约从编辑部式档案页改为 Modern AI Research Console 风格（token 体系、KPI 卡、新配色、tooltip、长文展开）；MODIFIED「报告阅读与证据导航」——新增 hover tooltip、行 hover 反馈、长文展开收起要求；其余 Requirement（方向语义、全量历史、汇总边界、输入防御、刻度不变量、重试标注）不变。

## Impact

- 改动文件：`plugin/mcp/lib/dashboard.ts`（渲染层重写）、`plugin/tests/dashboard.test.ts`（结构断言随新 DOM 更新，行为断言全保留）、`docs/design/dashboard.md`（设计意图与验收清单更新）。
- 不改：`dashboard-server.ts`、`server.ts`、账本/投影（`rebuildHistory`）、循环控制、护栏。
- 验证：全量测试 + 真实会话渲染实测（桌面/390/320 × 亮暗主题 × 筛选/锚点/SSE 重放）。
