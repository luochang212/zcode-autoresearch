---
status: accepted
date: 2026-08-27
created: 2026-08-27
---

# ADR: 1 zcode autoresearch plugin adopts MCP tools + skill + hooks architecture

## Problem

为 zcode 制作 autoresearch 插件（agent 在固定度量上自主迭代优化）需要选择插件形态。调研了三条现有路线：karpathy 的纯 prompt 章程（archived/karpathy-autoresearch）、pi-autoresearch 的 extension 工具三件套（archived/pi-autoresearch）、uditgoenka 的多命令 skill 套件（archived/uditgoenka-autoresearch）。核心矛盾：循环中"agent 不可靠的部分"（计时、度量解析、commit/revert、账本落盘、输出截断、续跑）如果留在 prompt 里就是软契约（karpathy 路线的弱点），全部塞进命令 markdown 则无法强制（uditgoenka 路线的护栏仅限 Claude Code hooks）。

## Decision

插件采用三层解耦，映射到 zcode 插件五类组件（依据 zcode-plugins @ c06b727 官方文档）：

1. **MCP 服务承载机制**（`.mcp.json` + `mcp/server.mjs`）：`init_experiment` / `run_experiment` / `log_experiment` 三件套工具，实现计时、`METRIC name=value` 解析、10 行/4KB 回传截断、benchmark 脚本锁定、checks 背压、keep 自动 commit / 非 keep 自动 revert、`.auto/log.jsonl` append-only 账本。借自 pi-autoresearch。
2. **skill 承载流程**：`skills/autoresearch/SKILL.md` 保持薄路由（≤60 行，安全不变量 + 循环规程 + 状态文件指针），详细协议放 `references/` 按需展开。借自 uditgoenka 的薄路由教训（其 SKILL.md 两个版本内从 41 行膨胀回 107 行，协议放 reference 才能延缓回流）。
3. **hooks 承载护栏与续跑**（`hooks/hooks.json`）：Stop hook（`decision:block` + reason）驱动循环续跑；PreToolUse hook deny 写保护 `.auto/` 度量脚本（把 karpathy 的 prompt 契约升级为硬护栏）；UserPromptSubmit/SessionStart 重注入账本尾行（compaction 后记忆再注入）。

首版只做 core loop + setup/finalize + dashboard，不做 debug/security/ship 等泛化命令（uditgoenka 14 个命令中仅 2 个属于循环本体，泛化过度稀释定位）。

## Alternatives considered

- **纯 prompt 章程**（karpathy 路线）：零开发成本、全宿主可跑，但所有护栏是软契约，度量可被 agent 意外篡改，无计时/解析/账本的强制保证。作为 zcode 插件失去存在的意义（插件的价值恰在硬化）。
- **纯 skill + 命令 markdown 套件**（uditgoenka 路线）：多宿主分发成熟，但 agent 自跑 Verify 命令意味着度量获取路径完全不受控，且 14 命令形态已证明泛化边界失守。
- **等一个官方 extension API**（pi 路线的原生形态）：zcode 插件体系当前无 extension 运行时 API，MCP + hooks 是当下可获得的最接近等价物。

## Consequences

- 买到了：度量获取与账本的机制级保证（工具内锁定）、硬护栏（PreToolUse deny）、人机上下文分离（回执给 agent、账本/dashboard 给人）、跨会话恢复（`.auto/` 事实源）。
- 付出的：必须实现并维护一个 stdio MCP 服务（换行分隔 JSON-RPC）；zcode Stop hook 连续 3 次 block 硬顶；**2026-08-27 实证确认 zcode 无会话注入 API**（bundle 零命中），过夜无人值守不可用，续跑策略定为「Stop block 3 次窗口 + 单轮多实验 + 用户再触发」，见研究报告 §4.1①、§6.2-1；MCP 工具无动态可见性，模式门禁降级为工具内拒绝。
- 补充实证（2026-08-27）：MCP stdio server 会话内长驻，进程内状态跨多次 tools/call 保持（pid 3945 实验）；hook matcher 只匹配工具名，路径过滤需 hook 内读 stdin；无头模式不执行 hooks（护栏以交互式会话为目标场景）。详见研究报告 §4.1。
