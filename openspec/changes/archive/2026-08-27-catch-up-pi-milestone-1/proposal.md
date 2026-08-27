## Why

差距分析（`docs/research/pi-gap-analysis.md` + ADR-3）确定追平优先级：里程碑 1（迭代钩子、clear 命令、ASI 三字段提炼、停摆护栏参数）为高价值低成本 quick wins，且全部零平台依赖（纯 MCP server / hook / command 逻辑）。本 change 实现里程碑 1，追平 pi-autoresearch 的核心扩展点（迭代钩子）与运维便利项。

## What Changes

- **迭代钩子**（追平 pi #23/#26）：`run_experiment` 前执行 `.auto/hooks/before.sh`、`log_experiment` 后执行 `.auto/hooks/after.sh`（存在且可执行时）；stdin 单行 JSON 契约、30s 超时、stdout ≤8KB 截断并作为 `steer` 字段返回给 agent；新增 SKILL 指引教 agent 写钩子。
- **clear 命令**（追平 pi #28）：新增 `clear_experiments` 工具（删 `.auto/log.jsonl` + 重置运行时状态）与 `/autoresearch:clear` 命令。
- **ASI 三字段提炼**（追平 pi #15 补全）：memory-inject 与 stop-continue hook 从账本提取 `asi.hypothesis / next_action_hint / rollback` 注入/展示。
- **停摆护栏参数**（追平 pi #8 对齐）：连续失败阈值从 `.auto/config.json` 的 `consecutiveFailures`（默认 3）读取，server 与 Stop hook 共用；`isStopReached` 参数化。
- 更新 SKILL.md、`references/loop-protocol.md`、README（钩子用法、clear、参数）。

## Capabilities

### New Capabilities

（无。）

### Modified Capabilities

- `autoresearch/experiment-loop`: `run_experiment` 增加 before 钩子执行（Requirement 修改）；`log_experiment` 增加 after 钩子执行（Requirement 修改）；新增 `clear_experiments` 工具（Requirement 新增）；连续失败阈值可配（Requirement 修改）。
- `autoresearch/guardrails`: 记忆注入 hook 提炼 ASI 三字段（Requirement 修改）；Stop hook 使用可配置连续失败阈值（Requirement 修改）。

## Impact

- `plugin/mcp/server.mjs`：before/after 钩子执行、`clear_experiments` 工具、护栏参数读取。
- `plugin/mcp/lib/ledger.mjs`：会话配置读取扩展（consecutiveFailures）。
- `plugin/hooks/memory-inject.mjs`、`stop-continue.mjs`：ASI 三字段提炼 + 参数读取。
- `plugin/commands/clear.md`：新命令。
- `plugin/skills/autoresearch/SKILL.md`、`references/loop-protocol.md`、`plugin/README.md`：文档更新。
- `plugin/tests/`：钩子执行/steer/超时、clear、ASI 提炼、护栏参数测试。
- 兼容性：新增能力为 additive；既有调用不破坏。
