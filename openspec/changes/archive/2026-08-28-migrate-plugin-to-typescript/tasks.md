## 1. 配置与工具链

- [x] 1.1 根 devDependencies 加 typescript / @types/node / typescript-eslint；package.json 加 `typecheck` 脚本，engines 提到 `>=24`（验证：`npm run typecheck` 可用）
- [x] 1.2 新建 tsconfig.json（strict / verbatimModuleSyntax / erasableSyntaxOnly / allowImportingTsExtensions）（验证：`npx tsc --noEmit` 能检查 plugin/**/*.ts）
- [x] 1.3 eslint 迁移 typescript-eslint 平铺配置（.ts 也过 lint）；CI 矩阵收窄为 Node 24 并加 typecheck 步骤（验证：`npm run lint` 对 .ts 生效）

## 2. 源码迁移

- [x] 2.1 全部 .mjs → .ts 并改写相对 import/export 后缀；.mcp.json / hooks.json 执行路径同步（验证：`find plugin -name "*.mjs"` 为 0）
- [x] 2.2 新增 mcp/lib/types.ts 领域类型（LedgerEntry 判别联合 / SessionState / SessionConfig / RunLike）（验证：被 server/hooks/测试引用且 tsc 通过）
- [x] 2.3 lib 层类型化：experiment / ledger / validate / paths / git / html / dashboard / dashboard-server（验证：tsc 0 错误）
- [x] 2.4 server.ts + 5 hooks 类型化（JSON-RPC / 工具入参 / hook 载荷接口）（验证：tsc 0 错误）
- [x] 2.5 9 个测试文件迁移 .ts：辅助函数类型化、hooks 文件名 .mjs→.ts、spawn server.mjs→server.ts（验证：`node --test tests/*.test.ts` 全过）

## 3. 验证与收尾

- [x] 3.1 全量检查：tsc 0 错误、node --test 60/60、eslint 干净、prettier 干净（验证：四条命令全绿）
- [x] 3.2 文档同步：插件 README 双语 / AGENTS.md / skills 更新 Node ≥24 与 .ts 路径（验证：grep 无 .mjs/≥22 残留）
- [x] 3.3 官方 PR #1 分支更新：重拷 plugin/ + 干净环境三件套（validate.py / build_dist.py / unittest）通过并推送（验证：gh pr view 状态 OPEN 可合并）
