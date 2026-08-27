## 1. plateau 检测

- [x] 1.1 在 plugin/mcp/lib/experiment.mjs 实现 detectPlateau(runs, {window=5, minImprovement=0.01})：窗口内 direction-aware 最佳相对改善 < 阈值 → true；窗口不足 → false；first=0 时用绝对差
- [x] 1.2 单元测试 detectPlateau：改善超阈值 false、低于阈值 true、窗口不足 false、higher 方向、first=0 兜底

## 2. run_experiment repeat 与 log_experiment plateau

- [x] 2.1 server.mjs 的 run_experiment 支持 repeat（1..10 默认 1）：循环 spawn+计时，收集主度量数组，返回 metrics + median_metric；checks 只在最后一次后执行一次；timeout 按单次
- [x] 2.2 ledger.mjs rebuildState 增加 plateau 计算（复用 detectPlateau，window/阈值可 env 覆盖）
- [x] 2.3 server.mjs 的 log_experiment 返回增加 plateau 标志；confidence 字段移到 delta 之后、next_action_hint 之前
- [x] 2.4 单元测试：repeat 中位数（构造输出 42/44/41 → median 42）；log 返回字段顺序与 plateau 值

## 3. Stop hook plateau 放行

- [x] 3.1 stop-continue.mjs：plateau && runs >= window 时放行，reason 说明平台期并提示 repeat 复测或开新 segment；保留迭代上限/连续失败放行

## 4. 规程与文档

- [x] 4.1 SKILL.md 循环规程加一步：噪声区间用 repeat:3 复测取中位数再判定；低置信改进标注"方向性"
- [x] 4.2 references/loop-protocol.md 噪声小节改写为规则（confidence red/yellow 处理、repeat 使用、plateau 收尾）

## 5. 验证与收尾

- [x] 5.1 node --test 全量通过（既有 19 + 新增）
- [x] 5.2 无头集成验证：小场景驱动 repeat:3 调用与 plateau 判定（构造平坦序列）返回正确
- [x] 5.3 openspec validate --strict 通过，全部任务勾选，adrkit validate 通过
