## ADDED Requirements

### Requirement: dashboard 汇总边界语义

dashboard SHALL 以 baseline 绝对值为 overall 百分比的分母，按 direction 判断改善；页脚 SHALL 按账本顺序使用最后一条 run 的时间戳，而非时间戳最大值。

#### Scenario: 负数基线改善

- **WHEN** lower 指标从 -10 改善到 -20，或 higher 指标从 -10 改善到 -5
- **THEN** overall 分别显示 −100% 与 +50%，均使用改善颜色

#### Scenario: 时钟回拨

- **WHEN** 最后一条 run 的时间戳早于前一条
- **THEN** 页脚仍使用最后一条 run 的日期
