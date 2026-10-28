# Proposal

## Why

pi-autoresearch 对比研究（2026-10-28，克隆 davebcn87/pi-autoresearch @ main 到本地逐文件审读）后评估了三项"向 pi 对齐"的候选功能。经 worth-fix 流程对每项的平台前提与既有覆盖逐一实证，**三项中两项被证伪、一项坐实**，另有审计过程中发现的 SessionStart matcher 缺口一并补上。本 change 为补录（实现先行，同 2026-10-28-hook-session-epoch-and-win-spawn-env 的先例）。

被否决的两项留痕于此，防止后续重复评估：

1. **确定性 compaction（pi `compaction.ts`，用磁盘状态合成替代 LLM 压缩摘要）——不移植。** 平台前提不成立：ZCode 插件钩子事件权威清单只有七个（SessionStart/UserPromptSubmit/PreToolUse/PermissionRequest/PostToolUse/PostToolUseFailure/Stop），`PreCompact` 明确不支持（zcode-guide:diagnosing-hooks SKILL.md），插件没有任何替换或拦截压缩摘要的 API。pi 的实现依赖 pi 平台的 extension compaction API，在本平台是无源之水；移植即死代码。其功能目标（长会话记忆不丢）已由既有机制覆盖：memory-inject（UserPromptSubmit 每轮注入进度/已试方向/轨迹/弃用理由/最近 ASI/doom 警告）+ stop-continue（每次续跑注入最近 runs）+ session-start。
2. **auto-resume 写死 turn 上限（pi `AUTORESUME_TURN_LIMIT=200` + 连败 20 熔断）——不移植。** 既有覆盖已更严：平台层每次窗口最多 3 次 Stop 续跑（README 自述）；账本层 isStopReached 双界限（maxIterations 次数上限 + failureThreshold 连败上限，默认 3，严于 pi 的 20）；无人值守层 CronCreate maxRuns。pi 需要自己的 turn 上限是因为 pi 平台的 auto-resume 无平台级界限；在本平台加同等上限是给已被三层覆盖的场景加第四个冗余旋钮。

坐实并采纳的：

3. **钩子 stdin `session` 载荷缺 `goal` 字段（pi 契约漂移）——补上。** pi 的 SessionSnapshot 含 `goal`（值为会话名，`index.ts:1266` `goal: state.name ?? ""`），其官方示例钩子 qmd-search.sh 与 external-search.sh 直接读 `.session.goal`，hooks SKILL.md 契约文档也列有该字段。zcode 的载荷缺它，pi 示例钩子生态无法零改动运行。本插件定位即"持续追平 pi 差距"，同一载荷的逐字段对齐属契约级补齐。注意勘误：前期评估曾把该字段误述为"深度目标文本"，实证后确认只是会话名。
4. **SessionStart matcher 漏 `compact`——补上。** ZCode 的 SessionStart matcher 支持 `startup|resume|clear|compact`，本插件只注册了 `startup|resume`：长会话（正是过夜无人值守场景）发生上下文压缩后，会话恢复提示不再触发。加一个 alternation 词，fail-open、无风险。

## What Changes

- `run_experiment` / `log_experiment` 的钩子 stdin `session` 对象新增 `goal`（`init_experiment` 设定的会话名；未设定时为 null）。纯增量字段，既有钩子不受影响。
- 插件 `hooks.json` 的 SessionStart matcher 从 `startup|resume` 扩为 `startup|resume|compact`：上下文压缩完成后会话提示照常注入。
- 规程文档同步：`skills/autoresearch-hooks/SKILL.md` 与 `skills/autoresearch/references/loop-protocol.md` 的 session 字段列表。
- 明确记录两项否决（compaction、turn 上限）及其平台/覆盖证据，作为后续 pi-parity 评估的基线。

## Capabilities

### New Capabilities

（无）

### Modified Capabilities

- `autoresearch/experiment-loop`：`run_experiment` 与 `log_experiment` 两个 Requirement 的钩子 stdin 契约——`session` 枚举增加 `goal`，新增对齐场景。
