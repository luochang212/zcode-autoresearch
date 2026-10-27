# 提案：dashboard 编辑部式重构——档案页设计 + 全量历史渲染

## Why

现行 dashboard 是 GitHub 风格素表（统计卡 + 表格），定位是"能看"，但作为实验循环唯一的可视化出口，用户需要它承担"实验档案"的阅读体验：一眼看清全局进展（总体改善幅度）、全部 segment 历史与每次实验的去向。adr-kit 决策档案页（Folio/Signal 双主题、editorial 排版）验证了这类"档案页"设计的有效性；本 change 取其设计语言（暖纸/深面双主题、衬线标题、等宽标签、纸纹质感），不引入其机制复杂度（无模板槽位、无主题切换、无构建步骤——沿用单渲染入口 `renderBody` 的 SSR 现状，符合"复杂度跟交付物定位走"的判定）。

设计原型经用户逐项确认（2026-10-28 会话）：hero 结构、无 tagline、无章节化（单图 + 单列表）、eyebrow 定为 `AUTORESEARCH · EXPERIMENT ARCHIVE`、正式徽章状态列、页脚 `autoresearch · <日期> | N runs · pinned at <hash>`。移动端（390px）已经浏览器实测：统计带折两列、账本行网格重排、无横向溢出。

顺带修正一个渲染缺陷：delta 恰为 0 时现行渲染落入"未改善"分支显示 `▼ +0`（箭头与符号矛盾），应为中性 `±0`。

## What Changes

- `plugin/mcp/lib/ledger.ts`：新增纯函数 `rebuildHistory(entries)`——从账本条目构建全量历史（segment 分组、totalRuns/kept/firstMetric/bestMetric/最后时间戳、confidence），供 dashboard 全量渲染使用；不改变 `rebuildState` 及循环控制语义。
- `plugin/mcp/lib/dashboard.ts`：`renderDashboard` / `renderLiveDashboard` 重写为编辑部式档案页——hero（eyebrow + 衬线标题 + 统计带）、单张全量折线图（segment 边界细虚线标注）、平铺账本（衬线行号 + 正式徽章 + Δ vs 段基线 + `↻ Revisiting` 标记保留）、页脚（最后 run 日期 + pinned hash）；CSS 全量换装（双主题跟随 `prefers-color-scheme`，暖纸+纸纹 / 深面+青强调）。
- `plugin/mcp/lib/dashboard-server.ts`：`/` 路由改用 `rebuildHistory` 渲染（live 与静态共用渲染层的性质不变）。
- `plugin/mcp/server.ts`：`export_dashboard` 传 pinned hash（`git rev-parse --short HEAD`，非 git 目录 fail-open 为省略）。
- 回归测试：`plugin/tests/dashboard.test.ts` 对齐新渲染结构，新增多 segment、±0 中性、pinned hash、页脚日期用例。
- 文档：`plugin/README.md` / `README_CN.md` dashboard 描述行同步（全量历史 + 档案页）。

## Capabilities

### New Capabilities

（无）

### Modified Capabilities

- `autoresearch/dashboard`：「从账本导出静态 dashboard」的呈现条款改为编辑部式档案页（统计带替卡片、账本网格替表格）；「反映度量方向与判定语义」补充 ±0 中性渲染；新增「全量历史渲染与定格信息」requirement（多 segment、pinned hash、页脚日期）。

## Impact

- 影响：`plugin/mcp/lib/{ledger,dashboard,dashboard-server}.ts`、`plugin/mcp/server.ts`、`plugin/tests/dashboard.test.ts`、两份 README 的 dashboard 行。
- 不变：账本格式、append-only 语义、`/autoresearch.jsonl` 与 `/events` 路由行为、SSE 广播、静态导出文件路径（`autoresearch-dashboard.html`）、单渲染入口（静态与 live 共用 `renderBody`）、`↻ Revisiting` 标记语义、noop 中性灰语义。
- 风险：渲染结构全换，`dashboard.test.ts` 断言需对齐；live 路由换 rebuildHistory 需保证旧账本（单 segment、无时间戳字段）渲染不回归——测试覆盖。
