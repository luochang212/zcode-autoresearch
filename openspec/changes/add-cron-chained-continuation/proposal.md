# Proposal: add-cron-chained-continuation

## Why

Stop hook 续跑受 zcode 平台硬顶：`MAX_STOP_HOOK_CONTINUATIONS = 3`（宿主常量，源码实证），长循环每 3 轮需人工触发，过夜无人值守不可用——这是与 pi（200-turn auto-resume + stuck-loop override）之间最大的真实能力差，ADR-3 以「Stop 3 次窗口 + 单轮多实验 + 用户再触发」为最终形态。zcode 开源（v3.14.3）源码显示新通道：`CronCreate` 为 agent 可调用工具，`sessionId: context.sessionId` 固定复用当前 session（core/src/tool/handlers/cron.ts:100-109 注释坐实），支持 delayMinutes 一次性 / interval 循环 / maxRuns 上限三种有界调度，且 automation turn 内禁一切 Cron 写操作（assertNotAutomationTurn，:31-43，宿主级防失控）。**有界自唤醒**因此平台可行，可作为续跑策略第三条「用户再触发」的机器等价物（worth-fix 审计 docs/research/change-queue-worth-fix.md §B8 判定为 P1 候选）。本 change 不改写「无限 auto-resume 不可行」与 Stop 3 次硬顶的原判（ADR-3/4 维持），仅补无人值守缺口。

## What Changes

- 新增无人值守续跑规程（`skills/autoresearch/references/unattended.md`）：用户明确要求无人值守/过夜运行时，agent 创建 recurring `CronCreate` 定时唤醒（interval 与 maxRuns 有界，建议默认 5 分钟 × 24 次），唤醒提示自包含（只依赖 `.auto/` 事实源与 skill 指针）
- 唤醒行为契约：automation turn 先检查循环状态——活跃（会话存在、未 off、未达上限）则按循环规程继续实验；不活跃则空转（什么都不做），等待 maxRuns 自然耗尽或用户清理
- `stop-continue.ts` 的 block reason 追加一句轻量提示（advisory）：用户已要求无人值守时，可按 unattended 规程创建定时唤醒——无状态判断（不维护窗口计数），文案措辞以「用户已授权」为前提
- `/autoresearch:off`、`/autoresearch:clear`、finalize 命令增加清理步骤：CronList 检查 autoresearch 唤醒任务并删除/提示删除（automation turn 无法 CronDelete，清理只发生在用户交互轮——如实文档化）
- README（中英）auto-resume 已知边界段落同步：无人值守改为「有界自唤醒（cron 链）+ Stop 3 次窗口」双层描述
- 平台可行性判定更新进 ADR（铁律 5）：CronCreate 有界自唤醒可行；Stop 3 次硬顶与无限 auto-resume 不可行原判维持

**前置门禁（E2E）**：实施前先做一次真机端到端验证（cron 创建 → 触发 → automation turn 续跑链路 → 空转与清理），验证失败则本 change 终止并回滚 ADR 判定。源码语义已亲验，端到端未实测——这是本 change 唯一的未证前提，任务 1 即为消证。

## Capabilities

### Modified Capabilities

- `autoresearch/guardrails`：Stop hook 续跑契约新增「窗口耗尽前的无人值守提示」；新增「无人值守定时唤醒（有界）」requirement（唤醒行为契约 + 清理语义 + 防失控边界）

### New Capabilities

（无——无人值守续跑是既有「Stop hook 驱动循环续跑」能力的平台内扩展）

## Impact

- `plugin/hooks/stop-continue.ts`：block reason 追加一句提示文案（无逻辑分支变化）
- `plugin/skills/autoresearch/`：新增 references/unattended.md；SKILL.md 与 loop-protocol.md 接线（何时创建唤醒、唤醒后如何继续）
- `plugin/commands/autoresearch.md`（off 段）、`clear.md`、finalize 命令：清理步骤
- `plugin/README.md` / `README_CN.md`：已知边界段落
- `adr/decisions/`：新增平台可行性 ADR（本 change 附带，见 tasks）
- 不改动：MCP server（无新工具、无账本格式变化）、审计不变量、其余 hooks
- 风险与缓解：唤醒空转浪费（maxRuns 有界 + 唤醒提示先检查状态）；失控循环（宿主禁 automation turn 写 Cron + maxRuns + maxIterations/consecutiveFailures 状态机硬停 + 唤醒提示仅 advisory）；误创建（规程要求用户明确授权后才创建）
