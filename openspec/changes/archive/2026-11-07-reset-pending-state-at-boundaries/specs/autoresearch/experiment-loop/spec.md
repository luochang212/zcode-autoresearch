## ADDED Requirements

### Requirement: 跨调用 pending 态的边界重置

`.auto/config.json` 中以 `pending` 为前缀的键 SHALL 视为 server 跨调用机制态（与用户配置、会话基线区分）。`init_experiment` 与 `clear_experiments` SHALL 在边界处整体清除全部 `pending*` 键（含 `clear_experiments` 因无 `log.jsonl` 早退的路径），使上一 session 残留的观测快照（`pendingObservation`）与 checks 判定（`pendingChecksFailed`）SHALL NOT 为新 segment 的落账背书。清除 SHALL NOT 触及非 `pending` 前缀的键（用户配置与会话基线原样保留）；`init_experiment` 之后正常 `run_experiment` → `log_experiment` 的对账流 SHALL 不受影响。

#### Scenario: init 清除上一 session 的残留观测

- **WHEN** config.json 带有上一 session 未消费的 `pendingObservation`（metric 123），agent 调用 `init_experiment` 开新 segment 后以 metric 123 调用 `log_experiment`
- **THEN** 落账被拒（无观测快照，提示先 run_experiment），账本不落行

#### Scenario: clear 早退路径同样清除

- **WHEN** config.json 带有残留 `pending*` 键但 `log.jsonl` 不存在，agent 调用 `clear_experiments`
- **THEN** 工具照常返回「no active session to clear」，且 config.json 中 `pending*` 键已全部清除

#### Scenario: 非 pending 键不受清除影响

- **WHEN** `init_experiment` 或 `clear_experiments` 执行边界重置
- **THEN** `maxIterations`、`benchmarkHashes`、`harnessHashes`、`autoresearchOff` 等非 `pending` 前缀键原样保留

#### Scenario: 正常 run→log 流不受影响

- **WHEN** `init_experiment` 后 agent 正常 `run_experiment`（受控基准输出 metric 7）并以 metric 7 调用 `log_experiment`
- **THEN** 落账成功——边界重置只清残留，不拦截本 segment 内的新观测
