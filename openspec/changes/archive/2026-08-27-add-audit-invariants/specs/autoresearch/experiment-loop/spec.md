## MODIFIED Requirements

### Requirement: log_experiment 记录结果并执行 git 语义

`log_experiment` 工具 SHALL 接受主度量值、status（keep/discard/crash/checks_failed/noop）、描述与可选次级度量；keep 时自动 `git add -A` + commit（message 带 `experiment:` 前缀与结构化结果），非 keep（discard/crash/checks_failed）时丢弃工作区改动但豁免 `.auto/` 目录，noop 不回滚；记录追加到 `.auto/log.jsonl` 并回填真实短 hash。工具 SHALL 在写入前校验账本不变量，违规 SHALL 拒绝写入并返回错误：

- **keep 必须真实改进**：metric 相对当前保留值（direction-aware）必须更优（首条 baseline 允许持平）；
- **discard 真改进必须有 failed guard**：metric 相对当前保留值改进时，仅 `checks_failed` 允许丢弃，其它 discard/crash 判违规；
- **事件顺序**：run 号连续、segment 与当前 config 一致；
- **基线先于一切**：任何实验前必须先有 baseline（config + 首条 run）；
- **commit 字段一致性**：keep 行 commit 必须非空、非 keep 行 commit 必须为空。

#### Scenario: keep 自动提交

- **WHEN** agent 以 status=keep 调用且 metric 相对当前保留值改进
- **THEN** 产生 `experiment:` 前缀 commit，账本回填真实短 hash

#### Scenario: keep 未改进被拒

- **WHEN** agent 以 status=keep 调用但 metric 未优于当前保留值
- **THEN** 工具拒绝写入并返回错误（提示改用 discard 或说明）

#### Scenario: discard 真改进无 failed guard 被拒

- **WHEN** agent 以 status=discard 调用且 metric 优于当前保留值、但上次 checks 未失败
- **THEN** 工具拒绝写入并返回错误（提示真改进不应丢弃，或注明 checks 失败）

#### Scenario: discard 自动回滚且豁免会话目录

- **WHEN** agent 以 status=discard 调用且校验通过
- **THEN** 工作区改动被丢弃（checkout+clean），`.auto/` 内容完整保留，账本追加 discard 行

#### Scenario: noop 不回滚

- **WHEN** agent 以 status=noop 调用（未改动代码）
- **THEN** 工作区保持不变，账本追加 noop 行

#### Scenario: after 钩子执行

- **WHEN** `.auto/hooks/after.sh` 存在且可执行
- **THEN** 钩子在记录后被执行，返回中 `after_steer` 为其 stdout；钩子失败不阻断记录

#### Scenario: doom-loop 检测

- **WHEN** 最近 4 条 run 的假设为 A→B→A→B（如"试埃氏筛"、"试位运算"、"试埃氏筛变体"、"试位运算变体"）
- **THEN** 返回 `doom_loop: true`，`next_action_hint` 提示停止重复尝试

#### Scenario: 事件顺序违规

- **WHEN** 拟追加的 run 号与账本不连续或 segment 不匹配
- **THEN** 工具拒绝写入并返回错误

#### Scenario: checks 失败禁止 keep

- **WHEN** 上一次 run 的 checks 失败而 agent 试图以 keep 记录
- **THEN** 工具拒绝 keep 并返回错误提示

### Requirement: run_experiment 运行基准并解析度量

`run_experiment` 工具 SHALL 接受任意 shell 命令，记录 wall-clock 时长，解析输出中形如 `METRIC name=value` 的行，并把给 LLM 的回传截断为紧凑摘要（约 10 行/4KB），同时提供完整输出的日志文件路径。工具 SHALL 支持 `repeat` 参数（正整数，默认 1）：当 `repeat > 1` 时重复运行基准 `repeat` 次，返回每次的度量值列表与主度量的**中位数**；checks 背压 SHALL 只在最后一次运行后执行一次。工具 SHALL 在基准执行前执行 `.auto/hooks/before.sh`（若存在且可执行）。工具 SHALL 在开始时检查上一轮状态：若上一条 run 为 crash/error 且工作区仍有未回滚改动，SHALL 拒绝开始并提示先回滚或 `clear_experiments`。

#### Scenario: 度量解析

- **WHEN** benchmark 输出包含 `METRIC time_ms=42` 且主度量名为 time_ms
- **THEN** 工具返回中包含该度量值及 `Use these values directly in log_experiment` 的机器可读提示

#### Scenario: crash 未回滚禁续跑

- **WHEN** 上一条 run 为 crash 且 `git status` 显示工作区有改动（除 `.auto/`）
- **THEN** 工具拒绝开始，提示先回滚或清空会话

#### Scenario: 重复运行取中位数

- **WHEN** agent 以 `repeat: 3` 调用且三次输出 `METRIC time_ms` 为 42/44/41
- **THEN** 工具返回 `metrics` 数组含三个值、`median_metric: 42`（中位数），checks 只执行一次

#### Scenario: before 钩子执行

- **WHEN** `.auto/hooks/before.sh` 存在且可执行，且其 stdout 为一段建议文本
- **THEN** 钩子在基准前被执行，返回中 `before_steer` 为该文本；钩子不存在或退出码非零时返回为空且基准仍执行

#### Scenario: 命令超时

- **WHEN** benchmark 超过配置的超时秒数（默认 600）
- **THEN** 进程组被终止，返回结果标记为超时失败
