## ADDED Requirements

### Requirement: 段起步构思步与假设分层（反浅层认知引导）

循环规程（`SKILL.md` 与 `references/loop-protocol.md`）SHALL 载明一个段起步构思步：`init_experiment` 开启新 segment 后、对目标代码做**第一次改动之前**，agent SHALL 先产出候选假设清单写入 `.auto/ideas.md`（鼓励先做一轮外部调研——项目文档、相关代码库、web 检索——再读目标代码，以降低基线锚定），并为每个假设标注 tier 前缀：`[struct]`（结构/范式级改动）、`[tune]`（超参/调度/训练技巧）、`[ensemble]`（集成/种子类）。构思步 SHALL 附校准问题（adapted from AGENT4SCI research skill）：「这个清单里有没有把调参/集成伪装成结构改动？」「哪些方向是只在对基线做安全迭代？」。tier 前缀为 advisory 约定：MCP 工具对 `asi.hypothesis` 前缀不做任何校验，账本照实透传；未标注前缀的假设合法（向后兼容旧账本），仅使浅层连击提醒（见下一条 requirement）对其失去可见性。

#### Scenario: 新 segment 先构思再读代码

- **WHEN agent 调用 `init_experiment` 开启新 segment**
- **THEN** 循环规程要求在首次 `run_experiment` 之前先写带 tier 前缀的假设清单进 `ideas.md`，规程文本包含校准问题

#### Scenario: 前缀约定透传不校验

- **WHEN** agent 以 `asi: {hypothesis: "[tune] raise lr to 3e-4"}` 记录结果
- **THEN** 写入正常完成（无校验），账本 run 行的 `asi.hypothesis` 原样含前缀

#### Scenario: 未标注假设合法

- **WHEN** `asi.hypothesis` 不带任何 tier 前缀
- **THEN** `log_experiment` 正常接受，不产生警告或错误

### Requirement: 浅层连击提醒（idea-rotator 增强）

`idea-rotator` 示例钩子（`hooks/examples/before/idea-rotator.sh`）SHALL 在轮转建议之外增加浅层连击检查：读取账本（`.auto/log.jsonl`）最近至多 6 条 run 行的 `asi.hypothesis` tier 前缀，当**已标注**的假设 ≥3 条且全部为 `[tune]` 或 `[ensemble]`（无任何 `[struct]`）时，在 stdout 注入一条提醒（近期假设全是浅层改动、建议回到构思清单补一个结构方向）；stdout 保持 ≤8KB、脚本 fail-open、不依赖 jq。未标注前缀的假设不参与判定；账本缺失、run 行不足或已标注不足 3 条时 SHALL 静默。该提醒为 advisory（`before_steer`），不阻断循环。

#### Scenario: 全浅连击注入提醒

- **WHEN** 账本最近 6 条 run 的已标注假设 ≥3 条且全为 `[tune]`/`[ensemble]`
- **THEN** `before_steer` 含浅层连击提醒文案

#### Scenario: 存在结构假设不提醒

- **WHEN** 窗口内已标注假设含至少一条 `[struct]`
- **THEN** 不注入浅层提醒（轮转建议照常）

#### Scenario: 标注不足静默

- **WHEN** 账本无 run 行、窗口内已标注假设 <3 条，或账本文件不存在
- **THEN** 钩子静默（不注入浅层提醒，也不报错）

## MODIFIED Requirements

### Requirement: 钩子教学与示例资产

插件 SHALL 提供钩子教学 skill（`autoresearch-hooks`）与开箱即用的示例脚本（`.auto/hooks/` 场景覆盖：防重复失败、换思路、假设反思、学习日志、完成通知、最优实验打标、时段自检），示例 SHALL 遵循迭代钩子 stdin 契约（before：`{event, cwd, next_run, last_run, session}`，`last_run` 含 `asi`；after：`{event, cwd, run_entry, session}`，`run_entry` 含 `asi`），SHALL 不依赖 jq（用 node 解析 stdin），可直接复制到 `.auto/hooks/` 使用。教学 skill SHALL 说明：钩子失败不阻断循环（fail-open）但会以 `*_steer` 返回 `[<stage> hook exited N]` / `[<stage> hook timed out after 30s]` 形式的错误提示，且每次触发会向账本追加 `{"type":"hook",…}` 观测条目。

时段自检示例（`hooks/examples/before/self-check.sh`）SHALL 提供墙钟维度的自检：以 `session.started_at_epoch` 为段起点、以本地状态文件（`.auto/selfcheck.state`）记录上次自检时刻，距上次自检超过间隔（默认 3600 秒）时注入一份自检问题清单（当前方向是结构性的还是又在浅层微调？失败是否做了根因分析？账本里有没有已暴露但未吸收的洞见？）；状态文件缺失视为从未自检；`started_at_epoch` 缺失（旧账本）或读取失败时 SHALL 静默。该示例仅在无人值守长跑等长会话场景有实际意义。

#### Scenario: 示例可直接使用

- **WHEN** 用户把示例脚本复制到 `.auto/hooks/before.sh` / `after.sh` 并 `chmod +x`
- **THEN** 循环中按契约触发（before 在 run 前、after 在 log 后），stdout 转 `*_steer`，payload 含 `asi`，脚本不因缺 jq 报错

#### Scenario: 教学 skill 指导编写

- **WHEN** agent 被要求"给这个循环加一个钩子"
- **THEN** `autoresearch-hooks` skill 提供契约、场景选型与 mock 测试步骤

#### Scenario: 时段自检按间隔触发

- **WHEN** 距 `.auto/selfcheck.state` 记录的上次自检超过 3600 秒（或状态文件不存在）
- **THEN** `before_steer` 注入自检问题清单，并刷新状态文件

#### Scenario: 时段自检间隔内静默

- **WHEN** 距上次自检不足间隔，或 stdin 的 `session.started_at_epoch` 缺失
- **THEN** 钩子静默退出（不注入、不写状态文件）
