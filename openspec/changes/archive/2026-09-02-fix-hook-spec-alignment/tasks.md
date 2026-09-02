# Tasks: fix-hook-spec-alignment

## 1. 平台期放行（D1）

- [x] 1.1 翻转测试：`plugin/tests/hooks.test.ts` "stop-continue reports plateau convergence" 断言 stdout 为空（放行），而非 `decision: "block"`
- [x] 1.2 `plugin/hooks/stop-continue.ts`：plateau 分支改 exit 0 放行，建议文本写 stderr

## 2. session-start 的 off 口径（D2）

- [x] 2.1 回归测试先行（红）：项目 config 含 `workingDir: "work"` 与 `autoresearchOff: true`、账本在 `work/.auto/log.jsonl` → session-start 输出为空；去掉 off → 恢复注入
- [x] 2.2 `plugin/hooks/session-start.ts`：off 从项目目录 config 读取

## 3. 收尾

- [x] 3.1 全量检查：`npm test`、`npm run lint`、`npm run fmt:check`、`npx tsc --noEmit` 全绿
- [x] 3.2 `openspec validate --strict fix-hook-spec-alignment` 通过；归档 change（`openspec validate --specs` 通过）
