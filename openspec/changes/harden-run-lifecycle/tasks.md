# Tasks

## 1. runCommand 结算保证

- [ ] 1.1 `server.ts` `runCommand`：`exit` 处理器无条件武装 fallback finalize（复用 `KILL_GRACE_MS`，`close` 先到幂等胜出；fallback 定时器在 finalize/error 路径统一清理）；更新 Windows 注释为一般化结算说明

## 2. spawn 失败 sibling 重置

- [ ] 2.1 `server.ts` spawnError 分支：`setPendingObservation` 同点补 `setPendingChecksFailed(false)`

## 3. 死键删除

- [ ] 3.1 `types.ts`：`SessionState` 移除 `lastRunChecksFailed`、`totalExperiments` 及注释
- [ ] 3.2 `ledger.ts`：`rebuildState` 移除两键的初始化、config 行重置（`lastRunChecksFailed` 部分）、run 行累加/覆写

## 4. 测试

- [ ] 4.1 `mcp-integration.test.ts`：`call()` 加 deadline 参数（默认 30s，到期 reject 带诊断，清理 pending map）
- [ ] 4.2 回归测试：提前退出 + 滞留后代占住 stdio（detached spawn 持管道）→ 工具有界结算返回，METRIC 照常解析（win32 跳过；测试自清理滞留进程）
- [ ] 4.3 回归测试：种入陈旧 `pendingChecksFailed: true` → spawn 失败 run（PATH 无 bash 触发 ENOENT）→ config 中 `pendingChecksFailed` 为 false 且快照 metric null
- [ ] 4.4 `ledger.test.ts`：删除两个 `lastRunChecksFailed` 测试与零散断言；确认 `rebuildState` 其余断言不变
- [ ] 4.5 全量 `npm test` 通过；`openspec validate --strict` 通过
