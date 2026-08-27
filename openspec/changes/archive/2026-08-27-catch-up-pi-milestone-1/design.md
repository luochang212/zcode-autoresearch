## Context

实现依据：`docs/research/pi-gap-analysis.md` + ADR-3 的里程碑 1——迭代钩子（pi #23）、clear（#28）、ASI 三字段提炼（#15 补全）、停摆护栏参数（#8 对齐）。全部零平台依赖：迭代钩子是 MCP server 内的子进程执行；clear 是工具+命令；ASI 提炼是 hook 文本处理；护栏参数是配置读取。参考 pi 的 hooks 契约（hooks.ts：stdin JSON、30s 超时、8KB 截断、fail-open）与 auto-resume 护栏（20 连败），按 zcode 语义简化（我方无 steer 消息通道，钩子 stdout 作为工具返回字段给 agent）。

## Goals / Non-Goals

**Goals:**

- 迭代钩子成为可靠的循环扩展点：agent 可写脚本、每次实验自动触发、输出反馈给 agent。
- clear 可一键重置会话（工具层可靠，不依赖 agent 手动 rm）。
- 记忆注入携带 ASI 三字段，跨会话/compaction 后"思路可继承"。
- 连续失败阈值用户可调（默认 3，可对齐 pi 的 20）。

**Non-Goals:**

- 不移植 pi 的 hooks 教学 skill 全套（M1 只做机制 + SKILL 简要指引；教学 examples 后置）。
- 不实现 before 钩子对 run 的"阻断"语义（pi 是 steer，非阻断；保持 fail-open）。
- 不改账本格式（asi 已存；钩子输出不入账本——pi 会把 hook 观测行写入 jsonl，M1 不做，避免账本格式变更，后置评估）。

## Decisions

**1. 钩子执行语义（借 pi 简化）：**

- `before.sh` 在 run_experiment 的基准执行前跑；`after.sh` 在 log_experiment 记录后跑。均 spawn `bash <path>`，stdin 写单行 JSON，30s 超时 kill，stdout 截 8KB。**fail-open**：钩子缺失/不可执行/失败都不阻断主流程。
- stdin JSON：before `{event:"before", cwd, next_run, last_run, session}`；after `{event:"after", cwd, run_entry, session}`（session 含 metricName/direction/baseline/best/runCount）。
- 返回：`before_steer` / `after_steer` 字段（钩子 stdout 或空）。备选（阻断式、写账本）——放弃：改变现有契约面，且 pi 亦非阻断。

**2. clear 走工具而非纯命令：** `clear_experiments` MCP 工具删 `.auto/log.jsonl`（仅该文件），返回确认；命令 `/autoresearch:clear` 指引 agent 调用。理由：机制可靠（agent 一步到位），且 spec 明确工具行为。备选（命令里让 agent 手动 rm）——放弃：不可靠、无状态返回。

**3. 护栏参数来源：** `.auto/config.json` 的 `consecutiveFailures`（默认 3）；server 的 `sessionState()` 与 stop-continue hook 都经 `readSessionConfig` 读取，行为一致。pi 用 20——默认保守 3，文档提示可配 20。

**4. ASI 提炼放在注入文本层：** memory-inject/stop-continue 从账本 run 行读 `asi` 对象，单行化 `hyp:`/`next:`/`rollback:` 追加。不改账本、不改 server。

## Risks / Trade-offs

- [钩子脚本失控（死循环/大输出）] → 30s 超时 kill + 8KB 截断 + fail-open；文档提示钩子应短小。
- [钩子 stdout 可能被 agent 误当指令] → 返回字段命名 `*_steer` 并注明"建议性输入"；SKILL 说明。
- [clear 误删] → 只删 log.jsonl（保留 measure/checks/prompt）；命令要求 agent 先确认。
- [阈值改动影响既有会话] → 默认 3 保持现状；读 config 覆盖，无配置则回退默认。

## Open Questions

（无。）
