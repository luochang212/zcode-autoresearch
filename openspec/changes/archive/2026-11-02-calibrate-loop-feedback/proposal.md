# calibrate-loop-feedback

实验循环反馈校准：plateau 阈值可配置 + deterministic 基准停建议 repeat、discard 回滚显式回报、revisit 提示去重、confidence 单位、剩余轮数预警、记忆注入截断放宽。

## Why

来源：2026-11-02 在 ml-auto 仓库（adult × lightgbm，val_auc 主判定）跑满 segment 2 全 15 轮的第一手使用反馈。四个体验问题全部以插件代码实态核实：

| 命题                                                | 判定 | 证据                                                                                                                                                                                                                                           |
| --------------------------------------------------- | ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| plateau 阈值（相对 1%）对四位小数量级的指标永久误报 | 坐实 | `ledger.ts:168` `minImprovement ?? 0.01` 硬编码且 `server.ts` 两处 `rebuildState` 调用均未传入；val_auc 全 segment 仅动 0.26%，run 11 起每次落账都报 plateau（含 +0.000877 的最大单步涨幅轮）；确定性基准（双跑逐位一致）下仍持续建议 repeat:3 |
| discard 回滚（插件最重要的自动行为）在响应中不可见  | 坐实 | `rollbackWorkingTree`（git.ts）只返回 residual 脏文件；正常回滚成功时响应无任何字段，操作者靠编辑文件撞 "modified since read" 才得知已回滚                                                                                                     |
| revisit_nudge 每次落账全文重复                      | 坐实 | `server.ts:1202` 触发条件只看 segment 内存在带理由的 discard 行，与本次落账状态无关；keep 连涨时（#11–#15 共 5 次）每次都全文注入同一文案                                                                                                      |
| confidence 返回裸数值不可解读                       | 坐实 | dashboard 渲染为 "× noise"（`dashboard.ts:232`），MCP 响应只给 `{level, value}`，单位信息丢失                                                                                                                                                  |

## Capabilities

### New Capabilities

（无）

### Modified Capabilities

- `autoresearch/experiment-loop`：
  - 修改 requirement「log_experiment 报告平台期与置信度」：plateau 参数（`plateau_min_improvement` / `plateau_window` / `deterministic`）可经 `init_experiment` 可选参数持久化进 `.auto/config.json` 并被状态重建消费；提示文案反映配置值；`deterministic: true` 时不建议 repeat 复测；`confidence` 返回增加 `unit: "× noise"`；新增 `runs_left` 与接近迭代上限提示；
  - 修改 requirement「log_experiment 提示重访假设失效的 discard」：触发时机收窄到「本次落账为 discard/checks_failed 且 segment 存在带理由的 discard/checks_failed 行」（决策时刻），keep 落账不再注入（重访可见性由记忆注入的弃用方向清单承载，行为不变）；
  - 新增 requirement「discard 回滚显式回报」：非 keep 且非 noop 的落账，回滚成功时返回 `rolled_back: { restored_to, files, total_files }`。

## Impact

- MCP server：`plugin/mcp/server.ts`（init 参数与持久化、plateau 校准接线与文案、回滚回报字段、revisit 触发收窄、confidence 单位、runs_left）；`plugin/mcp/lib/types.ts`（SessionConfig 三键）；`plugin/mcp/lib/ledger.ts`（`plateauCalibration` 读取器）；`plugin/mcp/lib/git.ts`（`rollbackWorkingTree` 返回结构升级）
- hooks：`plugin/hooks/stop-continue.ts`（plateau 校准接线，stderr 文案随配置）；`plugin/hooks/memory-inject.ts`（方向标签截断 14→40（directionLabel 自身上限）、弃用理由截断 60→120）
- 测试：`plugin/tests/mcp-integration.test.ts`（revisit 语义改写 + 新增回滚回报/校准接线用例）、`plugin/tests/git.test.ts`（rollback 返回结构）、`plugin/tests/hooks.test.ts`（stop-continue 文案）
- 文档：`plugin/README.md` / `plugin/README_CN.md`（init_experiment 参数表）
- 不动：keep/discard git 语义本体（ADR-2）、advisory 哲学（ADR-5，全部信号仍为提示性）、审计不变量、冻结语义、dashboard 渲染
