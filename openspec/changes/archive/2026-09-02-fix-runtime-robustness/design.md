# Design: fix-runtime-robustness

证据来源：worth-fix 验证（`archived/worth-fix/a2.ts`、`b3.ts`、`b3-variant.ts` 等可重跑脚本）；A2=超时挂起、B3=溢出丢度量。

## D1 超时升级兜底（A2）

`runCommand` 现状：超时只发一次 SIGTERM（进程组）；`trap '' TERM` 的基准永不退出 → `close` 不触发 → Promise 永不 resolve → 工具调用挂死 + 进程泄漏。

修法：`kill()` 发 SIGTERM 后启动 5s 升级定时器，到点对进程组 `SIGKILL`；`close` 回调里清掉升级定时器。SIGKILL 不可被捕获/忽略，`close` 必然触发。定时器不 unref（close 必然清理，泄漏窗口为零）。

## D2 溢出后度量恢复与有界内存（B3/b3-variant）

现状三宗罪：溢出后 `output=""` → METRIC 丢（与位置无关）；溢出触发后 `chunks` 继续累积（无界内存）；`output_tail` 在溢出时为空字符串。

修法（增量扫描 + 双通道）：

- 每个数据事件（stdout/stderr 共用 handler）先过扫描器再入累积器。
- **METRIC 扫描器**：行携带缓冲（`carry`，无换行时上限 64KB 防病态长行），完整行以 `METRIC ` 前缀预筛后推入 `metricLines`（上限 1000 行）。溢出与否都扫，每行恰好一次。
- **尾部环**：`tail` 保存最近 64KB（Buffer 数组 + 字节数，超限从头丢弃），供 `output_tail` 显示。
- **累积器**：未溢出时照旧全量 `chunks`（≤2MB+一个 chunk）；溢出触发后 `chunks` 清空，后续事件**立即 appendFileSync 到溢出文件**（不再驻留内存）——内存从触发点起有界。
- `RunOutcome` 拆分：`output`（度量解析用：未溢出=全量，溢出=`metricLines.join("\n")`）与 `outputTail`（显示用：未溢出=全量，溢出=尾部环）。调用方 `truncateTail(last.outputTail)`、`parseMetricLines(last.output)`。

不采用"溢出后重读文件再解析"：文件可能巨大（GB 级），重读浪费且延迟不可控。

## D3 crash 行 metric 置 null

现状 `metric: status === "crash" ? 0 : metric` 污染 baseline（首行 crash → baseline=0 → 后续改进 delta 显示为 -42）。改两处（entryPrelim/entry）为 null。兼容性已核实：`validateLedger` 对 crash 行 metric=null 本来就放行（只有非 crash 缺 metric 才违规）；`rebuildState` 的 baseline/best/confidence/plateau 全部 `metric != null` 过滤；dashboard 渲染 `r.metric ?? "—"`；`deltaFor` null 短路。工具 schema 与 README 中 "0 for crash" 描述同步为省略/null。

## D4 init 拒绝非 git 研究目录

`toolInitExperiment` 参数校验后加 `isGitRepo(cwd)` 前置检查，返回明确错误。workingDir 场景检查的是研究目录（与后续 git 操作同一 cwd）。noop/discard 的 rollback 在非 git 下会 throw，由 dispatch 的 try/catch 转 RPC 错误——前置拒绝后该路径不可达，无需另改。

## D5 dashboard live server 容错

- `/autoresearch.jsonl`：`existsSync` → 404 "ledger not found（no active session）"。账本在 `clear_experiments` 后不存在，而 live server 与 MCP 同进程，未捕获异常会带走整个 server。
- `broadcast()`：逐客户端 `try { res.write(...) } catch { clients.delete(res) }`，另加 `res.destroyed` 预检。半关闭 socket 的 write 可能同步 throw 或异步 error，try/catch + 剔除覆盖两种。

## D6 repeat>1 metrics 聚合

现状 `metrics: runs[0]?.metrics`（第一次运行的字典）与 `metric: medianMetric` 来源不一致，次级度量约束的基线因此失真。改为对全部 run 的 metrics 按名取中位数聚合（出现于任一次即入并集，取其中有限值的中位数），主度量不特殊化——主度量中位数=字典聚合的特例，天然一致。

## D7 noop 连败语义（对齐 guardrails 主规范）

主规范措辞"连续 discard/crash/checks_failed"本就排除 noop，代码两处偏离：

- `rebuildState`：`keep` 归零、其余 +1 → 改为 keep 与 noop 都归零（noop 中断链），discard/crash/checks_failed +1。
- `isStopReached`（experiment.ts，Stop hook 使用）：`tail.every(status !== "keep")` 把 noop 算失败 → 改为从尾部取**连续失败段**（discard/crash/checks_failed）长度 ≥ 阈值才停。
- `toolLogExperiment` 的 next_action_hint 读 `nextState.consecutiveFailures`，语义随 rebuildState 自动一致。

## D8 crash 续跑门禁的 isDirty 口径

主规范 scenario 已写明"工作区有改动（除 `.auto/`）"，代码 `isDirty` 是裸 `git status --porcelain`——crash 记账本身弄脏 `.auto/log.jsonl`，导致 crash 后续跑被永久阻断（未 gitignore `.auto` 的项目必现）。修法：`isDirty` 改 `git status --porcelain -- . ':(exclude).auto'`（与 `commitExperiment` 的排除口径一致）。纯实现修正，规范不动。

## D9 漂移删除文案

`checkBenchmarkDrift` 的返回加 `deleted: boolean`（记录非 null 且当前文件缺失），driftWarn 组装时区分 "was deleted" 与 "changed"。纯文案，规范 scenario 已要求删除告警，不动 delta。

## 测试策略

- a2/b3 复现脚本改编为回归测试（真实 server 进程、真实基准脚本）：超时挂起（trap '' TERM + sleep，断言调用在宽限期内返回且无残留进程）、溢出末尾/开头 METRIC（断言 metric=42 且 log_file 存在）。
- crash null：首行 crash → 再 keep → 断言账本 crash 行 metric null、返回 baseline=42、delta 为正。
- init 非 git：临时非 git 目录 → ok:false。
- dashboard：启动 live server → clear → GET 账本路由 404 且 `/` 仍 200；SSE 客户端 destroy 后触发广播，server 存活。
- 单元：isStopReached noop 用例、rebuildState 连败计数用例、isDirty 排除用例、repeat 聚合用例。
