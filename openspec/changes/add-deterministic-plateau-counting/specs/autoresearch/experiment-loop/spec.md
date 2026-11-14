# Spec Delta

## MODIFIED Requirements

### Requirement: log_experiment 报告平台期与置信度

`log_experiment` 工具 SHALL 在返回中包含 `plateau` 标志，判据按基准性质二分。默认（非确定性基准）沿用幅度语义：当前 segment 最近 `window`（默认 5）轮的有效度量中，相对窗口起点度量的最佳改善比例低于 `min_improvement`（默认 1%，即 0.01）时为 true（窗口不足时不判定）。`init_experiment` 以 `deterministic: true` 开段时，`plateau` SHALL 改用**无进展计数语义**：确定性基准逐位可复现，任何度量变化都是真实信号，幅度阈值失去意义；此时窗口内存在严格优于窗口起点前 segment 全局 best 的度量即为 false，否则为 true（窗口不足不判定；crash 行与幅度语义同口径排除，noop 行同口径计入）。`window` 与 `min_improvement` SHALL 可由 `init_experiment` 的可选参数 `plateau_window`（整数 ≥2）与 `plateau_min_improvement`（有限数 ≥0）指定，并持久化进 `.auto/config.json`（键 `plateauWindow` / `plateauMinImprovement`）；未传参时不覆盖既有配置值，非法值 SHALL 回退默认而非报错。状态重建（server 与 Stop hook）SHALL 消费同一配置，保证判定与提示口径一致。`init_experiment` 另 SHALL 接受可选布尔 `deterministic`（持久化为 config 键 `deterministic`）：基准为确定性（逐位可复现）时，plateau 提示 SHALL 不建议 repeat 复测；提示文案 SHALL 反映配置的窗口与阈值（阈值以百分比呈现），未配置时文案与既有默认逐字一致。`confidence`（MAD 校准）SHALL 作为返回的显著字段置于 delta 之后、next_action_hint 之前，返回值 SHALL 含 `unit: "× noise"`（`value` 为 best−baseline 与 MAD 之比的倍数）。本次计算出的 `confidence` SHALL 同时快照写入账本 run 行（`confidence: {level, value}`，不含 unit），使事后分析无需重算即可回溯记录时刻的置信度；快照值与返回值 SHALL 同源一致（同一次计算）。返回 SHALL 含 `runs_left`（`maxIterations − 当前 segment 已跑数`；上限未显式配置时按默认 20 计）；`runs_left` 为 1 或 2 且上限存在时，next_action_hint SHALL 提示接近迭代上限（上限已到时的既有提示不变）。

#### Scenario: 平台期检测

- **WHEN** 最近 5 轮 metric 为 4.1/4.2/4.0/4.3/4.2（相对首轮 4.1 的最佳改善约 2.4%）
- **THEN** `plateau: false`（改善超阈值）；若为 4.1/4.1/4.05/4.2/4.1（最佳改善 < 1%）则 `plateau: true`

#### Scenario: 校准阈值生效

- **WHEN** `init_experiment` 以 `plateau_min_improvement: 0.0002` 开段，其后 5 轮最佳相对改善为 0.05%（默认 1% 阈值下会误报 plateau）
- **THEN** `plateau: false`（改善高于校准阈值），提示文案含 "0.02%" 而非 "1%"

#### Scenario: deterministic 不建议 repeat 复测

- **WHEN** `init_experiment` 以 `deterministic: true` 开段且 plateau 触发
- **THEN** next_action_hint 不含 "repeat:3" 建议；未设置时建议保留

#### Scenario: deterministic 窗口内有进展不计平台期

- **WHEN** `init_experiment` 以 `deterministic: true` 开段，窗口 5 轮中存在一轮 keep 严格优于窗口起点前的 segment best（如 0.82922/0.828402/0.824887/0.83017/0.826868，窗口前 best 0.82922）
- **THEN** `plateau: false`（幅度语义下同一序列因最佳改善 0.11% < 1% 而误报 true，此为确定性细步长基准的既有缺陷）

#### Scenario: deterministic 连续无进展计平台期

- **WHEN** `init_experiment` 以 `deterministic: true` 开段，窗口 5 轮全部未超过窗口前 best
- **THEN** `plateau: true`（确定性下连续无进展即停滞的实证）

#### Scenario: 未传参不覆盖既有校准

- **WHEN** segment 1 以 `plateau_min_improvement: 0.0002` 开段，segment 2 以不带该参数的 `init_experiment` 重启
- **THEN** config 中 `plateauMinImprovement` 仍为 0.0002

#### Scenario: 返回字段顺序

- **WHEN** agent 以 keep 记录一次实验
- **THEN** 返回中 `confidence` 出现在 `delta` 之后、`next_action_hint` 之前

#### Scenario: confidence 单位标注

- **WHEN** agent 记录一次实验且置信度可计算
- **THEN** 返回 `confidence.unit === "× noise"`，账本行快照仍为 `{level, value}`

#### Scenario: confidence 快照入账本

- **WHEN** agent 记录一次实验（任意 status）
- **THEN** 账本 run 行含 `confidence: {level, value}`，`value` 与返回中 `confidence.value` 相等（同一次计算）

#### Scenario: 接近迭代上限提示

- **WHEN** 上限 5、已跑 4 轮时落账第 4 轮（`runs_left: 1`）
- **THEN** 返回含 `runs_left: 1`，next_action_hint 含接近上限提示；上限已到时既有 cap 提示优先

#### Scenario: 旧行缺字段可回放

- **WHEN** 账本含历史 run 行（无 `confidence` 字段）时执行 rebuildState 与审计校验
- **THEN** 状态重建与校验正常（字段按可缺省处理，不视为违规）
