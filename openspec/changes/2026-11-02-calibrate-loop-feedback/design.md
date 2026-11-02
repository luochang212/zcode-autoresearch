# 设计：实验循环反馈校准

## 1. plateau 校准的配置流转

参数链路：`init_experiment` 可选参数 → `patchSessionConfig` 持久化进 `.auto/config.json` → `readSessionConfig` 在每次状态重建时读回 → `rebuildState` 的既有 `options.plateauWindow` / `options.plateauMinImprovement`（ledger.ts 已支持，仅缺接线）。

- 读取器 `plateauCalibration(cwd)` 放 `ledger.ts`（config IO 的归属层），server 与 hooks 共用，避免 server.ts 私有 helper 造成 hook/server 口径分叉。
- 校验：`plateau_min_improvement` 为有限数且 ≥0；`plateau_window` 为整数且 ≥2；非法值一律回退默认（0.01 / 5），不报错（校准是便利项，不是门禁）。
- `init_experiment` 未传参数时**不覆盖**已有配置值（segment 重启保留上次校准）；`deterministic` 布尔透传。
- `deterministic: true` 只影响**提示文案**（不再建议 repeat:3 复测），不影响 plateau 判定本身——判定语义保持 advisory（ADR-5）。
- hint 文案由配置值参数化：`plateau detected (last {window} runs improved < {pct})`，未配置时逐字复现现文案（含 "; consider rerunning with repeat:3 to confirm"），保证向后兼容。
- 接线点：`server.ts` `sessionState()` 与 log 后的 `rebuildState`、`hooks/stop-continue.ts`（它的 stderr 文案同样参数化）。`memory-inject.ts` 不消费 plateau，不接线。

## 2. rollback 返回结构升级

`rollbackWorkingTree` 从 `string[]`（residual）改为 `{ rolledBack, restoredTo, residual }`：

- `rolledBack`：restore 前取一次 `dirtyFiles(cwd)`（tracked + untracked，untracked 由 clean -fd 删除，同属回滚动作）——语义是「这次回滚处置了哪些文件」；
- `restoredTo`：restore 后取 `safeShortHash`（回滚不移动 HEAD，取哪侧一致；取后侧顺带验证 hash 可解析）；
- `residual`：现行为不变（回滚后仍脏的文件），响应字段 `rollback_residual` 与 next_action_hint 覆盖逻辑不动。

响应新增 `rolled_back: { restored_to, files, total_files }`，`files` 截断至前 20 条（防大仓库刷屏），`total_files` 给全量。仅非 keep 且非 noop（确实执行了回滚）且处置了至少一个文件时出现。crash 行同样回滚，同样回报。

## 3. revisit_nudge 收窄到决策时刻

触发条件从「segment 存在带理由的 discard/checks_failed 行」改为「**本次落账为 discard/checks_failed** 且 segment（含本次行）存在带理由的 discard/checks_failed 行」。

- 理由：nudge 的语义是「判断最新结果是否推翻某条 discard 的理由、要不要定向重试」——这个决策只发生在 discard 落账的那一刻；keep 连涨期的重复注入是纯噪音（实测 5 连 keep 每次全文重复）。
- keep 之后失去提示不算信息丢失：记忆注入的「弃用方向与理由」清单每次 prompt 都在（guardrails spec 的既有 requirement），常驻可见性由它承载。
- 本次落账行计入判定（`[...state.runs, entry]`）：首次带理由的 discard 落账时 nudge 即触发，无需等下一次。

## 4. confidence 单位与剩余轮数

- `confidence` 返回值增加 `unit: "× noise"`（MAD 倍数的既有含义，dashboard 已按此渲染）；账本行快照保持 `{level, value}` 不动（schema 稳定，旧账本可回放）。
- log 返回新增 `runs_left`（`maxIterations - 已跑数`；server 侧上限恒有效——未配置时默认 20，故恒为数值）；`runs_left ∈ [1,2]` 时 baseHint 插入接近上限提示（排在 cap-reached 之后、doom 之前——cap 已到时提示不变）。

## 5. 记忆注入截断

- best 轨迹的方向标签去掉内层 `.slice(0, 14)`：`directionLabel` 本身已有 40 字符上限，14 字符截断是二次截断，正是「spw 细扫 1」式语义残片的来源。
- 弃用理由截断 60 → 120：一行仍可控（8 条 × 120 字符），换回关键语义（「spw 细扫 1.5/2.5 单峰确认在 2.0」这类被拦腰的结论）。
