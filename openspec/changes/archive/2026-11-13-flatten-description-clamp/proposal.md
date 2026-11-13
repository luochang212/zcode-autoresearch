# Proposal: flatten-description-clamp

## Why

用户裁决：渐隐是针对「该轮改动」超长字段值**整体**的统一交互——不要展开按钮、不要 `…` 预览副本；渐隐本身就是可展开的视觉暗示。asi 分项渲染在真实账本中不会出现（真实会话把信息写进 description），其分项 UI 已随本 change 移除。

## What Changes

- 描述字段渲染从 `<details>`（summary + 预览副本）改为统一钳制语言：完整文本常驻 DOM，超一行由 JS 钳制单行 + 右侧 mask 渐隐，点击/Enter 展开；无 JS 全文可读，打印强制全文。
- 移除 dashboard 上 asi（hypothesis/next_action_hint/rollback）的分项渲染块；`asi.revisits_run` 的 `↻ Revisiting` 标注（spec 另有 Requirement）保留。
- spec 对应 bullet 与 scenario 修订；无工具行为变化。

## Capabilities

### Modified Capabilities

- `autoresearch/dashboard`: MODIFIED「从账本导出静态 dashboard」——超长描述 bullet 改为统一钳制语言，scenario「超长描述展开收起」内容同步。

## Impact

- `plugin/mcp/lib/dashboard.ts`、`plugin/tests/dashboard.test.ts`；SSE/筛选/锚点/Δ 语义不变。
