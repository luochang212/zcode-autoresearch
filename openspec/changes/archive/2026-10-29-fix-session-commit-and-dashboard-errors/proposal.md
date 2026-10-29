# Proposal

## Why

worth-fix 复核确认两项中等严重度局部缺陷：已暂存的 dashboard 会绕过 keep 的排除规则；live 渲染异常虽被捕获，却因提前发送响应头而返回空白 200。二者修复成本低，分别影响实验提交完整性和故障可见性，值得立即修复，无需重构。

## What Changes

- keep 前从 index 撤销 session 文件的暂存，保留磁盘内容；覆盖新文件和已跟踪文件、只有 session 文件和混合代码改动。
- live 请求先完成读取/渲染，再发送 200，使失败返回 500，且后续请求仍能响应。
- 把真实生产路径的复现固化为回归测试，先红后绿。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `autoresearch/experiment-loop`：明确预先暂存的 session 文件同样不得进入 keep commit。
- `autoresearch/dashboard`：明确成功响应头必须等读取/渲染成功后发送。

## Impact

- 仅修改 `plugin/mcp/lib/git.ts`、`plugin/mcp/lib/dashboard-server.ts` 及对应测试；无依赖、API 或持久化格式变更。
- 已复现：暂存 dashboard 后 dashboard-only commit 返回 hash；账本 config.name 为 `{ "toString": null }` 时 GET / 返回 200 空正文，随后原始账本仍返回 200。
- 触发需要本地暂存 session 文件或畸形账本，不声称远程攻击、数据外传或进程崩溃。
- 与 ADR-2 的提交边界、ADR-1/6 的零依赖约束一致；仅补齐既有机制，不新增架构决策。

## Verification

- 7 个新增真实路径回归修复前全部失败：6 个 git 场景错误提交 session 文件，1 个 HTTP 场景返回 200 而非 500；修复后全部通过。
- git 场景覆盖新建、修改、删除，以及 session-only/混合代码；验证磁盘内容保留、HEAD 仅含代码。HTTP 场景验证错误正文、原始账本路由存活及修正账本后恢复正常页面。
- 全量 `npm test` 通过（插件 146 通过、5 跳过，契约 6 通过）；lint、typecheck、fmt:check、adrkit validate --all、change strict 与主规范校验通过。主规范原有长需求描述警告保持原状。
