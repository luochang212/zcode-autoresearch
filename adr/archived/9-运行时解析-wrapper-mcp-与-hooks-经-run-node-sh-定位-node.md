---
status: superseded
date: 2026-11-10
description: 改 MCP server/hooks 启动链（run-node.sh、.mcp.json、hooks.json）或排查插件装完没反应、工具不挂载时读。
raised-by: agent
decided-by: human
created: 2026-11-01
superseded-by: 12
archived: 2026-11-10
archive-reason: superseded by ADR 12
---

# ADR: 9 运行时解析 wrapper：MCP 与 hooks 经 run-node.sh 定位 Node

## Problem

ZCode 宿主以自身 PATH 拉起 MCP server 与 hooks，该 PATH 通常不含用户自管 Node（nvm、Homebrew）的安装位。`command: node` 在这类机器上静默失败：五个 MCP 工具全部不挂载、四个 hooks 全部 fail-open，用户侧零反馈。作者机器实测命中：nvm 里存在 v24.21.0，宿主拉起进程的 PATH（`/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin` 加宿主自带工具目录）上无 node。

生态普查（官方市场 52 个插件）：自带本地 MCP server 的插件（mimosa、excalidraw、wordcraft、kicad、jupyter-notebook、typst-workbench、zotero、android/ios-simulator）全部裸 `node`，同病；anet 是唯一在启动脚本里做解析的先例，anet-run.sh 的注释原文即「a desktop application does not always inherit the PATH of a login shell」。

## Decision

MCP server 与全部 hooks 经 `plugin/scripts/run-node.sh` 启动（`.mcp.json` 与 `hooks.json` 的 `command` 写 `sh`，脚本路径进 args，不依赖可执行位）。解析顺序：

1. `AUTORESEARCH_NODE_BIN` 显式覆盖：权威。不可执行或版本不足时硬报错退出（127），不回退其它候选（沿用 anet 的 anetPath 语义：配置路径按原样使用，绝不被替换）；
2. `command -v node`（PATH，保持旧行为兼容）；
3. nvm：`$NVM_DIR`（缺省 `~/.nvm`）下 `versions/node/*/bin/node`，glob 序取第一个合格者；
4. `/opt/homebrew/bin/node`、`/usr/local/bin/node`。

版本门保持 ADR 6 的主版本 ≥24（wrapper 只解决「找到」不放宽「门槛」）；版本探测用 `node -p process.versions.node` 的主版本号整数比较，探测失败视为不通过。stdout 属 JSON-RPC 通道：探测全部在命令替换内完成，诊断只写 stderr，解析成功后 `exec` 替换进程、原样透传参数与退出码。契约细节（搜索顺序、覆盖语义、版本门、stdout 纯净性）落在 openspec capability `autoresearch/runtime`。

## Alternatives considered

- **整体迁移 Python stdlib**：`/usr/bin/python3` 天然在宿主裸 PATH 上，但生态零先例（52 个插件无一用 Python 跑 server），需重写约 3800 行并重验账本审计、git 回滚、SSE dashboard 等微妙行为，且把「node 不在 PATH」换成同类问题「/usr/bin/python3 缺失」（无 CLT 的 macOS 裸机同样命中），还放弃 tsc/eslint/node --test 护栏。否决。
- **预编译 dist/\*.js（mimosa/excalidraw 模式）**：降低版本门槛（任意现代 node 可跑），但不解决 PATH 解析，且引入构建步骤与源码/产物双维护，与 ADR 6 的「无构建步骤」冲突。如未来需要可与 wrapper 叠加，非本次范围。
- **polyglot .cmd（superpowers 模式）覆盖 Windows**：宿主在 Windows 对 hooks 与 MCP 的拉起语义未经实测，且本插件核心基准（measure.sh/checks.sh，bash 脚本）在无 POSIX shell 的 Windows 本就不可用，为名义支持引入未验证复杂度不划算。留待真实需求。
- **保持裸 node**：问题将随市场分发进入每个 nvm 用户的装机体验（安装即静默失效），否决。

## Consequences

机器上存在 Node ≥24（PATH、nvm、Homebrew 任一处）即可用；宿主 PATH 命中的机器行为与旧版逐字节一致（PATH 优先）。Windows 上「仅 node 在 PATH」的旧组合退化为宿主拉起失败（fail-open，等同无 Node 机器）。wrapper 成为五处启动的单一依赖点，其自身故障等同插件失联，故测试逐分支覆盖（stub node + 沙箱 env，win32 跳过）。新增环境变量 `AUTORESEARCH_NODE_BIN` 成为面向用户的兜底接口，`--resolve` 供诊断。
