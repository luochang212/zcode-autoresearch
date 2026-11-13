# Design: add-dashboard-viewing-protocol

## Context

`export_dashboard` 返回 live URL，SSE 保证页面每轮自动刷新（`run_experiment` / `log_experiment` 写账本后 broadcast，实测确认），但「谁打开浏览器、何时打开、打开几次」只存在于可跳过的建议措辞里。MCP server 是 zcode 的子进程，宿主可能是本机、SSH、CI 或远程 executor。

## 决策：agent 代开一次，而不是 MCP 侧自动弹窗

- **MCP server 进程不做浏览器拉起**：跨三平台 spawn `open` / `xdg-open` / `cmd start` 是新的故障面（沙箱、无 DISPLAY、CI 哑火），且是从插件进程发起的对外动作。agent 用 shell 跑 `open` 走的是既有授权面，无新增权限。与「信号 advisory、决策权留给 agent 与用户」的插件哲学一致。
- **不加配置项**：开关默认值难两全（默认开打扰、默认关被遗忘）；「看进度」的意愿由会话上下文表达，agent 判断比配置项更准。配置项被否决后若未来确有需求再议。
- **打开一次而非每轮**：SSE 已承担每轮刷新，重复 `open` 只会堆标签页。
- **结束不补开**：循环结束时用户可能已离开，突然弹窗比不打扰更差；从未打开过就不补开，只交链接。
- **静态文件保持快照语义**：实时观看由 live 页承担，每轮重写静态文件是冗余磁盘噪声且制造「哪份是真的」歧义。

已知边界（记录不开 change）：远程 executor 下 `open` 开在远程机器上对用户无效，URL 链接也可能不通——依赖 agent 判断 headless 豁免。

本决策属「插件形态取舍」，落一条 `adrkit note` 留痕；若后续有 change 依赖此语义再转正 ADR。

## Risks / Trade-offs

- 依赖 agent 遵循规程（无机械强制）：与 tier 前缀、cold-start 构思步同类，advisory 层一贯如此。
- 误判 headless 多开一次（本地 shell 但用户不在）：代价一个标签页，可接受。

## Migration

纯文本变更，无兼容性问题；旧会话行为不变。
