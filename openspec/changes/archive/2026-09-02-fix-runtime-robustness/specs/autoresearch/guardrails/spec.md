## MODIFIED Requirements

### Requirement: Stop hook 驱动循环续跑

当实验循环进行中且账本显示未达停止条件（迭代上限未到、最近结果非全失败）时，Stop hook SHALL 返回 `decision:block` 与进度摘要 reason，让主模型继续；连续续跑由 zcode 平台限制（3 次窗口）。连续失败判定 SHALL 使用 `.auto/config.json` 的 `consecutiveFailures`（默认 3）作为阈值；"连续失败"指**尾部连续的 discard/crash/checks_failed**——noop 既不计入失败也中断连续链（keep 同样中断），且 noop 之后尾部的连续失败数从零重新起算。`log_experiment` 返回的 `consecutiveFailures` 计数 SHALL 采用同一语义。

#### Scenario: 循环未结束

- **WHEN** 模型准备结束但当前 segment 未达迭代上限且未进入平台期
- **THEN** Stop hook 返回 block + reason（进度与下一步），模型继续一轮

#### Scenario: 平台期收敛

- **WHEN** 当前 segment 最近 `window` 轮无净改善（plateau 检测为 true）
- **THEN** Stop hook 放行，reason 中说明循环已进入平台期，建议收尾或开启新 segment

#### Scenario: 连续失败达到阈值

- **WHEN** 连续 discard/crash/checks_failed 数量达到 `consecutiveFailures`（默认 3，可配）
- **THEN** Stop hook 放行，模型正常收尾

#### Scenario: noop 不计入连败

- **WHEN** 最近记录为 [discard, crash, noop] 或 [discard, crash, noop, discard]
- **THEN** 连续失败计数分别为 0 与 1（noop 中断连败链且自身不计数），Stop hook 均不放行

#### Scenario: 循环已结束

- **WHEN** 迭代上限已达成
- **THEN** Stop hook 放行，模型正常收尾
