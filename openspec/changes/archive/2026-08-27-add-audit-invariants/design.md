## Context

实现依据：`docs/research/next-steps.md` P1 审计不变量（leo 借鉴）。原理 = 账本作为**可重放状态机**：每条 run 由"前一状态 + 事件"推导，任何跳链即违规。校验分两层：`validateLedger` 纯函数（账本内部自洽，零 I/O，可单测）+ server 接线（需要 git I/O 的部分：crash 残留检测、keep 后 HEAD 确认）。清单语义参考 leo 的 `derive_state`，实现适配我们的账本格式（config 行 + run 行）。

## Goals / Non-Goals

**Goals:**

- 账本每行写入前经过机器校验，"keep 必须真实改进"等从自觉变硬保证。
- 校验全部确定性、零 LLM、可单测（对抗用例）。
- 合法会话零影响（校验只拦违规）。

**Non-Goals:**

- 不引入 target/complete/terminal 事件（leo 全套状态机超出需要——我们无 target 概念）。
- 不做价值/意图判断（只对账，不裁判"值不值得"）。
- 不改账本格式与既有工具行为（纯增量校验层）。

## Decisions

**1. `validateLedger(runs, config)` 纯函数，返回违规列表。** 遍历 run 序列维护"当前保留值"（direction-aware best of kept）：

- 首个 keep（含 baseline）允许 metric 持平；其后 keep 必须严格更优（isBetter），否则 `keep_without_improvement`。
- 非 keep 且 metric 优于当前保留值 → 仅 `checks_failed` 合法，否则 `discarded_improvement`。
- run 号必须连续（1..N）、segment 必须等于 config.segment，否则 `event_order`。
- 首条 run 前必须有 config（baseline），否则 `missing_baseline`。
- keep 行 commit 非空、非 keep 行 commit 为空，否则 `commit_field`。
  `noop` 不改变保留值、无 commit 要求。零 I/O 纯函数（git 校验不在此层）。

**2. server 接线：**

- `log_experiment`：构造拟追加 run 行 → `validateLedger(现有 runs + 拟追加行, config)` → 有违规拒收（返回 `{ok:false, error: "audit: <violation>"}`）→ 无违规才执行 git 操作与落盘。
- `run_experiment`：开始前查上一条 run——status 为 crash 且 `isDirty(cwd)`（工作区脏，.auto 豁免在 isDirty 判定中）→ 拒绝。
- keep 后 `shortHash` 回填即天然 HEAD 一致（commitExperiment 返回实际 hash），无需额外 git 校验。

**3. 人工解锁出口（副作用缓解）：** 违规时错误信息给出修正路径（如"改用 discard"、"说明 checks 失败"、"先 clear_experiments"）；`.auto/config.json` 的 `auditBypass: true` 可跳过校验（显式用户决策，文档警示）。避免 leo 式卡死。

## Risks / Trade-offs

- [旧账本含历史违规 → 下次写入报错] → 错误信息提示修正路径 + `auditBypass` 出口；文档说明"启用校验前的会话"。
- [持平 keep 被拒（agent 有正当理由）] → 错误提示改用 discard 或先 run 复测；`auditBypass` 兜底。
- [checks_failed 的 metric 语义] → 约定：checks_failed 时 metric 记录 benchmark 值（可能改进），校验按"guard 失败允许丢弃"放行。

## Open Questions

（无。）
