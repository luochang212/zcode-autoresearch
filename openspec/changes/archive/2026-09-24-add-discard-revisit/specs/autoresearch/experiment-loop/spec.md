## ADDED Requirements

### Requirement: log_experiment 提示重访假设失效的 discard

当前 segment 的账本中存在 status 为 discard 或 checks_failed 且 `asi.rollback` 非空的行时，`log_experiment` 工具 SHALL 在返回中包含 `revisit_nudge` 字段：固定提问文案，要求 agent 在选择下一实验前，先判断最新结果或发现是否推翻了某条 discard 的 rollback 理由——若推翻，SHALL 说明改变了什么，并把针对该 discard 的定向重试与其他候选一起权衡（重试时可通过 `asi.revisits_run: <run 号>` 标注来源，且在 description 中记录所依据的变化）；若未推翻，SHALL 跳过继续。无 discard/checks_failed 行、或此类行均无 `asi.rollback` 理由时，返回 SHALL 省略该字段。该信号为 advisory（提示性），不构成硬校验：`asi.revisits_run` 指向不存在的 run 号时不拒绝写入，账本照实透传。

#### Scenario: 存在带理由的 discard 行时返回重访提示

- **WHEN** 当前 segment 含一条 discard 行（`asi.rollback: "CPU 已满载"`），agent 记录一次 keep
- **THEN** 返回含 `revisit_nudge` 字段，文案包含「判断最新结果是否推翻某条 discard 的 rollback 理由」语义与 `asi.revisits_run` 用法提示

#### Scenario: 无 discard 行时省略

- **WHEN** 当前 segment 仅有 keep/noop 行，agent 记录一次实验
- **THEN** 返回不含 `revisit_nudge` 字段

#### Scenario: discard 行无理由时省略

- **WHEN** 当前 segment 的 discard 行均无 `asi.rollback`（或无 asi），agent 记录一次实验
- **THEN** 返回不含 `revisit_nudge` 字段（无可重访的理由，提示即为噪音）

#### Scenario: 重试标注透传

- **WHEN** agent 以 `asi: {revisits_run: 7, hypothesis: "缓存后 CPU 空闲，重试并行构建"}` 调用 log_experiment
- **THEN** 账本 run 行的 `asi` 含 `revisits_run: 7`，写入不受审计不变量影响

#### Scenario: 标注指向不存在的 run 不拒绝

- **WHEN** agent 以 `asi: {revisits_run: 999}` 调用 log_experiment（账本无 #999）
- **THEN** 写入正常完成（advisory 透传，不做引用校验）

## MODIFIED Requirements

### Requirement: log_experiment 报告平台期与置信度

`log_experiment` 工具 SHALL 在返回中包含 `plateau` 标志：当前 segment 最近 `window`（默认 5）轮的有效度量中，相对窗口起点度量的最佳改善比例低于 `min_improvement`（默认 1%）时为 true（窗口不足时不判定）。`confidence`（MAD 校准）SHALL 作为返回的显著字段置于 delta 之后、next_action_hint 之前。本次计算出的 `confidence` SHALL 同时快照写入账本 run 行（`confidence: {level, value}`），使事后分析无需重算即可回溯记录时刻的置信度；快照值与返回值 SHALL 同源一致（同一次计算）。

#### Scenario: 平台期检测

- **WHEN** 最近 5 轮 metric 为 4.1/4.2/4.0/4.3/4.2（相对首轮 4.1 的最佳改善约 2.4%）
- **THEN** `plateau: false`（改善超阈值）；若为 4.1/4.1/4.05/4.2/4.1（最佳改善 < 1%）则 `plateau: true`

#### Scenario: 返回字段顺序

- **WHEN** agent 以 keep 记录一次实验
- **THEN** 返回中 `confidence` 出现在 `delta` 之后、`next_action_hint` 之前

#### Scenario: confidence 快照入账本

- **WHEN** agent 记录一次实验（任意 status）
- **THEN** 账本 run 行含 `confidence: {level, value}`，`value` 与返回中 `confidence.value` 相等（同一次计算）

#### Scenario: 旧行缺字段可回放

- **WHEN** 账本含历史 run 行（无 `confidence` 字段）时执行 rebuildState 与审计校验
- **THEN** 状态重建与校验正常（字段按可缺省处理，不视为违规）
