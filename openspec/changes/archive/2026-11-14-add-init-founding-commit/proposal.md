# Proposal: add-init-founding-commit

## Why

keep/discard 的 git 语义都以「init 时工作树 = HEAD」为隐含前提（keep 的
`add -A -- .`、discard 的 `checkout HEAD -- .`）。换模型/换座位类开段常
把开段配置留在工作树不提交（插件 ADR-11 只发警告不设门槛），此前提被打破，
两个真实后果已在 ml-auto 实测坐实：

1. **keep 提交夹带**：keep 自动提交把开段配置静默搭车（提交信息只描述实验
   改动，diff 是数倍体量），违反宿主仓库「keep 提交不得夹带」纪律，git
   历史永久失真。
2. **discard 孤儿化基线行**：首个 discard 的全量回滚把开段配置打回 HEAD，
   基线 noop 行刚落账验证过的树状态无法复现，账本行成为孤儿。

根治点是 init 时建立「树 = HEAD」不变量，而不是在 keep 与 rollback 两个
下游各挡一次。

## What Changes

- `init_experiment` 增加可选布尔 `foundingCommit`：为 true 且工作树脏
  （会话状态豁免口径同 crash 门禁）时，插件把既有脏工作按 keep 同款暂存
  纪律提交为一个段首提交（`segment:` 前缀），返回携带提交短 hash；暂存
  为空（脏文件全为 gitignored）时静默跳过。
- `foundingCommit: true` 且树干净时为 no-op，返回说明无需折入。
- 缺省行为不变（脏树仍只发 ADR-11 警告），向后兼容。
- git 层新增 `commitFoundingState`，暂存纪律与 `commitExperiment` 共用
  同一实现（index reset → `add -A -- .` → 剔除会话态）。

## Capabilities

### Modified Capabilities

- `autoresearch/experiment-loop`: MODIFIED「init_experiment 建立实验会话」
  ——新增 `foundingCommit` 参数与三个 scenario（脏树折入 / 干净树 no-op /
  缺省警告不变）。

## Impact

- `plugin/mcp/lib/git.ts`（staging 抽取 + 新函数）、
  `plugin/mcp/server.ts`（init 参数与流程）、
  `plugin/tests/git.test.ts`、`plugin/tests/mcp-integration.test.ts`。
- keep/discard 的 git.ts 语义零改动：不变量在 init 建立，两个下游自然修复。
