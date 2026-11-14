# Spec Delta

## MODIFIED Requirements

### Requirement: init_experiment 建立实验会话

`init_experiment` 工具 SHALL 接受会话名、主度量名、可选度量单位与方向（lower/higher，默认 lower），并在 `.auto/log.jsonl` 追加一条 config 记录；重复调用时 SHALL 递增 segment，使新目标的数据不污染旧 baseline。当 `.auto/config.json` 含 `workingDir` 时，工具 SHALL 将该目录解析为**研究目录**：此后 init/run/log、git 操作、迭代钩子与 dashboard 全部作用于该目录（config 文件本身留在项目目录）。工具 SHALL 将**冻结文件哈希**写入 `.auto/config.json` 的 `benchmarkHashes`（`measure.sh` 与 `checks.sh` 存在时的 sha256；文件不存在时为 null，遵循"首见即基准"，在首次运行时记录）；config 账本记录本身 SHALL NOT 包含哈希（账本 append-only，无法回填首见值）。研究目录不是 git 仓库时，工具 SHALL 拒绝初始化并返回明确错误；是 git 仓库但没有任何 commit（unborn HEAD）时，工具 SHALL 同样拒绝并提示先提交 baseline（实验循环的 keep/discard 依赖 git 提交与回滚语义，空仓库上的首次回滚必然失败）。初始化 SHALL 清除 `autoresearchOff` 标记，使显式新建/重开实验会话即恢复续跑语义。

`init_experiment` 另 SHALL 接受可选布尔 `foundingCommit`：为 true 且研究目录工作树脏（脏判定与会话状态豁免口径同 crash 门禁与 keep 暂存，单一事实源）时，工具 SHALL 把既有脏工作按 keep 同款暂存纪律提交为一个**段首提交**（message 带 `segment:` 前缀），返回携带该提交短 hash；暂存为空（脏文件全为 gitignored）时 SHALL 静默跳过并说明无需折入。为 true 且工作树干净时 SHALL 为 no-op。该不变量的目的：keep 的暂存与 discard 的回滚均以「init 后树 = HEAD」为前提，段首提交使换座位/换指标类开段配置免于被 keep 夹带（提交信息失真）或被 discard 打回（基线行孤儿化）。缺省（未传参）时行为 SHALL 不变：树脏只发 ADR-11 警告（advisory），不自动提交。

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

#### Scenario: 脏树折入段首提交

- **WHEN** `init_experiment` 以 `foundingCommit: true` 开段且研究目录有未提交改动（tracked 修改与 untracked 新文件，不含会话状态）
- **THEN** 产生一个 `segment:` 前缀的段首提交，返回携带其短 hash；此后的 keep 提交 diff 只含实验改动，discard 回滚后段首内容幸存（基线行可复现）

#### Scenario: 干净树 foundingCommit no-op

- **WHEN** `init_experiment` 以 `foundingCommit: true` 开段且工作树干净
- **THEN** 不产生提交，返回说明无需折入

#### Scenario: 脏文件全为 gitignored 时跳过

- **WHEN** `init_experiment` 以 `foundingCommit: true` 开段且唯一脏内容为 gitignored 文件
- **THEN** 暂存集为空，不产生空提交，返回说明无需折入

#### Scenario: 缺省保持警告不变

- **WHEN** `init_experiment` 遇脏树但未传 `foundingCommit`
- **THEN** 行为与既有版本逐字一致：初始化成功，返回携带 ADR-11 脏树警告，不自动提交
