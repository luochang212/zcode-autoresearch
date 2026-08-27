---
status: accepted
date: 2026-08-27
created: 2026-08-27
commit: de30744
---

# ADR: 5 guardrail layer semantics: audit invariants, drift detection, secondary-metric constraints

## Problem

护栏体系的第 2-4 层（账本审计、基准漂移检测、次级度量约束）在三个 change（add-audit-invariants、add-benchmark-drift-detection、add-secondary-metric-constraints）中落地，每层都做出了影响后续演进的语义决策：校验什么、放过什么、硬拒还是警告、如何解锁。这些决策只存在于各 change 的 design.md——需要收进决策记忆，否则将来改动这些机制时（尤其 agent 自主改动）不知道当初的边界为什么这么画，容易把"警告"改成"硬拒"或删掉解锁出口。

## Decision

三层护栏的语义定格如下（"对账不裁判"是共同原则——只校验事实一致性，不做价值判断）：

1. **审计不变量**（`lib/validate.mjs`，纯函数零 I/O）：账本作为可重放状态机——keep 必须真实改进（首条 baseline 允许持平）、discard 真改进必须有 failed guard（仅 checks_failed 可丢真改进）、事件顺序（run 号连续/segment 一致）、非 keep 行不得带 commit。**crash 的 metric=0 是占位符，无测量语义**（不参与改进比较）。校验在 git 操作之前，违规拒收并附修正路径提示。
2. **基准漂移检测**：init 时记录 measure.sh/checks.sh 的 sha256 到 `.auto/config.json` 的 `benchmarkHashes`（该文件可写、豁免于回滚；账本 append-only 不可回填，故不放账本）；run 前比对，漂移返回 `benchmark_drift: true` **警告级**（不硬拒）。"首见即基准"：init 时文件不存在则首次 run 记录。
3. **次级度量约束**：`log_experiment` 的 `constraints: [{name, maxPct}]`——**opt-in，无声明零校验**；keep 时校验次级度量 ≤ 首 run 值的 maxPct%；超界拒收。baseline 缺失时该约束 `skipped`（不判定）。

**统一解锁出口**：`.auto/config.json` 的 `auditBypass: true` 同时跳过审计与约束（漂移本就是警告级），供"有正当理由的例外"使用；文档警示不推荐。

## Alternatives considered

- **审计不变量做成完整事件溯源状态机**（leo 全套：target/complete/terminal 事件、独立 event 日志）：否决——我们没有 target 概念，全套移植成本高且引入 resume 卡死风险（leo 的 error-未-revert-禁-resume 需要人工解锁，实测其 friction 模块承认此副作用）。只取其不变量语义，保留轻量账本格式。
- **漂移检测硬拒（漂移时拒绝 run）**：否决——用户主动改基准换目标时会被卡住；警告 + SKILL 规则（"收到 benchmark_drift 必须开新 segment"）已足够，决策权留 agent/用户。
- **漂移 hash 存账本 config 行**：否决——账本 append-only 写后不可改，"首见即基准"需要回填；`.auto/config.json` 本就可写会话配置且豁免于回滚，是唯一自然位置。
- **次级度量约束默认开启**：否决——约束需要用户定义"什么代价不可接受"，没有约束定义时开启只会产生 skipped 噪音；opt-in 让零声明零负担。
- **绝对上限（max）替代 maxPct**：推迟——相对语义与主度量 baseline 同源、不随绝对值漂移；minPct（下限类约束）有真实需求时再加。

## Consequences

- 买到了：四层护栏各管一维（checks=输出、审计=账本、漂移=尺子、约束=代价），语义边界清晰不重叠；全部确定性、零 LLM、可单测；解锁出口统一且显式。
- 付出的：审计的"对账不裁判"边界意味着它不拦"真实但平庸的改进"、也不拦 checks 未覆盖的 reward hacking 语义层（那些靠 checks/约束补位）；auditBypass 是信任用户的后门（误用会绕过保护，已在文档警示）；漂移/约束的 hash 与 baseline 信任模型防"顺手作弊"不防对抗性伪造（对抗场景需要 doctor+签名，见 next-steps 后置项）。
