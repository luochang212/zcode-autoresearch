## Purpose

定义 zcode autoresearch 插件的实验循环行为契约：init/run/log 三件套工具的输入输出、账本格式与 segment、度量解析与判定、git 提交/回滚语义，以及迭代上限。

## ADDED Requirements

### Requirement: init_experiment 建立实验会话

`init_experiment` 工具 SHALL 接受会话名、主度量名、可选度量单位与方向（lower/higher，默认 lower），并在 `.auto/log.jsonl` 追加一条 config 记录；重复调用时 SHALL 递增 segment，使新目标的数据不污染旧 baseline。

#### Scenario: 首次初始化

- **WHEN** agent 调用 `init_experiment` 并给出 name/metric_name/direction
- **THEN** `.auto/log.jsonl` 出现一条 config 记录，包含 name、metricName、direction 与递增的 segment 号

#### Scenario: 更换优化目标

- **WHEN** agent 在已有结果后再次调用 `init_experiment`
- **THEN** segment 递增，后续 baseline 与 best 只在该新 segment 内计算

### Requirement: run_experiment 运行基准并解析度量

`run_experiment` 工具 SHALL 接受任意 shell 命令，记录 wall-clock 时长，解析输出中形如 `METRIC name=value` 的行，并把给 LLM 的回传截断为紧凑摘要（约 10 行/4KB），同时提供完整输出的日志文件路径。

#### Scenario: 度量解析

- **WHEN** benchmark 输出包含 `METRIC time_ms=42` 且主度量名为 time_ms
- **THEN** 工具返回中包含该度量值及 `Use these values directly in log_experiment` 的机器可读提示

#### Scenario: 命令超时

- **WHEN** benchmark 超过配置的超时秒数（默认 600）
- **THEN** 进程组被终止，返回结果标记为超时失败

### Requirement: log_experiment 记录结果并执行 git 语义

`log_experiment` 工具 SHALL 接受主度量值、status（keep/discard/crash/checks_failed）、描述与可选次级度量；keep 时自动 `git add -A` + commit（message 带 `experiment:` 前缀与结构化结果），非 keep 时丢弃工作区改动但豁免 `.auto/` 目录；记录追加到 `.auto/log.jsonl` 并回填真实短 hash。

#### Scenario: keep 自动提交

- **WHEN** agent 以 status=keep 调用 `log_experiment`
- **THEN** 产生一个 `experiment:` 前缀的 commit，账本该行记录真实短 hash，工作区改动保留

#### Scenario: discard 自动回滚且豁免会话目录

- **WHEN** agent 以 status=discard 调用 `log_experiment`
- **THEN** 工作区改动被丢弃（checkout+clean），`.auto/` 目录内容完整保留，账本追加 discard 行

#### Scenario: checks 失败禁止 keep

- **WHEN** 上一次 run 的 checks 失败而 agent 试图以 keep 记录
- **THEN** 工具拒绝 keep 并返回错误提示

### Requirement: 实验循环受迭代上限约束

会话 SHALL 支持配置迭代上限（默认 20）；达到上限后 run 与 log 工具 SHALL 返回明确的停止提示。

#### Scenario: 达到迭代上限

- **WHEN** 当前 segment 的实验数达到 maxIterations
- **THEN** 后续 run_experiment 拒绝执行并提示已达上限
