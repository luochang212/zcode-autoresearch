# Design

## Context

观测绑定（bind-log-to-observation）只覆盖主度量：`metric !== obs.metric` 一票拒绝，而 `metrics` 字典从 args 原样进账本、进约束门。次级度量约束是 guardrails 四层中「次级度量约束」层的执行点（硬校验近邻），其输入却可编造，且「省略 metrics」可整体跳过。修复方向不是逐洞补，而是把 bind-log-to-observation 的不变量补完整：**账本行内的数量 claim（主度量 + 次级度量）都转写自观测**。

## Goals / Non-Goals

**Goals**

1. 行内 `metrics` 恒为观测聚合——转写不变量无条件成立，不再依赖 agent 自觉。
2. `args.metrics` 提供时全转写校验（键集合 + 值），报错风格与主度量绑定一致。
3. 约束门读观测值：堵「省略即跳过」与「编造数值」两个洞。
4. 畸形 constraints 响亮拒绝（never-silent）。

**Non-Goals**

- 不动约束语义本身（maxPct 语义、仅 keep 触发、auditBypass 解锁范围——guardrails spec 明文，proposal 不修表）。
- 不动 `run_experiment` 侧的观测聚合口径（按名中位数，与本 change 无关）。

## Decisions

**D1 行内存观测聚合，args 退化为校验入口**。`entry.metrics = obs.metrics` 无条件成立；`args.metrics` 提供时必须逐键相等（全转写，非子集——子集校验规则复杂且给「少报」留 interpretation 空间；agent 想省事就省略参数，行照样拿到完整观测）。键集合相等 vs 子集的取舍：全等规则一句话说清、测试好钉；子集规则需要解释「没报的键算什么」，正是本 change 要消灭的模糊。

**D2 约束门读 `obs.metrics`，基线行读行内聚合**。value 来源从 `args.metrics` 改为 `obs.metrics`；基线（`state.runs[0]?.metrics`）在新政策下的行自然是观测聚合，无需额外改动——旧账本的行若为 null，约束记 `skipped`（advisory 降级，不破坏不变量）。`obs` 在此处必非空（对账门已拒绝无快照），无空值分支。

**D3 畸形 constraints 拒绝而非过滤**。原 filter 是 never-silent 违反：agent 拼错的约束无声失效，保护层假象。拒绝放在对账同层（事实门之前、审计之前）；`auditBypass` 不解锁（约束条目合法性是输入形态问题，不是审计不变量）。

**D4 crash 行的 metrics**。观测聚合照存（含 `{}`）：基准死前打印的部分度量同样是观测事实，行如实携带；下游（baseline/best/confidence）只读 `metric`（crash 恒 null），无污染路径。

## Risks / Trade-offs

- 既有测试中「凭空报次级度量」的用例（约束测试、伪造 gate 输入）需改造为受控基准真输出——与主度量绑定落地时同一 treatment（controlled-measure 模式）。
- 旧行 `metrics: null` 与新行 `metrics: {}`/聚合并存：rebuildState/validate/dashboard 均不要求 metrics 非空，无兼容问题。
- 全转写校验对「agent 只想报约束相关子集」的习惯是一步收紧：返回体本就带完整聚合字典 + 直接使用的提示，跟随提示即合法。
