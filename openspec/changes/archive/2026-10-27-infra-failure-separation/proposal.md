# 提案：区分基础设施故障与代码故障，并强化 doom-loop 应对

## Why

自动实验循环中，crash 状态混含两类失败：**代码故障**（想法本身不可行：逻辑 bug、架构性 OOM）与**基础设施故障**（环境问题：网络中断、依赖缺失、平台限流）。二者都被逐条计为一次 run，导致环境故障引发的"反复 crash"被 doom-loop 检测误判为假设打转，产生错误的停止/换向信号。依据：美团《从 LOOP 到图探索》V2 的故障二分实践（代码故障计入证伪记录、基础设施故障不占轮次预算）；本插件信号均为 advisory（ADR-5），修复应落在信号质量层而非硬校验层。

## What Changes

- 账本 crash 行新增可选标注约定 `asi.infra: true`（advisory：工具不校验、账本照实透传，agent 自行判断成因）
- doom-loop 检测排除 `asi.infra === true` 的 run 行（先剔除再取检测窗口），非 infra 行之间的重复/振荡判定语义不变
- doom-loop 触发时 `next_action_hint` 文案升级：提示先做一轮调研（重读 prompt.md 的已试清单、相关文档、此前的近失实验）再换结构性不同的方向，而非直接再试
- SKILL.md 同步三处：crash 记录指引区分两类失败并说明 `asi.infra` 用法；`doom_loop: true` 应对补"调研逃逸"；keep/discard 权衡补简单性判据（同等提升偏好更简单的实现/删代码的 win）

## Capabilities

### New Capabilities

（无）

### Modified Capabilities

- `autoresearch/experiment-loop`：新增 requirement「log_experiment 区分基础设施故障与代码故障」，含 `asi.infra` 标注约定、doom-loop 检测排除 infra 行、doom-loop 提示含调研逃逸语义。现有 doom-loop 场景（非 infra 重复触发）语义不变，不受影响。

## Impact

- 代码：`plugin/mcp/lib/experiment.ts`（detectDoomLoop 过滤 infra 行）、`plugin/mcp/server.ts`（next_action_hint 文案）
- 技能文本：`plugin/skills/autoresearch/SKILL.md`
- 文档：`plugin/README.md` / `plugin/README_CN.md`（log_experiment 字段说明补 `asi.infra`）
- 测试：`plugin/tests/` 新增 infra 排除断言
- 兼容性：纯增量。旧账本无 `asi.infra` 字段按非 infra 处理，行为不变；doom-loop 判定仅放宽（infra 行不再计入），无破坏性
