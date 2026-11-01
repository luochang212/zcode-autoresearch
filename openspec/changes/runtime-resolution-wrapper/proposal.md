# 提案：运行时解析 wrapper（run-node.sh 定位 Node）

## Why

ZCode 宿主以自身 PATH 拉起 MCP server 与 hooks，该 PATH 通常不含用户自管 Node（nvm、Homebrew）的安装位。结果是：机器上有合规 Node 也会因为「够不着」而静默失效，MCP 五个工具全部不挂载、四个 hooks 全部不执行（fail-open，无任何用户可见报错）。本仓库作者机器实测命中：nvm 里存在 v24.21.0，宿主 spawn PATH（`/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin` 加宿主自带工具目录）上无 node，插件安装后零反馈。市场正式分发后，每个此类机器的用户第一印象就是「装完没反应」。

### 命题核验（评审日 2026-11-01，全部以实态判定）

| 命题                                                | 判定 | 证据                                                                                                                                                                                                                                                                                                                                       |
| --------------------------------------------------- | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| A. 宿主 spawn PATH 不含 nvm 与用户级 Node 安装位    | 坐实 | 实测宿主拉起进程的 PATH 为 `/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin` 加宿主自带工具目录；nvm 安装位不在其中，`node` 解析失败（command not found）                                                                                                                                                                   |
| B. MCP 与 hooks 失联无用户可见反馈                  | 坐实 | `.mcp.json` 的 `command: node` 拉起失败即该组工具不注册；hooks 全部 fail-open（hooks.json description 自述 all fail-open）                                                                                                                                                                                                                 |
| C. 这是生态级通病，且生态已有解法先例               | 坐实 | 官方市场自带本地 MCP server 的插件（mimosa、excalidraw、wordcraft、kicad、jupyter-notebook、typst-workbench、zotero、android/ios-simulator）全部裸 `node`，同病；anet 是唯一在启动脚本里做解析的，anet-run.sh 注释原文即「a desktop application does not always inherit the PATH of a login shell」，superpowers 的 hooks 走跨平台 wrapper |
| D. 失败根因是「解析」而非「存在」，解析器可完全覆盖 | 坐实 | 作者机器上 Node ≥24 存在于 nvm；PATH、nvm、Homebrew 三处覆盖主流安装方式，另设显式覆盖变量兜底                                                                                                                                                                                                                                             |
| E. wrapper 不违反零依赖与无构建铁律                 | 坐实 | run-node.sh 为 POSIX sh，无第三方依赖；`.ts` 源码由 Node 原生剥离类型直接执行不变，ADR 6 的成文决策全部保持成立                                                                                                                                                                                                                            |

### 属实 ≠ 值得修的四维评估

触发概率（凡 Node 不在宿主 PATH 的机器，安装即触发，nvm 是 macOS 开发机主流安装方式）× 影响面（MCP 工具与 hooks 全体不可用且零反馈）× 修复成本（一个 sh 入口加五处接线）× 不修后果（问题进入市场分发，作者之外的用户无法自行诊断）。值得修，且属启动层补丁，不动任何行为代码。

## What Changes

- 新增 `plugin/scripts/run-node.sh`：POSIX sh 解析器。按 `AUTORESEARCH_NODE_BIN` 显式覆盖 → PATH → nvm（`$NVM_DIR` 缺省 `~/.nvm`）→ `/opt/homebrew/bin/node` → `/usr/local/bin/node` 顺序定位首个 Node ≥24，以 exec 原样透传参数；`--resolve` 输出解析结果供诊断与测试；全部落空时 stderr 输出多行诊断并以 127 退出
- `plugin/.mcp.json` 与 `plugin/hooks/hooks.json` 的五处 `command: node` 全部改为 `command: sh` 加 wrapper 入口（MCP 的 env/cwd/timeoutMs 不变）
- Node ≥24 版本下限不变（ADR 6 的成文决策）：wrapper 只解决「找到」，不放宽「门槛」；type stripping 默认开启虽自 22.18 与 23.6 起实际可用，放宽属新决策，不夹带
- Windows 说明：wrapper 依赖 POSIX sh，Windows 上「node 在 PATH 即可用」的旧组合不再成立，宿主拉起失败即 fail-open 降级（与无 Node 机器同态）；polyglot .cmd 方案（superpowers 先例）留待真实需求出现再评估

## Capabilities

### New Capabilities

- `autoresearch/runtime`：Node 运行时解析契约（搜索顺序、覆盖语义、版本门、stdout 纯净性、参数透传）

### Modified Capabilities

（无）

## Impact

- 代码：`plugin/scripts/run-node.sh`（新）、`plugin/.mcp.json`、`plugin/hooks/hooks.json`
- 测试：`plugin/tests/run-node.test.ts`（新：stub node 隔离测试覆盖每条搜索分支与版本门，加真实 node 集成冒烟）；hooks.json 引用存在性检查自动覆盖新文件
- 文档：`plugin/README.md` 与 `plugin/README_CN.md` 的运行要求段、根 `AGENTS.md` 架构速览补一条
- ADR：新增一条决策记录（解析器策略与 Windows 取舍）；ADR 6 的「Node ≥24、无构建、零依赖」全部保持成立，无需改动
- 不动：MCP server 与 hooks 的行为代码、MCP 工具接口、冻结语义、账本格式、dashboard
