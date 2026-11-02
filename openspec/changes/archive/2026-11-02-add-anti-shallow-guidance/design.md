# 设计：反浅层认知引导

## D1. 为什么是协议/素材级，而不是机械信号

- tier 分类（调参 vs 结构）无法从文本可靠机械化——实测确认 `detectDoomLoop` 对六轮互异调参返回 `null` 不是 bug，而是 Jaccard 相似度的语义边界；让它识别「浅层」需要语义分类器，超出本插件零依赖 + advisory 哲学（ADR-5）。
- 因此采用**约定（前缀）+ 提醒（rotator/self-check）**两层：约定让浅层变得可统计，提醒把统计结果变成 advisory steer。检测语义零改动。

## D2. 前缀约定细节

- 前缀集合：`[struct]` / `[tune]` / `[ensemble]`，英文短标签，置于 `asi.hypothesis` 开头（后接空格 + 自由文本）。选英文与账本/dashboard 字段惯例一致；集合封闭（不是开放 tag），rotator 只认这三个。
- 已知副作用并接受：`directionLabel`（experiment.ts:199）取 hypothesis 首子句，dashboard 方向标签会显示 `[struct] …` 前缀。这本身是信息（标签层可见 tier），不为去掉它改代码。
- 未标注合法：旧账本、临时实验、用户手写账本都不该被拒绝；代价只是浅层提醒对未标注行失明，已在 requirement 中明示。

## D3. rotator 浅层判定语义

- 窗口取账本最近 6 条 run 行（与 doom-loop 检测窗口一致，`window = 6`）。
- 只统计**已标注**行；已标注 ≥3 且全为 `[tune]`/`[ensemble]` → 提醒。阈值 3 与 doom repeat 的最小样本一致。
- 账本读取按行数取尾部即可（不整文件解析 JSON——逐行 `JSON.parse`，解析失败的行跳过，fail-open）。
- 提醒与既有轮转建议共存（先轮转建议、后浅层提醒），都只是 stdout 文本。

## D4. self-check 示例的状态与间隔

- 状态文件 `.auto/selfcheck.state`（epoch 秒，单行）：由钩子自己写。`.auto/` 是会话目录、随 `clear` 清理，不污染目标仓库其他位置；与冻结文件集不相交（`frozen.ts` 不含它，写它不触发 guard-frozen）。
- 间隔默认 3600 秒；`session.started_at_epoch` 缺失（旧账本）→ 静默（无法判断段时长，宁可不提醒）。
- 状态文件缺失视为「从未自检」→ 立即触发一次（长会话第一个小时就该自检）。
- 提醒文案为固定问题清单（精选自 AGENT4SCI checklist：方向是否结构性、失败是否做过根因、账本是否有未吸收的洞见），英文输出与现有示例一致。
- 与无人值守的关系：任何装了它的循环都生效，但对过夜长跑最有价值；与 ADR-7 的 Cron 自唤醒正交（Cron 管「会话还活着吗」，self-check 管「活着的人在往哪滑」）。

## D5. 明确不做

- 不改 MCP 代码 / 类型 / 检测函数；不给前缀加机械校验或 dashboard 专门渲染（方向标签顺带显示前缀已足够）。
- 不做 agent4sci 式硬阻断（exit 2 锁）——违反 advisory 哲学，模式备查于 agent4sci-notes §2.3。
- 不把构思步做成强制工具调用（如 init 后拒绝 run 直至 ideas.md 存在）——超出 advisory 边界，且会被「用户就是想直接跑一个假设」的正常用法挡住。规程文本用 SHALL 表述循环应包含该步，执行裁量留给 agent 与用户。
