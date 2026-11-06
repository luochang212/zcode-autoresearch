# Proposal

## Why

宿主会话目录 `.zcode/` 未纳入会话状态豁免，2026-11-05 一个会话内连续实证三处危害：keep 提交把 `.zcode/plans/*.md` 扫入实验提交（ml-auto d292055，当日已修 commit 路径但未走 change）；真实函数实测，每次 discard/crash/checks_failed 的回滚会以 `git clean -fd` 删除整个 `.zcode/`（数据破坏，strictly 重于已修的提交扫入）；`dirtyFiles` 把会话文件记脏，与 crash 门禁（crash + 脏树禁续跑）叠加可把循环永久锁死。豁免清单在四个 git 消费点各自枚举，`.auto`（首例）与 `.zcode`（第二例）已两次因同一枚举缺陷现场救火——机制层面需要一处声明、全消费点自愈。

## What Changes

- `git.ts` 四个消费点（keep 暂存 reset、`dirtyFiles`/`isDirty` 脏判定、回滚 checkout、回滚 clean）的会话状态目录集合统一为单一常量，并补入 `.zcode`
- 回滚 SHALL 不删除、不回退会话状态（tracked 与 untracked 一视同仁）；「工作树脏」判定（crash 门禁与回滚回报同源）排除会话状态
- `init_experiment` 向研究仓库 `.git/info/exclude` 幂等声明 `.zcode`（已忽略则跳过；失败不阻断 init——枚举层仍是正确性兜底）
- 回归测试固化全部场景；README（EN/CN）豁免清单与工具说明补齐
- design.md 一并留痕当日三个先行提交的规范偏差（retro）与 directionLabel 逗号截断「属实不修」的判定

## Capabilities

### New Capabilities

（无）

### Modified Capabilities

- `autoresearch/experiment-loop`: `log_experiment` 的会话状态豁免范围从 `.auto/` 扩为完整会话状态集合（`.auto/`、`.zcode/`、生成的 dashboard）；新增「会话状态豁免的统一集合与全覆盖」requirement，覆盖回滚不破坏会话状态、脏判定同源排除、init 幂等声明 ignore
