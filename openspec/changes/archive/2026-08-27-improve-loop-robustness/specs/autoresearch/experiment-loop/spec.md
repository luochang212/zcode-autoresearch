## MODIFIED Requirements

### Requirement: log_experiment 记录结果并执行 git 语义

`log_experiment` 工具 SHALL 接受主度量值、status（keep/discard/crash/checks_failed/noop）、描述与可选次级度量；keep 时自动 `git add -A` + commit（message 带 `experiment:` 前缀与结构化结果），非 keep（discard/crash/checks_failed）时丢弃工作区改动但豁免 `.auto/` 目录，noop 不回滚；记录追加到 `.auto/log.jsonl` 并回填真实短 hash。工具 SHALL 在返回中包含 `doom_loop` 标志：当最近 run 的假设呈连续重复或 A→B→A→B 震荡时置 true，且 `next_action_hint` 提示"停止重复，换结构性方向"。

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

#### Scenario: doom-loop 检测
- **WHEN** 最近 4 条 run 的假设为 A→B→A→B（如"试埃氏筛"、"试位运算"、"试埃氏筛变体"、"试位运算变体"）
- **THEN** 返回 `doom_loop: true`，`next_action_hint` 提示停止重复尝试

#### Scenario: checks 失败禁止 keep
- **WHEN** 上一次 run 的 checks 失败而 agent 试图以 keep 记录
- **THEN** 工具拒绝 keep 并返回错误提示
