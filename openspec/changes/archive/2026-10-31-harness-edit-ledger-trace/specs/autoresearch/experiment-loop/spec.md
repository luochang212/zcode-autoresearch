## ADDED Requirements

### Requirement: harness 留痕（强制记账）

harness 可编辑面（`.auto/prompt.md`、`.auto/ideas.md`、`.auto/experience.md`、`.auto/hooks/before.sh`、`.auto/hooks/after.sh`）的任何磁盘变更 SHALL 在账本留痕，不经 agent 自觉：`init_experiment` SHALL 记录可编辑面哈希基线（session config `harnessHashes`）；`run_experiment`、`log_experiment`、`export_dashboard` SHALL 在执行前对账，哈希相对基线变化的文件各追加一行 `{type:"harness_edit", ts, segment, file, digest_before, digest_after}` 并刷新基线。无基线的旧会话 SHALL 静默补基线、不追溯行。`.auto/config.json` 不在留痕集合内。留痕行 SHALL 只记机械事实（谁动了什么、何时），不承载归因——verdict 仍由编辑行与 experience.md 的 advisory 规程负责。

#### Scenario: 编辑后 log_experiment 留痕

- **WHEN** `init_experiment` 之后 agent 编辑 `prompt.md`，随后调用 `log_experiment`
- **THEN** 账本出现该文件的 `harness_edit` 行，`digest_before` 为 init 基线、`digest_after` 为当前哈希

#### Scenario: 无编辑不产行

- **WHEN** 一个完整 run/log 周期内可编辑面无任何变化
- **THEN** `run_experiment` 与 `log_experiment` 均不追加 `harness_edit` 行

#### Scenario: 尾部编辑由 export 收口

- **WHEN** 最后一次 `log_experiment` 之后发生编辑，随后调用 `export_dashboard`
- **THEN** 账本出现对应的 `harness_edit` 行（最终台账完整）

#### Scenario: 旧会话静默补基线

- **WHEN** `config.json` 无 `harnessHashes` 的旧会话首次对账
- **THEN** 不追溯任何 `harness_edit` 行，当前哈希成为新基线

#### Scenario: 留痕不污染循环状态

- **WHEN** 账本中含 `harness_edit` 行
- **THEN** `rebuildState` 的 runs/confidence/连续失败链与 `validateLedger` 审计结果均与不含这些行时一致
