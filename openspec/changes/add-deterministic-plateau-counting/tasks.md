# Tasks

## 1. 判定层

- [x] 1.1 `detectPlateau` 增加确定性计数语义分支：窗口内存在严格优于窗口前 segment 全局 best 的度量即 false，否则 true；窗口口径与有效行过滤沿用
- [x] 1.2 `ledger.ts` plateau 计算点传入 deterministic 标志（plateauCalibration 已有该字段，消费点接线）

## 2. 提示文案

- [x] 2.1 deterministic 段 plateau 触发时的 next_action_hint 不加百分比阈值表述（语义为「连续无进展」），非确定性文案逐字不变

## 3. 测试

- [x] 3.1 experiment.test.ts：计数语义红转绿（窗口含 keep 的真实序列不再误报；连续无进展仍判 true）；幅度语义回归不变
- [x] 3.2 ledger.test.ts / mcp-integration.test.ts：deterministic 持久化下 rebuildState 判定口径一致

## 4. 校验

- [x] 4.1 `openspec validate --strict` + 全量 `npm test`
