## MODIFIED Requirements

### Requirement: crash 返回值与账本一致

`log_experiment` 以 `status=crash` 记录时，账本行 metric SHALL 为 null，响应中的 metric 与 delta SHALL 同样为 null；不得用调用方传入的占位值计算 delta。回放侧 SHALL 承接同一语义：状态重建（rebuildState）的 baseline 与有效度量集合、置信度计算（含 server 侧同源函数）、平台期检测、dashboard 历史投影的首测基线与有效度量集合 SHALL 全部排除 crash 行——包括携带遗留占位 metric（如 0，ADR-10 之前的行格式）的 crash 行；账本本身 SHALL NOT 被改写（append-only，排除是只读语义）。consecutiveFailures 链与 best 判定按 status 语义照常看到 crash 行（crash 计失败；非 keep 行不更新 best），不受本排除影响。

#### Scenario: crash 带 metric 也返回 null

- **WHEN** agent 以 `status:"crash", metric:7` 调用 `log_experiment`
- **THEN** 返回 `metric: null`、`delta: null`，账本行 metric 为 null

#### Scenario: 遗留占位行不污染 baseline

- **WHEN** 账本含 ADR-10 之前的行格式：crash 行携带占位 metric 0，其后 keep 42
- **THEN** rebuildState 的 baseline 为 42（非 0），dashboard 历史投影的首测基线同为 42

#### Scenario: 遗留占位行不进入置信度与平台期

- **WHEN** legacy crash-0 行与两条 keep（42、40）构成 segment 的全部 metric 值
- **THEN** 置信度计算的值集合不含 0（本例仅 2 个有效值，confidence 为 null 而非被 0 拉偏的数值），detectPlateau 的有效度量集合同样不含 0

#### Scenario: crash 行仍计连败

- **WHEN** 账本尾部为 [crash(占位 0), crash(null), crash(null)] 且阈值 3
- **THEN** 连续失败计数为 3（回放排除只作用于度量集合，不改变 status 语义）

### Requirement: keep 两步写的失败路径

keep 是两步写：先 git commit（`experiment:` 前缀），再向 `.auto/log.jsonl` 追加含真实短 hash 的 run 行；顺序不可换。账本追加失败 SHALL NOT 留下孤儿 commit：keep 的追加抛错时，工具 SHALL 撤销该 commit 并返回错误、保留 `pendingObservation`；撤销自身失败时 SHALL 响亮返回孤儿 commit hash 与「无对应账本行」警示，SHALL NOT 静默。非 keep 状态的追加失败 SHALL 返回错误并保留 pending 快照。被拒绝的 log SHALL NOT 消费 pending 快照。keep 的两条失败消息（无改动可 commit / git commit failed）SHALL 说明 index 状况。

落账成功之后的跨调用态清除（清 `pendingChecksFailed` 与消费 `pendingObservation`）是簿记而非落账本体：清除写 `.auto/config.json` 失败时 SHALL 以**成功**收尾（行已落账，报错会诱发对同一观测的重复落账），响应 SHALL 携带显式 `pending_reset_warning`（说明行已写入、pending 态未能清除、在再次 `run_experiment` 之前勿再次 `log_experiment`），并 SHALL 输出 stderr 诊断（never-silent）；一项清除失败 SHALL NOT 阻止另一项的尝试。陈旧的观测快照由下一次 `run_experiment` 覆盖自愈。

#### Scenario: 追加失败撤销孤儿 commit

- **WHEN** keep 的 commit 成功后账本追加抛错（如 `.auto/log.jsonl` 不可写）
- **THEN** 以 keep 前 HEAD 执行 `git reset --mixed`（分支退回、index 复位、工作树不动，commit 的改动回到树中呈未暂存态），返回错误说明 commit 已撤销，`pendingObservation` 未被消费

#### Scenario: 修复后重试与首次尝试同形

- **WHEN** 追加失败被撤销后，文件系统问题修复，agent 以同参数重试 log_experiment
- **THEN** keep 正常完成：commit 落库、账本行含新 commit hash、pending 快照被消费

#### Scenario: 撤销失败响亮报孤儿

- **WHEN** 追加失败且 `git reset --mixed` 撤销自身也抛错（或无可撤销的 pre-keep HEAD）
- **THEN** 返回错误同时含追加失败原因、孤儿 commit hash 与「无对应账本行」警示

#### Scenario: 非 keep 追加失败保留快照

- **WHEN** discard 的账本追加抛错（树已由回滚复位）
- **THEN** 返回错误说明无行落账，`pendingObservation` 未被消费，重试可再次落账

#### Scenario: 失败消息说明 index 状况

- **WHEN** keep 因「无改动可 commit」或「git commit failed」被拒
- **THEN** 错误消息注明实验外预暂存条目已被 unstage（后者另注明实验改动仍在 index 中暂存）

#### Scenario: pending 清除失败不推翻已落账的行

- **WHEN** discard 的账本追加成功，但随后的 config 写入抛错（如 `.auto/config.json` 权限变为只读）
- **THEN** 返回 `ok: true` 并携带 `pending_reset_warning`（指明行已落账、pending 态未清、勿未重跑 run 就再次 log），stderr 含诊断，账本恰有该一行（不因报错诱发第二次落账）

#### Scenario: 一项清除失败不挡另一项

- **WHEN** 落账成功后两个 pending 键的清除写失败相继发生
- **THEN** 两个清除均被尝试（第一个的失败不短路第二个），警告与 stderr 汇总呈现
