## MODIFIED Requirements

### Requirement: run_experiment 运行基准并解析度量

`run_experiment` 工具 SHALL 接受任意 shell 命令，记录 wall-clock 时长，解析输出中形如 `METRIC name=value` 的行，并把给 LLM 的回传截断为紧凑摘要（约 10 行/4KB），同时提供完整输出的日志文件路径。工具 SHALL 支持 `repeat` 参数（正整数，默认 1）：当 `repeat > 1` 时重复运行基准 `repeat` 次，返回每次的度量值列表与主度量的**中位数**；checks 背压 SHALL 只在最后一次运行后执行一次。

#### Scenario: 度量解析
- **WHEN** benchmark 输出包含 `METRIC time_ms=42` 且主度量名为 time_ms
- **THEN** 工具返回中包含该度量值及 `Use these values directly in log_experiment` 的机器可读提示

#### Scenario: 重复运行取中位数
- **WHEN** agent 以 `repeat: 3` 调用且三次输出 `METRIC time_ms` 为 42/44/41
- **THEN** 工具返回 `metrics` 数组含三个值、`median_metric: 42`（中位数），checks 只执行一次

#### Scenario: 命令超时
- **WHEN** benchmark 超过配置的超时秒数（默认 600）
- **THEN** 进程组被终止，返回结果标记为超时失败

## ADDED Requirements

### Requirement: log_experiment 报告平台期与置信度

`log_experiment` 工具 SHALL 在返回中包含 `plateau` 标志：当前 segment 最近 `window`（默认 5）轮的有效度量中，相对窗口起点度量的最佳改善比例低于 `min_improvement`（默认 1%）时为 true（窗口不足时不判定）。`confidence`（MAD 校准）SHALL 作为返回的显著字段置于 delta 之后、next_action_hint 之前。

#### Scenario: 平台期检测
- **WHEN** 最近 5 轮 metric 为 4.1/4.2/4.0/4.3/4.2（相对首轮 4.1 的最佳改善约 2.4%）
- **THEN** `plateau: false`（改善超阈值）；若为 4.1/4.1/4.05/4.2/4.1（最佳改善 < 1%）则 `plateau: true`

#### Scenario: 返回字段顺序
- **WHEN** agent 以 keep 记录一次实验
- **THEN** 返回中 `confidence` 出现在 `delta` 之后、`next_action_hint` 之前
