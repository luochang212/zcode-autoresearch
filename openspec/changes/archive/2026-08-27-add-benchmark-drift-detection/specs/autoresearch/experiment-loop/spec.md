## MODIFIED Requirements

### Requirement: init_experiment 建立实验会话

`init_experiment` 工具 SHALL 接受会话名、主度量名、可选度量单位与方向（lower/higher，默认 lower），并在 `.auto/log.jsonl` 追加一条 config 记录；重复调用时 SHALL 递增 segment，使新目标的数据不污染旧 baseline。当 `.auto/config.json` 含 `workingDir` 时，工具 SHALL 将该目录解析为**研究目录**：此后 init/run/log、git 操作、迭代钩子与 dashboard 全部作用于该目录（config 文件本身留在项目目录）。工具 SHALL 在 config 记录中包含**冻结文件哈希**（`measure.sh` 与 `checks.sh` 存在时的 sha256）；文件不存在时为 null（"首见即基准"——首次运行时记录）。

#### Scenario: 首次初始化
- **WHEN** agent 调用 `init_experiment` 并给出 name/metric_name/direction
- **THEN** `.auto/log.jsonl` 出现一条 config 记录，包含 name、metricName、direction、segment 与冻结文件哈希

#### Scenario: 更换优化目标
- **WHEN** agent 在已有结果后再次调用 `init_experiment`
- **THEN** segment 递增，后续 baseline 与 best 只在该新 segment 内计算

#### Scenario: workingDir 重定向
- **WHEN** 项目 `.auto/config.json` 含 `workingDir: "work/"` 且该目录存在
- **THEN** 账本写于 `work/.auto/log.jsonl`，benchmark 命令与 git 操作在 `work/` 下执行

### Requirement: run_experiment 运行基准并解析度量

`run_experiment` 工具 SHALL 接受任意 shell 命令，记录 wall-clock 时长，解析输出中形如 `METRIC name=value` 的行，并把给 LLM 的回传截断为紧凑摘要（约 10 行/4KB），同时提供完整输出的日志文件路径。工具 SHALL 支持 `repeat` 参数（正整数，默认 1）。工具 SHALL 在基准执行前执行 `.auto/hooks/before.sh`（若存在且可执行）。工具 SHALL 在开始时检查上一轮状态（crash 未回滚禁续跑），并**比对冻结文件哈希**：当前 `measure.sh`/`checks.sh` 的 sha256 与会话记录值不一致时，返回 `benchmark_drift: true` 警告（不阻断执行）："基准自会话开始后已变更，前后 metric 不可比，建议 init_experiment 开新 segment 或确认变更"；首见（记录为 null）时记录当前哈希作为基准。

#### Scenario: 漂移警告
- **WHEN** 会话开始后 `measure.sh` 被修改（hash 变化）
- **THEN** run_experiment 返回 `benchmark_drift: true` 与警告信息，基准仍执行

#### Scenario: 无漂移静默
- **WHEN** 冻结文件未被修改
- **THEN** 返回不含 `benchmark_drift`（或为 false）

#### Scenario: 首见记录
- **WHEN** init 时 `measure.sh` 不存在（hash 为 null），首次 run 时已存在
- **THEN** 记录当前哈希作为会话基准，不产生漂移警告

#### Scenario: 度量解析
- **WHEN** benchmark 输出包含 `METRIC time_ms=42` 且主度量名为 time_ms
- **THEN** 工具返回中包含该度量值及 `Use these values directly in log_experiment` 的机器可读提示

#### Scenario: 重复运行取中位数
- **WHEN** agent 以 `repeat: 3` 调用且三次输出 `METRIC time_ms` 为 42/44/41
- **THEN** 工具返回 `metrics` 数组含三个值、`median_metric: 42`（中位数），checks 只执行一次

#### Scenario: before 钩子执行
- **WHEN** `.auto/hooks/before.sh` 存在且可执行，且其 stdout 为一段建议文本
- **THEN** 钩子在基准前被执行，返回中 `before_steer` 为该文本；钩子不存在或退出码非零时返回为空且基准仍执行

#### Scenario: 命令超时
- **WHEN** benchmark 超过配置的超时秒数（默认 600）
- **THEN** 进程组被终止，返回结果标记为超时失败

#### Scenario: crash 未回滚禁续跑
- **WHEN** 上一条 run 为 crash 且 `git status` 显示工作区有改动（除 `.auto/`）
- **THEN** 工具拒绝开始，提示先回滚或清空会话
