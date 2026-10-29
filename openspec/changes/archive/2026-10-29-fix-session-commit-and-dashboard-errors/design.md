# Design

## Context

见 proposal.md 的实证。git add 的 exclude 不会移除 index 既有项；HTTP writeHead 后 headersSent 已为 true。

## Goals / Non-Goals

只补齐提交边界和错误状态码，不改变回滚、账本或页面布局。

## Decisions

- keep staging 前用 git reset HEAD -- .auto autoresearch-dashboard.html 撤销 session 文件暂存；只影响 index、不丢磁盘内容。优于 commit --only 路径限制：后者会改变部分暂存/删除文件的处理语义。HEAD 已由 init 前置条件保证。
- 读取与渲染结果先求值，再 writeHead(200)。无需新增注入接口；用真实 HTTP 和能触发字符串转换异常的手写账本回归。
- HTTP 测试用独立 MCP 子进程承载 dashboard，关闭客户端后自动清理进程，避免长驻 HTTP server 挂住测试。

## Risks / Trade-offs

- session 文件原暂存状态会撤销 → 符合它们不参与实验提交的契约，测试验证新建/修改/删除内容保留。
- 畸形账本仍可渲染失败 → 明确返回 500，不扩大为 schema 重构。

## Migration Plan

无数据迁移；回滚本 change 即可。
