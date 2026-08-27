## MODIFIED Requirements

### Requirement: 实验记忆注入

UserPromptSubmit/SessionStart hook SHALL 把 `.auto/log.jsonl` 的会话记忆注入模型上下文，注入内容 SHALL 包含：会话进度（segment/metric/direction/已跑数/上限/baseline/best）、**已尝试方向去重列表**（从各 run 的 description 与 asi.hypothesis 提炼方向标签并去重，提示避免重复尝试）、**best 轨迹**（baseline → 各关键 keep 的 metric 变化）、最近记录摘要（含 ASI 的 hyp/next/rollback 提炼）、以及 **doom-loop 提示**（最近记录呈连续重复或 A→B→A→B 震荡时，提示停止重复并换方向）。注入内容 SHALL 保持精简（聚合后单块文本）。SessionStart hook SHALL 在检测到活动会话（存在 `.auto/log.jsonl` 且 `.auto/config.json` 未设置 `autoresearchOff: true`）时注入续跑引导；设置了 `autoresearchOff` 时不注入续跑提示。

#### Scenario: 会话继续
- **WHEN** 会话内存在 `.auto/` 且用户提交新 prompt
- **THEN** 模型上下文包含聚合摘要（进度 + 已尝试方向去重 + best 轨迹 + 最近记录 + 下一步提示）

#### Scenario: ASI 三字段提炼
- **WHEN** 最近记录含 `asi: {hypothesis, next_action_hint, rollback}`
- **THEN** 注入文本中该记录显示 `hyp:` / `next:` / `rollback:` 提炼行

#### Scenario: 已尝试方向去重
- **WHEN** 账本含 4 条 run，description 分别为"试 sqrt 截断"、"试埃氏筛"、"试 sqrt 截断变体"、"试位运算"
- **THEN** 注入的"已尝试方向"去重后列出 sqrt 截断 / 埃氏筛 / 位运算（不重复列出变体）

#### Scenario: doom-loop 提示
- **WHEN** 最近 4 条 run 的假设呈 A→B→A→B 震荡或最近 3 条相同
- **THEN** 注入含"检测到重复/震荡，停止重复尝试，换结构性方向"提示

#### Scenario: 自动激活提示
- **WHEN** 会话启动且存在活动会话（log.jsonl 存在、config 无 autoresearchOff）
- **THEN** SessionStart 注入"存在 autoresearch 会话，可 /autoresearch:autoresearch 续跑"

#### Scenario: 显式关闭后不提示
- **WHEN** `.auto/config.json` 含 `autoresearchOff: true`
- **THEN** SessionStart 不注入续跑提示（会话仍可手动进入）
