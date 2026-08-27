# Autoresearch 实现调研：为 zcode 插件设计做准备

> 研究报告 · 2026-08-27 · OpenSpec change: `research-autoresearch-implementations`
> 目的：深入理解 archived/ 下三个 autoresearch 实现的机制，为「zcode autoresearch 插件」的形态与设计提供依据。

## 0. 背景、方法与版本标注

**什么是 autoresearch**：让一个 coding agent 在一个**固定且机械可验证的度量**上无限（或长程）自主迭代——改代码 → 跑基准 → 比较度量 → keep（保留改动）/ discard（回滚）→ 继续下一个假设。人只负责设定目标和约束，agent 负责全部实验执行。Karpathy 2026 年 3 月的原项目验证了"630 行训练脚本 + 114 行章程"就足以让 agent 过夜跑约 100 个实验。

**研究方法**：纯静态代码分析（archived/ 目录只读，不执行任何实验代码）。所有关键论断以仓库实际代码为准，README 声称逐一实测核对（见 §5.3）。karpathy 与 uditgoenka 仓库本地为 shallow clone（各只见 1 个 commit），uditgoenka 的历史声称已通过 GitHub tag 远端核对。

**研究样本与版本**（对比时请勿按"成熟度"排序，三者代表三条不同路线）：

| 样本                    | 版本/快照                         | 形态                             | 一句话定位                                         |
| ----------------------- | --------------------------------- | -------------------------------- | -------------------------------------------------- |
| karpathy-autoresearch   | commit `228791f`，2026-03-25      | **纯 prompt 章程**（program.md） | 原始概念验证：LLM 训练这一个领域                   |
| pi-autoresearch         | v1.6.2（package.json）            | **extension 工具 + skill 流程**  | 工程化：任意优化目标，宿主为 pi 终端 agent         |
| uditgoenka-autoresearch | v2.2.2（`050e30d`，2026-08 快照） | **多命令 skill 套件**            | 泛化：Claude Code/OpenCode/Codex 三宿主，14 个命令 |
| zcode-plugins（参考）   | commit `c06b727`，2026-08-26      | zcode 官方插件市场               | 核实 zcode 插件组成单元（§4）                      |

---

## 1. karpathy-autoresearch：极简章程形态

### 1.1 架构形态与组成

核心只有 3 个文件（wc -l 实测），权责三分：

| 文件         | 行数 | 分工                                                     | 权限                                           |
| ------------ | ---- | -------------------------------------------------------- | ---------------------------------------------- |
| `prepare.py` | 389  | 固定常量、数据准备、tokenizer、**评估函数 evaluate_bpb** | **冻结**（program.md:13 明令 "Do not modify"） |
| `train.py`   | 630  | GPT 模型 + 优化器 + 训练循环                             | **agent 唯一可改的文件**                       |
| `program.md` | 114  | agent 的全部指令                                         | 人类编辑迭代                                   |

README 自己说：program.md "is essentially a super lightweight 'skill'"——这就是全部"插件机制"：一个 markdown 章程，宿主 agent（Claude/Codex 等）直接读。没有任何宿主特定代码。

### 1.2 实验循环机制

program.md 规定的循环（`program.md:94-104`，"LOOP FOREVER"），9 步：

1. 看 git 状态（当前分支/commit）。
2. "Tune `train.py` with an experimental idea by directly hacking the code"——选题完全由 agent 自主，没有候选清单。
3. **先 `git commit` 再跑**——每个实验一个 commit。
4. `uv run train.py > run.log 2>&1`——全量重定向，"do NOT use tee or let output flood your context"。
5. `grep "^val_bpb:\|^peak_vram_mb:" run.log` 提取结果。
6. grep 为空 = crash → `tail -n 50 run.log` 看栈回溯尝试修复，几次修不好就放弃该实验。
7. 追加一行到 `results.tsv`（commit/val_bpb/memory_gb/status/description，status ∈ keep/discard/crash）。
8. 改善（val_bpb 更低）→ keep，分支前进。
9. 持平或变差 → "git reset back to where you started" 原子回滚。

关键约束：首跑必须原样 baseline（program.md:39）；时间预算固定 5 分钟 wall-clock（排除编译，前 10 步不计入计时，`train.py:578-579,602-604`，`prepare.py:31` `TIME_BUDGET=300`）；超过 10 分钟 agent 应 kill 并视为失败（program.md:108）；**"NEVER STOP"——循环永不暂停问人，直到人手动打断**（program.md:112）；预期约 12 实验/小时、过夜约 100 个。

### 1.3 度量与验证

- 度量：**val_bpb**（validation bits per byte），vocab-size 无关，`prepare.py:343-365` 实现，`train.py:622` 打印 `val_bpb: 0.xxxxxx` 供 grep。
- 噪声不靠重复评估，靠**确定性**：固定种子 `torch.manual_seed(42)`、固定验证分片（`prepare.py:43` pin 到 shard_06542）、大评估量（约 21M tokens，`prepare.py:32`）。
- 改进判据：无容差的单一标量比较——更低就 keep，持平/变差就 reset。唯一"软容差"是简洁性准则："~0 改进但代码更简单？Keep"（program.md:37）。

### 1.4 状态与记忆

- **git 即状态机**：每实验先 commit；keep = 保留 commit；discard = `git reset`。被接受的实验链天然构成可 review 的 diff 序列。
- **results.tsv 即记忆**：每实验一行的扁平账本，**故意不入 git**（.gitignore 排除）。
- `analysis.ipynb`：人类事后复盘（keep 率、frontier 曲线、top 改进），loop 中 agent 不用。

### 1.5 安全护栏

- 禁改 prepare.py（度量所在）、禁改评估 harness、禁装新依赖（program.md:28-31）。
- VRAM 软上限、简洁性准则、10 分钟 kill、训练循环内 fast-fail（loss NaN/>100 直接 exit 1，`train.py:570-572`）。
- **本质：除 5 分钟预算物理写死在冻结文件里，其余全是 prompt 契约**——没有哈希校验、没有只读位、没有 OS 级 timeout 包装。这是原版留给宿主生态的最大改进空间。

### 1.6 上下文/token 控制

114 行章程就是全部。历史压缩三板斧：训练输出全量重定向（禁止 tee）、只 grep 两行、crash 才 tail -50；每个实验压成 TSV 一行。设计核心是**让 token 流入严格受控**，长跑才可持续。

### 1.7 对宿主 agent 的依赖

只要 bash（uv/git/grep/tail/重定向）、文件编辑、能等 ≥5 分钟的长命令、无人值守权限（README:44 "disable all permissions"）。零宿主特定内容——这也是它最难被"插件化"增强、也最易移植的原因。

---

## 2. pi-autoresearch：extension 工具 + skill 流程形态

### 2.1 架构形态与组成

三层解耦（README.md:178-191，与代码一致；wc -l 实测）：

| 层                                | 文件                                              | 行数                 | 职责                                                                                |
| --------------------------------- | ------------------------------------------------- | -------------------- | ----------------------------------------------------------------------------------- |
| **extension**（领域无关基础设施） | `extensions/pi-autoresearch/index.ts` 等 7 个文件 | index.ts 3067 + ~812 | 3 个工具、/autoresearch 命令、widget/dashboard、auto-resume、git 自动 commit/revert |
| **skills**（流程与领域知识）      | `skills/autoresearch-{create,hooks,finalize}/`    | 160/173/88+448       | 冷启动问目标→写会话文件→开跑；事后整理                                              |
| **slash command**（模式开关）     | index.ts:2949-3066                                | —                    | 进入/退出模式，本身不含流程                                                         |
| **磁盘状态**                      | `.auto/` 目录                                     | —                    | 唯一事实源，内存只是缓存                                                            |

### 2.2 工具设计（agent 唯一触碰的接口）

- `init_experiment`（index.ts:1563-1676）：会话名、`metric_name`、`metric_unit`、`direction`（lower/higher）→ 写 config 行进 `.auto/log.jsonl`。
- `run_experiment`（index.ts:1682-2192）：跑命令（默认 600s 超时），wall-clock 计时；输出滚动 buffer + 超量溢写临时文件；**给 LLM 的回传硬截断 10 行/4KB** 并附全量日志路径；用正则 `^METRIC name=value` 提取度量；benchmark 过后自动跑 `.auto/checks.sh`（正确性背压）。
- `log_experiment`（index.ts:2198-2569）：记录 status（keep/discard/crash/checks_failed）；**keep 时自动 `git add -A && git commit`（message 尾带结构化 Result JSON）并回填真实短 hash；非 keep 时自动 `git checkout -- . + git clean -fd`（豁免 `.auto/` 目录）**——revert 不是 reset，因为改动还没 commit。

### 2.3 实验循环机制

1. 读 `.auto/prompt.md`（会话章程：目标/度量/文件范围/Off Limits/What's Been Tried）。
2. 从 ideas backlog 或上次实验的 `asi.next_action_hint` 选假设（**asi = Actionable Side Information，是 revert 后唯一幸存的记忆**）。
3. 改代码 → `run_experiment` → `log_experiment`（工具自动 commit 或 revert）。
4. **auto-resume**：`agent_end` 事件 → 等 800ms settled window 确认 agent 空闲 → 检查熔断条件（200 轮上限 / 连续 >20 次失败停机 / 纯聊天轮不续跑）→ `pi.sendUserMessage("Run the next iteration now…")` **注入一条合成用户消息**驱动下一轮（index.ts:1115-1192）。
5. compaction（上下文压缩）时不用 LLM 摘要，而是**确定性规则摘要**：规则全文 + ideas + 最近 50 条 run 单行化（含 hyp/next/rollback 三字段），续跑消息明令"不要重读文件"（compaction.ts:45-56, index.ts:1194-1203）。

keep/discard **判定权在 agent**（prompt 规则：主度量改善才 keep），工具只做硬门禁（checks 失败禁 keep）。

### 2.4 度量与验证

- 度量在 init 时配置，方向（lower/higher）只是判定方向。
- **confidence 噪声护栏**：当前 segment 全部结果的 MAD（中位绝对偏差）作为噪声底，`|best - baseline| / MAD` 给绿/黄/红——纯 advisory，从不自动 discard（index.ts:426-457）。
- **checks.sh 正确性背压**：benchmark 过了但 checks 失败 → status=checks_failed、禁 keep、自动 revert。防"度量好了、功能坏了"。

### 2.5 状态与记忆

`.auto/log.jsonl` 是 **append-only 单一事实源**（config 行/run 行/hook 观测行混排）；会话重启、/tree、compaction 后一律从文件全量重建内存态。segment 机制：每次 init_experiment 递增 segment，baseline/best 只在当前 segment 内计算——换目标不污染历史。`/autoresearch export` 把 jsonl + 模板渲染成浏览器 dashboard（SSE 实时刷新）。

### 2.6 安全护栏

1. **benchmark 脚本锁定**：`.auto/measure.sh` 存在时 run_experiment 拒绝跑任何其他命令，且剥掉 env/time/nice 包装后要求命令行首就是脚本——防 `evil.py; measure.sh` 注入（index.ts:1724-1747）。
2. **工具模式门禁**：三工具只在 autoresearch 模式下对 LLM 可见，平时从工具列表摘除。
3. maxIterations 上限、auto-resume 熔断（200 轮/20 连败）、各处硬超时。
4. 未设防点：没有硬拦 agent 改 measure.sh/checks.sh 本身（靠 prompt 约束）；`git add -A` 会把无关脏文件一起 commit。

### 2.7 上下文/token 控制

system prompt 每轮只注入**指针**不注入内容（"fully cache-safe"）；工具回传 10 行/4KB 截断；完整数据表渲染进 TUI widget 和浏览器 dashboard 给**人**看，agent 只拿一行式回执——**人机上下文分离**是显式设计。

### 2.8 对 pi 的依赖与可迁移性

依赖 pi 的：工具注册+schema、生命周期事件钩子、**合成用户消息**（auto-resume 核心）、动态工具可见性、受控子进程执行、TUI widget。其中"工具三件套、jsonl 事实源、.auto/ 目录、auto-resume、确定性 compaction"全是纯 TS 逻辑，无 pi 依赖——概念上可整体平移到任何有等价原语的宿主。

---

## 3. uditgoenka-autoresearch：多命令 skill 套件形态

### 3.1 架构形态与组成

**单一源 + 多宿主分发**：canonical 源在 `.claude/`（skills + commands + hooks），`scripts/transform.sh`（260 行）用三类 sed（命令语法、交互工具名、路径）机械生成 claude-plugin/、.opencode/（OpenCode）、plugins/autoresearch/（Codex）三份镜像，配 parity 测试锁定一致。

- 路由 SKILL.md：**v2.1.0 是 41 行**，v2.2.2 实测 **107 行**（orchestrator 协议回流导致膨胀）。
- 命令文件：v2.2.2 共 **14 个**（core loop + 13 子命令），实测行数 94–136；另含 4 个 reference 文件和 2 个内嵌脚本（orchestrate.sh 448 行、score-regression.sh 205 行）。

### 3.2 核心循环机制（/autoresearch 主命令，110 行）

输入 `Goal/Scope/Metric/Direction/Verify/Guard/Iterations`，缺项单次批量问用户；然后：

1. **前置检查**：git 干净树、锁文件、detached HEAD；**对 Verify 命令做安全筛查**（拦 rm -rf、fork bomb、curl|sh、外传管道等）。
2. **Baseline = Iteration 0**：建 `autoresearch/loop-{YYMMDD}-{HHMM}/` 目录 + results TSV（首行 `# metric_direction:` 注释）。
3. 每次迭代 7 阶段：Review（读 TSV 尾部 + `git log -20` + 上一 keep 的 diff）→ Modify（ONE focused change）→ **先 Commit**（`experiment:` 前缀）→ Verify（提取新度量算 delta）→ Guard（失败则"revert regardless of metric improvement"）→ Decide（keep/discard/crash/no-op/hook-blocked/metric-error 六态）→ Log。
4. **回滚用 `git revert` 而非 `git reset`**——失败实验保留在历史里供后续学习。
5. 默认 25 次迭代上限，"unlimited" 需显式 opt-in（与 karpathy 的 NEVER STOP 相反）。

### 3.3 Orchestrator（v2.2.0）：自然语言目标 → 自动命令链

plain-language goal → `orchestrate.sh classify`（**纯 grep 关键词 + 硬编码优先级**，9 个 archetype，README 说的 "fuzzy matching" 名不副实）→ 复用 plan 逻辑推导 **Success predicate**（一次性 goal-met 检查，如 `npm test` exit 0）→ 单次 AskUserQuestion 确认 → Round-0 dry-run 验证 predicate 可跑 → 循环中由 `next-hop` 决策表路由（有错→fix；回归→regression；predicate 满足→verify hop 独立复核→CONVERGED；末 5 cycle 平坦→plateau 停机）。

**确定性 seam 模式**是本项目最值得抄的工程实践：分类、路由、plateau 判定、命令安全筛查、收敛判定全部下沉为**纯函数 shell 脚本**（8 个子命令，退出码可 CI 断言），markdown 只描述协议——LLM 不可靠的部分不给 LLM。

### 3.4 命令全景与泛化边界

14 个命令中，真正属于 autoresearch 循环本体的只有 **core loop + fix**（错误数特例）；plan/evals/regression 是支撑件；**ship/security/probe/scenario/predict/reason/learn/improve 明显超出 autoresearch 范畴**，是借牌子的通用 agent 工作流（作者自己的 CONTEXT.md Loop Shapes 表也承认）。这是"泛化过度"的直接证据：为 zcode 做插件时应当砍掉。

### 3.5 状态与记忆

三层：TSV（人类可读实验账本，`# metric_direction` 首行让工具免问方向）→ `handoff.json`（命令间契约，schema 版本化）→ `orchestrator-state.json`（additive ledger，resume 时校验+重筛 predicate）。跨 session 恢复靠：git 历史 + iteration-context hook 自动重注入 TSV 尾 3 行 + `$TMPDIR` 轻量会话态。

### 3.6 安全护栏（Claude Code 形态独有，9 个 hooks）

- **block 级**：scout-block（.ckignore 路径过滤）、dangerous-cmd-block（force push、rm -rf、git reset --hard、git clean -f 等）、simplify-gate（>800 行 diff 阻止 ship）。
- **ask/warn 级**：privacy-block（.env/.pem/credentials 升级给权限 UI）。
- **inject 级**：iteration-context（每 5 prompt 重注入 TSV 尾 3 行——上下文压缩后的记忆再注入）、session-init、subagent-context、stop-notify。
- 工程范式：**全部 fail-open**（hook 崩溃不阻断工作）、每个可 `AR_DISABLE_*` 环境变量关闭、无状态 stdin/stdout JSON 协议、有界日志。
- loop 内：verify 命令安全筛查 + Guard 独立于 Metric（一个管安全网一个管目标，双信号）+ orchestrator 的 screen-cmd 黑名单（rm -rf 全变体、curl|sh、外传管道、DB 锚定 allowlist）。

### 3.7 token 效率声称实测核对（README vs 代码）

| README 声称                               | 实测                                      | 判定                      |
| ----------------------------------------- | ----------------------------------------- | ------------------------- |
| v2.0 monolith SKILL.md 813 行             | GitHub tag v2.0.04 实测 813 行/43.7KB     | ✅ 属实                   |
| "thin 41-line routing file"               | v2.1.0=41 行 ✅；**v2.2.2 已是 107 行**   | ⚠️ 当前版过时             |
| "12 command files 94–120 lines"           | v2.1.0=12 个 ✅；v2.2.2=**14 个，94–136** | ⚠️ 当前版过时             |
| "~100K tokens per invocation"（monolith） | 43.7KB ≈ **~11K tokens**                  | ❌ 夸大约 9 倍            |
| "~5–8K tokens per invocation"（新架构）   | 单命令 4–6KB ≈ **1–1.5K tokens**          | ❌ 夸大 4–5 倍            |
| "95% token reduction"                     | 实际削减约 **70–85%**（43.7KB→~13KB）     | ❌ 达不到，方向对幅度虚标 |

结论：**架构重构本身真实且有效**（单次加载 43.7KB→~13KB），但营销数字系统性夸大。另一个教训：SKILL.md 在两个版本内从 41 行长回 107 行——**新能力总会往路由层回流**，要么把 orchestrator 协议放 reference 子文件只留指针，要么接受路由层膨胀并停止在文档里写死行数（该仓库 4 处文档数字全部过时）。

---

## 4. zcode 插件组成单元核实（zcode-plugins @ c06b727，2026-08-26）

依据官方 `docs/PLUGIN_DEVELOPMENT_CN.md` 与 `plugins/example-plugin`（v0.3.0，官方推荐复制起步的模板）：

**一个 zcode 插件 = `.zcode-plugin/plugin.json` 清单 + 五类组件：**

| 组件           | 位置/格式                                                                                                                                                                   | 对本项目意味着                                               |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| **Commands**   | `commands/*.md`，YAML frontmatter（description 等）+ `$ARGUMENTS`，调用形如 `/插件名:命令名`                                                                                | `/autoresearch:loop` 等入口                                  |
| **Skills**     | `skills/<名>/SKILL.md`，frontmatter name/description，可带 references/、scripts/（github 插件先例）                                                                         | 章程/流程知识，按需加载                                      |
| **Hooks**      | `hooks/hooks.json` 自动发现；事件：**SessionStart、UserPromptSubmit、PreToolUse、PermissionRequest、PostToolUse、PostToolUseFailure、Stop**                                 | 护栏 + 记忆再注入 + **循环续跑**                             |
| **MCP 服务**   | 根 `.mcp.json`，stdio（换行分隔 JSON-RPC），键名自动命名空间 `plugin:<插件>:<服务>`，支持 `${ZCODE_PLUGIN_ROOT}/${ZCODE_PLUGIN_DATA}/${ZCODE_PROJECT_DIR}/${user_config.*}` | **init/run/log 三件套工具**的载体（等价 pi extension tools） |
| **userConfig** | manifest 内声明，设置页呈现                                                                                                                                                 | 默认迭代上限、超时等用户可调项                               |

**对 autoresearch 最关键的两个 hook 协议**（PLUGIN_DEVELOPMENT_CN.md §4.6）：

1. **Stop hook → 循环续跑原语**：`{"decision":"block","reason":"…"}` 可让主模型再跑一轮，**连续最多 3 次**后强制结束。这是 zcode 里等价于 pi `agent_end + sendUserMessage` 的机制——但有 3 次硬顶，意味着"无限循环"需要"Stop 注入 → 3 轮耗尽 → 用户侧或 hook 侧重新点火"的组合策略，或让单轮承载多个实验。
2. **PreToolUse → 硬护栏**：`permissionDecision: "deny"/"ask"/"allow"` + `updatedInput` 完整替换工具输入——可实现对度量文件写保护（拦截 Write/Edit 指向冻结文件）、危险命令拦截（Bash matcher），比三个项目里任何一家纯 prompt 护栏都硬。

其他要点：PluginData 目录存长期数据（不写安装目录）；"启用插件即授予代码执行信任"；hook 进程 env 注入 ZCODE_PLUGIN_ROOT 等变量；MCP env 可引用 userConfig。

### 4.1 运行验证记录（2026-08-27，真实环境实验）

> 验证方法：用 zcode 运行时 bundle（`/Applications/ZCode.app/Contents/Resources/glm/zcode.cjs`，v0.16.5）以无头模式（`-p`）在隔离沙盒（fake `HOME` + 沙盒 `.zcode/config.json`）驱动真实模型调用，配自定义 MCP server 与 hooks 探针。DeepSeek 通道（`deepseek-v4-flash`）验证通过。**注意：无头模式下 hooks 不执行**（SessionStart 探针未触发），因此 hook 行为以官方文档 + bundle 实现为准，MCP 行为以实测为准。

**① 无会话注入 API —— 已确认"没有"**：bundle 全量搜索 `sendUserMessage` / `injectUserMessage` **零命中**。zcode 的续跑唯一原语是 **Stop hook**，实现级确认：

```js
function a9r(e, t) {
  // e=Stop hook 输出, t=stopHookContinuationCount
  return (
    e.stopShouldContinue === true && e.additionalContexts.length > 0 && t < 3
  ); // soi=3
}
```

即：hook 返回 `decision:"block"` 且带 reason/additionalContext 时续跑，**同一 turn 窗口内连续续跑最多 3 次**（`stopHookContinuationCount` 达 3 后强制收尾），与官方文档一致。

**② MCP 长驻状态 —— 实测通过**：自定义 stdio MCP server 在单次会话中连续两次 `tools/call`（n=1, n=2），**两次由同一进程（pid 3945）处理**，进程内状态保持（call 计数 1→2，`startedAt` 相同）。结论：MCP server 会话内长驻，可在服务端维护运行时状态（如 `experimentsThisSession`）；`.auto/` 落盘仍保留作崩溃恢复事实源。标准 JSON-RPC 头（`jsonrpc`/`method`/`id`）+ 换行分隔被原生接受；server 主动 `exit()` 后同一会话会重新拉起（initialize 重放）。**补充：工具无法从 schema 动态隐藏（`tools/list` 恒定），但权限层有门禁等价物**——`permission.allowedTools/disallowedTools` 配置 + `PermissionRequest` hook 的 `decision.behavior: "deny"/"allow"`（自动拒绝/放行权限询问，bundle 51 处命中）。

**③ hook matcher 只匹配工具名 —— 已确认**：官方文档明确 matcher 是**对工具名的正则**（`Bash`/`Write`/`Edit`…），无法按路径过滤；路径判断必须在 hook 脚本内读 stdin（`tool_input.file_path`）。PreToolUse 返回 `permissionDecision:"deny"` + `permissionDecisionReason` 即可硬拒绝，`updatedInput` 可整体替换工具输入（替换后重新校验 schema）。aggregation 规则：deny 优先于 ask，ask 优先于 allow。

**④ 无头模式边界 —— 已确认**：`--prompt` 无头模式加载 MCP 与 workspace 配置，但 **hooks 不执行**（SessionStart/UserPromptSubmit/Stop 探针均未触发）。交互式桌面/TUI 会话才有 hook runner。对插件的影响：护栏与续跑依赖 hooks，意味着**无头/CI 驱动的 autoresearch 会话拿不到 hook 护栏**——首版明确以交互式会话为目标场景。

**⑤ 模型配置链路**（供后续复现）：无头 CLI 读 `~/.zcode/cli/config.json`（可用 `HOME` 重定向隔离），schema 为顶层 `provider`（记录 `kind/options{apiKey,baseURL}/models`）+ `model.main`（字符串 `"provider/model"`）。`providers`/`providersId` 等写法会被 schema 校验静默丢弃导致 `Model config is missing`。附带发现：BigModel 账号有 5 小时使用上限（错误码 1308），DeepSeek 通道无此限制。

---

## 5. 跨实现对比

### 5.1 核心维度对比

| 维度                  | karpathy                         | pi-autoresearch                                                              | uditgoenka                                                   |
| --------------------- | -------------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------ |
| **形态**              | 114 行纯 prompt 章程             | extension 工具（3067 行 TS）+ skill（流程）+ 命令（开关）                    | 薄路由 SKILL.md + 14 个命令 markdown + shell 脚本            |
| **循环驱动**          | agent 自觉遵循章程（NEVER STOP） | 事件驱动 auto-resume（合成用户消息 + 熔断）                                  | 单命令内 bounded 循环（默认 25 次）；orchestrator 跨命令路由 |
| **度量获取**          | grep 训练日志固定行              | 工具内 `METRIC name=value` 正则解析 + 超时 + 截断                            | agent 自己跑 Verify 命令并提取数值                           |
| **度量防篡改**        | prompt 契约（冻结文件）          | **工具锁死 benchmark 脚本**（最强）                                          | verify 命令安全筛查 + orchestrator verify hop 独立复核       |
| **keep/discard 判定** | agent 按章程判                   | agent 判，工具硬门禁（checks 失败禁 keep）                                   | agent 按 6 态协议判，Guard 独立否决                          |
| **回滚**              | `git reset`（丢历史）            | revert 未 commit 改动（checkout+clean，豁免 .auto/）                         | `git revert`（**失败历史保留**）                             |
| **状态/记忆**         | results.tsv（不入库）+ git       | `.auto/log.jsonl` append-only 事实源 + ASI 幸存记忆 + 确定性 compaction 摘要 | TSV + handoff.json + orchestrator-state.json 三层            |
| **正确性背压**        | 无（度量即一切）                 | checks.sh（失败禁 keep+自动 revert）                                         | Guard 命令（独立于 Metric 的双信号）                         |
| **安全护栏**          | 全 prompt 契约                   | 模式门禁+脚本锁定+迭代上限+熔断                                              | 9 个 hooks（block/ask/inject 三级）+ screen-cmd 黑名单       |
| **token 控制**        | 重定向+grep+TSV 单行             | 指针注入+10行/4KB 截断+人机上下文分离                                        | 薄路由+自包含命令文件（实测 70–85% 削减）                    |
| **目标领域**          | 仅 LLM 训练                      | 任意可测量命令                                                               | 任意领域（但 2/3 命令已泛化成通用工作流）                    |
| **无人值守**          | ✅ 过夜设计初衷                  | ✅ auto-resume + 熔断                                                        | ⚠️ 默认 bounded，unlimited 需 opt-in                         |

### 5.2 三条路线的本质

- **karpathy 证明了概念**：循环的最小充分集 = 冻结度量 + 单一可改对象 + git 状态机 + 一行式账本 + 永续 prompt。其他一切都是增强。
- **pi-autoresearch 证明了工程形态**：把"agent 不可靠的部分"（计时、解析、commit/revert、账本、续跑、截断）全部下沉为工具/hook，agent 只做决策——是三者中**机制设计最完整**的实现。
- **uditgoenka 证明了泛化路径与边界**：多宿主分发（canonical + transform + parity 测试）、确定性 seam（shell 纯函数）、也演示了泛化过度（14 命令中仅 2 个属于本体）与营销失真（token 数字夸大）。

### 5.3 事实核对汇总

- karpathy README 声称全部属实（含 5 分钟预算的代码级实现）。
- pi-autoresearch README 与代码基本一致，两处**过时**：compaction 描述停留在 1.2.0 行为（现为确定性摘要+续跑）；ctrl+shift+t 快捷键已移除（1.6.0）。
- uditgoenka：813 行 monolith 与 41 行路由（v2.1.0）属实；**当前版路由已 107 行、命令 14 个**；token 数字（100K→5-8K、95%）系统性夸大 4–9 倍，实际削减 70–85%。

---

## 6. zcode autoresearch 插件设计建议

### 6.1 推荐形态：MCP 工具承载机制 + skill 承载流程 + hooks 承载护栏与续跑

以 pi-autoresearch 的三层解耦为骨架，用 zcode 五类组件落地：

```
zcode-autoresearch/
├── .zcode-plugin/plugin.json        # 清单 + userConfig（maxIterations、超时、direction 默认值）
├── .mcp.json                        # MCP 服务：autoresearch 三件套工具
├── mcp/server.mjs                   # init_experiment / run_experiment / log_experiment
│                                    #   （计时、METRIC 解析、10行/4KB 截断、自动 commit/revert、
│                                    #     benchmark 脚本锁定、checks 背压——全部下沉到工具）
├── skills/
│   └── autoresearch/SKILL.md        # 薄路由（≤60 行）：安全不变量 + 循环规程 + 状态文件指针
│       references/loop-protocol.md  # 详细循环协议（防 SKILL.md 膨胀回流）
│       references/setup-guide.md    # 目标→度量→checks 配方
├── commands/
│   ├── autoresearch.md              # /autoresearch <goal>：读 .auto/prompt.md 续跑，否则走 setup
│   └── autoresearch-dashboard.md    # （可选）导出 HTML dashboard
└── hooks/
    ├── hooks.json
    ├── stop-continue.mjs            # Stop hook：实验未达停止条件 → decision:block 续跑（3 次窗口）
    ├── guard-frozen.mjs             # PreToolUse：写保护度量脚本/冻结文件（deny Write|Edit）
    └── memory-reinject.mjs          # UserPromptSubmit/SessionStart：重注入 .auto/ 账本尾行
```

各实现的具体借鉴点：

- **从 karpathy 拿**：单文件章程的极简哲学（SKILL.md 保持薄）；"冻结度量 + agent 唯一可改范围"的权责分离；TSV/单行式实验账本；简洁性准则写进章程。
- **从 pi-autoresearch 拿**：工具三件套的全部语义（尤其 benchmark 脚本锁定、keep 自动 commit + 非 keep 自动 revert、ASI 幸存记忆、确定性 compaction 摘要、confidence/MAD 噪声提示）；`.auto/` 目录事实源；auto-resume 熔断器（轮次上限+连败停机）；人机上下文分离（dashboard 给人，回执给 agent）。
- **从 uditgoenka 拿**：回滚用 `git revert` 语义之争的权衡（见 6.2）；Guard 与 Metric 双信号；确定性 seam（分类/路由/收敛判定写纯函数脚本，不交给 LLM）；命令 markdown 的自包含写法；iteration-context 式记忆再注入 hook。

### 6.2 关键设计决策（推荐 + 已记录为 ADR）

1. **循环续跑策略**（最大风险点）：**已实证确认 zcode 没有会话注入 API**（bundle 零命中，§4.1①），Stop hook 是唯一续跑原语，连续 block 上限 3 次。推荐组合：每轮 user turn/Stop 窗口内让 agent 连续跑多个实验（工具化的 run/log 使单轮多实验成为自然节奏），Stop hook 在"账本显示未达停止条件"时 block 续跑（每个窗口 3 次，`experiment:` commit 与 `.auto/` 事实源保证每轮状态无损）；3 次耗尽后由 Stop hook 在输出中写明进度小结，用户回车或下一个 prompt 即恢复循环。**过夜无人值守不可用**（无注入 API），定位为"长会话自主迭代 + 用户周期性确认"，或在 TUI 层由用户侧脚本周期性唤醒。
2. **回滚语义**：推荐 pi 风格（实验未 commit 前直接丢弃工作区改动，keep 才 commit），比 karpathy 的 reset 和 uditgoenka 的先-commit-后-revert 都轻；保留 `experiment:` 前缀 commit message + message 尾 Result JSON 供审计。
3. **护栏硬化**（相对三个样本全部升级）：度量/检查脚本放 `.auto/`，用 PreToolUse hook **deny** 对该目录的 Write/Edit（prompt 契约 → 硬护栏）；Bash 危险命令拦截借 uditgoenka 的 dangerous-cmd-block 清单；所有 hook fail-open + `AR_DISABLE_*` 式开关。
4. **token 架构**：SKILL.md 薄路由 + references 按需展开（吸取 uditgoenka 107 行回流教训）；工具回传硬截断 + 指针；不写死行数进文档。
5. **泛化边界**：首版只做 core loop + setup/finalize + dashboard，不做 debug/security/ship 等泛化命令（uditgoenka 的教训：2/3 命令超出本体后稀释定位）。

### 6.3 开放问题清单（已逐条结案，2026-08-27 实证）

| #   | 问题                                                | 结论                                                                                                                                                                                                                                                                                                                                                                                         | 依据                                |
| --- | --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| 1   | zcode 是否有程序化注入用户消息/自动重启会话的 API？ | **没有**。Stop hook 是唯一续跑原语，连续 block 上限 3 次；过夜无人值守不可用，按"长会话 + 用户周期性确认"设计                                                                                                                                                                                                                                                                                | §4.1① bundle 零命中 + `a9r`/`soi=3` |
| 2   | MCP 工具是否支持动态可见性切换（模式门禁）？        | **schema 层无**（MCP 工具注册后恒定可见，`tools/list` 实测恒定）；**但权限层有等价门禁**：`permission.allowedTools/disallowedTools` 配置（bundle `xko` schema 确认）＋ `PermissionRequest` hook 返回 `decision.behavior: "deny"/"allow"` 自动拒绝/放行权限询问（bundle 51 处命中）。设计：非模式时 PermissionRequest deny + 工具内检查双保险；低风险工具不经过权限询问，故工具内检查仍是兜底 | §4.1② + bundle 权限层确认           |
| 3   | hook matcher 能否按路径参数过滤？                   | **不能**。matcher 只匹配工具名；路径判断在 hook 脚本内读 stdin（`tool_input.file_path`），PreToolUse `deny` 硬拦                                                                                                                                                                                                                                                                             | 官方文档 §4.5 + §4.1③               |
| 4   | 插件 MCP 服务能否长驻维护会话级状态？               | **可以（实测）**。同一会话多次 tools/call 同一进程、进程内状态保持；`.auto/` 落盘仍作为崩溃恢复事实源                                                                                                                                                                                                                                                                                        | §4.1② pid 3945 实验                 |
| 5   | 是否需要 dashboard？                                | **不影响根设计，可后置**。首版 `/autoresearch export` 生成静态 HTML 起步；SSE 实时版是增强不是根设计的一部分                                                                                                                                                                                                                                                                                 | §5.2 人机上下文分离理念             |
| 6   | 多实验目标并行是否影响根设计？                      | **不影响，可后置**。单会话单目标 + pi 的 segment 机制（顺序切换目标）即满足；多目标并行 = 多个会话各自 `.auto/` + git 分支命名约定（`autoresearch/<tag>`），不改变核心机制                                                                                                                                                                                                                   | §5.1 karpathy 分支命名 + pi segment |

遗留（需实现阶段验证）：无头模式不执行 hooks（§4.1④）是否也适用于**插件 hooks**（当前证据为配置 hooks；插件 hooks 的 runner 激活逻辑不同）；ZCode.app 桌面端 TUI 会话中 Stop 续跑的实际手感（3 次窗口耗尽时模型是否自然收尾）。

---

## 7. 关键决策记录

本研究产出的关键决策已用 adr-kit 记录（详见 `adr/decisions/`）：

- **ADR-1**（`adr/decisions/1-…-mcp-tools-skill-hooks-architecture.md`）：zcode autoresearch 插件采用「MCP 工具承载机制 + skill 承载流程 + hooks 承载护栏与续跑」的形态（§6.1）。形态可行性经 §4.1 运行验证：MCP 长驻、hooks 协议（Stop 续跑 3 次上限、PreToolUse deny）均确认，续跑策略按"无会话注入 API"修订（§6.2-1）。
- **ADR-2**（`adr/decisions/2-…-commit-on-keep-discard-working-tree-otherwise.md`）：实验回滚采用「keep 才 commit、非 keep 丢弃工作区改动（豁免 `.auto/`）」语义（§6.2-2）。

## 附录：证据索引

- karpathy：`archived/karpathy-autoresearch/program.md`（114 行，循环 L94-104、禁令 L28-31、NEVER STOP L112）、`prepare.py:31,43,343-365`、`train.py:570-572,578-604,622`。
- pi：`archived/pi-autoresearch/extensions/pi-autoresearch/index.ts`（工具 L1563-2569、auto-resume L1115-1192、命令 L2949-3066）、`compaction.ts:45-56`、`skills/autoresearch-create/SKILL.md`。
- uditgoenka：`archived/uditgoenka-autoresearch/.claude/commands/autoresearch.md`（110 行七阶段）、`.claude/skills/autoresearch/SKILL.md`（107 行）、`scripts/orchestrate.sh`（448 行）、`claude-plugin/hooks/`（9 hooks）。
- zcode：`archived/zcode-plugins/docs/PLUGIN_DEVELOPMENT_CN.md`（§4.6 Stop/PreToolUse 协议）、`plugins/example-plugin/`（五类组件模板）、`marketplace.json`。
