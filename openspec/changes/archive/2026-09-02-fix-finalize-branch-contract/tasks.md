# Tasks: fix-finalize-branch-contract

## 1. 回归测试先行（红）

- [x] 1.1 `plugin/tests/finalize.test.ts`：N=2 组，断言第二分支 `git diff --name-only main autoresearch/<goal>/02-*` 只含本组文件（不含第一组的文件）
- [x] 1.2 含删除文件的组：组 2 为 `git rm` 某文件，断言 finalize 成功（exit 0）、分支树中该文件不存在、union verify 通过
- [x] 1.3 失败回滚无残留可重跑：预建 `autoresearch/<goal>/02-*` 分支制造构造中途冲突，断言失败后回到原分支、本次已建的 01 分支被删、预建分支不受影响；删掉预建分支后重跑成功
- [x] 1.4 含空格文件名：组内含 `my file.js`，断言 finalize 成功且分支内容正确
- [x] 1.5 裸相对路径：在 fixture 项目目录内以 `bash finalize.sh . groups.json` 调用，断言成功
- [x] 1.6 跑 `cd plugin && node --test tests/finalize.test.ts` 确认新增用例红（旧实现下失败）

## 2. 修复 finalize.sh

- [x] 2.1 增量口径统一：文件集改 `git diff --name-status -z --no-renames "$PREV" "$LAST"` + `grep -z` 过滤 + `while read -d ''` 成对解析；按组存入 `GROUPS_FILES[$i]`（换行分隔 `STATUS\tpath`），构造循环复用（design D1/D2）
- [x] 2.2 overlap 集合改换行分隔 + `grep -Fxq` 整行比对（design D2）
- [x] 2.3 构造分支：status=D 走 `git rm -q --ignore-unmatch --`，其余走 `git checkout -q <commit> --`（design D3）
- [x] 2.4 回滚契约：rollback 先 `git checkout -q "$ORIG_BRANCH"` 再删 `CREATED`；`checkout -b` 成功后立即入册；分支名冲突与 verify 失败改调 `rollback`（design D4）
- [x] 2.5 groups.json 读取：`cd` 前归一绝对路径；`jq_or_node` 改 `node -e "$1" "$GJSON"` + `process.argv` + `fs.readFileSync` + `JSON.parse`（design D5）
- [x] 2.6 跑 1.6 的测试确认转绿

## 3. 收尾

- [x] 3.1 全量检查：`npm test`、`npm run lint`、`npm run fmt:check`、`npx tsc --noEmit` 全绿
- [x] 3.2 重跑 `archived/worth-fix/repro.sh` 确认 C1/C2 场景行为已修复
- [x] 3.3 `openspec validate --strict fix-finalize-branch-contract` 通过；归档 change（delta 合并进 `openspec/specs/`，`openspec validate --specs` 通过）
