# Tasks

## 1. git.ts 枚举统一（常量层）

- [x] 1.1 定义模块级常量 `SESSION_STATE_DIRS = [".auto", ".zcode"]`（`DASHBOARD_FILE` 沿用 ledger.ts 导入）
- [x] 1.2 `dirtyFiles` 的 exclude pathspec 从 `SESSION_STATE_DIRS` 派生（补 `.zcode`）
- [x] 1.3 `rollbackWorkingTree` 的 checkout exclude pathspec 从 `SESSION_STATE_DIRS` 派生（补 `.zcode`）
- [x] 1.4 `rollbackWorkingTree` 的 `clean -e` 参数从 `SESSION_STATE_DIRS` 派生（补 `.zcode`、`.zcode/`）
- [x] 1.5 `commitExperiment` 的暂存后 reset pathspec 从 `SESSION_STATE_DIRS` 派生（保持现有 `.auto .zcode` 行为不变）

## 2. init 声明层

- [x] 2.1 git.ts 新增 `ensureSessionStateIgnored(cwd)`：`git check-ignore -q .zcode` 已忽略则跳过；否则向 `.git/info/exclude` 追加 `.zcode`（幂等，不重复追加）；任何失败静默放行（不抛出）
- [x] 2.2 server.ts 的 `toolInitExperiment` 在 git 仓库校验通过后调用 `ensureSessionStateIgnored`

## 3. 回归测试（先红后绿）

- [x] 3.1 git.test.ts：回滚保留未跟踪 `.zcode/` 会话文件（复现已红场景翻转断言）；`rolled_back.files` 不含 `.zcode/` 路径
- [x] 3.2 git.test.ts：回滚保留 tracked `.zcode/` 文件的会话期修改（checkout 豁免）
- [x] 3.3 git.test.ts：`dirtyFiles`/`isDirty` 排除 `.zcode/`（仅会话文件改动时视为干净）
- [x] 3.4 git.test.ts：`ensureSessionStateIgnored` 幂等（两次调用仅一行）且 `.gitignore` 已忽略时跳过
- [x] 3.5 mcp-integration.test.ts：`init_experiment` 后 `.git/info/exclude` 含 `.zcode`
- [x] 3.6 既有 `.zcode` keep 排除测试继续通过

## 4. 文档与验证

- [x] 4.1 README.md / README_CN.md：循环豁免清单补 `.zcode/`；工具表补 `run_experiment` command 可缺省（冻结基准时）说明
- [x] 4.2 `openspec validate --strict close-zcode-exemption-gaps` 通过
- [x] 4.3 `npm test` 全量通过
