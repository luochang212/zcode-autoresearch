# Design: add-init-founding-commit

## Context

keep（`commitExperiment`：index reset → `add -A -- .` → 剔会话态）与
discard（`rollbackWorkingTree`：`checkout HEAD -- .`）共享隐含前提
「init 后树 = HEAD」。ADR-11 只在 init 发警告，把建立前提的责任交给
agent 的记忆；ml-auto 实测两次失守（keep 夹带开段配置 8 行、discard
孤儿化基线行）。修复选择在 init 层建立不变量，下游零改动。

## 决策

- **opt-in 参数而非默认行为**：commit 是外向动作，宿主纪律（未经明确允许
  不 commit）要求显式授权；缺省路径逐字不变，向后兼容。
- **暂存纪律与 keep 共用同一实现**：从 `commitExperiment` 抽取
  `stageResearchTree(cwd)`（index reset → `add -A -- .` → reset 掉会话态
  与 dashboard），`commitFoundingState` 与 keep 共用；单一路径承载「什么
  算会话状态」的既有全部修复（research dir 外预 staged、workingDir 下
  repo-wide、`.zcode` 扫入），不产生第二套口径。
- **message 前缀 `segment:`**：与账本词汇表（segment = 冻结目标阶段）对齐，
  与 keep 的 `experiment:` 前缀在 git log 中可区分。
- **暂存空则跳过**：gitignored 脏文件不折入（无空提交）；untracked 开段
  新文件由 `add -A` 覆盖（discard 的 `clean -fd` 会删 untracked，折入
  才能幸存）。

## Trade-offs

- 段首提交由插件创建，宿主若启 pre-commit hooks 会照常执行（与 keep 一致，
  可接受；hooks 失败则 init 返回错误，会话未建立，无半初始化）。
- foundingCommit 折入的文件此后归 git 管理，agent 若想反悔需自行 revert
  该提交——显式授权动作的反悔成本由使用者承担，与 keep 提交同责。
- 备选方案（init 快照 founding patch、rollback 后重放）被否：与 git 语义
  平行造一套状态机，复杂度高且边界情况（重叠文件）多；段首提交复用 git
  本身，机制面最小。
