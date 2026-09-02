# Proposal: fix-finalize-branch-contract

## Why

worth-fix 实测审计（复现脚本 `archived/worth-fix/repro.sh`，2026-09-02 全部坐实）发现 `scripts/finalize.sh` 五处缺陷，其中两项为高危、N≥2 组必现或必然失败：

1. **分组文件集计算口径不一致**：查重用增量 diff（`PREV → last_commit`），构造分支却用累计 diff（`merge-base → last_commit`）。第 N≥2 个 topic 分支混入前序组的文件，overlap 校验与实际构造的不是同一文件集，形同虚设。
2. **含已删除文件的组必然失败**：`git checkout <commit> -- <已删除文件>` 报 pathspec 错误，`set -e` + ERR trap 整体回滚，exit=1。
3. **回滚残留脏分支 + 显式 exit 不触发回滚**：失败分支已 `checkout -b` 但未进 `CREATED` 数组，rollback 不删它（且 rollback 先删分支再切回原分支，删当前所在分支必然失败），重跑撞 "branch already exists"；构造循环内的 `exit 2` 与 verify 失败后的 `exit 1` 是显式退出，不触发 ERR trap，与头注释 "On any failure everything is rolled back" 矛盾。
4. **`node -e "require('$GJSON')"` 裸相对路径崩 + 引号注入**：Node 24 下 `require('groups.json')` 抛 MODULE_NOT_FOUND；路径含单引号直接语法错误；非 `.json` 扩展名会被当 JS 执行。
5. **含空格文件名分词错误**：`for f in $FILES` 依赖单词分割，含空格路径被拆成多段。

## What Changes

- **统一增量口径**：第一个循环算出的各组增量文件集（含 status）存储复用，构造分支只取本组增量文件，第 N 个分支只含本组改动。
- **删除文件正确落分支**：文件集改用 `git diff --name-status -z --no-renames`，status=D 的走 `git rm`，其余才 `checkout --`。
- **回滚契约补齐**：rollback 先 `git checkout` 回原分支再删已建分支；新建分支立即进 `CREATED`；构造阶段所有失败出口（分支已存在、verify 失败）统一走触发 rollback 的路径，失败后可立即重跑。
- **groups.json 读取加固**：`GJSON` 在 `cd` 前归一为绝对路径；`node -e` 改经 `process.argv` 传参 + `fs.readFileSync` + `JSON.parse`，消除插值注入与扩展名歧义。
- **文件名空白安全**：文件枚举改 `git diff -z` + `while IFS= read -r -d ''`；overlap 集合改换行分隔 + `grep -Fxq`（保持 bash 3.2 兼容）。

## Capabilities

### New Capabilities

（无。）

### Modified Capabilities

- `autoresearch/experiment-loop`: 「finalize 将保留实验整理为独立分支」requirement 修正——明确各组文件集统一为增量口径（构造与查重同一集合）、删除文件正确落分支、失败回滚无残留可立即重跑、groups.json 路径与含空格文件名的处理契约。

## Impact

- `plugin/scripts/finalize.sh`：上述五项修复（唯一行为变更文件）。
- `plugin/tests/finalize.test.ts`：新增回归测试——N=2 组第二分支只含本组文件、含删除文件的组成功、失败回滚无残留可重跑、含空格文件名、裸相对路径 groups.json。
- 兼容性：修复收紧行为（分支不再混入前序组文件、失败清理更彻底），不改变成功路径的对外产物格式（分支命名、commit 结构、verify 语义不变）。
