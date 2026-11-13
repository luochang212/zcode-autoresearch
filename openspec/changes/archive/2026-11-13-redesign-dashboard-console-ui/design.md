# Design: redesign-dashboard-console-ui

## Context

渲染层现状：`renderBody` 单函数产出全部 HTML/CSS/JS，CSS 为两代叠加（编辑部基础版 + "Report hierarchy" 覆盖版）。647 行测试钉死大量行为（SSE/筛选/锚点/Δ 语义/转义/刻度不变量）。静态/live 共用 `renderBody`（ADR-1/6），零第三方依赖（铁律 2）。

## 决策

### 1. 重写而非追加

一次性重写 `renderBody` 的 CSS 为单一 token 层：`:root` 深色 token 集（深海军蓝基底）为默认，`prefers-color-scheme: light` 覆盖为暖白基底。间距/圆角/边框/阴影全部走 token 变量（`--space-*`、`--radius-*`、`--border`、`--shadow-*`），Lava Red 仅用于 overall 强调与 focus ring，状态色保留语义映射。旧两代 CSS 全部删除，不做迁移兼容。

### 2. 图表：SVG 保留 + 渐进增强 tooltip

内联 SVG 折线（双变体）与 `niceTicks` 不动——刻度小数位不变量是 spec 钉死行为，测试全保留。增强点：

- 数据点从 `<circle><title>` 升级为 `<circle data-run="N">` + 页面级单个 tooltip 元素（JS 复用账本数据：编号/metric/Δ/状态/描述摘要）；无 JS 时每个点保留原生 `<title>`（编号·metric·状态），信息不丢。
- tooltip 是单个复用元素，不伪造数据、不引库，约 30 行 JS。

### 3. KPI 卡与 hero

- meta 文字行 → 四张紧凑 KPI 卡（`<dl>` 语义或等价）：数字 tabular-nums + 标签小字，卡片高度克制（非营销大卡）。置信度徽章留在 hero 元信息行。
- 「当前运行状态」不在数据模型里，不虚构：元信息以 实验总数 / segment 数 / 最后更新时间（lastRunAt）呈现——按我们有什么来。

### 4. 表格行与长文

- 状态药丸、等宽右对齐 metric/Δ、commit monospace 徽标保留现有 DOM 骨架（类名尽量沿用，减少测试改动面），换 token 化样式 + hover 背景。
- 长描述展开收起用 `<details>`（无 JS 可用、打印可展开）：描述超过 ~160 字符时默认收起，`summary` 显示首行预览。现有 r-asi `<details>` 机制同构，风格统一。
- Lucide 图标：仅借 3-4 个 path data 手工内联（如 filter/git-commit/activity），不引包。

### 5. 功能保护清单（实现时逐项对照）

SSE EventSource + `jsonl-updated` + 滚动位置恢复（script 原样保留）；图点点击重置筛选 + `#run-N` 锚点；`data-filter` + `aria-pressed`；`±0` 中性、方向语义、全局 baseline 口径；noop 中性灰；revisits 标注；r-asi 折叠块；全量转义；非字符串 timestamp 容错；`<2` 点不画图；页脚口径；打印样式；移动端重排。

## Risks / Trade-offs

- DOM 类名部分更新 → 测试断言同步更新（行为断言全保留，结构断言按新 DOM 改写）。
- JS tooltip 增加少量复杂度 → 单元素复用 + 无 JS 降级，可控。
- 深色默认 vs 系统 media query：无手动切换开关（保持零状态），跟随系统偏好。

## Migration

渲染器为纯函数，无迁移问题；旧导出文件不重生成，新导出即刻新样式。
