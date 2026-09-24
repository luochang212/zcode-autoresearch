# change 队列 worth-fix 审计：平台前提复核 + 逐项判定

> 2026-09-24 · 方法：worth-fix——真实性判定（源码实证 / 最小复现）与价值判定（四维 + 后悔不对称）分离进行，勘误显式记录。
> 触发：① pi 上游 1.6.2 → 1.8.1 delta 追平队列需要过一遍价值关；② zcode 开源（本机 clone，v3.14.3 @ 29628c9），ADR-1/3/4 的平台前提从「发行 bundle 实证」升级为「源码实证」。

## TL;DR 判定表

| #   | 队列项                               | 属实性                         | 值得做           | 处置                                          |
| --- | ------------------------------------ | ------------------------------ | ---------------- | --------------------------------------------- |
| B1  | discard-revisit（对齐 pi 1.8.0）     | 坐实（机制缺位，非 bug）       | 值得             | **P1 立项**（并入 B3 顺手项）                 |
| B2  | hooks 外部知识示例（G3.2 存量）      | 坐实（before 3/6）             | 低价值低成本     | **P2 可选**（教学材料）                       |
| B3  | confidence 持久化（G2.2）            | 坐实                           | 值得但不单独立项 | **并入 B1** 顺手做                            |
| B4  | finalize 空提交显式校验（G3.1 收尾） | **证伪**（影响不存在）         | 不修             | **出队**，留痕                                |
| B5  | session_status（G4.1）               | 属实（无此工具）               | 不值得           | **出队**，待真实消费者                        |
| B6  | doctor 基准预检（G4.2）              | 部分属实（价值被高估）         | 代码不做         | **降级**为 setup-guide 一行                   |
| B7  | holdout / scoped approval（G4.3）    | 前提未变                       | 不做             | **维持出队**（平台面勘误见 §A）               |
| B8  | （新）cron 链式续跑                  | 坐实（源码亲验，端到端未实测） | 值得评估         | **新 P1 候选**：先 change 论证 + 一次真机实测 |

## A. 平台前提复核（zcode 源码实证）

Hook 事件全集 = `SessionStart | UserPromptSubmit | PreToolUse | PermissionRequest | PostToolUse | PostToolUseFailure | Stop`（contracts/src/hooks/index.ts:7-15；plugin hooks 挂未知事件仅告警）。核心 runtime 在 apps/zcode-cli/packages/core/src。以下关键前提均由本仓 agent 亲验源码，另有子代理十问全量 survey（Q1-Q10 逐条 file:line）交叉印证，要点并入本节。

| 前提                            | ADR 当时证据          | 源码复核                                                                                                                                                                                                                                              | 结论                                                                                                      |
| ------------------------------- | --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Stop 续跑 3 次窗口              | ADR-1 bundle 实证     | `MAX_STOP_HOOK_CONTINUATIONS = 3`（core/src/runtime/methods/hooks.ts:10）；`shouldContinueAfterStopHooks` 还要求注入上下文非空（:122-129）                                                                                                            | **硬顶维持**——宿主常量不可配；我方 3 次窗口与平台上限精确对齐                                             |
| 续跑触发形式                    | 未记载                | 裸 `{"continue":true}` 不续跑（flag 置位但上下文为空）；`decision:"block"` 的 reason/systemMessage 自动成为注入上下文；exit code 2 亦可                                                                                                               | 我方 stop-continue.ts:76 用 block+reason，恰好是正确形式，安全                                            |
| stop_hook_active                | 未记载                | 第 2 次+ Stop fire 时 payload 携带（configured-runner-input.ts:54）                                                                                                                                                                                   | 我方 stdin 未透传；hooks 教学可补一句（微）                                                               |
| PreCompact / compaction 事件    | 无                    | 事件全集无 compaction；`SessionStart.source="compact"` 声明存在但**从未 dispatch**（仅 startup/resume：turn.ts:228-229、resume.ts:254-255）；摘要 prompt 硬编码（core/src/compact/prompt.ts），无注入点                                               | **硬顶维持**——连宿主的声明都是死的                                                                        |
| 工具动态显隐（pi 1.5.0 门控）   | ADR-1「无动态可见性」 | `listTools()` 仅连接时一次（adapters/src/mcp/index.ts:1066-1073）；全仓零 `tools/list_changed` 处理；仅静态 allow/denylist                                                                                                                            | **维持**——近似即最终形态；运行期门禁只能 PreToolUse deny（阻断≠隐藏）                                     |
| 外部中断（off 中止运行中 turn） | 无                    | AbortController 全内部；`deny.interrupt` 声明了但零消费者；命令是纯 prompt 模板（shell 展开被显式拒绝）                                                                                                                                               | **维持**                                                                                                  |
| UI 扩展点                       | 无                    | `PluginComponentKind = "agent"                                                                                                                                                                                                                        | "command"                                                                                                 | "skill" | "hook" | "mcp"`（contracts/src/plugins/index.ts:96-97），无 UI 类；唯一插件可见的宿主渲染面是 hook 的 `statusMessage` | **维持**——浏览器 dashboard 为最终形态 |
| PermissionRequest 能力          | 审计记「近似」        | **完整 broker**：deny(message 直达模型)、allow+持久 `permissionUpdates`、`updatedInput` 改写入参（core/src/tool/executor/hook-flow.ts:49-123）                                                                                                        | **勘误（正向）**：平台面强于审计记载；#1 门控的「近似」局限在我方用法，不在平台                           |
| 会话注入 / resume 触发          | bundle 零命中         | SessionStart("resume") 可向恢复的会话注入，但**无任何外部面能触发 resume**                                                                                                                                                                            | **维持**，但见 B8 新通道                                                                                  |
| **（新）CronCreate 自唤醒**     | 当时不可见            | agent 可调用工具（core/src/tool/handlers/cron.ts:108-121）；`sessionId: context.sessionId` 固定复用当前 session（:100-109 注释坐实）；delayMinutes 一次性 / interval 循环 / maxRuns 上限；**automation turn 内禁一切 Cron\*（:31-43）= 宿主级防失控** | **新通道**：有界自唤醒可行；不改写「无限 auto-resume 不可行」，但补上续跑策略里「用户再触发」的机器等价物 |

暂不入队的平台观察（记录不动）：`PostToolUseFailure` 事件（我方未用，crash 增强候选）；plugin `userConfig` + `${user_config.*}` 模板（配置面扩展候选）；PreToolUse `updatedInput`；插件可声明 `agents`（子代理）；hook 遥测事件（stdout/stderr 预览 ≤4000 字符进会话事件流）。

## B. 逐项 worth-fix

### B1. discard-revisit（对齐 pi 1.8.0）

**命题**：pi 1.8.0 的 discard 重访机制，我方是否缺失、值得对齐？

**前提核实**：

- pi 机制属实：每次 `log_experiment` 追加固定提问——「本结果是否推翻了某次 discard 的 rollback reason？若然，说明变了什么，把定向重试与其他候选一起权衡」（extensions/pi-autoresearch/index.ts:2476，源码亲读）；`asi.revisits_run` 标注重试 + `↻ Revisiting #N` 渲染（CHANGELOG 1.8.0 + 官方 feature post）。
- 我方缺失属实：`next_action_hint` 仅 cap/doom/连败/plateau 四分支（mcp/server.ts:934-944），无重访逻辑。
- 底座已在（修正上轮的隐含假设「我方完全没有指向 discard 理由的机制」）：`asi.rollback` 是我方契约字段（skills/autoresearch/SKILL.md:39），memory-inject 已提取（hooks/memory-inject.ts:76）；**但窗口仅最近 3 条 run**（:69 slice(-3)）、方向列表 8 条不带理由（:53 slice(-8)）→ 3 轮以外的 discard 理由不可见，正是 pi 式常驻提问的增量空间。

**四维**：触发概率 = 每次 log_experiment；影响面 = 中（挖掘「假设已失效」的旧 discard；pi 无对照实验数据，属 prompt 级赌注，预期收益但非确证）；成本 = 极低（1 条提示 + `asi.revisits_run` 透传——`Asi` 已有索引签名 mcp/lib/types.ts:24，无需类型变更 + dashboard 一处标注 + prompt.md 模板一节）；不修后果 = parity 扩大 + 机会损失。

**后悔不对称**：成本极低、影响中低——将来若发现漏挖了一个「假设已失效」的 discard，后悔超过现在顺手做的成本。做。

**与 ADR-5 相容**：advisory 信号，决策权留 agent。

**判定**：属实 + 值得 → **P1**。设计要点：提问指向账本 discard 行的 `asi.rollback`；可选增强 = memory-inject 把「discard + 理由」扩到与方向列表同窗（8 条）；dashboard 在 run 行渲染 `↻ Revisiting #N`。

### B2. hooks 外部知识示例（G3.2 存量）

**前提核实**：pi before 6 例（ls-tree 亲验），我方 3 例；缺的三例性质——`external-search` 是模板（依赖用户自备 search-cli，注释明说 "Swap the search-cli call"）、`qmd-search` 依赖 qmd npm 工具、`context-rotation` 自包含（纯 bash+jq）。三例都按 pi 字段名（`.last_run.asi.next_focus`）与 jq 写就，移植需 node 化 + 字段名适配（我方 `next_action_hint`）。

**价值重估**：教学材料而非开箱功能——我方 hooks 教学已教方法（SKILL.md），示例的价值是「外部知识注入」这条通道的叙事完备性。

**四维**：触发概率 = 低（按需取用）；影响面 = 小；成本 = 低（3 脚本 + README 行）；不修后果 = 小。

**判定**：属实 + 低价值低成本 → **P2 可选**。倾向做（生态完整性），external-search/qmd-search 需标注「依赖自备工具」。

### B3. confidence 持久化（G2.2）

**属实性**：坐实——ledger entry 无 confidence 字段（mcp/server.ts:880-893），仅工具返回值携带（:927）；rebuildState 每次全量重算，当前恰好算得出，但依赖账本完整且偏离 pi「每结果持久化」契约。

**四维**：影响 = 小（事后回溯便利）；成本 = 微；不修后果 = 小。

**判定**：属实但不值得单独立项 → **并入 B1 顺手做**（卫生级）。

### B4. finalize 空提交显式校验（G3.1 收尾）——**证伪**

**命题**：我方 finalize 可静默产出与 merge-base 相同的空分支（pi 有 `verify_no_empty_commits`；我方 scripts/finalize.sh:119 对无 staged 变更静默跳过提交）？

**实证**（真实 finalize.sh × 真实临时 git 仓库，4 探针）：

1. 正常 2 组拆分 → 两分支各 ahead=1、文件归属正确。
2. 组链之外的未归组变更 → union 校验失败 → 自动回滚、建出的分支清空、原分支完好（exit 1）。
3. 分支名冲突 → FATAL + 干净回滚。
4. 纯 session 文件的组 → FATAL "no non-session files"。

**推理闭环**：ENTRIES 非空（:74）+ 组间重叠拒绝（:68-70）⇒ 组内文件在 PREV 的内容 = 在 MB 的内容 ⇒ staged diff 必非空；即使病态构造使某分支无内容差，union 校验（:129-141）必失败回滚 → **空分支不可存活**。

**勘误**：pi 需要这道验证是其构造方式（累计 checkout+commit）的产物；我方增量 file-set 构造天然免疫。上轮报告把「缺这道验证」记为功能缩水，属**高估**。

**判定**：证伪（影响不存在）→ **不修，出队**。

### B5. session_status 决策引导工具（G4.1）

**消费者审查**：循环内 agent 已被 memory-inject 每轮覆盖；循环外消费者（人/其他工具）已有 live dashboard + export + 账本直读；不存在需要第三条查询面的真实消费者。

**判定**：属实（无此工具）但不值得 → **出队**，待真实消费者出现再立项。

### B6. doctor 基准预检（G4.2）

**前提核实**：`init_experiment` 不跑 measure.sh（server.ts init 只写 config+冻结哈希，baseline 来自 run #1）→ measure.sh 坏掉的代价 = 首次 run_experiment 报解析错误，浪费一次基准执行，agent 拿报错自修复；稳定性维度已有 repeat(1-10)+median。

**四维**：触发概率 = 低-中（setup 一次性，.auto/ 跨会话复用）；影响 = 一次浪费且自恢复；成本 = 中（新命令+测试+文档）。

**ADR-5 佐证**：doctor 已被定位为「对抗场景后置项」（签名/信任模型），非当下缺口。

**判定**：代码命令**不做**；降级为 setup-guide 一行（init 前手动跑两遍 measure.sh，数字须在噪声内重合）——零代码缓解。

### B7. holdout / scoped approval（G4.3）

**勘误（平台面）**：PermissionRequest 是完整 broker，scoped approval 的技术路径存在——「平台受限」的说法不成立。

**但**：ADR-4 否决理由（成本中高、依赖先有决策引擎与 doctor）依然成立，且两者刚被判不做。

**判定**：**维持不做**；勘误记录在案——未来若做，路径 = PermissionRequest `permissionUpdates`/`updatedInput`，而非当年设想。

### B8.（新）cron 链式续跑——无人值守缺口的有界方案

**前提（源码亲验，见 §A 末行）**：CronCreate agent 可调用、固定复用当前 session、三种有界调度（delayMinutes / interval / maxRuns）、automation turn 内禁一切 Cron 写（宿主级防失控）；我方 maxIterations / consecutiveFailures 状态机硬护栏照常生效。

**与 ADR-3 的关系**：不改写「无限 auto-resume 不可行」（Stop 硬顶 = 3 仍真，宿主常量）；是续跑策略第三条「用户再触发」的机器等价物——过夜无人值守缺口（vs pi 的 200-turn auto-resume，我方最大的真实能力差）的第一个低成本真解。典型形态：循环耗尽 Stop 窗口时，agent 建一个 interval+maxRuns 的 cron（如每 5 分钟、上限 N 次），唤醒提示自带状态检查（无活跃会话则空转）；/autoresearch off 与 clear 增加清理步骤（CronList/CronDelete 需在非 automation turn 做，或提示用户删）。

**四维**：触发概率 = 每个耗尽 3 次窗口的长会话；影响面 = 大；成本 = 低-中（SKILL 规程 + stop-continue 提示词分支 + off/clear 清理语义 + 文档；宿主零改动）；不修后果 = 永久能力差。

**诚实标注验证边界**：源码语义已亲验；**端到端未实测**——cron 触发 → automation turn → 续跑的真实链路、tools 在各 permission mode 下的可用性，需一次真机验证后再实施。

**判定**：**新 P1 候选**——先走 openspec change 论证（design 定清理语义与防失控边界），实施前真机实测；平台可行性判定的更新按铁律 5 进 ADR。

## C. 更新后的队列

1. **P1 `discard-revisit`**：重访提问 + `asi.revisits_run` 透传与 dashboard 标注 + prompt.md 模板重访条件栏；顺手项：confidence 快照进 entry（B3）。
2. **P1 `cron-chained-continuation`（新，待论证 + 实测）**：过夜无人值守的有界自唤醒；先 change 论证，再真机实测，平台判定更新进 ADR。
3. **P2 `hooks-examples-external-knowledge`**（B2，可选）。
4. **docs 微项**：setup-guide 补 measure.sh 手动预检一行（B6）；hooks 教学补 stop_hook_active 记载（微）。
5. **出队**：finalize 空提交（证伪）、session_status、doctor、holdout。

## 证据索引

- zcode 源码：开源仓库本机 clone（v3.14.3 @ 29628c9）；文中引用均为仓内相对路径。核心 runtime：apps/zcode-cli/packages/core/src；契约：apps/zcode-cli/packages/contracts/src；MCP 适配：apps/zcode-cli/packages/adapters/src/mcp。
- pi 上游：archived/pi-autoresearch 已 fetch 至 origin/main（v1.8.1）；机制引文见 §B1。
- finalize 探针：§B4 四条，临时仓库已删，按步骤可复现（git init → 造组链 commit → 写 groups.json → bash plugin/scripts/finalize.sh）。
- 子代理全量 survey：Q1-Q10 十问逐条 file:line（要点已并入 §A）。
