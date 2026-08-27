## 1. constraints 校验

- [x] 1.1 server.mjs log_experiment：解析 args.constraints（{name, maxPct}[]）；keep 且声明时，从本 run metrics 取次级度量、与首条 run 该度量值比较（maxPct%）；超界拒收；返回 constraints 状态
- [x] 1.2 auditBypass 同样跳过约束校验（一致性）
- [x] 1.3 单元/协议测试：约束内 keep 通过（constraints pass）、超界拒收（error 提示）、无 constraints 无校验、baseline 缺失跳过

## 2. 文档与收尾

- [x] 2.1 setup-guide 增加"定义约束"指引（setup 时声明次级度量约束）；SKILL 循环规程提及 constraints；README 更新
- [x] 2.2 全量测试通过；集成验证（真实会话声明约束跑通）
- [x] 2.3 openspec validate --strict 通过，全部任务勾选，adrkit validate 通过
