# 设计：harness-edit-hardening

## Context

harness-edit-loop 归档后 worth-fix 审视发现两处缺口（验证记录见 proposal）。根因一句话：**P1** 是边界类内容（scope）被放进了内容可编辑的文件（prompt.md），而写保护是路径级的，管不住区块；**P2** 是 experience 的保真被写在了参考文档里，却没接进唯一会删除它的流程（finalize 命令的清理注释）。

## Goals / Non-Goals

**Goals**

- 范围边界获得与深层目标同级的机械保护（同一 FROZEN 机制）
- finalize 流程保证 experience.md 先人审并入、后删除

**Non-Goals**

- 不做 prompt.md 目标/范围引用段的哈希校验（P3，维持 advisory：初写后很少动，diff 可审计；记录为不修及理由）
- 不动 verdict 纪律、触发条件、KEEP_BASE（P4/P5 维持原判）
- 不改 finalize.sh 脚本（它本就不删 `.auto`；删除责任在命令文本）

## Decisions

**D1：scope 独立成冻结文件，不做成 prompt.md 受保护区块。**
与 D1(goal.md) 同构：路径级 hook 只能保护整文件；独立 `.auto/scope.md` 让"边界不可变"复用被验证的机制（一行 FROZEN）。prompt.md 的范围段改为逐字引用（引用即审计）。备选"hook 解析 prompt.md 拦截区块编辑"被否：内容级匹配脆弱且把护栏逻辑写进文本比对。副作用照单全收：**收窄**范围也需用户手改或新 segment，边界双向冻结，语义与"用户同意的边界"一致，agent 想收窄时向用户提出即可。

**D2：finalize 的 experience 人审做成正式步骤，清理以它为前提。**
插在 cron 清理之后、报告之前：与用户过 experience.md → 幸存 lesson 并入 AGENTS.md → 之后才允许 `rm -r .auto`。命令文本是删除的唯一责任方（脚本无涉），修文本即修根因。

**D3：旧会话兼容走 advisory。**
无 scope.md 的存量会话：hook 无感（文件不存在），setup-guide 只对新建会话生效；引用一致性检查按 P3 维持人读。

## Risks / Trade-offs

- scope 双向冻结可能让"合理收窄"也变麻烦 → agent 的正常出口是向用户提出；用户手改文件绕过 hook 与 measure.sh 同一信任模型
- finalize 多一步人审 → 该命令本来就是人审节点（分支整理需用户确认），成本可接受

## Open Questions

无。
