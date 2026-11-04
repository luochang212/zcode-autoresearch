## MODIFIED Requirements

### Requirement: 实验工具入口前置条件与段边界

`run_experiment` SHALL 要求存在 active session（账本中存在 config 行）；无 session 时 SHALL 在任何 benchmark 执行或配置写入前返回明确错误。`patchSessionConfig` SHALL 在写 `.auto/config.json` 前创建 `.auto/` 目录。`clear_experiments` 在账本不存在时 SHALL 幂等返回成功且不写文件；存在账本时 SHALL 删除账本并重置 `pendingChecksFailed` 与 `autoresearchOff`。`rebuildState` 遇到 config 行 SHALL 重置 `consecutiveFailures`、`lastRun`、`lastRunChecksFailed`，使新 segment 的连败、before-hook last_run 与 checks 状态不继承上一段。crash+脏树审计门（「上一 run 为 crash 且工作树未回滚 → 拒绝 run」）SHALL 以**账本全局最后一条 run 行**为判据，不因 config 行（segment 边界）豁免：脏树是物理状态，`init_experiment` 开新 segment 不能把它洗掉；为此会话状态 SHALL 额外维护一个不随 config 行重置的「全局最后一条 run」视图（before-hook 的 `last_run` 与 checks 标记仍按 segment 作用域重置，语义不变）。

#### Scenario: 未 init 时 run 被拒

- **WHEN** 账本无 config 行，agent 调用 `run_experiment`
- **THEN** 工具返回 `ok: false` 与 "call init_experiment first" 类错误，不执行 benchmark、不写 `.auto/config.json`

#### Scenario: 无 .auto 时 clear 幂等

- **WHEN** 项目目录没有 `.auto/`，agent 调用 `clear_experiments`
- **THEN** 工具返回成功与 "no active session" 信息，不抛 ENOENT、不创建 `.auto/`

#### Scenario: 跨 segment 状态重置

- **WHEN** segment 1 以 discard、crash 结束，随后 init segment 2 并只记录一次 discard
- **THEN** `consecutiveFailures` 为 1（不是 3），before hook 的 `last_run` 为 null；segment 2 的 checks 标记不继承 segment 1

#### Scenario: re-init 不解除 crash+脏树审计门

- **WHEN** 上一条 run 为 crash 且工作树有未回滚改动，agent 调用 `init_experiment` 开新 segment 后再调用 `run_experiment`
- **THEN** `run_experiment` 仍拒绝（audit: unrolled-back working-tree changes），直到脏树被回滚（discard/crash 记账或手工恢复）

## ADDED Requirements

### Requirement: 账本追加完整性

`.auto/log.jsonl` 的追加写入 SHALL 保证行边界完整：既有文件非空且末尾不是换行符（如上次写入被进程终止截断）时，追加前 SHALL 先补一个换行，使新记录独立成行、不与残行拼接。账本读取遇到无法解析的坏行 SHALL 输出 stderr 诊断（含行号与截断的内容摘要），其余行照常返回——坏行仍被跳过（append-only 账本不做原地修复），但不得静默：丢失的 run 行会使后续 run 号错位、审计拒绝一切写入，诊断是用户定位真因的唯一线索。

#### Scenario: 截断行后追加不腐蚀

- **WHEN** `log.jsonl` 末尾是一条无换行的截断 JSON，随后写入新记录
- **THEN** 新记录独立成行且可被正常读回；截断行成为可诊断的坏行，不连带损毁新记录

#### Scenario: 坏行诊断

- **WHEN** `log.jsonl` 含一行无法解析的内容
- **THEN** 读取时 stderr 出现含行号的诊断，合法行全部正常返回

### Requirement: 实验提交隔离仓库钩子

keep 的自动提交与 finalize 的整理提交 SHALL 以 `--no-verify` 隔离目标仓库自身的 git 钩子（husky/lint-staged 类 pre-commit 会改写暂存内容或拒绝提交，破坏「commit 恰好描述本次实验」的不变量）。提交失败时 SHALL 把 git 的 stderr 附进抛出的错误信息（不得以 `stdio: "ignore"` 吞掉诊断）。

#### Scenario: pre-commit 钩子不改写实验提交

- **WHEN** 目标仓库存在会改写暂存文件的 pre-commit 钩子，agent 以 keep 记录
- **THEN** commit 内容与暂存时一致（钩子未执行）

#### Scenario: 提交失败带诊断

- **WHEN** `git commit` 因仓库配置（如缺 user.email）失败
- **THEN** 抛出的错误信息包含 git 的 stderr 文本，而非裸的 "Command failed"

### Requirement: workingDir 失效显式失败

`.auto/config.json` 的 `workingDir` 已设置（非空字符串）但解析目标不存在或不是目录时，MCP 工具层 SHALL 显式失败并给出含该路径的明确错误（不得静默回退项目根——回退会把 discard/crash 的 `checkout HEAD -- . + clean -fd` 指向项目根，销毁研究目录之外的用户文件）。hook 层 SHALL 保持 fail-open（回退项目目录），但 SHALL 输出 stderr 诊断。config.json 整体不可解析时，工具与 hook 均 SHALL 输出 stderr 诊断后回退项目目录（与「无 config」的静默回退区分开）。

#### Scenario: workingDir 目录缺失

- **WHEN** config 设置了 `workingDir: "work/"` 但该目录不存在，agent 调用任一实验工具
- **THEN** 工具返回明确错误（含失效路径与修复提示），不执行任何 git/基准操作

#### Scenario: hook 对失效 workingDir fail-open 且出诊断

- **WHEN** workingDir 失效时触发 PreToolUse/Stop 等 hook
- **THEN** hook 回退项目目录继续判定（不因异常崩溃），stderr 含诊断行
