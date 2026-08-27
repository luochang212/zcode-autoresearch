---
status: accepted
date: 2026-08-27
created: 2026-08-27
---

# ADR: 3 pi-gap catch-up priority: iteration hooks first, drop platform-impossible items

## Problem

目标是在适配 zcode 且条件允许的前提下追平 pi-autoresearch。差距分析（docs/research/pi-gap-analysis.md）产出 28 项能力对照：我方已有 12 项、部分 2 项、缺失 14 项。缺失项分为三类——可追平（zcode 有等价实现路径）、zcode 受限（有替代方案但有损）、平台不可行（依赖 zcode 不存在的 API）。必须决定追平顺序与放弃项，避免在平台不可行项上浪费投入。

## Decision

按「价值 × 可感知 ÷ 成本」排序追平，分三个里程碑：

1. **里程碑 1（quick wins，先行）**：迭代钩子（`.auto/hooks/before.sh`+`after.sh`，在 run_experiment/log_experiment 中执行，stdin JSON 契约，30s 超时，stdout 转 steer 字段）——这是 pi 唯一的外部扩展点、生态开放性的根基；外加 `clear` 命令、ASI 三字段（hypothesis/next_action_hint/rollback）在记忆注入 hook 中提炼、停摆护栏参数对齐（连续失败阈值可配）。
2. **里程碑 2**：SSE live dashboard（静态 HTML → 本地 HTTP + `/events`）、workingDir 重定向、finalize 分支整理。
3. **里程碑 3（受限近似，可与 M1 合并）**：PermissionRequest 门禁近似、SessionStart 自动激活提示。

**明确放弃（平台不可行）**：确定性 compaction 摘要（zcode 无 PreCompact 事件）、无限 auto-resume（zcode 无会话注入 API，实证 bundle 零命中）、TUI widget 与全屏 overlay（zcode 无此扩展点）。这些以现有近似作为最终形态：memory-inject（UserPromptSubmit 每轮注入账本）、Stop hook 3 次窗口 + 用户回车、静态 dashboard HTML。

## Alternatives considered

- **先做 dashboard/finalize 等体验与运维项**：否决——迭代钩子是生态根基（pi CHANGELOG 1.1 即加入，早于 compaction 与护栏），且实现成本最低（纯工具逻辑）。
- **为 compaction/auto-resume 等平台不可行项寻找 hack**（如 hooks 模拟会话注入）：否决——zcode 无对应事件/API，任何近似都脆弱且偏离官方契约，收益不成比例。
- **先做自动激活/门控（#1/#2）**：否决——zcode 无工具门控与运行时模式状态机，受限近似收益有限，且依赖 PermissionRequest 触发时机，不确定性高。

## Consequences

- 买到了：追平投入集中在高价值低成本项，迭代钩子先行打开生态扩展面；平台不可行项有明确、诚实的最终形态，README 已知边界可信。
- 付出的：与 pi 相比，长会话信息连续性（compaction）与无人值守（auto-resume）存在**永久能力差**，只能靠用户参与（回车续跑）与记忆注入近似弥补；widget/overlay 类沉浸体验无法追平，浏览器 dashboard 为替代。
