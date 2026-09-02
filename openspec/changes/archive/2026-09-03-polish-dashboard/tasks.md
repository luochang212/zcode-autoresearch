# Tasks: polish-dashboard

## 1. CSS 与布局（D1/D3/D4）

- [x] 1.1 回归断言先行（红）：dashboard.test.ts 断言渲染 HTML 含 border-box、grid auto-fit/minmax、prefers-color-scheme dark、overflow-wrap anywhere、tablewrap overflow-x、noop 中性样式类
- [x] 1.2 `plugin/mcp/lib/dashboard.ts`：全局 `box-sizing:border-box`；`.cards` 改 grid；颜色全部收敛 CSS 变量 + dark 媒体查询；`.desc` 补 anywhere；表格外包 `.tablewrap`

## 2. 状态色与数值（D2/D6）

- [x] 2.1 回归断言先行（红）：noop 行徽章 class 含 `noop`（不含 `crash`）；confidence 卡含数值
- [x] 2.2 cls 映射加 noop 分支 + `.noop`/`.badge.noop` 中性样式；`fmtMetric` 应用于卡片与表格 metric 列、confidence 卡补数值

## 3. SVG 趋势折线（D5）

- [x] 3.1 回归断言先行（红）：≥2 有效点 state → `<svg`+`<polyline` 存在、circle 数=有效点数、baseline 虚线存在；<2 点 → 无 `<svg`
- [x] 3.2 `plugin/mcp/lib/dashboard.ts`：`renderTrendSvg(state)` 纯函数 + 表格上方插入（escapeHtml 数值文本）

## 4. 收尾

- [x] 4.1 全量检查：`npm test`、`npm run lint`、`npm run fmt:check`、`npx tsc --noEmit` 全绿
- [x] 4.2 浏览器复测（同 worth-fix 测量集）：900px 六卡单行等宽、无孤行；长 URL 断行、页面无横向溢出；深色截图表头可读；no-op 徽章中性灰
- [x] 4.3 `openspec validate --strict polish-dashboard` 通过；归档 change（`openspec validate --specs` 通过）
