# Tasks

## 1. niceTicks 步长尾数条件

- [x] 1.1 `dashboard.ts`：+1 条件改为 `norm > 2 && norm <= 2.5`
- [x] 1.2 回归：`niceTicks(0, 0.63)` decimals=2（标签 "0.25"）、`niceTicks(0, 6.3e-7)` decimals=8；既有 0.25/5e-7 用例保留通过

## 2. crash 行回放排除

- [x] 2.1 `ledger.ts` `rebuildState`：baseline 判定与 values 收集跳过 `status === "crash"`
- [x] 2.2 `ledger.ts` `rebuildHistory`：firstMetric 判定与 values 收集跳过 crash
- [x] 2.3 `server.ts` `confidenceForSegment`：baseline 判定与 values 收集跳过 crash
- [x] 2.4 `experiment.ts` `detectPlateau`：valid 过滤跳过 crash
- [x] 2.5 回归（ledger.test.ts）：legacy 账本（crash-0 → keep 42 → keep 40）baseline=42、confidence=null（0 不在值集合）；dashboard 历史投影 firstMetric 同断言

## 3. log 落账后 pending 清除失败路径

- [x] 3.1 `server.ts`：两个 `setPending*` 包 try/catch；失败 → stderr 诊断 + 响应 `pending_reset_warning`（行已落账 / 勿未重跑 run 就再次 log）
- [x] 3.2 回归（mcp-integration）：run 后 `chmodSync(config.json, 0o444)` 再 log discard → `ok: true` + `pending_reset_warning`、账本恰一行；恢复权限后下一 run 正常覆盖快照

## 4. deny 建议与指引文档

- [x] 4.1 `frozen.ts` FROZEN_REASONS measure.sh：建议改可行路径（先移除已记录文件 → 新基准 → 新 segment）
- [x] 4.2 `commands/clear.md`、`commands/autoresearch.md`：新目标需不同基准时先移除旧冻结文件的说明

## 5. 文档批次（对齐 ADR-11 与现实）

- [x] 5.1 root README（EN/CN）+ plugin README（EN/CN）：反作弊/reward-hacking 措辞 → 完整性 + 错误引导（ADR-11 口径），功能描述不变
- [x] 5.2 `autoresearch-hooks/SKILL.md`：env 声明改为「契约在 stdin、勿依赖 env（env 实际透传）」
- [x] 5.3 `loop-protocol.md`：「Reset everything」→ 清账本、其余文件保留
- [x] 5.4 `off.md`：config.json 用 Edit 单键提醒
- [x] 5.5 `stop-continue.ts` 提示句补 `AR_MAX_ITERATIONS`；核对 hooks.test.ts 是否钉旧句

## 6. 收口

- [x] 6.1 `openspec validate --strict review-findings-sweep` 通过
- [x] 6.2 `npm test` 全绿（plugin 单测 + 契约）；lint/fmt:check 通过
- [x] 6.3 归档：delta 合入主规范
