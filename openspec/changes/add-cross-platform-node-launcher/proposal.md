# 提案：跨平台 Node 启动器（launcher.mjs 取代 run-node.sh）

## Why

ADR-9 的 run-node.sh wrapper 把注册命令从裸 `node` 换成了 `sh`，并以两条前提推迟了 Windows：宿主在 Windows 对 hooks 与 MCP 的拉起语义「未经实测」；且基准脚本（bash）在无 POSIX shell 的 Windows「本就不可用」——Windows 支持被定性为「留待真实需求」。2026-11-09 的 KS 训练环 dogfooding（本插件自己的目标场景）两条前提同时被现场证据推翻：

1. **宿主在 Windows 直接以 CreateProcess 拉起 `command`，`sh` 不在宿主 PATH 上**——宿主日志（`~/.zcode/cli/log/zcode-2026-11-09.jsonl`）铁证：`mcp.server.failed`，`mcpServerName: plugin:autoresearch:autoresearch`，`stderr: "'sh' is not recognized as an internal or external command"`；同日四个 hooks 全部 `hook.run.failed`（同因）。8 个 MCP server 连上 7 个，唯一失败的就是本插件。
2. **「Windows 本就不可用」不成立**：真实 Windows 开发机（作者机器）上 Git Bash/WSL 齐备，基准脚本经 `bash`/`wsl.exe` 照跑；缺的只是宿主 spawn `sh` 这一步。结果是一个完整的实验会话全程降级为手动循环：五个 MCP 工具不挂载、四个 hooks（含冻结写保护）静默失效。

同一日志同时给出了已验证的生态公约：同机 7 个连接成功的官方插件（android-emulator、ios-simulator 等）全部 `command: node` + 预编译/纯 JS 入口——**`node` 是宿主在三平台都能解析的唯一命令**。

### 命题核验（评审日 2026-11-10，全部以实态判定）

| 命题                                                                    | 判定 | 证据                                                                                                                                                                                                   |
| ----------------------------------------------------------------------- | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| A. Windows 宿主 spawn `sh` 失败导致 MCP 与 hooks 全体失联               | 坐实 | 宿主日志 2026-11-09：`mcp.server.failed` stderr `'sh' is not recognized`；`hook.run.failed` × N（UserPromptSubmit / PreToolUse，source plugin.autoresearch）                                           |
| B. 失联零用户可见反馈（ADR-9 已知，本段无新证据）                       | 坐实 | agent 会话内五个工具不存在、hooks 无触发迹象；诊断只能靠手动 spawn 复现                                                                                                                                |
| C. `command: node` 在 Windows 宿主可靠解析                              | 坐实 | 同机 7 个官方插件以 `command: node` 连接成功；本机手动握手经 `node launcher.mjs mcp/server.ts` 五工具齐全                                                                                              |
| D. 解析契约可在纯 Node stdlib 内完整保留（零依赖、无构建、TS 直跑不变） | 坐实 | `scripts/launcher.mjs` 移植 run-node.sh 全部语义（覆盖权威、版本门 ≥24、stdout 纯净、退出码透传）+ Win32 搜索链；`node --test tests/launcher.test.ts` 在 Windows 实机 7 pass 0 fail（含 MCP 握手回归） |
| E. 恢复 `command: node` 不违反 ADR-6/9 的成文决策                       | 坐实 | 零第三方依赖、无构建步骤、TS 由 Node 原生剥离执行全部保持；ADR-9 的解析语义逐条移植，仅新增 Win32 搜索链与「nvm 两平台统一最新优先」的修订                                                             |

### 属实 ≠ 值得修的四维评估

触发概率（Windows 开发机 + 本插件分发即触发；作者主战场之一就是 Windows）× 影响面（MCP 工具与 hooks 全体不可用且零反馈，整段实验循环降级手动）× 修复成本（一个 .mjs 入口 + 五处接线改回 `node`）× 不修后果（Windows 用户的装机体验永远是「装完没反应」，且护栏中的写保护静默失效）。值得修；ADR-9 的 Windows 条款从「留待真实需求」转为「真实需求已到场」。

## What Changes

- 新增 `plugin/scripts/launcher.mjs`：纯 Node stdlib 的跨平台启动器（`.mjs` 普通脚本，任何现代 node 可解析，无构建步骤）。解析顺序 `AUTORESEARCH_NODE_BIN` 显式覆盖 → PATH → nvm → 固定安装位；版本门 ≥24 不变；stdout 纯净与退出码透传语义不变（signal n 映射 128+n）
- Win32 搜索链（新增）：PATH 的 `node.exe` → `%NVM_HOME%`（缺省 `%APPDATA%\nvm`）下 `v*/node.exe` **最新优先** → `%ProgramFiles%\nodejs\node.exe` 及 x86 位
- POSIX 搜索链修订：nvm 由「glob 序取首个合格者」改为「最新优先」，与 Win32 统一（确定性选择，glob 序在多版本并存时会命中任意旧版本）
- `plugin/.mcp.json` 与 `plugin/hooks/hooks.json` 五处注册命令 `sh scripts/run-node.sh` 改回 `node scripts/launcher.mjs`（MCP 的 env/cwd/timeoutMs 不变；hooks 的脚本与项目目录参数不变）
- 退役 `plugin/scripts/run-node.sh` 与 `plugin/tests/run-node.test.ts`（契约整体迁入 launcher；`--resolve` 诊断模式保留）
- 测试迁移：`plugin/tests/launcher.test.ts`（子进程范式沿用；**win32 不再整文件跳过**——override/PATH/nvm/握手分支在 Windows 实测，POSIX-only 的 shell-stub 分支保留平台跳过）

## Capabilities

### Modified Capabilities

- `autoresearch/runtime`：Node 解析需求改名 launcher.mjs；注册命令为裸 `node`；新增 Win32 搜索链与 nvm 两平台统一「最新优先」；其余语义（覆盖权威、版本门、stdout 纯净、退出码透传）逐条保持

### New Capabilities

（无）

## Impact

- 代码：`plugin/scripts/launcher.mjs`（新）、`plugin/scripts/run-node.sh`（删）、`plugin/.mcp.json`、`plugin/hooks/hooks.json`
- 测试：`plugin/tests/launcher.test.ts`（新，替代 run-node.test.ts；Windows 实机分支覆盖）
- 文档：`plugin/README.md`、`plugin/README_CN.md` 运行要求段与已知限制段、根 `AGENTS.md` 架构速览「启动解析」条
- ADR：新增一条决策记录（跨平台启动器；raised-by agent，decided-by human——用户在 2026-11-10 会话明示「直接去修复根因」），并以 supersede 接管 ADR-9 的警告
- 不动：MCP server 与 hooks 的行为代码、MCP 工具接口、冻结语义、账本格式、dashboard、ADR-6 的无构建决策
