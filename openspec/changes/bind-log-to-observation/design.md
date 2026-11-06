# Design

## Context

红测坐实的四个类内实例（2026-11-06）：凭空 keep（无任何 run）落账 ok:true；run 观测 42 后 log 40 照收；观测 42 后谎报 crash 照收；一次 run 后可连续多次 log。共同根因：**观测不持久化，账本全靠转抄**。系统的观测器是 run_experiment，但其观测结果只存活于响应——除 `pendingChecksFailed` 一个布尔外，机制没有任何「声明必须对得上观测」的抓手，只能逐事故补 cross-check。

## Goals / Non-Goals

**Goals**

1. 观测快照持久化 + log 强制对账：把「声明 vs 观测」这类问题在工具层结构性消灭。
2. run 行携带机械树状态事实（treeDirty/residual），收编上轮 deferred 的 residual 持久化。
3. METRIC 近失行响亮诊断（never-silent 原则补齐）。

**Non-Goals**

- 不收紧 keep/discard/noop 的决策空间：基准失败时 keep 照旧放行（advisory benchmark_warning 是 guardrails spec 的明文决策，不属事实层）；对账门只裁「声明是否对得上观测」。
- 不碰对抗性伪造（改基准输出、绕过工具手改账本）——ADR-5 明文信任边界，归 doctor+签名后置项。

## Decisions

**D1 `pendingChecksFailed` 键原样保留，快照不包含 checks 字段**。checks 语义（keep 门、checks_failed 有据门）已在主规范命名该键，保持不动避免规范 churn；`pendingObservation` 只承载度量/退出事实（metric、metrics、exit_code、timed_out、at）。两者在同一处写、同一处清（run 尾写入，成功 log 消费）。

**D2 对账门 = 事实门**。与 keep 门同层（审计之前、`auditBypass` 之外）——bypass 跳过的是账本内部不变量与约束，不是「声明对得上观测」这一物理层校验。

**D3 crash 判定规则**：crash 有据 ⟺ 快照存在且 `metric` 为 null（未观测到有效度量）。观测到有效度量时 crash 概念自相矛盾（crash 行 metric 强制 null = 「什么都没测到」），应走 discard/keep；基准失败但打印了部分度量时，度量仍是观测事实，绑定照常（keep-on-failed-run 政策不变）。spawn 失败也持久化快照（metric null）——「尝试过且失败」同样是观测。

**D4 消费规则**：成功 log 消费快照（一次 run 对应一次成功 log）；被拒的 log 不消费——修好参数重试不必重跑基准。跨重启对账由 config.json 持久化天然保障（与 pendingChecksFailed 同机制）。

**D5 treeDirty/residual 落行**。treeDirty 在 git 操作前取 `isDirty(cwd)`（机械事实，keep 时恒 true 无妨）；residual 沿用回滚返回值。run 侧残留 advisory（不拒绝）：残留文件可能已被合法编辑，只有「事实还在树上」值得提醒，符合 D2 的 advisory 哲学。

## 明确不修（worth-fix 留痕）

- **观测本身的对抗性伪造**：见 Non-Goals。
- **keep-on-failed-run 政策**：guardrails spec 明文 advisory，不因本 change 收紧；若未来实证 reward hacking 事故，另立 change。
- **次级 metrics 字典的绑定**：主度量绑定（转抄通道）已闭合；次级字典留作 agent 补充空间（constraints 消费它），绑定的误伤面大于收益。
