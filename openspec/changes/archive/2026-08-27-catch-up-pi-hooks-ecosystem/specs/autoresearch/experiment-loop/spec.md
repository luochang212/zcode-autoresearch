## ADDED Requirements

### Requirement: 钩子教学与示例资产

插件 SHALL 提供钩子教学 skill（`autoresearch-hooks`）与开箱即用的示例脚本（`.auto/hooks/` 场景覆盖：防重复失败、换思路、假设反思、学习日志、完成通知、最优实验打标），示例 SHALL 遵循迭代钩子 stdin 契约（before：`event/cwd/next_run/last_run/session`；after：`event/cwd/run_entry/session`），SHALL 不依赖 jq（用 node 解析 stdin），可直接复制到 `.auto/hooks/` 使用。

#### Scenario: 示例可直接使用
- **WHEN** 用户把示例脚本复制到 `.auto/hooks/before.sh` / `after.sh` 并 `chmod +x`
- **THEN** 循环中按契约触发（before 在 run 前、after 在 log 后），stdout 转 `*_steer`，脚本不因缺 jq 报错

#### Scenario: 教学 skill 指导编写
- **WHEN** agent 被要求"给这个循环加一个钩子"
- **THEN** `autoresearch-hooks` skill 提供契约、场景选型与 mock 测试步骤
