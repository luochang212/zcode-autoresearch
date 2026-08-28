## Why

插件全部代码（MCP server、`mcp/lib/`、hooks、测试）是 `.mjs` 无类型代码，跨模块契约（账本判别联合、工具入参/出参、JSON-RPC 边界）只能靠 JSDoc 与人工纪律维护，重构与演进缺乏编译期安全网。目标是在「零第三方依赖、无构建流程」两条铁律约束内迁移到 TypeScript，获得全量类型检查。

## What Changes

- 全部 `.mjs` → `.ts`：MCP server、`mcp/lib/` 8 模块、5 hooks、9 测试文件
- 运行时要求从 Node ≥22 提升到 **Node ≥24**（原生 type stripping：零 flag、零构建、plugin/ 零依赖不变）
- 新增 `mcp/lib/types.ts` 共享领域类型；tsconfig 强制 `strict` / `verbatimModuleSyntax` / `erasableSyntaxOnly`
- 根 devDependencies 新增 typescript / @types/node / typescript-eslint；`npm run typecheck` 进 CI
- 文档（插件 README 双语、AGENTS.md、skills）同步 Node ≥24 与 `.ts` 路径
- **BREAKING**：运行时要求 Node ≥24，不再支持 22.x

## Capabilities

### New Capabilities

<!-- 行为中性重构，不引入新能力；change 声明 skip_specs -->

（无）

### Modified Capabilities

<!-- 主规范 dashboard / experiment-loop / guardrails 均为行为契约，不涉及实现语言，无 delta -->

（无）
