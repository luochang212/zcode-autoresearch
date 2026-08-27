## Context

研究阶段已定案（`docs/research/autoresearch-survey.md` §6.1-6.3 + ADR-1/2）：形态 = MCP 工具承载机制 + skill 承载流程 + hooks 承载护栏与续跑；回滚 = keep 才 commit、非 keep 丢弃工作区（豁免 `.auto/`）；无会话注入 API（Stop hook 3 次窗口续跑）；MCP server 会话内长驻（实测）；hook matcher 只匹配工具名。插件根为 `plugin/`（用户确认），manifest name `autoresearch`，首版含三件套 + 护栏记忆 + 单元测试 + dashboard export（用户确认全选）。

技术约束：插件不得依赖第三方 npm 包（安装即用，无 npm install）；Node.js 运行时（zcode 同款）；MCP 用换行分隔 JSON-RPC；hooks 用 `type: process`（无 shell，最可移植）。

## Goals / Non-Goals

**Goals:**

- 一次完整循环可无头驱动：init → 改码 → run → log → git 账本一致。
- 护栏在交互式会话生效（PreToolUse 写保护、Stop 续跑、记忆注入）。
- server 核心逻辑有单元测试，集成路径有无头 CLI 验证。
- dashboard export 自包含、离线可看。

**Non-Goals:**

- 不做多目标并行/多会话编排（单会话单目标 + segment 顺序切换）。
- 不做 SSE 实时 dashboard（静态导出即可）。
- 不做泛化命令（debug/security/ship 等，报告 §6.2-5 的教训）。
- 不发布到远程 marketplace（本地结构先行）。

## Decisions

**1. server 单文件可拆分：`mcp/server.mjs` + `mcp/lib/` 纯逻辑模块。**
理由：hooks 和 tests 需要复用纯逻辑（度量解析、判定、账本），从 server 中拆出 `lib/experiment.mjs`（parseMetric、computeConfidence、segment 状态）与 `lib/ledger.mjs`（.auto/log.jsonl 读写、git 操作）。server.mjs 只做 JSON-RPC 与工具分发。备选：全部塞进 server.mjs（pi 的做法）——测试难写，放弃。

**2. 状态：`.auto/log.jsonl` append-only 事实源 + 内存缓存，每请求前从文件重建状态头。**
理由：崩溃恢复与多 hook 一致性（hooks 是独立进程，读同一账本）。MCP server 会话内长驻（实测 pid 保持），进程内缓存加速，但每次 run/log 后写盘，任何时刻 kill 都不丢已记录实验。ASI（Actionable Side Information）随 discard 记录，revert 后唯一幸存记忆。

**3. git 语义（ADR-2）：keep 才 commit；非 keep `git checkout -- .` + `git clean -fd`，豁免 `.auto/`。**
实现：`git checkout -- . ':(exclude,glob)**/.auto/**'` + `git clean -fd -e .auto -e .auto/`。实验分支隔离（init 时若在 master 提示建 `autoresearch/<tag>` 分支，不强推）。commit message：`experiment: <desc>\n\nResult: <json>`。

**4. hooks 四件套（交互式会话生效，headless 不执行——已验证）：**

- `Stop`：读 `.auto/log.jsonl` 判循环是否结束，未结束返回 `{decision:"block", reason: 进度摘要+下一步}`；3 次窗口由平台限制。
- `PreToolUse`（matcher `Write|Edit|Bash`）：拦截对 `.auto/measure.sh`/`.auto/checks.sh` 的写入（deny）；对 Bash 不做拦截（命令锁定在 server 内做）。
- `UserPromptSubmit`：注入账本最近 3 条摘要 + 下一步提示。
- `SessionStart`：注入 `.auto/` 存在性提示与 setup 指引。
  全部 fail-open（异常不阻断），无敏感数据。

**5. measure.sh 锁定（借 pi，§5.2）：命令解析剥 env/time/nice/nohup 包装后，核心命令必须是 `.auto/measure.sh` 本身（绝对或相对路径），拒绝 `evil; measure.sh` 链式注入。**

**6. dashboard export 由 command 文件驱动 agent 生成，还是 server 生成？**
server 提供 `export_dashboard` 工具（读账本渲染 HTML，纯函数），command `/autoresearch:export` 调它。理由：HTML 渲染是确定逻辑，交给 LLM 写 HTML 不可靠且烧 token；server 生成保证格式一致。

**7. 迭代上限与超时默认值：`maxIterations` 默认 20（`.auto/config.json` 可覆盖）；benchmark 超时 600s、checks 300s、hook 30s（hooks 内）。**

## Risks / Trade-offs

- [无头模式 hooks 不执行，护栏失效] → 集成验证聚焦 MCP 路径；README 与 skill 明确"autoresearch 请在交互式会话使用"。
- [`.auto/measure.sh` 锁定被绕过（agent 直接改脚本内容）] → PreToolUse 写保护拦截；skill 章程声明 Off Limits；server 对 measure.sh 内容不设防（继承 pi 的已知弱点，见 §5.1-8）。
- [`git add -A` 把无关脏文件一起 commit] → init 时检查 `git status --porcelain` 并在 config 记录 initial hash；skill 提示先 commit 干净基线。
- [Stop 3 次窗口内模型未完成循环即收尾] → skill 规程要求"每轮多实验"；Stop reason 写清进度；用户回车继续。
- [路径豁免在 zcode hooks 的 stdin 协议与本地 git 版本间有差异] → 豁免用 `:(exclude,glob)` pathspec（git ≥2.13），测试覆盖。

## Open Questions

（无——研究阶段开放问题已结案，本 change 无新的可延后未知。）
