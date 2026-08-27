# zcode-autoresearch — 项目指令

## 项目是什么

为 zcode 制作 **autoresearch 插件**（自主实验循环：改代码 → 跑基准 → keep/discard → 重复）的仓库，同时承载配套的 openspec 规划与 adr-kit 决策记录。研究依据见 `docs/research/`。

## 仓库结构

| 目录 | 内容 | 性质 |
|---|---|---|
| `plugin/` | 插件本体：`.zcode-plugin/`、`mcp/`（server + lib）、`hooks/`、`skills/`、`commands/`、`scripts/`、`tests/` | 可修改 |
| `openspec/` | `specs/`（主规范）、`changes/`（活动）、`changes/archive/`（已归档） | 走 change 流程修改 |
| `adr/decisions/` | adr-kit 决策记录（1-4） | 走 adrkit 追加 |
| `docs/research/` | 研究报告（survey / field-test / pi-gap / next-steps） | 可补充 |
| `archived/` | 四个外部 autoresearch 仓库的只读 clone（karpathy/pi/uditgoenka/zcode-plugins） | **只读研究素材** |

## 铁律

1. **`archived/` 只读**：不修改、不分析后改动、不进 git（`.gitignore` 已排除）。它是外部代码样本，仅作研究引用。
2. **零第三方依赖**：插件所有代码只允许 Node 标准库（`plugin/` 无 `package.json` 依赖、无 `node_modules`、无 `npm install` 流程）。hooks 与 MCP server 都是 `.mjs`。
3. **隐私卫生**：仓库内不得出现 API key、绝对路径（`/Users/...`、`/tmp/...`）、个人邮箱；路径一律相对或模板变量（`${ZCODE_PLUGIN_ROOT}`、`${ZCODE_PROJECT_DIR}`）。
4. **插件改动走 openspec change**：任何行为变更先 `openspec new change`（propose → specs/design/tasks → `openspec validate --strict` → apply → archive），归档时 delta specs 合并进 `openspec/specs/`。
5. **关键决策用 adrkit**：`adrkit decide "<title>"` 生成于 `adr/decisions/`，补全 Problem/Decision/Alternatives/Consequences 后 `adrkit validate`。
6. **测试必须通过**：`cd plugin && node --test tests/*.test.mjs`（当前 58 个）。新增功能必须带测试。
7. **提交纪律**：提交分批按逻辑单元（chore/docs/spec/feat），**同一文件只出现在一个提交里**；`.gitignore` 排除 `archived/`、`node_modules/`、`*.tgz`。

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
cd plugin && node --test tests/*.test.mjs   # 全量测试
openspec validate --specs                    # 主规范校验
openspec validate --strict <change>          # change 校验
adrkit validate                              # 决策记录校验
```
