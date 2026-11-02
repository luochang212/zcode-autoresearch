## MODIFIED Requirements

### Requirement: log_experiment 报告平台期与置信度

`log_experiment` 工具 SHALL 在返回中包含 `plateau` 标志：当前 segment 最近 `window`（默认 5）轮的有效度量中，相对窗口起点度量的最佳改善比例低于 `min_improvement`（默认 1%，即 0.01）时为 true（窗口不足时不判定）。`window` 与 `min_improvement` SHALL 可由 `init_experiment` 的可选参数 `plateau_window`（整数 ≥2）与 `plateau_min_improvement`（有限数 ≥0）指定，并持久化进 `.auto/config.json`（键 `plateauWindow` / `plateauMinImprovement`）；未传参时不覆盖既有配置值，非法值 SHALL 回退默认而非报错。状态重建（server 与 Stop hook）SHALL 消费同一配置，保证判定与提示口径一致。`init_experiment` 另 SHALL 接受可选布尔 `deterministic`（持久化为 config 键 `deterministic`）：基准为确定性（逐位可复现）时，plateau 提示 SHALL 不建议 repeat 复测；提示文案 SHALL 反映配置的窗口与阈值（阈值以百分比呈现），未配置时文案与既有默认逐字一致。`confidence`（MAD 校准）SHALL 作为返回的显著字段置于 delta 之后、next_action_hint 之前，返回值 SHALL 含 `unit: "× noise"`（`value` 为 best−baseline 与 MAD 之比的倍数）。本次计算出的 `confidence` SHALL 同时快照写入账本 run 行（`confidence: {level, value}`，不含 unit），使事后分析无需重算即可回溯记录时刻的置信度；快照值与返回值 SHALL 同源一致（同一次计算）。返回 SHALL 含 `runs_left`（`maxIterations − 当前 segment 已跑数`；上限未显式配置时按默认 20 计）；`runs_left` 为 1 或 2 且上限存在时，next_action_hint SHALL 提示接近迭代上限（上限已到时的既有提示不变）。

#### Scenario: 平台期检测

- **WHEN** 最近 5 轮 metric 为 4.1/4.2/4.0/4.3/4.2（相对首轮 4.1 的最佳改善约 2.4%）
- **THEN** `plateau: false`（改善超阈值）；若为 4.1/4.1/4.05/4.2/4.1（最佳改善 < 1%）则 `plateau: true`

#### Scenario: 校准阈值生效

- **WHEN** `init_experiment` 以 `plateau_min_improvement: 0.0002` 开段，其后 5 轮最佳相对改善为 0.05%（默认 1% 阈值下会误报 plateau）
- **THEN** `plateau: false`（改善高于校准阈值），提示文案含 "0.02%" 而非 "1%"

#### Scenario: deterministic 不建议 repeat 复测

- **WHEN** `init_experiment` 以 `deterministic: true` 开段且 plateau 触发
- **THEN** next_action_hint 不含 "repeat:3" 建议；未设置时建议保留

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

### Requirement: log_experiment 提示重访假设失效的 discard

`log_experiment` 落账的本次 run 为 discard 或 checks_failed，且当前 segment（含本次 run）存在 status 为 discard 或 checks_failed 且 `asi.rollback` 非空的行时，返回 SHALL 包含 `revisit_nudge` 字段：固定提问文案，要求 agent 在选择下一实验前，先判断最新结果或发现是否推翻了某条 discard 的 rollback 理由。若推翻，SHALL 说明改变了什么，并把针对该 discard 的定向重试与其他候选一起权衡（重试时可通过 `asi.revisits_run: <run 号>` 标注来源，且在 description 中记录所依据的变化）；若未推翻，SHALL 跳过继续。触发时机收窄到 discard/checks_failed 落账的决策时刻：本次落账为 keep/noop/crash 时返回 SHALL 省略该字段（重访可见性由记忆注入的「弃用方向与理由」清单常驻承载）。segment 内无任何带理由的 discard/checks_failed 行时，返回 SHALL 省略该字段。该信号为 advisory（提示性），不构成硬校验：`asi.revisits_run` 指向不存在的 run 号时不拒绝写入，账本照实透传。

#### Scenario: 存在带理由的 discard 行时返回重访提示

- **WHEN** 当前 segment 此前无 discard 行，agent 记录一条 discard（`asi.rollback: "CPU 已满载"`）
- **THEN** 该次返回即含 `revisit_nudge`，文案包含「判断最新结果是否推翻某条 discard 的 rollback 理由」语义与 `asi.revisits_run` 用法提示

#### Scenario: keep 落账不再注入

- **WHEN** segment 内存在带理由的 discard 行，agent 记录一次 keep
- **THEN** 返回不含 `revisit_nudge` 字段（决策时刻已过，重访可见性由记忆注入承载）

#### Scenario: 无 discard 行时省略

- **WHEN** 当前 segment 仅有 keep/noop 行，agent 记录一次 discard
- **THEN** 返回不含 `revisit_nudge` 字段

#### Scenario: discard 行无理由时省略

- **WHEN** 当前 segment（含本次行）的 discard/checks_failed 行均无 `asi.rollback`（或无 asi），agent 记录一次 discard
- **THEN** 返回不含 `revisit_nudge` 字段（无可重访的理由，提示即为噪音）

#### Scenario: 新 segment 重置

- **WHEN** 上一 segment 有带理由的 discard 行，`init_experiment` 开新 segment 后记录一次 discard
- **THEN** 仅当本次 segment 内（含本次行）存在带理由行时才触发；旧 segment 的行不跨段携带

#### Scenario: 重试标注透传

- **WHEN** agent 以 `asi: {revisits_run: 7, hypothesis: "缓存后 CPU 空闲，重试并行构建"}` 调用 log_experiment
- **THEN** 账本 run 行的 `asi` 含 `revisits_run: 7`，写入不受审计不变量影响

#### Scenario: 标注指向不存在的 run 不拒绝

- **WHEN** agent 以 `asi: {revisits_run: 999}` 调用 log_experiment（账本无 #999）
- **THEN** 写入正常完成（advisory 透传，不做引用校验）

## ADDED Requirements

### Requirement: discard 回滚显式回报

`log_experiment` 执行工作树回滚（status 为 discard / crash / checks_failed）且处置了至少一个工作树改动时，返回 SHALL 包含 `rolled_back` 字段：`restored_to`（回滚恢复到的 HEAD 短哈希）、`files`（被处置的文件清单，tracked 与 untracked，截断至前 20 条）与 `total_files`（全量计数）。该字段为告知性（回滚成功的事实与范围），不改变回滚语义本体（commit on keep、discard working tree otherwise）。回滚后仍有残留脏文件时，既有 `rollback_residual` 字段与其在 next_action_hint 中的最高优先级不变；`rolled_back` 与 `rollback_residual` SHALL 可并存（处置过的文件与处置后仍脏的文件是两个集合）。noop（无改动）与 keep（提交而非回滚）SHALL 不含 `rolled_back`。

#### Scenario: discard 回滚回报文件与恢复点

- **WHEN** agent 修改 tracked 文件并新增 untracked 文件后以 discard 落账
- **THEN** 返回 `rolled_back.restored_to` 为 HEAD 短哈希，`files` 含两个路径，`total_files: 2`，工作树恢复干净

#### Scenario: 文件清单截断

- **WHEN** 一次回滚处置了 25 个文件
- **THEN** `rolled_back.files` 恰为前 20 条，`total_files: 25`

#### Scenario: keep 与 noop 不回报

- **WHEN** agent 分别以 keep 与 noop 落账
- **THEN** 两次返回均不含 `rolled_back` 字段

#### Scenario: 残留与回报并存

- **WHEN** 回滚后仍有无法恢复的脏文件（residual 非空）
- **THEN** 返回同时含 `rolled_back`（已处置清单）与 `rollback_residual`（残留清单），next_action_hint 仍以残留警示为最高优先
