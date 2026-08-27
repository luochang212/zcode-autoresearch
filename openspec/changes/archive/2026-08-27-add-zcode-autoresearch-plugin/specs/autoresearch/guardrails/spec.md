## Purpose

定义 zcode autoresearch 插件的护栏与记忆行为契约：benchmark 脚本锁定、checks 正确性背压、`.auto/` 写保护、Stop 续跑窗口、以及实验记忆的注入。

## ADDED Requirements

### Requirement: benchmark 脚本锁定

当 `.auto/measure.sh` 存在时，`run_experiment` SHALL 拒绝执行任何非该脚本的命令（允许 env/time/nice 等包装，但核心命令必须是脚本本身）。

#### Scenario: 尝试运行任意命令

- **WHEN** `.auto/measure.sh` 已存在且 agent 让 `run_experiment` 运行其它命令
- **THEN** 工具拒绝并提示只能运行 `.auto/measure.sh`

#### Scenario: 包装命令放行

- **WHEN** agent 通过 `time .auto/measure.sh` 运行
- **THEN** 工具接受并执行

### Requirement: checks 正确性背压

当 `.auto/checks.sh` 存在时，`run_experiment` SHALL 在 benchmark 通过后自动执行它；checks 失败 SHALL 使该次结果标记为 checks_failed 并在 `log_experiment` 中禁止 keep。

#### Scenario: checks 失败

- **WHEN** benchmark 度量改善但 `.auto/checks.sh` 以非零退出
- **THEN** run 结果标记 checks_failed，agent 以 keep 记录时被拒绝

### Requirement: 会话目录写保护

PreToolUse hook SHALL 拦截对 `.auto/` 下受保护文件（measure.sh、checks.sh）的 Write/Edit，返回 deny；对 `.auto/` 其它文件的写入放行。

#### Scenario: 修改度量脚本

- **WHEN** agent 尝试编辑 `.auto/measure.sh`
- **THEN** PreToolUse hook 返回 permissionDecision=deny 及原因

### Requirement: Stop hook 驱动循环续跑

当实验循环进行中且账本显示未达停止条件（迭代上限未到、最近结果非全失败）时，Stop hook SHALL 返回 `decision:block` 与进度摘要 reason，让主模型继续；连续续跑由 zcode 平台限制（3 次窗口）。

#### Scenario: 循环未结束

- **WHEN** 模型准备结束但当前 segment 未达迭代上限
- **THEN** Stop hook 返回 block + reason（进度与下一步），模型继续一轮

#### Scenario: 循环已结束

- **WHEN** 迭代上限已达成或账本显示连续失败
- **THEN** Stop hook 放行，模型正常收尾

### Requirement: 实验记忆注入

UserPromptSubmit/SessionStart hook SHALL 把 `.auto/log.jsonl` 的最近记录摘要注入模型上下文（compaction 后记忆恢复），注入内容 SHALL 保持精简（尾 N 行单行化）。

#### Scenario: 会话继续

- **WHEN** 会话内存在 `.auto/` 且用户提交新 prompt
- **THEN** 模型上下文包含账本最近几条记录摘要与下一步提示
