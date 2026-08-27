## Context

既有基础：`docs/research/autoresearch-survey.md` §2 已有 pi 机制级分析（三件套、auto-resume、jsonl、护栏、token 经济），本 change 在其上做**定向深挖**（触发机制全路径、能力全清单、效果证据）并新增**我方插件审计**与**追平路线图**。研究素材：`archived/pi-autoresearch`（v1.6.2 只读样本，含 git 历史）、npm registry 与 GitHub API（只读）、我方 `plugin/`（只读审计）。

## Goals / Non-Goals

**Goals:**

- 差距矩阵达到"每个能力项可决策"粒度（可追平/受限/不可行 + 依据）。
- 效果证据区分"验证过的"与"营销声称"（沿用 uditgoenka 教训）。
- 追平路线图可直接作为后续 change 的任务输入。

**Non-Goals:**

- 不实现任何追平项（研究先行）。
- 不修改 `plugin/` 代码。
- 不评价 pi 的价值主张（是否值得用），只做差距。

## Decisions

**1. 研究方法：pi 全量代码深读 + npm/GitHub 数据核实 + 我方插件逐文件审计，三线并行。**
理由：pi 效果数据独立于代码（下载量/stars/用户证据），派子代理并行省时；我方审计由主线程做（对自家代码最熟）。pi 代码深读聚焦上次研究未覆盖的部分：activation 判定（`shouldAutoActivateAutoresearch` 及调用点）、`/autoresearch` 命令全子命令、dashboard 渲染全链路、finalize.sh、hooks skill、session 生命周期事件（`before_agent_start`/`session_before_compact` 等）的注入语义。

**2. 差距矩阵分类标准（写死，防主观）：**

- **可追平**：zcode 存在功能等价原语（工具/命令/hook/MCP 长驻/静态文件），实现无平台阻碍。
- **zcode 受限**：zcode 有替代原语但能力有损（如 Stop 3 次窗口 vs 无限 auto-resume；静态 HTML vs SSE 实时）。
- **平台不可行**：依赖 pi 专有 API 且 zcode 无等价（如 `sendUserMessage` 会话注入、动态工具可见性）。
  依据 `docs/research/autoresearch-survey.md` §4.1 的实证（bundle 零命中、MCP 长驻实测、hook 契约）。

**3. 效果证据分级：S 级（可复现实验/代码内证据）、A 级（README/CHANGELOG 声称+代码佐证）、B 级（仅声称或第三方未验证）。** 报告标注每项级别，防止把营销当效果。

**4. 路线图排序公式：Priority = 差距对核心循环的价值 × 用户可感知度 ÷ 实现成本**，先做高价值低成本（quick wins），再做高价值高成本，受限项单独列替代方案评估。

## Risks / Trade-offs

- [pi 仓库版本与 npm 最新版有差异（本地 v1.6.2 vs 线上最新）] → 效果数据以 npm registry 实查为准，代码行为以本地样本为准并在报告标注版本。
- [npm 下载量/star 数随时间变动] → 标注查询日期。
- [我方审计依赖对自家代码的熟悉度，可能遗漏] → 按 pi 能力清单逐项核对（不凭记忆），每项对照实际文件。

## Open Questions

（无——研究执行中的未知在报告"开放问题"章节交付，不阻塞本 change。）
