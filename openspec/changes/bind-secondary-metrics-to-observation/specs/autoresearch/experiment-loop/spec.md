## MODIFIED Requirements

### Requirement: log_experiment 与观测对账

`log_experiment` SHALL 消费 `pendingObservation` 快照作为落账对账依据。快照不存在（从未 run，或已被上一次成功 log 消费）时 SHALL 拒绝落账并提示先 `run_experiment`；被拒绝的 log SHALL NOT 消费快照（一次 run 对应一次成功 log）。非 crash 状态的 metric SHALL 等于快照 `metric`，不等时 SHALL 拒绝并在错误中给出观测值。`status=crash` 仅当快照 `metric` 为 null 时 SHALL 有据，快照存在有效度量时 SHALL 拒绝。**次级度量同受转写绑定**：可选 `metrics` 参数提供时 SHALL 与快照 `metrics`（按名中位数聚合）**逐键相等**（键集合一致、每个值为与观测值严格相等的有限数字），不等时 SHALL 拒绝并在错误中给出观测值；不提供 `metrics` SHALL 合法。落账行的 `metrics` SHALL 恒为快照的观测聚合（不取自 agent 转抄），使「账本中的每个数量 claim 都是测量事实的转写」对主度量与次级度量无条件成立。次级度量约束门 SHALL 读快照观测值（与本行及基线行内记录的观测聚合），SHALL NOT 依赖 agent 转抄——省略 `metrics` SHALL NOT 使约束被跳过（观测中无该度量名时仍记 `skipped`，那是「本次 run 未测量」的诚实结果）。畸形 `constraints` 条目（缺 `name` 字符串、`maxPct` 非正数或非有限）SHALL 响亮拒绝并说明，SHALL NOT 静默丢弃。该对账为事实门（与 keep 门同层），SHALL NOT 受 `auditBypass` 影响，且 SHALL NOT 收紧 keep/discard/noop 的决策空间（基准失败时 keep 的既有 advisory 政策不变，度量绑定照常）。

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

#### Scenario: 次级转写不符被拒

- **WHEN** run_experiment 观测聚合 `metrics` 为 `{rss_mb: 100}`，agent 以 `metrics: {rss_mb: 88}` 调用 log_experiment
- **THEN** 工具拒绝，错误信息含观测值 100

#### Scenario: 未报次级度量照常落行且行存观测值

- **WHEN** run_experiment 观测聚合 `metrics` 为 `{rss_mb: 100}`，agent 调用 log_experiment 不带 `metrics` 参数
- **THEN** 落账正常，且账本行的 `metrics` 为观测聚合 `{rss_mb: 100}`（非 null、非 agent 转抄）

#### Scenario: 未知次级度量名被拒

- **WHEN** 快照观测聚合无 `gpu_ms`，agent 以 `metrics: {gpu_ms: 5}` 调用 log_experiment
- **THEN** 工具拒绝（键不在观测中），错误信息列出可用的观测度量名

#### Scenario: 省略 metrics 无法绕过约束门

- **WHEN** 配置了 `constraints: [{name: "rss_mb", maxPct: 10}]`，本次 run 观测 `rss_mb` 超限，agent 调用 keep 时省略 `metrics` 参数
- **THEN** keep 仍因约束违例被拒（门读观测值），SHALL NOT 因未转抄而记 skipped 放行

#### Scenario: 畸形 constraints 响亮拒绝

- **WHEN** agent 以 `constraints: [{name: "rss_mb"}, {maxPct: 10}]` 调用 log_experiment（首条缺 maxPct、次条缺 name）
- **THEN** 工具拒绝并指明畸形条目，SHALL NOT 静默丢弃后照常落账

#### Scenario: 对账不受 auditBypass 影响

- **WHEN** `.auto/config.json` 设 `auditBypass: true`，agent 无快照调用 log_experiment
- **THEN** 仍被拒绝（事实门不是审计不变量）
