# Proposal: add-dashboard-viewing-protocol

## Why

dashboard 的观看链路有一个实际缺口：`export_dashboard` 只返回 URL，规程文本对"谁来打开浏览器、什么时候打开、打开几次"没有硬性约定（SKILL.md 只有 "e.g. `open <url>`" 的可跳过措辞），agent 实际执行时经常跳过代开，用户要么不知道 live URL 存在，要么每轮被重复弹窗。本 change 把观看行为写死为一条可执行的规程：首次导出后代开一次，SSE 负责后续每轮刷新；结束时只交链接、不补开弹窗。实测已验证链路每一环（export → URL → `open` → SSE `jsonl-updated` → live 页刷新）在本机真实可用。

## What Changes

- 循环规程（`SKILL.md` Dashboard 节）载明：首次 `export_dashboard` 成功后，agent SHALL 在交互会话且用户本机的前提下用平台命令（macOS `open` / Linux `xdg-open` / Windows `cmd /c start`）打开 live URL **一次**；SSE 已保证后续每轮自动刷新，SHALL NOT 每轮重开。
- 规程载明代开的豁免条件：headless 环境（SSH / CI / 远程 executor）、用户明确拒绝过观看时 SHALL NOT 执行打开命令。
- 结束语义：循环收尾的最终 export 是报告归档；若此前从未打开过浏览器 SHALL NOT 补开，只在响应中给出 URL 与静态文件路径。
- 规程载明静态文件语义：`autoresearch-dashboard.html` 是 export 时刻的快照，SHALL NOT 承诺每轮重写（实时观看由 live 页承担）。
- dashboard spec 新增对应 Requirement（观看引导），约束对象是规程文本，与 experiment-loop spec 中「循环规程 SHALL 载明…」的先例同构。
- 不改任何 MCP 代码行为：broadcast、SSE、静态导出、`export_dashboard` 返回结构全部保持现状。

## Capabilities

### New Capabilities

（无）

### Modified Capabilities

- `autoresearch/dashboard`: 新增「循环规程观看引导」Requirement——规程文本 SHALL 载明代开一次、豁免条件、结束不补开与静态快照语义；工具行为 Requirement 不变。

## Impact

- 纯规程/文档变更：`plugin/skills/autoresearch/SKILL.md`、`plugin/skills/autoresearch/references/loop-protocol.md`、`plugin/commands/export.md`（步骤 3 的打开指引同步收紧）。
- spec delta 合并进 `openspec/specs/autoresearch/dashboard/spec.md`。
- 无代码、无测试行为变化；现有测试全量通过即可。
