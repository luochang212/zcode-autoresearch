# Design

## Context

2026-10-28 的 pi-autoresearch 对比研究提出三项移植候选。本 change 补录实现与 worth-fix 判定：两项否决（附证据）、一项采纳、一项审计副产品。判定时逐项核对了 zcode 平台钩子事件权威清单、本插件既有界限（stop-continue.ts / memory-inject.ts / server.ts）与 pi 源码（本地克隆逐文件审读）。

## Goals / Non-Goals

- Goals：钩子 session 载荷与 pi 契约逐字段对齐（`goal`）；压缩后（compact）会话提示恢复注入；两项否决的证据留痕。
- Non-Goals：不引入确定性 compaction（平台无钩点，见 proposal）；不新增续跑 turn 上限（既有三层界限更严）；不改动钩子执行模型（fail-open、30s、8KB 均维持）。

## Decisions

- **`goal` 取 `state.config?.name ?? null`**：与 pi 的 `goal: state.name ?? ""` 同源同义（会话名，非目标文本）；null 语义与载荷内其余可选字段一致。
- **matcher 用 alternation 追加**：`startup|resume|compact`，不动 hooks.json 其余结构；`clear` 不加，clear 后账本已删，session-start 前置检查自然静默。
- **文档与 spec 同步**：session 枚举在两份规程文档与主 spec 的两个 Requirement 中同步扩展，各加一个对齐场景。

## Risks / Trade-offs

- [`compact` 触发时 SessionStart 钩子多运行一次] → 可忽略：脚本只读账本与 config 后输出一行提示，fail-open，5s 超时保护。
- [`goal` 字段名与语义的错位（字段名是 goal，值是会话名）] → 接受：这是 pi 契约的既有命名，对齐的价值在于示例钩子零改动运行；已在本 change 与文档中写明语义防误读。

## Migration Plan

纯增量、默认开启，无迁移；回滚即还原对应文件。

## 验证边界

- `goal` 字段：集成测试（新钩子 echo `.session.goal`，断言等于 init 的 name）实打实通过真实 server 进程。
- `compact` matcher：hooks.json 的 matcher 由 ZCode 平台在运行时解释，插件测试无法模拟压缩事件，**未实测，验证边界记录于此**；依据是 zcode-guide:diagnosing-hooks 权威文档（SessionStart matcher 值含 `compact`）与 matcher 为大小写敏感正则 alternation 的既有用法（`startup|resume` 同构）。
- 两项否决的实证：平台事件清单引自权威文档；既有界限引自 stop-continue.ts 源码（isStopReached + failureThreshold 默认 3）与平台 README（3 次 Stop 窗口）。
