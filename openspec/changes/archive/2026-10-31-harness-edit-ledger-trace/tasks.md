# 任务：harness 留痕（强制记账）

## 1. 类型与库

- [x] 1.1 `plugin/mcp/lib/types.ts`：新增 `LedgerHarnessEdit`、`LedgerFrozenAttempt` 行型并入 `LedgerEntry` 联合；`SessionConfig` 加 `harnessHashes?: Record<string, string | null> | null`
- [x] 1.2 `plugin/mcp/lib/harness.ts`（新）：`EDITABLE_SURFACE_FILES` 常量（D4 集合）、`sha256File`、`currentHarnessHashes(cwd)`、`diffHarnessEdits(baseline, current)` 纯函数（返回变更文件清单）

## 2. server 接线

- [x] 2.1 `init_experiment`：patchSessionConfig 同步写 `harnessHashes` 基线（与 benchmarkHashes 同一调用）
- [x] 2.2 `recordHarnessEdits()`：对账 + 逐文件追加 `harness_edit` 行 + 刷新基线；无基线静默补、整体 try/catch（D2/D5）
- [x] 2.3 挂三个记账时点：`toolRunExperiment`（漂移检查之后、before-hook 之前）、`toolLogExperiment`（session 检查之后、门禁之前）、`toolExportDashboard`（渲染之前）

## 3. guard-frozen 留痕

- [x] 3.1 deny 分支追加 `frozen_attempt` 行（try/catch 包裹，失败不影响 deny）；PreToolUseInput 补 `tool_name`；deny reason 注明已留痕

## 4. 测试（红→绿）

- [x] 4.1 `plugin/tests/harness-trace.test.ts`（新，JSON-RPC 集成）：编辑后 log_experiment 留痕（现状红）；无编辑不产行；export 收口尾部编辑；旧会话静默补基线
- [x] 4.2 guard-frozen 测试：deny → frozen_attempt 行；首次创建放行 → 不产行
- [x] 4.3 schema 安全回归：rebuildState/rebuildHistory 对含 harness_edit/frozen_attempt 行的账本输出不变

## 5. 文档

- [x] 5.1 `plugin/README.md` / `plugin/README_CN.md`：账本行清单补 harness_edit/frozen_attempt，护栏段补「可编辑面强制记账」
- [x] 5.2 SKILL/loop-protocol 若干（编辑步一节提一句留痕为机械保证）——仅在无争议处补一句，不重写规程

## 6. 收口

- [x] 6.1 `openspec validate --strict harness-edit-ledger-trace` 通过
- [x] 6.2 全量检查：npm test、lint、fmt:check、typecheck、adrkit validate
- [x] 6.3 归档 change，主规范合并 delta
