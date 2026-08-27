## MODIFIED Requirements

### Requirement: 实验记忆注入

UserPromptSubmit/SessionStart hook SHALL 把 `.auto/log.jsonl` 的最近记录摘要注入模型上下文（compaction 后记忆恢复），注入内容 SHALL 保持精简（尾 N 行单行化）。当最近记录含 `asi` 字段时，注入 SHALL 提炼 `asi.hypothesis`、`asi.next_action_hint`、`asi.rollback` 三个字段并附在对应记录之后。

#### Scenario: 会话继续
- **WHEN** 会话内存在 `.auto/` 且用户提交新 prompt
- **THEN** 模型上下文包含账本最近几条记录摘要与下一步提示

#### Scenario: ASI 三字段提炼
- **WHEN** 最近记录含 `asi: {hypothesis, next_action_hint, rollback}`
- **THEN** 注入文本中该记录显示 `hyp:` / `next:` / `rollback:` 提炼行

### Requirement: Stop hook 驱动循环续跑

当实验循环进行中且账本显示未达停止条件（迭代上限未到、最近结果非全失败）时，Stop hook SHALL 返回 `decision:block` 与进度摘要 reason，让主模型继续；连续续跑由 zcode 平台限制（3 次窗口）。连续失败判定 SHALL 使用 `.auto/config.json` 的 `consecutiveFailures`（默认 3）作为阈值。

#### Scenario: 循环未结束
- **WHEN** 模型准备结束但当前 segment 未达迭代上限且未进入平台期
- **THEN** Stop hook 返回 block + reason（进度与下一步），模型继续一轮

#### Scenario: 平台期收敛
- **WHEN** 当前 segment 最近 `window` 轮无净改善（plateau 检测为 true）
- **THEN** Stop hook 放行，reason 中说明循环已进入平台期，建议收尾或开启新 segment

#### Scenario: 连续失败达到阈值
- **WHEN** 连续 discard/crash/checks_failed 数量达到 `consecutiveFailures`（默认 3，可配）
- **THEN** Stop hook 放行，模型正常收尾

#### Scenario: 循环已结束
- **WHEN** 迭代上限已达成
- **THEN** Stop hook 放行，模型正常收尾
