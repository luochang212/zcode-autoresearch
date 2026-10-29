# Spec Delta

## ADDED Requirements

### Requirement: autoresearchOff 暂停循环

当项目 `.auto/config.json` 的 `autoresearchOff` 为 true 时，Stop hook SHALL 不返回 `decision:block`，UserPromptSubmit/记忆注入 SHALL 不注入账本摘要，SessionStart SHALL 不注入续跑提示；恢复运行时 SHALL 清除该标记（`init_experiment` / `clear_experiments` 重置，或 resume 命令显式清除）。

#### Scenario: off 阻止 Stop 续跑

- **WHEN** 账本显示循环未结束，但 config 设置 `autoresearchOff: true`
- **THEN** Stop hook 静默退出（不 block），不再把模型拉回循环

#### Scenario: off 阻止记忆注入

- **WHEN** config 设置 `autoresearchOff: true`，用户提交新 prompt
- **THEN** UserPromptSubmit hook 不输出 `additionalContext` 账本摘要

#### Scenario: init 清除 off

- **WHEN** config 设置 `autoresearchOff: true`，agent 调用 `init_experiment`
- **THEN** 新 config 中 `autoresearchOff` 为 false，后续 Stop/SessionStart 恢复

#### Scenario: clear 清除 off

- **WHEN** 存在账本且 config 设置 `autoresearchOff: true`，agent 调用 `clear_experiments`
- **THEN** 账本删除且 `autoresearchOff` 重置为 false

### Requirement: auditBypass 解锁范围

`.auto/config.json` 的 `auditBypass: true` SHALL 同时跳过账本不变量审计与次级度量约束校验；未设置或为 false 时两者都执行。该行为 SHALL 与 ADR-5 的“统一解锁出口”一致。

#### Scenario: bypass 下约束不拦截

- **WHEN** `auditBypass: true`，keep 的次级度量超过 maxPct
- **THEN** keep 不被 constraint violation 拒绝（仍执行 git/账本写入）

#### Scenario: 未 bypass 时约束仍拦截

- **WHEN** `auditBypass` 未设置，keep 的次级度量超过 maxPct
- **THEN** keep 被 constraint violation 拒绝

### Requirement: 冻结写保护路径归一化

冻结写保护的路径比较 SHALL 在大小写不敏感的目标文件系统上归一化：Windows 与 macOS 上 SHALL 使用 lowercase 后的 POSIX 相对路径；Linux 等大小写敏感平台 SHALL 保持原样。归一化后命中 `FROZEN_FILES` 且文件已存在时 SHALL deny。

#### Scenario: macOS 大小写变体被拒

- **WHEN** 在 macOS 上写 `.auto/MEASURE.SH`（与已存在的 `.auto/measure.sh` 指向同一文件）
- **THEN** PreToolUse guard 返回 deny，而不是放行

#### Scenario: Linux 大小写敏感

- **WHEN** 在 Linux 上写一个与冻结文件不同大小写的独立文件
- **THEN** guard 按原路径比较，不把该独立文件当作冻结文件
