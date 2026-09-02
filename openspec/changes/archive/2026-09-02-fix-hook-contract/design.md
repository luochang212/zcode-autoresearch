# Design: fix-hook-contract

## 方案

三条修复都落在 `server.mjs` 的钩子函数族(`runHook`/`runBeforeHook`/`runAfterHook`),不动 lib 层。

**G1.1 payload 补 asi**:`runBeforeHook` 的 `last_run` 增加 `asi: state.lastRun.asi ?? null`;`runAfterHook` 的 `run_entry` 增加 `asi: runEntry.asi ?? null`。保持显式字段列表风格(与现有 `{run,status,metric,description}` 一致),不整条透传(pi 传完整条目,但我们的字段白名单更显式且行为等价)。

**G1.2 失败可见**:`runHook` 从"close → resolve(steer|null)"升级为捕获 `{exitCode, timedOut, stdout, stderr, durationMs, spawnError}`,再由一个 pi 风格的 steer 格式化函数输出:

- `timedOut` → `[<stage> hook timed out after 30s]`
- `exitCode !== 0` → `[<stage> hook exited N]` + stderr 尾部(截断,与 8KB 预算同域)
- spawn 失败 → `[<stage> hook failed to start: <msg>]`
- 正常且有 stdout → 原 `steer` 文本
- 正常无 stdout → null(静默是默认)

错误文本走既有 `before_steer`/`after_steer` 字段(对齐 pi `steerMessageFor` 的"错误也是 steer"设计),不新增返回字段——agent 读文本即可行动,机器侧无需区分。

**G2.1 观测条目**:每次 fire(含 spawn 失败)后 `appendLedgerEntry` 写 `{type:"hook", stage, exit_code, duration_ms, stdout_bytes, timed_out}`(对齐 pi `hookLogEntry` 字段)。写入点:before 在 `runBeforeHook` 返回前,after 在 `runAfterHook` 返回前——观测条目与实际触发严格相邻。

## 已核实的兼容性(审计阶段完成)

- `rebuildState`(ledger.mjs:80)只收 `type:"run"`,hook 条目不会进 `state.runs` → baseline/best/confidence/plateau 不受影响。
- `validateLedger`(validate.mjs:41-43)的 `unknown row type` 分支只接收 `state.runs` + 待写入 entry → hook 条目不触发审计违规。
- dashboard 读 `state.runs` 渲染 → hook 条目不显示(预期;后续 dashboard 增强非本 change 范围)。

## 验证边界(如实记录)

- 超时路径(>30s)在协议级测试中等待 30s 不可接受,`HOOK_TIMEOUT_MS` 为常量不可注入。覆盖策略:超时与失败共用同一 steer 格式化函数,退出码失败路径(`exit 3`)固化协议测试,超时路径由代码审查 + 格式化函数的输入约定保证;不改常量为可注入(避免为测试扩 API 面)。
- asi 透传按"字段白名单 + null 兜底"实现,与 pi"整条透传"在 asi 契约上行为等价;如未来 payload 需扩展字段,再评估是否切整条透传。

## 备选方案

- **独立 `hook_error` 返回字段**(机器可读):否决——pi 契约错误即 steer,agent 按文本行动;多一个字段多一分契约面,无消费者。
- **hook 观测条目写入 dashboard/导出**:否决——本 change 只补账本观测面;dashboard 展示属体验增强,另行立项。
