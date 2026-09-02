## MODIFIED Requirements

### Requirement: finalize 将保留实验整理为独立分支

`/autoresearch:finalize` 命令 SHALL 引导 agent 把账本中的 kept 实验按文件依赖分组，并通过 `scripts/finalize.sh` 从基线为每组创建独立分支（`autoresearch/<goal>/NN-<slug>`）。脚本 SHALL 以**增量口径**计算各组文件集：第 i 组的文件集为 `git diff --name-status <上一组 last_commit 或 merge-base> <本组 last_commit>`（剔除会话文件），查重校验与分支构造 SHALL 复用同一增量集合，故第 N 个分支只含本组改动。组内 status=D 的文件 SHALL 以删除语义落入分支（`git rm`），不得因 pathspec 错误失败。脚本 SHALL 验证各分支文件并集与原分支一致（剔除会话文件）；构造阶段的任何失败（含分支名冲突、verify 失败）SHALL 触发完整回滚——先恢复原分支再删除本次已建分支——不产生残留分支，修复输入后可立即重跑。`groups.json` 路径 SHALL 支持裸相对路径（相对调用者 cwd），解析经参数传递而非字符串插值，不受路径中引号影响；文件名含空格 SHALL 被正确处理（NUL 分隔枚举 + 整行比对）。

#### Scenario: 分组整理

- **WHEN** 账本含多个 kept commit 且改动文件不重叠
- **THEN** 生成多个独立分支，第 N 个分支只含第 N 组增量改动（不混入前序组文件），并集验证通过

#### Scenario: 组内含删除文件

- **WHEN** 某组的增量 diff 含 status=D 的文件
- **THEN** 该分支正确反映删除（文件不存在于分支树中），脚本成功完成

#### Scenario: 失败回滚

- **WHEN** 分组验证失败（如文件重叠未合并）或构造中途失败（如目标分支名已存在）
- **THEN** 脚本回滚（先恢复原分支、再删除本次已建分支，含正在构造中的分支），原分支状态不变，无残留分支，修复输入后重跑可成功

#### Scenario: 裸相对路径 groups.json

- **WHEN** 调用者以相对项目根的路径（如 `groups.json`）传入第二参数
- **THEN** 脚本正常解析并执行，不报模块找不到

#### Scenario: 含空格文件名

- **WHEN** 组内改动文件路径含空格
- **THEN** 文件被作为整体处理，分支内容与 overlap 校验均正确
