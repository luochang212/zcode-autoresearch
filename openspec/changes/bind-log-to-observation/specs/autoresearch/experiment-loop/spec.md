## ADDED Requirements

### Requirement: run 观测快照持久化

`run_experiment` SHALL 在每次实际执行基准后把观测快照持久化到 `.auto/config.json` 的 `pendingObservation`：`{metric, metrics, exit_code, timed_out, at}`（`metric` 为主度量中位数，未观测到有效度量时为 null；`metrics` 为按名中位数聚合）。基准失败（非零退出、超时、spawn 失败）SHALL 同样持久化快照。快照 SHALL 跨 MCP server 重启存活，下一次 run SHALL 覆盖它。

#### Scenario: 正常 run 落快照

- **WHEN** 基准执行完成并解析出 METRIC 行
- **THEN** `.auto/config.json` 的 `pendingObservation` 含观测 metric 与退出码

#### Scenario: 失败 run 也落快照

- **WHEN** 基准非零退出（或超时、spawn 失败）且未输出有效 METRIC
- **THEN** 快照仍被持久化，`metric` 为 null

#### Scenario: 快照跨重启存活

- **WHEN** run_experiment 后 MCP server 进程重启
- **THEN** 快照仍在 config.json 中可消费

### Requirement: log_experiment 与观测对账

`log_experiment` SHALL 消费 `pendingObservation` 快照作为落账对账依据。快照不存在（从未 run，或已被上一次成功 log 消费）时 SHALL 拒绝落账并提示先 `run_experiment`；被拒绝的 log SHALL NOT 消费快照（一次 run 对应一次成功 log）。非 crash 状态的 metric SHALL 等于快照 `metric`，不等时 SHALL 拒绝并在错误中给出观测值。`status=crash` 仅当快照 `metric` 为 null 时 SHALL 有据，快照存在有效度量时 SHALL 拒绝。该对账为事实门（与 keep 门同层），SHALL NOT 受 `auditBypass` 影响，且 SHALL NOT 收紧 keep/discard/noop 的决策空间（基准失败时 keep 的既有 advisory 政策不变，度量绑定照常）。

#### Scenario: 无观测落账被拒

- **WHEN** agent 未曾 run_experiment 即调用 log_experiment
- **THEN** 工具拒绝并提示先 run_experiment，账本不落行

#### Scenario: 成功 log 消费快照

- **WHEN** 一次成功落账后未重新 run 再次调用 log_experiment
- **THEN** 第二次被拒（无快照）；被拒的 log 不消费快照，修好参数无需重跑基准

#### Scenario: 转抄不符被拒

- **WHEN** run_experiment 观测 metric 42，agent 以 metric 40 调用 log_experiment
- **THEN** 工具拒绝，错误信息含观测值 42

#### Scenario: 假 crash 被拒

- **WHEN** 快照存在有效度量（42、exit 0），agent 以 status=crash 调用
- **THEN** 工具拒绝并提示以 discard/keep 落观测值

#### Scenario: 失败基准 attest 真 crash

- **WHEN** 基准非零退出且无有效 METRIC（快照 metric null），agent 以 status=crash 调用
- **THEN** 记录正常完成，账本行 metric 为 null

#### Scenario: keep-on-failed-run 政策不变

- **WHEN** 基准非零退出但输出了 METRIC 行，agent 以观测 metric 调用 keep
- **THEN** benchmark_warning 照常，keep 是否被拒仅由既有 keep 门与审计决定，度量绑定通过

#### Scenario: 对账不受 auditBypass 影响

- **WHEN** `.auto/config.json` 设 `auditBypass: true`，agent 无快照调用 log_experiment
- **THEN** 仍被拒绝（事实门不是审计不变量）

### Requirement: run 行树状态事实与残留提醒

每条 run 行 SHALL 记录落账时刻的机械树状态事实 `treeDirty`（会话状态豁免口径的 isDirty）；回滚残留非空时 SHALL 将残留清单落于该行 `residual`。`run_experiment` SHALL 在「账本全局最后一条 run 行 residual 非空且当前工作树仍脏」时返回 advisory 警告（不拒绝——残留文件可能已被合法编辑）。度量解析 SHALL 对「形似 `METRIC` 行但解析失败」的行产生 stderr 响亮诊断，不得静默丢弃。

#### Scenario: run 行落树状态事实

- **WHEN** 工作树有会话状态之外的改动时落账（任意 status）
- **THEN** 账本 run 行含 `treeDirty: true`；干净树落账则该字段为 false

#### Scenario: 回滚残留落行并触发 run 侧提醒

- **WHEN** 回滚留下残留脏文件，随后树仍脏时调用 run_experiment
- **THEN** 该 run 行含 `residual` 清单；run_experiment 返回携带残留提醒（advisory）

#### Scenario: 近失 METRIC 行响亮诊断

- **WHEN** 基准输出形似 `METRIC` 但解析失败的行（如 `METRIC time_ms=abc`）
- **THEN** server 向 stderr 输出含该行内容的诊断，其余 METRIC 行照常解析
