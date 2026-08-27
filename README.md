<div align="center">

# zcode-autoresearch

[![ZCode Plugin](https://img.shields.io/badge/ZCode-Plugin-0e7490?style=flat-square)](<>)
[![Version](https://img.shields.io/badge/version-0.1.0-0e7490?style=flat-square)](<>)
[![License](https://img.shields.io/badge/license-MIT-0e7490?style=flat-square)](LICENSE)
[![CI](https://github.com/luochang212/zcode-autoresearch/actions/workflows/ci.yml/badge.svg)](https://github.com/luochang212/zcode-autoresearch/actions/workflows/ci.yml)
[![zread](https://img.shields.io/badge/%E2%80%8B-zread-0e7490?style=flat-square&logo=data%3Aimage%2Fsvg%2Bxml%3Bbase64%2CPHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAxNiAxNiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTQuOTYxNTYgMS42MDAxSDIuMjQxNTZDMS44ODgxIDEuNjAwMSAxLjYwMTU2IDEuODg2NjQgMS42MDE1NiAyLjI0MDFWNC45NjAxQzEuNjAxNTYgNS4zMTM1NiAxLjg4ODEgNS42MDAxIDIuMjQxNTYgNS42MDAxSDQuOTYxNTZDNS4zMTUwMiA1LjYwMDEgNS42MDE1NiA1LjMxMzU2IDUuNjAxNTYgNC45NjAxVjIuMjQwMUM1LjYwMTU2IDEuODg2NjQgNS4zMTUwMiAxLjYwMDEgNC45NjE1NiAxLjYwMDFaIiBmaWxsPSIjZmZmIi8%2BCjxwYXRoIGQ9Ik00Ljk2MTU2IDEwLjM5OTlIMi4yNDE1NkMxLjg4ODEgMTAuMzk5OSAxLjYwMTU2IDEwLjY4NjQgMS42MDE1NiAxMS4wMzk5VjEzLjc1OTlDMS42MDE1NiAxNC4xMTM0IDEuODg4MSAxNC4zOTk5IDIuMjQxNTYgMTQuMzk5OUg0Ljk2MTU2QzUuMzE1MDIgMTQuMzk5OSA1LjYwMTU2IDE0LjExMzQgNS42MDE1NiAxMy43NTk5VjExLjAzOTlDNS42MDE1NiAxMC42ODY0IDUuMzE1MDIgMTAuMzk5OSA0Ljk2MTU2IDEwLjM5OTlaIiBmaWxsPSIjZmZmIi8%2BCjxwYXRoIGQ9Ik0xMy43NTg0IDEuNjAwMUgxMS4wMzg0QzEwLjY4NSAxLjYwMDEgMTAuMzk4NCAxLjg4NjY0IDEwLjM5ODQgMi4yNDAxVjQuOTYwMUMxMC4zOTg0IDUuMzEzNTYgMTAuNjg1IDUuNjAwMSAxMS4wMzg0IDUuNjAwMUgxMy43NTg0QzE0LjExMTkgNS42MDAxIDE0LjM5ODQgNS4zMTM1NiAxNC4zOTg0IDQuOTYwMVYyLjI0MDFDMTQuMzk4NCAxLjg4NjY0IDE0LjExMTkgMS42MDAxIDEzLjc1ODQgMS42MDAxWiIgZmlsbD0iI2ZmZiIvPgo8cGF0aCBkPSJNNCAxMkwxMiA0TDQgMTJaIiBmaWxsPSIjZmZmIi8%2BCjxwYXRoIGQ9Ik00IDEyTDEyIDQiIHN0cm9rZT0iI2ZmZiIgc3Ryb2tlLXdpZHRoPSIxLjUiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPgo8L3N2Zz4K&logoColor=ffffff)](https://zread.ai/luochang212/zcode-autoresearch)

_Try an idea, measure it, keep what works, discard what doesn't, repeat forever._

</div>

一个 ZCode 插件。它让 coding agent 在**固定度量**上自主迭代优化：改代码，跑基准，保留改进，回滚退化，循环往复。机制源自 [karpathy/autoresearch](https://github.com/karpathy/autoresearch) 与 [pi-autoresearch](https://github.com/davebcn87/pi-autoresearch)，完整研究见 [`docs/research/`](docs/research/)。

## 🪄 它能做什么

- **自主实验循环**：设定目标与机械度量，agent 逐轮提出假设、修改代码、运行基准。改进自动 keep 并提交 git，退化自动 discard 并回滚，直到收敛或达到迭代上限。
- **真实项目可用**：在真实代码库上实测过。agent 独立把 js-yaml 解析从 134ms 优化到 32ms，约 4.2 倍；把质数计算从 695ms 优化到 3ms，230 倍。
- **开箱即用的生态**：迭代钩子在每次实验前后自动触发，自带 6 个现成示例和一份教学 skill。live dashboard 通过 SSE 边跑边刷。finalize 把实验整理成可 PR 的分支。

## 🚀 快速开始

本仓库本身就是一个插件市场，`marketplace.json` 指向 `plugin/`。在 ZCode 中：

1. 打开 **Settings → Plugin Management → 添加市场**，指向本仓库，本地目录或 GitHub 地址都可以。
2. 安装并启用 `autoresearch` 插件。
3. 在任意 git 项目里输入：

```
/autoresearch:autoresearch 优化 <目标>，metric 是 <度量>，越低越好
```

agent 会引导你完成 setup：写 `.auto/measure.sh` 和可选的 `checks.sh`，定好章程，建实验分支，跑一次 baseline，然后进入循环。

## 🔧 能力总览

### MCP 工具

| 工具                | 作用                                                                                                                                                     |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `init_experiment`   | 建立或重启实验 segment，设定名称、主度量和方向 lower 或 higher                                                                                           |
| `run_experiment`    | 跑基准。计时，解析 `METRIC name=value` 行，输出截断为 10 行或 4KB，超时杀进程组，`repeat` 取中位数，执行 before 钩子并做基准漂移检测                     |
| `log_experiment`    | 记录结果。keep 自动 commit，非 keep 自动回滚，`.auto/` 目录豁免。返回 baseline、best、delta、confidence、plateau、doom-loop。执行 after 钩子并做审计校验 |
| `export_dashboard`  | 在 127.0.0.1 起 live dashboard，SSE 自动刷新，同时写静态 HTML 兜底                                                                                       |
| `clear_experiments` | 重置会话，保留 measure、checks 和 prompt                                                                                                                 |

### 命令

| 命令                                        | 作用                                                      |
| ------------------------------------------- | --------------------------------------------------------- |
| `/autoresearch:autoresearch <目标>`         | 进入或恢复循环，无会话时先走 setup                        |
| `/autoresearch:export`                      | 导出 live dashboard                                       |
| `/autoresearch:finalize`                    | 把 kept 实验整理成干净分支，由 `scripts/finalize.sh` 实现 |
| `/autoresearch:off` / `/autoresearch:clear` | 暂停续跑提示 / 重置会话                                   |

## 😇 Trust & Security

防作弊靠**结构性控制，不靠提示词**。四层护栏全部可审计：

| 层                | 防什么                                  | 机制                                                                                                 |
| ----------------- | --------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| checks 正确性背压 | 输出不对或删功能                        | `.auto/checks.sh` 断言，失败禁 keep                                                                  |
| 审计不变量        | 账本说谎，假装保留或丢弃                | `log_experiment` 写入前校验：keep 必须真实改进、discard 真改进须 failed guard、事件顺序、commit 溯源 |
| 基准漂移检测      | 改基准造假 metric                       | `init_experiment` 记录冻结文件哈希，中途变更即警告                                                   |
| 次级度量约束      | 用内存或调用数换速度，即 reward hacking | opt-in 的 `constraints: [{name, maxPct}]`，超界禁 keep                                               |

- **冻结文件写保护**：PreToolUse hook 拒绝对 `measure.sh` 和 `checks.sh` 的写入。
- **全程零依赖**：插件仅用 Node 标准库，无 `npm install`，可审计。
- **已知边界**：平台所限，如实记录。zcode 没有会话注入 API，无法过夜无人值守，靠 Stop 3 次窗口加用户回车续跑；没有 compaction 事件，记忆靠聚合摘要注入；没有 TUI widget，用浏览器 dashboard 替代。详见 [`docs/research/pi-gap-analysis.md`](docs/research/pi-gap-analysis.md)。

## 🧩 迭代钩子

`.auto/hooks/before.sh` 在每次基准前执行，`after.sh` 在每次记录后执行。查外部资料、防重复尝试、发通知、记学习日志，随你定制。6 个开箱即用的示例在 `plugin/hooks/examples/`：

- **before**：`anti-thrash` 连续失败时触发结构反思，`idea-rotator` 从 ideas.md 轮换提醒，`hypothesis-reflection` 强制先给假设
- **after**：`learnings-journal` 记实验日记，`macos-notify` 发完成通知，`auto-tag-winners` 给新最优打 git tag

复制一个到 `.auto/hooks/` 即可使用。写自己的钩子请看 `skills/autoresearch-hooks`。

## 📁 仓库结构

```
plugin/           插件本体，含 manifest、mcp server、hooks、skills、commands、scripts、tests
openspec/         openspec 规划，specs 是主规范，changes 是变更记录
adr/              adr-kit 架构决策记录
docs/research/    研究报告
archived/         草稿本，放外部仓库 clone 和临时资料，不入库
AGENTS.md         agent 工作指令，含铁律与工作流程
```

## 💡 开发与贡献

- 行为改动走 openspec change 流程，主规范在 `openspec/specs/`。
- 关键决策用 adr-kit 记录在 `adr/decisions/`。
- 测试：根目录 `npm test`，或 `cd plugin && node --test tests/*.test.mjs`。
- 详细开发约定见 [`AGENTS.md`](AGENTS.md)。

## 📜 License

[MIT](LICENSE)
