# Design

## Context

本 change 只处理 worth-fix 判定为“属实 + 影响真实 + 低修复成本”的项。判定表见下；未入选项明确留在 Deferred，避免把一次 review 变成大规模重构。

| #   | 命题                                          | 属实性                                        | 影响                                           | 成本 | 判定                                                                     |
| --- | --------------------------------------------- | --------------------------------------------- | ---------------------------------------------- | ---- | ------------------------------------------------------------------------ |
| 1   | 首条 keep 可比 baseline 差                    | 坐实（实测 42 → 45 被接受）                   | 高（核心审计基准分裂，后续 keep 只对齐坏基准） | 低   | 修                                                                       |
| 2   | `off` 不暂停 Stop/memory                      | 坐实（实测仍 block + 注入）                   | 高（用户以为暂停，实际继续消耗）               | 低   | 修（代码 + 文档）                                                        |
| 3   | 无会话/无 `.auto` 入口缺少门禁                | 坐实（run 执行 benchmark；clear ENOENT）      | 中高（越权执行/误导错误）                      | 低   | 修                                                                       |
| 4   | dashboard 未与 `.auto` 一致豁免               | 坐实（keep 提交 dashboard；crash 门禁误触发） | 高（session 状态进入 git）                     | 低   | 修                                                                       |
| 5   | 跨 segment 状态残留                           | 坐实（一段一败 → 连败 3）                     | 中高（错误提示、过期 hook 输入）               | 低   | 修                                                                       |
| 6   | 空仓库可 init，首次回滚失败                   | 坐实（rollback 抛错，行不落盘）               | 中（新项目卡死）                               | 低   | 修                                                                       |
| 7   | crash 响应 metric 与账本不一致                | 坐实（7 vs null）                             | 中（两个事实源）                               | 极低 | 修                                                                       |
| 8   | `auditBypass` 不跳过约束                      | 坐实（实测仍拒绝）                            | 中（承诺的逃生口失效）                         | 低   | 修                                                                       |
| 9   | dashboard timestamp 未校验/未转义、路由未兜底 | 坐实（抛异常、原样 HTML）                     | 中（live 进程可被打崩；XSS）                   | 低   | 修                                                                       |
| 10  | macOS 冻结路径大小写绕过                      | 坐实（MEASURE.SH 被放行）                     | 中（守卫失效）                                 | 低   | 修                                                                       |
| 11  | 中文相似度不满足 spec 示例                    | 坐实（去重/震荡均失败）                       | 中低（advisory 信号失效）                      | 中低 | 修（bigram）                                                             |
| 12  | `validateLedger` 多 segment retained 不重置   | 结构坐实（当前无消费者）                      | 低（潜在）                                     | 极低 | 不修（`config` 参数只描述当前 segment，全账本回放需改签名；见 Deferred） |
| 13  | `median` 注释错位、server 头注释漏工具        | 坐实                                          | 低（误导维护）                                 | 极低 | 修                                                                       |

Deferred（明确不修，理由）：

- **workingDir 贯通 commands/finalize/guard**：需要跨命令、shell 脚本、独立 git 仓库重定义“有效研究目录”，属独立设计；当前只在 MCP/hook 运行时贯通，不能在一个 hardening change 里顺手改。
- **noop metric 语义**：noop 是否允许/如何参与 baseline 是产品语义选择，首条 keep 修复已把最危险的“坏基准”风险降下来；单独讨论。
- **runCommand 后台子进程持管道**：需要真实 daemon 复现，概率低、修复涉及进程组策略；单独诊断。
- **niceTicks 极小量程 / memory 注入截断 / finalize 并集内容校验 / 示例脚本**：低影响或独立资产，按需另开。
- **ADR-5/2 的语义更新、ADR-8 untracked**：改已落地决策的理由需要新的 ADR 关系，不能在本 change 里悄悄改写；ADR-8 是用户 WIP，保持不动。
- **log 响应补 `consecutiveFailures` 字段**：spec 改为由 `next_action_hint` 表达，避免为字段而字段的 API 扩张。
- **`validateLedger` 多 segment 回放**：该函数只有一个 `config` 参数，无法表达每段各自的 segment；当前唯一的调用方只传当前段。修改签名/语义超出本 hardening 范围，且无真实消费者。

## Goals / Non-Goals

**Goals:**

- 让“首条 keep / 后续 keep / dashboard baseline”使用同一 baseline 口径，坏 keep 在写入前被拒。
- 让 segment 是真正的状态边界：连败、lastRun、checks 标记不跨段。
- 让实验工具入口在无会话、无 `.auto`、空仓库时给出确定行为，而不是执行/ENOENT。
- 让 session-state 的 git 边界只有一个定义：`.auto/` 与 dashboard 都不进入 keep、都不计入 dirty。
- 让暂停开关、crash 返回值、auditBypass、dashboard 输入、macOS 守卫与中文相似度与文档/规范一致。
- 把值得修的文档漂移同步掉，并记录不修项。

**Non-Goals:**

- 不重构 ledger/state 为全新事件溯源系统；本 change 只补现有状态机的边界。
- 不改变 keep/discard 的核心语义（commit on keep、rollback otherwise）。
- 不引入第三方依赖、构建步骤或新的持久化格式。
- 不解决 workingDir 的全链路贯通（见 Deferred）。

## Decisions

### D1. 首条 keep 用“segment 首条有限 metric”作 baseline

`validateLedger` 内部维护 `baseline`（第一条有限 metric）与 `retained`（当前保留值）。首条 keep 必须 direction-aware 地不差于 baseline（允许相等），之后才更新 retained。选择在纯函数内完成，而不是把 baseline 塞进 config 参数：审计的输入已经是完整 run 序列，新增参数只会让调用方多一个可漂移的事实源。

替代方案：把 state.baseline 传入 validate。否决，理由是 server 已有 state，但 validate 的单元测试与全账本回放会失去独立性。

### D2. 段边界在 `rebuildState` 的 config 分支重置

config 行 = 新 segment，重置 `runs/baseline/best/consecutiveFailures/lastRun/lastRunChecksFailed`。选择状态投影层而不是 server 层：stop/memory/before hook 都消费 rebuildState，单点修复覆盖所有读者。

### D3. 入口门禁放在工具层，`.auto` 创建放在 patchSessionConfig

`run_experiment` 在任何副作用前检查 `state.config`；`clear_experiments` 先查 log；`patchSessionConfig` 统一 `mkdir -p .auto`。这样不依赖调用顺序，也不会让“写配置”成为隐藏的目录创建者。

### D4. dashboard 与 `.auto` 共用同一 session-file 常量

`git.ts` 从 `ledger.ts` 引入 `DASHBOARD_FILE`，commit/isDirty/rollback checkout 都排除它。选择引入已有常量而不是复制字符串：复制正是这次不一致的根因。

替代方案：新建 session-path 模块。对当前规模过重，等 workingDir 全链路改造时再做。

### D5. `off` 是“暂停循环”，不是“只静音提示”

Stop 与 memory-inject 都读取 `autoresearchOff`；init/clear 清除标记；resume 命令在继续前显式清标记。选择代码语义而不是只改 README：命令名 `off`、README 的 “pause loop continuation” 与用户预期都指向真正暂停；只改文案会留下“以为停了其实没停”的风险。

风险：暂停后 memory 不再注入，用户手动继续时上下文变少；由 resume 命令清标记 + SessionStart 提示兜底。

### D6. crash 的响应字段以账本为准

计算 `reportedMetric = status === "crash" ? null : metric`，response 的 metric/delta 都用它；保证“返回值 = 账本行”。

### D7. auditBypass 的解锁范围按 ADR-5 执行

约束校验与账本审计都受 `auditBypass` 控制。替代方案是改 ADR/注释为“只跳过审计”，但这会让用户以为逃生口能解锁全部护栏；按 ADR 执行更一致。

### D8. dashboard 输入防御放在渲染边界

timestamp 非字符串 → 省略日期；字符串 → 先 escape 再 slice；live 路由整体 try/catch → 500。选择渲染边界而不是信任 ledger schema：ledger 允许手写/历史行，UI 不能假设类型。

### D9. macOS 也做 case-insensitive 归一化

`frozenKey` 在 darwin 下也 lowercase。替代方案是 realpath/inode 比较：更准确但要处理文件不存在（首次创建放行）与 symlink，成本高；lowercase 的误报是“阻止一个同名不同大小写文件”，比漏放安全。

### D10. 中文相似度用 CJK bigram 扩充 token 集

对长度 >2 的 CJK token，用字符 bigram 替代整词 token（2 字 token 保留自身）；英文 token 不变。选择 bigram 而不是引入分词库：零依赖铁律；bigram 对“前缀相同 + 后缀变体”的 spec 示例有效，且误报只影响 advisory 的 dedup/doom-loop。

## Risks / Trade-offs

- [首条 keep 变严，可能拒绝以前能过的“首条持平/更好”边界] → 仅拒“更差”，相等仍放行；错误信息复用 keep_without_improvement 的修正提示。
- [off 语义变化影响现有用户] → init/clear/resume 都清标记；README/命令同步说明。
- [dashboard 不再进入 commit，可能让依赖它做版本记录的用户意外] → setup-guide 本来就把 dashboard 定义为 session state；文档明确。
- [macOS lowercase 在大小写敏感卷上可能误拒同名不同大小写文件] → 极罕见，且方向是安全侧。
- [CJK bigram 可能把短中文假设判为相似] → 仅 advisory；用 spec 中文示例与英文回归测试锁边界。
- [live 路由 500 兜底会掩盖真实渲染错误] → 返回 text/plain 500，错误仍写 stderr；已有 404/SSE 存活测试覆盖进程存活，路由 catch 本身做结构审查。

## Migration Plan

- 无数据迁移；旧账本照常 replay。首条 keep 规则只影响新写入。
- 已存在的 dashboard 若被 git 跟踪：新逻辑不再提交/不再计入 dirty，但不会自动从历史移除；用户可自行 `git rm --cached`（文档说明）。
- `autoresearchOff` 旧值在 init/clear 时清除；未 init 的手动 resume 由命令清标记。
- 回滚：revert 本 change 的代码与 spec 即可；账本格式未变。

## Open Questions

（无）
