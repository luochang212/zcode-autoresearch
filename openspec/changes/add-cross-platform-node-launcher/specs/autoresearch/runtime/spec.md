# autoresearch/runtime Specification

## Purpose

定义 autoresearch 插件 Node 运行时的定位契约：宿主以自身 PATH 拉起 MCP server 与 hooks（Windows 上 `sh` 等非 node 命令不可用），插件 SHALL 以裸 `node` 启动一个跨平台启动器自行解析合规 Node，保证「机器上存在 Node ≥24」即可用。

## REMOVED Requirements

### Requirement: Node 解析（run-node.sh）

- **Reason**: 注册命令回到裸 `node`，入口改为跨平台 launcher.mjs——sh wrapper 在 Windows 宿主无法启动（2026-11-09 现场证据：宿主 spawn `sh` 失败，MCP 与 hooks 全体失联）；解析契约整体由新需求接管。

## ADDED Requirements

### Requirement: Node 解析（launcher.mjs）

MCP server 与全部 hooks SHALL 经 `node scripts/launcher.mjs <target> [args…]` 启动（注册命令为裸 `node`，入口为纯 stdlib 的 `scripts/launcher.mjs`，无构建步骤）。解析器 SHALL 按以下顺序定位 Node ≥24：`AUTORESEARCH_NODE_BIN` 显式覆盖、PATH（win32 为 `node.exe`）、nvm（POSIX `$NVM_DIR` 缺省 `~/.nvm` 下 `versions/node/*/bin/node`；win32 `%NVM_HOME%` 缺省 `%APPDATA%\nvm` 下 `v*/node.exe`；两平台均按版本号降序取首个合格者）、固定安装位（POSIX `/opt/homebrew/bin/node`、`/usr/local/bin/node`；win32 `%ProgramFiles%\nodejs\node.exe` 与 `%ProgramFiles(x86)%\nodejs\node.exe`）。版本探测 SHALL 以 `node -p process.versions.node` 的主版本号对照下限 24，探测失败视为不通过。显式覆盖 SHALL 权威：不可执行或版本不足时直接报错退出（127），不回退其它候选。诊断 SHALL 只写 stderr；MCP 模式下正常路径 stdout SHALL 保持纯净（JSON-RPC 通道）。解析成功后 SHALL 以解析到的 Node 执行目标并原样透传参数；目标正常退出码 SHALL 原样透传，signal 终止 SHALL 以 128+n 退出。

#### Scenario: 显式覆盖权威

- **WHEN** `AUTORESEARCH_NODE_BIN` 指向一个 Node ≥24 的可执行文件
- **THEN** 解析器直接使用它，不再探测其它候选

#### Scenario: 显式覆盖不可让步

- **WHEN** `AUTORESEARCH_NODE_BIN` 指向的文件缺失、不可执行或主版本低于 24
- **THEN** 解析器报错退出（127），不回退到其它候选

#### Scenario: PATH 缺失回落 nvm

- **WHEN** 宿主 PATH 上无合规 node，nvm 安装位下存在 Node ≥24
- **THEN** 解析器使用该 nvm Node（POSIX `$NVM_DIR` / win32 `%NVM_HOME%` 均可）

#### Scenario: 版本门

- **WHEN** 候选 Node 主版本低于 24
- **THEN** 该候选被跳过，搜索继续；全部候选不足或不存在时以 127 退出，stderr 说明下限与两条修法

#### Scenario: Windows 宿主裸 node 启动

- **WHEN** Windows 宿主以 CreateProcess 拉起 `command: node`（`sh` 不在宿主 PATH）
- **THEN** 启动器在该 node 上完成解析并执行目标，MCP 五工具与四 hooks 全部可用

#### Scenario: 参数透传

- **WHEN** 解析成功
- **THEN** 后续参数原样交给该 Node 执行；目标正常退出码原样透传，signal 终止以 128+n 退出

#### Scenario: stdout 纯净

- **WHEN** MCP server 经启动器启动并应答 JSON-RPC
- **THEN** 启动器自身在正常路径不向 stdout 写入任何字节，诊断只出现在 stderr
