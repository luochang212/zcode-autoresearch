# Tasks: fix-hook-contract

## 1. server.mjs 实现

- [x] 1.1 `runHook` 捕获 `{exitCode, timedOut, stdout, stderr, durationMs, spawnError}`;新增 steer 格式化(超时/非零退出/启动失败 → `[<stage> hook …]` 文本,正常 stdout → steer)
- [x] 1.2 `runBeforeHook`/`runAfterHook`:payload 补 `asi`(null 兜底);每次 fire 后写 `{type:"hook", stage, exit_code, duration_ms, stdout_bytes, timed_out}` 观测条目
- [x] 1.3 确认 run/log 返回组装:`before_steer`/`after_steer` 承载错误文本(fail-open 不变)

## 2. 文档

- [x] 2.1 SKILL.md:契约表补 `last_run`/`run_entry` 含 `asi`;constraints 行补"失败以 `*_steer` 返回 `[<stage> hook …]` 提示";补观测条目说明

## 3. 测试(红→绿,固化审计复现场景)

- [x] 3.1 翻转 mcp-integration.test.mjs "failing hook => no steer" 断言 → `before_steer` 匹配 `[before hook exited 3]` 且基准仍执行
- [x] 3.2 新增:before 钩子透传 `last_run.asi`(账本含 asi 的 run → before.sh 打印 hypothesis → steer 含该文本)
- [x] 3.3 新增:after 钩子透传 `run_entry.asi`
- [x] 3.4 新增:成功与失败触发均追加 `{type:"hook"}` 条目,且后续 init/run/log 不受影响
- [x] 3.5 全量 `node --test tests/*.test.mjs` 通过(60/60)

## 4. 收尾

- [x] 4.1 `openspec validate fix-hook-contract` 通过
- [x] 4.2 审计报告 G1.1/G1.2/G2.1 标记"已修复(change: fix-hook-contract)"
- [x] 4.3 原审计 E2E 复现场景闭环复验(hypothesis-reflection.sh 不再误报;账本出现 hook 条目)
