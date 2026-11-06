## MODIFIED Requirements

### Requirement: log_experiment 记录结果并执行 git 语义

`log_experiment` 工具 SHALL 接受主度量值、status（keep/discard/crash/checks_failed/noop）、描述与可选次级度量；keep 时自动 stage 当前全部改动（**排除会话状态**：`.auto/` 与 `.zcode/` 会话目录、生成的 dashboard）并 commit（message 带 `experiment:` 前缀与结构化结果），非 keep（discard/crash/checks_failed）时丢弃工作区改动但豁免会话状态，noop 不回滚；记录追加到 `.auto/log.jsonl` 并回填真实短 hash。status=crash 时 metric SHALL 记为 null（不得写入占位 0）：crash 行不参与 baseline/best/置信度/平台期计算，避免污染后续 delta 显示。工具 SHALL 在记录后执行 `.auto/hooks/after.sh`（若存在且可执行），stdin 为单行 JSON：`{event:"after", cwd, run_entry, session}`，其中 `run_entry` SHALL 透传本条 run 的 `{run, status, metric, description, commit, asi}`（无 asi 时为 null）；`session` SHALL 含与 before 钩子一致的同一组字段（`{metric_name, direction, baseline_metric, best_metric, run_count, started_at_epoch, goal}`），`started_at_epoch` 为同一 segment 起始时刻的 epoch 秒（账本无 config 行时为 null）；`goal` 同前，为同一会话名；钩子失败 SHALL 不阻断记录，但 SHALL 以 `after_steer` 返回错误提示；每次触发 SHALL 向 `.auto/log.jsonl` 追加 `{type:"hook", stage:"after", …}` 观测条目。工具 SHALL 在写入前校验账本不变量与**次级度量约束**，违规 SHALL 拒绝写入并返回错误：

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

## ADDED Requirements

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
