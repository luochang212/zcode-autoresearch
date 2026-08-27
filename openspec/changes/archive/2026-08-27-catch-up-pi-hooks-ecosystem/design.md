## Context

实现依据：`docs/research/pi-gap-analysis.md` 最后可追平项 #26（钩子教学 + 示例生态）。机制（M1：before/after 执行 + stdin 契约 + 30s 超时 + 8KB 截断 + fail-open + `*_steer` 返回）已实现并验证。本 change 补生态：教学 skill + 开箱即用示例。示例从零编写（不参考 pi 脚本），用 node 解析 stdin（环境必有，避免 jq 依赖），遵循既有契约（before：`{event, cwd, next_run, last_run, session}`；after：`{event, cwd, run_entry, session}`；session 含 metric_name/direction/baseline_metric/best_metric/run_count）。

## Goals / Non-Goals

**Goals:**

- 用户复制示例到 `.auto/hooks/` 即可获得确定性行为（防重复失败、换思路、学习日志、通知、最优打标）。
- 教学 skill 让 agent 能自己写出符合契约的钩子（场景选型 + mock 测试 + 提交）。
- 示例全部 node 解析 stdin，无 jq 依赖；macOS/Linux 可用。

**Non-Goals:**

- 不改变钩子机制（不改 server 执行逻辑、不改契约）。
- 不把示例数量堆到 pi 的 10 个——精选 6 个覆盖高频场景。
- 不做钩子输出入账本（评估过的账本格式变更，后置）。

## Decisions

**1. 示例 6 个（3 before + 3 after），语义参考 pi、代码从零写：**

- before：`anti-thrash`（读 jsonl 尾 N 条，连续 discard/crash ≥ 阈值 → 结构反思建议）、`idea-rotator`（读 `.auto/ideas.md` 的未尝试方向，轮换提醒）、`hypothesis-reflection`（检查 agent 是否给出本轮假设——通过 last_run.asi.hypothesis 缺失时提醒）。
- after：`learnings-journal`（追加 markdown 到 `.auto/learnings.md`）、`macos-notify`（osascript 弹通知，macOS 专用）、`auto-tag-winners`（新 best 打 `autoresearch/best-run-N-metric` git tag）。
- 全部：bash 外壳 + node 内嵌解析 stdin（heredoc），短小自包含（20-40 行），带注释说明契约字段。

**2. 教学 skill `autoresearch-hooks`：** 结构 = 契约速查（payload 字段表）→ 场景选型（"要提醒/要副作用"二分决策树）→ 编写步骤（读 prompt.md/measure.sh → 选型 → 起手示例 → mock stdin 冒烟 → chmod +x 提交）→ 准则（静默为默认、一钩子一关注点、30s/8KB 边界、fail-open）。参考 pi 的教学结构但内容重写。

**3. mock 测试工具：** 教学 skill 内嵌一个 `node -e` 一行式生成示例 payload（`{"event":"before","cwd":".","next_run":1,...}`）管道给钩子脚本验证，不新增文件。

**4. 集成测试：** `tests/hooks.test.mjs` 扩展——对 6 个示例逐一：构造对应 payload 管道运行，断言（anti-thrash 连败时输出建议、否则静默；auto-tag-winners keep 且新 best 时打 tag、否则静默；macos-notify 存在 osascript 时输出通知命令…）。测试需验证"复制即用"契约。

## Risks / Trade-offs

- [示例读 jsonl 路径假设] → 统一用 payload 的 `cwd` + `.auto/log.jsonl`；测试覆盖。
- [macos-notify 平台局限] → 明确标注 macOS 专用（osascript），README 说明。
- [示例脚本被误当"必须装"的清单] → 文档写明"按需取用，一个即可"。
- [教学 skill 膨胀] → 保持 ≤120 行，契约表 + 决策树 + 步骤，不堆示例全文（示例在 hooks/examples/）。

## Open Questions

（无。）
