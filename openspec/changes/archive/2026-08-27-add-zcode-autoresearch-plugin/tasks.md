## 1. 插件骨架

- [x] 1.1 创建 plugin/ 目录结构与 .zcode-plugin/plugin.json（name: autoresearch，commands/skills/hooks/mcpServers 字段），验证 manifest 字段符合 zcode-plugins 文档
- [x] 1.2 创建根级 marketplace.json 指向 ./plugin，编写 plugin/README.md（安装、用法、架构说明）

## 2. MCP server 核心逻辑

- [x] 2.1 实现 plugin/mcp/lib/ledger.mjs：.auto/log.jsonl 的 append/read、segment 推进、config 记录；实现 lib/experiment.mjs：METRIC 解析、direction 判定、confidence(MAD)、ASI 提取，均导出纯函数
- [x] 2.2 实现 plugin/mcp/lib/git.mjs：keep 提交（experiment: 前缀 + Result JSON）、discard 回滚（checkout+clean 豁免 .auto/）、短 hash 回填
- [x] 2.3 实现 plugin/mcp/server.mjs：JSON-RPC 换行协议、initialize/tools/list、init_experiment/run_experiment/log_experiment 三工具分发、会话内长驻状态
- [x] 2.4 实现 run_experiment：bash -c 执行、wall-clock 计时、超时 killTree、输出滚动缓冲 + 10 行/4KB 截断 + 全量日志路径、measure.sh 锁定解析
- [x] 2.5 实现 checks 背压：.auto/checks.sh 存在时 benchmark 后自动执行，失败禁 keep；实现 maxIterations 上限检查
- [x] 2.6 实现 export_dashboard 工具：读账本渲染自包含静态 HTML（配置/实验表/状态着色/方向标注）

## 3. hooks

- [x] 3.1 编写 plugin/hooks/hooks.json（Stop/PreToolUse/UserPromptSubmit/SessionStart 四事件，type: process）
- [x] 3.2 实现 stop-continue.mjs：读账本判停止条件，未结束返回 decision:block + 进度 reason
- [x] 3.3 实现 guard-frozen.mjs：PreToolUse 拦截 Write/Edit 到 .auto/measure.sh、.auto/checks.sh（deny）
- [x] 3.4 实现 memory-inject.mjs（UserPromptSubmit）与 session-start.mjs：注入账本尾 3 行摘要

## 4. skill 与 commands

- [x] 4.1 编写 plugin/skills/autoresearch/SKILL.md：薄路由（安全不变量 + 三工具用法 + 循环规程 + 状态文件指针）
- [x] 4.2 编写 plugin/skills/autoresearch/references/loop-protocol.md 与 setup-guide.md
- [x] 4.3 编写 plugin/commands/autoresearch.md（/autoresearch:autoresearch 入口：读 .auto/prompt.md 续跑或走 setup）与 plugin/commands/export.md（调 export_dashboard）

## 5. 测试与集成验证

- [x] 5.1 编写 plugin/tests/：ledger（segment/append）、experiment（METRIC 解析/方向/confidence）、git（commit/rollback/豁免）单元测试，node --test 通过
- [x] 5.2 无头 CLI 集成验证：fake HOME 沙盒 + 真实会话驱动 init→run→log 全链路，账本与 git 状态一致（DeepSeek 通道）
- [x] 5.3 openspec validate --strict 通过，全部任务勾选，adrkit validate 通过
