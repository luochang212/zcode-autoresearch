## Why

worth-fix 验证（证据脚本在 `archived/worth-fix/`，可重跑）坐实了一组进程与数据健壮性缺陷：忽略 SIGTERM 的基准会让 `run_experiment` 永久挂起（a2 实测 15s+ 无响应、进程泄漏）；输出超 2MB 溢出后 METRIC 行丢失（b3 实测 metric=null，与 METRIC 位置无关）且溢出后 chunks 无界累积；crash 行写入占位 metric=0 污染 baseline 并使 delta 显示反转；非 git 目录 init 成功但 log 半残；dashboard live server 对已删除账本的 GET 会 ENOENT 崩掉整个 MCP 进程、SSE 广播写已断开客户端同样崩进程；另有 repeat>1 时 metrics 字典与 median_metric 来源不一致、noop 被计入连续失败（与 guardrails 主规范"连续 discard/crash/checks_failed"措辞不符）、crash 续跑门禁把 `.auto/` 账本变动算作"未回滚改动"导致 crash 后永久阻断续跑。

## What Changes

- **超时升级兜底**：`run_experiment` 的基准超时先 SIGTERM 进程组，宽限期内未退出 SHALL 升级 SIGKILL（进程组），工具调用必然返回。
- **溢出后度量不丢**：输出溢出到日志文件时 SHALL 增量扫描 METRIC 行（与位置无关），`metric`/`metrics` 正常返回；`output_tail` SHALL 取真实输出尾部；溢出后内存占用 SHALL 有界。
- **crash 行 metric 置 null**：替代占位 0——不污染 baseline、不产生 delta 反转显示；工具 schema 描述同步（crash 省略 metric）。
- **init 拒绝非 git 目录**：研究目录不是 git 仓库时 `init_experiment` SHALL 直接返回明确错误，取代"init 成功、keep/discard 时才报错"的半残状态。
- **dashboard live server 健壮性**：`/autoresearch.jsonl` 账本不存在时 SHALL 返回 404（不崩进程）；SSE 广播对写失败的客户端 SHALL 容错并剔除，不崩进程。
- **repeat>1 metrics 聚合**：返回的 `metrics` 字典 SHALL 为各次运行按度量名的中位数聚合，与 `median_metric` 同源一致。
- **noop 不计连败**：noop 中断连续失败链（不计数、重置链），对齐 guardrails 主规范措辞；Stop hook 的停止判定同步。
- **crash 续跑门禁修正**：`isDirty` 判定 SHALL 排除 `.auto/`——crash 记账本身弄脏账本不应永久阻断下一轮 run。
- **漂移文案区分删除**：冻结文件被删除时警告明示 deleted，与被修改区分。

## Capabilities

### New Capabilities

（无。）

### Modified Capabilities

- `autoresearch/experiment-loop`: `init_experiment 建立实验会话`（拒绝非 git 研究目录）、`run_experiment 运行基准并解析度量`（SIGKILL 升级、溢出度量恢复、repeat metrics 聚合、crash 门禁排除 `.auto`、漂移删除文案）、`log_experiment 记录结果并执行 git 语义`（crash 行 metric null）。
- `autoresearch/guardrails`: 停止条件/连续失败判定——noop 不计入连续失败且中断连败链。
- `autoresearch/dashboard`: live server 模式——账本路由 404 容错与 SSE 死客户端容错。

## Impact

- `plugin/mcp/server.ts`：`runCommand`（超时升级、增量 METRIC 扫描、有界 tail）、`toolInitExperiment`（git 前置检查）、`toolRunExperiment`（metrics 聚合、drift 文案）、`toolLogExperiment`（crash metric null）、工具 schema 描述。
- `plugin/mcp/lib/git.ts`：`isDirty` 排除 `.auto/`。
- `plugin/mcp/lib/ledger.ts`：`rebuildState` 连败计数 noop 语义。
- `plugin/mcp/lib/experiment.ts`：`isStopReached` noop 语义。
- `plugin/mcp/lib/dashboard-server.ts`：账本路由 404、broadcast try/catch。
- `plugin/tests/`：上述各项回归测试。
- 无 schema 兼容性破坏：crash 行 metric 从 0 变 null 对旧账本仍可读（`rebuildState`/`validateLedger`/dashboard 已 null-safe）。
