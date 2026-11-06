# Tasks

## 1. 观测快照（run 侧）

- [x] 1.1 types.ts：`PendingObservation` 类型 + `SessionConfig.pendingObservation`；`LedgerRun.treeDirty`/`residual` 字段
- [x] 1.2 server.ts：`setPendingObservation`/`readPendingObservation`（patchSessionConfig 同机制）；toolRunExperiment 正常路径与 spawn 失败路径均持久化快照

## 2. 对账门（log 侧）

- [x] 2.1 无快照 → 拒绝（提示先 run_experiment；一次 run 一次成功 log）
- [x] 2.2 非 crash：metric SHALL 等于快照 metric，不等拒绝并给出观测值
- [x] 2.3 crash：快照 metric 非 null → 拒绝（提示 discard/keep）
- [x] 2.4 成功 log 消费快照（与 setPendingChecksFailed(false) 同点置 null）
- [x] 2.5 run 行落 `treeDirty`（git 操作前取 isDirty）与 `residual`（回滚残留非空时）；noop 警告改用同一事实
- [x] 2.6 toolRunExperiment：上一 run 行 residual 非空且当前树脏 → 返回 `residual_warning`（advisory）

## 3. nearMisses 诊断

- [x] 3.1 experiment.ts：`parseMetricLines` 返回 `nearMisses`（形似 METRIC 但解析失败的行，上限 10）
- [x] 3.2 server.ts：nearMisses 写 stderr（诊断通道）

## 4. 测试

- [x] 4.1 红测（已运行）：无 run 落账/转抄不符/假 crash/二次 log 全部现状放行——翻转断言
- [x] 4.2 诚实路径守护：失败基准 attest 真 crash；keep-on-failed-run 政策不变
- [x] 4.3 改造既有测试：观测不符的转抄值改为受控基准真输出（metric 文件变体），crash 类测试改用失败基准
- [x] 4.4 重启存活：两个 server 进程接力，log 仍对账
- [x] 4.5 treeDirty/residual 行字段断言；nearMisses 单元测试
- [x] 4.6 全量 npm test 通过

## 5. 文档与验证

- [x] 5.1 README（EN/CN）审计 bullet 补对账一句；SKILL.md 4b 补对账语义
- [x] 5.2 `openspec validate --strict bind-log-to-observation` 通过
- [x] 5.3 归档合入主规范
