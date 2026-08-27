## MODIFIED Requirements

### Requirement: Stop hook 驱动循环续跑

当实验循环进行中且账本显示未达停止条件（迭代上限未到、最近结果非全失败）时，Stop hook SHALL 返回 `decision:block` 与进度摘要 reason，让主模型继续；连续续跑由 zcode 平台限制（3 次窗口）。

#### Scenario: 循环未结束
- **WHEN** 模型准备结束但当前 segment 未达迭代上限且未进入平台期
- **THEN** Stop hook 返回 block + reason（进度与下一步），模型继续一轮

#### Scenario: 平台期收敛
- **WHEN** 当前 segment 最近 `window` 轮无净改善（plateau 检测为 true）
- **THEN** Stop hook 放行，reason 中说明循环已进入平台期，建议收尾或开启新 segment

#### Scenario: 循环已结束
- **WHEN** 迭代上限已达成或账本显示连续失败
- **THEN** Stop hook 放行，模型正常收尾
