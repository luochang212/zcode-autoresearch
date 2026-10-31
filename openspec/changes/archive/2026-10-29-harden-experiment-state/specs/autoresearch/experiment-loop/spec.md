# Spec Delta

## MODIFIED Requirements

### Requirement: init_experiment 建立实验会话

`init_experiment` 工具 SHALL 接受会话名、主度量名、可选度量单位与方向（lower/higher，默认 lower），并在 `.auto/log.jsonl` 追加一条 config 记录；重复调用时 SHALL 递增 segment，使新目标的数据不污染旧 baseline。当 `.auto/config.json` 含 `workingDir` 时，工具 SHALL 将该目录解析为**研究目录**：此后 init/run/log、git 操作、迭代钩子与 dashboard 全部作用于该目录（config 文件本身留在项目目录）。工具 SHALL 将**冻结文件哈希**写入 `.auto/config.json` 的 `benchmarkHashes`（`measure.sh` 与 `checks.sh` 存在时的 sha256；文件不存在时为 null，"首见即基准"，在首次运行时记录）；config 账本记录本身 SHALL NOT 包含哈希（账本 append-only，无法回填首见值）。研究目录不是 git 仓库时，工具 SHALL 拒绝初始化并返回明确错误；是 git 仓库但没有任何 commit（unborn HEAD）时，工具 SHALL 同样拒绝并提示先提交 baseline（实验循环的 keep/discard 依赖 git 提交与回滚语义，空仓库上的首次回滚必然失败）。初始化 SHALL 清除 `autoresearchOff` 标记，使显式新建/重开实验会话即恢复续跑语义。

#### Scenario: 首次初始化

- **WHEN** agent 调用 `init_experiment` 并给出 name/metric_name/direction
- **THEN** `.auto/log.jsonl` 出现一条 config 记录，包含 name、metricName、direction、segment；`.auto/config.json` 出现 `benchmarkHashes`

#### Scenario: 更换优化目标

- **WHEN** agent 在已有结果后再次调用 `init_experiment`
- **THEN** segment 递增，后续 baseline 与 best 只在该新 segment 内计算

#### Scenario: workingDir 重定向

- **WHEN** 项目 `.auto/config.json` 含 `workingDir: "work/"` 且该目录存在
- **THEN** 账本写于 `work/.auto/log.jsonl`，benchmark 命令与 git 操作在 `work/` 下执行

#### Scenario: 非 git 目录拒绝初始化

- **WHEN** 研究目录不是 git 仓库（无 `.git`，`git rev-parse --git-dir` 失败）
- **THEN** `init_experiment` 返回 `ok: false` 与明确错误（提示先 `git init`），不追加 config 记录

#### Scenario: 空仓库拒绝初始化

- **WHEN** 研究目录是 git 仓库但 `git rev-parse --verify HEAD` 失败（尚无 commit）
- **THEN** `init_experiment` 返回 `ok: false`，提示先提交 baseline，不追加 config 记录

## ADDED Requirements

### Requirement: 实验工具入口前置条件与段边界

`run_experiment` SHALL 要求存在 active session（账本中存在 config 行）；无 session 时 SHALL 在任何 benchmark 执行或配置写入前返回明确错误。`patchSessionConfig` SHALL 在写 `.auto/config.json` 前创建 `.auto/` 目录。`clear_experiments` 在账本不存在时 SHALL 幂等返回成功且不写文件；存在账本时 SHALL 删除账本并重置 `pendingChecksFailed` 与 `autoresearchOff`。`rebuildState` 遇到 config 行 SHALL 重置 `consecutiveFailures`、`lastRun`、`lastRunChecksFailed`，使新 segment 的连败、before-hook last_run 与 checks 状态不继承上一段。

#### Scenario: 未 init 时 run 被拒

- **WHEN** 账本无 config 行，agent 调用 `run_experiment`
- **THEN** 工具返回 `ok: false` 与 "call init_experiment first" 类错误，不执行 benchmark、不写 `.auto/config.json`

#### Scenario: 无 .auto 时 clear 幂等

- **WHEN** 项目目录没有 `.auto/`，agent 调用 `clear_experiments`
- **THEN** 工具返回成功与 "no active session" 信息，不抛 ENOENT、不创建 `.auto/`

#### Scenario: 跨 segment 状态重置

- **WHEN** segment 1 以 discard、crash 结束，随后 init segment 2 并只记录一次 discard
- **THEN** `consecutiveFailures` 为 1（不是 3），before hook 的 `last_run` 为 null；segment 2 的 checks 标记不继承 segment 1

### Requirement: 首条 keep 与 segment baseline 一致

审计 SHALL 以当前 segment 的首条有限 metric 作为 baseline；第一条 keep SHALL 不差于该 baseline（direction-aware，允许相等），否则 SHALL 拒绝写入。第一条 keep 通过后，后续 keep 仍按当前 retained 值比较。

#### Scenario: 首条 keep 比 baseline 差被拒

- **WHEN** segment 首条 discard 的 metric 为 42，第一条 keep 的 metric 为 45（lower is better）
- **THEN** `log_experiment` 返回 `keep_without_improvement` 审计错误，不写账本、不 commit

#### Scenario: 首条 keep 持平或更好放行

- **WHEN** baseline 为 42，第一条 keep 为 42 或 40
- **THEN** keep 正常写入并成为 retained

### Requirement: keep 提交排除 session dashboard

keep 的自动提交 SHALL 排除 `.auto/` 与 `autoresearch-dashboard.html`；`isDirty` SHALL 同样忽略这两个 session 内容；回滚 SHALL 保留它们。只有 dashboard 变化时 keep SHALL 被 "no changes to commit" 拒绝。

#### Scenario: dashboard-only 改动不能 keep

- **WHEN** 工作区除 `autoresearch-dashboard.html` 外没有代码改动，agent 调用 keep
- **THEN** 工具拒绝并返回 "no changes to commit"，commit 不产生

#### Scenario: dashboard 不阻塞 crash 恢复

- **WHEN** 上一条 run 为 crash，工作区只有 dashboard 变化
- **THEN** `run_experiment` 不被 "unrolled-back working-tree changes" 拒绝

### Requirement: crash 返回值与账本一致

`log_experiment` 以 `status=crash` 记录时，账本行 metric SHALL 为 null，响应中的 metric 与 delta SHALL 同样为 null；不得用调用方传入的占位值计算 delta。

#### Scenario: crash 带 metric 也返回 null

- **WHEN** agent 以 `status:"crash", metric:7` 调用 `log_experiment`
- **THEN** 返回 `metric: null`、`delta: null`，账本行 metric 为 null
