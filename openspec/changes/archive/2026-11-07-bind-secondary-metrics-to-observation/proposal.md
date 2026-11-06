# Proposal

## Why

全仓库 review（2026-11-07）轴 1 #2：观测绑定只钉住主度量（`metric !== obs.metric`），`metrics` 字典却来者不拒——`args.metrics && typeof args.metrics === "object"` 即收，值不查类型原样入账，次级度量约束门（硬校验近邻，ADR-5 框架）消费的是 agent 可凭空编造的数字。`PendingObservation.metrics`（按名中位数聚合）明明为此录制。这打穿 bind-log-to-observation 建立的不变量（「账本中每个数量 claim 都是测量事实的转写」）只差一半：主度量是转写，次级度量是自由申报。

且约束门还有一个伴生洞：`value = metrics?.[c.name]`，agent **省略 metrics** 时约束结果记 `skipped`（"no baseline or value"）、keep 照过——约束门可被「不报数」整体绕过。基线一侧（`state.runs[0]?.metrics`）同样来自 args 转抄，同样可编造。

畸形 constraints 条目被 filter 静默丢弃（never-silent 原则违反），agent 无从知道自己的约束没生效。

## What Changes

- **账本行的 `metrics` 永远存观测聚合**（`obs.metrics`），不再取自 args——「行内数量 = 转写观测」从主度量扩展到次级度量，无条件成立
- **`args.metrics` 提供时 SHALL 为全转写**：键集合与每个值都须等于 `obs.metrics`（与主度量同一绑定层、同一错误风格）；不提供则完全合法（行仍记录观测值），转写校验只裁「报了但报错」
- **次级度量约束门改读观测值**（`obs.metrics[c.name]`），不再依赖 args 转抄——「省略 metrics 绕过约束」与「编造数值通过约束」两个洞同关
- **畸形 constraints 响亮拒绝**：条目缺 `name` 字符串或 `maxPct` 非正数时 SHALL 拒绝并说明，不再静默过滤

## 明确不修（worth-fix 判定，留痕防复审）

| 发现                                                | 判定 | 理由                                                                                                 |
| --------------------------------------------------- | ---- | ---------------------------------------------------------------------------------------------------- |
| 约束基线改从 config 持久化（而非首行 metrics 派生） | 不修 | 行内 metrics 转写观测后，基线即「首 run 的观测聚合」，来源已可信；再加持久化层是重复真相源           |
| args.metrics 参数废除（观测后参数冗余）             | 不修 | spec 明文「可选次级度量」，保留参数作转写校验入口，兼容既有调用方；废除属 API churn 零行为收益       |
| 非 keep 状态的约束校验（现仅 keep 触发）            | 不修 | 约束语义是「保留的实验不得付出隐藏代价」，discard/crash 不保留，无代价可约束（guardrails spec 明文） |

## Capabilities

### New Capabilities

（无）

### Modified Capabilities

- `autoresearch/experiment-loop`：「log_experiment 与观测对账」requirement 扩展——次级度量全转写绑定、行内存观测聚合、约束门读观测值、畸形 constraints 拒绝
