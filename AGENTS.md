# zcode-autoresearch — 项目指令

## 项目是什么

为 zcode 制作 **autoresearch 插件**（自主实验循环：改代码 → 跑基准 → keep/discard → 重复）的仓库，同时承载配套的 openspec 规划与 adr-kit 决策记录。研究依据见 `docs/research/`。

## 仓库结构

| 目录             | 内容                                                                                                       | 性质               |
| ---------------- | ---------------------------------------------------------------------------------------------------------- | ------------------ |
| `plugin/`        | 插件本体：`.zcode-plugin/`、`mcp/`（server + lib）、`hooks/`、`skills/`、`commands/`、`scripts/`、`tests/` | 可修改             |
| `openspec/`      | `specs/`（主规范）、`changes/`（活动）、`changes/archive/`（已归档）                                       | 走 change 流程修改 |
| `adr/decisions/` | adr-kit 决策记录                                                                                           | 走 adrkit 追加     |
| `docs/research/` | 研究报告（survey / field-test / pi-gap / next-steps）                                                      | 可补充             |
| `assets/`        | README 用图（banner 等），SVG 源文件直接入库                                                               | 可修改             |
| `archived/`      | 外部仓库 clone、临时资料与草稿（仓库的草稿本，往里丢东西不用犹豫）                                         | 可改、不进 git     |

## 按任务找入口

- 改插件**行为** → openspec change 流程，主规范在 `openspec/specs/`
- 查插件清单/市场字段 → `plugin/.zcode-plugin/plugin.json` 与根 `marketplace.json`；契约从仓库文件推导，不从记忆
- 查插件使用细节（MCP 工具参数、`.auto/` 会话状态、护栏机制）→ `plugin/README.md`（英文）/ `plugin/README_CN.md`（中文）
- 懂设计取舍与已否决方向 → `adr/decisions/`
- 背景研究 → `docs/research/`

上下文预算：先定位任务再读文件；`archived/` 与 `openspec/changes/archive/` 默认不整读。

## 铁律

1. **`archived/` 是草稿本**：临时资料夹——外部仓库 clone、调研残留、随手草稿都放这里，**可随意修改**；但**不进 git**（`.gitignore` 已排除），正式内容别只存在这里。
2. **零第三方依赖**：插件所有代码只允许 Node（≥22）标准库（`plugin/` 无 `package.json` 依赖、无 `node_modules`、无 `npm install` 流程）。hooks 与 MCP server 都是 `.mjs`。仓库根 `package.json` 仅存开发工具 devDependencies，不进 `plugin/`，不违反本条。
3. **隐私卫生**：仓库内不得出现 API key、绝对路径（`/Users/...`、`/tmp/...`）、个人邮箱；路径一律相对或模板变量（`${ZCODE_PLUGIN_ROOT}`、`${ZCODE_PROJECT_DIR}`）。
4. **插件改动走 openspec change**：任何行为变更先 `openspec new change`（propose → specs/design/tasks → `openspec validate --strict` → apply → archive），归档时 delta specs 合并进 `openspec/specs/`。
5. **关键决策用 adrkit**：以下四类必须进 `adr/decisions/`——平台可行性判定、插件形态/架构取舍、永久放弃的方向、跨 change 的语义约定；单 change 内的实现取舍留在 change 的 design.md，不双写。流程：`adrkit decide "<title>"` 生成于 `adr/decisions/`，补全 Problem/Decision/Alternatives/Consequences 后 `adrkit validate`。
6. **测试必须通过**：`cd plugin && node --test tests/*.test.mjs`（根目录 `npm test` 等价；单文件直接传路径）。新增功能必须带测试；平时跑覆盖改动面的最小检查，提交前全量通过。
7. **提交纪律**：提交分批按逻辑单元（chore/docs/spec/feat），**同一文件只出现在一个提交里**；`.gitignore` 排除 `archived/`、`node_modules/`、`*.tgz`、`.husky/_`。pre-commit 钩子（husky + lint-staged）自动对暂存文件跑 eslint --fix、prettier --write、`bash -n`。

## 插件架构速览（改动前先读）

- **`plugin/mcp/server.mjs`**：JSON-RPC stdio server，工具 init/run/log/export/clear；账本 `.auto/log.jsonl` 为 append-only 事实源。
- **`plugin/mcp/lib/`**：纯函数模块——`experiment`（度量/方向/confidence/plateau/doom-loop）、`ledger`（账本/segment）、`git`（commit/rollback）、`validate`（审计不变量）、`dashboard`（渲染）、`dashboard-server`（SSE）、`paths`（workingDir）。
- **护栏四层**：checks（输出正确）→ 审计不变量（账本自洽）→ 漂移检测（基准 hash）→ 次级度量约束（代价维度）。
- **hooks/**：zcode hook 脚本（Stop 续跑、PreToolUse 写保护、记忆注入、权限门禁、SessionStart）。
- **技能与命令**：`skills/autoresearch/`（循环规程 + references）、`skills/autoresearch-hooks/`（钩子教学）、`commands/`（autoresearch/export/clear/off/finalize）。

## 设计约束（历史决策，改动需谨慎）

- 平台不可行（勿再投入）：无限 auto-resume（zcode 无会话注入）、确定性 compaction（无 PreCompact 事件）、TUI widget/overlay（无 UI 扩展点）——用 Stop 3 次窗口、memory-inject、浏览器 dashboard 作为最终形态（见 ADR-3/4）。
- 信号均 advisory（plateau/doom-loop/drift 警告）除非明确硬校验（审计不变量、次级度量约束）——决策权留 agent 与用户。

## 常用命令

```bash
npm install                                  # 首次克隆后安装开发工具并启用 pre-commit 钩子
npm run lint / npm run lint:fix              # ESLint 检查 / 自动修复
npm run fmt / npm run fmt:check              # Prettier 格式化 / 检查
npm test                                     # 全量测试（等价于 cd plugin && node --test tests/*.test.mjs）
openspec validate --specs                    # 主规范校验
openspec validate --strict <change>          # change 校验
adrkit validate                              # 决策记录校验
```

CI（GitHub Actions，`.github/workflows/ci.yml`）在 push/PR 时跑 lint + fmt:check + test，Node 22/24 矩阵。
