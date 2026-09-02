## Context

见 proposal.md「Why」。四项修复都落在既有护栏链上（`plugin/mcp/server.ts`、`lib/ledger.ts`、`lib/experiment.ts`、`lib/git.ts`），零第三方依赖约束不变，全部是小幅精准修改 + 回归测试。

## Goals / Non-Goals

**Goals:**

- 「checks 失败禁 keep」从死代码变为真实生效，且闩锁可复位（不永久锁死后续 keep）。
- 脚本锁拒绝一切 shell 注入面（换行/回车/重定向/引号/反引号），同时不误伤常规 CLI 参数。
- 漂移检测覆盖「首见记录」与「冻结文件删除」两个缺口，与既有规范措辞对齐。
- keep 提交不含 `.auto/`，"keep with no changes" 审计恢复效力。

**Non-Goals:**

- 不改 checks 执行时机/超时机制，不改 drift 的 advisory（警告不阻断）语义。
- 不处理 `isDirty`（crash 审计）把 `.auto/` 算入 dirty 的既有行为（与本链无关，另行评估）。
- 不动 SIGTERM 超时（a2）、>2MB 输出溢出（b3）等其它已记录但不在本 change 范围的问题。

## Decisions

### D1: checks 门禁对齐 pi——「待记录」状态持久化 + 账本审计轨迹

原实现（`server.ts` keep 门禁读 `rebuildState` 的 `lastRunChecksFailed`）是死代码的根因：账本只在 `log_experiment` 时写行，门禁评估时「本轮刚跑完、尚未记录」的 checks 结果根本不在账本里；且即使 agent 诚实记 `checks_failed`，基于账本的门禁会把**恢复性 keep**（修复后重跑通过的那次）也误杀——上一轮记录永远是 checks_failed。pi 的做法（`runtime.lastRunChecks`：`run_experiment` 写运行时状态、`log_experiment` 门禁读它、记录后清除）是唯一自洽的语义，本设计对齐之，并做两处适配：

- **落盘而非内存**：`run_experiment` 把 checks 结果写 `.auto/config.json` 的 `pendingChecksFailed`（true 仅当 checks 跑了且失败），抗 MCP server 中途重启；与 `benchmarkHashes` 同为 server 托管键。`log_experiment` 任意 status 成功记录后清除；`init_experiment`/`clear_experiments` 重置。
- **账本仍留审计轨迹**：`log_experiment` 以 `status=checks_failed` 记录时写 `checksFailed: true`；`rebuildState` 的 `lastRunChecksFailed` 改每 run 覆盖（`run.checksFailed === true || run.status === "checks_failed"`）——修单向闩锁，语义归位为「最近一条账本 run 是否 checks 失败」，供记忆注入/状态展示使用，**不再参与 keep 门禁**。

替代方案「纯账本门禁 + 每 run 覆盖」被否：恢复性 keep（checks_failed 行之后的第一条 keep）必然被拒，与「闩锁复位后放行」的验收场景直接冲突。

### D2: rest 白名单而非扩充黑名单

`unwrapMeasureCommand` 命中脚本变体后，rest 必须匹配 `/^[\w./:=+-]+([ \t]+[\w./:=+-]+)*$/`（空 rest 直接放行）。白名单覆盖 `--verbose`、`--foo=bar`、`-n 3`、`./path`、`key=value`。

- 为什么白名单：黑名单已被证明枚举不全（换行、`>`、反引号、引号、`$`、`~`、glob 都是面）。shell 注入面无法枚举完，白名单是唯一可论证完备的方案。
- 注意 `\s` 不能用：`\s` 含 `\n`/`\r`，白名单必须显式 `[ \t]`。
- 代价：带引号的参数（`--name="a b"`）会被拒——可接受，benchmark 参数应是简单 token，复杂参数属于 measure.sh 内部。

### D3: 漂移检测补齐按「记录值 × 当前值」四象限

`checkBenchmarkDrift` 逐 key 判定：`recorded != null && current != null && 不等` → drift（既有）；`recorded == null && current != null` → 首见，把当前哈希**合并**写回 config（不动另一 key 的已记录值），不告警；`recorded != null && current == null` → 删除，按 drift 告警（reason 同 key）。两端皆 null → 静默。

- 为什么删除算 drift：冻结文件消失后 metric 同样不可比（脚本锁也随之失效），与「修改」同级。
- 首见合并写回而非整写 `current`：避免把另一 key 的已记录哈希覆盖成 null。

### D4: stage 排除用 pathspec magic

`commitExperiment` 改 `git add -A -- . ":(exclude).auto"`。`:(exclude)` pathspec 在本仓库已被 `rollbackWorkingTree` 使用（`:(exclude,glob)**/.auto/**`），git 版本兼容性无新增风险。

- 为什么不用「add 后 reset .auto」：两步非原子，且 reset 会把用户预先 stage 的 `.auto` 内容也冲掉；pathspec 在 add 侧一步完成。
- 范围只排除 `.auto`：dashboard HTML 等其它会话产物是否排除另行评估，本 change 不扩面。

## Risks / Trade-offs

- [白名单拒绝带引号/空格的合法参数] → 文档与错误信息已引导「只能跑脚本」；复杂参数收敛进 measure.sh，属可接受收紧。
- [旧账本只有 status 无字段的 checks_failed 行] → status 通道兼容，无需迁移。
- [fixture/用户仓库已把 `.auto` 跟踪进 git] → exclude 后 `.auto` 的既有跟踪文件改动不再进 keep 提交，正是期望语义（冻结文件不应作为实验改动提交）。
