## 1. validateLedger 纯函数

- [x] 1.1 实现 lib/validate.mjs：validateLedger(runs, config) 返回违规列表（keep_without_improvement / discarded_improvement / event_order / missing_baseline / commit_field）
- [x] 1.2 单元测试：合法序列零违规；对抗用例——keep 无改进、discard 真改进无 guard、跳号、无 baseline、keep 无 commit / 非 keep 有 commit、noop 语义

## 2. server 接线

- [x] 2.1 log_experiment：写入前 validateLedger（现有 runs + 拟追加行），违规拒收并返回修正路径提示
- [x] 2.2 run_experiment：上一条 crash 且 isDirty → 拒绝（提示回滚或 clear）
- [x] 2.3 config 支持 auditBypass: true（显式跳过校验，文档警示）
- [x] 2.4 协议测试：keep 无改进被拒、crash 残留禁续跑、checks_failed 丢真改进放行

## 3. 文档与收尾

- [x] 3.1 SKILL.md / README 更新（账本可信语义、auditBypass 警示）
- [x] 3.2 全量测试通过；集成验证（合法循环全程无违规）
- [x] 3.3 openspec validate --strict 通过，全部任务勾选，adrkit validate 通过
