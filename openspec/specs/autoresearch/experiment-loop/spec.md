## Purpose

定义 zcode autoresearch 插件的实验循环行为契约：init/run/log 三件套工具的输入输出、账本格式与 segment、度量解析与判定、git 提交/回滚语义，以及迭代上限。

## Requirements

### Requirement: init_experiment 建立实验会话

`init_experiment` 工具 SHALL 接受会话名、主度量名、可选度量单位与方向（lower/higher，默认 lower），并在 `.auto/log.jsonl` 追加一条 config 记录；重复调用时 SHALL 递增 segment，使新目标的数据不污染旧 baseline。当 `.auto/config.json` 含 `workingDir` 时，工具 SHALL 将该目录解析为**研究目录**：此后 init/run/log、git 操作、迭代钩子与 dashboard 全部作用于该目录（config 文件本身留在项目目录）。工具 SHALL 在 config 记录中包含**冻结文件哈希**（`measure.sh` 与 `checks.sh` 存在时的 sha256）；文件不存在时为 null（"首见即基准"——首次运行时记录）。

#### Scenario: 首次初始化
- **WHEN** agent 调用 `init_experiment` 并给出 name/metric_name/direction
- **THEN** `.auto/log.jsonl` 出现一条 config 记录，包含 name、metricName、direction、segment 与冻结文件哈希

#### Scenario: 更换优化目标
- **WHEN** agent 在已有结果后再次调用 `init_experiment`
- **THEN** segment 递增，后续 baseline 与 best 只在该新 segment 内计算

#### Scenario: workingDir 重定向
- **WHEN** 项目 `.auto/config.json` 含 `workingDir: "work/"` 且该目录存在
- **THEN** 账本写于 `work/.auto/log.jsonl`，benchmark 命令与 git 操作在 `work/` 下执行
### Requirement: run_experiment 运行基准并解析度量

`run_experiment` 工具 SHALL 接受任意 shell 命令，记录 wall-clock 时长，解析输出中形如 `METRIC name=value` 的行，并把给 LLM 的回传截断为紧凑摘要（约 10 行/4KB），同时提供完整输出的日志文件路径。工具 SHALL 支持 `repeat` 参数（正整数，默认 1）。工具 SHALL 在基准执行前执行 `.auto/hooks/before.sh`（若存在且可执行）。工具 SHALL 在开始时检查上一轮状态（crash 未回滚禁续跑），并**比对冻结文件哈希**：当前 `measure.sh`/`checks.sh` 的 sha256 与会话记录值不一致时，返回 `benchmark_drift: true` 警告（不阻断执行）："基准自会话开始后已变更，前后 metric 不可比，建议 init_experiment 开新 segment 或确认变更"；首见（记录为 null）时记录当前哈希作为基准。

#### Scenario: 漂移警告
- **WHEN** 会话开始后 `measure.sh` 被修改（hash 变化）
- **THEN** run_experiment 返回 `benchmark_drift: true` 与警告信息，基准仍执行

#### Scenario: 无漂移静默
- **WHEN** 冻结文件未被修改
- **THEN** 返回不含 `benchmark_drift`（或为 false）

#### Scenario: 首见记录
- **WHEN** init 时 `measure.sh` 不存在（hash 为 null），首次 run 时已存在
- **THEN** 记录当前哈希作为会话基准，不产生漂移警告

#### Scenario: 度量解析
- **WHEN** benchmark 输出包含 `METRIC time_ms=42` 且主度量名为 time_ms
- **THEN** 工具返回中包含该度量值及 `Use these values directly in log_experiment` 的机器可读提示

#### Scenario: 重复运行取中位数
- **WHEN** agent 以 `repeat: 3` 调用且三次输出 `METRIC time_ms` 为 42/44/41
- **THEN** 工具返回 `metrics` 数组含三个值、`median_metric: 42`（中位数），checks 只执行一次

#### Scenario: before 钩子执行
- **WHEN** `.auto/hooks/before.sh` 存在且可执行，且其 stdout 为一段建议文本
- **THEN** 钩子在基准前被执行，返回中 `before_steer` 为该文本；钩子不存在或退出码非零时返回为空且基准仍执行

#### Scenario: 命令超时
- **WHEN** benchmark 超过配置的超时秒数（默认 600）
- **THEN** 进程组被终止，返回结果标记为超时失败

#### Scenario: crash 未回滚禁续跑
- **WHEN** 上一条 run 为 crash 且 `git status` 显示工作区有改动（除 `.auto/`）
- **THEN** 工具拒绝开始，提示先回滚或清空会话
### Requirement: log_experiment 记录结果并执行 git 语义

`log_experiment` 工具 SHALL 接受主度量值、status（keep/discard/crash/checks_failed/noop）、描述与可选次级度量；keep 时自动 `git add -A` + commit（message 带 `experiment:` 前缀与结构化结果），非 keep（discard/crash/checks_failed）时丢弃工作区改动但豁免 `.auto/` 目录，noop 不回滚；记录追加到 `.auto/log.jsonl` 并回填真实短 hash。工具 SHALL 在写入前校验账本不变量与**次级度量约束**，违规 SHALL 拒绝写入并返回错误：
- **次级度量约束**：当调用含 `constraints: [{ name, maxPct }]` 且 status=keep 时，工具 SHALL 校验该次级度量（来自本次 run 的 metrics 字典）不超过"当前 segment 首条 run 该度量值"的 maxPct%；超界 SHALL 拒收 keep（返回错误提示放宽约束或改判）；无 constraints 或非 keep 时不校验。

#### Scenario: keep 自动提交
- **WHEN** agent 以 status=keep 调用且 metric 相对当前保留值改进
- **THEN** 产生 `experiment:` 前缀 commit，账本回填真实短 hash

#### Scenario: keep 未改进被拒
- **WHEN** agent 以 status=keep 调用但 metric 未优于当前保留值
- **THEN** 工具拒绝写入并返回错误（提示改用 discard 或说明）

#### Scenario: discard 真改进无 failed guard 被拒
- **WHEN** agent 以 status=discard 调用且 metric 优于当前保留值、但上次 checks 未失败
- **THEN** 工具拒绝写入并返回错误（提示真改进不应丢弃，或注明 checks 失败）

#### Scenario: 次级度量超界禁 keep
- **WHEN** 调用含 `constraints: [{name: "memory_mb", maxPct: 105}]`，本次 run 的 memory_mb 为首条 run 的 110%
- **THEN** 工具拒绝 keep 并返回错误（提示放宽约束或改判）

#### Scenario: 约束内 keep 通过
- **WHEN** 调用含 `constraints: [{name: "memory_mb", maxPct: 105}]`，本次 run 的 memory_mb 为首条 run 的 100%
- **THEN** keep 正常执行，返回中 constraints 状态为 pass

#### Scenario: 无约束无校验
- **WHEN** 调用不含 constraints
- **THEN** 行为与现状一致，无次级度量校验

#### Scenario: discard 自动回滚且豁免会话目录
- **WHEN** agent 以 status=discard 调用且校验通过
- **THEN** 工作区改动被丢弃（checkout+clean），`.auto/` 内容完整保留，账本追加 discard 行

#### Scenario: noop 不回滚
- **WHEN** agent 以 status=noop 调用（未改动代码）
- **THEN** 工作区保持不变，账本追加 noop 行

#### Scenario: after 钩子执行
- **WHEN** `.auto/hooks/after.sh` 存在且可执行
- **THEN** 钩子在记录后被执行，返回中 `after_steer` 为其 stdout；钩子失败不阻断记录

#### Scenario: doom-loop 检测
- **WHEN** 最近 4 条 run 的假设为 A→B→A→B（如"试埃氏筛"、"试位运算"、"试埃氏筛变体"、"试位运算变体"）
- **THEN** 返回 `doom_loop: true`，`next_action_hint` 提示停止重复尝试

#### Scenario: 事件顺序违规
- **WHEN** 拟追加的 run 号与账本不连续或 segment 不匹配
- **THEN** 工具拒绝写入并返回错误

#### Scenario: checks 失败禁止 keep
- **WHEN** 上一次 run 的 checks 失败而 agent 试图以 keep 记录
- **THEN** 工具拒绝 keep 并返回错误提示
### Requirement: 实验循环受迭代上限约束

会话 SHALL 支持配置迭代上限（默认 20）；达到上限后 run 与 log 工具 SHALL 返回明确的停止提示。

#### Scenario: 达到迭代上限
- **WHEN** 当前 segment 的实验数达到 maxIterations
- **THEN** 后续 run_experiment 拒绝执行并提示已达上限
### Requirement: log_experiment 报告平台期与置信度

`log_experiment` 工具 SHALL 在返回中包含 `plateau` 标志：当前 segment 最近 `window`（默认 5）轮的有效度量中，相对窗口起点度量的最佳改善比例低于 `min_improvement`（默认 1%）时为 true（窗口不足时不判定）。`confidence`（MAD 校准）SHALL 作为返回的显著字段置于 delta 之后、next_action_hint 之前。

#### Scenario: 平台期检测
- **WHEN** 最近 5 轮 metric 为 4.1/4.2/4.0/4.3/4.2（相对首轮 4.1 的最佳改善约 2.4%）
- **THEN** `plateau: false`（改善超阈值）；若为 4.1/4.1/4.05/4.2/4.1（最佳改善 < 1%）则 `plateau: true`

#### Scenario: 返回字段顺序
- **WHEN** agent 以 keep 记录一次实验
- **THEN** 返回中 `confidence` 出现在 `delta` 之后、`next_action_hint` 之前
### Requirement: clear_experiments 清空当前会话

`clear_experiments` 工具 SHALL 删除 `.auto/log.jsonl` 并重置运行时状态（segment 归零、无活动配置）；保留 `.auto/` 下其余文件（measure.sh/checks.sh/prompt.md 等）。`/autoresearch:clear` 命令 SHALL 调用该工具并向用户确认。

#### Scenario: 清空会话
- **WHEN** agent 调用 `clear_experiments`
- **THEN** `.auto/log.jsonl` 被删除，随后 `rebuildState` 得到空状态；其余 `.auto/` 文件保留
### Requirement: finalize 将保留实验整理为独立分支

`/autoresearch:finalize` 命令 SHALL 引导 agent 把账本中的 kept 实验按文件依赖分组，并通过 `scripts/finalize.sh` 从基线为每组创建独立分支（`autoresearch/<goal>/NN-<slug>`），每组包含其 kept commit 的文件改动；脚本 SHALL 验证各分支文件并集与原分支一致（剔除会话文件），失败时回滚且不产生残留分支。

#### Scenario: 分组整理
- **WHEN** 账本含多个 kept commit 且改动文件不重叠
- **THEN** 生成多个独立分支，每分支含对应实验的文件改动，并集验证通过

#### Scenario: 失败回滚
- **WHEN** 分组验证失败（如文件重叠未合并）
- **THEN** 脚本回滚（删除已建分支、恢复原分支），原分支状态不变
### Requirement: 钩子教学与示例资产

插件 SHALL 提供钩子教学 skill（`autoresearch-hooks`）与开箱即用的示例脚本（`.auto/hooks/` 场景覆盖：防重复失败、换思路、假设反思、学习日志、完成通知、最优实验打标），示例 SHALL 遵循迭代钩子 stdin 契约（before：`event/cwd/next_run/last_run/session`；after：`event/cwd/run_entry/session`），SHALL 不依赖 jq（用 node 解析 stdin），可直接复制到 `.auto/hooks/` 使用。

#### Scenario: 示例可直接使用
- **WHEN** 用户把示例脚本复制到 `.auto/hooks/before.sh` / `after.sh` 并 `chmod +x`
- **THEN** 循环中按契约触发（before 在 run 前、after 在 log 后），stdout 转 `*_steer`，脚本不因缺 jq 报错

#### Scenario: 教学 skill 指导编写
- **WHEN** agent 被要求"给这个循环加一个钩子"
- **THEN** `autoresearch-hooks` skill 提供契约、场景选型与 mock 测试步骤
