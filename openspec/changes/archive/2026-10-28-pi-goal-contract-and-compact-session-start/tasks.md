# Tasks

## 实现

- [x] 1. `plugin/mcp/server.ts`：`hookSessionPayload` 增加 `goal: state.config?.name ?? null`（含 pi 契约注释）
- [x] 2. `plugin/hooks/hooks.json`：SessionStart matcher `startup|resume` → `startup|resume|compact`
- [x] 3. 集成测试：`plugin/tests/mcp-integration.test.ts` 新增 "session payload carries the session name as goal (pi contract)"——before.sh echo `.session.goal`，断言等于 init 的 name
- [x] 4. 文档同步：`skills/autoresearch-hooks/SKILL.md` 与 `skills/autoresearch/references/loop-protocol.md` 的 session 枚举加 `goal` 及语义说明

## 规范

- [x] 5. 主 spec `openspec/specs/autoresearch/experiment-loop/spec.md`：两个 Requirement 的 session 枚举加 `goal`，新增场景「session 携带会话名（pi 契约）」
- [x] 6. 本 change 的 spec delta（MODIFIED Requirements 全文）

## 否决留痕

- [x] 7. proposal.md 记录确定性 compaction 否决证据（ZCode 七事件清单，PreCompact 不支持）
- [x] 8. proposal.md 记录 auto-resume turn 上限否决证据（三层既有界限：3 次 Stop 窗口 / maxIterations + failureThreshold / CronCreate maxRuns）

## 验证

- [x] 9. 全量测试：125 tests / 123 pass / 0 fail / 2 POSIX skip
- [ ] 10. 压缩事件后 SessionStart 提示注入的实机观察（插件测试不可模拟；下次真实长会话压缩时核对 hook 运行记录）
