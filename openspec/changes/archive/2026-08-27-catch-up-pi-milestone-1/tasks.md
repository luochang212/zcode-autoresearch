## 1. 迭代钩子

- [x] 1.1 server.mjs 实现 runHook(scriptPath, payload)：bash 执行、stdin JSON、30s 超时 kill、stdout 8KB 截断、fail-open；run_experiment 基准前执行 .auto/hooks/before.sh（存在且可执行），返回 before_steer
- [x] 1.2 server.mjs log_experiment 记录后执行 after.sh，返回 after_steer；payload 含 run_entry 与 session 摘要
- [x] 1.3 单元/协议测试：before 在 run 前触发、after 在 log 后触发、钩子失败不阻断、stdout 截断、超时 kill

## 2. clear 命令

- [x] 2.1 server.mjs 新增 clear_experiments 工具（删 .auto/log.jsonl，保留其余 .auto/ 文件），返回删除确认
- [x] 2.2 新增 commands/clear.md（/autoresearch:clear 指引调用工具 + 用户确认）
- [x] 2.3 测试：clear 后 rebuildState 空、measure/checks/prompt 保留

## 3. ASI 三字段提炼

- [x] 3.1 memory-inject.mjs 从账本最近记录提取 asi.hypothesis/next_action_hint/rollback，注入单行 hyp:/next:/rollback: 行
- [x] 3.2 stop-continue.mjs reason 中同样提炼 asi 三字段
- [x] 3.3 测试：注入文本含 hyp/next/rollback 行

## 4. 停摆护栏参数

- [x] 4.1 ledger.mjs readSessionConfig 读取 consecutiveFailures（默认 3）；server 的 sessionState 传入 isStopReached
- [x] 4.2 stop-continue.mjs 同源读取阈值
- [x] 4.3 测试：阈值可配（config=1 时单次失败即停）

## 5. 文档与收尾

- [x] 5.1 SKILL.md 加钩子小节（before/after 用法、stdin 契约、建议性输出）；loop-protocol 加钩子与 clear 说明；README 更新
- [x] 5.2 全量测试通过；无头集成验证（钩子触发 + clear + ASI 注入）
- [x] 5.3 openspec validate --strict 通过，全部任务勾选，adrkit validate 通过
