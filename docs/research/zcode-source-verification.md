# ZCode 源码核验报告（v3.14.3）

ZCode 已开源（github.com/zai-org/ZCode，本地核验版本 v3.14.3，commit 29628c9）。
本文把插件依赖的平台假设逐条对照源码核验，替代此前 field-test / pi-gap-analysis
中「实测推断 + bundle 搜索」级别的证据。核验日期：2026-09-24。

文中路径均相对 ZCode 仓库根。

## 总结论

**插件的全部平台假设成立，无需行为修正。** ADR-3/4 的三条「平台硬顶」判断全部
被源码确认；插件用到的 hook 契约、清单字段、MCP 配置语法与真实 runtime 逐字吻合。
另发现若干此前不可知的实现细节（见「新事实」），暂无必须行动项，列可选改进。

## 平台硬顶判断核验（ADR-3/4）

| 判断                         | 源码证据                                                                                                                                                                                                                                                                               | 结论                                          |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| 无限 auto-resume 不可行      | `apps/zcode-cli/packages/core/src/runtime/methods/hooks.ts:10` `MAX_STOP_HOOK_CONTINUATIONS = 3`；`turn-stop.ts:208` 按 `stopHookContinuationCount < 3` 放行，计数在每用户轮次开始时重置（`turn.ts:591`）；历史注入只有 `injectHookAdditionalContextIntoMessageHistory` 一条 hook 通道 | ✅ 成立，且「3 次窗口」从经验值变为源码常量   |
| 无确定性 compaction 信号     | `HookEventName` 仅 7 事件，无 PreCompact；auto-compaction（`compact-active.ts`）不触发任何 hook；`SessionStartSource` 虽含 `"clear"/"compact"` 枚举，但全仓无调用路径（仅 `turn.ts` startup、`resume.ts` resume 两个触发点）                                                           | ✅ 成立。"compact" 是预留枚举，v3.14.3 未实装 |
| 无 TUI widget/overlay 扩展点 | core/CLI 内无 widget、overlay、statusline 类扩展接口                                                                                                                                                                                                                                   | ✅ 成立                                       |

## Hook 契约核验（全部吻合）

契约权威：`apps/zcode-cli/packages/contracts/src/hooks/index.ts`；
输出解释：`apps/zcode-cli/packages/core/src/hooks/output.ts`；
执行：`configured-runner-callback.ts` / `configured-runner-input.ts`。

- 事件集合：`SessionStart | UserPromptSubmit | PreToolUse | PermissionRequest |
PostToolUse | PostToolUseFailure | Stop`——插件用的 5 个全部有效。
- **process 型 hook 超时字段是 `timeoutMs`**（`workspaceHookProcessConfigSchema`）；
  `timeout` 属于 `command` 型。插件 hooks.json 的 `timeoutMs: 5000` 正确生效。
- stdin 兼容层：同时提供 zcode 原生 camelCase（`toolName/toolInput/…`）与 Claude
  兼容 snake_case（`tool_name/tool_input/session_id/transcript_path/
last_assistant_message/stop_hook_active/…`）。插件按双拼写读取是正确策略。
- 模板变量：`${ZCODE_PLUGIN_ROOT}`/`${ZCODE_PROJECT_DIR}` 等在 hook 的 command 与
  args 中展开（`expandPluginVariables`），同时以环境变量注入（含
  `ZCODE_PLUGIN_ID/NAME/DATA`）。
- Stop：`{decision:"block", reason}` → `stopShouldContinue=true` 且 `reason` 进入
  additionalContexts，模型在同一 turn 内继续。`continue:true` 亦可触发续跑；
  `continue:false` 对 Stop 事件被显式忽略。
- PreToolUse：`hookSpecificOutput.permissionDecision ∈ allow/ask/deny` +
  `permissionDecisionReason`；`hookEventName` 写错事件名会直接抛错——插件 5 个
  hook 的回写事件名全部正确。
- PermissionRequest：`hookSpecificOutput.decision` 为
  `{behavior:"allow",permissionUpdates?}|{behavior:"deny",interrupt?,message?}`——
  插件 permission-gate 的 deny+message 形状吻合。
- matcher 语义：`a|b|c` 简单列表或正则；PreToolUse 的 matchValue 是工具名，且
  zcode 真实写类工具就是 `Write`/`Edit`（`tool/handlers/{write,edit}.ts`），
  `ApplyPatch` 仅为兼容别名（`tool/compat.ts`）。插件 matcher
  `Write|Edit|ApplyPatch` 覆盖完整、无副作用。
- 退出码：0 = 成功（stdout 为合法 JSON 才解析，非 JSON 视为诊断文本不失败）；
  2 = 阻断；其余非零 = hook 失败。插件全部 fail-open 走 exit 0，安全。
- stdout 上限 `maxOutputBytes = 32768`；插件各 hook 输出远小于此。
- SessionStart `source ∈ startup|resume|clear|compact`，实际触发仅 startup/resume；
  插件 matcher `startup|resume` 恰好全覆盖。

## 插件系统核验

- 清单路径优先级：`.zcode-plugin/plugin.json` > `.claude-plugin` > `.codex-plugin`
  （`adapters/src/plugins/index.ts:100`），与上游市场 validate.py 一致。
- `hooks/hooks.json` 为标准位置，`{description, hooks}` 包装格式被识别。
- 插件 hooks **免 workspace trust review**：admission 只绑定 project 来源的
  `.zcode/config.json` 快照 hook（`configured-runner.ts:74-98`）；插件 hook
  （sourceKind `plugin`）无 admission，安装即生效。
- 插件 hooks 存在即令 runtime `enabled:true`（`bootstrap/app/runtime-config.ts`
  `mergeRuntimeHooks`），不受全局 hooks 默认关闭影响。
- `.mcp.json`（`mcpServers` 键）与 manifest `mcpServers` 双通道；stdio 支持
  `command/args/cwd/env/enabled/timeoutMs`；`command/args/cwd/env` 逐字段做
  `${ZCODE_PLUGIN_ROOT}/${ZCODE_PROJECT_DIR}/${user_config.X}` 模板展开
  （`adapters/src/plugins/mcp.ts:384-425`），sensitive 字段禁止进非敏感 sink。
- manifest `userConfig`：type（string/number/boolean/directory/file）、default、
  title、description、required、sensitive 全部真实消费；required 无 default 产生
  诊断。插件三项 number 配置与 `${user_config.*}` 注入路径有效。
- 技能：SKILL.md frontmatter 必须含 `name` 与 `description`（缺失即 error 诊断），
  description 上限 1024 字符（插件两个技能为 452/313）；qualified name 为
  `${pluginName}:${skillName}`。
- 命令：目录 + frontmatter `name`/`description` 供详情展示。
- 商店 listing：`displayName(_i18n)/description_i18n/icon/category/author/
homepage/heroImage/examplePrompts(_i18n)/requiresPaidPlan` 等可选展示字段由
  市场目录条目解析（`parseEntryStoreListing`）；官方分发 = 内置 + CDN sha256 zip
  （与上游 build_dist.py 的 dist 产物对应）。

## 新事实与可选改进（无必须行动项）

1. **Stop hook 输入带 `responseText`（完整回复）与 `toolCallCount`**：续跑 reason
   可引用更多上下文或做步数统计。现状够用，暂不动。
2. **PreToolUse 支持 `updatedInput` 改写入参**：guard-frozen 理论上可「改写」而非
   「拒绝」，但 deny 语义更简单可预期，维持现状。
3. **SessionStart `"compact"` 是预留枚举**：一旦未来版本实装压缩后触发，把插件
   matcher 扩为 `startup|resume|compact` 即可让账本记忆在压缩后立即重注入——
   这是 ADR-4 memory-inject 增强的天然延伸点。需要按 openspec change 流程实施
   （行为变更 + 版本升级），待 PR #1 合并后评估。
4. **PostToolUse / PostToolUseFailure 事件存在**：可用于账本旁路富化（如自动
   捕获 run_experiment 的工具结果预览），当前账本路径已够，仅记录。
5. **商店条目可选展示字段**：后续版本可为市场条目补 `displayName_i18n`、
   `examplePrompts` 等提升商店页观感，纯展示、零功能风险。

## 对文档/决策的影响

- ADR-3/4：结论全部维持；证据等级从「实测推断」升级为「源码确认」，无需改写。
- field-test / pi-gap-analysis：其中的 bundle 搜索类证据保留为历史方法，以上表为
  准。
- 上游市场仓库（zcode-plugins）内部校验的一致性检查已在本仓库
  `tests/marketplace-contract.test.ts` 本地化，上游规则演进时同步更新。
