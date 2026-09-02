## Why

里程碑 1–3（`catch-up-pi-milestone-{1,2,3}`）已全部归档，`docs/research/pi-gap-analysis.md` 的 28 项差距矩阵写于实现之前——其"缺失 14 项"的结论已过时。需要以**当前代码实态**做一次验收审计：确认追平质量、暴露实现缩水与契约不一致（初步核对已发现 1 个 bug 级不一致：hook payload 缺 `asi` 字段，SKILL.md 声称、示例脚本依赖、server 未传），并为下一批 change 提供可信的差距基线。

## What Changes

- 新增验收审计报告 `docs/research/pi-parity-audit.md`：逐项核对 pi v1.6.2 的 28 项能力在 `plugin/`（commit `6c52535`）的实态，判定分级为「已对齐 / 超出 / 缩水 / 缺失 / 平台硬顶」，每项判定 MUST 附代码位置证据。
- 产出修正后的残留差距清单（初步核对为 7 条细粒度差距 + 3 条上轮路线图 P2 遗留），按严重度排序，可直接作为后续 change 输入。
- 记录超出 pi 的自有能力清单（审计不变量、基准漂移检测、次级度量约束等 9 条），作为后续对外叙事与 README 的素材。
- 不修改任何运行时代码——本 change 是研究/审计型，修复在后续 change 中进行。

## Capabilities

### New Capabilities

- `pi-parity-audit`: 验收审计报告的内容契约——28 项能力逐项实态判定、证据标注、残留差距分级与优先级排序（沿用 `research-pi-gap-analysis` 的报告契约模式）。

### Modified Capabilities

（无——不改任何现有行为规格。）

## Impact

- 新增文档：`docs/research/pi-parity-audit.md`。
- 影响 `docs/research/pi-gap-analysis.md` 的时效性声明（其差距矩阵章节将被审计报告标记为"已过时，以 audit 为准"）。
- 后续 change 队列：预计派生 1 个「hook 契约修复」change（G1）与可选的「finalize 补验证 / 示例补齐」change（G3）。
- 无代码、依赖、API 变更。
