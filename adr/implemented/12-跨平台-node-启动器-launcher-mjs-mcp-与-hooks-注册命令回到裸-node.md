---
status: implemented
date: 2026-11-10
description: 改 MCP server/hooks 启动链（launcher.mjs、.mcp.json、hooks.json）或排查 Windows 上插件装完没反应、工具不挂载时读。
raised-by: agent
decided-by: human
created: 2026-11-10
paths:
  - plugin/scripts/launcher.mjs
  - plugin/scripts/finalize.sh
  - plugin/.mcp.json
  - plugin/hooks/hooks.json
---

# ADR: 12 跨平台 Node 启动器 launcher.mjs：MCP 与 hooks 注册命令回到裸 node

## Problem

ADR-9 的 run-node.sh wrapper 以 `sh` 为注册命令，并以两条前提推迟 Windows：宿主在 Windows 的拉起语义「未经实测」、基准脚本（bash）在无 POSIX shell 的 Windows「本就不可用」。2026-11-09 KS 训练环 dogfooding（作者 Windows 主力机）把两条前提同时推翻，现场证据：

- 宿主日志：`mcp.server.failed`，`plugin:autoresearch:autoresearch`，stderr `'sh' is not recognized as an internal or external command`——Windows 宿主以 CreateProcess 直接拉起 `command`，`sh` 不在宿主 PATH；同会话 8 个 MCP server 连上 7 个，唯一失败者即本插件。四个 hooks 全天 `hook.run.failed`（同因）。
- 实验后果：一个完整实验会话五工具不挂载、四 hooks（含冻结写保护）静默失效，agent 全程手动循环。
- 反向证据：同机 7 个官方插件 `command: node` 全部连接成功——`node` 是宿主在三平台都能解析的唯一命令；「Windows 本就不可用」不成立（Git Bash/WSL 齐备，基准脚本经 bash/wsl 照跑）。

## Decision

`scripts/launcher.mjs`（纯 Node stdlib 的跨平台启动器，无构建步骤）取代 run-node.sh，成为 `.mcp.json` 与 `hooks.json` 的统一注册入口，注册命令回到裸 `node`（ADR-9 之前的状态），解析与版本门语义整体移植：

- 解析顺序：`AUTORESEARCH_NODE_BIN` 显式覆盖（权威，不可执行或版本不足即 127）→ PATH（win32 `node.exe`）→ nvm（POSIX `$NVM_DIR`；win32 `%NVM_HOME%`/`%APPDATA%\nvm`）→ 固定安装位（POSIX Homebrew//usr/local；win32 `%ProgramFiles%\nodejs`）。版本门 ≥24 不变（ADR-6 成文决策保持）。
- nvm 两平台统一「版本号降序取首个合格者」（取代 POSIX 原 glob 序——多版本并存时 glob 序会命中任意旧版本）。
- stdout 纯净、`--resolve` 诊断、参数透传保持；POSIX exec 的退出码语义以 `spawnSync(stdio:'inherit')` + signal 映射 128+n 保留。
- launcher 自身是普通 .mjs：宿主解析到的任意 node（含版本未知的 Electron 兜底）都能先跑它，再由它找 ≥24 去执行 .ts 目标——ADR-9「找到」与 ADR-6「门槛」两层职责在新入口内合一。
- `finalize.sh` 的 Node 解析改经 launcher（以裸 `node` 调 `--resolve`；finalize 运行在 agent shell，node 在其 PATH）。
- 契约细节落在 openspec capability `autoresearch/runtime`（change：add-cross-platform-node-launcher）；测试 `tests/launcher.test.ts` 在 Windows 实机覆盖（原 run-node.test.ts 在 win32 整文件跳过）。

## Alternatives considered

- **保留 run-node.sh，Windows 记为不支持**：ADR-9 现行立场，但目标场景包含 Windows 且写保护静默失效不可接受；修复成本低于「平台矩阵半残」的维护负担。否决。
- **预编译 dist/\*.js（官方插件主流模式）**：降低版本门槛但不解决宿主 PATH 解析（ADR-9 已论证），且违反 ADR-6「无构建步骤」。否决；launcher 以零构建达成同一效果。
- **polyglot .cmd（superpowers 模式）**：只覆盖 Windows、POSIX 需另一入口，两套事实源；.cmd 无法表达 nvm 最新优先与版本门。否决。
- **.mcp.json/hooks.json 按平台拆分命令**：宿主清单 schema 无 per-OS 命令字段（生态无先例）。否决。
- **整体迁移 Python stdlib**：ADR-9 已否决（生态零先例 + 约 3800 行行为重验）。不重复。

## Consequences

- Windows 装机体验与 macOS/Linux 拉平：机器上存在 Node ≥24（PATH、nvm、Program Files 任一处）即可用；宿主 PATH 命中 node 的机器行为不变（PATH 优先）。
- 代价：launcher 自身成为五处启动的单一依赖点（ADR-9 既有后果延续），其故障等同插件失联；测试逐分支覆盖并新增 Windows 实机分支。
- run-node.sh 退役；`AUTORESEARCH_NODE_BIN` 与 `--resolve` 契约不变，用户无感迁移。
- 新增证据回路：宿主日志（mcp.server.failed / hook.run.failed）是这类失联的唯一宿主侧信号，agent 侧仍无主动告警——「session-start 自检 MCP 可达性」留作后续 change。
