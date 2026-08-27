## Context

实现依据：`docs/research/next-steps.md` P1 次级度量约束（Westland 借鉴）。`run_experiment` 已解析全部 METRIC 行为 metrics 字典——次级度量数据已有；只需在 `log_experiment` 加 constraints 声明与 keep 校验。次级度量 baseline = 当前 segment 首条 run 的该 metrics 值（与主度量 baseline 同源）。opt-in：无 constraints 零校验。

## Goals / Non-Goals

**Goals:**
- 把"别用内存换速度"从口头变成硬门槛：keep 时校验次级度量在容忍带内，超界拒收。
- 零摩擦：默认不启用，声明才生效。

**Non-Goals:**
- 不做绝对 max/min（先支持 maxPct 相对语义——最常用的约束形式）。
- 不做约束的自动推断（用户/agent 显式声明）。
- 不改 run_experiment（次级度量已解析）。

## Decisions

**1. constraints 语义：`[{ name, maxPct }]`，相对首条 run。** `maxPct: 105` 表示"该次级度量 ≤ 首条 run 值的 105%"。相对语义与主度量 baseline 一致（首条 run 是基准），且不随绝对值漂移。校验仅在 status=keep 且声明时进行。

**2. 校验实现（log_experiment，审计校验旁）：**
- 解析 `args.constraints`（数组，每项 `{name, maxPct}`，maxPct 为正数）。
- 本次 run 的次级度量从 `args.metrics` 或 run 解析的 metrics 取（run_experiment 返回里 metrics 字典——agent 传入；也可从本 run 的 metrics 参数）。
- baseline：`state.runs[0]?.metrics?.[name]`（首条 run 的该次级度量）；缺失 → 该约束跳过（无法判定）。
- 超界（value > baseline * maxPct / 100）→ 拒收 keep。
- 返回 `constraints: [{name, pass|fail, value, limit}]`。

**3. 错误提示：** 超界时提示"次级度量 X 超出约束（value vs limit）——放宽 constraints 或改判 discard"。`auditBypass` 同样跳过约束校验（一致性）。

## Risks / Trade-offs

- [次级度量 baseline 缺失（首条 run 无该 metric）] → 该约束跳过（无法判定），返回提示。
- [maxPct 对 lower/higher 次级度量的方向] → 约束语义固定为"上限"（≤ maxPct%）；若用户要"不低于"，后置加 minPct。
- [agent 传假 metrics] → 与 checks 同信任模型（防顺手，不防对抗）；审计不变量兜底主度量。

## Open Questions

（无。）
