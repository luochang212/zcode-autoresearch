# Spec Delta

## MODIFIED Requirements

### Requirement: dashboard 输入防御与故障隔离

dashboard 渲染 SHALL 对账本字段做运行时类型防御：最后一条 run 的 `timestamp` 不是字符串时 SHALL 省略日期，不得抛异常；是字符串时 SHALL 先 escape 再截取日期。live server SHALL 仅在读取与渲染成功后发送成功响应；请求处理 SHALL 捕获渲染/读取异常并返回 500，任何单个请求失败都不得使 MCP server 进程退出。

#### Scenario: 非字符串 timestamp 不炸渲染

- **WHEN** 账本最后一条 run 的 timestamp 为数字或对象
- **THEN** 静态/live dashboard 正常渲染，页脚省略日期，不抛 `slice is not a function`

#### Scenario: timestamp 中的 HTML 被转义

- **WHEN** 账本 timestamp 为包含 `<b>hi</b>` 的字符串
- **THEN** 页面显示转义后的文本，不产生可执行 HTML

#### Scenario: live 渲染异常返回 500 且进程存活

- **WHEN** live server 收到 GET /，账本内容使渲染抛出异常
- **THEN** 该请求返回 500，MCP server 进程继续运行，后续 /autoresearch.jsonl 仍可响应

#### Scenario: 渲染失败不得返回空白成功响应

- **WHEN** config.name 为 `{ "toString": null }` 导致 GET / 渲染失败
- **THEN** 请求返回 500 和可读错误文本，随后 GET /autoresearch.jsonl 仍返回 200
