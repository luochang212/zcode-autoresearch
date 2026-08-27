## Context

实现依据：`docs/research/pi-gap-analysis.md` 里程碑 3（#1 工具门禁近似、#2 自动激活、#3 激活决策持久化）。两项均为 zcode 受限近似：zcode 无运行时模式状态机（MCP 工具恒定可见），也无权限层之外的"工具可见性"API。近似策略：PermissionRequest hook 在权限询问路径拒绝无会话时的实验工具；SessionStart 用"提示即激活"代替运行时模式切换；off 决策持久化到 `.auto/config.json`。

## Goals / Non-Goals

**Goals:**
- 无会话时实验工具在权限层被拒（近似门禁）。
- 重开会话自动感知可续跑的实验并引导进入。
- 用户显式关闭后不再被反复提示（决策持久化）。

**Non-Goals:**
- 不做真正的模式状态机/工具可见性切换（平台不可行，ADR-3 记录）。
- 不拦截低风险工具调用的自动批准路径（平台行为，fail-open）。

## Decisions

**1. 门禁判断 = "有无活动会话"（`.auto/log.jsonl` 存在与否），而非模式标记。** 理由：会话存在性可从磁盘可靠判定，且语义自然（无会话时实验工具无意义）。无会话 → deny；有会话 → allow。备选（维护运行时模式标记）——放弃：zcode 无模式事件通道，标记状态不可靠。

**2. off 决策 = `.auto/config.json` 的 `autoresearchOff: true`，由 `/autoresearch:off` 命令写入。** SessionStart 读取：有 off → 不提示；无 off 且有 log → 提示续跑。clear 已删 log（自然无会话），off 覆盖"保留会话但暂停"场景。备选（独立 state 文件）——放弃：config.json 已是会话配置载体。

**3. PermissionRequest hook 全工具 matcher（不写死 matcher，脚本内判断工具名）。** 脚本读 stdin 的 `tool_name`，属于实验工具集且无会话 → deny。理由：PermissionRequest 的 matcher 语义与 PreToolUse 相同（工具名），但工具集判断放脚本内更清晰、可单测。

## Risks / Trade-offs

- [门禁覆盖不全（低风险工具自动批准不触发 PermissionRequest）] → 文档与 SKILL 明示"近似"；工具内检查 + skill 指引为兜底（已有）。
- [off 后用户想重开] → `/autoresearch:autoresearch` 手动进入（命令不检查 off 标记，或检查后提示覆盖）。
- [误 deny 有会话场景] → 判定仅依赖 log.jsonl 存在性，与 clear/init 语义一致（clear 删 log、init 建 log）。

## Open Questions

（无。）
