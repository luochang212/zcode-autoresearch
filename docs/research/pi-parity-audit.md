# pi-autoresearch 验收审计:当前实态差距报告

> 2026-08-27 · OpenSpec change: `audit-pi-autoresearch-gap`
> 基线:pi v1.6.2(`archived/pi-autoresearch`)↔ 我方 `plugin/`(commit `6c52535`,58/58 测试通过,`node --test tests/*.test.mjs`)。
> 性质:**验收审计**——以代码实态为准,取代 `pi-gap-analysis.md` §2–§4 的规划期差距矩阵(那份写于里程碑实现之前)。

## TL;DR

- 上轮标记"缺失 14 项"中的 **9 项已全部落地**(门控近似、自动激活、激活持久化、workingDir、SSE dashboard、迭代钩子、finalize、hooks 教学、clear),3 项平台硬顶维持原判。
- 追平质量总体扎实,且已**超出 pi** 9 项(审计不变量、基准漂移检测、次级度量约束等,见 §4)。
- 但细粒度核对发现 **2 条契约不一致(含 1 个功能级 bug)、2 条观测缺口、3 条功能缩水**,以及上轮路线图 3 条 P2 遗留——共 10 条残留差距,分级见 §1。
- 最优先修复:**hook payload 缺 `asi` 字段**——我方自带示例 `hypothesis-reflection.sh` 因此永久失效(§1 G1.1)。

## 1. 残留差距清单(按严重度)

### G1 契约不一致(bug 级,建议立即修)——**已修复**(change `fix-hook-contract`,2026-08-27)

> G1.1/G1.2 连同 G2.1 已由 `fix-hook-contract` 修复并回归测试(60/60):payload 补 `asi`、失败/超时以 `*_steer` 返回 `[<stage> hook exited N]` 提示(fail-open 不变)、每次 fire 追加 `{type:"hook"}` 观测条目。原审计复现场景闭环复验通过(`hypothesis-reflection.sh` 不再误报)。以下为原始审计记录。

**G1.1 hook payload 缺 `asi` 字段 —— 示例脚本永久误报** ✅已实测坐实(2026-08-27 E2E)

- pi 契约:before.sh 的 `last_run.asi` 与 after.sh 的 `run_entry.asi` 都透传 agent 记录的 ASI(**pi 源码坐实**:payload 传 `last_run: readLastRun(workDir)` / `run_entry: jsonlEntry` 完整条目,index.ts:1648/2453/2474)。
- 我方实态:`server.mjs:285-298` 的 `last_run` 只传 `{run,status,metric,description}`;`server.mjs:300-315` 的 `run_entry` 只传 `{run,status,metric,description,commit}`——都不含 `asi`。
- **实测复现**(真 server.mjs 走 JSON-RPC,临时 git 仓库):账本 run 含 `asi:{hypothesis:"cache the sort key"}` → before.sh 实际收到的 `last_run` 为 `{run,status,metric,description}` 无 asi → 把该**真实 stdin** 喂给 `hypothesis-reflection.sh`,它输出 "The last run had no recorded hypothesis"——尽管账本里记录了。误报坐实,`SKILL.md:20` 声称的 `asi?` 契约未兑现。
- 修复方向:`runBeforeHook`/`runAfterHook` payload 补 `asi`;`hooks.test.mjs` 补契约测试(当前无 asi 覆盖,测试盲区)。

**G1.2 hook 失败/超时静默,无 error steer** ✅已实测坐实(2026-08-27 E2E)

- pi 契约(**源码坐实** `hooks.ts` `steerMessageFor`):timedOut → `[before hook timed out after 30s]`;exitCode≠0 → `[before hook exited N]` + stderr/stdout 内容,作为 steer 送达 agent。
- 我方实态:`server.mjs:251-273` `runHook` 对错误/超时一律 `resolve(null)` 全静默;SKILL.md:17 自述 "fail-open (errors never block the loop)"。
- **实测复现**:before.sh `exit 3`(marker 文件证明钩子确被 fire)→ `run_experiment` 返回 JSON 无任何 hook 失败痕迹,**server stderr 日志同样无痕迹**——比静态审计结论更彻底:不仅 agent 不知,连排查渠道都没有。
- 修复方向:error/timeout 时返回 `{ error_steer: "hook before.sh failed: …" }`(不阻断循环),对齐 pi 的错误可见性。

### G2 观测缺口(中优先级)

**G2.1 hook fire 不写 `{"type":"hook"}` 条目到 log.jsonl** ✅已实测坐实(2026-08-27 E2E)——**已修复**(change `fix-hook-contract`)

- pi(**源码坐实** `hooks.ts` `appendHookLogEntryIfConfigured`):每次 fire 追加 `{type:"hook", stage, exit_code, duration_ms, stdout_bytes, timed_out}`。
- 我方实测:before.sh fire 后 log.jsonl 中 `"type":"hook"` 条目数为 0。dashboard 与 post-hoc 分析看不到钩子活动/耗时/输出,排查"钩子到底跑没跑"无据可依。
- 修复方向:runHook 后 appendLedgerEntry type:"hook"。数据流已核实兼容:`rebuildState` 只收 `type:"run"`(ledger.mjs:80),hook 条目不会进 `state.runs`;`validateLedger` 的 `unknown row type` 分支(validate.mjs:41-43)只接收 `state.runs` + 待写入 entry,接触不到 hook 条目。

**G2.2 confidence 未持久化到 run 条目**

- pi:"Persisted to `.auto/log.jsonl` on each result for post-hoc analysis"。
- 我方:`rebuildState`(ledger.mjs:95-106)每次重算 confidence,仅放在 `log_experiment` 返回值(server.mjs:588-590);`entry`(server.mjs:547-558)不含 confidence 字段。
- 影响:无法事后回溯"当时置信度如何",只能整体重算(恰巧当前算得出,损失有限,但偏离 pi 契约且依赖账本完整)。
- 修复方向:log_experiment 写 entry 前把 `confidence` 快照进 entry。

### G3 功能缩水(中优先级)

**G3.1 finalize 只有 union 一道验证(pi 有四道)**

- pi `finalize.sh`(archived 版):分组阶段 `assert_no_overlapping_files`(组间文件重叠即 fail,121-128)+ `verify_union_matches_original`(272)+ `verify_no_session_artifacts`(308)+ `verify_no_empty_commits`(326),由 `verify_branches`(351)汇总。
- 我方 `plugin/scripts/finalize.sh`:只有 union 验证(85-105,且顺带 `grep -v .auto`);无 no-overlap 断言(README/pi 均要求 "Groups must not share files")、无 empty-commit 检查、无独立的 session-artifacts 验证。
- 影响:重叠分组可静默通过,产生无法独立 review 的分支——正是 finalize 要防的。
- 修复方向:补三道验证,对齐 pi;finalize.test.mjs 补对抗用例。

**G3.2 hooks 示例 6/9,缺的恰是"外部知识注入"类**

- pi before 示例 6 个:anti-thrash、context-rotation、external-search、hypothesis-reflection、idea-rotator、qmd-search;我方 3 个(缺后三者)。
- external-search/qmd-search/context-rotation 是把**外部信息**注入循环的三条通道——对假设质量价值最高的一类;我方现有的 3 个全是"内省型"(防重复/换思路/反思)。
- 修复方向:移植三个外部知识类示例(node 解析、无 jq 依赖,沿用我方示例风格)。

**G3.3 before.sh 缺"模式激活"触发点**

- pi:before.sh 在 `/autoresearch` 激活时也 fire 一次(README:"at `/autoresearch` activation and at the end of every `log_experiment`")。
- 我方:仅 `run_experiment` 内 fire(server.mjs:392)。激活→首轮实验之间无钩子窗口。
- 影响:小(首轮实验前仍会触发);如需完全对齐,可在 session-start 提示或首次 run 前 fire。可不修,记录偏差即可。

### G4 上轮路线图遗留(非 pi 对标项,来源 `next-steps.md`)

| #    | 项                                 | 现状                                                                                            |
| ---- | ---------------------------------- | ----------------------------------------------------------------------------------------------- |
| G4.1 | `session_status` 决策引导工具(P2)  | 未做;目前只有 `log_experiment` 返回内嵌的 `next_action_hint`(server.mjs:595-603),无独立查询工具 |
| G4.2 | 基准信任预检 doctor                | 漂移检测已做(benchmarkHashes,server.mjs:194-245);"开跑前验证基准可解析/稳定"的预检命令未做      |
| G4.3 | holdout 验收 / scoped approval(P2) | 未排期(ADR-4 记录为 P2)                                                                         |

P0/P1 已全部落地:memory-inject 聚合摘要 ✓、doom-loop ✓、审计不变量 ✓、漂移检测 ✓、次级约束 ✓。

## 2. 28 项能力逐项验收(修正矩阵)

判定:✅已对齐 / ➕超出 / ⚠️缩水 / ❌缺失 / 🧱平台硬顶。

| #   | 能力              | 上轮判定   | 本次判定 | 证据                                                                                                    |
| --- | ----------------- | ---------- | -------- | ------------------------------------------------------------------------------------------------------- |
| 1   | 门控工具          | 可追平     | ✅(近似) | hooks/permission-gate.mjs:无会话时 PermissionRequest deny;已文档化"近似"局限                            |
| 2   | 自动激活          | 可追平     | ✅       | hooks/session-start.mjs:有 log.jsonl 即注入续跑提示                                                     |
| 3   | 激活决策持久化    | 可追平     | ✅       | commands/off.md 写 `autoresearchOff`→config.json;session-start.mjs:14-19 读取                           |
| 4   | kickoff 双路径    | 已有       | ✅       | commands/autoresearch.md                                                                                |
| 5   | systemPrompt 注入 | 部分       | ➕       | UserPromptSubmit 每轮 memory-inject(强于 pi 的 session 级指针;compaction 变相,ADR-4)                    |
| 6   | 确定性 compaction | 平台不可行 | 🧱(变相) | memory-inject 聚合摘要:方向去重+best 轨迹+近 3 条 ASI+doom 警告                                         |
| 7   | auto-resume       | 平台不可行 | 🧱       | Stop hook 3 次窗口(stop-continue.mjs)+ plateau 收敛分支;README 已知边界                                 |
| 8   | 停摆护栏          | 部分       | ✅       | maxIterations(默认 20,env/config 可配)+ consecutiveFailures(默认 3,可配,server.mjs:81-85)               |
| 9   | settle 窗口       | 平台不可行 | 🧱       | 无需追平(平台调度)                                                                                      |
| 10  | 输出双截断        | 已有       | ➕       | 10 行/4KB + >2MB spill 到日志文件(server.mjs:94-102,119-134)                                            |
| 11  | METRIC 解析       | 已有       | ✅       | lib/experiment.mjs parseMetricLines                                                                     |
| 12  | measure 锁定      | 已有       | ➕       | 锁定 + **基准漂移检测**(哈希变更强制新 segment,server.mjs:232-245)——pi 无                               |
| 13  | checks 背压       | 已有       | ➕       | 背压 + keep gate(checks 失败禁 keep,server.mjs:462-468)                                                 |
| 14  | 自动 git          | 已有       | ➕       | + keep-无变更拒收(536-539)、crash-未回滚禁续跑(359-365)——pi 无                                          |
| 15  | ASI 记忆          | 部分       | ✅       | asi 进账本;memory-inject/stop-continue 提取 hyp/next/rollback                                           |
| 16  | confidence        | 部分       | ⚠️       | 计算并返回 ✓;**未持久化**(G2.2)                                                                         |
| 17  | segment           | 已有       | ✅       | init_experiment 递增 segment,换目标不污染                                                               |
| 18  | maxIterations     | 已有       | ➕       | 到达即拒绝新 run(server.mjs:355-357),严于 pi 的"告知停止"                                               |
| 19  | workingDir        | 缺失       | ✅       | lib/paths.mjs resolveWorkCwd;server/hooks 全链路使用                                                    |
| 20  | TUI widget        | 平台不可行 | 🧱       | 浏览器 dashboard 替代                                                                                   |
| 21  | overlay           | 平台不可行 | 🧱       | 同上                                                                                                    |
| 22  | dashboard         | 部分       | ✅       | lib/dashboard-server.mjs:HTTP+/events SSE+jsonl 重拉;export_dashboard 返回 live URL                     |
| 23  | 迭代钩子          | 缺失       | ⚠️       | 30s/8KB/stdout→steer ✓;**payload 缺 asi(G1.1)、错误静默(G1.2)、无 hook 条目(G2.1)、缺激活触发点(G3.3)** |
| 24  | create skill      | 已有       | ✅       | skills/autoresearch/(SKILL+setup-guide+loop-protocol)                                                   |
| 25  | finalize          | 缺失       | ⚠️       | scripts/finalize.sh 分支整理 ✓;**只有 union 一道验证(G3.1)**                                            |
| 26  | hooks 教学        | 缺失       | ⚠️       | SKILL.md 契约教学 ✓;**示例 6/9(G3.2)**                                                                  |
| 27  | .auto/ 布局       | 已有       | ➕       | + guard-frozen.mjs 冻结文件写保护(pi 无,pi 仅靠 revert 豁免)                                            |
| 28  | clear             | 缺失       | ✅       | clear_experiments 工具 + commands/clear.md                                                              |

注:pi 的 `/autoresearch off` 还会 abort 运行中的实验(平台 API,zcode 无)——归入 #7 硬顶,已文档化。

## 3. 平台硬顶复核(维持 ADR-3/ADR-4 原判)

| 项                  | 原判             | 复核                                                      |
| ------------------- | ---------------- | --------------------------------------------------------- |
| 无限 auto-resume    | 高成本替代不值得 | 维持;Stop 3 次窗口为最终形态                              |
| compaction 事件摘要 | 低成本变相已做   | memory-inject 已落地(➕),时机绑定 compaction 事件仍不可行 |
| widget/overlay      | 平台硬顶         | 维持;浏览器 dashboard 为最终形态                          |
| 无头 hooks          | 平台硬顶         | 维持;README 已知边界与实态一致                            |

## 4. 超出 pi 的自有能力(9 项)

| 能力                                                                           | 位置                                            | 价值                                             |
| ------------------------------------------------------------------------------ | ----------------------------------------------- | ------------------------------------------------ |
| 审计不变量(keep 必须真实改进/discard 改进须 failed guard/事件顺序/commit 字段) | lib/validate.mjs + server.mjs:507-524           | 把"账本合法"从约定变硬保证(源自 leo 系审计设计)  |
| 基准漂移检测(冻结文件哈希)                                                     | server.mjs:194-245                              | 防中途改裁判,指标不可比即警告                    |
| 次级度量阻塞约束                                                               | server.mjs:474-495                              | 防 reward hacking(Westland 实证场景)             |
| crash-未回滚禁续跑 / keep-无变更拒收                                           | server.mjs:359-365, 536-539                     | 状态永远合法                                     |
| doom-loop / plateau 检测                                                       | lib/experiment.mjs detectDoomLoop/detectPlateau | 长跑健壮性(重复/震荡/收敛识别)                   |
| 冻结文件写保护(PreToolUse deny)                                                | hooks/guard-frozen.mjs                          | pi 仅靠 revert 豁免,无主动拦截                   |
| 每轮聚合记忆注入                                                               | hooks/memory-inject.mjs                         | 强于 pi 的 session 级指针;方向去重+best 轨迹+ASI |
| repeat/median 基准(1-10 次)                                                    | server.mjs:386-418                              | 噪声指标置信度(pi 无内建)                        |
| 输出溢出 spill 到文件                                                          | server.mjs:119-134                              | 大输出不截断丢失,可回看                          |

## 5. 建议的后续 change 队列

1. **`fix-hook-contract`**(G1.1+G1.2+G2.1,一个 change):payload 补 asi、错误 error_steer、hook 条目入账本;SKILL.md 对齐;hooks.test.mjs 补契约测试(当前 asi 零覆盖)。——高优先,自产示例已受损。
2. **`finalize-full-verification`**(G3.1):补 no-overlap/no-empty-commits/no-session-artifacts 三道验证 + 对抗测试。
3. **`hooks-examples-external-knowledge`**(G3.2):移植 external-search/qmd-search/context-rotation 三示例。
4. G2.2(confidence 持久化)可并入 1;G4 按原 P2 排期。

## 证据索引

- pi 契约:`archived/pi-autoresearch/README.md`(Hooks/Confidence 节)、`skills/autoresearch-hooks/examples/`、`skills/autoresearch-finalize/finalize.sh`。
- 我方:`plugin/mcp/server.mjs`、`plugin/mcp/lib/{ledger,dashboard-server,paths,validate,experiment}.mjs`、`plugin/hooks/*`、`plugin/scripts/finalize.sh`、`plugin/skills/autoresearch-hooks/SKILL.md`、`plugin/commands/{off,clear}.md`。
- 测试:`node --test tests/*.test.mjs` → 58 pass / 0 fail(2026-08-27);盲区:hooks.test.mjs 无 asi 断言。
