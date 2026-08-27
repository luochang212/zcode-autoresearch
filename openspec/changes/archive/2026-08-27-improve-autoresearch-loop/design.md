## Context

改进依据：`docs/research/autoresearch-field-test.md`。三个缺口——plateau 检测、confidence 规程化、噪声中位数——全部落在已归档 capability `autoresearch/experiment-loop` 与 `autoresearch/guardrails` 的行为增强。既有契约（账本格式、git 语义、measure 锁定、checks 背压）不变，新增字段全部 additive，旧账本文件与旧调用兼容。

## Goals / Non-Goals

**Goals:**
- 让"何时收尾"成为协议层判定（plateau），而非 agent 自觉。
- 让噪声度量下的改进判定可复测（repeat 取中位数）。
- 让 confidence 进入 agent 的实际决策规程，而非仅是返回字段。

**Non-Goals:**
- 不改账本/git/锁定/背压等既有机制。
- 不做 uditgoenka 式完整 orchestrator（goal 分类、命令路由）——plateau 只在单 segment 循环内。
- 不引入额外依赖或改变 MCP 协议。

## Decisions

**1. plateau 检测语义：窗口最佳相对改善 < 1%。**
`detectPlateau(runs, { window = 5, minImprovement = 0.01 })`：取当前 segment 最近 `window` 轮中 metric 非空的记录；`first` = 窗口首轮 metric，`best` = 窗口内最优（direction-aware）；相对改善 `|best - first| / |first|`（first=0 时用绝对差）< `minImprovement` → true；窗口内有效记录不足 `window` 轮 → false（不判定）。备选：uditgoenka 的"末 5 cycle 净平坦或更差"——用相对阈值更直接且对量纲无关，选定。注意 plateau 只在 keep 序列上无意义（discard 也会产生 metric），用全部记录。

**2. repeat 中位数：`run_experiment` 的 `repeat` 参数（1..10，默认 1）。**
每次独立 spawn + 计时；主度量（与 config.metricName 同名者）收集为数组，返回 `metrics`（每次完整值）+ `median_metric`（中位数，复用 `experiment.mjs` 的 `median`）。checks 只在最后一次运行后执行一次（正确性不随重复变化）。timeout 按单次计算。备选：在 measure.sh 内自行循环——不可（measure.sh 冻结，且工具应负责计时语义）。

**3. confidence 规程化：SKILL + loop-protocol 显式规则。**
- SKILL 循环规程加一步："改进在噪声区间时，用 `repeat: 3` 复测取中位数再判定"。
- `log_experiment` 返回 `confidence` 移到 `delta` 后（显著位置）。
- loop-protocol 噪声小节改写为规则：`confidence.level` 为 red/yellow 时，改进视为"方向性"，可 keep 但 description 标注；无 repeat 复测前不做大幅结构改动。
- Stop hook 的 plateau reason 提示"用 repeat 复测确认或开启新 segment"。

**4. Stop hook 放行 plateau：`isStopReached` 之外新增条件。**
`stop-continue.mjs` 中：`plateau && runs.length >= window` → 放行（reason 说明平台期）。语义：连续 3 次失败→放行（既有）；迭代上限→放行（既有）；平台期→放行（新增）。plateau 判定复用 `detectPlateau`（与 server 同一纯函数，保证一致）。

## Risks / Trade-offs

- [相对改善阈值（1%）对极小度量失真] → 用相对值 + first=0 兜底绝对差；窗口与阈值可通过 env（`AR_PLATEAU_WINDOW`/`AR_PLATEAU_MIN_IMPROVEMENT`）覆盖（实现时以常量+env 形式）。
- [repeat 拉长单轮耗时] → 默认 1（不改变既有行为）；agent 只在噪声明显时显式 repeat。
- [plateau 误判导致过早收尾] → 阈值保守（1%）；窗口 5 轮；reason 明示"可用 repeat 复测或 init_experiment 开新 segment"。

## Open Questions

（无。）
