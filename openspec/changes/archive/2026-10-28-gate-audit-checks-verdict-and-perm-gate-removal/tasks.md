# Tasks

## worth-fix 判定（九项硬门禁 + 五项候选修复）

- [x] 1. 判定矩阵完成：measure 锁/cap/crash 拦截/审计（完整性类）/冻结写保护/Stop 门/软告警 = 留（有用场景实证 + 无实证副作用）；checks 禁 keep = 改造；PermissionRequest 门禁 = 移除
- [x] 2. 两项候选修复证伪并留痕：5b 放宽（noop 路径已存在，`ledger.ts` 连败链设计）、timeout 白名单（`timeout_seconds` 已覆盖）

## 实现

- [x] 3. `plugin/mcp/server.ts`：`runChecks` 判定谓词（0–125 判定域；126/127/null/≥126 非判定域）+ `failed` 语义收窄 + 返回新增 `checks.verdict`
- [x] 4. `plugin/hooks/hooks.json`：移除 PermissionRequest 注册块
- [x] 5. 删除 `plugin/hooks/permission-gate.ts`
- [x] 6. `plugin/tests/hooks.test.ts`：移除 permission-gate 测试
- [x] 7. `plugin/tests/mcp-integration.test.ts`：新增「checks 未产生判定不否决 keep」集成测试（exit 127 → verdict:false + keep 放行；对照 exit 1 → 拒 keep）
- [x] 8. 文档同步：README.md / README_CN.md（hook 清单、工具门禁段落、目录树）、skills/autoresearch/SKILL.md 启动指引

## 规范

- [x] 9. `openspec/specs/autoresearch/guardrails/spec.md`：checks 背压 Requirement 判定语义修订 + 「checks 未产生判定不否决 keep」场景；移除 PermissionRequest 工具门禁 Requirement（含两场景）
- [x] 10. 本 change 的 spec delta（MODIFIED + REMOVED）

## 使用方（nano-jev V1）侧

- [x] 11. `.auto/config.json` 设 `consecutiveFailures: 5`，对齐章程「连续 discard ≥5 先研究」条款

## 验证

- [x] 12. 全量测试通过（判定域 0–125 契约与既有 checks 门禁测试兼容）
