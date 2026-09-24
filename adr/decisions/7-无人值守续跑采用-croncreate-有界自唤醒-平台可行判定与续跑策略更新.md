---
status: accepted
date: 2026-09-24
raised-by: agent
decided-by: human
created: 2026-09-24
commit: dfe9595
tags: [platform-feasibility, unattended-runs, continuation, scheduling]
---

# ADR: 7 无人值守续跑采用 CronCreate 有界自唤醒：平台可行判定与续跑策略更新

## Problem

ADR-3 判定「无限 auto-resume 平台不可行」，续跑策略定格为「Stop 3 次窗口 + 单轮多实验 + 用户再触发」，过夜无人值守是与 pi-autoresearch（200-turn auto-resume）之间最大的永久能力差。当时的证据来自发行 bundle（"会话注入 API bundle 零命中"）。zcode 开源（v3.14.3）后需以源码重审该判定，并回答：是否存在当年不可见的、平台内建的无人值守通道。

## Decision

源码重审结论与策略更新（change `add-cron-chained-continuation` 承载实施）：

1. **原判维持的部分**：Stop hook 续跑上限为宿主常量 `MAX_STOP_HOOK_CONTINUATIONS = 3`（apps/zcode-cli/packages/core/src/runtime/methods/hooks.ts:10），「无限 auto-resume 经 Stop hook 不可行」与「确定性 compaction 不可行」（无 PreCompact 事件，事件全集 7 个、`source:"compact"` 声明从未 dispatch）在源码层面坐实，ADR-3/4 原判不变。
2. **新可行通道**：`CronCreate` 为 agent 可调用工具，`sessionId: context.sessionId` 固定复用当前 session（core/src/tool/handlers/cron.ts:100-109），支持 delayMinutes/interval/maxRuns 有界调度；`assertNotAutomationTurn`（:31-43）禁止 automation turn 写 Cron——宿主级防失控。**有界自唤醒（recurring + maxRuns 的 cron 链）判定为平台可行**，作为续跑策略第三条「用户再触发」的机器等价物。
3. **边界与前提**：仅在用户明确要求无人值守时创建；唤醒提示自包含（只依赖 `.auto/` 事实源）；清理只能在用户交互轮完成（automation turn 禁 CronDelete），循环提前结束后剩余唤醒空转至 maxRuns——已知代价，如实文档化。源码语义已亲验，端到端链路未实测：实施以真机 E2E 为前置门禁，验证失败则本判定回滚。

用户在 worth-fix 审计（docs/research/change-queue-worth-fix.md §B8）结论上批准立项，方向由人拍板；源码证据由 agent 收集。

## Alternatives considered

- **维持「用户再触发」为最终形态**：否决——源码显示平台内建定时唤醒原语，放弃是次优；无人值守缺口有低成本真解时不维持永久能力差。
- **外部调度（OS cron / CI 定时任务）拉起新会话**：否决——新会话无会话内状态注入面（SessionStart 注入不能替代 resume 上下文），且越出插件边界（ADR-4 已否决 OS 级方案方向）；CronCreate 在会话内完成，无需外部依赖。
- **Stop hook 内自维护窗口计数、判断「最后一次续跑」时提示创建**：否决——payload 只有 `stop_hook_active` 布尔无连续计数，hook 内写共享 config 与 server 写路径竞态；改为 block reason 无条件附一句条件式提示（advisory、无状态），创建时机由规程（用户授权后即刻）约束。

## Consequences

- 买到的：过夜无人值守有界可行——每唤醒 turn 享 Stop 3 次窗口（最多约 4 个实验），跨 turn 由 cron 链驱动；四层防失控（宿主禁 automation turn 写 Cron、maxRuns、maxIterations/consecutiveFailures 状态机、提示层空转）中三层为结构性控制；ADR-3 的「永久能力差」陈述收敛为「无限续跑不可行、有界自唤醒可行」。
- 付出的：唤醒任务清理依赖用户交互轮（automation turn 不可删），循环提前结束后剩余唤醒空转至 maxRuns（轻量模型调用的浪费）；无人值守行为依赖宿主 Cron 工具面在目标环境的可用性（E2E 前置门禁，未证前不实施）；SKILL 规程与命令文档新增一套授权/清理语义需与用户沟通。
