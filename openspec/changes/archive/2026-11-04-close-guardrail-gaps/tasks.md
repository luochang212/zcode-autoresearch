# Tasks: close-guardrail-gaps

## 1. 护栏旁路封堵

- [x] 1.1 D1：`experiment.ts` 赋值前缀值走白名单；测试：`X=$(id)`/反引号前缀拒绝、`FOO=1` 放行（experiment.test.ts）
- [x] 1.2 D2：`guard-frozen.ts` 解析 ApplyPatch `patch_text` 目标路径；测试：Update 冻结文件 deny+落账、多目标命中即拒、非冻结目标放行、首建放行（hooks.test.ts）
- [x] 1.3 D6：`server.ts` run_experiment 响应加 `benchmark_warning`（失败 run 计数 + checks 跳过说明）；测试（mcp-integration.test.ts）
- [x] 1.4 D7：`types.ts`/`ledger.ts` 增加 `lastRunEver`，`server.ts` crash 门改用它；测试：crash+脏树后 re-init 仍拒（mcp-integration.test.ts 或 ledger.test.ts+集成）

## 2. 崩溃恢复与隔离

- [x] 2.1 D3：`ledger.ts` append 前补换行 + readLedger 坏行 stderr 诊断；测试（ledger.test.ts）
- [x] 2.2 D4：`paths.ts` workingDir 失效 throw、config 损坏 stderr 诊断；hook 调用点包 try/catch；测试（新 paths.test.ts 或并入 hooks.test.ts）
- [x] 2.3 D5：`git.ts` commitExperiment `--no-verify` + stderr 诊断透传；`finalize.sh` commit 同修；测试（git.test.ts）
- [x] 2.4 D8：`runHookRaw` detached + 进程组 SIGKILL（结构验证，验证边界已记录于 design.md）

## 3. 卫生级

- [x] 3.1 repeat `Math.trunc` 整数化；测试 2.7 → 2
- [x] 3.2 serverInfo.version 动态读 plugin.json；mcp-integration 断言一致
- [x] 3.3 marketplace.json keywords 对齐 plugin.json；contract 测试加 keywords 断言
- [x] 3.4 anti-thrash 示例 noop 中断连败链；examples.test.ts 补断言
- [x] 3.5 spill 文件名 `pi-` → `autoresearch-` 前缀

## 4. 收尾

- [x] 4.1 `npm test` 全量通过（插件单测 + 契约）
- [x] 4.2 `openspec validate --strict close-guardrail-gaps` 通过
- [x] 4.3 delta specs 归档合并进 `openspec/specs/`
