# 设计：运行时解析 wrapper

## D1 入口形态：`sh run-node.sh <args...>`，不依赖可执行位

`command` 字段写 `sh`，脚本路径进 args（anet 在同一宿主已验证 sh 入口被接受）。不采用「直接以脚本路径作 command」：市场 zip 与缓存拷贝不保证保留可执行位，`sh` 入口对此免疫，同时与 hooks.json 现有的「command 加 args 数组」结构一致。

## D2 搜索顺序与语义

1. `AUTORESEARCH_NODE_BIN` 显式覆盖：权威。指向的文件不可执行或版本不足时硬报错退出（127），不回退其它候选。沿用 anet 的 anetPath 语义：配置的路径按原样使用，绝不被替换。
2. `command -v node`（PATH）：保持向后兼容，宿主 PATH 上本就有合规 Node 的机器行为与从前逐字节一致。
3. nvm：`$NVM_DIR`（缺省 `~/.nvm`）下 `versions/node/*/bin/node`，按 glob 顺序取第一个通过版本门的。不做「最新版」优选：门禁已保证 ≥24，两个合格版本之间选哪个不影响可用性，为外观排序引入 awk 算术与排序代码不值得。
4. `/opt/homebrew/bin/node`、`/usr/local/bin/node`。

全部落空：stderr 输出多行诊断（找过的位置与两条修法：装 Node ≥24，或设 `AUTORESEARCH_NODE_BIN`），exit 127。

## D3 版本门保持 ADR 6 的 ≥24

见 What Changes 第三条。门禁实现按主版本号整数比较（`node -p process.versions.node` 的 MAJOR.MINOR.PATCH），解析失败按 0 处理（不通过）。

## D4 stdout 纯净性

MCP 模式下 stdout 是 JSON-RPC 通道。版本探测一律在命令替换内完成；正常路径 wrapper 自身不向 stdout 写任何字节；诊断只写 stderr；解析成功后 `exec` 替换 shell 进程，退出码与信号语义原样沿用。

## D5 Windows 取舍

wrapper 依赖 POSIX sh。Windows 上「node 在 PATH」的旧可用组合退化为宿主拉起失败（fail-open，等同无 Node 的机器）。备选 polyglot .cmd（superpowers 先例）本次否决：宿主在 Windows 对 hooks 与 MCP 的拉起语义未经实测，且本插件核心基准（measure.sh/checks.sh，bash 脚本）在无 POSIX shell 的 Windows 本就不可用，为名义支持引入未验证复杂度不划算。真实需求出现时作为独立 change 再评估。

## D6 测试策略

stub node（对 `-p process.versions.node` 回报受控版本，其余参数原样回显）加沙箱 PATH/NVM_DIR/AUTORESEARCH_NODE_BIN，覆盖每条搜索分支、覆盖权威语义与版本门；真实 node 做 `--resolve` 与参数透传的集成冒烟。win32 跳过（sh 不存在）。「全部落空」分支在宿主存在 `/opt/homebrew/bin/node` 或 `/usr/local/bin/node` 的机器上无法穷尽搜索空间，该用例按宿主条件跳过并在注释说明。
