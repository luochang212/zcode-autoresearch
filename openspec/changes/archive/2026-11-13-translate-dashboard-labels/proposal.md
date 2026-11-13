# Proposal: translate-dashboard-labels

## Why

页面文案中英混杂（KPI 卡、状态药丸、置信判定、列头、页脚、图例均为英文）；「假设与结论」列头与真实字段名不符——该列承载的是 description 字段即「该轮改动」。全站文案统一中文，技术标识（metric 名、commit 哈希、产品名 autoresearch、日期）保留原文。

## What Changes

- 状态药丸：保留/回退/崩溃/门禁/无改动；KPI 卡：实验总数/保留/回退/无改动；置信判定：通过/偏弱/未过。
- 列头：状态/指标/Δ 相对基线/该轮改动/提交；页脚 `<N> 次实验 · 锚定 <短哈希>`；元信息行 分段/更新于/噪声；图例、图注、统计行、segment 边界标注（`分段 N`）全部中文。
- spec 字面量同步修订；无行为/数据语义变化。

## Capabilities

### Modified Capabilities

- `autoresearch/dashboard`: MODIFIED「从账本导出静态 dashboard」——上述字面量与列名修订。

## Impact

- `plugin/mcp/lib/dashboard.ts`、`plugin/tests/dashboard.test.ts`；无逻辑变化。
