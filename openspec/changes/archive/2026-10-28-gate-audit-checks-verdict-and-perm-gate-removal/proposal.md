# Proposal

## Why

用户对 zcode-autoresearch 的门禁清单提出逐项审查准则：**每个门禁必须举出实证的有用场景、证明效率、如实披露副作用；有用且无副作用的才留，其余移除**。本 change 按 worth-fix 流程对九项硬门禁与五项候选修复逐一判定（证据全部来自源码核对与本机 2026-10-28 事故实录），落地两项修复、记录两项否决（否决对象包括审查者自己先前的提案）、一项配置级修正。

判定的决定性证据：

- **PermissionRequest 工具门禁自锁**（源码）：EXPERIMENT_TOOLS 含 `init_experiment`，而 `hasSession` 判 `.auto/log.jsonl` 存在——首次 init 恰是被拦的那个调用；插件自述"auto-approved 调用不经权限询问"，故 yolo 模式下门禁整体失效、approval 模式下插件无法启动。有用场景与副作用是同一行为。
- **checks 无判定判别缺失**（事故实录 2026-10-28）：WSL 别名 bash 使每次 checks 以 127 退出（从未产生判定），旧规则 `exitCode !== 0` 读作"checks 失败"并持久化 `pendingChecksFailed`——环境故障被放大为全循环禁 keep。checks 以信号终止（POSIX null / Windows 0xC000013A）同样被误读。
- **两项候选修复被证伪**（审查中自查推翻）：
  1. "超王禁 discard 放宽为可披露丢弃"——实证发现 `noop` 状态在审计中本就跳过 `discarded_improvement` 检查且重置连败链（`ledger.ts` "keep and noop both break the chain"），噪声掷硬币的干净出路（记 noop + 披露）已存在，放宽审计只会在不减少中断的前提下削弱守卫。不修。
  2. "`timeout` 加入 measure 命令包装白名单"——`run_experiment` 自带 `timeout_seconds` 参数（含 SIGTERM→SIGKILL 升级），`timeout` 包装是冗余语义，拒绝它是正确设计而非误伤。提案人误报的副作用不存在。不修。

## What Changes

- `run_experiment` 的 checks 执行增加**判定判别**：退出码 0（通过）或 1–125（判定失败）才算产生了判定；126/127（不可执行/不存在）、null（信号终止）及更大的致命码（Windows 0xC000013A）视为未产生判定（infra）——不置位 `pendingChecksFailed`、不否决 keep，返回中如实呈现 `checks.verdict: false` 供 agent 披露。真正跑完且判定为失败的 checks 维持否决 keep。
- **移除 PermissionRequest 工具门禁**（hook + hooks.json 注册 + 文档 + spec）。残余风险由既有机制覆盖：`log_experiment` 工具内无会话即拒（源码 `server.ts` "no active experiment session"），权限询问本身即人工审查点。
- 规程文档同步：README（中英）、autoresearch SKILL 的启动指引。
- 会话配置键 `consecutiveFailures`（连败熔断阈值）的使用在消费侧（nano-jev V1）对齐协议章程（5），属使用方配置，不在本仓库改动内。

## Capabilities

### New Capabilities

（无）

### Modified Capabilities

- `autoresearch/guardrails`：`checks 正确性背压` Requirement 的判定语义修订 + 新增「未产生判定不否决 keep」场景；`PermissionRequest 工具门禁` Requirement 整体移除（REMOVED）。
