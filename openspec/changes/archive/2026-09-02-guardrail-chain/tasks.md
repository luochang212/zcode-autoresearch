# Tasks: guardrail-chain

## 1. checks 禁 keep 门禁接通（对齐 pi）

- [x] 1.1 回归测试先行（红）：`plugin/tests/mcp-integration.test.ts` 全链路——checks.sh 失败 → 直接 keep 被拒；改记 `checks_failed` → 账本行含 `checksFailed: true`；修复代码后再 run（checks 通过）→ keep 放行（验证恢复路径不闩死）
- [x] 1.2 `plugin/mcp/server.ts`：`run_experiment` 把 checks 结果持久化为 `.auto/config.json` 的 `pendingChecksFailed`；keep 门禁改读它；成功记录后清除；`init_experiment`/`clear_experiments` 重置
- [x] 1.3 `plugin/mcp/server.ts`：`log_experiment` 在 `status === "checks_failed"` 时给账本 entry 写 `checksFailed: true`
- [x] 1.4 `plugin/mcp/lib/ledger.ts`：`rebuildState` 改 `state.lastRunChecksFailed = run.checksFailed === true || run.status === "checks_failed"`（每 run 覆盖，非闩锁）
- [x] 1.5 `plugin/mcp/lib/types.ts`：`SessionConfig` 补 `pendingChecksFailed?: boolean`

## 2. 脚本锁 rest 白名单

- [x] 2.1 回归测试先行（红）：`plugin/tests/experiment.test.ts`——换行、`\r`、`>`、反引号注入返回 null；`--verbose`、`--foo=bar`、`-n 3` 放行
- [x] 2.2 `plugin/mcp/lib/experiment.ts`：rest 改白名单 `/^[\w./:=+-]+([ \t]+[\w./:=+-]+)*$/`（空 rest 放行）

## 3. 漂移检测两缺口

- [x] 3.1 回归测试先行（红）：init（无 measure.sh）→ 创建 measure.sh → run（静默+哈希已记录）→ 修改 → run 报 drift；冻结文件删除 → run 报 drift
- [x] 3.2 `plugin/mcp/server.ts`：`checkBenchmarkDrift` 补首见合并写回与删除告警（design D3 四象限）

## 4. keep 提交排除 `.auto`

- [x] 4.1 回归测试先行（红）：fixture 不 gitignore `.auto` → keep commit 不含 `.auto/log.jsonl`；仅 `.auto` 改动时 keep 走 "no changes" 拒绝路径
- [x] 4.2 `plugin/mcp/lib/git.ts`：`commitExperiment` 改 `git add -A -- . ":(exclude).auto"`

## 5. 收尾

- [x] 5.1 全量检查：`npm test`、`npm run lint`、`npm run fmt:check`、`npx tsc --noEmit` 全绿
- [x] 5.2 `openspec validate --strict guardrail-chain` 通过；归档 change（delta 合并进 `openspec/specs/`）
