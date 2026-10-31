# 提案：harness 编辑步（二阶自循环与深层目标锚定）

## Why

当前循环优化的是目标代码，而循环自身的 harness（`prompt.md` 章程、`ideas.md` 方向池、hooks 配置、repeat/segment 策略）在 init 时一次写死、从不被循环自身修订。账本积累了一切证据（假设族成败、confidence、crash 模式），却没有机制把证据变成对 harness 的修改，分析停在报告，不闭环。依据：Google Research Harness²（arXiv:2610.14224，`archived/harness2/`）的任务级 Propose–Probe–Compose 与 harnessing 级经验库。**用户约束（第一设计条件）：harness 编辑可动表层目标，但对深层目标（根因）的遵循必须更严。根不可变，表的表示可变。**

## What Changes

- 新增 `.auto/goal.md`：setup 时逐字记录用户深层目标原文，纳入 PreToolUse 写保护（与 measure.sh/checks.sh 同级，机械不可变）；`prompt.md` 目标段 SHALL 逐字引用 goal.md
- SKILL.md 新增 **harness 编辑步**（advisory）：在 plateau / doom_loop / 连续失败阈值 / 固定间隔 / segment 收尾触发；先写编辑行（`{component, change, observed, verdict}`，verdict ∈ helped/hurt/no observed effect/confounded，无法隔离归因时优先 confounded），再对可编辑面小步修订（prompt.md 表层区块、ideas.md 重建、hooks 配置、repeat/segment 策略）；KEEP_BASE 纪律，证据不支持的编辑不做
- 新增 `.auto/experience.md` 跨 segment 经验库：每 segment 至多一条 lesson（`{cue, lesson, evidence→run 号, confidence}`），无充分行为对比时写 `NO_ENTRY`；finalize 时人审后并入项目 AGENTS.md
- setup-guide 与 loop-protocol 落写作纪律：workspace fact / procedure / too-generic 三分法、命名组件胜过散文

## Capabilities

### New Capabilities

（无）

### Modified Capabilities

- `autoresearch/guardrails`：「会话目录写保护」的受保护集合加入 `.auto/goal.md`（深层目标原文，harness 编辑步唯一不可触碰的会话文件）
- `autoresearch/experiment-loop`：新增 requirement「harness 编辑步与经验库资产」，含编辑步规程（触发、编辑行、verdict 纪律、KEEP_BASE、可编辑面白名单）、`.auto/experience.md` 格式（cue/lesson/evidence/confidence、NO_ENTRY）、goal.md 与 prompt.md 的引用关系、写作三分法

## Impact

- 代码：`plugin/hooks/guard-frozen.ts`（FROZEN 集合加 goal.md，一行）+ 对应 hook 测试
- 技能与参考：`plugin/skills/autoresearch/SKILL.md`（新节 + 步骤 5 触发接线）、`references/loop-protocol.md`（详细规程）、`references/setup-guide.md`（goal.md 约定与写作纪律）
- 文档：`plugin/README.md` / `plugin/README_CN.md`（会话状态清单与护栏段补 goal.md、experience.md）
- 不动：measure.sh/checks.sh 冻结语义、审计不变量、MCP 工具接口、Stop hook 续跑语义
- 兼容性：纯增量。旧会话无 goal.md 时编辑步跳过 goal 引用检查（advisory），无迁移
