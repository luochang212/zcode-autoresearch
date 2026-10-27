## Why

当前报告的大数字权重接近、描述列较窄、NO-OP 混入 reverted，结果与证据的层次不够清楚。参考 ADR Kit 的细边线和留白、Genesis 的文字层级，将页面优化为可快速阅读的实验报告。

## What Changes

- 强化 overall、明确指标单位与方向。
- 趋势区增加标题、图例，点链接到账本证据。
- 账本增加状态筛选，描述优先，移动端重排。
- NO-OP 独立统计，保留简洁的置信度数值。

## Capabilities

### Modified Capabilities

- `autoresearch/dashboard`: 报告层级、证据导航与准确计数。

## Impact

仅修改自包含 dashboard 渲染与测试，零依赖，静态与 live 共用；无 JS 仍显示全部记录。遵循 ADR-1/2/4/5/6，循环控制不变。
