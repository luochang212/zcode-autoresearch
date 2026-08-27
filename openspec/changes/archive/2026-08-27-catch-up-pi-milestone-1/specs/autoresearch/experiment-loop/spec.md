## MODIFIED Requirements

### Requirement: run_experiment 运行基准并解析度量

`run_experiment` 工具 SHALL 接受任意 shell 命令，记录 wall-clock 时长，解析输出中形如 `METRIC name=value` 的行，并把给 LLM 的回传截断为紧凑摘要（约 10 行/4KB），同时提供完整输出的日志文件路径。工具 SHALL 支持 `repeat` 参数（正整数，默认 1）：当 `repeat > 1` 时重复运行基准 `repeat` 次，返回每次的度量值列表与主度量的**中位数**；checks 背压 SHALL 只在最后一次运行后执行一次。工具 SHALL 在基准执行前执行 `.auto/hooks/before.sh`（若存在且可执行）：以单行 JSON 写入 stdin（含 event/cwd/next_run/last_run/session），30 秒超时，stdout 截断至 8KB 并作为 `before_steer` 字段返回；钩子失败 SHALL 不阻断基准执行（fail-open）。

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

### Requirement: log_experiment 记录结果并执行 git 语义

`log_experiment` 工具 SHALL 接受主度量值、status（keep/discard/crash/checks_failed/noop）、描述与可选次级度量；keep 时自动 `git add -A` + commit（message 带 `experiment:` 前缀与结构化结果），非 keep（discard/crash/checks_failed）时丢弃工作区改动但豁免 `.auto/` 目录，noop 不回滚；记录追加到 `.auto/log.jsonl` 并回填真实短 hash。工具 SHALL 在记录后执行 `.auto/hooks/after.sh`（若存在且可执行）：以单行 JSON 写入 stdin（含 event/cwd/run_entry/session），30 秒超时，stdout 截断至 8KB 并作为 `after_steer` 字段返回；钩子失败 SHALL 不阻断记录（fail-open）。

#### Scenario: keep 自动提交
- **WHEN** agent 以 status=keep 调用 `log_experiment`
- **THEN** 产生一个 `experiment:` 前缀的 commit，账本该行记录真实短 hash，工作区改动保留

#### Scenario: discard 自动回滚且豁免会话目录
- **WHEN** agent 以 status=discard 调用 `log_experiment`
- **THEN** 工作区改动被丢弃（checkout+clean），`.auto/` 目录内容完整保留，账本追加 discard 行

#### Scenario: noop 不回滚
- **WHEN** agent 以 status=noop 调用（未改动代码）
- **THEN** 工作区保持不变，账本追加 noop 行

#### Scenario: after 钩子执行
- **WHEN** `.auto/hooks/after.sh` 存在且可执行
- **THEN** 钩子在记录后被执行，返回中 `after_steer` 为其 stdout；钩子失败不阻断记录

#### Scenario: checks 失败禁止 keep
- **WHEN** 上一次 run 的 checks 失败而 agent 试图以 keep 记录
- **THEN** 工具拒绝 keep 并返回错误提示

## ADDED Requirements

### Requirement: clear_experiments 清空当前会话

`clear_experiments` 工具 SHALL 删除 `.auto/log.jsonl` 并重置运行时状态（segment 归零、无活动配置）；保留 `.auto/` 下其余文件（measure.sh/checks.sh/prompt.md 等）。`/autoresearch:clear` 命令 SHALL 调用该工具并向用户确认。

#### Scenario: 清空会话
- **WHEN** agent 调用 `clear_experiments`
- **THEN** `.auto/log.jsonl` 被删除，随后 `rebuildState` 得到空状态；其余 `.auto/` 文件保留
