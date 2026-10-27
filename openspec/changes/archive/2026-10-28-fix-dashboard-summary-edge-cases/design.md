## Context

overallPct 使用带符号 baseline 作分母；rebuildHistory 比较时间字符串大小。两者均是局部计算错误。

## Goals / Non-Goals

修正展示并保持零依赖，不变更循环控制或图表布局。

## Decisions

百分比分母使用 Math.abs(first)，正负仍表达数值升降，direction 决定改善颜色。lastRunAt 每遇 run 更新为该行时间戳，缺失则为 null。无需架构调整。

## Risks / Trade-offs

负数基线报告的百分比符号会纠正；零基线继续省略 overall。
