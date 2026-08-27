## Why

`docs/research/next-steps.md` + ADR-4 的 P0 两件：① memory-inject 增强（确定性 compaction 的低成本变相——补长会话信息连续性）；② doom-loop 检测（ml-intern 借鉴——防 agent 在重复/震荡模式里死循环空转）。均为低成本、零平台依赖、直接提升长跑健壮性。

## What Changes

- **doom-loop 检测**：新增 `detectDoomLoop` 纯函数（对 run 的 description/假设做规范化哈希，检测 3+ 连续重复与 A→B→A→B 震荡）；`log_experiment` 返回 `doom_loop` 标志并在 `next_action_hint` 提示换方向；memory-inject/stop-continue 报告重复-震荡模式。
- **memory-inject 聚合摘要**（compaction 变相）：从"最近 3 条"升级为聚合摘要——已尝试方向去重（从 description/asi.hypothesis 提炼）、best 轨迹（baseline → best）、最近 N 条 + ASI 提炼、doom-loop 提示。
- SKILL/README 更新记忆格式说明。

## Capabilities

### New Capabilities

（无。）

### Modified Capabilities

- `autoresearch/guardrails`: 实验记忆注入升级为聚合摘要并含 doom-loop 提示（Requirement 修改）。
- `autoresearch/experiment-loop`: log_experiment 返回 doom_loop 标志（Requirement 修改）。

## Impact

- `plugin/mcp/lib/experiment.mjs`：`detectDoomLoop` + 方向标签提炼纯函数。
- `plugin/hooks/memory-inject.mjs`：聚合摘要 + doom-loop 提示。
- `plugin/hooks/stop-continue.mjs`：reason 含 doom-loop 提示。
- `plugin/mcp/server.mjs`：log_experiment 返回 doom_loop + hint。
- `plugin/skills/*`、`plugin/README.md`：文档。
- `plugin/tests/`：doom-loop 与聚合摘要测试。
- 兼容性：additive（注入文本格式变化，无行为破坏）。
