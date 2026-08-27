# 下一步方向研究（next steps）

> 2026-08-27 · OpenSpec change: `research-next-steps`
> 前置：`pi-gap-analysis.md`（28 项差距 + 5 项平台不可行）、`autoresearch-survey.md`、9 个已归档 change。实证基线：zcode v0.16.5（bundle mtime 2026-08-26，关键事件零命中确认）。

## 1. 不可行项重审：真不可行 vs 成本较高

复核结论：**平台侧硬顶不变**（zcode 仍无 PreCompact 事件、无会话注入 API、无 UI 扩展点），但其中两项存在**低成本变相**，值得重新分类。

| 原判定 | 平台现状（实证） | 替代方案 | 成本 | 新分类 |
|---|---|---|---|---|
| 确定性 compaction | 无 PreCompact/compact 事件（bundle 零命中） | **memory-inject 增强**：把"最近 3 条"升级为聚合摘要（已尝试方向去重、best 轨迹、最近 N 条 + ASI 提炼），UserPromptSubmit 每轮注入 | **低**（改一个 hook + SKILL） | **低成本变相 → 建议做**。能追平"信息连续性"的 70-80%；平台硬顶的仅是"注入时机绑定 compaction 事件" |
| 无限 auto-resume | 无 sendUserMessage/injectUserMessage（零命中） | 无头循环驱动（`--prompt` 多轮 + 外部脚本调度）——但无头不执行 hooks（护栏降级，已实证） | 中高 + 护栏损失 | **高成本替代 → 维持现状**（Stop 3 次窗口 + 用户回车为最终形态，已文档化） |
| TUI widget/overlay | 无 setWidget/registerShortcut（零命中） | 无 | — | **平台硬顶**（浏览器 dashboard 为最终形态） |
| settle 窗口 | 平台调度行为 | 无需 | — | **无需追平** |
| 无头 hooks 边界 | 无头 hook runner 跳过（实证） | 无 | — | **平台硬顶**（护栏以交互式会话为目标场景，已文档化） |

**结论**：5 项里 4 项维持原判（其中 auto-resume 是"高成本替代不值得"，其余是"平台硬顶"）；**确定性 compaction 有低成本变相（memory-inject 增强），从"放弃"升级为"建议做"**。

## 2. 生态扫描：pi 之外的可借鉴项目

重点（全表见研究过程记录，以下为高价值项）：

| 项目 | 定位 | 可借鉴点 | 可借鉴性 |
|---|---|---|---|
| **leo-lilinxiao/codex-autoresearch** | Codex Skill 形态（Python 控制脚本，2267★，2026-08-27 仍更新） | **事件溯源 + 严格不变量校验**（亲自读源码确认）：`derive_state` 重放事件日志校验——keep 必须改进、discard 改进必须有 failed guard、complete 必须达到 target、commit 溯源（keep/discard/revert 的 head 一致）、error 未 revert 不能 resume、原子写 + 严格 schema + 事件顺序校验 | **高**——审计型控制，比我们当前 checks 严格一个量级；全部是确定性逻辑，可移植到 server 校验层 |
| **TheGreenCedar/codex-autoresearch** | Codex 插件形态（TS，834★） | **决策引导 + 运行时信任**（已核实源码）：`decision-guidance.ts` 把质量约束/漂移摘要/信任范围/预检结果组装成上下文**给 LLM**（非"确定性决策引擎"——子代理此前转述夸大，已更正）；`runtime-drift-doctor`、`approval-ledger`、`gate-quality`、`hostile-workflow` 对抗测试 | 中——决策引导可降级为 `session_status` 上下文；信任/审批概念可借鉴 |
| **huggingface/ml-intern** | smolagents 上的自主 ML 工程 agent | **doom-loop 检测**：规范化工具调用哈希，检测 3+ 连续重复与 A→B→A→B，结合结果哈希防误报；压缩失败即干净终止 | **高**——doom-loop 是长跑健壮性的缺失件，实现成本极低 |
| **RUC-NLPIR/Arbor** | 通用自主研究 agent（假设树） | **dev/holdout 双 split + margin 验收**；失败实验持久化进假设树；每实验独立 worktree | **高**——holdout 验收直接解决"收敛判定与证据可信" |
| **Westland 实践**（博客） | pi-autoresearch 的重度用户 | **次级度量阻塞约束**（embedder_calls 变化即拦截，实测防住一次 reward hacking）；**5 连败停机**；off-limits 文件；replay harness 消除网络抖动 | **中高**——次级度量约束可平移进 log_experiment |
| **timetobuildbob / gptme** | gptme 的 autoresearch | **饱和检测 + 升级更难基准**（practical5 100% 后空转 11 天才加升级）；"Evals Are Executable Specs" | **中**——饱和后升级基准是收敛后的自然下一步 |
| **失败案例必读** | karpathy discussion #322（Gomoku hack）、tennis-xgboost（label 泄漏） | 结构性控制胜过 prompt（"把裁判移出赛场"）；作弊曲线特征（诚实优化凹形减速 vs 作弊平台期后加速） | **警示性**——验证我们 checks/vendor 冻结设计的合理性 |

## 3. 我们可能缺什么（6 条最有价值借鉴点）

1. **审计不变量**（leo，最优先）：账本事件溯源 + 严格校验——keep 必须改进、discard 改进必须有 failed guard、commit 溯源一致、complete 必须达 target、error 未 revert 不能续跑。把"状态永远合法"从约定变成硬保证。
2. **防作弊从 prompt 契约升级为结构性控制**：基准信任预检（开跑前验证基准可解析/稳定）、基准漂移检测（冻结文件哈希变了强制新 segment）、次级度量阻塞约束。
3. **证据-声明匹配（holdout 验收）**：finalize 前"本地变快"不该被总结成"产品变好"——需要 dev/holdout 分拆与 margin。
4. **doom-loop 检测**：防死循环（重复/震荡模式），成本极低。
5. **确定性决策引导**（tgc 降级版）：从账本推导"继续/停止/换目标/升级基准"作为上下文给 LLM（非硬决策），LLM 保留选题权。
6. **scoped approval / review 门**：provisional→reviewed 证据状态机，让"过夜放心"。

## 4. 下一步路线图

| 优先级 | 项 | 来源 | 交付物 | 验证 | 成本 |
|---|---|---|---|---|---|
| P0 | **memory-inject 增强**（compaction 变相） | 不可行项重审 | 聚合摘要注入（方向去重 + best 轨迹 + ASI） | hook 契约测试 + 长会话实测 | quick win |
| P0 | **doom-loop 检测** | ml-intern | stop-continue/memory-inject 报告重复-震荡模式 | 单元测试（构造 A→B→A→B） | quick win |
| P1 | **审计不变量**（事件溯源校验） | leo | server 账本校验：keep 必须改进、commit 溯源、error 未 revert 禁续跑；违规返回错误 | 协议测试 + 对抗用例 | 中等 |
| P1 | **基准信任预检 + 漂移检测** | tgc/Westland | `doctor` 式预检命令；冻结文件哈希变更→强制新 segment | 测试 + 演示 | 中等 |
| P1 | **次级度量阻塞约束** | Westland | log_experiment 支持 `constraints`（如 memory ≤ baseline×1.05，违规禁 keep） | 测试 | 中等 |
| P2 | **决策引导（session_status）** | tgc（降级） | MCP `session_status` 工具：账本推导建议上下文（继续/停止/换目标） | 协议测试 | 中等 |
| P2 | **holdout 验收（finalize 前）** | Arbor | finalize 增加"保留实验在 holdout 上复验"步骤 | finalize 测试 | 中高 |
| P2 | **scoped approval** | tgc | 命令/工具的分范围、有时效审批记录 | 契约测试 | 中 |

**不做**：auto-resume 无头循环驱动（护栏损失）、widget/overlay（平台硬顶）、OS 级沙箱（超出插件边界）。

**副作用警示**（来自 leo/tgc 实现）：严格校验可能带来摩擦（leo 的 resume 约束会卡住中断 run，tgc 自建有 workflow-friction 模块）——实现审计不变量时需保留"人工解锁"出口，避免过严卡死。

## 5. 决策记录

- **ADR-4**（`adr/decisions/4-next-steps-*.md`）：不可行项维持平台硬顶（auto-resume/widget/overlay/settle），确定性 compaction 升级为"低成本变相"（memory-inject 增强，P0）；下一步优先 P0 两件（memory-inject 增强 + doom-loop 检测），随后 P1 决策引擎与信任预检——生态借鉴聚焦"确定性逻辑"，避开平台不可行区。

## 附录：证据索引

- zcode bundle v0.16.5（零命中复核）、pi-gap-analysis.md、autoresearch-survey.md。
- 生态：github.com/TheGreenCedar/codex-autoresearch、huggingface/ml-intern、RUC-NLPIR/Arbor、karpathy discussion #322、buildoak/tennis-xgboost-autoresearch、timetobuildbob.com、cameronwestland.com、simonwillison.net/tags/autoresearch/。
