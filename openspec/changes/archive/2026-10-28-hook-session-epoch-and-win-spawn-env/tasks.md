# Tasks

实现已先行落在工作区（补录 change），1.x 按已验证的完成态勾选；2.x 为收尾与待决项。

## 1. 已完成的实现与验证

- [x] 1.1 `plugin/mcp/server.ts`：`hookSessionPayload` 计算 `started_at_epoch`（config 行 `createdAt` → epoch 秒，非法/缺失回退 null），before/after 两处钩子 stdin 共用
- [x] 1.2 `plugin/mcp/lib/bash.ts`：新增 `unixToolsPathEntry`（仅认 `usr\bin` 布局）与 `spawnEnv`（复用既有 PATH key 防双写，非 win32/非该布局透传）
- [x] 1.3 `plugin/mcp/server.ts`：`runCommand` 与 `runHookRaw` 两处 spawn 接入 `env: spawnEnv(bashPath)`
- [x] 1.4 `plugin/.mcp.json`：`timeoutMs` 60000 → 600000
- [x] 1.5 `plugin/tests/bash.test.ts`：新增 `unixToolsPathEntry` 纯函数用例与 `spawnEnv` 端到端用例（瘦 env 下 `head` 不可解析 → 补 PATH 后可解析；非 win32 skip）
- [x] 1.6 文档同步：`skills/autoresearch-hooks/SKILL.md` 与 `skills/autoresearch/references/loop-protocol.md` 的 session 字段列表加入 `started_at_epoch`
- [x] 1.7 验证：`npm run typecheck`、`npm run lint`、`npm run fmt:check` 通过；全量 `npm test` 除 dashboard 偶发端口竞争（干净树复现确认与本次无关）外全绿

## 2. 收尾与待决项

- [x] 2.1 spawnEnv 可达性审计收口：定为防御性机制保留（不改不移除），bash.ts 注释按审计结论改写，证据归档于 design.md 附录
- [x] 2.2 `.mcp.json` `timeoutMs` 维持 600000：满时长基准 + checks 的宿主超时风险与备选 900000 的取舍已记录于 design.md Risks
- [x] 2.3 归档前全量 `npm test`（Windows 本机）确认无回归（提交拆分遵循铁律 7：feat/chore 分批、同一文件不跨提交）
