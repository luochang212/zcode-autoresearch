## Why

验收审计(`docs/research/pi-parity-audit.md`,change `audit-pi-autoresearch-gap`)发现迭代钩子与 pi 契约存在三条偏差,且均已 E2E 实测坐实:G1.1 hook payload 丢弃 `asi`(自带示例 `hypothesis-reflection.sh` 因此永久误报);G1.2 钩子失败/超时零痕迹(agent 不知、server stderr 无痕、账本无记录);G2.1 每次触发不写 `{"type":"hook"}` 观测条目(排查"钩子跑没跑"无据可依)。当前 spec 甚至把"退出码非零时返回为空"固化成了预期行为,需要一并修正。

## What Changes

- **G1.1 payload 补 `asi`**:`runBeforeHook` 的 `last_run` 与 `runAfterHook` 的 `run_entry` 透传上一条/本条 run 的 `asi` 对象(无则为 null),对齐 pi 的完整条目透传与 SKILL.md 已声称的 `asi?` 契约。
- **G1.2 失败可见(fail-open 语义不变)**:钩子非零退出/超时/启动失败时,`before_steer`/`after_steer` 返回形如 `[before hook exited 3] <stderr 摘要>` / `[before hook timed out after 30s]` 的错误提示(对齐 pi `steerMessageFor`);循环仍不阻断。
- **G2.1 观测条目**:每次钩子触发后向 `.auto/log.jsonl` 追加 `{type:"hook", stage, exit_code, duration_ms, stdout_bytes, timed_out}`(对齐 pi `hookLogEntry`;rebuildState/validateLedger 数据流已核实兼容)。
- 同步 SKILL.md 契约说明与协议测试(把静默断言翻转为可见断言,补 asi/观测条目场景)。

## Capabilities

### New Capabilities

(无。)

### Modified Capabilities

- `autoresearch/experiment-loop`: 三个 requirement 变更——`run_experiment 运行基准并解析度量`(before 钩子 payload 契约补 asi、失败可见、观测条目)、`log_experiment 记录结果并执行 git 语义`(after 钩子同三项)、`钩子教学与示例资产`(stdin 契约描述补 asi 与失败可见语义)。

## Impact

- `plugin/mcp/server.mjs`:`runHook`(捕获 stderr/退出码/超时)、`runBeforeHook`/`runAfterHook`(payload 补 asi、写观测条目)、两个工具返回组装。
- `plugin/skills/autoresearch-hooks/SKILL.md`:契约表与规则段。
- `plugin/tests/mcp-integration.test.mjs`:翻转"failing hook => no steer"断言,新增 asi 透传与 hook 条目场景。
- 无 schema/依赖/平台变更;`hypothesis-reflection.sh` 等示例无需改动(它们一直按含 asi 的契约编写)。
