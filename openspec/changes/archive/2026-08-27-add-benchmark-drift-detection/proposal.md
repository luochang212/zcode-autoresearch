## Why

`docs/research/next-steps.md` P1 项（Westland 借鉴 + 防护链缺口分析）：当前防"改基准造假 metric"的漏洞——guard-frozen 只覆盖交互式、checks 的 vendor 哈希不防 measure.sh、**审计不变量也认账本自洽的假改进**。漂移检测用低成本（hash 比对 + 警告级）堵住唯一缺口：基准中途变更 → 前后 metric 不可比 → 显式警告。

## What Changes

- **基准 hash 记录**：`init_experiment` 时记录 `measure.sh`/`checks.sh` 的 sha256 到账本 config 行（additive，旧账本无 hash 时"首见即基准"）。
- **漂移检测**：`run_experiment` 开始前比对当前 hash 与记录值——不一致时返回 `benchmark_drift: true` 警告（不硬拒）："基准自会话开始后已变更，前后 metric 不可比，建议 init_experiment 开新 segment 或确认变更"。
- SKILL/README 更新（警告语义：收到 drift 警告必须开新 segment 或确认）。

## Capabilities

### New Capabilities

（无。）

### Modified Capabilities

- `autoresearch/experiment-loop`: init_experiment 记录冻结文件 hash、run_experiment 漂移警告（Requirement 修改）。

## Impact

- `plugin/mcp/server.mjs`：hash 记录与比对。
- `plugin/mcp/lib/ledger.mjs`：config 行 hash 字段（additive）。
- `plugin/skills/*`、`plugin/README.md`：文档。
- `plugin/tests/`：首见记录、漂移警告、无变化静默。
- 兼容性：additive；旧账本首见即记录。
