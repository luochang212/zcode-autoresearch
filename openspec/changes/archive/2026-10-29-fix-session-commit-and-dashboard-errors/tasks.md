# Tasks

## 1. 提交边界

- [x] 1.1 新增真实 git 回归，验证预暂存 session-only 与混合代码（新建/修改/删除）修复前失败
- [x] 1.2 撤销 session 文件暂存并验证内容保留、提交仅含代码，更新 delta 场景

## 2. HTTP 故障状态

- [x] 2.1 真实 MCP/HTTP 回归验证畸形账本渲染返回 500、后续账本路由存活，修复前失败
- [x] 2.2 先渲染/读取后写成功头，验证上述回归通过并保留错误正文

## 3. 集成验证

- [x] 3.1 lint、typecheck、fmt:check、全量测试、ADR 与 OpenSpec 校验通过，记录结果

## Workflow follow-up

- 合并 delta spec 后归档 change。
