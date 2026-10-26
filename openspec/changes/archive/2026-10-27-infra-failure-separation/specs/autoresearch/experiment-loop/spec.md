## ADDED Requirements

### Requirement: log_experiment 区分基础设施故障与代码故障

crash 语义 SHALL 区分两类失败：**代码故障**（想法本身不可行）与**基础设施故障**（环境问题：网络中断、依赖缺失、平台限流等）。二者均以 `status: "crash"` 记录（metric 为 null），区别仅由 agent 自行标注：判定为基础设施故障时，SHALL 在 `asi` 中携带 `infra: true`。该标注为 advisory 约定：`log_experiment` 对 `asi.infra` 不做任何校验，账本照实透传。

doom-loop 检测 SHALL 将 `asi.infra === true` 的 run 行排除在检测窗口之外（先剔除、再取末窗做相似度判定），使同一假设被基础设施故障反复打断时不被误判为重复；非 infra 行之间的重复/振荡判定语义 SHALL 保持不变。doom-loop 触发时，`next_action_hint` SHALL 提示：先做一轮调研（重读 `prompt.md` 的 What's Been Tried、相关文档、此前接近成功的实验）再选一个结构性不同的方向，而不是直接再试一次同类改动。

#### Scenario: infra 标注透传

- **WHEN** agent 以 `status: "crash"`、`asi: {hypothesis: "并行构建", infra: true}` 记录一次基础设施故障
- **THEN** 写入正常完成（advisory，无校验），账本 run 行的 `asi` 含 `infra: true`

#### Scenario: infra 行反复 crash 不触发 doom-loop

- **WHEN** 最近多条 run 为同一假设反复 crash 且均带 `asi.infra: true`（网络中断重试）
- **THEN** `doom_loop` 为 false（环境故障不是假设打转）

#### Scenario: 剔除 infra 行后的真实重复仍触发

- **WHEN** 检测窗口内 run 序列为 A（`infra: true`）→ A → A → A（A 为相似假设）
- **THEN** 剔除 infra 行后末三条相似，`doom_loop: true`（infra 噪声不掩盖真实打转）

#### Scenario: 非 infra 重复语义不变

- **WHEN** 最近 4 条非 infra run 的假设为 A→B→A→B
- **THEN** `doom_loop: true`（与既有 doom-loop 检测行为一致）

#### Scenario: doom-loop 提示含调研逃逸

- **WHEN** doom-loop 触发
- **THEN** `next_action_hint` 同时包含「先做一轮调研（重读已试清单/文档/近失实验）」与「换结构性不同方向」两层语义
