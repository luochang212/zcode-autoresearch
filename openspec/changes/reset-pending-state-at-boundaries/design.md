# Design

## 根因与原理

一句话：pending 态的重置是「逐字段清单」模式，加字段的人只更新写入端与消费端，清单靠记忆维护——`pendingObservation` 就是漏掉的那个。修法把「记得逐字段」换成结构规则：**`pending*` 前缀 = server 跨调用机制态，边界整体清除**。前缀约定写进 `SessionConfig` 类型注释（types.ts 是 server/hooks/tests 共享的类型事实源），规则即文档。

## 备选与取舍

1. **逐字段补清单**（把 `pendingObservation: null` 加进 init/clear 两处 patch）：2 行修好本例，但模式不变——下一个字段再漏一次。否决。
2. **拆出 server 全权的 `.auto/state.json`**：结构上最干净（clear 整文件删除），但要动路径层、hooks 读取、README 的 `.auto/` 布局文档、全部相关测试，且现有 pending 键只有两个、基线键两个——拆分成本与当前痛感不成比例。否决（proposal 已留痕，痛点增大时重提）。
3. **前缀规则 + 单一 helper**（选定）：一个 `resetPendingState()`，init/clear 各一行调用；未来字段自动覆盖。代价是引入一条命名约定——靠 types.ts 注释 + 本 spec 钉住。

## 语义决策

- **clear 早退路径（无 `log.jsonl`）也清除**：现状早退时连 `pendingChecksFailed` 都不重置。pending 态是机制态，其可消费性由 log 门（要求活动 session）兜底，早退不清只是「恰好无害」；统一为无条件清除后，clear 的语义变成干净的「一切归零」。`autoresearchOff` **不在**早退路径重置——它是用户意图态（`/autoresearch:off` 显式设置），不适用前缀规则，现状保持。
- **清除实现为「读 config → 删 `pending*` 键 → 写回」**：与 `patchSessionConfig` 同为 read-modify-write。init 在 reset 后照旧 patch 自己的键（两次 config 写，无原子性问题——JSON-RPC 串行处理，config.json 无并发写者）。
- **拒绝路径不消费**：reset 发生在边界（init/clear），与 log 门「被拒不消费快照」正交，无交互。

## 验证边界

- 红测为**实证**：临时脚本驱动真实 server 端到端复现（2026-11-07）——stale `pendingObservation`（metric 123）跨 clear→init 与仅 init 两条路径均使 `log_experiment(discard, 123)` 落行成功；修复后同一场景翻转断言为回归测试（真实 server 驱动，非模拟）。
- 「明确不修」的三项（聚合重复、spawn 脚手架、双通道）为**结构审查判定**（逐谓词比对 + 注释理据核对），无行为改动故无行为可测；证据与理由在 proposal 留痕。
