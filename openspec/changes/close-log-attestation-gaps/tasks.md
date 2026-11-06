# Tasks

## 1. log_experiment 有据门与警告（server.ts）

- [x] 1.1 `status === "checks_failed"` 且 `pendingChecksFailed() !== true` 时拒绝：错误信息含 "no failed-checks verdict"，提示正确状态（discard / crash）
- [x] 1.2 `status === "noop"` 且 `isDirty(cwd)` 时返回携带 `warning`（advisory，不拒绝）：说明 noop 不回滚、脏树将进入下一轮测量
- [x] 1.3 metric 缺失报错文案补 noop 说明（"metric must be a finite number (or omit only for status=crash; noop still logs the verification rerun's metric)"）
- [x] 1.4 schema 文案：commit 参数写明 non-keep 禁带（commit_field 硬错）；runs[].run 注明是 repeat 序号

## 2. 非契约面顺手修复

- [x] 2.1 `experiment.ts` METRIC_RE 字符集补 `-`
- [x] 2.2 新增 `mcp/lib/spill.ts`：`sweepStaleSpillFiles(dir, maxAgeMs, now)` 清扫过期溢出日志；`runCommand` 溢出时调用（best-effort，失败不阻断）
- [x] 2.3 `toolExportDashboard` 捕获 `ensureDashboardServer` 异常，降级为 static-only 消息
- [x] 2.4 删除 `ledger.deltaFor` 与 `types.ts failedGuard`（零引用）
- [x] 2.5 `memory-inject.ts` 去重注释修正（保留首次出现标签）

## 3. 回归测试（先红已证实）

- [x] 3.1 mcp-integration.test.ts：checks_failed 无判定被拒、账本不落行（红已运行：实测 `cf.ok === true`）
- [x] 3.2 mcp-integration.test.ts：noop+脏树带 warning、干净树静默（红已运行：warning 实测 undefined）
- [x] 3.3 experiment.test.ts：连字符度量名解析（红已运行）
- [x] 3.4 spill.test.ts：过期清扫命中/未过期保留
- [x] 3.5 既有 honest checks_failed 测试（真失败判定后放行）继续通过——防过拦

## 4. 文档与验证

- [x] 4.1 README EN/CN：non-keep 回滚措辞改为 discard/crash/checks_failed（noop 例外）；checks infra 豁免一句；commit index 重置披露一句；config.json 可选键补 plateau 校准键
- [x] 4.2 finalize.md：union 校验覆盖 merge-base..HEAD 全部变更（含手工提交）说明
- [x] 4.3 setup-guide.md：checks infra 豁免说明
- [x] 4.4 commands/autoresearch.md：resume 条件统一为账本存在（prompt.md 缺失时提示补章程而非重走 setup）
- [x] 4.5 `openspec validate --strict close-log-attestation-gaps` 通过
- [x] 4.6 `npm test` 全量通过
