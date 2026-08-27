## Why

`docs/research/next-steps.md` P1 首项（ADR-4）：审计不变量（leo-lilinxiao/codex-autoresearch 借鉴）。当前账本（`.auto/log.jsonl`）是 agent 自由记录、无人对账——"keep 是否真实改进""discard 是否合理""commit 溯源是否一致"全靠自觉。本 change 给账本加**确定性强制语义校验**（事件溯源重放 + 不变量），把"账本可信"从约定变成代码保证。

## What Changes

- **`lib/validate.mjs`**（纯函数，零 I/O）：`validateLedger(runs, config)` 校验——事件顺序（run 号连续、segment 一致）、基线先于一切、**keep 必须真实改进**（direction-aware）、**discard 真改进必须有 failed guard**、**commit 字段一致性**（keep 必有 commit、非 keep 必无）。
- **server 接线**：`log_experiment` 写入前对拟追加后的账本跑校验，违规拒收并返回错误；`run_experiment` 开始前检查"上一条 crash 未回滚（工作区脏）"则拒绝。
- 更新 SKILL/README（账本可信语义）。
- 不改变账本格式（纯增量校验层）。

## Capabilities

### New Capabilities

（无。）

### Modified Capabilities

- `autoresearch/experiment-loop`: log_experiment 增加账本不变量校验（Requirement 修改）；run_experiment 增加 crash 未回滚禁续跑（Requirement 修改）。

## Impact

- `plugin/mcp/lib/validate.mjs`（新）。
- `plugin/mcp/server.mjs`：log/run 接线。
- `plugin/skills/*`、`plugin/README.md`：文档。
- `plugin/tests/`：对抗用例（keep 无改进、discard 真改进无 guard、跳号、crash 残留续跑、commit 字段矛盾）。
- 兼容性：合法会话行为不变（校验只拦违规）；旧账本若含历史违规会在下次写入时报错（可人工解锁说明）。
