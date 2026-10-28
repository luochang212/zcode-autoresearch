# Proposal

## Why

工作区已有三处未走 change 流程的行为改动（违反铁律 4）：钩子 session 新增 `started_at_epoch`、Windows spawn bash 时前置 coreutils PATH、MCP `timeoutMs` 60s→600s。本 change 补录决策依据与规范 delta，使主规范与已实现行为一致，并按 worth-fix 要求留下 spawnEnv 可达性的验证边界与开放问题。

## What Changes

- `run_experiment` / `log_experiment` 的钩子 stdin `session` 对象新增 `started_at_epoch`（segment 起始的 epoch 秒；账本无 config 行时为 null）。墙钟预算类钩子（如超时熔断）从 stdin 取值，不必解析 `.auto/log.jsonl`。纯增量字段，既有钩子不受影响。
- Windows 下 `run_experiment` 与钩子 spawn bash 时，若解析到的 bash 位于 `usr\bin`，将其目录前置到子进程 PATH（`spawnEnv`），意图恢复 GUI 启动 server 时缺失的 Git coreutils；非 win32 或 bash 不在 `usr\bin` 时原样返回继承环境，行为不变。
- 插件 `.mcp.json` 的 MCP 请求 `timeoutMs` 从 60000 提到 600000，与基准默认超时（600s，`AR_BENCHMARK_TIMEOUT_MS`）对齐，避免长基准把宿主侧 MCP 请求先掐断。
- 规程文档同步：`skills/autoresearch-hooks/SKILL.md` 与 `skills/autoresearch/references/loop-protocol.md` 的 session 字段列表更新。

## Capabilities

### New Capabilities

（无）

### Modified Capabilities

- `autoresearch/experiment-loop`：`run_experiment` 与 `log_experiment` 两个 Requirement 的钩子 stdin 契约——`session` 内容被显式枚举并新增 `started_at_epoch`。

## Impact

- 代码（均已在工作区，本 change 为补录）：`plugin/mcp/server.ts`（`hookSessionPayload`、两处 spawn 接入 `spawnEnv`）、`plugin/mcp/lib/bash.ts`（`unixToolsPathEntry`/`spawnEnv`）、`plugin/.mcp.json`、`plugin/tests/bash.test.ts`、`plugin/skills/autoresearch-hooks/SKILL.md`、`plugin/skills/autoresearch/references/loop-protocol.md`。
- 兼容性：`session` 为增量字段；`spawnEnv` 在非 win32 或 bash 非 `usr\bin` 布局时为透传，POSIX 行为不变。
- 验证边界：可达性审计（design.md 附录）确认 `spawnEnv` 在纯 PATH 语义下无生效场景，按防御性机制保留收口，bash.ts 注释已如实改写。
