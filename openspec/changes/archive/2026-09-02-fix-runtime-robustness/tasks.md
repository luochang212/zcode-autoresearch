# Tasks: fix-runtime-robustness

## 1. 超时升级兜底（D1）

- [x] 1.1 回归测试先行（红）：`plugin/tests/mcp-integration.test.ts`——`trap '' TERM` + 长睡眠的 measure.sh，`timeout_seconds: 1` 调用 run_experiment，断言调用在宽限期（SIGTERM+5s）内返回、`timed_out: true`、无残留基准进程（pgrep 兜底 try/catch）
- [x] 1.2 `plugin/mcp/server.ts`：`runCommand` 超时路径加 SIGTERM→5s→SIGKILL（进程组）升级，`close` 清理升级定时器

## 2. 溢出度量恢复与有界内存（D2）

- [x] 2.1 回归测试先行（红）：末尾 METRIC（3MB 噪声后 `METRIC time_ms=42`）→ `metric: 42`、`log_file` 非空、`output_tail` 非空；开头 METRIC（METRIC 先行再 3MB 噪声）→ `metric: 42`
- [x] 2.2 `plugin/mcp/server.ts`：`runCommand` 增量 METRIC 行扫描（carry 上限 64KB、行数上限 1000）+ 64KB 尾部环；溢出触发后逐事件 appendFileSync、`chunks` 不再驻留；`RunOutcome` 拆 `output`（解析用）与 `outputTail`（显示用）；调用方改用对应字段

## 3. crash 行 metric 置 null（D3）

- [x] 3.1 回归测试先行（红）：init → crash（无 metric）→ 改代码 → keep(metric 42)，断言账本 crash 行 `metric: null`、log 返回 `baseline: 42`、keep 的 delta 为正（direction=lower）
- [x] 3.2 `plugin/mcp/server.ts`：entryPrelim/entry 两处 `status === "crash" ? 0 : metric` 改 null；tools/list 中 metric 描述 "(0 for crash)" 改为省略/ null；README 中 crash=0 表述同步

## 4. init 拒绝非 git（D4）

- [x] 4.1 回归测试先行（红）：非 git 临时目录调用 init_experiment → `ok: false` 且错误提示含 git；不写 config 行
- [x] 4.2 `plugin/mcp/server.ts`：`toolInitExperiment` 参数校验后加 `isGitRepo(cwd)` 前置拒绝

## 5. dashboard live server 容错（D5）

- [x] 5.1 回归测试先行（红）：export_dashboard 启动 live server → clear_experiments 删账本 → GET `/autoresearch.jsonl` 得 404 且进程存活、`/` 仍 200；SSE 客户端连接后强制 destroy → 触发广播 → server 存活
- [x] 5.2 `plugin/mcp/lib/dashboard-server.ts`：账本路由 existsSync→404；`broadcast` 逐客户端 try/catch + `destroyed` 预检 + 失败剔除

## 6. repeat metrics 聚合（D6）

- [x] 6.1 回归测试先行（红）：repeat 3 输出 time_ms 42/44/41 与 rss_mb 100/104/102 → 返回 `metrics` 为 `{time_ms: 42, rss_mb: 102}`（按名中位数）
- [x] 6.2 `plugin/mcp/server.ts`：`metrics: runs[0]?.metrics` 改为按名中位数聚合

## 7. noop 连败语义（D7）

- [x] 7.1 单测先行（红）：`plugin/tests/experiment.test.ts`——isStopReached [d,c,n] 与 [d,c,n,d] 不停、[d,c,d] 停；`plugin/tests/ledger.test.ts`——rebuildState 连败计数同语义
- [x] 7.2 `plugin/mcp/lib/experiment.ts`：`isStopReached` 改尾部连续失败段判定；`plugin/mcp/lib/ledger.ts`：`rebuildState` noop 归零连败链

## 8. isDirty 排除 .auto + 漂移删除文案（D8/D9）

- [x] 8.1 单测先行（红）：`plugin/tests/git.test.ts`——仅 `.auto/` 下改动 isDirty=false、真实文件改动 true；mcp 集成：crash 记账后（工作区仅账本变动）续跑不被拒
- [x] 8.2 `plugin/mcp/lib/git.ts`：`isDirty` pathspec 排除 `.auto`
- [x] 8.3 `plugin/mcp/server.ts`：driftWarn 区分 deleted/modified 文案

## 9. 收尾

- [x] 9.1 全量检查：`npm test`、`npm run lint`、`npm run fmt:check`、`npx tsc --noEmit` 全绿
- [x] 9.2 重跑 `archived/worth-fix/a2.ts`、`b3.ts`、`b3-variant.ts` 确认已修复（不再挂起、metric=42）
- [x] 9.3 `openspec validate --strict fix-runtime-robustness` 通过；归档 change（delta 合并进 `openspec/specs/`，`openspec validate --specs` 通过）
