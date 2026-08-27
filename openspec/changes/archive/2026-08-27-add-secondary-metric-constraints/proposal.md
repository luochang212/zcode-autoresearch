## Why

`docs/research/next-steps.md` P1 剩余项（Westland 借鉴）：防"优化主度量但牺牲其它维度"的 reward hacking（实测案例：embedder_calls 7→0）。`run_experiment` 已解析全部 `METRIC` 行为次级度量——只需在 `log_experiment` 加 `constraints` 声明与 keep 时校验，把"别用内存换速度"从口头要求变成硬门槛。默认不启用（无 constraints 即零校验，opt-in）。

## What Changes

- **`log_experiment` 支持 `constraints` 参数**：`[{ name, maxPct }]`（如 `[{ name: "memory_mb", maxPct: 105 }]`）——keep 时校验对应次级度量不超过"首条 run 该度量值"的 maxPct%；违规拒收 keep（提示放宽约束或改判）；无 constraints 时行为不变。
- 返回含 `constraints` 状态（各约束 pass/fail）。
- SKILL/setup-guide/README 更新（setup 时定义约束的指引）。

## Capabilities

### New Capabilities

（无。）

### Modified Capabilities

- `autoresearch/experiment-loop`: log_experiment 支持次级度量约束（Requirement 修改）。

## Impact

- `plugin/mcp/server.mjs`：constraints 解析与校验。
- `plugin/skills/*`、`plugin/README.md`：文档。
- `plugin/tests/`：约束内 keep 通过、超界拒收、无约束无感。
- 兼容性：无 constraints 时行为与现状一致（opt-in）。
