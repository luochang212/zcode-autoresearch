## MODIFIED Requirements

### Requirement: 从账本导出静态 dashboard

`/autoresearch:export` 命令 SHALL 读取 `.auto/log.jsonl`，生成自包含的静态 HTML（无外部网络依赖），展示：会话配置（度量、方向）、全部实验记录（iteration/status/metric/delta/description）、基线对比、best 与置信度信息。`export_dashboard` 工具 SHALL 额外支持 **live server 模式**：在本机 127.0.0.1 随机端口启动 HTTP 服务，提供 `/`（live HTML）、`/autoresearch.jsonl`（账本原文）与 `/events`（SSE）三个路由；`init_experiment` 与 `log_experiment` 写账本后 SHALL 广播 `jsonl-updated` 事件使浏览器自动刷新；工具返回 SHALL 包含 live URL 与静态文件路径。live server 与 MCP server 同进程，路由处理 SHALL 容错：`/autoresearch.jsonl` 在账本文件不存在时 SHALL 返回 404（不抛未捕获异常）；SSE 广播对已断开/写失败的客户端 SHALL 容错并把它从广播列表剔除——任何单个请求或客户端故障都不得使 MCP server 进程崩溃。

#### Scenario: 导出成功

- **WHEN** 用户执行 `/autoresearch:export`
- **THEN** 生成 `autoresearch-dashboard.html`（或等价路径）并告知用户文件位置，HTML 内包含完整实验列表与统计

#### Scenario: live server 模式

- **WHEN** agent 调用 `export_dashboard` 且返回含 `url`
- **THEN** 返回包含 `http://127.0.0.1:<port>` 的 URL；浏览器打开后能收到后续实验的 SSE 更新（页面自动刷新）

#### Scenario: 账本不存在时账本路由容错

- **WHEN** live server 已启动，`.auto/log.jsonl` 被删除（如 `clear_experiments` 之后），客户端 GET `/autoresearch.jsonl`
- **THEN** 路由返回 404，MCP server 进程存活，`/` 路由仍可正常响应

#### Scenario: SSE 死客户端容错

- **WHEN** 一个 SSE 客户端异常断开后，账本写入触发 `jsonl-updated` 广播
- **THEN** 广播对死客户端容错（跳过并剔除），MCP server 进程存活，其余客户端仍收到事件

#### Scenario: 无实验数据

- **WHEN** `.auto/log.jsonl` 不存在或为空
- **THEN** 命令返回提示，不生成文件或生成空状态页
