## Context

实现依据：`docs/research/pi-gap-analysis.md` 里程碑 2——SSE live dashboard（#22）、workingDir（#19）、finalize（#25）。全部零平台依赖：HTTP server 是 MCP server 进程内 node:http；workingDir 是路径解析；finalize 是 git 脚本。参考 pi 实现（index.ts:2811-2943 dashboard server、finalize.sh:1-448）按 zcode 语义简化。

## Goals / Non-Goals

**Goals:**
- 浏览器 dashboard 从"静态快照"升级为"live 直播"（每次实验自动刷新），降级路径保留静态 HTML。
- 研究目录与项目目录可分离（workingDir），hooks 与 server 行为一致。
- finalize 把一晚上实验变成可交付的干净分支，失败安全回滚。

**Non-Goals:**
- 不移植 pi 的 canvas 折线图/分享卡（live 用整页刷新代替精细重渲染）。
- workingDir 不做"重定向后 cwd 自动切换"的 UI 层（配置驱动即可）。
- finalize 不做 pi 的 groups.json 用户批准交互流（agent 引导 + 脚本执行，简化批准为命令确认）。

## Decisions

**1. dashboard server 生命周期挂在 MCP server 进程内：** `lib/dashboard-server.mjs` 提供 `ensureServer(workCwd)`（单例）与 `broadcast(workCwd)`。路由：`/` 返回 live HTML（复用 renderDashboard + 注入 SSE 客户端脚本）、`/autoresearch.jsonl` 返回账本原文、`/events` SSE 长连接。**live 更新机制 = SSE 事件触发 `location.reload()`**（简化；pi 是精细重渲染）。会话结束进程退出即停 server；`export_dashboard` 仍写静态 HTML 兜底。备选（独立常驻 server 进程）——放弃：生命周期管理复杂，且 MCP 进程内已满足需求。

**2. workingDir 解析统一入口：** `lib/paths.mjs` 导出 `resolveWorkCwd(projectCwd)`——读 `projectCwd/.auto/config.json` 的 `workingDir`（相对 projectCwd 或绝对），目录存在则返回，否则 projectCwd。server 与全部 hooks 共用；server 内部所有文件/git/spawn/hooks/dashboard 操作改用 workCwd。config 文件位置保持在项目目录（pi 语义）。备选（workingDir 内再放 .auto/config.json）——放弃：自引用循环。

**3. finalize 走"agent 引导 + shell 脚本"而非 server 工具：** `commands/finalize.md` 让 agent：读账本 kept commits → 按文件交集分组写 `groups.json` → 跑 `bash scripts/finalize.sh <projectCwd> <groups.json>` → 汇报。脚本（移植 pi finalize.sh 核心，精简）：preflight（在 feature branch、文件不重叠）、按组从 merge-base 建 `autoresearch/<goal>/NN-<slug>` 分支、`git checkout <kept_commit> -- <files>` + commit、并集验证（临时 verify 分支 diff 为空，剔除 .auto）、失败回滚（删分支回原分支）。备选（server 工具做分组）——放弃：分组决策需要 LLM 判断（文件语义），脚本只做确定性 git 操作。

## Risks / Trade-offs

- [SSE 整页刷新闪屏] → 可接受（live 值 > 平滑度）；后续可换 fetch+局部渲染。
- [HTTP server 占端口/资源] → 单例 + 随机端口 + 进程退出即停；仅 export 时启动。
- [workingDir 配置后既有会话混乱] → 文档明示"配 workingDir 是新会话语义"；解析失败回退项目目录。
- [finalize 分组错误（文件重叠未合并）] → 脚本 preflight 拒绝 + 回滚；agent 指引要求按文件交集分组。
- [finalize 大仓慢] → 仅 diff 相关文件，不做全仓操作。

## Open Questions

（无。）
