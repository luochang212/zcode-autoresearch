# Autoresearch 实跑报告（field test）

> 2026-08-27 · 插件 `autoresearch` v0.1.0 首次真实场景运行
> 前置：`docs/research/autoresearch-survey.md`（设计依据）、`openspec/specs/autoresearch/*`（行为契约）

## 场景

- **目标**：加速 `findPrimes(1000000)`（统计 1,000,000 内质数个数）。
- **baseline**：对每个 n 用已找到的质数列表 `primes.every(p => n % p !== 0)` 全量试除——2.6s。
- **度量**：`METRIC time_ms`（lower is better），由 `.auto/measure.sh` 输出。
- **正确性门禁**：`.auto/checks.sh` 断言 `findPrimes(1000000).length === 78498`（π(1,000,000)），防删循环作弊。
- **驱动**：无头 CLI（`zcode --prompt`）+ 插件 MCP server，DeepSeek 通道，单次 prompt 自主迭代。

## 结果

**9 轮（baseline + 8 个假设），度量 2852ms → 4ms（约 713× 加速），正确性全程守住。**

| 轮  | 假设                                 | metric          | 判定    |
| --- | ------------------------------------ | --------------- | ------- |
| R1  | 试除只到 sqrt(n) + 跳过偶数          | 2852 → 22ms     | keep    |
| R2  | 埃氏筛（Uint8Array 标记合数）        | 22 → 7ms        | keep    |
| R3  | odds-only 筛（索引 i 代表奇数 2i+1） | 7 → 5ms         | keep    |
| R4  | 标记段+收集段拆两段去分支            | 7ms（变差）     | discard |
| R5  | Uint32Array 位打包筛                 | 6ms（未优于 5） | discard |
| R6  | 外层跳过 3 的倍数（wheel 2×3）       | 5 → 4ms         | keep    |
| R7  | wheel-6 标记跳过 ≡3 mod 6 的倍数     | 4ms（持平）     | discard |
| R8  | 交替步长替代 %6 分支                 | 7ms（变差）     | discard |

最终实现：odds-only + wheel 2×3 的埃氏筛（标记从 p² 起步、步长 p、外层只访问奇数且跳过 3 的倍数）。agent 自行判断已接近该规模下 JS 筛法实用下限（4–6ms 波动，含 `Date.now()` 1ms 分辨率噪声）并收尾。

## 机制验证点（全部按契约工作）

- ✅ **measure.sh 锁定**：agent 全程只通过 `run_experiment` 跑基准，未绕过。
- ✅ **checks 背压**：9 轮全部 `checks.failed=false`，count 始终 78498；R2 后算法换成筛法仍通过（agent 理解 checks 是"输出正确性"而非"实现方式"）。
- ✅ **keep/discard 语义**：4 keep 全部是真实改进且自动 commit；4 discard 全部被回滚（工作区回到上一 keep），`.auto/` 幸存，账本与 git log 自洽。
- ✅ **账本质量**：每轮 description 记录了假设、机理与结果（如"位运算开销 > 缓存收益"），ASI 语义（假设/结论）自然产生。
- ✅ **git 记忆**：`experiment:` 前缀 commit 链 = 被接受的改进路径，可直接 review。
- ✅ **无头长循环**：单次 prompt 内连续 9 轮 × 3 工具调用，无头模式下核心循环可自主运行（hooks 降级为可选）。
- ✅ **dashboard**：export 生成 4732B 自包含 HTML，含 experiments/kept/reverted/best 统计。

## 暴露的问题（补缺口的输入，按优先级）

1. **收敛/plateau 检测缺失**：agent 是**自发**在噪声区间判断"接近下限"收尾的，循环协议与 Stop hook 没有"平坦收敛"概念（`isStopReached` 只认迭代上限与连续失败）。R7 的"4ms 持平"被判 discard 合理，但若无 agent 自觉，会在噪声区无限空转。→ 候选：`log_experiment` 返回 plateau 提示（最近 N 轮 delta 无净改进），Stop hook 用同一逻辑。
2. **confidence 未被 agent 使用**：`log_experiment` 返回了 `confidence`（MAD 校准），但 R5/R7 的判定（6ms vs best 5ms、4ms 持平）都没有引用它；噪声区间里 keep/discard 的边界判定完全靠 agent 直觉。→ 候选：SKILL 规程显式要求"低置信改进按 discard 或标注方向性"，工具返回中把 confidence 提到更醒目位置。
3. **噪声度量下的判定校准**：4–6ms 区间波动 ~±2ms（Date.now() 1ms 分辨率 + 运行时抖动），改进/持平/变差的区分在噪声内。agent 靠"持平即 discard"处理得当，但没有机制提示"该跑多次取中位数"。→ 候选：SKILL setup-guide 已有"噪声就跑 3 次取 median"建议，可让 `run_experiment` 支持 `repeat: 3` 参数并自动取中位数。
4. **无头模式的护栏缺口**（已知边界，复验确认）：本次无头运行没有 hook 护栏（写保护/记忆注入/Stop 续跑），agent 依然良好运行——说明机制（工具层）是护栏主力，hook 是增强；但也说明无头场景的"冻结文件"只靠 SKILL 章程约束。

## 结论

核心循环在真实优化场景**完全有效**：机制（工具/账本/git/锁定/背压）全部按契约工作，agent 的假设质量与 keep/discard 判定可靠，713× 加速为明证。下一轮改进优先级：**plateau 收敛检测 → confidence 的规程化使用 → 噪声度量取中位数支持**；三者都属 `autoresearch/experiment-loop` 与 `autoresearch/guardrails` capability 的行为增强，届时开 change 实施。
