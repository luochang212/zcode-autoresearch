## ADDED Requirements

### Requirement: 配置与环境输入的诊断纪律

`AR_*` 环境变量存在但非法（非有限或非正数）时 SHALL 回退内置默认值并以 stderr 诊断说明（不得使非法值直接生效，也不得静默）。JSON-RPC 帧解析失败的行 SHALL 响应 `-32700`（id null）并输出 stderr 诊断，SHALL NOT 静默跳过。无换行的输入流 SHALL 有界：缓冲超限时 SHALL 丢弃已缓冲输入并以 stderr 诊断说明，SHALL NOT 无界增长。`clear_experiments` 遇不可解析的 `.auto/config.json` SHALL 继续删除账本（clear 不新增失败模式），并以 stderr 诊断说明 `autoresearchOff` 未被重置。harness trace 记录失败 SHALL 输出 stderr 诊断（bookkeeping 不阻断，但不得静默）。

#### Scenario: 非法超时 env 回退并诊断

- **WHEN** server 以 `AR_BENCHMARK_TIMEOUT_MS=-1` 启动并执行基准
- **THEN** 使用默认 600s 超时（基准正常完成、metric 正常解析），stderr 含非法值诊断

#### Scenario: 非法 JSON 帧响应 -32700

- **WHEN** client 写入一行非 JSON 文本
- **THEN** server 响应 `{id: null, error: {code: -32700}}`，stderr 含该行摘要诊断

#### Scenario: clear 容忍损坏 config

- **WHEN** `.auto/config.json` 为不可解析内容且账本存在，agent 调用 `clear_experiments`
- **THEN** 账本被删除、返回成功，stderr 说明 autoresearchOff 未重置，SHALL NOT 整体失败

#### Scenario: harness trace 失败可见

- **WHEN** harness trace 写入抛错（如 `.auto` 只读）
- **THEN** 宿主工具调用照常成功（不阻断），stderr 含诊断行
