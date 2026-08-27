## MODIFIED Requirements

### Requirement: log_experiment 记录结果并执行 git 语义

`log_experiment` 工具 SHALL 接受主度量值、status（keep/discard/crash/checks_failed/noop）、描述与可选次级度量；keep 时自动 `git add -A` + commit（message 带 `experiment:` 前缀与结构化结果），非 keep（discard/crash/checks_failed）时丢弃工作区改动但豁免 `.auto/` 目录，noop 不回滚；记录追加到 `.auto/log.jsonl` 并回填真实短 hash。工具 SHALL 在写入前校验账本不变量与**次级度量约束**，违规 SHALL 拒绝写入并返回错误：

- **次级度量约束**：当调用含 `constraints: [{ name, maxPct }]` 且 status=keep 时，工具 SHALL 校验该次级度量（来自本次 run 的 metrics 字典）不超过"当前 segment 首条 run 该度量值"的 maxPct%；超界 SHALL 拒收 keep（返回错误提示放宽约束或改判）；无 constraints 或非 keep 时不校验。

#### Scenario: keep 自动提交

- **WHEN** agent 以 status=keep 调用且 metric 相对当前保留值改进
- **THEN** 产生 `experiment:` 前缀 commit，账本回填真实短 hash

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
