# 设计：harness 编辑步（二阶自循环）

## Context

- 一阶循环（改代码→跑基准→keep/discard）的 harness 在 init 时写死；账本证据无消费闭环。来源：Harness²（`archived/harness2/`，arXiv:2610.14224）——任务级 Propose–Probe–Compose 的**编辑行 verdict 纪律**与 harnessing 级经验库的 **{cue, lesson, evidence, confidence} 格式**直接借用。
- 用户第一设计条件：**根表分层**。深层目标（用户 init 时的原话意图）为根，不可变；表层目标（度量代理、章程措辞、方向池）为根的表示，可被证据驱动的编辑修订。harness 编辑步的权力边界由此划定。
- 现有可复用基建：PreToolUse 写保护（`plugin/hooks/guard-frozen.ts` 的 FROZEN 集合）、advisory 信号（plateau/doom_loop/consecutiveFailures）、`.auto/` 豁免回滚、clear 保留清单（只删 log.jsonl）、finalize 命令（人审节点）。

## Goals / Non-Goals

**Goals**

- 证据闭环：账本证据 → 编辑行 → harness 修订 → 下一次执行不同
- 根表分层的**机械**保障：goal.md 写保护复用既有 hook，不靠自觉
- 经验沉淀带证据纪律（confounded 优先、NO_ENTRY、KEEP_BASE）

**Non-Goals**

- 不做并行 probe（4k rollout 是平台级预算，sequential k=1 起步；Harness² 数据显示单步已获大部分收益）
- 不动 measure.sh/checks.sh 冻结语义、审计不变量、MCP 工具接口、Stop hook 续跑语义
- 不做工具级 goal 哈希校验（写保护已机械拦截改动；prompt.md 引用一致性靠规程与阅读审计，v1 不上 hash 比对）
- 不做跨项目经验自动迁移（人审后人工并入，复用时按假设重新验证）

## Decisions

**D1：根表分层的机械边界 = 独立文件 + 既有写保护。**
深层目标放独立 `.auto/goal.md`（setup 时逐字记录用户原话），加入 guard-frozen 的 FROZEN 集合——一行改动复用被验证的机制（ADR-5"能用代码表达的约束不放 Prompt"）。`prompt.md` 目标段 SHALL 逐字引用 goal.md：引用即审计（读 diff 即可核对根未被改写）。备选"prompt.md 受保护区块 + hash 比对"被否：区块内编辑检测要新代码且与既有机制重复；独立文件 + hook 零新逻辑。
表层目标的**实质**更换（换度量代理、换优化对象）不经编辑步——那是新 segment（`init_experiment`）的事，冻结脚本不动，跨 segment 对表靠人的判断。

**D2：编辑行与 lesson 格式照搬 Harness² 纪律，verdict 四值、confounded 优先、NO_ENTRY。**
理由：归因纪律是这套方法的命门——"被采纳"不等于"有效"，confounded 行是有用记录，编造归因毒害后续所有编辑。来源标注在 loop-protocol.md（archived/harness2/core/prompts.py experience 模板）。

**D3：触发走 advisory 信号 + 固定间隔，不做硬阻断。**
plateau / doom_loop / 连续失败阈值（信号已在返回中）+ 每 ~8 轮 + segment 收尾。编辑步本身耗 token，固定间隔防高频空转。符合 ADR-5：决策权在 agent。

**D4：可编辑面白名单 = prompt.md 表层区块、ideas.md、hooks 配置、repeat/segment 决策参数。**
八组件对应到本插件：system prompt=prompt.md、guardrails=checks/审计/漂移（冻结）、memory=asi+experience.md、tool guidance=SKILL.md（本 change 的产出本身）、scripts=hooks/examples。v1 只开放前四个中真正安全的面；SKILL.md 自身不进编辑面（改循环规程是 openspec change 的事）。

**D5：experience.md 跨 segment 存活、finalize 人审并入 AGENTS.md。**
clear 只删 log.jsonl（主规范既有语义），experience.md 天然存活；跨项目不自动迁移——AGENTS.md 收编前经人审，复用时按"旧 lesson 是假设"原则重新验证（Harness² library 纪律：早期任务的事实在新任务是 hypothesis）。

## Risks / Trade-offs

- 编辑步可能被 agent 用作"合理化漂移"→ goal.md 机械保护 + 逐字引用审计 + KEEP_BASE（无编辑合法）三重约束；残余风险与 auditBypass 同级，advisory 层可接受
- 编辑行/lesson 写作质量依赖模型自律 → verdict 四值与 NO_ENTRY 提供了"诚实什么都不写"的出口
- 每 8 轮的固定间隔对短会话是浪费 → 触发条件全部是"或"关系，短会话通常只命中 segment 收尾

## Open Questions

无。
