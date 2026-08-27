# pi-autoresearch 差距分析：追平路线图

> 2026-08-27 · OpenSpec change: `research-pi-gap-analysis`
> 目标：在适配 zcode 且条件允许的前提下追平 pi-autoresearch。素材：`archived/pi-autoresearch`（v1.6.2）、npm/GitHub 实查数据、我方 `plugin/`（v0.1.0）。

## 1. pi 四维全貌

### 1.1 触发机制

**用户触发（`/autoresearch` 命令，index.ts:2949-3066）**：
- 无参数 → 只显示帮助；
- `off` → 关模式 + 清运行时状态 + 停止 dashboard + 若在跑则 `ctx.abort()`；
- `clear` → off 全部 + 删除 jsonl + 重置状态；
- `export` → 开浏览器 dashboard；
- `<text>` → 进入模式，**kickoff 双路径**：有 `.auto/prompt.md` 发纯文本 resume；没有则发 `/skill:autoresearch-create <text>`（pi 输入管线展开成 SKILL.md，需 `enableSkillCommands`）。

**自动激活（`shouldAutoActivateAutoresearch`，index.ts:521-534）**：会话开始/切树时（`session_start`/`session_tree`，1464-1465）——磁盘有 `.auto/log.jsonl` 且（无记录决策或记录决策为真）且 cwd==workDir → 自动进模式。**激活决策持久化**（1107-1113, 545-559）：`/autoresearch on|off` 写 custom entry 到 session branch，跨 /tree/compaction/reload 存活。

**session 生命周期事件注入**（1.4 表）：`before_agent_start` 给 systemPrompt 追加"Autoresearch Mode (ACTIVE)"区块——全部是**指针**（规则文件路径 + 工具提醒 + checks/ideas 提示 + guardrail），非文件内容（cache-safe）；`session_before_compact` 注入**确定性 compaction 摘要**（替代 LLM 摘要）；`agent_end` 调度下一条 resume 消息。

### 1.2 架构

三层解耦（与既有研究一致，本次补全细节）：
- **extension**（领域无关基础设施，3067 行 TS）：工具、命令、widget/overlay/dashboard、auto-resume、git、hooks 触发、compaction。
- **skill**（领域知识）：create（冷启动）、hooks（教写迭代钩子）、finalize（分支整理）。
- **slash command**（模式开关）：生命周期控制，不含流程。
- 状态 = 磁盘 `.auto/` + session branch 记忆，内存仅缓存。

### 1.3 能力清单（28 项，节选关键）

| # | 能力 | 位置 | 对核心循环价值 |
|---|---|---|---|
| 1 | 门控工具三件套（非模式不可见） | index.ts:1090-1105 | 核心 |
| 2 | 自动激活（有 log 自动进模式） | index.ts:521-534 | 运维 |
| 3 | 激活决策持久化（off 跨 session 存活） | index.ts:1107-1113 | 运维 |
| 4 | kickoff 双路径（resume / skill 展开） | index.ts:3041-3043 | 核心 |
| 5 | systemPrompt 指针注入（每 session） | index.ts:1519-1557 | 核心 |
| 6 | **确定性 compaction 摘要**（规则/ideas/近 50 run+ASI） | compaction.ts:45-56 | 核心（信息零丢失） |
| 7 | **auto-resume 双门控**（agent_end/compact 后调度下一条） | index.ts:1171-1219 | 核心 |
| 8 | 停摆护栏（200 回合 + 20 连败） | index.ts:114-147 | 运维 |
| 9 | resume 800ms settle 窗口 | index.ts:1115-1136 | 核心 |
| 10-14 | 输出双截断 / METRIC 解析 / measure 锁定 / checks 背压 / 自动 git | ✓ 我方已有 | 核心 |
| 15 | ASI 结构化记忆（revert 后唯一幸存，compaction 提炼 hyp/next/rollback） | index.ts:2271-2286 | 核心 |
| 16 | confidence（MAD 三色，persist 到 jsonl） | index.ts:426-457 | 体验 |
| 17 | segment/reinit（换目标不污染） | index.ts:1590-1605 | 核心 |
| 18 | maxIterations 上限 | index.ts:1711-1720 | 运维 |
| 19 | **workingDir 重定向**（研究目录独立于 cwd） | index.ts:493-499 | 运维 |
| 20 | TUI 常驻 widget（实时结果表） | index.ts:1394-1462 | 体验 |
| 21 | 全屏 overlay（Ctrl+Shift+F 可滚动） | index.ts:2575-2718 | 体验 |
| 22 | 浏览器 live dashboard（本地 HTTP + SSE + 折线图） | index.ts:2811-2943 | 体验 |
| 23 | **迭代钩子**（.auto/hooks/before.sh+after.sh，stdin JSON，stdout→steer，30s/8KB） | hooks.ts:1-180 | 核心（外部扩展点） |
| 24 | autoresearch-create skill（冷启动） | skills/create | 核心 |
| 25 | **autoresearch-finalize**（kept 实验→独立分支 + 4 道验证） | finalize.sh:1-448 | 运维（产出整理） |
| 26 | autoresearch-hooks skill（教学 + 10 示例） | skills/hooks | 体验（生态） |
| 27 | .auto/ 布局 + legacy 回退 | paths.ts | 运维 |
| 28 | clear 双路径删除 | index.ts:2988-3024 | 运维 |

**CHANGELOG 能力演进画像**（追平顺序参考）：1.0 核心循环 → 1.1 迭代钩子生态 → 1.3 确定性 compaction（信息零丢失，护城河）→ 1.5 工具门控护栏 → 1.6 激活精确性/停摆护栏。**先循环，再生态，再护城河，再护栏，最后体验**。

### 1.4 效果证据（分级，查询日 2026-08-27）

| 证据 | 级别 | 内容 |
|---|---|---|
| Tobi Lütke 对 Shopify/liquid 的 PR #2056 | **S** | parse+render **53% 快、分配 61% 少**，~120 实验/93 commits，974 测试全过；公开可复现；但 PR 未合并，作者自认"probably overfit" |
| 循环机制/双文件持久化/MAD 置信度（代码内可验证） | **S** | 仓库代码 + tests |
| Westland 独立实测 | **A** | 1h/49 实验/20 keep，p95 339→34ms，$24.10，记录到一次真实 reward hacking |
| Ocytko 三次实验 | **A** | Go 测试时间 47-48%（$0.28）、Java 38-39%（$0.69）；并指出过拟合风险 |
| Shopify 官方"单测 300×/CI 65%/React 20%" | **B** | 无公开 benchmark；300× 为数百小优化累计 |
| npm/GitHub | — | 总下载 16,102、月 4,885、周 1,189；stars 7,875/forks 447；最新 commit 2026-07-15（约 6 周暂停）；0 运行时依赖 |

**关键结论**：pi 自身**没有任何"N 倍自我提速"声称**——它的"效果"是"让 agent 替你批量跑实验"，证据以 S/A 级为主，且社区普遍警告噪声与过拟合。**最强效果证据（Liquid）来自 pi 生态配合，且前置条件是"指标清晰 + 防作弊 + 基准可复现"**——这正是我们已有机制（measure 锁定/checks/账本）所保证的。追平 pi 的能力，比追平它的"效果数字"更可验证。

## 2. 我方插件审计（v0.1.0 对照 28 项）

**已有（12 项）**：#4 kickoff 双路径（commands/autoresearch.md）、#10 输出双截断（server 10行/4KB+log_file）、#11 METRIC 解析、#12 measure 锁定、#13 checks 背压、#14 自动 git（含 .auto 豁免、noop 不回滚）、#15 ASI 记录（asi 存账本；但 **hook 不提炼 hyp/next/rollback**）、#16 confidence（计算+返回；**未 persist**）、#17 segment、#18 maxIterations、#24 create skill（SKILL.md+setup-guide）、#27 .auto/ 布局。

**部分（2 项）**：#5 systemPrompt 注入（SessionStart hook 注入提示，非每 session 规则指针）、#22 dashboard（静态 HTML ✓，无 SSE/服务器）。

**缺失（14 项）**：#1 门控工具、#2 自动激活、#3 激活决策持久化、#6 确定性 compaction、#7 auto-resume、#8 停摆护栏参数、#9 settle 窗口、#19 workingDir、#20 widget、#21 overlay、#23 迭代钩子、#25 finalize、#26 hooks 教学、#28 clear 命令。

## 3. 差距矩阵（三分类）

### 可追平（zcode 有等价实现路径，直接做）

| pi 能力 | 我方现状 | 实现路径 |
|---|---|---|
| #23 迭代钩子 | 缺失 | `run_experiment` 前跑 `.auto/hooks/before.sh`、`log_experiment` 后跑 `after.sh`（stdin JSON 契约、30s 超时、stdout→返回 steer 字段）——纯工具逻辑，无平台依赖 |
| #26 hooks 教学 skill | 缺失 | 移植 pi 的 SKILL.md 结构 + 示例脚本 |
| #28 clear 命令 | 缺失 | 新增 `/autoresearch:clear` command（删 .auto/log.jsonl + 重置） |
| #15 ASI 提炼 | 部分 | memory-inject/stop-continue 从账本提取 `asi.hypothesis/next_action_hint/rollback` 注入 |
| #8 停摆护栏参数 | 部分 | isStopReached 连续失败阈值可配（env/config），对齐 20 连败语义 |
| #16 confidence persist | 部分 | run 记录写 confidence 字段（dashboard 已读账本可展示） |
| #22 SSE dashboard | 部分 | export_dashboard 增加本地 HTTP server + `/events` SSE + jsonl 重拉（纯 node，无平台限制） |
| #19 workingDir | 缺失 | server 读 `.auto/config.json` 的 `workingDir` 并 chdir（或按 workDir 解析路径） |
| #25 finalize | 缺失 | 移植 finalize.sh 逻辑（kept 分组 → 独立分支 + 验证）为 command/skill |
| #3 激活决策持久化 | 缺失 | `.auto/config.json` 记录 off 决策，SessionStart hook 读取 |

### zcode 受限（有替代方案但有损）

| pi 能力 | 替代方案 | 损失 |
|---|---|---|
| #1 门控工具（非模式不可见） | MCP 工具恒定可见；PermissionRequest hook 在非模式时 deny（需权限询问触发）+ 工具内检查 .auto 状态 | 工具出现在 schema（有认知噪音）；无法 100% 拦截低风险调用路径 |
| #2 自动激活 | SessionStart/UserPromptSubmit hook 检测 `.auto/log.jsonl` 存在 → 注入"会话可续跑"提示 + 引导 `/autoresearch:autoresearch` | 无工具门控配合，agent 需显式进入 |
| #5 systemPrompt 注入 | SessionStart hook 注入规则指针（"每 session 读 prompt.md"）| 仅 session 开始注入一次，非每轮系统提示 |

### 平台不可行（依赖 zcode 不存在的 API，放弃并记录）

| pi 能力 | 依赖 | 我方最终形态 |
|---|---|---|
| #6 确定性 compaction 摘要 | zcode 无 PreCompact/compact 事件（诊断文档确认仅 7 事件） | memory-inject（UserPromptSubmit 每轮注入账本尾行）作为准记忆恢复 |
| #7 auto-resume 无限续跑 | zcode 无 sendUserMessage 会话注入（bundle 零命中，§4.1 实证） | Stop hook 3 次窗口 + 用户回车恢复（已有） |
| #9 resume settle 窗口 | 同上（平台调度） | 平台处理，无需追平 |
| #20 TUI 常驻 widget | zcode 无 widget API | 静态 dashboard HTML（已有） |
| #21 全屏 overlay | zcode 无快捷键/overlay 扩展点 | 浏览器 dashboard 替代 |

## 4. 追平路线图

排序依据：价值（对核心循环） × 用户可感知度 ÷ 成本。参考 pi 自身演进画像（先生态，再护城河，再护栏，再体验）。

**里程碑 1（quick wins，高价值低成本，1 个 change 可完成）**
- 迭代钩子 before/after（#23）——**pi 唯一的外部扩展点，生态开放性的根基**；
- `clear` 命令（#28）+ ASI 三字段提炼（#15）+ 停摆护栏参数对齐（#8）。
- 验证：单元测试（hooks 执行/超时/steer）+ 协议级（before 在 run 前、after 在 log 后触发）。

**里程碑 2（体验与工程，中成本）**
- SSE live dashboard（#22）：静态 HTML → 本地 server + `/events` + 折线图；
- workingDir 重定向（#19）；
- finalize 分支整理（#25）。
- 验证：浏览器实测 + finalize 测试（复用 pi 的 19 场景测试思路）。

**里程碑 3（受限近似，低成本，可与 M1 合并）**
- PermissionRequest 门禁近似（#1）、SessionStart 自动激活提示（#2+#3）。
- 验证：hook 契约测试。

**明确不追平**（平台不可行，记录在 README 已知边界）：确定性 compaction、无限 auto-resume、widget/overlay。

## 5. 决策记录

- **ADR-3**（`adr/decisions/3-pi-gap-catch-up-priority-*.md`）：追平优先级——里程碑 1（迭代钩子/clear/ASI 提炼/停摆参数）先行；平台不可行项（compaction 摘要、无限 auto-resume、widget/overlay）明确放弃，以 memory-inject、Stop 3 次窗口、静态 dashboard 作为最终形态。

## 附录：证据索引

- pi 代码：`archived/pi-autoresearch/extensions/pi-autoresearch/index.ts`（触发 521-534/2949-3066、dashboard 2811-2943、生命周期 1464-1557）、`compaction.ts`、`hooks.ts`、`skills/autoresearch-{create,hooks,finalize}/`。
- pi 效果：`api.npmjs.org/downloads`、`api.github.com/repos/davebcn87/pi-autoresearch`、Shopify/liquid PR #2056、simonwillison.net 2026-03-13。
- 我方：`plugin/mcp/server.mjs`、`plugin/hooks/*`、`plugin/skills/autoresearch/*`。
