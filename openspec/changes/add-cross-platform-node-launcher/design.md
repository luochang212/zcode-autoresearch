# 设计：跨平台 Node 启动器

## 现场证据（2026-11-09）

- 宿主日志 `log/zcode-2026-11-09.jsonl`：`mcp.server.failed`，`plugin:autoresearch:autoresearch`，stderr `'sh' is not recognized as an internal or external command`，transport stdio；同会话 `mcp.startup.completed` `statusCounts: {connected: 7, failed: 1}`
- 同日 hooks：`hook.run.failed`（UserPromptSubmit 与 PreToolUse 多次，source `plugin.autoresearch@zcode-autoresearch.*`）
- 实验后果：KS 训练环整段会话五工具不挂载、四 hooks 静默失效，agent 全程手动循环（无审计不变量、无熔断、无写保护）
- 反向证据：同机 7 个官方插件 `command: node` 全部连接成功；`node launcher.mjs mcp/server.ts` 手动握手五工具齐全

## 方案

`scripts/launcher.mjs`（纯 stdlib ESM）取代 `scripts/run-node.sh` 成为唯一注册入口：

- **为什么是裸 `node` + .mjs**：宿主唯一保证解析的命令是 `node`；launcher 自身必须能在「宿主解析到的任意 node」上解析（可能是 Electron 内核、版本未知），故入口用普通 .mjs（无 TS 语法），由它负责找到 ≥24 的 node 再去跑 .ts 目标——把 run-node.sh 的「解析与版本门」整体前移到 node 世界，`command` 回到 ADR-9 之前的 `node`。
- **Win32 搜索链**：PATH `node.exe` → `%NVM_HOME%`（缺省 `%APPDATA%\nvm`，nvm-windows 布局 `v*/node.exe`）→ `%ProgramFiles%\nodejs\node.exe`（含 x86）。POSIX 保持原链。isExecutable 在 win32 退化为存在性检查（无执行位概念）。
- **nvm 统一「最新优先」**：run-node.sh 的 POSIX nvm 是 glob 序取首个合格者——多版本并存时 alphabetical 顺序会命中任意旧版本（`v10` 排在 `v24` 前），语义本就依赖巧合；launcher 对两平台统一为版本号降序取首个合格者，确定性且符合用户预期。spec delta 如实修订。
- **退出码透传**：POSIX exec 的逐字节语义在 Node 里用 `spawnSync(stdio: 'inherit')` 近似：正常退出码原样；signal 终止按 shell 惯例映射 128+n（SIGTERM→143 等），与 run-node.sh 经 exec 的可观察行为一致。
- **stdout 纯净**：探测走 spawnSync 捕获输出，launcher 自身在 exec 模式不写 stdout；`--resolve` 是显式诊断模式（非 JSON-RPC 通道），允许写。

## Alternatives considered

- **保留 run-node.sh，Windows 记为不支持**：ADR-9 现行立场。但本插件的目标场景（作者自用 + 市场分发）包含 Windows，护栏中的写保护静默失效不可接受；且修复成本低于维护一个「平台矩阵半残」的心智负担。否决。
- **.mcp.json/hooks.json 按平台拆分命令**：宿主清单 schema 未见 per-OS 命令字段（生态无先例），引入两个事实源。否决。
- **预编译 dist/\*.js（官方插件主流模式）**：能让入口退化到任意 node，但违反 ADR-6「无构建步骤」铁律，且不解决「宿主 PATH 无 node」的解析问题（ADR-9 已论证）。否决，launcher 达成同样效果且零构建。
- **polyglot .cmd（superpowers 模式）**：只覆盖 Windows，POSIX 仍需另一入口，两套事实源；且 .cmd 无法表达 nvm-windows 最新优先与版本门。否决。
- **native 重写（Python/Rust 等）**：ADR-9 已否决（生态零先例 + 行为重验成本）。不再重复。

## 风险与边界

- launcher 自身故障等同插件失联（ADR-9 既有后果，不变）；缓解：分支测试含 Windows 实机（此前 run-node.test.ts 在 win32 整文件跳过），并保留 `--resolve` 诊断。
- 宿主解析到的 node 若 <24（Electron 兜底未知版本）：launcher 在其上解析（.mjs 兼容），再按搜索链找 ≥24 重跑目标；找不到则 127 + stderr 修法说明。
- 基准脚本仍需 POSIX shell（bash/wsl）——不在本次范围（ADR-9 既有边界，真实机器均具备）。
