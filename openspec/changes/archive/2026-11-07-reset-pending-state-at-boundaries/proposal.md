# Proposal

## Why

架构 review 提出四项发现，worth-fix 逐一实证后仅一项值得修，且它不是「结构味道」而是**已实例化的 bug**：`pendingObservation` 不在 `clear_experiments` 与 `init_experiment` 的重置清单里（两者只手工重置 `pendingChecksFailed`/`autoresearchOff`）。红测实证（2026-11-07，真实 server 端到端）：上一 session 从未被消费的观测快照跨 clear/init 存活，为新 segment 的 run #1 落账背书——agent 无需在新 session 跑任何基准，`log_experiment(discard, metric=<旧值>)` 直接落行。这打穿 `bind-log-to-observation` 刚建立的不变量（落账必须转写**本次** run 的观测），且绕过漂移检测（init 已把 benchmarkHashes 重新基线化）。

根因不在某个遗漏的字段，而在模式：pending 态的重置靠「每个 handler 记得列出每个字段」。`pendingChecksFailed` 加得早所以两处清单都有它；`pendingObservation` 加得晚，写入端（run）与消费端（log）都更新了，重置清单没人记得。下一个 pending 字段还会再漏一次。

## What Changes

- 新增约定：`.auto/config.json` 中 **`pending` 前缀的键 = server 跨调用机制态**，与用户配置（maxIterations 等）和会话基线（benchmarkHashes 等）区分；约定写入 `SessionConfig` 类型注释
- `init_experiment` 与 `clear_experiments` 在 segment 边界**整体清除全部 `pending*` 键**（单一 helper，不再逐字段维护清单）；`clear` 的早退路径（无 `log.jsonl`）同样清除——pending 态是机制态而非用户意图，无条件归零
- 未来新增的 `pending*` 字段自动被边界重置覆盖，不再依赖「记得补一行」
- **决策权与既有语义不动**：`autoresearchOff` 的重置行为保持现状（仅在有活动 session 的 clear 中重置，属用户意图态不适用前缀规则）；正常 run→log 流完全不受影响（重置只清残留，不清新观测）

## 明确不修（worth-fix 判定，留痕防复审）

| 发现                                                       | 判定 | 理由                                                                                                                                                                                          |
| ---------------------------------------------------------- | ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| config.json 拆分出 server 全权的 state.json                | 不修 | 中成本（路径/文档/spec 全动）换投机收益；前缀规则已覆盖同类 bug 的整类风险，残留实例 2 行可修                                                                                                 |
| `confidenceForSegment` 与 `rebuildState` 聚合走查重复      | 不修 | 逐谓词等价、两侧测试钉住语义；分歧触发需有意改聚合语义（届时两侧测试同改）；纯卫生重构且与本次修复相邻（顺手重构反模式）。留 adrkit note：下次动 confidence 语义时收编为 experiment.ts 纯函数 |
| `runCommand`/`runHookRaw` spawn 脚手架重复                 | 不修 | 差异是有意策略（benchmark SIGTERM→5s 升级 SIGKILL 给 trap 机会；hook 直接 SIGKILL）；参数化抽象成本 ≈ 重复本身                                                                                |
| `pendingChecksFailed` 并入 `pendingObservation` 双通道合一 | 不修 | 两次 sync 小文件写零正确性问题；合并需 schema+spec+测试全动，零行为收益；前缀规则已覆盖其管理成本                                                                                             |

## Capabilities

### New Capabilities

（无）

### Modified Capabilities

（无既有 requirement 文本变更；experiment-loop capability 新增「跨调用 pending 态的边界重置」requirement，见 specs/）
