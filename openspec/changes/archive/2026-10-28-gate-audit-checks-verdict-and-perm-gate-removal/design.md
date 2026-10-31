# Design

## Context

九项硬门禁的逐项 worth-fix 判定完成（本 change 只落地其中两项修复，其余判定与留痕见 proposal）。判定的证据等级：源码核对 > 本机事故实录 > 插件自有测试演示 > LLM 认知事实；"理论上可能有用"不作为留下门禁的依据。

## Goals / Non-Goals

- Goals：切断"环境故障 → 全循环禁 keep"的放大链；移除有用场景与副作用重合的门禁；全部判定（含否决）留痕。
- Non-Goals：不动 measure 命令锁、iteration cap、crash 未回滚拦截、账本审计（完整性类）、冻结写保护、Stop 续跑门、软告警组，各项的有用场景均实证成立且无实证副作用；不改 nano-jev 协议文本（协议侧的 checks 禁令表述由使用方在 grilling 时同步）。

## Decisions

- **判定谓词取"退出码域"而非解析输出**：插件是通用 harness，不能理解 checks 脚本的语义输出；退出码域（0–125 为判定域，126/127/null/≥126 为非判定域）是 POSIX 惯例（126 不可执行、127 不存在、≥128 信号致死、Windows 致命码 0xC000013A=3221225786 落在 ≥126）与脚本作者契约的最小交集。脚本故意 `exit 127` 属病态用法，文档明示契约即可。
- **`checks.failed` 语义收窄而非新增状态**：`failed = verdict && exitCode !== 0`，`pendingChecksFailed` 持久化逻辑不变，所有下游（keep 门禁、账本 `checksFailed` 字段、stop-continue）零改动；返回新增 `checks.verdict` 一个字段。
- **PermissionRequest 门禁整体移除而非 init 白名单**：init 白名单后残余门禁对 run（无会话执行但不落账）/log（工具内已拒）/export/clear（无害）无实际价值，保留只余假阳性面。
- **两项否决在 proposal 完整留痕**（noop 路径、timeout_seconds 覆盖），含提案人自查推翻的过程，防止后续重复评估。

## Risks / Trade-offs

- [checks 脚本故意以 126/127 退出会被读作 infra] → 接受：病态用法，spec 明示契约（判定域 0–125）；误读方向是"少拦"而非"误拦"，且账本仍完整记录退出码。
- [移除工具门禁后，无关工作区误 init 会留下一个 config 行] → 接受：代价是 `clear_experiments` 一次，远低于 approval 模式无法启动的代价；误 init 本身是显式工具调用，非静默行为。

## Migration Plan

纯行为修订 + 一处 hook 移除，无迁移；回滚即还原对应文件。既有 checks 门禁测试（exit 1 → 拒 keep）语义不变、继续通过。

## 验证边界

- 判别谓词：集成测试新增 "checks script that never produced a verdict does not block keeps"（exit 127 → verdict:false + keep 放行；对照 exit 1 → 拒 keep），过真实 server 进程。
- 移除 permission-gate：删除对应单测；`hooks.json references point to existing files` 守护测试保证清单无悬挂引用。
- Windows 致命码 0xC000013A 分支：由谓词 `exitCode < 126` 覆盖（3221225786 > 126），未在测试中单独模拟该码，**验证边界如实标注**（测试用 127 代表非判定域）。
