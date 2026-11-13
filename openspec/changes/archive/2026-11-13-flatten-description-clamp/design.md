# Design: flatten-description-clamp

## Context

真实账本（ml-auto 实测）中 asi 字段不出现，描述字段即「该轮改动」；details+summary 的展开按钮与 `…` 预览副本与用户想要的「渐隐即暗示」交互冲突。

## 决策

- 单一钳制语言：`.clamp-line > .clamp-v`，DOM 常驻完整转义文本；JS 对 `scrollWidth > clientWidth` 的行加 `js-clamp`（单行 + mask 渐隐）与 `js-more`（pointer 手势），点击/Enter 切换 `js-open`。无 JS 无钳制。
- asi 分项块删除：真实数据不出现，属死 UI；revisits 标注（spec Requirement）保留，移到独立小行。
- 打印样式强制 clamp-v 全文可见。

## Trade-offs

- 无 JS 时长文本多行展开使行高不一——可接受（可读性优先，且无 JS 属降级场景）。
