# 提案：冻结语义修正（记录后不可改写，setup 首次创建放行）

## Why

guard-frozen 对受保护路径做无条件 deny（没有「文件已存在」判断），而 setup-guide 第 2–5 步指示 agent 用 Write 创建这四个文件，setup 流程与写保护自相矛盾，每次 setup 必吃 deny。

worth-fix 验证（红证据，2026-10-27）：

- **实测**：空目录下 Write `.auto/goal.md` 被 hook deny，理由为 "it was recorded verbatim from the user and cannot be rewritten"，此刻尚无任何记录，理由与事实相反。
- **实证**：既有测试 `guard-frozen denies deep-goal edits` 的 `tempCwd()` 是空目录，deny 断言在文件不存在时即通过（deny-on-absent 已被测试套件坐实）。
- **文档矛盾**：setup-guide "Write the user's deep goal verbatim … into `.auto/goal.md`"；全文档（setup-guide / loop-protocol）无 Bash 变通指引（grep 无命中）。
- **后果分层**：最重的一档，听话的 agent 因 deny 跳过 goal/scope 记录，循环失去锚点；中等一档，agent 以 Bash heredoc 即兴变通（matcher 只拦 Write|Edit|ApplyPatch），每次 setup 多一轮摩擦；最轻一档，deny 理由在创建场景误导。

## What Changes

- `plugin/hooks/guard-frozen.ts`：FROZEN 命中后增加 existsSync 判断，目标不存在 → 放行（创建窗口）；已存在 → deny（改写拒绝）。冻结语义定格为「记录后不可改写」。
- 回归测试：deny 断言全部前置文件创建；新增「首次创建放行、落盘后拒绝」用例（红→绿：新期望先在未修复 hook 上跑红，修复后转绿）。
- 文档：setup-guide 第 2/4/5 步措辞对齐（创建是合法动作，冻结自落盘起生效）；README / README_CN 写保护行同步。

## Capabilities

### New Capabilities

（无）

### Modified Capabilities

- `autoresearch/guardrails`：「会话目录写保护」从「无条件 deny」改为「已存在 deny、不存在放行」，新增 setup 首次创建 scenario。

## Impact

- 代码：`plugin/hooks/guard-frozen.ts`（FROZEN 命中后 +existsSync 放行判断）
- 测试：`plugin/tests/hooks.test.ts`（deny 场景前置文件创建 + 新增创建放行用例）
- 文档：`plugin/skills/autoresearch/references/setup-guide.md`、`plugin/README.md`、`plugin/README_CN.md`
- 兼容性：改写拒绝行为不变；唯一变化是此前必被拒的 setup 创建现被放行。Bash 旁路与「setup 跳过的文件被 loop 中途创建」边界不变（advisory 层，与 ADR-5 信任模型一致；measure.sh/checks.sh 的硬层是漂移检测「首见即基准」）。

## 验证记录（worth-fix 留痕）

- **红**：手动运行 hook（空目录 + Write goal.md）→ deny JSON（理由称 "was recorded"，实未记录）；`hooks.test.ts` 的 deny-on-absent 断言在未修复代码上通过，即缺陷在。
- **绿**：测试改写为「创建放行 + 已存在拒绝」后，先在未修复 hook 上运行跑出红（allow 期望 vs 实际 deny），修复后全绿。
- **本 change 之外的取舍**（worth-fix 权衡结论，不修）：asi.infra 约定不立 ADR（主规范 requirement + 4 scenario 已完整承载，立则双写；出现第二个消费者或有人提议硬化时再立）；Windows 既有 10 个测试失败排队（本机 macOS 无法验证，盲改违反实证原则）；git 历史过程瑕疵不改写。
