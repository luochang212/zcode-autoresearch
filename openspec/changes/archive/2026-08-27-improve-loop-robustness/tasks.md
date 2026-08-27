## 1. doom-loop 检测

- [x] 1.1 experiment.mjs 实现 normalizeHypothesis（小写/去非字母数字/分词排序）与 detectDoomLoop（连续 3 重复 + A→B→A→B 震荡，window 6）
- [x] 1.2 单元测试：重复、震荡、无信息跳过、正常序列不误报

## 2. memory-inject 聚合摘要

- [x] 2.1 experiment.mjs 实现 directionLabel（hypothesis/description 首段截断）
- [x] 2.2 memory-inject.mjs 重写为聚合摘要：进度行 + 已尝试方向去重（≤8）+ best 轨迹（≤6 步）+ 最近 3 条（含 ASI）+ doom-loop 提示 + 下一步
- [x] 2.3 测试：聚合含方向去重与轨迹；doom-loop 序列注入提示

## 3. 信号接线

- [x] 3.1 server.mjs log_experiment 返回 doom_loop + next_action_hint 提示换方向
- [x] 3.2 stop-continue.mjs reason 含 doom-loop 提示
- [x] 3.3 测试：构造震荡序列 log 后返回 doom_loop: true

## 4. 文档与收尾

- [x] 4.1 SKILL.md / README 更新（聚合记忆格式、doom-loop 信号语义）
- [x] 4.2 全量测试通过；集成验证（真实会话构造重复序列确认信号）
- [x] 4.3 openspec validate --strict 通过，全部任务勾选，adrkit validate 通过
