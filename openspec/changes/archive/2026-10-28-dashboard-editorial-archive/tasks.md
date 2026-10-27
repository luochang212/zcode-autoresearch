# 任务：dashboard-editorial-archive

## 1. 规格与数据层

- [x] 1.1 `plugin/mcp/lib/ledger.ts`：新增 `rebuildHistory(entries)` 纯函数（segment 分组、totalRuns/kept/firstMetric/bestMetric/lastRunAt、末段 confidence），不改 `rebuildState`
- [x] 1.2 `plugin/tests/dashboard.test.ts`：`rebuildHistory` 纯函数用例（多 segment 分组、跨段 best、无 config 前置 run 容错）

## 2. 渲染层

- [x] 2.1 `plugin/mcp/lib/dashboard.ts`：`renderDashboard/renderLiveDashboard` 切换为 `SessionHistory` 输入 + 新签名（`opts.pin`），渲染结构按设计稿重写（hero 统计带 / 全量折线图含 segment 边界 / 平铺账本网格 / 页脚日期+pinned / ±0 中性 / 保留 `↻ Revisiting` 与 noop 中性）
- [x] 2.2 `plugin/mcp/lib/dashboard-server.ts`：`/` 路由改 `rebuildHistory(readLedger(...))` + `renderLiveDashboard`
- [x] 2.3 `plugin/mcp/server.ts`：`export_dashboard` 计算 pinned hash（`isGitRepo` + `shortHash`，fail-open null）并传入

## 3. 测试对齐

- [x] 3.1 `plugin/tests/dashboard.test.ts`：渲染断言对齐新结构（band/ledger/badge 类名、SVG 尺寸与点位、live 路由）；新增多 segment 渲染、±0 中性、pinned at、页脚日期、无 pin 省略用例；MCP 集成用例（live server 路由、SSE、404 容错）保持通过
- [x] 3.2 `cd plugin && node --test tests/dashboard.test.ts` 全绿

## 4. 全量验证与文档

- [x] 4.1 根目录 `npm test`、`npm run lint`、`npm run fmt:check`、`npm run typecheck` 全过
- [x] 4.2 浏览器实测移植后渲染（390px 移动端 + 桌面暗色），与设计原型一致
- [x] 4.3 `plugin/README.md` / `README_CN.md` dashboard 描述行同步
- [x] 4.4 `openspec validate --strict dashboard-editorial-archive` 通过后归档，delta 合并进 `openspec/specs/autoresearch/dashboard/spec.md`
