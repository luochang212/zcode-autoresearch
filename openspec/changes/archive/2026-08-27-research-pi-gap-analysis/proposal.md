## Why

我们的目标是"在适配 zcode 且条件允许的前提下追平 pi-autoresearch"。现有研究报告（`docs/research/autoresearch-survey.md`）对 pi 有机制级分析，但那是三项目泛对比；要支撑"追平"决策，需要一份**定向差距分析**：pi 的触发机制、架构、能力、效果四维全貌 + 我方插件（`plugin/`）逐项审计 + 差距矩阵（可追平 / zcode 受限 / 平台不可行）+ 按优先级排序的追平路线图。

## What Changes

- 新增研究报告 `docs/research/pi-gap-analysis.md`，内容：
  1. **pi 触发机制**：如何被用户触发与自动激活（`/autoresearch` 命令、skill 展开、auto-activation 判定、会话生命周期事件），agent 进入循环的完整路径。
  2. **pi 架构**：三层解耦（extension 基础设施 / skill 流程 / slash command 模式开关）的组成文件、边界、状态流。
  3. **pi 能力清单**：工具三件套、auto-resume、确定性 compaction、dashboard（widget/全屏/浏览器 SSE）、finalize 分支整理、hooks 教学 skill、confidence/ASI/segment 等，逐项给出现状与行为细节。
  4. **pi 效果证据**：npm 下载量、GitHub stars、README/CHANGELOG 声称、用户证据（issues/discussions）——区分"验证过的效果"与"营销声称"。
  5. **我方插件审计**：`plugin/` 当前能力逐项对照 pi，标出已有 / 部分 / 缺失。
  6. **差距矩阵**：每个差距标注 可追平 / zcode 受限（有替代方案）/ 平台不可行（无法实现），附原因。
  7. **追平路线图**：按"差距大小 × 对核心循环的价值 × 实现成本"排序的里程碑。
- 关键结论沉淀为 adr-kit 决策记录（ADR）。
- 不修改插件代码（研究先行，追平实施开后续 change）。

## Capabilities

### New Capabilities

- `pi-gap-analysis`: 差距研究报告能力——规定报告必须覆盖 pi 的触发/架构/能力/效果四维、我方审计、差距矩阵（三分类）、追平路线图，且结论以代码/数据核实为准。

### Modified Capabilities

（无。）

## Impact

- 新增 `docs/research/pi-gap-analysis.md`。
- 新增 `adr/decisions/` 记录（如追平优先级决策）。
- 读取 `archived/pi-autoresearch`（只读样本）与 `plugin/`（我方代码，只读审计）。
- 效果数据来自 npm registry / GitHub API（只读查询）。
