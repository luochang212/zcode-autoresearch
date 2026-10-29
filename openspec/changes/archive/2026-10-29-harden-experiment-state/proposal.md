# Proposal

## Why

上一轮仓库 review 提出 20 余项问题。按 worth-fix 流程逐条复现后，本 change 只修**属实、可复现、影响真实状态机或守卫语义、且修复成本低**的部分；其余明确列入 design.md 的 Deferred，不在本 change 里顺手改。

坐实的证据（真实 MCP server + 临时 git 仓库）：

- baseline 记 42（discard）后，首条 keep 记 45 仍被接受，返回 `delta:-3`、`best:45`——审计的 `retained` 与状态投影的 baseline 不是同一基准。
- `autoresearchOff: true` 时 Stop hook 仍返回 `decision:block`，UserPromptSubmit 仍注入账本摘要；只有 SessionStart 静默。
- 未 init 时 `run_experiment` 会执行 benchmark 并创建 `.auto/config.json`；无 `.auto/` 时 `run_experiment` 与 `clear_experiments` 都返回原始 ENOENT。
- `.auto/` 之外只改 `autoresearch-dashboard.html`，`log_experiment(keep)` 仍成功，commit 包含该 session 文件；同一文件又会触发 crash 未回滚门禁。
- segment 1 以 discard、crash 结束后，segment 2 只失败一次，`consecutiveFailures` 直接变成 3；before hook 仍拿到上一段 last_run。
- 空仓库（`git init` 无 commit）可 init，但首次 discard/crash 的 rollback 失败，账本行不落盘。
- `status:"crash", metric:7` 的返回值是 7，账本行却是 null。
- `auditBypass: true` 下超界次级度量仍被拒；代码注释与 ADR-5 都承诺 bypass 同时跳过约束。
- dashboard 的 timestamp 为数字时 `renderDashboard` 抛异常（live 路由未捕获会打崩 MCP 进程）；字符串 timestamp 未转义，可直接写入 HTML。
- macOS（大小写不敏感）上写 `.auto/MEASURE.SH` 能绕过冻结写保护。
- spec 中的中文去重/震荡示例（“试 sqrt 截断” vs “试 sqrt 截断变体”）在实现里相似度为 false。

## What Changes

- **审计基准**：首条 keep 必须不差于当前 segment 的首条有限 metric（允许持平）；补齐 `retained` 与 baseline 的分裂。
- **段边界**：config 行重置 `consecutiveFailures`、`lastRun`、`lastRunChecksFailed`；`validateLedger` 在 config 行重置 baseline/retained。
- **入口前置条件**：`run_experiment` 必须有 active session；`clear_experiments` 无账本时幂等返回；`patchSessionConfig` 自动创建 `.auto/`；init 拒绝无 commit 的 git 仓库并区分“缺 git”。
- **git 边界**：`autoresearch-dashboard.html` 与 `.auto/` 一样不参与 keep commit、isDirty、rollback checkout。
- **控制开关**：`autoresearchOff: true` 暂停 Stop 续跑与 memory 注入；init/clear 清除标记；resume 命令说明。
- **返回值一致性**：crash 的响应 metric/delta 与账本一样为 null。
- **解锁语义**：`auditBypass: true` 同时跳过次级度量约束（与 ADR-5/代码注释一致）。
- **dashboard 健壮性**：timestamp 类型校验 + HTML 转义；live 路由整体 try/catch，单请求异常不再打崩 MCP 进程。
- **跨平台冻结守卫**：macOS 也做大小写归一化。
- **中文假设相似度**：CJK 长 token 增加 bigram 表示，使 spec 中的中文去重/doom-loop 示例成立。
- **文档同步**：修根 README 的 unattended 表述、plugin README 的 hook 数/off/SessionStart 描述、AGENTS 的权限门禁与 CI、loop-protocol 的 crash metric、clear/finalize/setup 的误导说明，以及 init 的哈希落点说明。

## Capabilities

### New Capabilities

（无）

### Modified Capabilities

- `autoresearch/experiment-loop`：init 前置条件与哈希落点、run 的 session 前置条件、首条 keep 的 baseline 审计、跨 segment 状态重置、crash 返回值、keep 排除 dashboard、clear 幂等与 off 重置。
- `autoresearch/guardrails`：`autoresearchOff` 对 Stop/memory 的暂停语义、`auditBypass` 对约束的解锁、macOS 冻结路径归一化。
- `autoresearch/dashboard`：timestamp 类型与转义、live 路由异常隔离。

## Impact

- 代码：`plugin/mcp/server.ts`、`plugin/mcp/lib/{validate,ledger,git,frozen,experiment,dashboard,dashboard-server}.ts`、`plugin/hooks/{stop-continue,memory-inject}.ts`。
- 测试：新增/修改 `plugin/tests/{validate,ledger,git,experiment,frozen,hooks,mcp-integration,dashboard}.test.ts`。
- 行为变化（**BREAKING** 级别的工具语义，均在 spec 留痕）：未 init 调 `run_experiment` 现在报错；只有 dashboard 变化不再能 keep；`autoresearchOff` 现在真的暂停循环；empty repo 不能 init。
- 文档：README/README_CN、plugin/README(_CN)、AGENTS、SKILL/loop-protocol/setup-guide、commands/clear/finalize/autoresearch/off、三份主 spec。
- 依赖：无新增依赖；仍为零第三方、Node ≥24、无构建。
- 不在本 change：workingDir 贯通到 commands/finalize/guard、noop metric 语义、runCommand 后台子进程、niceTicks 极小量程、memory 注入截断、finalize 并集内容校验、示例脚本——理由见 design.md Deferred。
