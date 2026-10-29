---
status: implemented
date: 2026-10-29
description: 评估 MCP Apps UI 接入（ui:// 资源、dashboard 页面形态）或重审 UI 平台可行性时读。
raised-by: agent
decided-by: human
created: 2026-10-29
commit: "7076300"
paths: [plugin/mcp/**, plugin/.zcode-plugin/**]
---

# ADR: 8 UI Plugin（MCP Apps）平台可行：零依赖 vanilla 页面待宿主发布后接入只读 dashboard

## Problem

用户提出：作为 zcode 插件能否做 MCP App（官方 `modelcontextprotocol/ext-apps` 交互页面）。ADR-3/4 曾判定"无 UI 扩展点、浏览器 dashboard 为最终形态"，上游出现新能力后该平台假设需要重新核实。需回答三件事：(1) 协议与宿主的成熟度；(2) 零依赖/无构建铁律（铁律 2）下手写 stdio JSON-RPC server 能否接入；(3) 若可行，何时投入、什么范围。

研究方法：协议按 ext-apps 规范与 SDK 源码逐条核实；上游 `feat/ui-plugin` 分支实地 clone 查证、宿主 main 源码（3.16.2）深挖（clone 分别留存 `archived/zcode-plugins-ui` 与 `archived/zcode-host-main`，均 gitignored）；DSH（DeepSeek Harness）单独核查；本地核对 `server.ts` 现有 JSON-RPC 表面与 dashboard 数据流。核实到的关键事实：

- **协议已 Stable**：MCP Apps 是 MCP 首个官方扩展（spec `2026-01-26`，宣布 production-ready），Claude/ChatGPT/VS Code Copilot 等宿主已支持；ZCode Desktop 宿主亦委托官方 SDK 且只协商该单版本。
- **接入面极小**：工具 `_meta.ui.resourceUri` + `ui://` 资源（mimeType 精确为 `text/html;profile=mcp-app`），宿主走标准 `resources/read` 取 HTML；server 端无需任何新方法或能力声明。`_meta.ui.surface` 与清单 `ui.surfaces` 是 ZCode 扩展（非标准字段），可选。
- **零依赖页面是官方许可路线**：postMessage 裸 JSON-RPC 2.0（`ui/initialize` 握手 → `ui/notifications/initialized` → `tool-result` 通知）；官方文档明言 App 类"is a convenience wrapper, not a requirement"；wire 协议在 SDK 1.x↔2.x 间逐字节冻结。上游 showcase 手写页面（~4KB、无 SDK、无打包）实证可行。
- **CSP：规范默认封死直连，ZCode Desktop 放行声明过的回环**。规范默认 `default-src 'none'`/`connect-src 'none'`，未声明域的 fetch/EventSource 一律被禁；但 Desktop 实现（`pluginSandbox/csp.ts` + `normalizeCspOrigin()`）按资源 `_meta.ui.csp.connectDomains` 构建 CSP，显式允许精确 `http://127.0.0.1:<port>` / `ws://127.0.0.1:<port>`（拒绝 `localhost`/`[::1]`，端口保留；`127.0.0.1` 是 potentially-trustworthy origin，无 mixed-content 问题）——现有 SSE dashboard 理论上可原样嵌进页面。
- **宿主状态：进了 main 源码、无发布版**：UI 支持已并入 ZCode main（v3.15.1+，2026-10-10），唯一 GitHub Release（v3.14.3）先于该特性；`feat/ui-plugin` 分支是 2026-09-29 过期快照、已被 main 契约超越；仅 Desktop 本地工作区支持；上游市场已出货 excalidraw（`componentTypes:["ui"]`）但形态仍在变（blender UI 插件 2026-10-22 被撤）。宿主实现质量高：三个核心目录零 TODO/FIXME、能力清单全实现、refuse-recycle 生命周期完备；但 agent 侧 `mcp/ui*` 执行器不在源码镜像内，subscribe 代理只有文档与 E2E fixture 佐证。
- **上游样例结构**：excalidraw 清单的 mcpServers 与普通插件零差异，server 用普通 MCP SDK 的 `registerResource` 返回内联 HTML；ext-apps SDK 只在页面侧。
- **DSH（DeepSeek Harness）官方零支持**：DSH 是 DeepSeek 2026-08 开源的 agent harness（Cordis 架构，Web/Desktop/CLI，0.2.1-rc.x preview）；官方 MCP 栈仅 tools + 按需只读 resources（无 subscribe/prompts/sampling），MCP Apps 在官方 client matrix 无行、代码文档零足迹、无 roadmap 信号。社区有两个第三方 MCP Apps host 插件（sugarforever/dsh-mcp-apps、creative-dswork/dsh-uni-editor，后者对齐 spec 2026-01-26）实现标准 ui/* 协议——标准 vanilla 页面是唯一可跨宿主（ZCode Desktop + DSH 经社区插件）的路线。
- **本地映射**：`server.ts` 现有表面 = initialize(tools) + tools/* + exit，补 `resources/read`（可选 subscribe）即可；`broadcastDashboardUpdate()`（每次实验后触发）既是资源更新通知也是 SSE 回环路径的现成触发点；`rebuildHistory`/`renderLiveDashboard` 可复用为页面数据与渲染。

## Decision

1. **可行性判定：可做，零依赖铁律不破。** 服务端改造 = 工具定义加 `_meta.ui.resourceUri` + 新增 `resources/read`（`ui://autoresearch/dashboard.html`，mimeType `text/html;profile=mcp-app`，返回内联 HTML）；页面路线 = vanilla JS postMessage 直连标准 ui/* 协议（pin spec `2026-01-26`），不打包 ext-apps SDK、不引入构建步骤。清单 `ui.surfaces` 侧栏面板按 ZCode 扩展声明，可选、后加。
2. **时机：宿主发布前不写代码。** 动工锚定"ZCode 首个携带 UI 支持的正式 Release"而非文档/分支出现；届时走 openspec change 实施。现有静态 HTML + SSE 浏览器 dashboard 保持基线与回退形态（非 Desktop、旧宿主仍靠它），UI 页面是增量叠加不是替换。
3. **范围：只读监督面。** 页面呈现账本历史（复用 rebuildHistory/renderLiveDashboard），数据经 tools/call（新增只读查询工具）或 resources/read 获取；实时刷新有两条候选路径，取舍留实施 change 定——标准 `resources/subscribe`（跨宿主、规范路径），或资源 `_meta.ui.csp` 声明回环复用现有 dashboard-server 的 SSE（零改动复用、绑定 Desktop 实现，且不依赖 agent 侧 subscribe 代理——该部分不在公开源码镜像内），均按 hostCapabilities/CSP 实况探测降级。第一版不碰 `sendMessage`/`updateModelContext`（与"信号均 advisory、决策权在用户"原则有张力）、不碰 sampling 与页面自有工具（registerTool）。
4. **DSH 列为第二梯队宿主**：不为其做适配性妥协——vanilla 标准协议即兼容路径（经社区 host 插件）；其约束（页面 self-contained、仅 Web client 有 App 面、无 subscribe 退化为 tools/call 轮询）仅在真正适配时再评估。
5. Gen UI 不适用本插件：Gen UI 页面无 callTool、无插件服务访问，而账本事实源在插件 MCP 服务手里。

## Alternatives considered

- **立即按 feat/ui-plugin 分支开发**：否决——分支是 2026-09-29 快照，已被 main 契约超越，且无发布版宿主可联调；对着会变的靶子写代码收益为负。
- **打包官方 ext-apps SDK（esbuild IIFE 内联，excalidraw 模式）**：否决——引入第三方 bundle + 构建步骤，违反铁律 2；vanilla 直连是官方许可的等价路线。未来若需跨宿主（Claude/ChatGPT）分发或协议大改，重估此选项。
- **用 window.zcode 宿主注入别名作主路线**：不用——与 vanilla 标准协议二选一取标准：spec 支撑、不绑定 ZCode 兼容层；且只有标准协议可被第三方宿主（如 DSH 社区 host 插件）渲染，别名无跨宿主价值。
- **第一版即做 sendMessage 转向按钮等双向能力**：否决——范围蔓延，页面驱动对话与护栏 advisory 语义的张力需单独设计。

## Consequences

- 买到了：可行性判定有源码级证据与上游实证；ADR-3/4 的"无 UI 扩展点"假设更新为"Desktop 有官方页面扩展点，TUI overlay 判定不变"——widget 愿景（原生监督面替代开浏览器看 SSE）获得低成本落地路径；接入面收敛为 server 两处小改 + 一个 HTML 页面，零依赖与无构建均不受损；vanilla 标准路线使页面天然具备双宿主潜力（ZCode Desktop 原生 + DSH 经社区插件）。
- 付出的：接入时间受上游发布节奏支配（不可控）；vanilla 页面需自行维护 ui/* 握手与高度测量（协议冻结但宿主实现仍在 churn）；实时刷新依赖 ZCode experimental 能力或 Desktop 的回环 CSP 实现，必须能力探测降级；DSH 侧依赖社区插件存续，官方转正无时间表。
- 维护：本判定是"可行 + 待接入"，实施另走 openspec change；上游样例与宿主源码 clone 留存 `archived/zcode-plugins-ui`、`archived/zcode-host-main` 供实施期参照；plugin/README 已知边界表述在实施时同步更新。DSH 长期监控点：官方 client-matrix 是否新增行、`@deepseek-ai/dsh-mcp-client` 是否引入 ext-apps 依赖、社区帖 #2104/#2424 是否获官方回应。
