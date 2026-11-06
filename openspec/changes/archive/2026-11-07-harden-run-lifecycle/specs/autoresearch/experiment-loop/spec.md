## MODIFIED Requirements

### Requirement: run_experiment 运行基准并解析度量

`run_experiment` 工具 SHALL 接受任意 shell 命令，记录 wall-clock 时长，解析输出中形如 `METRIC name=value` 的行，并把给 LLM 的回传截断为紧凑摘要（约 10 行/4KB）；输出溢出到日志文件时同时提供完整输出的日志文件路径（未溢出时 `log_file` 为 null）。工具 SHALL 支持 `repeat` 参数（正整数，默认 1）；repeat>1 时返回的 `metrics` 字典 SHALL 为各次运行按度量名的**中位数聚合**，与 `median_metric` 同源一致（主度量不特殊化）。输出超过阈值（约 2MB）溢出到日志文件时，工具 SHALL 仍解析 METRIC 行，解析方式为增量扫描全部输出，与 METRIC 行在输出中的位置（开头/结尾）无关，`metric`/`metrics` 正常返回；`output_tail` SHALL 取真实输出的尾部；溢出后的内存占用 SHALL 有界（不得随输出总量线性增长）。工具 SHALL 在基准执行前执行 `.auto/hooks/before.sh`（若存在且可执行），stdin 为单行 JSON：`{event:"before", cwd, next_run, last_run, session}`，其中 `last_run` SHALL 透传上一条 run 的 `{run, status, metric, description, asi}`（无上轮或无 asi 时为 null）；`session` SHALL 含 `{metric_name, direction, baseline_metric, best_metric, run_count, started_at_epoch, goal}`，其中 `started_at_epoch` 为 segment 起始时刻的 epoch 秒（账本无 config 行时为 null），使墙钟预算类钩子无需解析 `.auto/log.jsonl` 即可判定预算；`goal` 为 `init_experiment` 设定的会话名（账本无 config 行或未设名时为 null），与 pi-autoresearch 的 session 契约对齐；钩子失败（非零退出/超时/启动失败）SHALL 不阻断基准执行，但 SHALL 以 `before_steer` 返回错误提示（形如 `[before hook exited N] <stderr 摘要>` 或 `[before hook timed out after 30s]`）；每次触发 SHALL 向 `.auto/log.jsonl` 追加一条 `{type:"hook", stage:"before", exit_code, duration_ms, stdout_bytes, timed_out}` 观测条目。工具 SHALL 在开始时检查上一轮状态（crash 未回滚禁续跑），并**比对冻结文件哈希**：当前 `measure.sh`/`checks.sh` 的 sha256 与会话记录值不一致时，返回 `benchmark_drift: true` 警告（不阻断执行）："基准自会话开始后已变更（modified/deleted），前后 metric 不可比，建议 init_experiment 开新 segment 或确认变更"。文案 SHALL 区分文件被修改与被删除；首见（记录为 null 但文件已存在）时 SHALL 把当前哈希合并写回会话配置作为基准，不产生警告；冻结文件被删除（记录非 null、当前文件不存在）时 SHALL 同样返回 `benchmark_drift: true` 警告。超时终止 SHALL 先向基准进程组发送 SIGTERM，宽限期（约 5s）内未退出时 SHALL 升级为 SIGKILL（进程组），保证工具调用必然返回、不泄漏进程。进程提前退出而 `close` 未触发（stdio 管道被脱离进程组的后代进程占住，典型为 daemon 化后代）时，工具 SHALL 在退出后的一个有界宽限内以 exit 事件的结果结算返回，SHALL NOT 无限等待 `close`。

#### Scenario: 漂移警告

- **WHEN** 会话开始后 `measure.sh` 被修改（hash 变化）
- **THEN** run_experiment 返回 `benchmark_drift: true` 与警告信息，基准仍执行

#### Scenario: 无漂移静默

- **WHEN** 冻结文件未被修改
- **THEN** 返回不含 `benchmark_drift`（或为 false）

#### Scenario: 首见记录

- **WHEN** init 时 `measure.sh` 不存在（hash 为 null），首次 run 时已存在
- **THEN** 记录当前哈希作为会话基准，不产生漂移警告

#### Scenario: 首见之后修改报漂移

- **WHEN** init 时 `measure.sh` 不存在，会话中途创建（首见已记录），之后又被修改
- **THEN** run_experiment 返回 `benchmark_drift: true` 与警告信息

#### Scenario: 冻结文件删除报漂移

- **WHEN** init 时已记录 `measure.sh` 哈希，会话中途该文件被删除
- **THEN** run_experiment 返回 `benchmark_drift: true` 与警告信息，警告明示文件被删除（deleted）

#### Scenario: 度量解析

- **WHEN** benchmark 输出包含 `METRIC time_ms=42` 且主度量名为 time_ms
- **THEN** 工具返回中包含该度量值及 `Use these values directly in log_experiment` 的机器可读提示

#### Scenario: 重复运行取中位数

- **WHEN** agent 以 `repeat: 3` 调用且三次输出 `METRIC time_ms` 为 42/44/41、`METRIC rss_mb` 为 100/104/102
- **THEN** 工具返回 `runs` 数组含三次原始值、`median_metric: 42`（中位数）、`metrics` 字典为按名中位数聚合（time_ms=42、rss_mb=102），checks 只执行一次

#### Scenario: 溢出后度量仍可解析

- **WHEN** benchmark 输出超过溢出阈值（约 2MB）且 `METRIC` 行位于输出末尾
- **THEN** 工具返回 `log_file`（溢出文件路径）、`metric` 为 METRIC 行的值（不因溢出丢失）、`output_tail` 为真实输出的尾部摘要

#### Scenario: METRIC 在输出开头同样解析

- **WHEN** benchmark 先输出 `METRIC` 行、随后输出超过溢出阈值的噪声
- **THEN** `metric` 仍为 METRIC 行的值，`log_file` 正常提供

#### Scenario: before 钩子执行

- **WHEN** `.auto/hooks/before.sh` 存在且可执行，且其 stdout 为一段建议文本
- **THEN** 钩子在基准前被执行，返回中 `before_steer` 为该文本；钩子不存在时返回为空且基准仍执行

#### Scenario: before 钩子透传 asi

- **WHEN** 账本上一条 run 含 `asi: {hypothesis: "…"}`，before.sh 打印 `last_run.asi.hypothesis`
- **THEN** 钩子 stdout 包含该 hypothesis 文本（payload 未丢弃 asi）

#### Scenario: session 携带 segment 起始时间

- **WHEN** `.auto/hooks/before.sh` 从 stdin 读取 `session.started_at_epoch`，且账本含 config 行
- **THEN** 值为该 segment 起始时刻的 epoch 秒；账本无 config 行时该字段为 null

#### Scenario: session 携带会话名（pi 契约）

- **WHEN** `.auto/hooks/before.sh` 从 stdin 读取 `session.goal`，且 `init_experiment` 以 name 设定会话名
- **THEN** 值为该会话名；未设定时为 null，pi-autoresearch 官方示例钩子（读 `.session.goal`）无需修改即可运行

#### Scenario: 钩子失败可见且不阻断

- **WHEN** before.sh 以退出码 3 失败并输出 stderr
- **THEN** 返回中 `before_steer` 以 `[before hook exited 3]` 开头并附 stderr 摘要，基准仍执行且 metric 正常解析

#### Scenario: 钩子观测条目

- **WHEN** before.sh 被触发（无论成败）
- **THEN** `.auto/log.jsonl` 追加一条 `{type:"hook", stage:"before", …}` 条目，且后续 rebuildState/校验不受影响

#### Scenario: 命令超时

- **WHEN** benchmark 超过配置的超时秒数（默认 600）
- **THEN** 进程组先收到 SIGTERM；宽限期内未退出的 SHALL 被升级 SIGKILL，返回结果标记为超时失败，工具调用必然返回且不残留基准进程

#### Scenario: 提前退出但 stdio 被滞留进程占用

- **WHEN** benchmark 进程已正常退出（未超时），但其 stdio 管道被脱离进程组的后代进程占住（`close` 事件不触发）
- **THEN** 工具调用在一个有界宽限（与 kill 宽限同级）内以 exit 事件的结果结算返回（exit 前已输出的 METRIC 照常解析），SHALL NOT 挂起至滞留进程自然退出

#### Scenario: crash 未回滚禁续跑

- **WHEN** 上一条 run 为 crash 且 `git status` 显示工作区有改动（除 `.auto/`）
- **THEN** 工具拒绝开始，提示先回滚或清空会话

### Requirement: run 观测快照持久化

`run_experiment` SHALL 在每次实际执行基准后把观测快照持久化到 `.auto/config.json` 的 `pendingObservation`：`{metric, metrics, exit_code, timed_out, at}`（`metric` 为主度量中位数，未观测到有效度量时为 null；`metrics` 为按名中位数聚合）。基准失败（非零退出、超时、spawn 失败）SHALL 同样持久化快照；spawn 失败路径 SHALL 同时把 `pendingChecksFailed` 重置为 false（本次 run 未产生 checks 判定），使快照与 checks 标记始终描述同一次 run，上一 run 的失败判定 SHALL NOT 背书本次落账。快照 SHALL 跨 MCP server 重启存活，下一次 run SHALL 覆盖它。

#### Scenario: 正常 run 落快照

- **WHEN** 基准执行完成并解析出 METRIC 行
- **THEN** `.auto/config.json` 的 `pendingObservation` 含观测 metric 与退出码

#### Scenario: 失败 run 也落快照

- **WHEN** 基准非零退出（或超时、spawn 失败）且未输出有效 METRIC
- **THEN** 快照仍被持久化，`metric` 为 null

#### Scenario: spawn 失败重置 checks 判定

- **WHEN** config 残留上一 run 的 `pendingChecksFailed: true`，下一次 run_experiment spawn 失败（bash 缺失、cwd 消失等）
- **THEN** 快照持久化（metric null）且 `pendingChecksFailed` 被重置为 false，本次落账不得以 checks_failed 有据

#### Scenario: 快照跨重启存活

- **WHEN** run_experiment 后 MCP server 进程重启
- **THEN** 快照仍在 config.json 中可消费

### Requirement: 实验工具入口前置条件与段边界

`run_experiment` SHALL 要求存在 active session（账本中存在 config 行）；无 session 时 SHALL 在任何 benchmark 执行或配置写入前返回明确错误。`patchSessionConfig` SHALL 在写 `.auto/config.json` 前创建 `.auto/` 目录。`clear_experiments` 在账本不存在时 SHALL 幂等返回成功且不写文件；存在账本时 SHALL 删除账本并重置 `pendingChecksFailed` 与 `autoresearchOff`。`rebuildState` 遇到 config 行 SHALL 重置 `consecutiveFailures`、`lastRun`，使新 segment 的连败与 before-hook last_run 不继承上一段；checks 判定的跨调用载体是 config 的 `pendingChecksFailed`（其边界行为由「跨调用 pending 态的边界重置」requirement 管辖），rebuildState 不再维护冗余的行级 checks 标记。crash+脏树审计门（「上一 run 为 crash 且工作树未回滚 → 拒绝 run」）SHALL 以**账本全局最后一条 run 行**为判据，不因 config 行（segment 边界）豁免：脏树是物理状态，`init_experiment` 开新 segment 不能把它洗掉；为此会话状态 SHALL 额外维护一个不随 config 行重置的「全局最后一条 run」视图（before-hook 的 `last_run` 仍按 segment 作用域重置，语义不变）。

#### Scenario: 未 init 时 run 被拒

- **WHEN** 账本无 config 行，agent 调用 `run_experiment`
- **THEN** 工具返回 `ok: false` 与 "call init_experiment first" 类错误，不执行 benchmark、不写 `.auto/config.json`

#### Scenario: 无 .auto 时 clear 幂等

- **WHEN** 项目目录没有 `.auto/`，agent 调用 `clear_experiments`
- **THEN** 工具返回成功与 "no active session" 信息，不抛 ENOENT、不创建 `.auto/`

#### Scenario: 跨 segment 状态重置

- **WHEN** segment 1 以 discard、crash 结束，随后 init segment 2 并只记录一次 discard
- **THEN** `consecutiveFailures` 为 1（不是 3），before hook 的 `last_run` 为 null；segment 2 的 checks 判定（`pendingChecksFailed`）不继承 segment 1

#### Scenario: re-init 不解除 crash+脏树审计门

- **WHEN** 上一条 run 为 crash 且工作树有未回滚改动，agent 调用 `init_experiment` 开新 segment 后再调用 `run_experiment`
- **THEN** `run_experiment` 仍拒绝（audit: unrolled-back working-tree changes），直到脏树被回滚（discard/crash 记账或手工恢复）
