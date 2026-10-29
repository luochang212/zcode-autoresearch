# Spec Delta

## MODIFIED Requirements

### Requirement: keep 提交排除 session dashboard

即使文件已预先暂存，keep 的自动提交 SHALL 排除 `.auto/` 与 `autoresearch-dashboard.html`；`isDirty` SHALL 同样忽略这两个 session 内容；回滚 SHALL 保留它们。只有 dashboard 变化时 keep SHALL 被 "no changes to commit" 拒绝。

#### Scenario: dashboard-only 改动不能 keep

- **WHEN** 工作区除 `autoresearch-dashboard.html` 外没有代码改动，agent 调用 keep
- **THEN** 工具拒绝并返回 "no changes to commit"，commit 不产生

#### Scenario: dashboard 不阻塞 crash 恢复

- **WHEN** 上一条 run 为 crash，工作区只有 dashboard 变化
- **THEN** `run_experiment` 不被 "unrolled-back working-tree changes" 拒绝

#### Scenario: 已暂存的 session 文件不得提交

- **WHEN** 新建或已跟踪的 `.auto/` 文件与 dashboard 已暂存，随后执行 keep
- **THEN** session 文件内容完整保留；没有代码改动时不产生 commit，有代码改动时仅提交代码
