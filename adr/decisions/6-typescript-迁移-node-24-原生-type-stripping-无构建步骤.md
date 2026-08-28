---
status: accepted
date: 2026-08-28
created: 2026-08-28
commit: 9720d48
tags: [plugin-architecture, typescript, tooling]
---

# ADR: 6 TypeScript 迁移：Node ≥24 原生 type stripping，无构建步骤

## Problem

插件本体（MCP server、lib、hooks、测试）全部是 `.mjs` 无类型代码。随着 lib 层
（账本判别联合、工具入参/出参、JSON-RPC 边界）越来越复杂，跨模块契约只能靠
JSDoc 注释和人工纪律维护，重构与演进缺乏编译期安全网。同时仓库铁律要求插件
零第三方依赖、无构建流程，迁移方案必须在这两条硬约束内成立。

## Decision

插件全部代码从 `.mjs` 迁移为 `.ts`，由 Node ≥24 原生 type stripping 直接执行，
无构建步骤、无编译产物、plugin/ 依旧零依赖：

- 运行时要求从 Node ≥22 提升到 **Node ≥24**（type stripping 默认开启，
  hooks/.mcp.json 无需任何 flag）；
- `mcp/lib/types.ts` 承载共享领域类型：LedgerEntry 判别联合、SessionState、
  SessionConfig、RunLike（分析函数收宽松行）；
- tsconfig 强制 `strict` + `verbatimModuleSyntax` + `erasableSyntaxOnly`
  （编译期禁止 enum/namespace 等不可剥离语法）+ `allowImportingTsExtensions`；
- 类型检查（`tsc --noEmit`）与 typescript-eslint 进根 devDependencies 和 CI，
  不违反零第三方依赖铁律（根目录本就承载开发工具）；
- 测试同步迁移 `.ts`，`node --test` 原生运行。

## Alternatives considered

- **保持 .mjs + JSDoc @ts-check**：零破坏，但类型标注啰嗦、约束力弱，被判定为
  「补丁式」，不满足彻底类型化的目标而否决。
- **.ts 源码 + tsc 编译成 .mjs 产物**：类型完整，但引入构建步骤和源码/产物双
  维护，与「插件原样可运行、无构建流程」的架构核心冲突，且官方 build_dist.py
  直接 zip 插件目录的流程会被打乱，否决。
- **.ts 源码 + Node 22.x `--experimental-strip-types`**：技术可行但需在每个
  node 调用加 flag，22.6 之前不可用；用户明确不想支持低版本，直接抬到 ≥24
  免 flag，否决。

## Consequences

- 运行时下限提到 Node ≥24，放弃对 22.x 的兼容，换取零 flag 的原生 .ts 执行。
- 类型系统全量生效：账本/工具/JSON-RPC 边界的跨模块契约编译期可见，重构有
  安全网。
- erasable-only 与 `import type` 纪律成为硬约束：禁止 enum/namespace/参数属性。
- 官方市场投稿内容从 .mjs 变为 .ts（PR #1 分支已同步更新），0.1.0 未发布
  因此无需升版本。
- 开发侧新增 typecheck 步骤与 typescript-eslint，根 devDependencies 扩容
  （typescript/@types/node/typescript-eslint）。
