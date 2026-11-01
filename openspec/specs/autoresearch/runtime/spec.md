# autoresearch/runtime Specification

## Purpose

定义 autoresearch 插件 Node 运行时的定位契约：宿主以自身 PATH 拉起 MCP server 与 hooks，插件 SHALL 在该 PATH 不含合规 Node 时自行解析，保证「机器上存在 Node ≥24」即可用。

## Requirements

### Requirement: Node 解析（run-node.sh）

MCP server 与全部 hooks SHALL 经 `scripts/run-node.sh` 启动。解析器 SHALL 按以下顺序定位 Node ≥24：`AUTORESEARCH_NODE_BIN` 显式覆盖、PATH、nvm（`$NVM_DIR` 缺省 `~/.nvm`）、`/opt/homebrew/bin/node`、`/usr/local/bin/node`。版本探测 SHALL 以 `node -p process.versions.node` 的主版本号对照下限 24，探测失败视为不通过。显式覆盖 SHALL 权威：不可执行或版本不足时直接报错退出（127），不回退其它候选。诊断 SHALL 只写 stderr；MCP 模式下正常路径 stdout SHALL 保持纯净（JSON-RPC 通道）。解析成功后 SHALL 以 exec 替换进程并原样透传参数与退出码。

#### Scenario: 显式覆盖权威

- **WHEN** `AUTORESEARCH_NODE_BIN` 指向一个 Node ≥24 的可执行文件
- **THEN** 解析器直接使用它，不再探测其它候选

#### Scenario: 显式覆盖不可让步

- **WHEN** `AUTORESEARCH_NODE_BIN` 指向的文件缺失、不可执行或主版本低于 24
- **THEN** 解析器报错退出（127），不回退到其它候选

#### Scenario: PATH 缺失回落 nvm

- **WHEN** 宿主 PATH 上无合规 node，`$NVM_DIR`（或缺省 `~/.nvm`）下存在 Node ≥24
- **THEN** 解析器使用该 nvm Node

#### Scenario: 版本门

- **WHEN** 候选 Node 主版本低于 24
- **THEN** 该候选被跳过，搜索继续；全部候选不足或不存在时以 127 退出，stderr 说明下限与两条修法

#### Scenario: 参数透传

- **WHEN** 解析成功
- **THEN** 后续参数原样交给该 Node 执行（exec 替换进程，退出码沿用）

#### Scenario: stdout 纯净

- **WHEN** MCP server 经 wrapper 启动并应答 JSON-RPC
- **THEN** wrapper 自身在正常路径不向 stdout 写入任何字节，诊断只出现在 stderr
