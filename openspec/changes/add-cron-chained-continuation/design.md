# Design: add-cron-chained-continuation

## 背景

平台事实（源码亲验，worth-fix 审计 §A）：`CronCreate` agent 可调用、`sessionId: context.sessionId` 固定复用当前 session、delayMinutes/interval/maxRuns 三种有界调度；`assertNotAutomationTurn`（core/src/tool/handlers/cron.ts:31-43）禁止 automation turn 写 Cron——宿主自带结构性防失控。Stop hook 续跑硬顶 = `MAX_STOP_HOOK_CONTINUATIONS = 3`（宿主常量）。本 change 在两者之间架桥：recurring cron 提供「跨 turn 的续跑链」，每个唤醒 turn 内部仍享有 Stop 3 次窗口。

## Decisions

### D1. recurring + maxRuns，不做一次性 delayMinutes 链

automation turn 内禁 CronCreate——一次性唤醒后无法在唤醒 turn 里再约下一次，「链式」不成立。recurring 任务自带重复触发，maxRuns 提供硬上限：任务创建后无需任何续约动作，循环提前结束时剩余唤醒空转（幂等无害），自然耗尽或被用户交互轮清理。**这是宿主约束下唯一成立的形态**，非偏好选择。

### D2. 创建时机：用户授权后即刻，而非窗口耗尽时自作主张

两个理由：(1) 授权判断只能来自用户（无人值守会消耗真实算力与时间，未经授权的定时唤醒是惊吓行为）；(2) hook 无法可靠判断「窗口将尽」——payload 只有 `stop_hook_active` 布尔（第 2 次+ fire 置位），无连续计数，hook 内自维护计数需写共享 config（与 server 写路径竞态）。因此：unattended 规程教 agent「用户授权 → 立即创建」；stop-continue 的 block reason 只附一句条件式提示（「用户已要求无人值守时，可创建定时唤醒」），无状态、无分支，错过窗口的风险由规程的前置创建消除。

### D3. 唤醒提示自包含，防 compaction 断链

automation turn 可能发生在长会话 compaction 之后，对话记忆不可依赖。唤醒提示模板只引用：`.auto/log.jsonl` / `.auto/config.json` 状态检查（存在、未 off、未达上限）、SKILL 循环规程指针、空转指令。模板存于 unattended.md，agent 创建时以工具参数传入（模板不入代码、无路径常量，符合隐私铁律）。

### D4. 防失控四层（结构性，遵循 ADR-5「结构性控制胜过 prompt 契约」）

1. 宿主层：automation turn 禁一切 Cron 写（无法繁殖、无法自我续命）；
2. 任务层：maxRuns 硬上限（interval × maxRuns = 最长无人值守窗口，建议默认 5 分钟 × 24 ≈ 2 小时）；
3. 状态机层：maxIterations（默认 20）与 consecutiveFailures（默认 3）照常生效——唤醒 turn 的实验仍走 run/log 工具，达限即被拒；
4. 提示层：唤醒提示先检查状态，不活跃则空转（advisory）。前三层是结构性的，第四层失效也只会空转浪费，不会失控。

### D5. 空转语义与清理的诚实边界

循环提前结束（达成目标 / 达限 / 用户 off）后，剩余唤醒为空转 turn（一次轻量模型调用）。清理只能发生在用户交互轮（automation turn 禁 CronDelete）：off/clear/finalize 命令加 CronList+CronDelete 步骤；用户不在场时空转持续到 maxRuns——这是宿主约束下的已知代价，如实文档化（README 已知边界），不试图绕过（例如让唤醒 turn 提示用户删除是唯一合规路径）。

### D6. E2E 门禁先行（消证任务）

源码亲验覆盖了语义，但四点运行时行为未实证：CronCreate 在插件会话的可用性（permission mode / provider 工具面）、唤醒 turn 的真实形态（automationTurn 上下文、模型来源）、Stop hook 是否在 automation turn 触发（触发则每 wake 最多 1+3 个实验，不触发则 1 个——两种结果均可用，仅节奏不同）、唤醒 turn 对 MCP 工具的访问。任务 1 以最小实验矩阵一次跑清，结论回填本文件与 ADR；任一点证伪（如 automation turn 不可用 MCP 工具）则本 change 终止、ADR 回滚。

## 非目标

- 不做无限 auto-resume（Stop 3 次硬顶维持，ADR-3 原判不变）。
- 不新增 MCP 工具或账本格式（唤醒不写账本专用行；实验记录照常）。
- 不做 cron 任务的持久化审计（任务归宿主管理，CronList 可查）。
- 不改 `session_status`/doctor 等出队项（worth-fix 审计已判不做）。
