# Design

## Context

worth-fix 流程（2026-11-06 全仓 review 后逐项验证）：两个行为洞以真实服务进程红测坐实——(1) `checks_failed` 无判定也放行（`cf.ok === true`，无任何 failed-checks 前提校验）；(2) noop 落账对脏树零提示（返回无 warning 字段）。验证顺带发现：现行契约要求 noop 也必须带 metric（`server.ts` 的 metric 门只豁免 crash），但报错文案只说 "or use status=crash"，不提 noop——文案问题一并修。

## Goals / Non-Goals

**Goals**

1. `checks_failed` 从自证变为有据：复用已有的 `pendingChecksFailed`（持久化、跨重启），不引入新状态。
2. noop+脏树从静默变为显式：advisory 警告，不是硬门。
3. 回归测试先红后绿固化两个场景（红测已在实施前运行并记录）。

**Non-Goals**

- 不给 discard-residual 建 run 侧门禁（见「明确不修」）。
- 不改 keep/discard/crash 的任何既有语义。

## Decisions

**D1 门的位置与 bypass 语义**。checks_failed 门放在与 keep 门（`pendingChecksFailed` 检查）同一层——审计校验之前、`auditBypass` 判定之外，与 keep 门保持一致（keep 门同样不受 bypass 影响）。不放进 `validateLedger`：它是纯函数，签名不携带 config 状态，且该门的本质是「工具对物理事实的核验」而非账本内部不变量。

**D2 noop 是 advisory 不是硬门**。crash+脏树永不合法（门禁成立），noop+脏树可能合法（用户 scratch 文件、宿主写入）——硬拒会阻断合法流。与仓库哲学一致：事实必须显性（警告），决策权留给 agent。警告走返回字段 `warning`（与 benchmark_drift 同字段名），文案说明「noop 不回滚、脏树将进入下一轮测量」。

**D3 测试**。mcp-integration 层直击真实服务进程（红测已运行：attestation 场景 `cf.ok` 实测 true、noop 场景 warning 实测 undefined），修复后同断言翻转绿。诚实路径（真失败判定后 checks_failed 放行）由既有 "checks gate: keep rejected after failed checks" 测试继续守护，防过拦。

## Retro：非契约面顺手修复（同批 worth-fix 判定，随本 change 留痕）

以下各项不触碰 openspec 契约（规范未枚举相关行为），随实施直接落码：

- **METRIC 名字符集补连字符**（实测坐实：`METRIC tokens-per-sec=5` 静默不解析）：`[\w.µ]` → `[\w.µ-]`，纯实现补全（规范只写「形如 METRIC name=value」）。
- **spill 日志过期清理**（grep 坐实零清理逻辑）：溢出文件新增 7 天过期清扫（溢出时顺带清扫旧文件，best-effort）。
- **export_dashboard 绑定失败降级**（结构验证）：`ensureDashboardServer` 抛错不再掩盖已写好的静态 HTML，降级为 static-only 消息。绑定失败无法在本环境注入复现，验证边界：结构审查+全量回归。
- **死代码清理**（grep 坐实零引用）：`ledger.deltaFor`（dashboard 有同名异义的私有实现，生产无调用方）、`types.ts failedGuard` 字段。
- **schema/注释文案**：commit 参数（"ignored on keep" → 写明 non-keep 禁带，实测 non-keep 带 commit 是 commit_field 硬错）、runs[].run（repeat 序号非账本 run 号）、`memory-inject.ts` 去重注释（"most recent label kept" 与实际不符，实际保留首次出现标签）。

## 明确不修（worth-fix 判定留痕）

- **discard-residual 的 run 侧门禁**：残留本身罕见（历史一次实证 nano-jev V1 run 6），log 返回已以最高优先级 advisory 披露；且 run 侧无法区分「残留」与「下一轮合法新编辑」（都是脏树），只能做 advisory——收益配不上新增持久化状态。升级条件：再次出现真实残留事故（账本证据）即做残留持久化+run 时比对。
- **commitExperiment 全仓 index 重置**（`git.ts:173`）：有意取舍（提交纯度 > 用户 index 保留），代码注释已载；README 补一句披露（tasks 内），代码不动。
- **hooks.json 依赖 PATH 上的 `sh`（Windows）**：本环境无法实证宿主 spawn 行为，修=投机。留待 Windows 实测后另立 change。
- **legacy crash 行 baseline 口径三处不一 / 未知 status 连败口径分叉**：仅手写账本或 auditBypass 可达，有注释边界，统一收益低。
- **init 的 config 写成功→账本写失败半初始化窗口**：极端 ENOSPC 场景。
- **hooks 注入文本语言策略（中文 vs server 英文）**：产品决策，须用户拍板，不属本轮修复。
- **guardrails 规范 Stop hook plateau 措辞**（"reason 中说明" vs 实际 stderr）：实现注释已解释 schema 原因，措辞修正留待下次触碰该 requirement 的 change 搭车。
