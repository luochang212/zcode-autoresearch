## Context

插件为 Node 标准库零依赖架构（AGENTS.md 铁律 #2）：`plugin/` 无 package.json、无构建步骤、hooks 与 MCP server 由宿主的 node 直接执行。主规范（`dashboard` / `experiment-loop` / `guardrails`）只约束行为契约，不涉及实现语言，因此本次迁移无需 spec 增量（`skip_specs`）。动机见 proposal.md。

## Goals / Non-Goals

**Goals:**

- 全部源码 `.ts`，`strict` 全量类型检查
- 运行时零变化：Node 原生剥离类型直接执行，无构建产物、无新依赖
- 测试同步 `.ts`，`node --test` 原生运行

**Non-Goals:**

- 不改变任何行为契约（不新增/修改工具、护栏、账本格式）
- 不做 tsc 编译产物方案（违背无构建铁律）

## Decisions

- **方案：Node ≥24 原生 type stripping**。替代方案：JSDoc `@ts-check`（补丁式，否决）、tsc 编译产物（引入构建步骤与双维护，否决）、Node 22 `--experimental-strip-types`（需逐个 node 调用加 flag 且 22.6 前不可用，否决）。完整记录见 ADR-6。
- **`erasableSyntaxOnly` + `verbatimModuleSyntax`**：编译期强制「仅可剥离语法」与 `import type` 纪律，保证原生执行与类型检查一致。
- **`RunLike` 宽松输入**：分析函数（`isStopReached` / `detectDoomLoop` / `detectPlateau` / `validateLedger`）收部分行对象——auditor 本就该处理宽松/异常行，语义更准确。
- **JSON-RPC 边界显式类型化**：`JsonRpcRequest` / `RunOutcome` / `HookOutcome` / 五个工具入参接口，边界处 cast，内部全类型。

## Risks / Trade-offs

- 运行时下限提到 Node ≥24，放弃 22.x 兼容（用户明确接受「只支持高版本」）。
- erasable-only 限制：禁止 enum/namespace/构造器参数属性，团队需遵守 `import type` 纪律。
- 官方市场投稿内容变更：PR #1 分支已同步更新；0.1.0 未发布，无需升版本。
