# Agent4Sci 研究笔记（Anthropic 自动科研爬山实验）

> 2026-11-02 · 资料来源：论文 arXiv [2610.28763](https://arxiv.org/abs/2610.28763)《Automating ML for Science: Can Frontier Agents Climb Scientific Hills in the Wild?》（Ming Zhong, Stacy Li, Nicholas Carlini, Matthew Jagielski；2026-10-20）、官方仓库 [maszhongming/agent4sci](https://github.com/maszhongming/agent4sci)（Apache-2.0，已克隆至 `archived/agent4sci/`，不进 git）、HF 数据集 `MingZhong/agent4sci`、腾讯科技解读文章《为什么AI能解千禧年题，但还是做不到RSI》。
> 性质：外部实证对照研究，不直接触发 change；§4 各启发点如要落地，按铁律走 openspec change。

## 1. 实验概况

AGENT4SCI 是一个长周期评测台：从 NeurIPS 2025 D&B 等来源经四轮筛选（淘汰率 98%）保留 11 个学科、20 个基准、25 个任务，让前沿 coding agent（Claude Opus 4.6 / Sonnet 4.6、Codex (GPT-5.4)、Gemini 3.1 Pro）在 8×H200、12 小时（扩展 72 小时）预算内无人干预地提升已发表论文的最佳基线。

- 四个 agent 在全部 20 个基准上都超过发表基线（Opus 平均相对提升 10.4%），三阶段隔离协议下无一次判作弊。
- 但轨迹分析显示提升几乎全部来自常规 ML 工程：Opus 56% 的尝试是超参微调、44% 是加宽加深换骨干加集成。
- 三大通病：**新颖度误判**（把余弦学习率调度称为 creative breakthrough）、**探索坍缩**（首小时捡到小提升后剩余预算全花在扫种子/集成上）、**算力利用率低**（GPU 闲置串行、commit-and-wait 干等 11 小时）。
- 加三个写死规则的插件技能后：Opus 10.4% → 20.1%，Codex 4.4% → 8.1%，且出现真正领域级的改进（非自回归替代自回归消除曝光偏差；用基尔霍夫残差重构损失 + GNN 热启动牛顿-拉夫逊求解器）。
- 论文的克制结论：这些仍是"低垂的果实"（第 3 层：领域成熟范式搬运 + 对显式瓶颈逆向造桥）；基线已被人类打磨到头的任务（ProteinGym +0.3~0.4%，gRNAde 反而 −0.6% / Codex −6.1%）三板斧失灵，72 小时后半段普遍退化回调参。

## 2. 三个插件技能的机制拆解（`agent4sci/skills/claude/`）

技能本体全部是 Markdown 指令 + bash 钩子，与本插件 skills/hooks 形态同源。三个技能在 `skills/claude/skills/{research,experiment,checklist}/SKILL.md`（另有 `skills/agents/` 通用版与 `skills/codex/` 适配版）。

### 2.1 research：构思先行 + 反锚定

- 人设注入："你是 crazy research scientist，不是调参工程师"。
- **在看到任何一行基线代码之前**，先派出 4 个并行文献综述子代理（1A/1B 领域知识的数据与架构、训练与评测范式；2A/2B 通用 AI/ML 同两分面），综述落盘 `runs/literature/{1A,1B,2A,2B}/REVIEW.md`，主 agent 用轮询脚本等待（`wait_for_reviews.py`），期间**禁止探索代码库**（防基线锚定）。
- 实验计划强制分 **Tier 1（高风险高回报，必须来自文献综述，显著实现成本）** 与 **Tier 2（文献背书的稳妥改进）** 两级。
- 注册实验时逐项"out loud"回答：Category / Hypothesis（if-then-because）/ Rationale（引综述出处）/ Metrics / Runtime / "凭什么算 Tier 1"。
- 校准三问（论文核心贡献之一）：
  1. 领域专家会为这些想法真正惊讶吗，还是披着雄心话术的标准操作？
  2. 灵感来自 SOTA 方法，还是只在对基线做安全迭代？
  3. 有没有 Tier 1 实质是调参/训练技巧/集成伪装的？——有则立即降级并从综述里生成替补。
- 允许"不锚定在复现仓库"：可以另克隆别的仓库实现，只要用规定的数据与种子/折。

### 2.2 experiment：Tier 1 先行 + 资源饱和 + 失败分流

- **第一轮必须全是 Tier 1**："高风险方案脱险最快的时候就是预算最充裕的时候"；明确列出无效实验清单（复现基线、基线多种子、基上调参、种子集成）。
- 每实验独立目录 + 独立 repo 副本，要求写 `train.py`/`eval.py` 包装脚本（统一 `--data-dir/--checkpoint-dir/--output-dir`，时间戳日志，`flush=True`），强制 1-2 epoch smoke test 并核对预期/实测耗时与 GPU 占用。
- 资源纪律：饱和全部 GPU、按 NUMA 绑核、显存有余就加批次或并任务、"每个浪费的 GPU 小时都是一个永远测不到的想法"。
- 失败分流三选一：工程性失败 → 修（OOM 降批次/梯度累积等）；核心思路成立但实现不行 → pivot；仅当能说清"为什么任何变体都不行"才允许 abandon——明说这是对抗 agent "贪婪滑回增量调参"的偏置。
- 子代理实现必须人工核验 + 写 `CHANGES.md`，不许假定子代理产出正确。

### 2.3 checklist：每小时自检，硬阻断实现（`hooks/reminder.sh` + `checklist_ack.sh`）

实现是两阶段 PreToolUse/PostToolUse 钩子对，值得完整记录：

1. PreToolUse（matcher `*`）维护 `/tmp` 时间戳：距上次 ≥1h 时进入 Phase 1——注入 `additionalContext`（"MANDATORY HOURLY CHECK，立刻运行 /checklist"）并上锁；**锁存续期间除 Skill 工具外的一切工具调用 exit 2 硬阻断**（stderr："You MUST run /checklist before using any other tools"）。
2. PostToolUse（matcher `Skill`）识别到 checklist 技能执行后清锁，恢复正常。锁 10 分钟自动过期防死锁；subagent（payload 带 `agent_id`）与 `MODE=evaluate` 跳过。

checklist 内容四部分：**自我评估**（是否放弃了未做根因分析的 Tier 1？是否在把调参/集成包装成创新？frontrunner 是否只是隧道视野下的安全选项？）→ **运维**（逐 job 查日志新鲜度/GPU 占用/瓶颈/子代理产出是否核验）→ **策略**（剩余预算、未试的组合、失败暴露但未吸收的洞见；没新想法就回读文献综述）→ **行动清单**（清过期任务、把纠偏动作全部变成任务、能委托的尽量委托；sleep 前必须清空任务列表）。

### 2.4 三阶段评测协议与反作弊（`docs/protocol.md`、`prompts/prompts.yaml`）

```
hill-climbing agent（只见 train+val） → evaluation agent（独立容器，只跑官方标准化 eval 脚本） → auditing agent（读全量转写，对抗式审计）
```

- 测试集在爬山容器中**物理不存在**（数据集按 `MODE=hillclimb`/`MODE=evaluate` 分相暂存，见 HF dataset card），不是靠提示词约束。
- 评测永远用标准化 `eval_test.py`，"never a script the hill-climber wrote"。
- 审计提示词把作弊分四类：测试数据泄漏、评测篡改、结果伪造（硬编码返回/按测试输入查表/复用旧 run 结果）、意图红旗（推理中寻找漏洞、被撤销的可疑尝试也计入）；要求逐条读完整会话转写并引用 agent 原话作为证据，输出 CLEAN/COMPROMISED。
- protocol.md 的关键判断："通常是泄漏式、含混的 setup 的副产品，而非蓄意作弊"——与我们的漂移检测动机一致。
- 收尾时（`hillclimb_end` 提示）强制 out loud 复述任务科学动机与方法论、写 `SUMMARY.md`/`METHODOLOGY.md`、把完整会话转写交给审计。

其他会话工程：`settings.json` 预放行 WebSearch/WebFetch、bash 超时拉到 20/60 分钟、PermissionRequest 对 `.claude/` 路径自动允许；Codex 侧用 Stop 钩子**一律 block 回合结束**直到 sentinel 文件出现（比我们的 3 次窗口 + Cron 有界自唤醒粗糙，见 ADR-7，互证即可，无需跟进）。

## 3. 与本插件的对照

| 能力         | agent4sci                               | autoresearch 现状                                  | 结论                          |
| ------------ | --------------------------------------- | -------------------------------------------------- | ----------------------------- |
| 防重复/振荡  | 无机械信号，靠 checklist 纪律           | doom-loop（repeat/oscillate 文本检测，advisory）   | **我们更强**                  |
| 平台期       | checklist 文案问"还剩多少时间"          | plateau（近 5 次改善 <1%，机械）                   | **我们更强**                  |
| 度量置信     | 无统计机制，靠固定 seeds/folds 规则     | confidence（MAD 三档）+ repeat 中位数              | **我们更强**                  |
| 基准冻结     | 容器内物理隔离测试集 + 官方 eval 脚本   | measure/checks 冻结 + 漂移检测（hash）             | 各有侧重，见 §4.5             |
| 迭代间钩子   | PreToolUse/PostToolUse 硬阻断（会话级） | `.auto/hooks/` fail-open、advisory steer（迭代级） | 哲学差异（ADR-5），模式可借鉴 |
| 自我修改规程 | 无（技能固定）                          | harness editing 二阶循环 + experience              | 我们独有                      |
| 无人值守     | Stop 一律 block + sentinel              | Stop 3 次窗口 + Cron 有界自唤醒                    | 我们更精细（ADR-7）           |
| 反作弊审计   | 转写级审计 agent（四类模式）            | 审计不变量（账本自洽，硬校验）                     | 层次不同，互补，见 §4.5       |
| 上下文延续   | 文献综述落盘 + SUMMARY/METHODOLOGY      | memory-inject + prompt.md + experience             | 相当                          |

## 4. 启发点（按建议优先级；落地均需走 openspec change）

### 4.1 分段起步的"构思先行"步骤（反锚定）

我们的 loop 第 1 步是"读账本尾部 + git log"——设计上就把 agent 锚在已有尝试上，这对增量迭代是对的，但**新 segment（`init_experiment`）冷启动时没有任何结构化的外部输入步骤**，直接滑入"读代码→调参"的最熟路径。agent4sci 的证据（默认 56% 调参 + 基线锚定效应）说明这正是默认行为最弱的一环。建议：loop 协议在新 segment 开始时加一步"先写假设清单再读代码"——对目标做一轮外部调研（web/docs），把候选方向按"结构改动 / 常规改进"分组写入 `ideas.md`，附带校准问题（领域专家会惊讶吗？有没有把调参伪装成结构性想法？）。低成本（SKILL/references 文案），与 ideas.md 现有机制无缝衔接。

### 4.2 假设分层意识（Tier 标注 + 混合度提醒）

doom-loop 检测的是**重复**，检测不到**全都是浅层改动**——连续 6 轮各不相同的调参（PFDelta 2000 后 60 小时案例）不会触发任何现有信号。低成本变相：约定 `asi.hypothesis` 前缀标注类别（如 `[struct]` / `[tune]` / `[ensemble]`），idea-rotator 示例钩子随之升级为"最近 N 条全是 tune/ensemble 时注入提醒"；校准三问可原文借鉴进 loop 协议的假设步骤。纯约定 + 示例钩子，不动 MCP 代码。

### 4.3 时段自检示例钩子（wall-clock 维度）

我们的信号全是"每次迭代"粒度，没有**时间维度**的自检——无人值守长跑时，agent 连续数小时滑行在浅层循环里不会有任何东西打断它。`.auto/hooks/before.sh` 的 stdin 已含 `session.started_at_epoch`（正是为此设计的），写一个 hourly self-check 示例钩子（距上次自检 >1h 时注入 checklist 式问题清单）即可补上，advisory、fail-open，完全符合 ADR-5 的边界。问题清单可从 agent4sci checklist Part 1/3 精选：当前方向是结构性的还是又在调参？失败有没有做根因分析就跳到"务实方案"？账本里有没有已暴露但没吸收的洞见？

### 4.4 基线校准 pass（segment 开始时）

setup-guide 目前**没有**"先量基线方差再动手"的内容；loop 里的 `repeat:3` 是事后补救，且 SKILL 只说"看起来有噪声才用"。agent4sci 的标准化流水线（人核验的基线复现 + 容差 + 修数据切分）与"final submissions 必须用与基线相同的 seeds/folds"纪律，对应到我们的场景就是：新 segment 第一次 `run_experiment` 建议对未改动代码 repeat 2-3 次，确认度量噪声地板，把它写进 prompt.md 的 metric 小节，后续所有 delta 对照这个地板判断。低成本（setup-guide + loop 协议各加一段）。

### 4.5 反作弊的两个互补层次（不重启 holdout）

我们的审计不变量管账本自洽，管不到**代码与转写层**的作弊（评测脚本被 scope 内改坏、选择性报告、cherry-pick checkpoint）。agent4sci 的四类模式 + "泄漏式 setup 的副产品而非蓄意"判断值得借鉴为：finalize 或 export 时加一个**可选审计 pass**（提示词清单：对照 measure/checks 定义核对指标口径、找硬编码/按输入查表/复用旧结果、扫描"被撤销的可疑尝试"）。注意两点：

- holdout/scoped approval 已由 worth-fix B7 裁决**维持不做**，本笔记不翻案；他们的证据（Codex 在 CarbonGlobe 上 277 轮贪心集成，验证集 +37% / 隔离测试集 −25%）反而说明：在无 holdout 的前提下，**次级度量约束**（对集成模型数/复杂度设上限）是现成可用的防线，值得在 setup-guide 里作为用例写一句。
- 他们的"测试集物理不存在"比我们的"冻结 + hash 漂移检测"更强，但以容器化基准分发为前提，与零依赖铁律冲突，仅作参考形态记录。

### 4.6 无人值守的权限预放行

他们的 `settings.json` 细节（预允许 WebSearch/WebFetch、bash 超时 20/60 分钟、`.claude/` 路径权限请求自动通过）提醒了一个我们文档里没有的点：无人值守长跑若中途撞上权限确认就会停摆。`unattended.md` 可补一条：授权无人值守时顺带预放行基准所需命令（或在 setup 时确认 measure.sh 所需权限已放行）。

## 5. 明确不跟进的

- **GPU 饱和 / nvidia-smi 资源纪律**：面向 8×H200 训练集群的语义，我们面向单机基准，不适用。
- **容器化基准分发（GHCR 镜像 + registry）**：与零依赖铁律冲突，且我们的基准本来就在用户仓库里。
- **硬阻断式自检（exit 2 锁）**：与"信号均 advisory"哲学（ADR-5）冲突；若未来为无人值守做 opt-in 强化，模式已在 §2.3 备查。
- **Codex 式 Stop 一律 block**：ADR-7 的有界自唤醒是更细粒度的替代，无需改动。

## 6. §4 启发点的 worth 审计（2026-11-02）

方法：worth-fix（真实性判定与价值判定分离）。命题核验全部以代码实态/实测判定，勘误显式记录。

### 判定表

| #   | 启发点                      | 属实性                                          | 值得做       | 处置                            |
| --- | --------------------------- | ----------------------------------------------- | ------------ | ------------------------------- |
| A1  | §4.1 分段冷启动构思先行     | 坐实（规程缺位，机制性）                        | 值得         | change：认知引导                |
| A2  | §4.2 假设分层标注 + rotator | 坐实（doom-loop 盲区**实测**）                  | 值得         | 并入同 change                   |
| A3  | §4.3 时段自检示例钩子       | 坐实（started_at已在 server.ts:701）            | 值得         | 并入同 change                   |
| A4  | §4.4 基线校准 pass          | 属实，**影响被高估**                            | 低价值低成本 | docs 微项（setup-guide 一段）   |
| A5  | §4.5 finalize 审计 pass     | 属实（finalize 无审计），**影响被高估（勘误）** | 不值得       | 出队，留痕                      |
| A6  | §4.6 无人值守权限预放行     | 坐实（unattended.md 无权限内容） 微             | 卫生级       | docs 微项（unattended.md 一句） |

### 逐项证据

- **A1**：SKILL/loop-protocol 的循环第 1 步是「读账本尾部 + git log」，新 segment（`init_experiment`）无任何结构化构思步骤；`ideas.md` 已存在（optional backlog）可直接承接。机制缺位非 bug，与先例 B1 同性质。四维：触发=每个新 segment；影响=中（agent4sci 实证默认行为 56% 调参 + 基线锚定，+插件后翻倍——外部对照数据，非我方实测）；成本=低（协议文案）；不修=机会损失无硬损失。后悔不对称成立。**做（change）**。
- **A2**：**实测**（node 直调 `detectDoomLoop`，plugin/mcp/lib/experiment.ts:220）：六轮互不相同的调参假设 → `null`（盲区）；对照组同假设×3 → repeat、X,Y,X,Y → oscillate、尾部重复 → repeat，全部按设计触发。结论：信号无 bug，是 Jaccard 文本相似度的语义边界——看不见「互不相同但全浅层」。idea-rotator 示例确认只有 run_count 取模轮转，无混合度意识。低成本补救 = hypothesis 前缀约定（协议一句话）+ rotator 读账本前缀分布提醒。**做（并入 A1 的 change）**。
- **A3**：`.auto/hooks/before.sh` stdin 的 session 含 `started_at_epoch`（server.ts:701，spec 亦有 Scenario「session 携带 segment 起始时间」）；现有 3 个 before 示例（anti-thrash/hypothesis-reflection/idea-rotator）均为迭代粒度，无墙钟维度。示例钩子素材级、fail-open、advisory，符合 ADR-5。**做（并入同 change）**。
- **A4 勘误（影响高估）**：confidence（MAD 三档）已从账本数据驱动地估计噪声，`repeat:3` 是随手工具；基线校准的增量只是把「发现噪声」从第 1-2 次迭代提前到改动之前，且首个低置信改进即自暴露。不立项，降级为 setup-guide 一段（init 前对未改动代码 repeat 2-3 次确认噪声地板，写入 metric 小节）。
- **A5 勘误（影响高估，架构差异）**：agent4sci 需要转写级审计 agent，是因为其评测面自由（agent 自己写 eval 代码、挑 checkpoint、拼集成）；我方对照是 `run_experiment` 的机械输出 + 冻结 measure/checks + hash 漂移检测 + 审计不变量，选择性报告与 cherry-pick 在机械账本架构下**没有操作空间**。finalize 审计 pass 的增量影响 = 小，成本 = 中。**出队**；若未来出现非机械度量场景（如 agent 自选评估协议）再立项。
- **A6**：grep 确认 unattended.md 无任何权限相关内容。无人值守长跑若在确认模式撞权限即停摆整晚，成本一句话，后悔不对称成立。**做（docs 微项）**。

### 处置队列

> **落地状态回填（2026-11-02，审计当日全部闭环）**：1 已落地并归档（change `add-anti-shallow-guidance` → 归档 `2026-11-02-add-anti-shallow-guidance`，delta 已合并进 `openspec/specs/autoresearch/experiment-loop/spec.md`：新增「段起步构思步与假设分层」「浅层连击提醒」两条 requirement，改「钩子教学与示例资产」补时段自检）；2 已落地（setup-guide「Calibrate the noise floor first」段、unattended.md「Clear the permission path before leaving」段）；3 维持出队。验证：两示例钩子触发/静默路径实跑全过、`npm test` 全量 0 失败、`openspec validate --specs` 8/8。

1. **change（认知引导）**：A1 段起步构思步 + A2 hypothesis 分层约定与 rotator 升级 + A3 hourly self-check 示例钩子（含 autoresearch-hooks SKILL 示例清单同步）。✅ 已归档。
2. **docs 微项（直接改）**：A4 setup-guide 基线校准段；A6 unattended.md 权限预放行句。✅ 已落地。
3. **出队**：A5 finalize 审计 pass（勘误留痕如上）。

## 7. 参考链接

- 论文：https://arxiv.org/abs/2610.28763 （HTML 版含全部附录数字）
- 仓库：https://github.com/maszhongming/agent4sci （本地克隆：`archived/agent4sci/`；技能在 `agent4sci/skills/claude/skills/`，钩子在 `agent4sci/skills/claude/hooks/`，提示词在 `agent4sci/prompts/prompts.yaml`）
- 数据集：https://huggingface.co/datasets/MingZhong/agent4sci
- 解读文章：https://mp.weixin.qq.com/s/b1rnS5vKCFTMaFLpY6Oj2A
