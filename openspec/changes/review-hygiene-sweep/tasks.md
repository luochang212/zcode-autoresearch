# Tasks

## 1. server.ts

- [ ] 1.1 env helper：`AR_BENCHMARK_TIMEOUT_MS` / `AR_CHECKS_TIMEOUT_MS` 非有限正数 → 默认值 + stderr 诊断
- [ ] 1.2 传输循环：解析失败 → stderr + `-32700`（id null）；stdin buffer 10MB 无换行上限 → 丢弃 + stderr
- [ ] 1.3 `recordHarnessEdits` catch → stderr 诊断
- [ ] 1.4 `toolClearExperiments`：patchSessionConfig try/catch（stderr 说明，删除照常）
- [ ] 1.5 `toolLogExperiment`：`detectDoomLoop` 提升为单次计算

## 2. dashboard.ts / 示例 / hooks

- [ ] 2.1 删除死 CSS 规则 `.r-metric .u { display: none; }`（被后层 display:inline 覆盖）
- [ ] 2.2 `niceTicks`：step<1 按数量级推导小数位（2.5 系数 +1），上限 20
- [ ] 2.3 `macos-notify.sh`：反斜杠先转义、换行折叠空格
- [ ] 2.4 `stop-continue.ts`：缺省窗口时 block reason 附 userConfig 口径提示

## 3. 测试

- [ ] 3.1 契约测试补 author 一致性守卫（plugin.json ↔ 条目 ↔ owner）
- [ ] 3.2 mcp-integration / hooks 套件：tempRoots 注册 + after() 统一 rm
- [ ] 3.3 新增：非法 env 回退（spawn env 注入 -1 → 基准正常完成）；-32700 响应；clear 容忍损坏 config
- [ ] 3.4 dashboard 单测：次微跨度刻度小数位
- [ ] 3.5 全量 `npm test` 通过；`openspec validate --strict` 通过
