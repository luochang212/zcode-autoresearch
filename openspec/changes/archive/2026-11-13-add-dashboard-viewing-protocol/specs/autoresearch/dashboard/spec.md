# Spec Delta

## ADDED Requirements

### Requirement: 循环规程观看引导

循环规程（`SKILL.md` 与 `references/loop-protocol.md`）与 `/autoresearch:export` 命令文本 SHALL 载明观看行为，与工具行为解耦：

- 首次 `export_dashboard` 成功返回 live URL 后，agent SHALL 在**交互会话且运行在用户本机**的前提下，用平台命令（macOS `open <url>` / Linux `xdg-open <url>` / Windows `cmd /c start <url>`）打开该 URL **一次**；SSE 已保证 live 页在后续每次实验后自动刷新，SHALL NOT 每轮重复打开。
- headless 环境（SSH 会话、CI、远程 executor——打开动作发生在用户看不到的机器上）或用户已明确表示不想观看时，SHALL NOT 执行打开命令。
- 循环收尾的最终 `export_dashboard` 是报告归档：若此前从未打开过浏览器 SHALL NOT 补开，SHALL 在响应文本中给出 live URL 与静态文件路径，由用户自行决定是否点击。
- 静态文件 `autoresearch-dashboard.html` SHALL 保持 export 时刻快照的语义：规程 SHALL NOT 承诺或要求每轮重写静态文件，实时观看由 live server 承担。

工具行为不变：`export_dashboard` 的返回结构、live server 路由、SSE 广播语义均不受本 Requirement 约束（沿用既有 Requirement）。

#### Scenario: 首次导出后代开一次

- **WHEN** 交互会话中 agent 首次调用 `export_dashboard` 成功且返回含 `url`，用户未拒绝观看
- **THEN** 规程要求 agent 用平台命令打开该 URL 一次，且后续实验轮次不再重复打开（页面由 SSE 自动刷新）

#### Scenario: headless 环境不弹窗

- **WHEN** 会话运行在 SSH / CI / 远程 executor 等 headless 环境，或用户此前明确拒绝过观看
- **THEN** 规程要求 agent 不执行浏览器打开命令，仅在文本中给出 URL

#### Scenario: 结束时不补开

- **WHEN** 循环结束的最终 `export_dashboard` 执行时，本会话此前从未打开过浏览器
- **THEN** 规程要求不补开浏览器，仅在收尾摘要中给出 live URL 与静态文件路径

#### Scenario: 静态文件快照语义

- **WHEN** live server 已启动且实验循环继续运行
- **THEN** 规程不要求每轮重写 `autoresearch-dashboard.html`；实时进度由 live 页承担，静态文件仅在下一次显式 export 时更新
