## MODIFIED Requirements

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
