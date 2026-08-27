## 1. 示例钩子（从零写，node 解析，6 个）

- [x] 1.1 before/anti-thrash.sh：读 jsonl 尾 5 条，连续 discard/crash ≥ 3 → 输出结构反思建议；否则静默
- [x] 1.2 before/idea-rotator.sh：读 .auto/ideas.md 未尝试方向，轮换输出一个提醒；无清单静默
- [x] 1.3 before/hypothesis-reflection.sh：last_run 无 asi.hypothesis 时提醒"先给假设"；否则静默
- [x] 1.4 after/learnings-journal.sh：追加一行 markdown 到 .auto/learnings.md（run/status/metric/description）
- [x] 1.5 after/macos-notify.sh：osascript 弹通知（macOS 专用，无 osascript 静默）
- [x] 1.6 after/auto-tag-winners.sh：keep 且 metric==best_metric 时打 `autoresearch/best-run-N-metric` git tag；否则静默

## 2. 教学 skill

- [x] 2.1 编写 skills/autoresearch-hooks/SKILL.md（≤120 行）：契约速查表、场景选型决策树、编写步骤、mock 测试一行式、准则

## 3. 接线与文档

- [x] 3.1 SKILL.md 主文件迭代钩子小节指向 autoresearch-hooks skill 与 examples/；README 增补示例清单与"按需取用"说明

## 4. 测试与收尾

- [x] 4.1 tests/hooks.test.mjs 扩展：6 个示例逐一构造 payload 断言（触发/静默/副作用），node --test 全量通过
- [x] 4.2 集成验证：真实循环挂 anti-thrash + learnings-journal，确认按契约触发
- [x] 4.3 openspec validate --strict 通过，全部任务勾选，adrkit validate 通过
