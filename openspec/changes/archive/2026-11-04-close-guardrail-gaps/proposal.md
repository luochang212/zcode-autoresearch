# Proposal: close-guardrail-gaps

## Why

一轮全仓库 review（worth-fix 流程：论断 → 最小复现实测 → 属实/值得修分离判定）坐实了多处「护栏/恢复承诺与实现背离」的缺口。全部关键论断均经真实生产代码路径实测复现（证据见 design.md），不是静态推断：

1. **benchmark 锁可被赋值前缀注入绕过**（实测坐实）：`X=$(id) bash .auto/measure.sh` 通过锁校验，server 实际执行含命令替换的原始串，bash 会真正执行前缀里的 `$(id)`。锁定 spec 的白名单条款只覆盖「脚本之后的参数」，前缀是缺口。
2. **ApplyPatch 完全绕过冻结写保护**（实测坐实）：hooks.json matcher 声明了 ApplyPatch，但 guard 只读 `tool_input.file_path/path`；ApplyPatch 载荷只有 `patch_text` → 恒放行、不落 `frozen_attempt`。
3. **账本部分写入连带腐蚀且静默丢行**（实测坐实）：append 不检查文件尾换行，截断行与下一条拼成一行双双损毁；readLedger 静默丢弃坏行，后续 run 号错位使 validate 拒绝一切 log 且报错指向不了真因。
4. **workingDir 失效静默回退项目根**（实测坐实）：目录缺失/JSON 损坏均无声回退，discard/crash 的 `checkout HEAD -- . + clean -fd` 随即作用在项目根——唯一真实的不可逆丢用户数据路径。
5. **keep 提交未隔离目标仓库 git 钩子**（实测坐实）：带 pre-commit（husky/lint-staged 类）的仓库里，钩子改写的内容进了实验 commit（破坏「commit 恰好描述本次实验」不变量）；钩子失败时 keep 抛错且 `stdio:"ignore"` 吞掉全部诊断。
6. **checks 门在基准失败时静默敞开**（源码坐实，spec 内行为但沉默是缺口）：基准最后一次 run 非零退出/超时 → checks 跳过 → `pendingChecksFailed=false` → keep 畅通，agent 得不到任何「checks 没跑」的信号。
7. **crash+脏树审计门被 re-init 绕过**（源码坐实）：门依赖 `state.lastRun`，而 spec 规定 config 行重置 lastRun → crash 后 `init_experiment` 即解除审计，崩溃残留被下一个 keep 的 `git add -A` 提交进「实验」。
8. **迭代钩子超时在 POSIX 只杀 wrapper**（源码坐实）：`runHookRaw` spawn 无 `detached`，超时 SIGKILL 只打 bash 本身；钩子 fork 的子进程成孤儿，污染后续计时基准。同类基准超时路径（runCommand）已有进程组语义，此为对齐既有架构的局部补齐。

## What Changes

- **guardrails**：benchmark 锁定的白名单扩展到被剥离的赋值前缀；会话目录写保护覆盖 ApplyPatch（解析 patch_text 目标路径）；checks 因基准失败被跳过时响应必须携带显式警告（advisory，不改变 keep 门政策）。
- **experiment-loop**：crash+脏树审计门改看账本全局最后一条 run（跨 segment 不豁免）；新增账本追加完整性要求（append 保行边界、坏行 stderr 诊断）；新增实验提交隔离仓库钩子要求（--no-verify + 失败诊断透传）；新增 workingDir 失效显式失败要求（工具层响亮报错，hook 层 fail-open 但出诊断）。
- **无 spec delta 的实现修正**（对齐既有 spec 或纯内部质量）：repeat 非整数收敛为整数（spec 已写明「正整数」）；迭代钩子超时进程组终止（对齐基准超时的既有「不泄漏进程」语义）；`serverInfo.version` 从 plugin.json 动态读取并纳入契约测试；marketplace keywords 与 plugin.json 对齐；anti-thrash 示例的 noop 计数对齐 guardrails spec（noop 中断连败链）；spill 日志文件名去掉上游 `pi-` 残留前缀。

## Impact

- Affected specs: `autoresearch/guardrails`（MODIFIED ×3）、`autoresearch/experiment-loop`（MODIFIED ×1、ADDED ×3）
- Affected code: `plugin/mcp/lib/experiment.ts`、`plugin/hooks/guard-frozen.ts`、`plugin/mcp/lib/ledger.ts`、`plugin/mcp/lib/paths.ts`、`plugin/mcp/lib/git.ts`、`plugin/mcp/server.ts`、`plugin/mcp/lib/types.ts`、`plugin/scripts/finalize.sh`、`plugin/hooks/examples/before/anti-thrash.sh`、根 `marketplace.json`、`tests/marketplace-contract.test.ts`
- 回归测试：每项复现场景固化为测试（红→绿）；钩子进程组终止因 30s 超时不可注入、无法在测试时限内实测，采用结构验证并在 design.md 记录验证边界
- 明确不在本 change 范围（属实但判定为不值得现在修/属提案级）：goal/scope 纳入 hash 漂移检测、stop-continue 会话参与度、config 损坏时 off 语义、Windows hook 失效重估、realpath 符号链接、pid 复用竞态等——完整清单与理由见 design.md「不修清单」
