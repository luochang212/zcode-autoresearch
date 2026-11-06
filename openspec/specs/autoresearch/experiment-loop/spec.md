## Purpose

定义 zcode autoresearch 插件的实验循环行为契约：init/run/log 三件套工具的输入输出、账本格式与 segment、度量解析与判定、git 提交/回滚语义，以及迭代上限。

## Requirements

### Requirement: init_experiment 建立实验会话

`init_experiment` 工具 SHALL 接受会话名、主度量名、可选度量单位与方向（lower/higher，默认 lower），并在 `.auto/log.jsonl` 追加一条 config 记录；重复调用时 SHALL 递增 segment，使新目标的数据不污染旧 baseline。当 `.auto/config.json` 含 `workingDir` 时，工具 SHALL 将该目录解析为**研究目录**：此后 init/run/log、git 操作、迭代钩子与 dashboard 全部作用于该目录（config 文件本身留在项目目录）。工具 SHALL 将**冻结文件哈希**写入 `.auto/config.json` 的 `benchmarkHashes`（`measure.sh` 与 `checks.sh` 存在时的 sha256；文件不存在时为 null，遵循"首见即基准"，在首次运行时记录）；config 账本记录本身 SHALL NOT 包含哈希（账本 append-only，无法回填首见值）。研究目录不是 git 仓库时，工具 SHALL 拒绝初始化并返回明确错误；是 git 仓库但没有任何 commit（unborn HEAD）时，工具 SHALL 同样拒绝并提示先提交 baseline（实验循环的 keep/discard 依赖 git 提交与回滚语义，空仓库上的首次回滚必然失败）。初始化 SHALL 清除 `autoresearchOff` 标记，使显式新建/重开实验会话即恢复续跑语义。

#### Scenario: 首次初始化

- **WHEN** agent 调用 `init_experiment` 并给出 name/metric_name/direction
- **THEN** `.auto/log.jsonl` 出现一条 config 记录，包含 name、metricName、direction、segment；`.auto/config.json` 出现 `benchmarkHashes`

#### Scenario: 更换优化目标

- **WHEN** agent 在已有结果后再次调用 `init_experiment`
- **THEN** segment 递增，后续 baseline 与 best 只在该新 segment 内计算

#### Scenario: workingDir 重定向

- **WHEN** 项目 `.auto/config.json` 含 `workingDir: "work/"` 且该目录存在
- **THEN** 账本写于 `work/.auto/log.jsonl`，benchmark 命令与 git 操作在 `work/` 下执行

#### Scenario: 非 git 目录拒绝初始化

- **WHEN** 研究目录不是 git 仓库（无 `.git`，`git rev-parse --git-dir` 失败）
- **THEN** `init_experiment` 返回 `ok: false` 与明确错误（提示先 `git init`），不追加 config 记录

#### Scenario: 空仓库拒绝初始化

- **WHEN** 研究目录是 git 仓库但 `git rev-parse --verify HEAD` 失败（尚无 commit）
- **THEN** `init_experiment` 返回 `ok: false`，提示先提交 baseline，不追加 config 记录

### Requirement: run_experiment 运行基准并解析度量

`run_experiment` 工具 SHALL 接受任意 shell 命令，记录 wall-clock 时长，解析输出中形如 `METRIC name=value` 的行，并把给 LLM 的回传截断为紧凑摘要（约 10 行/4KB），同时提供完整输出的日志文件路径。工具 SHALL 支持 `repeat` 参数（正整数，默认 1）；repeat>1 时返回的 `metrics` 字典 SHALL 为各次运行按度量名的**中位数聚合**，与 `median_metric` 同源一致（主度量不特殊化）。输出超过阈值（约 2MB）溢出到日志文件时，工具 SHALL 仍解析 METRIC 行，解析方式为增量扫描全部输出，与 METRIC 行在输出中的位置（开头/结尾）无关，`metric`/`metrics` 正常返回；`output_tail` SHALL 取真实输出的尾部；溢出后的内存占用 SHALL 有界（不得随输出总量线性增长）。工具 SHALL 在基准执行前执行 `.auto/hooks/before.sh`（若存在且可执行），stdin 为单行 JSON：`{event:"before", cwd, next_run, last_run, session}`，其中 `last_run` SHALL 透传上一条 run 的 `{run, status, metric, description, asi}`（无上轮或无 asi 时为 null）；`session` SHALL 含 `{metric_name, direction, baseline_metric, best_metric, run_count, started_at_epoch, goal}`，其中 `started_at_epoch` 为 segment 起始时刻的 epoch 秒（账本无 config 行时为 null），使墙钟预算类钩子无需解析 `.auto/log.jsonl` 即可判定预算；`goal` 为 `init_experiment` 设定的会话名（账本无 config 行或未设名时为 null），与 pi-autoresearch 的 session 契约对齐；钩子失败（非零退出/超时/启动失败）SHALL 不阻断基准执行，但 SHALL 以 `before_steer` 返回错误提示（形如 `[before hook exited N] <stderr 摘要>` 或 `[before hook timed out after 30s]`）；每次触发 SHALL 向 `.auto/log.jsonl` 追加一条 `{type:"hook", stage:"before", exit_code, duration_ms, stdout_bytes, timed_out}` 观测条目。工具 SHALL 在开始时检查上一轮状态（crash 未回滚禁续跑），并**比对冻结文件哈希**：当前 `measure.sh`/`checks.sh` 的 sha256 与会话记录值不一致时，返回 `benchmark_drift: true` 警告（不阻断执行）："基准自会话开始后已变更（modified/deleted），前后 metric 不可比，建议 init_experiment 开新 segment 或确认变更"。文案 SHALL 区分文件被修改与被删除；首见（记录为 null 但文件已存在）时 SHALL 把当前哈希合并写回会话配置作为基准，不产生警告；冻结文件被删除（记录非 null、当前文件不存在）时 SHALL 同样返回 `benchmark_drift: true` 警告。超时终止 SHALL 先向基准进程组发送 SIGTERM，宽限期（约 5s）内未退出时 SHALL 升级为 SIGKILL（进程组），保证工具调用必然返回、不泄漏进程。

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

#### Scenario: crash 未回滚禁续跑

- **WHEN** 上一条 run 为 crash 且 `git status` 显示工作区有改动（除 `.auto/`）
- **THEN** 工具拒绝开始，提示先回滚或清空会话

### Requirement: log_experiment 记录结果并执行 git 语义

`log_experiment` 工具 SHALL 接受主度量值、status（keep/discard/crash/checks_failed/noop）、描述与可选次级度量；keep 时自动 stage 当前全部改动（**排除会话状态**：`.auto/` 与 `.zcode/` 会话目录、生成的 dashboard）并 commit（message 带 `experiment:` 前缀与结构化结果），非 keep（discard/crash/checks_failed）时丢弃工作区改动但豁免会话状态，noop 不回滚；记录追加到 `.auto/log.jsonl` 并回填真实短 hash。status=crash 时 metric SHALL 记为 null（不得写入占位 0）：crash 行不参与 baseline/best/置信度/平台期计算，避免污染后续 delta 显示。`status=checks_failed` SHALL 为**有据记录**：仅当最近一次 `run_experiment` 留下失败的 checks 判定（`pendingChecksFailed` 为 true）时 SHALL 接受，否则 SHALL 拒绝并提示正确状态（metric 未超保留值用 discard、benchmark 自身失败用 crash）；该门与 keep 门同层（位于审计之前、不受 `auditBypass` 影响）。`status=noop` 时若工作树脏（会话状态豁免口径），SHALL 在返回中携带显式 `warning`（advisory，不拒绝——脏可能是合法的用户文件）：noop 不回滚，脏树将进入下一轮测量。工具 SHALL 在记录后执行 `.auto/hooks/after.sh`（若存在且可执行），stdin 为单行 JSON：`{event:"after", cwd, run_entry, session}`，其中 `run_entry` SHALL 透传本条 run 的 `{run, status, metric, description, commit, asi}`（无 asi 时为 null）；`session` SHALL 含与 before 钩子一致的同一组字段（`{metric_name, direction, baseline_metric, best_metric, run_count, started_at_epoch, goal}`），`started_at_epoch` 为同一 segment 起始时刻的 epoch 秒（账本无 config 行时为 null）；`goal` 同前，为同一会话名；钩子失败 SHALL 不阻断记录，但 SHALL 以 `after_steer` 返回错误提示；每次触发 SHALL 向 `.auto/log.jsonl` 追加 `{type:"hook", stage:"after", …}` 观测条目。工具 SHALL 在写入前校验账本不变量与**次级度量约束**，违规 SHALL 拒绝写入并返回错误：

- **次级度量约束**：当调用含 `constraints: [{ name, maxPct }]` 且 status=keep 时，工具 SHALL 校验该次级度量（来自本次 run 的 metrics 字典）不超过"当前 segment 首条 run 该度量值"的 maxPct%；超界 SHALL 拒收 keep（返回错误提示放宽约束或改判）；无 constraints 或非 keep 时不校验。

#### Scenario: keep 自动提交

- **WHEN** agent 以 status=keep 调用且 metric 相对当前保留值改进
- **THEN** 产生 `experiment:` 前缀 commit，账本回填真实短 hash

#### Scenario: keep 提交不含会话文件

- **WHEN** agent 以 status=keep 调用且目标项目未 gitignore `.auto/` 与 `.zcode/`
- **THEN** 产生的 commit 不包含 `.auto/` 与 `.zcode/` 下任何文件，也不包含生成的 dashboard

#### Scenario: 仅会话文件改动时 keep 被拒

- **WHEN** agent 以 status=keep 调用但除会话状态外没有任何工作区改动（例如宿主只写了 `.zcode/plans/` 下的会话文件）
- **THEN** 工具拒绝并返回 "keep with no changes to commit" 审计错误

#### Scenario: keep 未改进被拒

- **WHEN** agent 以 status=keep 调用但 metric 未优于当前保留值
- **THEN** 工具拒绝写入并返回错误（提示改用 discard 或说明）

#### Scenario: discard 真改进无 failed guard 被拒

- **WHEN** agent 以 status=discard 调用且 metric 优于当前保留值、但上次 checks 未失败
- **THEN** 工具拒绝写入并返回错误（提示真改进不应丢弃，或注明 checks 失败）

#### Scenario: checks_failed 无判定被拒

- **WHEN** agent 以 status=checks_failed 调用，但最近一次 run_experiment 未留下失败的 checks 判定（未跑 run、checks 通过、或 checks 属基础设施故障未产生判定）
- **THEN** 工具拒绝写入并返回错误（含 "no failed-checks verdict" 语义，提示改用 discard 或 crash），账本不落行

#### Scenario: checks_failed 有判定放行

- **WHEN** 最近一次 run_experiment 的 checks 判定为失败（pendingChecksFailed 为 true），agent 以 status=checks_failed 调用
- **THEN** 记录正常完成，账本行含 `checksFailed: true`

#### Scenario: 次级度量超界禁 keep

- **WHEN** 调用含 `constraints: [{name: "memory_mb", maxPct: 105}]`，本次 run 的 memory_mb 为首条 run 的 110%
- **THEN** 工具拒绝 keep 并返回错误（提示放宽约束或改判）

#### Scenario: 约束内 keep 通过

- **WHEN** 调用含 `constraints: [{name: "memory_mb", maxPct: 105}]`，本次 run 的 memory_mb 为首条 run 的 100%
- **THEN** keep 正常执行，返回中 constraints 状态为 pass

#### Scenario: 无约束无校验

- **WHEN** 调用不含 constraints
- **THEN** 行为与现状一致，无次级度量校验

#### Scenario: discard 自动回滚且豁免会话目录

- **WHEN** agent 以 status=discard 调用且校验通过，工作区存在宿主写入的未跟踪 `.zcode/` 会话文件
- **THEN** 工作区实验改动被丢弃（checkout+clean），`.auto/` 与 `.zcode/` 内容完整保留，账本追加 discard 行

#### Scenario: noop 不回滚

- **WHEN** agent 以 status=noop 调用（未改动代码）
- **THEN** 工作区保持不变，账本追加 noop 行

#### Scenario: noop 脏树显式警告

- **WHEN** agent 以 status=noop 调用时工作树存在会话状态之外的改动
- **THEN** 记录正常完成（noop 不拒绝），返回携带显式 `warning`（说明 noop 不回滚、脏树将进入下一轮测量）

#### Scenario: noop 干净树静默

- **WHEN** agent 以 status=noop 调用时工作树干净（会话状态豁免口径）
- **THEN** 返回不携带 `warning` 字段

#### Scenario: crash 行不污染 baseline

- **WHEN** segment 首条记录为 crash（metric 记 null），随后一次 keep 的 metric 为 42
- **THEN** rebuildState 的 baseline 为 42（非 0），该 keep 的 delta 显示为改善而非反转；账本中 crash 行 `metric` 为 null

#### Scenario: after 钩子执行

- **WHEN** `.auto/hooks/after.sh` 存在且可执行，本次记录含 `asi: {hypothesis: "…"}`，after.sh 打印 `run_entry.asi.hypothesis`
- **THEN** 钩子在记录后被执行，返回中 `after_steer` 为该文本（payload 未丢弃 asi）；`.auto/log.jsonl` 追加 `{type:"hook", stage:"after", …}` 条目

#### Scenario: after 钩子 session 含同一起始时间与同一会话名

- **WHEN** `.auto/hooks/after.sh` 从 stdin 读取 `session.started_at_epoch`
- **THEN** 值与 before 钩子所见一致（同一 segment 起始的 epoch 秒）

#### Scenario: after 钩子失败可见且不阻断

- **WHEN** after.sh 以非零退出码失败
- **THEN** 记录正常完成，返回中 `after_steer` 以 `[after hook exited N]` 开头

#### Scenario: doom-loop 检测

- **WHEN** 最近 4 条 run 的假设为 A→B→A→B（如"试埃氏筛"、"试位运算"、"试埃氏筛变体"、"试位运算变体"）
- **THEN** 返回 `doom_loop: true`，`next_action_hint` 提示停止重复尝试

#### Scenario: 事件顺序违规

- **WHEN** 拟追加的 run 号与账本不连续或 segment 不匹配
- **THEN** 工具拒绝写入并返回错误

#### Scenario: checks 失败禁止 keep

- **WHEN** 上一次 run 的 checks 失败而 agent 试图以 keep 记录
- **THEN** 工具拒绝 keep 并返回错误提示

### Requirement: 会话状态豁免的统一集合与全覆盖

会话状态 SHALL 定义为固定集合：`.auto/` 会话目录、宿主会话目录 `.zcode/`、生成的 dashboard 文件。该集合 SHALL 是全部 git 消费点的单一事实源：keep 的暂存排除、「工作树脏」判定（crash 门禁与回滚回报同源）、回滚的 restore 与 clean。回滚 SHALL 不删除、不回退会话状态，无论其 tracked 与否；仅存在会话文件改动时，工作树 SHALL 视为干净（crash 门禁不得因宿主写入会话文件而永久拒绝续跑）。`init_experiment` SHALL 向研究仓库的本地排除文件（`.git/info/exclude`）幂等声明 `.zcode`（已忽略则跳过；声明失败 SHALL NOT 阻断初始化——枚举层是正确性兜底，声明层是防复发优化）。

#### Scenario: 回滚不删除未跟踪会话文件

- **WHEN** discard/crash/checks_failed 触发回滚，研究仓库存在未跟踪且未 gitignore 的 `.zcode/plans/*.md`
- **THEN** 回滚后 `.zcode/` 内容完整保留，实验改动被恢复，`rolled_back.files` 不含 `.zcode/` 路径

#### Scenario: 回滚不回退 tracked 会话文件

- **WHEN** `.zcode/` 下有文件已被 git 跟踪，会话期间宿主修改了它，随后实验改动被 discard
- **THEN** 该 tracked `.zcode/` 文件的修改保留在工作区，不被 checkout 回退

#### Scenario: 会话文件不触发 crash 门禁死锁

- **WHEN** 上一条 run 为 crash，宿主已写入 `.zcode/` 会话文件（未跟踪、未忽略），实验改动已被回滚
- **THEN** `run_experiment` 不因会话文件拒绝执行（脏判定排除会话状态）

#### Scenario: init 幂等声明本地排除

- **WHEN** `init_experiment` 在未忽略 `.zcode/` 的研究仓库上执行两次
- **THEN** 首次后 `.git/info/exclude` 含 `.zcode` 声明，第二次不产生重复行；项目 `.gitignore` 已忽略 `.zcode/`（目录已在场，check-ignore 可匹配）时 init 不写本地排除

#### Scenario: 排除声明失败不阻断 init

- **WHEN** `.git/info/exclude` 不可写（如权限受限）
- **THEN** `init_experiment` 正常完成（枚举层兜底仍在），不因声明失败返回错误

### Requirement: 实验循环受迭代上限约束

会话 SHALL 支持配置迭代上限（默认 20）；达到上限后 run 与 log 工具 SHALL 返回明确的停止提示。

#### Scenario: 达到迭代上限

- **WHEN** 当前 segment 的实验数达到 maxIterations
- **THEN** 后续 run_experiment 拒绝执行并提示已达上限

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

### Requirement: clear_experiments 清空当前会话

`clear_experiments` 工具 SHALL 删除 `.auto/log.jsonl` 并重置运行时状态（segment 归零、无活动配置）；保留 `.auto/` 下其余文件（measure.sh/checks.sh/prompt.md 等）。`/autoresearch:clear` 命令 SHALL 调用该工具并向用户确认。

#### Scenario: 清空会话

- **WHEN** agent 调用 `clear_experiments`
- **THEN** `.auto/log.jsonl` 被删除，随后 `rebuildState` 得到空状态；其余 `.auto/` 文件保留

### Requirement: finalize 将保留实验整理为独立分支

`/autoresearch:finalize` 命令 SHALL 引导 agent 把账本中的 kept 实验按文件依赖分组，并通过 `scripts/finalize.sh` 从基线为每组创建独立分支（`autoresearch/<goal>/NN-<slug>`）。脚本 SHALL 以**增量口径**计算各组文件集：第 i 组的文件集为 `git diff --name-status <上一组 last_commit 或 merge-base> <本组 last_commit>`（剔除会话文件），查重校验与分支构造 SHALL 复用同一增量集合，故第 N 个分支只含本组改动。组内 status=D 的文件 SHALL 以删除语义落入分支（`git rm`），不得因 pathspec 错误失败。脚本 SHALL 验证各分支文件并集与原分支一致（剔除会话文件）；构造阶段的任何失败（含分支名冲突、verify 失败）SHALL 触发完整回滚，先恢复原分支再删除本次已建分支，不产生残留分支，修复输入后可立即重跑。`groups.json` 路径 SHALL 支持裸相对路径（相对调用者 cwd），解析经参数传递而非字符串插值，不受路径中引号影响；文件名含空格 SHALL 被正确处理（NUL 分隔枚举 + 整行比对）。

#### Scenario: 分组整理

- **WHEN** 账本含多个 kept commit 且改动文件不重叠
- **THEN** 生成多个独立分支，第 N 个分支只含第 N 组增量改动（不混入前序组文件），并集验证通过

#### Scenario: 组内含删除文件

- **WHEN** 某组的增量 diff 含 status=D 的文件
- **THEN** 该分支正确反映删除（文件不存在于分支树中），脚本成功完成

#### Scenario: 失败回滚

- **WHEN** 分组验证失败（如文件重叠未合并）或构造中途失败（如目标分支名已存在）
- **THEN** 脚本回滚（先恢复原分支、再删除本次已建分支，含正在构造中的分支），原分支状态不变，无残留分支，修复输入后重跑可成功

#### Scenario: 裸相对路径 groups.json

- **WHEN** 调用者以相对项目根的路径（如 `groups.json`）传入第二参数
- **THEN** 脚本正常解析并执行，不报模块找不到

#### Scenario: 含空格文件名

- **WHEN** 组内改动文件路径含空格
- **THEN** 文件被作为整体处理，分支内容与 overlap 校验均正确

### Requirement: 钩子教学与示例资产

插件 SHALL 提供钩子教学 skill（`autoresearch-hooks`）与开箱即用的示例脚本（`.auto/hooks/` 场景覆盖：防重复失败、换思路、假设反思、学习日志、完成通知、最优实验打标、时段自检），示例 SHALL 遵循迭代钩子 stdin 契约（before：`{event, cwd, next_run, last_run, session}`，`last_run` 含 `asi`；after：`{event, cwd, run_entry, session}`，`run_entry` 含 `asi`），SHALL 不依赖 jq（用 node 解析 stdin），可直接复制到 `.auto/hooks/` 使用。教学 skill SHALL 说明：钩子失败不阻断循环（fail-open）但会以 `*_steer` 返回 `[<stage> hook exited N]` / `[<stage> hook timed out after 30s]` 形式的错误提示，且每次触发会向账本追加 `{"type":"hook",…}` 观测条目。

时段自检示例（`hooks/examples/before/self-check.sh`）SHALL 提供墙钟维度的自检：以 `session.started_at_epoch` 为段起点、以本地状态文件（`.auto/selfcheck.state`）记录上次自检时刻，距上次自检超过间隔（默认 3600 秒）时注入一份自检问题清单（当前方向是结构性的还是又在浅层微调？失败是否做了根因分析？账本里有没有已暴露但未吸收的洞见？）；状态文件缺失视为从未自检；`started_at_epoch` 缺失（旧账本）或读取失败时 SHALL 静默。该示例仅在无人值守长跑等长会话场景有实际意义。

#### Scenario: 示例可直接使用

- **WHEN** 用户把示例脚本复制到 `.auto/hooks/before.sh` / `after.sh` 并 `chmod +x`
- **THEN** 循环中按契约触发（before 在 run 前、after 在 log 后），stdout 转 `*_steer`，payload 含 `asi`，脚本不因缺 jq 报错

#### Scenario: 教学 skill 指导编写

- **WHEN** agent 被要求"给这个循环加一个钩子"
- **THEN** `autoresearch-hooks` skill 提供契约、场景选型与 mock 测试步骤

#### Scenario: 时段自检按间隔触发

- **WHEN** 距 `.auto/selfcheck.state` 记录的上次自检超过 3600 秒（或状态文件不存在）
- **THEN** `before_steer` 注入自检问题清单，并刷新状态文件

#### Scenario: 时段自检间隔内静默

- **WHEN** 距上次自检不足间隔，或 stdin 的 `session.started_at_epoch` 缺失
- **THEN** 钩子静默退出（不注入、不写状态文件）

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

### Requirement: harness 编辑步与经验库资产

插件技能 SHALL 定义 **harness 编辑步**（advisory，二阶循环）：在 plateau、doom_loop、连续失败达到阈值、固定间隔（约 8 轮）或 segment 收尾时触发；触发后 SHALL 先写**编辑行**再动手，每行 `{component, change, observed, verdict}`，verdict SHALL 取 helped / hurt / no observed effect / confounded 之一，一次改动涉及多个组件且无执行可隔离归因时 SHALL 优先标 confounded（一行发明归因毒害整个经验库）。编辑 SHALL 遵循 KEEP_BASE 纪律：证据不支持的编辑 SHALL 不做（无编辑是合法结局）；可编辑面 SHALL 限于 `prompt.md` 表层区块（不得改写对 goal.md 与 scope.md 的逐字引用）、`ideas.md`、`.auto/hooks/` 配置与 repeat/segment 决策参数；`.auto/goal.md`、`.auto/scope.md` 与 measure.sh/checks.sh SHALL 不可编辑（范围边界的扩大或收窄不经编辑步：须由用户手改 scope.md 或 `init_experiment` 开新 segment）。表层目标的实质更换（更换度量代理或优化对象）SHALL 同样不经编辑步完成，而 SHALL 经 `init_experiment` 开新 segment。

插件 SHALL 定义 `.auto/experience.md` 为跨 segment 经验库：每个 segment 至多追加一条 lesson（`{cue, lesson, evidence, confidence}`），`cue` SHALL 描述模式适用的情境形状（非本任务事实），`lesson` SHALL 是可执行可检验的操作且指名组件，`evidence` SHALL 引用账本 run 号或编辑行；无具体可复用的行为对比时 SHALL 写 `NO_ENTRY` 而非编造。写作指引 SHALL 区分三类内容：workspace fact（本次验证的事实，标注仅此处成立）、procedure（可迁移操作）、too generic（禁止入库）。setup-guide SHALL 定义 `.auto/goal.md`（用户深层目标逐字原文）、`.auto/scope.md`（用户同意的 Files-in-scope 与 Off-Limits 原文）及 `prompt.md` 目标段、范围段对二者的逐字引用关系。`experience.md` SHALL 跨 segment 存活（clear 保留）；`/autoresearch:finalize` SHALL 在清理会话目录前与用户人审 `experience.md` 并把幸存 lesson 并入项目 AGENTS.md，删除 `.auto/` 的清理 SHALL 在该步骤完成后执行；跨项目复用旧 lesson 时 SHALL 按假设对待、重新验证。

#### Scenario: plateau 触发编辑行先行

- **WHEN** `plateau: true` 触发 harness 编辑步
- **THEN** 规程要求先产出编辑行（每行含 verdict），随后仅对可编辑面做小步修订；证据不指向任何编辑时不修改（KEEP_BASE）

#### Scenario: 多组件同改标 confounded

- **WHEN** 一次编辑同时修订 prompt.md 表层区块与 ideas.md，无执行可隔离归因
- **THEN** 该编辑行 verdict 为 confounded（归因不明是有用记录，编造归因禁止）

#### Scenario: 根不变表可变

- **WHEN** 编辑步修订 prompt.md
- **THEN** 目标段与 `.auto/goal.md` 逐字一致、范围段与 `.auto/scope.md` 逐字一致；二者的写请求被 PreToolUse hook deny

#### Scenario: 编辑步不得扩大范围

- **WHEN** plateau 下的编辑步认为某禁改目录值得纳入
- **THEN** 规程要求不修改 scope 引用，向用户提出扩围请求或建议新 segment；scope.md 的写请求被 hook deny

#### Scenario: lesson 带 evidence 或 NO_ENTRY

- **WHEN** segment 收尾且存在可迁移模式
- **THEN** `experience.md` 追加的 lesson 含 `{cue, lesson, evidence, confidence}`，evidence 引用具体 run 号；无行为对比时写 `NO_ENTRY`

#### Scenario: 三分写法约束入库内容

- **WHEN** 编辑步重建 ideas.md 或追加 lesson
- **THEN** 条目区分 workspace fact 与 procedure，不出现 too generic 条目（如"更彻底地优化"）

#### Scenario: finalize 先保真再清理

- **WHEN** 用户执行 `/autoresearch:finalize`
- **THEN** 命令流程在清理（`rm -r .auto`）之前包含 experience.md 人审并入 AGENTS.md 的步骤；未完成人审时 SHALL 不执行目录删除

### Requirement: 实验工具入口前置条件与段边界

`run_experiment` SHALL 要求存在 active session（账本中存在 config 行）；无 session 时 SHALL 在任何 benchmark 执行或配置写入前返回明确错误。`patchSessionConfig` SHALL 在写 `.auto/config.json` 前创建 `.auto/` 目录。`clear_experiments` 在账本不存在时 SHALL 幂等返回成功且不写文件；存在账本时 SHALL 删除账本并重置 `pendingChecksFailed` 与 `autoresearchOff`。`rebuildState` 遇到 config 行 SHALL 重置 `consecutiveFailures`、`lastRun`、`lastRunChecksFailed`，使新 segment 的连败、before-hook last_run 与 checks 状态不继承上一段。crash+脏树审计门（「上一 run 为 crash 且工作树未回滚 → 拒绝 run」）SHALL 以**账本全局最后一条 run 行**为判据，不因 config 行（segment 边界）豁免：脏树是物理状态，`init_experiment` 开新 segment 不能把它洗掉；为此会话状态 SHALL 额外维护一个不随 config 行重置的「全局最后一条 run」视图（before-hook 的 `last_run` 与 checks 标记仍按 segment 作用域重置，语义不变）。

#### Scenario: 未 init 时 run 被拒

- **WHEN** 账本无 config 行，agent 调用 `run_experiment`
- **THEN** 工具返回 `ok: false` 与 "call init_experiment first" 类错误，不执行 benchmark、不写 `.auto/config.json`

#### Scenario: 无 .auto 时 clear 幂等

- **WHEN** 项目目录没有 `.auto/`，agent 调用 `clear_experiments`
- **THEN** 工具返回成功与 "no active session" 信息，不抛 ENOENT、不创建 `.auto/`

#### Scenario: 跨 segment 状态重置

- **WHEN** segment 1 以 discard、crash 结束，随后 init segment 2 并只记录一次 discard
- **THEN** `consecutiveFailures` 为 1（不是 3），before hook 的 `last_run` 为 null；segment 2 的 checks 标记不继承 segment 1

#### Scenario: re-init 不解除 crash+脏树审计门

- **WHEN** 上一条 run 为 crash 且工作树有未回滚改动，agent 调用 `init_experiment` 开新 segment 后再调用 `run_experiment`
- **THEN** `run_experiment` 仍拒绝（audit: unrolled-back working-tree changes），直到脏树被回滚（discard/crash 记账或手工恢复）

### Requirement: 首条 keep 与 segment baseline 一致

审计 SHALL 以当前 segment 的首条有限 metric 作为 baseline；第一条 keep SHALL 不差于该 baseline（direction-aware，允许相等），否则 SHALL 拒绝写入。第一条 keep 通过后，后续 keep 仍按当前 retained 值比较。

#### Scenario: 首条 keep 比 baseline 差被拒

- **WHEN** segment 首条 discard 的 metric 为 42，第一条 keep 的 metric 为 45（lower is better）
- **THEN** `log_experiment` 返回 `keep_without_improvement` 审计错误，不写账本、不 commit

#### Scenario: 首条 keep 持平或更好放行

- **WHEN** baseline 为 42，第一条 keep 为 42 或 40
- **THEN** keep 正常写入并成为 retained

### Requirement: keep 提交排除 session dashboard

即使文件已预先暂存，keep 的自动提交 SHALL 排除 `.auto/` 与 `autoresearch-dashboard.html`；`isDirty` SHALL 同样忽略这两个 session 内容；回滚 SHALL 保留它们。只有 dashboard 变化时 keep SHALL 被 "no changes to commit" 拒绝。

#### Scenario: dashboard-only 改动不能 keep

- **WHEN** 工作区除 `autoresearch-dashboard.html` 外没有代码改动，agent 调用 keep
- **THEN** 工具拒绝并返回 "no changes to commit"，commit 不产生

#### Scenario: dashboard 不阻塞 crash 恢复

- **WHEN** 上一条 run 为 crash，工作区只有 dashboard 变化
- **THEN** `run_experiment` 不被 "unrolled-back working-tree changes" 拒绝

#### Scenario: 已暂存的 session 文件不得提交

- **WHEN** 新建或已跟踪的 `.auto/` 文件与 dashboard 已暂存，随后执行 keep
- **THEN** session 文件内容完整保留；没有代码改动时不产生 commit，有代码改动时仅提交代码

### Requirement: crash 返回值与账本一致

`log_experiment` 以 `status=crash` 记录时，账本行 metric SHALL 为 null，响应中的 metric 与 delta SHALL 同样为 null；不得用调用方传入的占位值计算 delta。

#### Scenario: crash 带 metric 也返回 null

- **WHEN** agent 以 `status:"crash", metric:7` 调用 `log_experiment`
- **THEN** 返回 `metric: null`、`delta: null`，账本行 metric 为 null

### Requirement: harness 留痕（强制记账）

harness 可编辑面（`.auto/prompt.md`、`.auto/ideas.md`、`.auto/experience.md`、`.auto/hooks/before.sh`、`.auto/hooks/after.sh`）的任何磁盘变更 SHALL 在账本留痕，不经 agent 自觉：`init_experiment` SHALL 记录可编辑面哈希基线（session config `harnessHashes`）；`run_experiment`、`log_experiment`、`export_dashboard` SHALL 在执行前对账，哈希相对基线变化的文件各追加一行 `{type:"harness_edit", ts, segment, file, digest_before, digest_after}` 并刷新基线。无基线的旧会话 SHALL 静默补基线、不追溯行。`.auto/config.json` 不在留痕集合内。留痕行 SHALL 只记机械事实（谁动了什么、何时），不承载归因，verdict 仍由编辑行与 experience.md 的 advisory 规程负责。

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

### Requirement: 段起步构思步与假设分层（反浅层认知引导）

循环规程（`SKILL.md` 与 `references/loop-protocol.md`）SHALL 载明一个段起步构思步：`init_experiment` 开启新 segment 后、对目标代码做**第一次改动之前**，agent SHALL 先产出候选假设清单写入 `.auto/ideas.md`（鼓励先做一轮外部调研——项目文档、相关代码库、web 检索——再读目标代码，以降低基线锚定），并为每个假设标注 tier 前缀：`[struct]`（结构/范式级改动）、`[tune]`（超参/调度/训练技巧）、`[ensemble]`（集成/种子类）。构思步 SHALL 附校准问题（adapted from AGENT4SCI research skill）：「这个清单里有没有把调参/集成伪装成结构改动？」「哪些方向是只在对基线做安全迭代？」。tier 前缀为 advisory 约定：MCP 工具对 `asi.hypothesis` 前缀不做任何校验，账本照实透传；未标注前缀的假设合法（向后兼容旧账本），仅使浅层连击提醒（见下一条 requirement）对其失去可见性。

#### Scenario: 新 segment 先构思再读代码

- **WHEN agent 调用 `init_experiment` 开启新 segment**
- **THEN** 循环规程要求在首次 `run_experiment` 之前先写带 tier 前缀的假设清单进 `ideas.md`，规程文本包含校准问题

#### Scenario: 前缀约定透传不校验

- **WHEN** agent 以 `asi: {hypothesis: "[tune] raise lr to 3e-4"}` 记录结果
- **THEN** 写入正常完成（无校验），账本 run 行的 `asi.hypothesis` 原样含前缀

#### Scenario: 未标注假设合法

- **WHEN** `asi.hypothesis` 不带任何 tier 前缀
- **THEN** `log_experiment` 正常接受，不产生警告或错误

### Requirement: 浅层连击提醒（idea-rotator 增强）

`idea-rotator` 示例钩子（`hooks/examples/before/idea-rotator.sh`）SHALL 在轮转建议之外增加浅层连击检查：读取账本（`.auto/log.jsonl`）最近至多 6 条 run 行的 `asi.hypothesis` tier 前缀，当**已标注**的假设 ≥3 条且全部为 `[tune]` 或 `[ensemble]`（无任何 `[struct]`）时，在 stdout 注入一条提醒（近期假设全是浅层改动、建议回到构思清单补一个结构方向）；stdout 保持 ≤8KB、脚本 fail-open、不依赖 jq。未标注前缀的假设不参与判定；账本缺失、run 行不足或已标注不足 3 条时 SHALL 静默。该提醒为 advisory（`before_steer`），不阻断循环。

#### Scenario: 全浅连击注入提醒

- **WHEN** 账本最近 6 条 run 的已标注假设 ≥3 条且全为 `[tune]`/`[ensemble]`
- **THEN** `before_steer` 含浅层连击提醒文案

#### Scenario: 存在结构假设不提醒

- **WHEN** 窗口内已标注假设含至少一条 `[struct]`
- **THEN** 不注入浅层提醒（轮转建议照常）

#### Scenario: 标注不足静默

- **WHEN** 账本无 run 行、窗口内已标注假设 <3 条，或账本文件不存在
- **THEN** 钩子静默（不注入浅层提醒，也不报错）

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

### Requirement: 账本追加完整性

`.auto/log.jsonl` 的追加写入 SHALL 保证行边界完整：既有文件非空且末尾不是换行符（如上次写入被进程终止截断）时，追加前 SHALL 先补一个换行，使新记录独立成行、不与残行拼接。账本读取遇到无法解析的坏行 SHALL 输出 stderr 诊断（含行号与截断的内容摘要），其余行照常返回——坏行仍被跳过（append-only 账本不做原地修复），但不得静默：丢失的 run 行会使后续 run 号错位、审计拒绝一切写入，诊断是用户定位真因的唯一线索。

#### Scenario: 截断行后追加不腐蚀

- **WHEN** `log.jsonl` 末尾是一条无换行的截断 JSON，随后写入新记录
- **THEN** 新记录独立成行且可被正常读回；截断行成为可诊断的坏行，不连带损毁新记录

#### Scenario: 坏行诊断

- **WHEN** `log.jsonl` 含一行无法解析的内容
- **THEN** 读取时 stderr 出现含行号的诊断，合法行全部正常返回

### Requirement: 实验提交隔离仓库钩子

keep 的自动提交与 finalize 的整理提交 SHALL 以 `--no-verify` 隔离目标仓库自身的 git 钩子（husky/lint-staged 类 pre-commit 会改写暂存内容或拒绝提交，破坏「commit 恰好描述本次实验」的不变量）。提交失败时 SHALL 把 git 的 stderr 附进抛出的错误信息（不得以 `stdio: "ignore"` 吞掉诊断）。

#### Scenario: pre-commit 钩子不改写实验提交

- **WHEN** 目标仓库存在会改写暂存文件的 pre-commit 钩子，agent 以 keep 记录
- **THEN** commit 内容与暂存时一致（钩子未执行）

#### Scenario: 提交失败带诊断

- **WHEN** `git commit` 因仓库配置（如缺 user.email）失败
- **THEN** 抛出的错误信息包含 git 的 stderr 文本，而非裸的 "Command failed"

### Requirement: workingDir 失效显式失败

`.auto/config.json` 的 `workingDir` 已设置（非空字符串）但解析目标不存在或不是目录时，MCP 工具层 SHALL 显式失败并给出含该路径的明确错误（不得静默回退项目根——回退会把 discard/crash 的 `checkout HEAD -- . + clean -fd` 指向项目根，销毁研究目录之外的用户文件）。hook 层 SHALL 保持 fail-open（回退项目目录），但 SHALL 输出 stderr 诊断。config.json 整体不可解析时，工具与 hook 均 SHALL 输出 stderr 诊断后回退项目目录（与「无 config」的静默回退区分开）。

#### Scenario: workingDir 目录缺失

- **WHEN** config 设置了 `workingDir: "work/"` 但该目录不存在，agent 调用任一实验工具
- **THEN** 工具返回明确错误（含失效路径与修复提示），不执行任何 git/基准操作

#### Scenario: hook 对失效 workingDir fail-open 且出诊断

- **WHEN** workingDir 失效时触发 PreToolUse/Stop 等 hook
- **THEN** hook 回退项目目录继续判定（不因异常崩溃），stderr 含诊断行

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
