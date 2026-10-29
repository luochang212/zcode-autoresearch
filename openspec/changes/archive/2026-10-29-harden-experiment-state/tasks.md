# Tasks

## 1. Worth-fix 判定与测试先行

- [x] 1.1 把 proposal 中的 12 项可修命题写成回归测试（先红）：首条 keep、跨段重置、run/clear 前置条件、dashboard 豁免、crash 响应、auditBypass、dashboard timestamp、macOS 大小写、off、中文相似度
- [x] 1.2 运行 `npm run test:plugin`，确认新增测试在修复前失败且失败原因与命题一致
- [x] 1.3 在 design.md 的 Deferred 表中确认不修项没有顺手改

## 2. 审计与状态机

- [x] 2.1 `validateLedger` 维护 segment baseline；首条 keep 必须不差于 baseline（允许相等）
- [x] 2.2 `rebuildState` 在 config 行重置 `consecutiveFailures`/`lastRun`/`lastRunChecksFailed`
- [x] 2.3 补 `validate.test.ts` 与 `ledger.test.ts` 回归

## 3. 入口与 git 边界

- [x] 3.1 `run_experiment` 要求 active session；`patchSessionConfig` 创建 `.auto/`
- [x] 3.2 `clear_experiments` 无账本幂等返回，存在时重置 pending/off
- [x] 3.3 `init_experiment` 拒绝 unborn HEAD；缺 git 时返回明确错误；清除 `autoresearchOff`
- [x] 3.4 commit/isDirty/rollback checkout 统一排除 `autoresearch-dashboard.html`
- [x] 3.5 补 `mcp-integration.test.ts`/`git.test.ts` 回归

## 4. 控制语义与返回值

- [x] 4.1 Stop hook 与 memory-inject 读取 `autoresearchOff` 并静默
- [x] 4.2 crash 响应 metric/delta 与账本一致（null）
- [x] 4.3 `auditBypass` 同时跳过次级度量约束
- [x] 4.4 补 `hooks.test.ts` / `mcp-integration.test.ts` 回归

## 5. 平台与渲染健壮性

- [x] 5.1 dashboard timestamp 类型防御 + escape；live 路由 try/catch 返回 500
- [x] 5.2 `frozenKey` 在 darwin 下 lowercase；补单元测试
- [x] 5.3 补 dashboard timestamp 单测；live 路由 catch 只做结构审查（当前无稳定故障注入点，不写脆弱测试）

## 6. 中文相似度

- [x] 6.1 CJK 长度 >2 的 token 用 bigram 表示；英文 token 行为不变
- [x] 6.2 用 spec 中的中文串补 dedup/doom-loop 回归

## 7. 文档与规范同步

- [x] 7.1 更新 README/README_CN 的 unattended 表述、plugin README(_CN) 的 4 hooks/off/SessionStart 描述
- [x] 7.2 更新 AGENTS 的权限门禁、macOS CI、lib 纯函数表述
- [x] 7.3 更新 loop-protocol 的 crash metric null、clear/finalize/setup-guide 的误导说明
- [x] 7.4 更新本 change 的三份 delta spec，并 `openspec validate --strict harden-experiment-state`
- [x] 7.5 不修 ADR-5/2、ADR-8 untracked、dashboard 960×190、consecutiveFailures 字段等低价值项，在交付说明中列明

## 8. 验证

- [x] 8.1 `npm run lint`
- [x] 8.2 `npm run typecheck`
- [x] 8.3 `npm run fmt:check`
- [x] 8.4 `npm test`
- [x] 8.5 `npx openspec validate --strict harden-experiment-state` 与 `--specs`
- [x] 8.6 `npx adrkit validate`
- [x] 8.7 归档 change 并确认主 spec 合并
