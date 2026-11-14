# Design: add-deterministic-plateau-counting

## Context

幅度阈值（相对窗口起点 1%）为噪声指标设计：噪声下小改善无法与噪声区分，
需要幅度门。确定性基准逐位可复现，任何度量变化都是真实信号——步长 0.1%
的真实 keep 被默认 1% 阈值判成 plateau（ml-auto 实测：窗口内含 keep 的
序列被判 plateau，从 run 5 起常亮，advisory 信号被迫靠人判读覆盖）。

## 决策

- **语义二分而非阈值校准**：不尝试从 deterministic 推导「更小的幅度阈值」
  （指标尺度各异，固定小阈值对毫秒级指标同样失真）；改为按基准性质切换
  判据本体——确定性下停滞的本征定义是「连续 N 轮无一超过当前 best」，
  计数语义尺度无关、无需校准参数。非确定性路径逐字不动。
- **「有进展」的精确定义**：窗口内存在严格优于**窗口起点前** segment 全局
  best 的度量（keep 天然是唯一能超越现状的落账状态，但判据写成度量比较而
  非状态比较，keep 之外若出现更高度量同样算进展——语义只看数据）。窗口
  起点前 best 从窗口外历史 runs 与 baseline 算得，与返回的 `best` 同源。
- **窗口口径不变**：window（默认 5）、有效行过滤（crash 排除、noop 计入）、
  窗口不足不判定，全部沿用；只换「比较什么」。

## Trade-offs

- 噪声指标下 discard 偶发尖峰会被计数语义误判「有进展」——但计数语义
  只在 `deterministic: true` 时启用，噪声指标不受影响。
- `plateau_min_improvement` 在 deterministic 段不参与 plateau 判定（仍
  持久化，供提示文案与换段回退）——文案需避免误导：deterministic 段的
  plateau 提示语义是「连续无进展」，不加百分比阈值表述。
