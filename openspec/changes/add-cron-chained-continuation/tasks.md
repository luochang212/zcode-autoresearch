# Tasks: add-cron-chained-continuation

## 1. E2E 门禁（先行，消证——design D6）

> 执行单见 `e2e.md`（ZCode 桌面应用为本机运行时；独立 CLI 无凭据）。由用户执行 Steps 1-3 并回传 4 问结果，agent 负责回填。

- [ ] 1.1 真机会话验证 CronCreate 可用性：agent 可调用、创建 recurring 任务（interval+maxRuns）、CronList 可见
- [ ] 1.2 验证唤醒 turn 形态：是否 automation turn、模型来源、能否调用 MCP 实验工具、Stop hook 是否触发
- [ ] 1.3 验证空转与防失控：不活跃状态下唤醒 turn 的行为；automation turn 内 CronCreate 被宿主拒绝
- [ ] 1.4 结论回填本 change design.md（D6 四点逐条记录）与 ADR；任一点证伪 → 终止本 change（任务 2+ 不开工），ADR 回滚为「不可行」记录

## 2. unattended 规程（skill 文档）

- [ ] 2.1 新增 `skills/autoresearch/references/unattended.md`：授权前提（用户明确要求才创建）、创建时机（即刻而非窗口耗尽）、CronCreate 参数建议（interval 5 分钟、maxRuns 24，可按任务调整）、唤醒提示模板（自包含三要素：状态检查 / 续跑指引 / 空转指令）、清理路径与空转代价说明
- [ ] 2.2 `skills/autoresearch/SKILL.md`：循环规程接线（用户要求无人值守 → 读 unattended 规程）；`references/loop-protocol.md` 同步指针
- [ ] 2.3 文档以 grep 校验：SKILL/loop-protocol 均含 unattended 指针；unattended.md 含模板与参数建议

## 3. stop-continue 提示文案（guardrails delta 落点）

- [ ] 3.1 `hooks/stop-continue.ts` block reason 追加无人值守提示句（条件式措辞：「用户已要求无人值守时，可按 unattended 规程创建定时唤醒」）；不新增状态/计数逻辑
- [ ] 3.2 单测：block 输出 reason 含提示句；放行分支（平台期/连败/达限）不受影响（跑既有 stop-continue 测试确认无回归）

## 4. 命令清理步骤

- [ ] 4.1 `commands/autoresearch.md`（off 段）、`commands/clear.md`、finalize 命令文档：增加「CronList 检查本会话唤醒任务并 CronDelete」步骤与 automation turn 不可删的说明
- [ ] 4.2 grep 校验：三个命令文档均含清理步骤

## 5. README 与 ADR

- [ ] 5.1 `plugin/README.md` / `README_CN.md` 已知边界段落：auto-resume 描述更新为「Stop 3 次窗口 + 有界 cron 自唤醒（无人值守需用户授权）」双层
- [ ] 5.2 ADR（adrkit decide）：平台可行性判定——CronCreate 有界自唤醒可行、E2E 结论、与 ADR-3/4 的关系（Stop 硬顶与无限 auto-resume 原判维持）；`adrkit validate` 通过

## 6. 收尾

- [ ] 6.1 `cd plugin && node --test tests/*.test.ts` 全量通过；`npm run lint` + `npm run typecheck` 通过
- [ ] 6.2 `openspec validate --specs` 主规范校验通过（归档前合并 delta 后复验）
