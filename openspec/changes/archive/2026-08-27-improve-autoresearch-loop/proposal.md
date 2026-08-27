## Why

实跑报告（`docs/research/autoresearch-field-test.md`）验证核心循环有效（9 轮 713× 加速），但暴露三个可改进点：① 无 plateau（平坦收敛）检测——agent 靠自觉判断"接近下限"收尾，协议层没有这个概念，会在噪声区空转；② `confidence`（MAD 校准）工具返回了但 agent 的 keep/discard 判定没引用它；③ 噪声度量（4–6ms 波动 ±2ms）无取中位数支持，改进/持平/变差在噪声内难分。

## What Changes

- `run_experiment` 新增 `repeat` 参数（默认 1）：跑 N 次 benchmark，返回每次的 metric 与**中位数**（主度量），checks 仍只跑一次。
- `log_experiment` 返回 `plateau` 标志：当前 segment 最近 N 轮（默认 5）相对窗口起点的改善 < 阈值（默认 1%）时置 true；`confidence` 在返回中前置为醒目字段。
- Stop hook（`stop-continue.mjs`）在 plateau 时**放行**（循环已收敛，无需续跑），与迭代上限/连续失败并列作为停止条件。
- SKILL 与 `references/loop-protocol.md` 规程更新：噪声度量用 `repeat` 复测取中位数；低置信（yellow/red）改进的 keep/discard 处理规则；plateau 的识别与收尾。
- 不改变账本格式、git 语义、度量解析等既有契约。

## Capabilities

### New Capabilities

（无。）

### Modified Capabilities

- `autoresearch/experiment-loop`: `run_experiment` 增加 repeat/中位数能力（Requirement 新增）；`log_experiment` 增加 plateau 标志返回（Requirement 新增）。
- `autoresearch/guardrails`: Stop hook 的停止条件增加"平台期收敛"（Requirement 修改）。

## Impact

- `plugin/mcp/lib/experiment.mjs`：新增 `detectPlateau` 纯函数。
- `plugin/mcp/lib/ledger.mjs`：`rebuildState` 增加 plateau 状态（若适用）。
- `plugin/mcp/server.mjs`：`run_experiment` repeat 逻辑；`log_experiment` plateau/confidence 返回。
- `plugin/hooks/stop-continue.mjs`：plateau 放行。
- `plugin/skills/autoresearch/SKILL.md`、`references/loop-protocol.md`：规程更新。
- `plugin/tests/`：detectPlateau 与 repeat 中位数测试。
- 兼容性：既有账本文件与调用不破坏（新增字段为 additive）。
