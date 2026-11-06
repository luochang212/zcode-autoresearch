# Proposal

## Why

全仓库 review（2026-11-07）的 P3 存量集中扫荡：全部是机械、低风险、各自独立的小修——`AR_BENCHMARK_TIMEOUT_MS=-1` 绕过守卫使每个默认 run 秒杀；JSON-RPC 解析错误被静默跳过（无 -32700）；无换行输入使 stdin buffer 无界增长；`recordHarnessEdits` 全静默 catch（never-silent 违反）；损坏 config 卡死 `clear_experiments`（与「clear 不得新增失败模式」的自我要求相抵）；`detectDoomLoop` 每次 log 响应算两遍；dashboard 死 CSS 规则与次微跨度刻度塌缩为 `0.0000`；macos-notify 示例转义顺序错误（反斜杠后置）；stop-continue 缺省窗口时不提示 userConfig 口径分歧；两大测试套件临时目录只建不删；marketplace 契约测试不守 author 字段一致性。

## What Changes

- env：`AR_BENCHMARK_TIMEOUT_MS` / `AR_CHECKS_TIMEOUT_MS` 非有限正数 → 回退默认 + stderr 诊断（与 `AR_MAX_ITERATIONS` 同口径）
- 传输循环：解析失败 → stderr 诊断 + `-32700`（id null）；stdin buffer 10MB 无换行上限 → 丢弃 + stderr
- `recordHarnessEdits` 失败 → stderr 诊断（仍不阻断）
- `clear_experiments`：不可解析 config 不再阻断账本删除（stderr 说明 autoresearchOff 未重置）
- `toolLogExperiment`：`detectDoomLoop` 每响应计算一次
- dashboard：删除被覆盖的死 CSS 规则（`.r-metric .u display:none`）；`niceTicks` 次微跨度小数位修正（指数形式不再误判）
- `stop-continue`：缺省窗口时 block reason 附口径提示（清单 userConfig 对 hook 不可见，需对齐设 `.auto/config.json`）
- 示例 `macos-notify.sh`：先转义反斜杠再转义引号，换行折叠为空格
- 测试：mcp-integration 与 hooks 套件注册临时根目录、`after()` 统一删除；契约测试补 `author`（plugin.json ↔ marketplace 条目 ↔ owner）一致性守卫
- 新增回归测试：非法 env 回退、-32700、clear 容忍损坏 config

## 明确不修（worth-fix 判定，留痕防复审）

| 发现                                                                | 判定 | 理由                                                                                 |
| ------------------------------------------------------------------- | ---- | ------------------------------------------------------------------------------------ |
| dashboard-server 同步 readFileSync 卡 JSON-RPC、keep-alive 连接泄漏 | 不修 | 均为有界/外观级（导出工具随 MCP 进程存活、切换次数有限）；异步化属中等重构，收益面窄 |
| memory-inject O(n²) 相似度去重                                      | 不修 | 千级 run 才逼近 5s 超时；尾部窗口上限待真实规模出现再立项（与账本增长策略一起做）    |
| 溢出路径截断边界（UTF-8 切片 / >64KB 单行切前缀 / 1000 行上限分歧） | 不修 | 仅 >2MB 输出且极端行形触发；与「两路径一致」注释的偏差留待下次动溢出逻辑时一并收     |
| hooks.json schema 校验 / `.mcp.json` `${user_config}` 替换校验      | 不修 | 需要自写 schema 守卫，面大于收益；字段漂移由 marketplace 契约测试的增量扩展逐步覆盖  |
| guard-frozen 的 Bash 重定向绕过                                     | 不修 | advisory 政策内（漂移检测事后兜底）；README 已知边界补诚实说明（见 docs 提交）       |
| Windows `sh` spawn 链未验证                                         | 不修 | 需要真机 Windows 证据，无法在本环境验证；README 已知边界补说明（见 docs 提交）       |

## Capabilities

### New Capabilities

（无）

### Modified Capabilities

- `autoresearch/experiment-loop`：新增「配置与环境输入的诊断纪律」requirement（env 回退 + stderr、-32700、stdin 有界、clear 容忍损坏 config、trace 失败可见）
- `autoresearch/dashboard`：新增「刻度小数位的跨度不变性」requirement
