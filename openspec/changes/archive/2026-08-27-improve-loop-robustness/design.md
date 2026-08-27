## Context

实现依据：`docs/research/next-steps.md` P0（ADR-4）：memory-inject 增强（compaction 变相）+ doom-loop 检测（ml-intern 借鉴）。两件都是低成本、零平台依赖、直接补长跑健壮性。doom-loop 检测在文本层做（对 run 的 description/asi.hypothesis 规范化比较），因为我们的"动作"就是 agent 的假设描述。

## Goals / Non-Goals

**Goals:**
- agent 陷入重复/震荡尝试时，工具和记忆都给出明确"换方向"信号。
- 长会话（数千实验）的记忆注入从"最近 3 条"升级为"聚合摘要"，方向去重防重复尝试。
- 纯函数可单测，注入文本仍精简。

**Non-Goals:**
- 不做事件溯源/审计不变量（那是 P1，leo 借鉴，本 change 不含）。
- 不做 LLM 语义相似度判断（纯文本规范化，避免依赖与成本）。
- 不改变账本格式与既有注入契约（SessionStart/off 决策保持）。

## Decisions

**1. doom-loop 检测 = 文本规范化 + 两种模式（ml-intern 思路，文本层简化）：**
- `normalizeHypothesis(text)`：小写、去非字母数字、分词排序后 join（消除措辞差异），不足 2 个 token 视为无信息（跳过）。
- `detectDoomLoop(runs, { window = 6 })`：
  - 取最近 window 条含 description/asi.hypothesis 的 run。
  - **连续重复**：最近 3 条规范化后相同（或互相包含）→ `{doomLoop: true, pattern: 'repeat'}`。
  - **震荡**：最近 4 条成 [X,Y,X,Y]（规范化后 X==X、Y==Y 且 X≠Y）→ `{doomLoop: true, pattern: 'oscillate'}`。
  - 否则 null。
备选（词频/embedding 相似度）——放弃：成本与不确定性，文本层够用。

**2. 方向标签提炼 = description 首段/asi.hypothesis 截断：** `directionLabel(run)`：优先 asi.hypothesis，其次 description，取首个逗号/句号/分号前的片段（≤40 字符），空则用 status。聚合时去重（规范化后相同视为同一方向）。

**3. 聚合摘要格式（memory-inject）：** 单块文本：进度行（segment/metric/direction/run/limit/baseline/best）→ 已尝试方向（去重列表，≤8 个）→ best 轨迹（baseline → 各 keep 的 metric，≤6 步）→ 最近 3 条（含 ASI 提炼）→ doom-loop 提示（若有）→ 下一步。

**4. 信号分布：** `detectDoomLoop` 供三处复用——`log_experiment` 返回 `doom_loop` + hint；`memory-inject` 注入提示；`stop-continue` reason 提示。均为 advisory（不硬停，保持决策权在 agent/用户）。

## Risks / Trade-offs

- [文本规范化误判（两个真不同假设措辞相似）] → 阈值保守（仅精确规范化相同/成对交替），宁漏报不误报；提示是 advisory。
- [方向去重过度（变体被合并）] → 规范化去重 + 保留最近一次尝试时间；提示"已尝试"供参考。
- [注入文本变长] → 聚合控制在 ≤1.5KB（比 3 条 ASI 略长，但信息密度更高）；SKILL 说明。

## Open Questions

（无。）
