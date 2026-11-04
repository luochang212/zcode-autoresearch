# Design: close-guardrail-gaps

## 证据基础（worth-fix 留痕）

所有 P1/P2 论断先转成可验证命题，再用最小复现直击真实生产代码路径验证。复现脚本存于根目录草稿本 `archived/review-repro/`（不进 git），结果摘录：

| 命题                                       | 验证方式                                                        | 结果                                                                                                                                       |
| ------------------------------------------ | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `X=$(id) bash .auto/measure.sh` 通过锁校验 | 直接调用 `unwrapMeasureCommand`（repro-a）                      | **坐实**：返回 `bash .auto/measure.sh`，含 `$()`/反引号前缀均通过；server.ts:980 执行的是原始串；bash 实测执行前缀命令替换                 |
| ApplyPatch 绕过冻结写保护                  | spawn 真实 `guard-frozen.ts` 喂 ApplyPatch 载荷（repro-b）      | **坐实**：exit 0、无 deny、无 `frozen_attempt`；Write 对照被 deny                                                                          |
| 账本部分写入连带腐蚀                       | 真实 `appendLedgerEntry`/`readLedger`（repro-c）                | **坐实**：两条记录拼成一行，readLedger 返回 0 条、零诊断                                                                                   |
| workingDir 失效静默回退                    | 真实 `resolveWorkCwd`（repro-d）                                | **坐实**：目录缺失与 JSON 损坏均静默回退项目根                                                                                             |
| git 钩子未隔离                             | 真实 `commitExperiment` + 临时仓库带 pre-commit（repro-e）      | **坐实**：钩子改写内容进入 commit（`# formatted by prettier` 出现在 HEAD）；钩子失败抛 `Command failed: git commit -m ...`，无 stderr 诊断 |
| checks 门静默敞开                          | 源码直读 server.ts:1009-1014                                    | **坐实**（结构验证）：`last.exitCode === 0` 才跑 checks，随后无条件 `setPendingChecksFailed(false)`                                        |
| crash 门被 re-init 绕过                    | 源码直读 server.ts:930 + ledger.ts:118                          | **坐实**（结构验证）：门只看 `state.lastRun`，spec 规定 config 行重置它                                                                    |
| hook 超时只杀 wrapper                      | 源码直读 server.ts:621（无 detached）对比 :282（runCommand 有） | **坐实**（结构验证）                                                                                                                       |

## 修复设计

### D1 赋值前缀走白名单（experiment.ts）

根因：`ASSIGN_RE` 的 `\S*` 吞掉任意值，白名单只检查脚本名之后的 `rest`。修法：`ASSIGN_RE` 改为捕获赋值值，循环剥离时逐段用与参数相同的字符白名单 `[\w./:=+-]` 校验，不合规即返回 null。`env/time/nice/nohup` 包装词是字面量，无需额外校验。不需要重构——与既有「白名单而非黑名单」的设计对齐，属补齐同一架构。

### D2 ApplyPatch 解析 patch_text（guard-frozen.ts）

根因：guard 只认 `file_path/path` 字段，ApplyPatch 载荷只有 `patch_text`（宿主 schema 已核实）。修法：`tool_input.patch_text` 存在时按行解析 `*** Update File:` / `*** Add File:` / `*** Delete File:` / `*** Move File:` / `*** Move to:` 提取全部目标路径，逐个走既有 frozenKey 判定；命中已存在的冻结文件（可多个）→ 逐个落 `frozen_attempt`、deny 原因列出全部命中项。解析不出目标 → 放行（fail-open 纪律不变）。

### D3 账本追加自愈 + 坏行诊断（ledger.ts）

修法：`appendLedgerEntry` 追加前检查文件最后一个字节（openSync+readSync 单字节，不整读），非换行则先补 `\n`。`readLedger` 对解析失败的行向 stderr 输出 `[autoresearch] ledger line N is corrupt and was skipped: <前 120 字符>`。不做原地修复（append-only 语义不变），自愈只保证「新的损坏不再连带」。

### D4 workingDir 显式失败（paths.ts + 调用点）

修法：`resolveWorkCwd` 区分三种情况——无 workingDir 配置（静默回退，现状保留）、config 不可解析（stderr 诊断后回退）、workingDir 已设置但目标非目录（**throw**，错误信息含原始值与解析路径）。MCP server 在模块级调用它 → 失效时 server 启动即失败、宿主显示明确错误，宁可不工作也不把 `clean -fd` 指向错误的树。四个 hook 的调用点包 try/catch → 回退项目目录 + stderr 诊断（fail-open 纪律保留）。

### D5 提交隔离钩子 + 诊断（git.ts、finalize.sh）

修法：`commitExperiment` 的 `git commit` 加 `--no-verify`，stdio 改为捕获 stderr，失败时重抛含 stderr 文本的 Error。`finalize.sh` 的两处 `git commit` 同样加 `--no-verify`。`rollbackWorkingTree`/`git add`/`reset` 不触发内容钩子，不动。

### D6 checks 跳过去静默化（server.ts）

根因是沉默而非门政策：spec 本就规定「checks 在 benchmark 通过后执行」「无判定不否决 keep」。修法：repeat 循环后统计非零退出/超时的 run 数，>0 时响应加 `benchmark_warning` 字段（说明失败次数；checks 因此未执行时一并说明）。`pendingChecksFailed` 语义不变。

### D7 crash 门跨 segment（types.ts、ledger.ts、server.ts）

修法：`SessionState` 增加 `lastRunEver`（rebuildState 遇 run 行时无条件更新，config 行**不**重置）；server.ts:930 的审计门改用 `lastRunEver`。`lastRun`（segment 作用域）继续服务 before-hook payload 与 checks 标记——spec 451 行的重置语义对它们保持不变。

### D8 钩子超时进程组终止（server.ts runHookRaw）

修法：spawn 加 `detached: process.platform !== "win32"`（与 runCommand:282 同款），POSIX 超时路径改 `process.kill(-pid, "SIGKILL")` 并 catch 回退 `proc.kill`。Windows 已有 `killTreeOrWrapper`，不动。对齐既有防护，非重构。

### D9 卫生级修正（无 spec delta）

- repeat：`Math.trunc` 收敛为整数再钳位（spec 已写明「正整数」，属实现对齐）。
- `serverInfo.version`：启动时从 `../.zcode-plugin/plugin.json` 动态读取（消灭第三份硬编码版本号）；mcp-integration 测试断言 initialize 返回的版本与 plugin.json 一致。
- marketplace keywords 与 plugin.json 对齐（以 plugin.json 为准补 `benchmark`、`mcp`）；contract 测试增加 keywords 一致性断言。
- anti-thrash 示例：noop 改为中断连败链（对齐 guardrails spec 的既有语义）。
- spill 文件名 `pi-experiment-` → `autoresearch-experiment-`（上游血统残留）。

## 不修清单（属实但不值得现在修，留痕）

| 项                                                                                                                                        | 不修理由                                                                                     |
| ----------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| goal/scope 纳入 hash 漂移检测                                                                                                             | 扩大护栏面是 spec 级决策（Bash 通道本就拦不住，hash 只能事后发现），需独立 change + 可能 ADR |
| stop-continue 按账本而非会话触发                                                                                                          | spec 明文规定的行为，改它是改需求；独立提案                                                  |
| config 损坏时 autoresearchOff 丢失                                                                                                        | 涉及 readSessionConfig 返回语义变化，影响面广，与上一条同属 hook 语义提案                    |
| Windows hook 失效                                                                                                                         | 已有 ADR 级取舍记录（runtime-resolution-wrapper D5），重估属提案级                           |
| realpath 符号链接旁路、pid 复用竞态、dirtyFiles maxBuffer、METRIC 1000 行 cap、UTF-8 chunk 解码、JSON-RPC -32700、dashboard-server Origin | 触发概率低 / 影响 cosmetic / 修复成本不成比例                                                |
| validate segment 不变量死代码、baseline finite 口径、noop metric 语义                                                                     | 仅手写/legacy 账本可达，正常工具链路径不触发；排队                                           |
| 示例钩子裸 `node`                                                                                                                         | 修复需在示例里复制 run-node 探测逻辑，成本超示例价值；fail-open 不伤循环                     |

## 验证边界（未实测项，如实标注）

- **D8 进程组终止**：`HOOK_TIMEOUT_MS`（30s）不可注入，测试时限内无法实测孤儿被杀；采用结构验证（spawn 选项与 kill 路径对照 runCommand 既有实现）+ 全套测试无回归。
- **D4 的 server 启动失败路径**：宿主对 MCP server 启动失败的呈现方式未在真机验证；插件侧保证错误信息含失效路径与修复提示，且走 stderr（JSON-RPC stdout 通道纯净性已有既有保证）。
- 其余修复（D1/D2/D3/D5/D6/D7/D9）均有红→绿回归测试，复现场景固化进 `plugin/tests/`。
