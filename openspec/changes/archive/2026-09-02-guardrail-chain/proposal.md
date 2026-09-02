## Why

worth-fix 实测审计（复现脚本 `archived/worth-fix/`，2026-09-02 全部重跑坐实）发现护栏链四处失效：(1) 「checks 失败禁 keep」是死代码——`run_experiment` 的 checks 结果不落账本，`log_experiment` 从不写 `checksFailed` 字段，checks 失败后 keep 照样 `ok: true`；且 `rebuildState` 只认账本行的 `checksFailed` 字段、不认 `status: "checks_failed"`，还是单向闩锁（置 true 后永不复位）。(2) benchmark 脚本锁可被换行/重定向绕过——`unwrapMeasureCommand` 的 rest 黑名单只查 `[;&|`]`与`$(`，`"bash .auto/measure.sh \necho PWNED"`、`"bash .auto/measure.sh > /tmp/x"`原样放行。(3) 漂移检测两个缺口——init 时 measure.sh 不存在、会话中途才创建时修改永不报 drift（规范已承诺的「首见记录」未实现）；冻结文件被删除（current 为 null）不报 drift。(4) keep 提交用`git add -A`，目标项目未 gitignore `.auto/` 时账本恒有 diff，"keep with no changes" 审计被架空，keep 提交混入账本噪音。

## What Changes

- **checks 门禁接通（对齐 pi `runtime.lastRunChecks`）**：`run_experiment` 把 checks 结果作为「待记录」状态持久化到 `.auto/config.json`（`pendingChecksFailed`，抗 server 重启）；`log_experiment` 的 keep 门禁改读该状态（弃用基于账本的条件——它无法区分「待记录的本轮」与「上一轮已记录」，会把恢复性 keep 误杀），任意 status 成功记录后清除；`init_experiment`/`clear_experiments` 重置。同时 `log_experiment` 在 `status === "checks_failed"` 时给账本行写 `checksFailed: true`（审计轨迹），`rebuildState` 的 `lastRunChecksFailed` 改为每 run 覆盖（`run.checksFailed === true || run.status === "checks_failed"`），不再是单向闩锁。
- **脚本锁 rest 白名单**：`unwrapMeasureCommand` 脚本之后的参数改白名单校验（`/^[\\w./:=+-]+([ \\t]+[\\w./:=+-]+)*$/`），换行/回车/`>`/反引号/引号等一律拒绝；`--verbose`、`--foo=bar`、`-n 3` 等合法参数不受影响。
- **漂移检测补两缺口**：`recorded == null && current != null` → 把当前哈希合并写回 `.auto/config.json`（首见记录，不报警）；`recorded != null && current == null`（冻结文件被删除）→ 报 drift。
- **keep 提交排除 `.auto`**：`commitExperiment` 的 stage 改为 `git add -A -- . ":(exclude).auto"`，账本与会话文件不进 keep 提交，"keep with no changes to commit" 审计恢复效力。

## Capabilities

### New Capabilities

（无。）

### Modified Capabilities

- `autoresearch/guardrails`: 「checks 正确性背压」requirement 修正——明确 checks_failed 状态必须落账本（`checksFailed: true`）且闩锁随下一轮 run 复位；「benchmark 脚本锁定」requirement 修正——脚本后参数白名单语义。
- `autoresearch/experiment-loop`: 「run_experiment 运行基准并解析度量」requirement 补两个漂移场景（首见记录的真正实现、冻结文件删除报 drift）；「log_experiment 记录结果并执行 git 语义」requirement 修正——keep 提交 stage 排除 `.auto/`。

## Impact

- `plugin/mcp/server.ts`：`log_experiment` 写 `checksFailed`；`checkBenchmarkDrift` 首见记录 + 删除告警。
- `plugin/mcp/lib/ledger.ts`：`rebuildState` 的 `lastRunChecksFailed` 每 run 覆盖。
- `plugin/mcp/lib/experiment.ts`：`unwrapMeasureCommand` rest 白名单。
- `plugin/mcp/lib/git.ts`：`commitExperiment` stage 排除 `.auto`。
- `plugin/tests/`：四项回归测试（mcp-integration 全链路 + experiment 单测 + git 单测）。
- 兼容性：账本行新增可选字段 `checksFailed`（additive）；rest 白名单会拒绝此前意外放行的危险命令（属修复收紧，非回归）。
