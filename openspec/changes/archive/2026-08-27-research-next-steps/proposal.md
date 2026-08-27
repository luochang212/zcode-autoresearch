## Why

最新状态（9 个 change 归档、44 测试、追平 pi 的 28 项能力中除"平台不可行"外的全部）需要一次方向性重审，回答三个问题：① 标为"平台不可行"的 5 项（确定性 compaction、无限 auto-resume、TUI widget/overlay、settle 窗口）——**是真的无法追平，还是替代方案成本较高**；② pi-autoresearch 之外是否还有其他 autoresearch 项目有好东西可借鉴（现有研究只覆盖 karpathy/pi/uditgoenka 三家）；③ 由此更新下一步路线图。

## What Changes

- 新增研究报告 `docs/research/next-steps.md`，内容：
  1. **不可行项重审表**：5 项逐一评估"替代方案 × 成本 × 收益"——是否能用 zcode 现有原语变相追平（如 memory-inject 增强版补 compaction 的信息连续性、无头/Stop 组合补 auto-resume），给出 不可行（平台硬顶）/ 高成本替代 / 低成本变相 的分类与依据（含 zcode v0.16.5 实证复核）。
  2. **生态扫描**：搜索并评估 pi-autoresearch 之外的其他 autoresearch 类项目（GitHub/npm/社区），每个给出 定位 / 亮点能力 / 可借鉴性（移植到 zcode 插件的可行性与价值）。
  3. **下一步路线图**：按 价值×成本 排序的建议（含低成本变相项、生态借鉴项、工程项），每项给交付物与验证方式。
- 关键结论沉淀为 ADR（如"不可行项维持 / 升级为变相实现"的决策）。

## Capabilities

### New Capabilities

- `next-steps-analysis`: 下一步方向研究能力——规定报告必须覆盖不可行项重审（替代方案×成本×收益三分类）、生态扫描（外部项目可借鉴性）、路线图（排序+交付物+验证）。

### Modified Capabilities

（无。）

## Impact

- 新增 `docs/research/next-steps.md`；可能新增 ADR。
- 读取：我方 `plugin/`（现状复核）、zcode bundle（能力实证）、外部项目（只读）。
- 不修改插件代码（研究先行）。
