# Proposal

## Why

全仓 review 的 worth-fix 收尾时追问「这些是根因级修复还是西西弗斯」：上一轮的 checks_failed 有据门与 noop 脏树警告同属一个根因类——**观测面与声明面脱钩**。`run_experiment` 是系统唯一的观测者（跑基准、解析 METRIC、跑 checks），但观测结果随响应丢失，仅持久化一个布尔（`pendingChecksFailed`）；`log_experiment` 落账的全部量化内容（metric、status）来自 agent 转抄。于是审计不变量全部运转在转抄值上，每一类「声明 ≠ 观测」错位都要等事故再补一条 cross-check：checks_failed 自证（已修）、metric 转抄无人校验、假 crash（观测到有效度量却报「没测到」）、凭空落账（不 run 直接 log）、一次 run 多次 log——红测已逐一坐实（2026-11-06）。不在机制层绑定，这类补丁永远修不完。

## What Changes

- `run_experiment` 每次实际执行基准后（含失败：非零退出/超时/spawn 失败）把观测快照持久化到 `.auto/config.json` 的 `pendingObservation`（metric 中位数、按名聚合 metrics、exit_code、timed_out、at），跨重启存活，下次 run 覆盖
- `log_experiment` 落账前消费快照并对账（事实门，与 keep 门同层、不受 `auditBypass` 影响）：无快照拒绝（一次 run 对应一次成功 log，被拒的 log 不消费）；非 crash 的 metric SHALL 等于观测值；crash 仅在未观测到有效度量时有据
- run 行落机械树状态事实：`treeDirty`（落账时刻，会话状态豁免口径）与 `residual`（回滚残留非空时）——收编上一轮「明确不修」的 discard-residual 持久化；`run_experiment` 在上一 run 残留非空且树仍脏时返回 advisory 警告
- `parseMetricLines` 对「形似 METRIC 但解析失败」的行返回 nearMisses，server 写 stderr——字符集类的静默丢失永久变为响亮诊断（never-silent 原则补齐）
- **决策权不动**：keep/discard/noop 仍由 agent 判断；基准失败时 keep 的既有 advisory 政策不变（benchmark_warning 照常）——本 change 只裁事实一致性，不收紧决策空间（与 ADR-5「对账不裁判」同构）

## Capabilities

### New Capabilities

（无）

### Modified Capabilities

（无既有 requirement 文本变更；新增 requirement 见 specs/）

> 注：experiment-loop capability 新增「run 观测快照与 log 对账」requirement；既有 log_experiment/checks requirement 的语义（checks_failed 有据门、keep 门）保持不变——`pendingChecksFailed` 键与其语义原样保留。
