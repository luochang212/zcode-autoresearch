## Why

研究阶段已结案（`docs/research/autoresearch-survey.md` + ADR-1/2）：zcode 无会话注入 API（Stop hook 是唯一续跑原语，3 次硬顶）、MCP server 会话内长驻（实测 pid 保持）、hook matcher 只匹配工具名、权限层有 PermissionRequest 门禁。形态已定为「MCP 工具承载机制 + skill 承载流程 + hooks 承载护栏与续跑」。现在实现 zcode autoresearch 插件本体，让 agent 在固定度量上自主迭代优化（autoresearch 循环）。

## What Changes

- 新增 `plugin/` 子目录作为插件根（用户确认）：`.zcode-plugin/plugin.json`（manifest name `autoresearch`）、`mcp/`（MCP server 实现 init/run/log 三件套工具）、`skills/`（薄路由 SKILL.md + references）、`commands/`（`/autoresearch:loop`、`/autoresearch:export`）、`hooks/`（hooks.json + 4 个 hook 脚本）。
- 新增根级 `marketplace.json` 指向 `plugin/`，使本仓库可作为插件市场源。
- **核心循环三件套**（用户确认包含）：`init_experiment`（会话名/度量/方向 → 写 `.auto/log.jsonl` config 行）、`run_experiment`（跑 benchmark、wall-clock 计时、`METRIC name=value` 解析、LLM 回传 10 行/4KB 截断、checks 背压）、`log_experiment`（keep 自动 commit / 非 keep 自动 revert 豁免 `.auto/`、confidence/MAD 噪声提示、ASI 诊断）。
- **护栏与记忆**（用户确认包含）：Stop hook 续跑（block + reason，3 次窗口）、PreToolUse 写保护 `.auto/`（measure.sh/checks.sh 冻结）、UserPromptSubmit 记忆注入账本尾行、SessionStart 初始化提示。
- **单元测试**（用户确认包含）：对 MCP server 核心逻辑（度量解析、keep/discard 判定、账本 segment、路径豁免）的 node 测试。
- **dashboard export**（用户确认包含）：`/autoresearch:export` 读取 `.auto/log.jsonl` 渲染静态 HTML。
- 不修改 archived/ 研究样本与既有 docs/adr/openspec 内容。

## Capabilities

### New Capabilities

- `autoresearch/experiment-loop`: 实验循环的行为契约——init/run/log 三件套工具的输入输出、`.auto/log.jsonl` 账本格式与 segment、度量解析与方向判定、keep 提交 / 非 keep 回滚的 git 语义、迭代上限。
- `autoresearch/guardrails`: 护栏与记忆的行为契约——benchmark 脚本锁定、checks 正确性背压、`.auto/` 写保护、Stop 续跑窗口、记忆注入。
- `autoresearch/dashboard`: dashboard 导出的行为契约——`/autoresearch:export` 从账本生成静态 HTML 的内容与格式。

### Modified Capabilities

（无——本仓库此前无 capability。）

## Impact

- 新增 `plugin/` 目录（manifest、mcp、skills、commands、hooks、tests、README）。
- 新增根级 `marketplace.json`。
- 依赖：仅 Node.js（zcode 运行时同款，MCP server 与 hooks 均为 node/mjs 脚本）；无第三方 npm 依赖（stdlib 即可），避免插件安装需要 npm install。
- 验证方式：单元测试（server 逻辑）+ 无头 CLI 集成测试（fake HOME 沙盒驱动真实会话调用三件套）。
