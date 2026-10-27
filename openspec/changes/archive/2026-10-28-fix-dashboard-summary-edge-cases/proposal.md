## Why

真实生产路径回归测试已复现两个低严重度展示缺陷：负数 baseline 使 overall 改善颜色反转；时钟回拨时页脚选取最大时间戳而非最后 run。两者触发概率较低，仅影响报告展示，但修复成本极低，避免持续误导，值得修复。

## What Changes

- overall 百分比以 baseline 绝对值为分母，保留数值变化符号与 direction 语义。
- 页脚按账本顺序选最后 run 的时间戳。
- 固化负数 lower/higher 与时钟回拨场景为回归测试。

## Capabilities

### Modified Capabilities

- `autoresearch/dashboard`: 明确负数 baseline 和乱序时间戳语义。

## Impact

仅 dashboard 展示与历史投影；不改变实验循环。无需重构或新增 ADR（遵循 ADR-1/2/4/5/6 的现有边界）。修复前两条真实函数测试均失败；修复后验证同场景通过。
