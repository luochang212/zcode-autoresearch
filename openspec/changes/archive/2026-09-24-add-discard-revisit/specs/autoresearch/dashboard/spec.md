## ADDED Requirements

### Requirement: 重试标注渲染

dashboard（静态导出与 live 模式共用渲染层）SHALL 在 run 行携带 `asi.revisits_run`（正整数）时，于该行渲染 `↻ Revisiting #N` 标记（N 为该字段值），使「有依据的重访」在记录表中与普通实验可区分；无该字段或值非正整数时 SHALL 不渲染标记（照常显示该行其余信息）。

#### Scenario: 重访行渲染标记

- **WHEN** 账本某 run 行含 `asi: {revisits_run: 7}`
- **THEN** 该 run 行显示 `↻ Revisiting #7` 标记，其余列（status/metric/delta/description）照常渲染

#### Scenario: 无标注不渲染

- **WHEN** 账本 run 行无 `asi.revisits_run`（或值非正整数）
- **THEN** 该行不出现重访标记，渲染与现状一致
