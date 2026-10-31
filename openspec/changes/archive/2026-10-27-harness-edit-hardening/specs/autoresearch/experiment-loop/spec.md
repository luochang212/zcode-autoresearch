## MODIFIED Requirements

### Requirement: harness 编辑步与经验库资产

插件技能 SHALL 定义 **harness 编辑步**（advisory，二阶循环）：在 plateau、doom_loop、连续失败达到阈值、固定间隔（约 8 轮）或 segment 收尾时触发；触发后 SHALL 先写**编辑行**再动手，每行 `{component, change, observed, verdict}`，verdict SHALL 取 helped / hurt / no observed effect / confounded 之一，一次改动涉及多个组件且无执行可隔离归因时 SHALL 优先标 confounded（一行发明归因毒害整个经验库）。编辑 SHALL 遵循 KEEP_BASE 纪律：证据不支持的编辑 SHALL 不做（无编辑是合法结局）；可编辑面 SHALL 限于 `prompt.md` 表层区块（不得改写对 goal.md 与 scope.md 的逐字引用）、`ideas.md`、`.auto/hooks/` 配置与 repeat/segment 决策参数；`.auto/goal.md`、`.auto/scope.md` 与 measure.sh/checks.sh SHALL 不可编辑（范围边界的扩大或收窄不经编辑步：须由用户手改 scope.md 或 `init_experiment` 开新 segment）。表层目标的实质更换（更换度量代理或优化对象）SHALL 同样不经编辑步完成，而 SHALL 经 `init_experiment` 开新 segment。

插件 SHALL 定义 `.auto/experience.md` 为跨 segment 经验库：每个 segment 至多追加一条 lesson（`{cue, lesson, evidence, confidence}`），`cue` SHALL 描述模式适用的情境形状（非本任务事实），`lesson` SHALL 是可执行可检验的操作且指名组件，`evidence` SHALL 引用账本 run 号或编辑行；无具体可复用的行为对比时 SHALL 写 `NO_ENTRY` 而非编造。写作指引 SHALL 区分三类内容：workspace fact（本次验证的事实，标注仅此处成立）、procedure（可迁移操作）、too generic（禁止入库）。setup-guide SHALL 定义 `.auto/goal.md`（用户深层目标逐字原文）、`.auto/scope.md`（用户同意的 Files-in-scope 与 Off-Limits 原文）及 `prompt.md` 目标段、范围段对二者的逐字引用关系。`experience.md` SHALL 跨 segment 存活（clear 保留）；`/autoresearch:finalize` SHALL 在清理会话目录前与用户人审 `experience.md` 并把幸存 lesson 并入项目 AGENTS.md，删除 `.auto/` 的清理 SHALL 在该步骤完成后执行；跨项目复用旧 lesson 时 SHALL 按假设对待、重新验证。

#### Scenario: plateau 触发编辑行先行

- **WHEN** `plateau: true` 触发 harness 编辑步
- **THEN** 规程要求先产出编辑行（每行含 verdict），随后仅对可编辑面做小步修订；证据不指向任何编辑时不修改（KEEP_BASE）

#### Scenario: 多组件同改标 confounded

- **WHEN** 一次编辑同时修订 prompt.md 表层区块与 ideas.md，无执行可隔离归因
- **THEN** 该编辑行 verdict 为 confounded（归因不明是有用记录，编造归因禁止）

#### Scenario: 根不变表可变

- **WHEN** 编辑步修订 prompt.md
- **THEN** 目标段与 `.auto/goal.md` 逐字一致、范围段与 `.auto/scope.md` 逐字一致；二者的写请求被 PreToolUse hook deny

#### Scenario: 编辑步不得扩大范围

- **WHEN** plateau 下的编辑步认为某禁改目录值得纳入
- **THEN** 规程要求不修改 scope 引用，向用户提出扩围请求或建议新 segment；scope.md 的写请求被 hook deny

#### Scenario: lesson 带 evidence 或 NO_ENTRY

- **WHEN** segment 收尾且存在可迁移模式
- **THEN** `experience.md` 追加的 lesson 含 `{cue, lesson, evidence, confidence}`，evidence 引用具体 run 号；无行为对比时写 `NO_ENTRY`

#### Scenario: 三分写法约束入库内容

- **WHEN** 编辑步重建 ideas.md 或追加 lesson
- **THEN** 条目区分 workspace fact 与 procedure，不出现 too generic 条目（如"更彻底地优化"）

#### Scenario: finalize 先保真再清理

- **WHEN** 用户执行 `/autoresearch:finalize`
- **THEN** 命令流程在清理（`rm -r .auto`）之前包含 experience.md 人审并入 AGENTS.md 的步骤；未完成人审时 SHALL 不执行目录删除
