# Design

## Context

实现已先行落在本仓库工作区（server.ts / bash.ts / .mcp.json / 测试 / 两份规程文档），本 change 为补录。动机见 proposal.md。补录时按 worth-fix 流程对 `spawnEnv` 的可达性做过实证审查，结论留痕于下方「开放问题」。

## Goals / Non-Goals

- Goals：session 负载显式化并带上 segment 起始时间；记录 Windows spawn env 的现状与证据；MCP 请求超时不再早于常见基准。
- Non-Goals：不改钩子执行模型（fail-open、30s 上限等均维持现状）；不为 `spawnEnv` 扩展新的路径映射策略（见开放问题）。

## Decisions

- **`started_at_epoch` 由 server 计算并放进 session**（`hookSessionPayload` 读 config 行的 `createdAt` ISO 串 → `Date.parse` → epoch 秒），而非让钩子自行解析账本：账本行格式是内部事实源，钩子不应耦合其 row 结构；非法/缺失（NaN、≤0）统一回退 null。
- **`spawnEnv` 复用 env 中已存在的 PATH key**（大小写不敏感查找，命中 `Path` 就写 `Path`）：Windows 下若盲目写 `PATH` 会与既有 `Path` 并存，子进程实际取用哪个取决于运行时，行为不可预测。
- **前置而非替换 PATH**：仅恢复 Git coreutils 目录，不改变其余解析顺序。
- **`.mcp.json` `timeoutMs` 600000**：旧值 60s 连中等基准都装不下；新值与 `AR_BENCHMARK_TIMEOUT_MS` 默认值（600s）对齐。
- **`spawnEnv` 按防御性机制保留**（2026-10-28 收口）：可达性审计（证据见文末附录）未找到纯 PATH 语义下的生效场景，但在无实际事故形态信息时不做重构或移除。机制为纯前置、最坏情形是无操作的透传，且 win32 单测已固化行为；bash.ts 注释已按审计结论如实改写。

## Risks / Trade-offs

- [timeoutMs 与基准默认超时相等，零余量：基准跑满 600s 再叠加 checks（默认 300s）时，宿主侧 MCP 请求会先于结果被掐断] → 可接受：默认基准超时内完成的场景不再误伤；用户调大 `benchmarkTimeoutMs` 本就需自行覆盖此值。备选 900000 未采纳，避免为罕见的满时长基准长期占住宿主并发。
- [spawnEnv 生效前提是解析到 `usr\bin` bash] → 见 Decisions 的可达性审计收口；机制为纯前置，最坏情形是无操作的透传，不引入回归。

## Migration Plan

纯增量、默认开启，无迁移；回滚即还原工作区对应文件。

## 附录：spawnEnv 可达性审计证据（2026-10-28，已按 Decisions 收口）

实测证据（worth-fix 复核，2026-10-28，本机 Windows）：

1. 注册表 PATH（GUI 启动进程的真实环境，HKLM+HKCU 合并）只含 `Git\cmd`，不含 `Git\usr\bin`、`Git\bin`。
2. 该形态下 `where bash` 只命中 System32 的 WSL 桩（被 `isWslOrStub` 过滤），`resolveBash()` 直接抛 "no usable bash.exe on PATH"（实测）。注释所述"标准安装瘦 PATH → exit 127"实际到不了 127，在更早处响亮失败。
3. `Git\cmd\` 下无 bash.exe；`Git\bin\` 下有 bash.exe（无 coreutils）。若某环境 PATH 上是 `Git\bin`，bash 可用而 `head`/`grep` 报 127，但 `usr[\\/]bin$` 正则不匹配 `bin`，`spawnEnv` 不生效。
4. `spawnEnv` 能生效的唯一前提（解析到 `usr\bin\bash.exe`）按构造蕴含 `usr\bin` 已在 server PATH 上（`where.exe` 按 PATH 搜索），子进程继承同一 PATH，coreutils 本就可解析，前置疑为 no-op。

结论：作为 exit 127 的修复，该机制在纯 PATH 语义下覆盖不到任何可达场景；作为防御性代码无害（win32 单测已固化行为），已按「防御性机制保留」收口（见 Decisions）。日后若确认宿主侧存在 env 裁剪等机制，再在同一处评估扩展映射（如 `Git\bin` → `usr\bin`）。

## 附录二：对附录一的勘误（2026-10-28，复审 agent）

第 2 条被证伪：`where bash` 在注册表 PATH 下命中**两个**桩，System32 之外还有**每用户
别名** `%LOCALAPPDATA%\Microsoft\WindowsApps\bash.exe`（默认 Windows 用户 PATH 必有），
而 `isWslOrStub` 旧正则只匹配 `C:\Windows\WindowsApps`，滤不掉它。实测（本机）：
裁剪 PATH 下 `resolveBash()` 返回该别名而非抛错；spawn 它执行 Windows 路径脚本得
`/bin/bash: <path>: No such file or directory`，exit 127，与 2026-10-28 会话账本中
before 钩子 `{exit_code: 127, duration_ms: 515}` 完全吻合。**当日 127 的真实根因是
resolveBash 选中 WSL 启动器，而非 coreutils 缺失**（钩子脚本从未在 Git Bash 里执行，
`spawnEnv` 与钩子内 PATH 硬化均与该事故无关）。

已修复：`isWslOrStub` 正则扩展 `\Microsoft\WindowsApps` 分支，`resolveBash` 在该形态
下响亮抛错（报错文案同步）；红→绿回归测试入 `tests/win32-kill.test.ts`（子进程注入
裁剪 PATH，断言抛 "no usable bash.exe"）。该形态下用户需把 `Git\usr\bin`（或含
bash.exe 的目录）加入 PATH 才能使用插件。修复后失败模式从「静默 127 / 静默 WSL 语义」
变为「响亮报错 + 明确补救指引」。第 1、3、4 条经复核成立；`spawnEnv` 维持防御性保留。
