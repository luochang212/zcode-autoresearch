## Why

我们的最终目标是为 zcode 制作一个 autoresearch 插件（让 coding agent 在固定度量上自主迭代优化），但在动手设计插件之前，缺少对现有三类实现路线的系统性理解：archived/ 下恰好保存了三个代表性样本——karpathy-autoresearch（原始极简版）、pi-autoresearch（pi 终端 agent 的 extension 形态）、uditgoenka-autoresearch（Claude Code/OpenCode/Codex 的多命令 skill 套件）。直接照搬任何一个都可能选错形态；需要先产出一份对比研究报告，作为后续插件设计的依据。

## What Changes

- 新增一份研究报告（中文，Markdown），深入剖析三个 autoresearch 实现的做法：
  - **karpathy-autoresearch**：原始实验循环——固定 5 分钟训练预算、val_bpb 度量、git 作为记忆、program.md 作为 agent 指令。
  - **pi-autoresearch**：extension 形态——init/run/log 三件套工具、`.auto/` 会话状态、live dashboard、任意优化目标。
  - **uditgoenka-autoresearch**：skill 套件形态——薄路由 SKILL.md + 12 个子命令、自主 orchestrator、hook 护栏、token 效率优化（声称 95% 削减）。
- 报告对比维度至少覆盖：架构形态、实验循环机制、度量与验证、状态与记忆管理、安全护栏、上下文/token 效率、人机交互面。
- 报告结合 archived/zcode-plugins（zcode 官方插件仓库）核实 zcode 插件的组成单元（skills/commands/hooks 等），给出 zcode autoresearch 插件的形态建议与关键设计决策清单，供后续 change 使用。
- 报告中的关键结论沉淀为 adr-kit 决策记录（ADR），作为插件设计阶段的决策记忆。

## Capabilities

### New Capabilities

- `autoresearch-survey`: 研究报告能力——规定报告必须覆盖的三个实现、对比维度、事实核实要求（以仓库实际代码为准，不采信 README 单方面声称）、以及产出物（研究报告文件 + ADR 记录 + 面向 zcode 插件的设计建议）。

### Modified Capabilities

（无——这是本仓库第一个 change，无既有 capability。）

## Impact

- 新增 `docs/research/autoresearch-survey.md`（研究报告主文档）。
- 新增 `adr/decisions/` 下的 ADR 记录（由 adrkit 生成）。
- 不修改任何现有代码；archived/ 目录只读，作为研究样本，不纳入改动范围。
- 报告结论将直接决定下一个 change（zcode autoresearch 插件的实现）的形态选择。
