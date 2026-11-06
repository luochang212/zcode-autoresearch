# Tasks

## 1. 绑定与行语义（server.ts toolLogExperiment）

- [x] 1.1 主度量绑定之后加次级转写门：`args.metrics` 提供时键集合与值须逐键等于 `obs.metrics`，否则拒绝（错误含观测值与可用度量名）
- [x] 1.2 `entry.metrics` 改为恒存 `obs.metrics`（不再取 args）
- [x] 1.3 约束门 value 改读 `obs.metrics[c.name]`（省略 args 不再 skipped 绕过）
- [x] 1.4 畸形 constraints（缺 name 字符串 / maxPct 非正非有限）→ 响亮拒绝

## 2. 测试（mcp-integration.test.ts + 既有用例改造）

- [x] 2.1 红测改造：约束类测试的 `metrics` 改为受控基准真输出（measure.sh 打印次级度量）
- [x] 2.2 新增：次级转写不符被拒（错误含观测值）；未知度量名被拒；未报 metrics 落行且行 metrics 为观测聚合
- [x] 2.3 新增：省略 metrics 不绕过约束门（观测值超限即拒）
- [x] 2.4 新增：畸形 constraints 响亮拒绝
- [x] 2.5 全量 `npm test` 通过；`openspec validate --strict` 通过
