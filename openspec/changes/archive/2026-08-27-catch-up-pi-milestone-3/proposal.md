## Why

里程碑 1/2 已追平 pi 的核心扩展点与体验项。里程碑 3 收尾追平路线图（`docs/research/pi-gap-analysis.md` + ADR-3）：工具门禁近似（#1）与自动激活/激活决策（#2/#3）——两项均为 zcode 受限近似（低风险工具调用可能不经过权限询问；无运行时模式状态机），以"尽可能接近"为原则低成本实现。

## What Changes

- **PermissionRequest 门禁近似**（#1）：新增 `hooks/permission-gate.mjs`——当工作区**无 `.auto/log.jsonl`**（无实验会话）时，对实验工具（init/run/log/export/clear）的权限询问返回 `deny`，防止误启动循环；有会话则放行。受限说明：低风险工具调用不经过权限询问时此门禁不触发（fail-open），工具内与 skill 指引仍为兜底。
- **自动激活提示 + 激活决策**（#2/#3）：`session-start.mjs` 增强——有 `.auto/log.jsonl` 且 `.auto/config.json` 无 `autoresearchOff: true` 时，注入"会话可续跑"引导（`/autoresearch:autoresearch`）；有 off 标记则不提示。新增 `/autoresearch:off` 命令写 `autoresearchOff: true`（激活决策持久化，跨会话生效）。
- 更新 SKILL/README。

## Capabilities

### New Capabilities

（无。）

### Modified Capabilities

- `autoresearch/guardrails`: 新增 PermissionRequest 工具门禁（Requirement 新增）；实验记忆注入增加 SessionStart 自动激活提示与 off 决策语义（Requirement 修改）。

## Impact

- `plugin/hooks/permission-gate.mjs`（新）+ `hooks/hooks.json` 注册。
- `plugin/hooks/session-start.mjs`（增强）。
- `plugin/commands/off.md`（新）。
- `plugin/skills/*`、`plugin/README.md`：文档。
- `plugin/tests/`：hook 契约测试。
- 兼容性：additive；无会话/无 off 标记时行为与现状一致。
