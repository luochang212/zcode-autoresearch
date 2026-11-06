# Tasks

## 1. git.ts

- [ ] 1.1 `headSha(cwd)`：完整 HEAD sha，unborn/失败返回 null
- [ ] 1.2 `undoCommitTo(cwd, sha)`：`git reset -q --mixed <sha>`
- [ ] 1.3 `commitExperiment` 的 commit 失败消息补 index 状况说明

## 2. server.ts toolLogExperiment

- [ ] 2.1 keep 分支前捕获 `preCommitHead = headSha(cwd)`
- [ ] 2.2 `appendLedgerEntry` 包 try/catch：keep+有 commit → undo 成功返回「commit 已撤销+pending 保留」，undo 失败响亮报孤儿 hash；无 preHead 响亮报孤儿；非 keep 返回错误保留 pending
- [ ] 2.3 「无改动可 commit」消息补 unstage 说明

## 3. 测试

- [ ] 3.1 新增：chmod 0o444 触发 append EACCES → 断言 commit 撤销（HEAD 回 preHead、改动回树未暂存）、错误含「commit undone」；chmod 644 后重试 keep 成功且行含新 hash
- [ ] 3.2 既有「无改动可 commit」断言仍匹配（消息扩展不破坏片段匹配）
- [ ] 3.3 全量 `npm test` 通过；`openspec validate --strict` 通过
