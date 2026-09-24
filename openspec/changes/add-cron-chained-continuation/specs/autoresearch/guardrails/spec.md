## ADDED Requirements

### Requirement: 无人值守定时唤醒（有界）

用户明确要求无人值守/过夜运行时，agent SHALL 按 unattended 规程创建 recurring 的 `CronCreate` 定时唤醒任务（interval + maxRuns 双参数均须有界），唤醒提示 SHALL 自包含：只依赖 `.auto/` 事实源（log.jsonl/config.json）与 skill 指针，不依赖对话记忆。每个唤醒 turn（automation turn）SHALL 先检查循环状态：实验循环活跃（`.auto/log.jsonl` 存在、config 未设 `autoresearchOff: true`、未达迭代上限、连续失败未达阈值）时按循环规程继续实验；不活跃时 SHALL 空转（不创建实验、不做无关工作），等待任务自然耗尽或用户清理。用户未明确要求无人值守时，agent SHALL NOT 创建唤醒任务。`/autoresearch:off`、`/autoresearch:clear` 与 finalize 命令 SHALL 包含清理步骤：CronList 检查本会话创建的唤醒任务并删除（或在 automation turn 不可删除时提示用户删除）——automation turn 无法写 Cron（宿主强制），清理只发生在用户交互轮。

#### Scenario: 授权后创建有界唤醒

- **WHEN** 用户要求「无人值守跑一晚」，agent 按 unattended 规程调用 CronCreate
- **THEN** 创建的任务为 recurring 且 maxRuns 有界（非无限循环），唤醒提示包含自包含的状态检查与续跑指引

#### Scenario: 未授权不创建

- **WHEN** 用户未要求无人值守，agent 在常规循环中不创建唤醒任务
- **THEN** 无 CronCreate 调用（循环仍由 Stop 3 次窗口与人工触发驱动）

#### Scenario: 唤醒继续活跃循环

- **WHEN** 唤醒 turn 触发时实验循环活跃（未达上限、未 off）
- **THEN** 该 turn 按 SKILL 循环规程执行实验（run_experiment → log_experiment），账本照常追加

#### Scenario: 唤醒遇到不活跃循环空转

- **WHEN** 唤醒 turn 触发时循环已结束（上限达成 / autoresearchOff / clear 后无账本）
- **THEN** 该 turn 不做任何实验动作，静默结束；不产生账本写入

#### Scenario: off/clear 清理唤醒任务

- **WHEN** 用户执行 /autoresearch:off 或 /autoresearch:clear，会话存在已创建的唤醒任务
- **THEN** agent 执行 CronList 检查并 CronDelete 唤醒任务（用户交互轮可写 Cron），命令说明包含该步骤

#### Scenario: automation turn 内无法繁殖唤醒

- **WHEN** 唤醒 turn（automation turn）运行中 agent 尝试 CronCreate/CronUpdate/CronDelete
- **THEN** 宿主拒绝该工具调用（assertNotAutomationTurn），不产生新任务（结构性防失控，无需插件侧拦截）

## MODIFIED Requirements

### Requirement: Stop hook 驱动循环续跑

当实验循环进行中且账本显示未达停止条件（迭代上限未到、最近结果非全失败）时，Stop hook SHALL 返回 `decision:block` 与进度摘要 reason，让主模型继续；连续续跑由 zcode 平台限制（3 次窗口）。block 的 reason SHALL 附加一句无人值守提示（用户已要求无人值守运行时，agent 可按 unattended 规程创建定时唤醒）——该提示为 advisory 且无条件追加（hook 不维护窗口计数状态），实际创建时机由 unattended 规程约束。连续失败判定 SHALL 使用 `.auto/config.json` 的 `consecutiveFailures`（默认 3）作为阈值；"连续失败"指**尾部连续的 discard/crash/checks_failed**——noop 既不计入失败也中断连续链（keep 同样中断），且 noop 之后尾部的连续失败数从零重新起算。`log_experiment` 返回的 `consecutiveFailures` 计数 SHALL 采用同一语义。

#### Scenario: 循环未结束

- **WHEN** 模型准备结束但当前 segment 未达迭代上限且未进入平台期
- **THEN** Stop hook 返回 block + reason（进度与下一步），模型继续一轮

#### Scenario: block reason 附无人值守提示

- **WHEN** Stop hook 返回 block（任意窗口位置）
- **THEN** reason 末尾含无人值守提示文案（提及「用户已要求无人值守时」可按规程创建定时唤醒）

#### Scenario: 平台期收敛

- **WHEN** 当前 segment 最近 `window` 轮无净改善（plateau 检测为 true）
- **THEN** Stop hook 放行，reason 中说明循环已进入平台期，建议收尾或开启新 segment

#### Scenario: 连续失败达到阈值

- **WHEN** 连续 discard/crash/checks_failed 数量达到 `consecutiveFailures`（默认 3，可配）
- **THEN** Stop hook 放行，模型正常收尾

#### Scenario: noop 不计入连败

- **WHEN** 最近记录为 [discard, crash, noop] 或 [discard, crash, noop, discard]
- **THEN** 连续失败计数分别为 0 与 1（noop 中断连败链且自身不计数），Stop hook 均不放行

#### Scenario: 循环已结束

- **WHEN** 迭代上限已达成
- **THEN** Stop hook 放行，模型正常收尾
