## Purpose

定义 pi-autoresearch 验收审计报告的内容契约：以当前 `plugin/` 代码实态为准（非上轮分析时的规划态），对照 pi v1.6.2（`archived/pi-autoresearch`）逐项验收，产出可信的残留差距基线。

## ADDED Requirements

### Requirement: 报告必须以代码实态逐项验收 28 项能力

报告 SHALL 对照 `docs/research/pi-gap-analysis.md` 的 28 项能力清单，逐项核对当前 `plugin/` 代码（commit `6c52535`）的实态；每个判定 MUST 附代码位置证据（文件路径+行号或文件名），并标注为「已对齐」「超出」「缩水」「缺失」「平台硬顶」五级之一。

#### Scenario: 判定可复核

- **WHEN** 读者查看任一能力判定
- **THEN** 能按给出的代码位置独立复核该判定，无需重新通读两个代码库

### Requirement: 行为级不一致必须按严重度分级并给出修复方向

发现「文档/SKILL 声称与实现不符」或「与 pi 契约的语义偏差」时，报告 MUST 按严重度分级（G1 契约不一致 / G2 观测缺口 / G3 功能缩水 / G4 路线图遗留），每条 MUST 说明：pi 的行为、我方现状、影响面（哪些下游依赖受损）、修复方向。

#### Scenario: 可直接派生修复 change

- **WHEN** 读者查看任一差距条目
- **THEN** 该条目包含足够信息直接开一个修复 change，无需重新调研

### Requirement: 报告必须记录超出 pi 的自有能力与平台硬顶边界

报告 SHALL 列出我方超出 pi 的能力清单（含一句话价值说明），并复核平台硬顶项的现状（README 已知边界与实态一致）；审计结论 MUST 区分「pi 对标差距」与「上轮 next-steps 路线图遗留」两类待办来源。

#### Scenario: 差距与路线图不混淆

- **WHEN** 读者查看待办清单
- **THEN** 能区分哪些是追平 pi 的残留、哪些是自身路线图（P2/预检）未完成项
