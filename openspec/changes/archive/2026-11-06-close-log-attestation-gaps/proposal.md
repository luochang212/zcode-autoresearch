# Proposal

## Why

账本审计的硬不变量「真改进不得丢弃，除非 checks 失败」（`discarded_improvement`）存在自证漏洞，2026-11-06 以真实服务进程实测坐实（红测）：`status=checks_failed` 不校验最近一次 run_experiment 是否真留下失败判定——`pendingChecksFailed` 已持久化于 config.json 却只用于 keep 门；无判定声明即可绕过不变量丢弃真改进，账本还盖上 `checksFailed: true` 的假章。而 SKILL 的「偏好简单实现」权衡恰把 agent 往这条唯一的"合法"逃逸路上推（server 的错误提示也明说 "only status=checks_failed may discard it"）。同批实测坐实：noop 落账不检查工作树，脏树静默进入下一轮测量——crash+脏树有硬门，同类危险两种处置。

## What Changes

- `log_experiment` 的 `status=checks_failed` SHALL 有据：仅当最近一次 run_experiment 留下失败的 checks 判定（`pendingChecksFailed`）时接受，否则拒绝并提示正确状态（metric 未超 retained 用 discard、benchmark 自身失败用 crash）；与 keep 门同层、不受 `auditBypass` 影响
- `status=noop` 落账时工作树脏（会话状态豁免口径）SHALL 在返回中携带显式 advisory 警告（不拒绝——脏可能是合法的用户文件）；metric 缺失的报错文案补「noop 也需要 metric」的说明
- 回归测试固化（先红已证实）；工具 schema 文案修正（commit 参数 non-keep 禁带、runs[].run 语义）
- 非契约面顺手修复（design.md retro 留痕）：METRIC 名字符集补连字符、spill 日志过期清理、export_dashboard 绑定失败降级、死代码清理（`ledger.deltaFor`/`failedGuard`）

## Capabilities

### New Capabilities

（无）

### Modified Capabilities

- `autoresearch/experiment-loop`: `log_experiment` requirement 增补 checks_failed 有据门与 noop 脏树警告
