## MODIFIED Requirements

### Requirement: init_experiment 建立实验会话

`init_experiment` 工具 SHALL 接受会话名、主度量名、可选度量单位与方向（lower/higher，默认 lower），并在 `.auto/log.jsonl` 追加一条 config 记录；重复调用时 SHALL 递增 segment，使新目标的数据不污染旧 baseline。当 `.auto/config.json` 含 `workingDir` 时，工具 SHALL 将该目录解析为**研究目录**：此后 init/run/log、git 操作、迭代钩子与 dashboard 全部作用于该目录（config 文件本身留在项目目录）。

#### Scenario: 首次初始化

- **WHEN** agent 调用 `init_experiment` 并给出 name/metric_name/direction
- **THEN** `.auto/log.jsonl` 出现一条 config 记录，包含 name、metricName、direction 与递增的 segment 号

#### Scenario: 更换优化目标

- **WHEN** agent 在已有结果后再次调用 `init_experiment`
- **THEN** segment 递增，后续 baseline 与 best 只在该新 segment 内计算

#### Scenario: workingDir 重定向

- **WHEN** 项目 `.auto/config.json` 含 `workingDir: "work/"` 且该目录存在
- **THEN** 账本写于 `work/.auto/log.jsonl`，benchmark 命令与 git 操作在 `work/` 下执行

## ADDED Requirements

### Requirement: finalize 将保留实验整理为独立分支

`/autoresearch:finalize` 命令 SHALL 引导 agent 把账本中的 kept 实验按文件依赖分组，并通过 `scripts/finalize.sh` 从基线为每组创建独立分支（`autoresearch/<goal>/NN-<slug>`），每组包含其 kept commit 的文件改动；脚本 SHALL 验证各分支文件并集与原分支一致（剔除会话文件），失败时回滚且不产生残留分支。

#### Scenario: 分组整理

- **WHEN** 账本含多个 kept commit 且改动文件不重叠
- **THEN** 生成多个独立分支，每分支含对应实验的文件改动，并集验证通过

#### Scenario: 失败回滚

- **WHEN** 分组验证失败（如文件重叠未合并）
- **THEN** 脚本回滚（删除已建分支、恢复原分支），原分支状态不变
