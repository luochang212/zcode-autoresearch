## Purpose

定义 zcode autoresearch 插件的实验循环行为契约：init/run/log 三件套工具的输入输出、账本格式与 segment、度量解析与判定、git 提交/回滚语义，以及迭代上限。

## Requirements

### Requirement: init_experiment 建立实验会话

`init_experiment` 工具 SHALL 接受会话名、主度量名、可选度量单位与方向（lower/higher，默认 lower），并在 `.auto/log.jsonl` 追加一条 config 记录；重复调用时 SHALL 递增 segment，使新目标的数据不污染旧 baseline。当 `.auto/config.json` 含 `workingDir` 时，工具 SHALL 将该目录解析为**研究目录**：此后 init/run/log、git 操作、迭代钩子与 dashboard 全部作用于该目录（config 文件本身留在项目目录）。工具 SHALL 在 config 记录中包含**冻结文件哈希**（`measure.sh` 与 `checks.sh` 存在时的 sha256）；文件不存在时为 null（"首见即基准"——首次运行时记录）。研究目录不是 git 仓库时，工具 SHALL 拒绝初始化并返回明确错误（实验循环的 keep/discard 依赖 git 提交与回滚语义，半残状态比直接拒绝更误导）。

#### Scenario: 首次初始化

- **WHEN** agent 调用 `init_experiment` 并给出 name/metric_name/direction
- **THEN** `.auto/log.jsonl` 出现一条 config 记录，包含 name、metricName、direction、segment 与冻结文件哈希

#### Scenario: 更换优化目标

- **WHEN** agent 在已有结果后再次调用 `init_experiment`
- **THEN** segment 递增，后续 baseline 与 best 只在该新 segment 内计算

#### Scenario: workingDir 重定向

- **WHEN** 项目 `.auto/config.json` 含 `workingDir: "work/"` 且该目录存在
- **THEN** 账本写于 `work/.auto/log.jsonl`，benchmark 命令与 git 操作在 `work/` 下执行

#### Scenario: 非 git 目录拒绝初始化

- **WHEN** 研究目录不是 git 仓库（无 `.git`，`git rev-parse --git-dir` 失败）
- **THEN** `init_experiment` 返回 `ok: false` 与明确错误（提示先 `git init`），不追加 config 记录

### Requirement: run_experiment 运行基准并解析度量

`run_experiment` 工具 SHALL 接受任意 shell 命令，记录 wall-clock 时长，解析输出中形如 `METRIC name=value` 的行，并把给 LLM 的回传截断为紧凑摘要（约 10 行/4KB），同时提供完整输出的日志文件路径。工具 SHALL 支持 `repeat` 参数（正整数，默认 1）；repeat>1 时返回的 `metrics` 字典 SHALL 为各次运行按度量名的**中位数聚合**，与 `median_metric` 同源一致（主度量不特殊化）。输出超过阈值（约 2MB）溢出到日志文件时，工具 SHALL 仍解析 METRIC 行——增量扫描全部输出、与 METRIC 行在输出中的位置（开头/结尾）无关——`metric`/`metrics` 正常返回；`output_tail` SHALL 取真实输出的尾部；溢出后的内存占用 SHALL 有界（不得随输出总量线性增长）。工具 SHALL 在基准执行前执行 `.auto/hooks/before.sh`（若存在且可执行），stdin 为单行 JSON：`{event:"before", cwd, next_run, last_run, session}`，其中 `last_run` SHALL 透传上一条 run 的 `{run, status, metric, description, asi}`（无上轮或无 asi 时为 null）；钩子失败（非零退出/超时/启动失败）SHALL 不阻断基准执行，但 SHALL 以 `before_steer` 返回错误提示（形如 `[before hook exited N] <stderr 摘要>` 或 `[before hook timed out after 30s]`）；每次触发 SHALL 向 `.auto/log.jsonl` 追加一条 `{type:"hook", stage:"before", exit_code, duration_ms, stdout_bytes, timed_out}` 观测条目。工具 SHALL 在开始时检查上一轮状态（crash 未回滚禁续跑），并**比对冻结文件哈希**：当前 `measure.sh`/`checks.sh` 的 sha256 与会话记录值不一致时，返回 `benchmark_drift: true` 警告（不阻断执行）："基准自会话开始后已变更（modified/deleted），前后 metric 不可比，建议 init_experiment 开新 segment 或确认变更"——文案 SHALL 区分文件被修改与被删除；首见（记录为 null 但文件已存在）时 SHALL 把当前哈希合并写回会话配置作为基准，不产生警告；冻结文件被删除（记录非 null、当前文件不存在）时 SHALL 同样返回 `benchmark_drift: true` 警告。超时终止 SHALL 先向基准进程组发送 SIGTERM，宽限期（约 5s）内未退出时 SHALL 升级为 SIGKILL（进程组），保证工具调用必然返回、不泄漏进程。

#### Scenario: 漂移警告

- **WHEN** 会话开始后 `measure.sh` 被修改（hash 变化）
- **THEN** run_experiment 返回 `benchmark_drift: true` 与警告信息，基准仍执行

#### Scenario: 无漂移静默

- **WHEN** 冻结文件未被修改
- **THEN** 返回不含 `benchmark_drift`（或为 false）

#### Scenario: 首见记录

- **WHEN** init 时 `measure.sh` 不存在（hash 为 null），首次 run 时已存在
- **THEN** 记录当前哈希作为会话基准，不产生漂移警告

#### Scenario: 首见之后修改报漂移

- **WHEN** init 时 `measure.sh` 不存在，会话中途创建（首见已记录），之后又被修改
- **THEN** run_experiment 返回 `benchmark_drift: true` 与警告信息

#### Scenario: 冻结文件删除报漂移

- **WHEN** init 时已记录 `measure.sh` 哈希，会话中途该文件被删除
- **THEN** run_experiment 返回 `benchmark_drift: true` 与警告信息，警告明示文件被删除（deleted）

#### Scenario: 度量解析

- **WHEN** benchmark 输出包含 `METRIC time_ms=42` 且主度量名为 time_ms
- **THEN** 工具返回中包含该度量值及 `Use these values directly in log_experiment` 的机器可读提示

#### Scenario: 重复运行取中位数

- **WHEN** agent 以 `repeat: 3` 调用且三次输出 `METRIC time_ms` 为 42/44/41、`METRIC rss_mb` 为 100/104/102
- **THEN** 工具返回 `runs` 数组含三次原始值、`median_metric: 42`（中位数）、`metrics` 字典为按名中位数聚合（time_ms=42、rss_mb=102），checks 只执行一次

#### Scenario: 溢出后度量仍可解析

- **WHEN** benchmark 输出超过溢出阈值（约 2MB）且 `METRIC` 行位于输出末尾
- **THEN** 工具返回 `log_file`（溢出文件路径）、`metric` 为 METRIC 行的值（不因溢出丢失）、`output_tail` 为真实输出的尾部摘要

#### Scenario: METRIC 在输出开头同样解析

- **WHEN** benchmark 先输出 `METRIC` 行、随后输出超过溢出阈值的噪声
- **THEN** `metric` 仍为 METRIC 行的值，`log_file` 正常提供

#### Scenario: before 钩子执行

- **WHEN** `.auto/hooks/before.sh` 存在且可执行，且其 stdout 为一段建议文本
- **THEN** 钩子在基准前被执行，返回中 `before_steer` 为该文本；钩子不存在时返回为空且基准仍执行

#### Scenario: before 钩子透传 asi

- **WHEN** 账本上一条 run 含 `asi: {hypothesis: "…"}`，before.sh 打印 `last_run.asi.hypothesis`
- **THEN** 钩子 stdout 包含该 hypothesis 文本（payload 未丢弃 asi）

#### Scenario: 钩子失败可见且不阻断

- **WHEN** before.sh 以退出码 3 失败并输出 stderr
- **THEN** 返回中 `before_steer` 以 `[before hook exited 3]` 开头并附 stderr 摘要，基准仍执行且 metric 正常解析

#### Scenario: 钩子观测条目

- **WHEN** before.sh 被触发（无论成败）
- **THEN** `.auto/log.jsonl` 追加一条 `{type:"hook", stage:"before", …}` 条目，且后续 rebuildState/校验不受影响

#### Scenario: 命令超时

- **WHEN** benchmark 超过配置的超时秒数（默认 600）
- **THEN** 进程组先收到 SIGTERM；宽限期内未退出的 SHALL 被升级 SIGKILL，返回结果标记为超时失败，工具调用必然返回且不残留基准进程

#### Scenario: crash 未回滚禁续跑

- **WHEN** 上一条 run 为 crash 且 `git status` 显示工作区有改动（除 `.auto/`）
- **THEN** 工具拒绝开始，提示先回滚或清空会话

### Requirement: log_experiment 记录结果并执行 git 语义

`log_experiment` 工具 SHALL 接受主度量值、status（keep/discard/crash/checks_failed/noop）、描述与可选次级度量；keep 时自动 stage 当前全部改动（**排除 `.auto/` 会话目录**）并 commit（message 带 `experiment:` 前缀与结构化结果），非 keep（discard/crash/checks_failed）时丢弃工作区改动但豁免 `.auto/` 目录，noop 不回滚；记录追加到 `.auto/log.jsonl` 并回填真实短 hash。status=crash 时 metric SHALL 记为 null（不得写入占位 0）：crash 行不参与 baseline/best/置信度/平台期计算，避免污染后续 delta 显示。工具 SHALL 在记录后执行 `.auto/hooks/after.sh`（若存在且可执行），stdin 为单行 JSON：`{event:"after", cwd, run_entry, session}`，其中 `run_entry` SHALL 透传本条 run 的 `{run, status, metric, description, commit, asi}`（无 asi 时为 null）；钩子失败 SHALL 不阻断记录，但 SHALL 以 `after_steer` 返回错误提示；每次触发 SHALL 向 `.auto/log.jsonl` 追加 `{type:"hook", stage:"after", …}` 观测条目。工具 SHALL 在写入前校验账本不变量与**次级度量约束**，违规 SHALL 拒绝写入并返回错误：

- **次级度量约束**：当调用含 `constraints: [{ name, maxPct }]` 且 status=keep 时，工具 SHALL 校验该次级度量（来自本次 run 的 metrics 字典）不超过"当前 segment 首条 run 该度量值"的 maxPct%；超界 SHALL 拒收 keep（返回错误提示放宽约束或改判）；无 constraints 或非 keep 时不校验。

#### Scenario: keep 自动提交

- **WHEN** agent 以 status=keep 调用且 metric 相对当前保留值改进
- **THEN** 产生 `experiment:` 前缀 commit，账本回填真实短 hash

#### Scenario: keep 提交不含会话文件

- **WHEN** agent 以 status=keep 调用且目标项目未 gitignore `.auto/`
- **THEN** 产生的 commit 不包含 `.auto/` 下任何文件（账本、配置、度量脚本等）

#### Scenario: 仅会话文件改动时 keep 被拒

- **WHEN** agent 以 status=keep 调用但除 `.auto/` 外没有任何工作区改动
- **THEN** 工具拒绝并返回 "keep with no changes to commit" 审计错误

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

#### Scenario: crash 行不污染 baseline

- **WHEN** segment 首条记录为 crash（metric 记 null），随后一次 keep 的 metric 为 42
- **THEN** rebuildState 的 baseline 为 42（非 0），该 keep 的 delta 显示为改善而非反转；账本中 crash 行 `metric` 为 null

#### Scenario: after 钩子执行

- **WHEN** `.auto/hooks/after.sh` 存在且可执行，本次记录含 `asi: {hypothesis: "…"}`，after.sh 打印 `run_entry.asi.hypothesis`
- **THEN** 钩子在记录后被执行，返回中 `after_steer` 为该文本（payload 未丢弃 asi）；`.auto/log.jsonl` 追加 `{type:"hook", stage:"after", …}` 条目

#### Scenario: after 钩子失败可见且不阻断

- **WHEN** after.sh 以非零退出码失败
- **THEN** 记录正常完成，返回中 `after_steer` 以 `[after hook exited N]` 开头

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

`/autoresearch:finalize` 命令 SHALL 引导 agent 把账本中的 kept 实验按文件依赖分组，并通过 `scripts/finalize.sh` 从基线为每组创建独立分支（`autoresearch/<goal>/NN-<slug>`）。脚本 SHALL 以**增量口径**计算各组文件集：第 i 组的文件集为 `git diff --name-status <上一组 last_commit 或 merge-base> <本组 last_commit>`（剔除会话文件），查重校验与分支构造 SHALL 复用同一增量集合，故第 N 个分支只含本组改动。组内 status=D 的文件 SHALL 以删除语义落入分支（`git rm`），不得因 pathspec 错误失败。脚本 SHALL 验证各分支文件并集与原分支一致（剔除会话文件）；构造阶段的任何失败（含分支名冲突、verify 失败）SHALL 触发完整回滚——先恢复原分支再删除本次已建分支——不产生残留分支，修复输入后可立即重跑。`groups.json` 路径 SHALL 支持裸相对路径（相对调用者 cwd），解析经参数传递而非字符串插值，不受路径中引号影响；文件名含空格 SHALL 被正确处理（NUL 分隔枚举 + 整行比对）。

#### Scenario: 分组整理

- **WHEN** 账本含多个 kept commit 且改动文件不重叠
- **THEN** 生成多个独立分支，第 N 个分支只含第 N 组增量改动（不混入前序组文件），并集验证通过

#### Scenario: 组内含删除文件

- **WHEN** 某组的增量 diff 含 status=D 的文件
- **THEN** 该分支正确反映删除（文件不存在于分支树中），脚本成功完成

#### Scenario: 失败回滚

- **WHEN** 分组验证失败（如文件重叠未合并）或构造中途失败（如目标分支名已存在）
- **THEN** 脚本回滚（先恢复原分支、再删除本次已建分支，含正在构造中的分支），原分支状态不变，无残留分支，修复输入后重跑可成功

#### Scenario: 裸相对路径 groups.json

- **WHEN** 调用者以相对项目根的路径（如 `groups.json`）传入第二参数
- **THEN** 脚本正常解析并执行，不报模块找不到

#### Scenario: 含空格文件名

- **WHEN** 组内改动文件路径含空格
- **THEN** 文件被作为整体处理，分支内容与 overlap 校验均正确

### Requirement: 钩子教学与示例资产

插件 SHALL 提供钩子教学 skill（`autoresearch-hooks`）与开箱即用的示例脚本（`.auto/hooks/` 场景覆盖：防重复失败、换思路、假设反思、学习日志、完成通知、最优实验打标），示例 SHALL 遵循迭代钩子 stdin 契约（before：`{event, cwd, next_run, last_run, session}`，`last_run` 含 `asi`；after：`{event, cwd, run_entry, session}`，`run_entry` 含 `asi`），SHALL 不依赖 jq（用 node 解析 stdin），可直接复制到 `.auto/hooks/` 使用。教学 skill SHALL 说明：钩子失败不阻断循环（fail-open）但会以 `*_steer` 返回 `[<stage> hook exited N]` / `[<stage> hook timed out after 30s]` 形式的错误提示，且每次触发会向账本追加 `{"type":"hook",…}` 观测条目。

#### Scenario: 示例可直接使用

- **WHEN** 用户把示例脚本复制到 `.auto/hooks/before.sh` / `after.sh` 并 `chmod +x`
- **THEN** 循环中按契约触发（before 在 run 前、after 在 log 后），stdout 转 `*_steer`，payload 含 `asi`，脚本不因缺 jq 报错

#### Scenario: 教学 skill 指导编写

- **WHEN** agent 被要求"给这个循环加一个钩子"
- **THEN** `autoresearch-hooks` skill 提供契约、场景选型与 mock 测试步骤
