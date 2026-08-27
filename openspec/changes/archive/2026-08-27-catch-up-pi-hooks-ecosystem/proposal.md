## Why

差距矩阵（`docs/research/pi-gap-analysis.md`）最后一个可追平项 #26：pi 的钩子生态（教学 skill + 10 个开箱即用示例）。我们已有钩子**机制**（M1：before/after 执行 + 契约），但缺**生态**——用户要写钩子得自己从零琢磨。补上教学 skill 与示例脚本，让"抄着就能用"。

## What Changes

- 新增 `plugin/skills/autoresearch-hooks/SKILL.md`：教 agent 写 before/after 钩子的方法论（契约回顾、场景选型、stdin mock 测试、提交准则）。
- 新增 `plugin/hooks/examples/`：6 个自包含示例脚本（3 before + 3 after，node 解析 stdin 不依赖 jq）：
  - before：`anti-thrash`（连续失败→结构反思）、`idea-rotator`（换思路）、`hypothesis-reflection`（假设反思）
  - after：`learnings-journal`（学习日志）、`macos-notify`（完成通知）、`auto-tag-winners`（最优实验打 git tag）
- SKILL.md 主文件迭代钩子小节扩展（指向 hooks skill + examples）；README 更新。
- 集成测试：示例脚本在真实循环中按契约触发。

## Capabilities

### New Capabilities

（无。）

### Modified Capabilities

- `autoresearch/experiment-loop`: 新增钩子教学与示例资产要求（Requirement 新增）。

## Impact

- `plugin/skills/autoresearch-hooks/SKILL.md`（新）。
- `plugin/hooks/examples/{before,after}/*.sh`（新，6 个）。
- `plugin/skills/autoresearch/SKILL.md`、`plugin/README.md`（更新）。
- `plugin/tests/`：示例契约测试。
- 兼容性：纯新增资产，不改运行行为。
