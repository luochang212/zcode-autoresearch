## Why

worth-fix 验证坐实两个 hook 行为与主规范相悖，且测试把错误行为锁死：

1. **平台期 Stop hook 违规 block**：guardrails 主规范 Scenario「平台期收敛」明文"plateau 检测为 true 时 Stop hook **放行**，reason 中说明循环已进入平台期"；`stop-continue.ts` 却返回 `decision: "block"`——平台期本该收尾时循环被强行续跑，只能靠 zcode 的 3 次续跑窗口耗尽才停。`hooks.test.ts` 的 "reports plateau convergence" 用例断言 `decision === "block"`，把错误行为锁死。
2. **session-start 在 workingDir 下 off 失效**：`autoresearchOff: true` 由 server 写入**项目目录** `.auto/config.json`（`patchSessionConfig` 固定写 projectCwd），而 `session-start.ts` 在 workingDir 模式下从**研究目录**读该开关——`/autoresearch:off` 之后重开会话仍被注入续跑提示（实测坐实）。主规范「实验记忆注入」要求"设置了 autoresearchOff 时不注入续跑提示"。

## What Changes

- `stop-continue.ts`：plateau 分支改为放行（exit 0）；平台期建议文本写入 stderr（zcode Stop 输出 schema 无 allow-with-reason 形态，advisory 留在 hook 日志）。
- `session-start.ts`：`autoresearchOff` 从项目目录 config 读取（与 server 写入口径一致），workingDir 重定向只影响账本定位。
- `hooks.test.ts`：翻转平台期断言（block → 放行/空输出）；补 workingDir + off 的回归用例；既有非 workingDir off 用例保持。

## Capabilities

### New Capabilities

（无。）

### Modified Capabilities

（无——两处均为代码对齐既有规范文本，requirement 不变。）

## Impact

- `plugin/hooks/stop-continue.ts`、`plugin/hooks/session-start.ts`、`plugin/tests/hooks.test.ts`。
- 无 spec、schema、依赖变更。
