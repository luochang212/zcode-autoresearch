# zcode-autoresearch — 项目指令

## 项目是什么

为 zcode 制作 **autoresearch 插件**（自主实验循环：改代码 → 跑基准 → keep/discard → 重复）的仓库，同时承载配套的 openspec 规划与 adr-kit 决策记录。研究依据见 `docs/research/`。

## 仓库结构

| 目录             | 内容                                                                                                                                                                   | 性质               |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ |
| `plugin/`        | 插件本体：`.zcode-plugin/`、`mcp/`（server + lib）、`hooks/`、`skills/`、`commands/`、`scripts/`、`tests/`                                                             | 可修改             |
| `openspec/`      | `specs/`（主规范）、`changes/`（活动）、`changes/archive/`（已归档）                                                                                                   | 走 change 流程修改 |
| `adr/`           | adr-kit 四文件夹生命周期：`implemented/`（现役决策，全文读）、`proposed/`（未落地提案）、`rejected/`（反模式记忆）、`archived/`（退役历史，普通 git 历史，勿静默手改） | 走 adrkit 追加     |
| `docs/research/` | 研究报告（survey / field-test / pi-gap / next-steps）                                                                                                                  | 可补充             |
| `assets/`        | README 用图（banner 等），SVG 源文件直接入库                                                                                                                           | 可修改             |
| `archived/`      | 外部仓库 clone、临时资料与草稿（仓库的草稿本，往里丢东西不用犹豫）                                                                                                     | 可改、不进 git     |

## 按任务找入口

- 改插件**行为** → openspec change 流程，主规范在 `openspec/specs/`
- 查插件清单/市场字段 → `plugin/.zcode-plugin/plugin.json` 与根 `marketplace.json`；契约从仓库文件推导，不从记忆；与上游硬校验的一致性由 `tests/marketplace-contract.test.ts` 守护
- 查插件使用细节（MCP 工具参数、`.auto/` 会话状态、护栏机制）→ `plugin/README.md`（英文）/ `plugin/README_CN.md`（中文）
- 改 dashboard 页面 → 先读 `docs/design/dashboard.md`（数据口径、文案边界、视觉与交互验收）；行为仍走 openspec change。
- 懂设计取舍与已否决方向 → `adr/implemented/`（现役决策）与 `adr/rejected/`（已否决反模式）
- 背景研究 → `docs/research/`

上下文预算：先定位任务再读文件；`archived/` 与 `openspec/changes/archive/` 默认不整读。

## 铁律

1. **根目录 `archived/` 是草稿本**：这是临时资料夹。外部仓库 clone、调研残留、随手草稿都放这里，**可随意修改**，但**不进 git**。注意 `.gitignore` 写的是 `/archived/`（仅锚定根目录）：`adr/archived/` 是 adrkit 的退役决策目录（0.24 起无封条、无 MANIFEST），普通 git 历史、**必须进 git**，两者无关。正式内容别只存在根目录草稿本。
2. **零第三方依赖**：插件所有代码只允许 Node（≥24）标准库（`plugin/` 无 `package.json` 依赖、无 `node_modules`、无 `npm install` 流程）。hooks 与 MCP server 都是 `.ts`，由 Node 原生剥离类型直接运行（无构建步骤）。仓库根 `package.json` 仅存开发工具 devDependencies，不进 `plugin/`，不违反本条。
3. **隐私卫生**：仓库内不得出现 API key、绝对路径（`/Users/...`、`/tmp/...`）、个人邮箱；路径一律相对或模板变量（`${ZCODE_PLUGIN_ROOT}`、`${ZCODE_PROJECT_DIR}`）。
4. **插件改动走 openspec change**：任何行为变更先 `openspec new change`（propose → specs/design/tasks → `openspec validate --strict` → apply → archive），归档时 delta specs 合并进 `openspec/specs/`。
5. **关键决策用 adrkit**：平台可行性判定、插件形态/架构取舍、永久放弃的方向、跨 change 的语义约定，这四类必须进 `adr/implemented/`；单 change 内的实现取舍留在 change 的 design.md，不双写。已落地决策：`adrkit record "<title>" --raised-by human|agent --decided-by human|agent` 生成于 `adr/implemented/`（两个声明须如实标注：谁把决策摆上桌面、谁的判断拍板），补全 Problem/Decision/Alternatives/Consequences 后 `adrkit validate`；未落地方向先 `adrkit propose`，落地后 `adrkit implement` 转正拿编号；否决用 `adrkit reject`（进 `adr/rejected/` 留作反模式记忆）；退役/替换用 `adrkit archive`/`adrkit supersede`（进 `adr/archived/`，普通 git 历史，勿静默手改）。
6. **测试必须通过**：根目录 `npm test`（= 插件单测 `npm run test:plugin`，即 `cd plugin && node --test tests/*.test.ts`，加上 marketplace 契约检查 `npm run test:contract`；单文件直接传路径）。新增功能必须带测试；平时跑覆盖改动面的最小检查，提交前全量通过。
7. **提交纪律**：提交分批按逻辑单元（chore/docs/spec/feat），**同一文件只出现在一个提交里**；`.gitignore` 排除 `/archived/`（仅根目录草稿本）、`node_modules/`、`*.tgz`、`.husky/_`。pre-commit 钩子（husky + lint-staged）自动对暂存文件跑 eslint --fix、prettier --write、`bash -n`；pre-push 跑 typecheck + 全量测试（`git push --no-verify` 可跳过）。
8. **版本与发布**：版本号双写 `plugin/.zcode-plugin/plugin.json` 与根 `marketplace.json`，由 `tests/marketplace-contract.test.ts` 守护。正式分发以上游 `zai-org/zcode-plugins` 市场为准；本仓库可作为开发源被添加为市场（跟随 `main`，非稳定版）。每次发布在已发布快照上打 annotated tag + GitHub Release，**不挂构建产物**（市场 zip 是唯一权威包）；当前基线 `v0.1.0` = 上游落地提交 `d5690038`，未发布改动用 `git diff v0.1.0..HEAD -- plugin/` 对比。

## Reading architecture decisions

`adr/` exists because agents over-focus on the current task and forget settled decisions: reading it at task start counters the drift, and preserving important context before it is lost counters the forgetting. At the start of a coding, design, or review task, if `adr/` exists, run `adrkit list`. The four folders are a context budget: read the relevant `implemented/` records in full with `adrkit show <N>` or their files; check the relevant `proposed/` records for intent and the relevant `rejected/` records for the bad cases they warn against (a rejection is durable: it leaves only when another record owns its warning); treat `archived/` as frozen history and read it only when a task explicitly cites it. Do not judge relevance by title alone: inspect descriptions, paths, relationships, and task scope; when a task targets specific files, `adrkit relevant <path>` retrieves the records whose `paths:` scopes govern them. For actual Git changes, use `adrkit relevant --base <review-base>` or `adrkit relevant --staged`; supplement scope matches with inventory reading for unscoped decisions and resolve incomplete-search diagnostics. Compare constraints with current code; explain conflicts or changed assumptions before choosing a different approach. Mention relevant ADR numbers and verify affected behavior. Re-read on a new or resumed task, or when scope changes. Read a `## Deliberation` appendix only when its decision is in play.

Before creating a record, compare it with the active records covering the same choice or mechanism: extend a duplicate; when the active record's mechanism is itself unsound, weigh removing it rather than patching it; for an unshipped full replacement, link its intent and keep the old authority active, then use `adrkit supersede --by` in the same change that ships and records the replacement; link a partial overlap while the older record stays active. When shipping or reviewing, keep the realization facts an active record actually claims aligned with shipped code; a changed recorded choice is a new record with an explicit relationship, not a rewrite of old rationale. Archived records are ordinary Git-tracked history, never edited silently, and not read by default.

ADR Kit is the agent's notebook, not a change log. Record an ADR when an architectural choice carries important information that code, tests, and existing documentation cannot reliably preserve. Weigh importance, impact breadth, longevity, resistance to becoming stale, and how hidden the constraint or rationale is, especially when it exists only in a user conversation. These are judgment dimensions, not a score or five mandatory conditions. Ask what would be lost, what forgetting would cost, and what stable choice and reason should survive. Routine upgrades and visual adjustments usually belong to Git, configuration, styles, or tests; a hidden offline-deployment or accessibility constraint may merit a record. Preserve genuine reasons and alternatives, not invented template filler. Skipping a record is valid; no declaration or user approval is required for each skip. Respect explicit user requests to preserve a choice without extending them to all similar edits.

An existing record is not precedent for recording similar edits. Changes within its implementation freedom need no ADR update unless a claim it actually makes becomes false; keep required paths and references valid. If volatile details force repeated synchronization, report the burden and suggest trimming details to their existing owner or authorized archival. Do not silently rewrite a choice, ignore an explicit constraint, delete records, or archive them without authorization. Grilling uses the same selection judgment: discussion alone does not require a record. Preserve the complete tree with a qualifying record; if none qualifies, summarize in conversation and create none. Use `adrkit propose` for unshipped work, `adrkit implement` after it ships, and `adrkit record` for an already-shipped decision. `raised-by` declares who introduced the choice; `decided-by` declares whose judgment settled it. The CLI neither infers nor verifies shipping or provenance.

Records outlive the format that wrote them. The npm package is `adr-kit`; the command it installs is `adrkit`, so install and upgrade with `npm install -g adr-kit`. The former `tags` field is removed: remove it and author a one-sentence `description` explaining when to read each record; labels do not supply that sentence mechanically. When `adrkit validate` reports unknown fields, missing sections, or parse errors on records an older release wrote, treat it as format drift rather than damage: upgrade the `adr-kit` package to the latest stable release, migrate the active records to the current format where the change is mechanical, and report any record that cannot be carried over instead of forcing a rewrite; then re-run `adrkit validate --all`. Archived records are ordinary Git-tracked history: validate checks them by the current rules; a later format change is a normal migration commit.

When the user wants to review or share the project's history, use the `adrkit-visualize` skill; generate a browsable atlas from `adr/implemented/` and `adr/archived/` only, publish archived bodies in full, and pin the page to the commit it was built from.

<!-- adrkit: standing-orders 2cde6e1f -->

After installation, continue the original task; initializing ADR Kit is not itself a reason to create a record.

## 插件架构速览（改动前先读）

- **`plugin/mcp/server.ts`**：JSON-RPC stdio server，工具 init/run/log/export/clear；账本 `.auto/log.jsonl` 为 append-only 事实源。
- **`plugin/mcp/lib/`**：领域逻辑与 IO 辅助，包括 `experiment`（度量/方向/confidence/plateau/doom-loop）、`ledger`（账本/segment）、`git`（commit/rollback）、`validate`（审计不变量）、`dashboard`（渲染）、`dashboard-server`（SSE）、`paths`（workingDir）、`bash`（跨平台 bash 定位/进程树终止/shell 引用）、`frozen`（写保护文件集合与路径键归一化）。
- **护栏四层**：checks（输出正确）→ 审计不变量（账本自洽）→ 漂移检测（基准 hash）→ 次级度量约束（代价维度）。
- **冻结语义**：写保护覆盖 `.auto/measure.sh`、`.auto/checks.sh`、`.auto/goal.md`、`.auto/scope.md`；冻结指「记录后不可改」，setup 首次创建放行、已存在则拒改（`frozen.ts` 是唯一事实源）。
- **规程层**：`skills/autoresearch/SKILL.md` 与 `references/loop-protocol.md` 定义循环规程与 harness 编辑步（二阶循环：有账本证据才改 surface，`goal.md`/`scope.md` 是根与围栏；segment 末至多写一条 `experience.md`，finalize 前人工并入项目 `AGENTS.md`）。
- **hooks/**：zcode hook 脚本（Stop 续跑、PreToolUse 写保护、记忆注入、SessionStart）。
- **技能与命令**：`skills/autoresearch/`（循环规程 + references）、`skills/autoresearch-hooks/`（钩子教学）、`commands/`（autoresearch/export/clear/off/finalize）。

## 设计约束（历史决策，改动需谨慎）

- 平台不可行（勿再投入）：无限 auto-resume（zcode 无会话注入）、确定性 compaction（无 PreCompact 事件）、TUI widget/overlay（无 UI 扩展点）。这些方向的最终形态是 Stop 3 次窗口、memory-inject、有界 Cron 自唤醒与浏览器 dashboard（见 ADR-3/4/7）。
- 信号均 advisory（plateau/doom-loop/drift 警告），除非属于明确硬校验（审计不变量、次级度量约束）。决策权留给 agent 与用户。

## 常用命令

```bash
npm install                                  # 首次克隆后安装开发工具并启用 pre-commit 钩子
npm run lint / npm run lint:fix              # ESLint 检查 / 自动修复
npm run fmt / npm run fmt:check              # Prettier 格式化 / 检查
npm test                                     # 全量测试（插件单测 + marketplace 契约检查 tests/marketplace-contract.test.ts）
openspec validate --specs                    # 主规范校验
openspec validate --strict <change>          # change 校验
adrkit validate                              # 决策记录校验
```

CI（GitHub Actions，`.github/workflows/ci.yml`）在 push/PR 时跑 lint + fmt:check + typecheck + adrkit/openspec validate + test，ubuntu / macOS / windows 三平台（Windows 分支代码无法在 Linux runner 上执行，macOS 覆盖 BSD userland 与 bash 3.2），Node 24；`concurrency` 取消同 ref 的旧运行。
