## 1. 不可行项重审

- [x] 1.1 复核 zcode 能力面（bundle v0.16.5 + 文档）：PreCompact/会话注入/UI 扩展点零命中确认；查是否有新事件/新 API 变更
- [x] 1.2 为 5 项不可行项逐一设计替代方案并评估：memory-inject 增强（compaction 变相）、无头循环驱动（auto-resume 变相）、widget/overlay（无替代确认）、settle（无需）、无头 hooks 边界；每项给成本量级与平台硬顶边界

## 2. 生态扫描

- [x] 2.1 搜索 autoresearch 生态：GitHub（gh search）+ WebSearch（"autoresearch"、"self-improving agent loop"、"agent experiment loop"），收集 pi/karpathy/uditgoenka 之外的项目
- [x] 2.2 逐个评估：定位 / 亮点能力 / 可借鉴性（移植 zcode 的价值与成本），附来源

## 3. 综合与路线图

- [x] 3.1 我方现状复核（对照差距矩阵与最新 plugin/ 代码，确认已追平项无遗漏）
- [x] 3.2 撰写 docs/research/next-steps.md：不可行项重审表 + 生态扫描表 + 路线图（排序/交付物/验证）
- [x] 3.3 ADR 记录方向决策（若与既有决策冲突），报告引用编号

## 4. 收尾

- [x] 4.1 openspec validate --strict 通过，全部任务勾选，adrkit validate 通过
