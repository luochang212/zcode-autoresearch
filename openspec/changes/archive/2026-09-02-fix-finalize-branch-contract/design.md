## Context

见 proposal.md「Why」。五项修复全部落在 `plugin/scripts/finalize.sh` 单个文件（bash，须兼容 macOS 自带 bash 3.2），零第三方依赖约束不变。测试沿用既有 harness：`plugin/tests/finalize.test.ts`（node:test + tmp 目录 git fixture 实跑脚本）。

## Goals / Non-Goals

**Goals:**

- 查重与构造统一为增量文件集口径，第 N 个分支只含第 N 组改动。
- 组内删除文件正确落入分支（不再 pathspec 崩溃）。
- 构造阶段任何失败完整回滚：无残留分支、回到原分支、可立即重跑；行为与头注释 "On any failure everything is rolled back" 一致。
- `groups.json` 支持裸相对路径，路径含引号不崩，非 `.json` 扩展名不被当 JS 执行。
- 含空格文件名全程安全。

**Non-Goals:**

- 不改分支命名、commit 结构、union verify 语义等成功路径的对外产物。
- 不处理文件名含换行的极端情形（换行分隔的集合比对为该取舍的已知边界，git 路径几乎不含换行，且现状对空格就已全崩）。
- 不动脚本的整体单文件 bash 形态，不引入 shellcheck 等新工具链。
- 不处理 worth-fix 报告中与 finalize 无关的其它项（如 session-start off 标记，另行评估）。

## Decisions

### D1: 增量文件集一次计算、两处复用

第一个循环（查重）已按 `PREV → last_commit` 增量算出各组文件集；把结果（含 status）存入 `GROUPS_FILES[$i]`（换行分隔的 `STATUS<TAB>path` 行），第二个循环（构造）直接复用，不再重算累计 diff。这从结构上保证「校验的集合 == 构造的集合」，而非靠两处代码各自正确。

- 为什么不用「第二个循环维护 PREV 递增重算」：两次计算仍是两个点，未来改一处忘另一处会复发；单一数据源更稳。
- `--no-renames`：rename 展开为 D+A 两行，避免 R status 带两个路径的解析复杂度；对构造语义等价（删旧路径、取新路径）。

### D2: NUL 分隔枚举 + 换行分隔集合（bash 3.2 兼容）

- 枚举：`git diff --name-status -z --no-renames "$PREV" "$LAST"`，经 `grep -z -v -E '(^|/)\.auto/|autoresearch-dashboard\.html$'` 过滤会话文件，再 `while IFS= read -r -d '' status && IFS= read -r -d '' path` 成对读取（-z 输出为 `STATUS\0path\0` 交替）。
- overlap 集合：`ALL_FILES_SET` 改换行分隔字符串，成员判定用 `printf '%s\n' "$ALL_FILES_SET" | grep -Fxq -- "$path"`（整行精确匹配，替代原空格分隔的子串匹配——子串匹配对含空格路径与互为前缀的路径都不安全）。
- bash 3.2 注意点：`read -d ''` 在 3.2 可用；进程替换 `< <(...)` 可用；不用 `mapfile`/nameref/关联数组。

### D3: 删除文件用 `git rm --ignore-unmatch`

构造分支时 status=D 的走 `git rm -q --ignore-unmatch -- "$path"`，其余 status（A/M 及 --no-renames 展开后的组合）走 `git checkout -q <commit> -- "$path"`。`--ignore-unmatch` 覆盖「文件在组内先增后删、merge-base 上不存在」的边缘情形（pathspec 未匹配也返回 0），此时净效果为空，正确。

### D4: 回滚契约——先切回、即入册、出口统一

- rollback 内顺序改为：先 `git checkout -q "$ORIG_BRANCH"`，再逐个 `git branch -D`。原顺序（先删后切）对「当前正站在待删分支上」必然失败，是残留的直接根因。
- `git checkout -q -b "$NAME"` 成功后立即 `CREATED+=("$NAME")`，随后任何一步失败（文件 checkout、commit）该分支都在册。
- 构造阶段的显式退出（`exit 2` 分支名冲突、verify 失败后 `exit 1`）改为显式调用 `rollback`（其自身 `exit 1`）。ERR trap 依赖 `set -e` 触发链，显式 exit 不触发；统一走 rollback 调用使头注释的「任何失败都回滚」成为真实契约。
- 第一阶段（查重，尚未建任何分支）的 `exit 2` 保持不变：彼时 `CREATED` 为空且人在原分支上，回滚是空操作。

### D5: groups.json 读取——绝对路径归一 + argv 传参 + readFileSync

- `cd "$PROJECT"` 之前把 `GJSON` 归一为绝对路径（相对路径基于调用者 cwd 解析，与脚本后续 `cd` 解耦）。
- `jq_or_node()` 改为 `node -e "$1" "$GJSON"`，脚本体经 `process.argv[1]`（`node -e` 无脚本路径占位，argv 首元素即用户参数）读取：`JSON.parse(require('fs').readFileSync(path, 'utf8'))`。
- 这一组合同时消除三个面：裸相对路径 MODULE_NOT_FOUND（readFileSync 无 require 的相对路径规则）、单引号注入（不经字符串插值）、非 .json 扩展名被当 JS 执行（不走 require 的扩展名分派）。

## Risks / Trade-offs

- [换行分隔集合对含换行文件名不安全] → 已知边界（Non-Goals），git 路径实践中不含换行；要彻底需 NUL 分隔集合，bash 3.2 字符串不能嵌 NUL，得不偿失。
- [`grep -z` 依赖 GNU/BSD grep 的 -z 支持] → macOS 与 Linux 的 grep 均支持 `-z`（现有测试在 macOS 跑通；CI 为 ubuntu）。已在既有代码中使用的 `read -d ''` 同理。
- [增量口径后，删除发生在更早组的场景不再波及后续组] → 正是修复 #1 的预期效果；「本组内先增后删」由 D3 的 `--ignore-unmatch` 覆盖。
