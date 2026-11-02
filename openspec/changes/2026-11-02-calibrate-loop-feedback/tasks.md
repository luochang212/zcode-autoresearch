# 任务：实验循环反馈校准

## 1. plateau 校准（P1）

- [x] 1.1 `lib/types.ts`：SessionConfig 增加可选键 `plateauWindow` / `plateauMinImprovement` / `deterministic`（注释标明语义与默认）
- [x] 1.2 `lib/ledger.ts`：新增导出 `plateauCalibration(cwd)`（读 config、非法回退默认、返回 `{ minImprovement?, window?, deterministic }`）
- [x] 1.3 `server.ts`：`sessionState()` 与 log 后 `rebuildState` 传入校准；init 接受 `plateau_min_improvement` / `plateau_window` / `deterministic` 三个可选参数（校验 + 未传不覆盖地持久化进 config）；plateau 提示文案参数化（窗口/阈值/是否建议 repeat），`deterministic: true` 时无 repeat 建议
- [x] 1.4 `hooks/stop-continue.ts`：rebuildState 传入校准，stderr 文案随配置（窗口/阈值/是否建议 repeat）
- [x] 1.5 init_experiment 工具 schema 与 README（中英）补参数说明

## 2. 回滚显式回报（P3）

- [x] 2.1 `lib/git.ts`：`rollbackWorkingTree` 返回 `{ rolledBack, restoredTo, residual }`（restore 前取 dirtyFiles、后取 safeShortHash）
- [x] 2.2 `server.ts` log：非 keep 且非 noop 落账返回 `rolled_back: { restored_to, files (≤20), total_files }`；residual 语义与字段不变

## 3. 提示去重与可读性（P4 + P2）

- [x] 3.1 `server.ts`：revisit_nudge 收窄到「本次落账为 discard/checks_failed 且（含本次行的）segment 存在带理由的 discard/checks_failed 行」
- [x] 3.2 `server.ts`：confidence 返回加 `unit: "× noise"`（账本行快照不动）；返回加 `runs_left`；`runs_left ∈ [1,2]` 时 baseHint 插入接近上限提示
- [x] 3.3 `hooks/memory-inject.ts`：best 轨迹方向标签去掉内层 14 字符截断；弃用理由截断 60→120

## 4. 测试

- [x] 4.1 `tests/mcp-integration.test.ts`：revisit 语义改写（discard 落账触发、keep 落账省略、首次带理由 discard 即触发、新 segment 重置）；新增 plateau 校准用例（init 传 `plateau_min_improvement` → 小改善不再报 plateau；`deterministic` → 提示无 repeat 建议；默认行为逐字不变）；新增 `rolled_back` / `runs_left` / confidence `unit` 断言
- [x] 4.2 `tests/git.test.ts`：rollback 返回结构（rolledBack 清单、restoredTo 短哈希、residual 空与非空两路）
- [x] 4.3 `tests/hooks.test.ts`：stop-continue 在配置校准后文案随之变化（不误报 1%）

## 5. 验证与收尾

- [x] 5.1 `npm test` 全量通过；`npm run lint && npm run fmt:check && npm run typecheck` 通过
- [x] 5.2 `openspec validate --strict 2026-11-02-calibrate-loop-feedback` 通过
- [x] 5.3 分批提交（spec / feat / test / docs，同一文件只进一个提交）
