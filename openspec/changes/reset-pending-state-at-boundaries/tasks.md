# Tasks

## 1. 边界重置机制

- [x] 1.1 types.ts：`SessionConfig` 注释声明 `pending*` 前缀约定（server 跨调用机制态，init/clear 边界整体清除）
- [x] 1.2 server.ts：`resetPendingState()` helper（读 config → 删全部 `pending*` 键 → 写回；config 不存在时不创建）
- [x] 1.3 `toolInitExperiment`：接线 `resetPendingState()`，移除逐字段的 `pendingChecksFailed: false`
- [x] 1.4 `toolClearExperiments`：接线 `resetPendingState()` 并移到早退之前（无条件清除）；`autoresearchOff` 重置保持现状（仅活动 session 路径）

## 2. 测试（红→绿）

- [x] 2.1 红测已运行（2026-11-07 临时脚本，真实 server）：stale `pendingObservation`（metric 123）跨 clear→init 与仅 init 两条路径均使 `log_experiment(discard, 123)` 落行
- [x] 2.2 回归：seed 残留观测 → init → log(metric 123) 被拒（提示先 run_experiment），账本无行
- [x] 2.3 回归：seed 残留观测 → clear 早退路径（无 log.jsonl）→ init → log 被拒；且 clear 返回值不变（「no active session to clear」）
- [x] 2.4 非 pending 键保留：init/clear 后 `benchmarkHashes` 等原样存在
- [x] 2.5 正常流守护：init → run（受控基准 metric 7）→ log(metric 7) 成功——重置不拦新观测
- [x] 2.6 全量 npm test 通过

## 3. 文档与验证

- [x] 3.1 README（EN/CN）观测对账 bullet 补一句：pending 态在 init/clear 边界整体清除
- [x] 3.2 `openspec validate --strict reset-pending-state-at-boundaries` 通过
- [x] 3.3 adrkit note 留痕：聚合重复收编候选（下次动 confidence 语义时）；state.json 拆分候选（pending 键增多时重提）
- [x] 3.4 归档合入主规范
