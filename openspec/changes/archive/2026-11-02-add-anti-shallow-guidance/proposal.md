# 提案：反浅层认知引导（段起步构思步 + 假设分层 + 时段自检）

## Why（worth-fix 审查留痕）

来源：`docs/research/agent4sci-notes.md`（Anthropic AGENT4SCI 外部实证对照研究）§4 三个启发点经 worth 审计（§6，A1/A2/A3）判「值得做」。三个命题全部以代码实态/实测核实：

| 命题                                                     | 判定             | 证据                                                                                                                                                      |
| -------------------------------------------------------- | ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 新 segment 无结构化构思步骤，循环默认滑向「读代码→调参」 | 坐实             | SKILL 循环第 1 步直锚账本 + git log；`init_experiment` 无构思环节；agent4sci 外部实证：默认行为 56% 调参 + 基线锚定，加构思插件后 10.4%→20.1%             |
| doom-loop 看不见「互不相同但全浅层」的连击               | 坐实（**实测**） | node 直调 `detectDoomLoop`：六轮互异调参假设 → `null`；对照组（同假设×3 / X,Y,X,Y / 尾部重复）全部按设计触发。信号无 bug，是 Jaccard 文本相似度的语义边界 |
| 信号全是迭代粒度，无墙钟维度                             | 坐实             | 3 个 before 示例均为迭代粒度；`session.started_at_epoch` 已由 server 透传（server.ts:701，spec 有对应 Scenario）但无消费者                                |

### 处置（worth 审定）

全部为**协议/素材级、advisory**：不动 MCP 代码、不动 doom/plateau 检测语义（实测已确认其行为正确），不改 advisory 哲学（ADR-5）。分层靠约定 + 提醒，不靠机械分类（文本无法可靠判定「调参 vs 结构」）。

## Capabilities

### New Capabilities

（无）

### Modified Capabilities

- `autoresearch/experiment-loop`：
  - 新增 requirement「段起步构思步与假设分层（反浅层认知引导）」：segment 冷启动先构思再读代码、假设 tier 前缀约定、校准问题，全部 advisory；
  - 新增 requirement「浅层连击提醒（idea-rotator 增强）」：示例钩子在最近账本假设全为浅层前缀时注入提醒；
  - 修改 requirement「钩子教学与示例资产」：示例集新增时段自检（墙钟维度）场景覆盖，6→7 个。

## Impact

- 协议文档：`plugin/skills/autoresearch/SKILL.md`（循环步骤提及构思步与分层）、`plugin/skills/autoresearch/references/loop-protocol.md`（构思步小节 + tier 约定）
- 示例素材：`plugin/hooks/examples/before/idea-rotator.sh`（浅层连击提醒）、`plugin/hooks/examples/before/self-check.sh`（新，时段自检）
- 教学同步：`plugin/skills/autoresearch-hooks/SKILL.md`（示例场景清单）
- 文档：`plugin/README.md` / `plugin/README_CN.md`（示例数 6→7 与清单）
- 不动：MCP server/lib、doom-loop/plateau/confidence 检测语义、冻结语义、guard-frozen
- 验证边界：三个命题的核验为文档审查 + 一次真实函数实测（detectDoomLoop），无宿主行为依赖；示例钩子为 fail-open 素材，正确性由 `bash -n` + 契约审查 + 既有示例模式对齐保证
