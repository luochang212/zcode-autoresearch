## Why

里程碑 1（迭代钩子/clear/ASI/护栏参数）已追平。里程碑 2 追平 pi 的体验与工程项（`docs/research/pi-gap-analysis.md`）：SSE 实时 dashboard（#22）、workingDir 重定向（#19）、finalize 分支整理（#25）。三者均为零平台依赖（纯 node HTTP、路径解析、git 脚本）。

## What Changes

- **SSE live dashboard**（追平 #22）：`export_dashboard` 增强为本地 HTTP server 模式——127.0.0.1 随机端口，路由 `/`（HTML）、`/autoresearch.jsonl`（账本原文）、`/events`（SSE）；`init_experiment`/`log_experiment` 后广播 `jsonl-updated`，浏览器自动刷新进度；无 server 时降级静态 HTML。
- **workingDir 重定向**（追平 #19）：`.auto/config.json` 的 `workingDir` 指定研究目录，init/run/log/git/hooks/dashboard 全部作用于该目录；config 留在项目目录。
- **finalize 分支整理**（追平 #25）：新增 `scripts/finalize.sh`（从 kept 实验按文件依赖分组 → 独立分支 → 并集验证 → 回滚）+ `/autoresearch:finalize` 命令指引。
- 更新 SKILL.md / loop-protocol / README。

## Capabilities

### New Capabilities

（无。）

### Modified Capabilities

- `autoresearch/dashboard`: export_dashboard 增加 live server 模式（SSE 实时更新）——Requirement 修改。
- `autoresearch/experiment-loop`: workingDir 重定向（init/run/log 作用于研究目录）——Requirement 修改；finalize 分支整理——Requirement 新增。

## Impact

- `plugin/mcp/lib/dashboard-server.mjs`（新）：HTTP server + SSE。
- `plugin/mcp/lib/dashboard.mjs`：live HTML 模板。
- `plugin/mcp/server.mjs`：workingDir 解析、dashboard server 生命周期与广播。
- `plugin/hooks/*.mjs`：workingDir 感知。
- `plugin/scripts/finalize.sh`（新）+ `plugin/commands/finalize.md`（新）。
- `plugin/skills/*`、`plugin/README.md`：文档。
- `plugin/tests/`：SSE 路由、workingDir、finalize 测试。
- 兼容性：additive；无 workingDir 配置时行为不变。
