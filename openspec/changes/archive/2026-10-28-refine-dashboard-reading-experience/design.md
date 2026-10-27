## Context

报告来自纯函数生成的 HTML 与内联 SVG，不能依赖外部字体或图表库。

## Goals / Non-Goals

提高结果、趋势、结论的阅读效率；不修改度量算法和实验门禁。

## Decisions

沿用衬线标题，数字采用等宽字形；单一强调色、细线分隔，压低 commit 权重。overall 视觉优先，指标名称、单位和方向显式呈现。图点使用原生锚点定位实验，筛选用原生按钮并通过 aria-pressed 表达状态。JS 关闭时全部证据可见。

## Risks / Trade-offs

移动端描述优先，数字可换行；筛选只作用账本，趋势仍展示完整历史并明确标注。

## Validation

15 项 dashboard 测试与全量 npm test 通过，lint、typecheck、fmt:check 通过。浏览器检查桌面和 320px/390px iframe 排版；实测回退筛选只保留回退记录，点击隐藏类别的趋势点会恢复全部记录并定位到对应 run。新增测试覆盖单位、计数、HTML 转义、证据链接与筛选初始状态。

收尾修正结果区箭头的对齐基准，消除整体容器居中与额外间距叠加导致的偏高；亮色桌面截图确认与 baseline/best 数字居中。
