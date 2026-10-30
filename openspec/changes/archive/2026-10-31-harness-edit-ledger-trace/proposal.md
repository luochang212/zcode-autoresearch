# 提案：harness 留痕——强制记账（动了必留痕）

## Why（worth-fix 审查留痕）

harness 编辑步（`harness-edit-loop`）的纪律层（编辑行、experience.md）全靠 agent 自觉：agent 若跳过规程直接 Edit `prompt.md`/`ideas.md`，**账本里什么都不会留下**——事后台账、dashboard、finalize 都看不到 harness 被动过。用户要求：编辑面「动了必留痕」，痕迹进最终台账。

### 命题核验（评审日 2026-10-31，全部以代码实态判定）

| 命题                                      | 判定         | 证据                                                                                                                                                        |
| ----------------------------------------- | ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A. 当前 harness 编辑在账本零痕迹          | 坐实         | `LedgerEntry` 仅 config/run/hook 三型（`types.ts`）；server/hooks 无任何对可编辑面的哈希或记录逻辑                                                          |
| B. zcode PostToolUse 可作挂载点           | 属实但不采用 | 宿主 `docs/hooks-runtime-contract.md` 列有 PostToolUse（payload 含完整 tool_input）；但它只抓工具编辑、抓不住用户手改，且引入第二个账本写入者——见 design D1 |
| C. 非 run 行对账本消费者安全              | 坐实         | `rebuildState`/`rebuildHistory` 仅消费 config/run；`validateLedger` 只审计 state.runs + 待写入行；`{type:"hook"}` 行已在生产账本存在                        |
| D. benchmarkHashes 漂移检测模式可镜像复用 | 坐实         | 基线存 session config、`init_experiment` 写入（server.ts init）、`run_experiment` 开跑前对账；`sha256File` 现成                                             |
| E. guard-frozen deny 可安全加留痕         | 坐实         | PreToolUse deny 已在生产被依赖；留痕包 try/catch 维持 fail-open                                                                                             |

### 属实 ≠ 值得修的四维评估

触发概率（编辑步是规程动作，每次触发都该有痕）× 影响面（台账/dashboard/finalize 的 harness 修改史完全缺失）× 修复成本（低：镜像既有漂移检测）× 不修后果（harness 漂移与 goalpost-moving 企图永久不可观测）。值得修。不需要重构——镜像既有 benchmarkHashes 机制，属补齐既有架构。

## What Changes

- 新增 harness 可编辑面（prompt.md、ideas.md、experience.md、`.auto/hooks/before.sh`、`.auto/hooks/after.sh`）的哈希对账：`init_experiment` 记基线（session config `harnessHashes`），`run_experiment` / `log_experiment` / `export_dashboard` 三个记账时点对账，变更文件各追加一行 `{type:"harness_edit", ts, segment, file, digest_before, digest_after}` 并刷新基线；无基线的旧会话静默补基线、不追溯行
- guard-frozen hook deny 冻结文件改写企图时追加一行 `{type:"frozen_attempt", ts, file, tool}`——被拦截的企图也是事实；账本写入失败不影响 deny（fail-open 不变）
- `.auto/config.json` 不在留痕集合内（server 自管键写入会自触发噪音行）
- 留痕行是机械事实层（谁动了什么、何时），不承载归因——verdict 仍由编辑行与 experience.md 的 advisory 规程负责

## Capabilities

### New Capabilities

（无）

### Modified Capabilities

- `autoresearch/guardrails`：「会话目录写保护」deny 时同步留痕 frozen_attempt 行（fail-open）
- `autoresearch/experiment-loop`：新增 requirement「harness 留痕（强制记账）」——三时点哈希对账、行 schema、旧会话补基线、新行类型不影响循环状态

## Impact

- 代码：`plugin/mcp/lib/harness.ts`（新：可编辑面集合 + 哈希对账）、`plugin/mcp/lib/types.ts`（两个新行型 + SessionConfig.harnessHashes）、`plugin/mcp/server.ts`（init 记基线 + 三时点 recordHarnessEdits）、`plugin/hooks/guard-frozen.ts`（deny 追加 frozen_attempt）
- 测试：`plugin/tests/harness-trace.test.ts`（新，JSON-RPC 集成红→绿）、`frozen.test.ts` / hook 测试补 frozen_attempt 与 rebuildState 忽略新行
- 文档：`plugin/README.md` / `plugin/README_CN.md`（账本行清单与护栏段）
- 不动：MCP 工具接口、冻结语义本身、审计不变量、dashboard 渲染（台账已留痕；展示入 dashboard 属单独 change）
- 验证边界：PostToolUse 契约仅文档核实、未实测（本 change 不依赖它）；宿主 PreToolUse 触发行为由生产 guard-frozen 已依赖（实证基础）；其余命题经代码审查 + 集成测试实证
