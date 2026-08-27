---
status: accepted
date: 2026-08-27
created: 2026-08-27
---

# ADR: 2 experiment rollback semantics: commit on keep, discard working tree otherwise

## Problem

autoresearch 循环里 discard（实验失败/度量未改善）时的回滚语义有三个先例，互不兼容：karpathy 先 commit 后跑，discard 用 `git reset`（失败实验从历史消失）；uditgoenka 先 commit 后 verify，discard 用 `git revert`（失败实验保留在历史）；pi-autoresearch 只在 keep 时 commit，discard 时工作区改动尚未 commit，直接 `git checkout -- . && git clean -fd`（豁免 `.auto/`）。zcode 插件必须选一种。

## Decision

采用 pi-autoresearch 语义：**keep 时 `log_experiment` 工具内自动 `git add -A && git commit`（message 前缀 `experiment:`、尾部带结构化 Result JSON，并回填真实短 hash 到账本）；非 keep（discard/crash/checks_failed）时自动丢弃工作区改动（`git checkout -- .` + `git clean -fd`，豁免 `.auto/` 会话目录）**。会话记忆（`.auto/`）天然幸存于回滚。

## Alternatives considered

- **先 commit 后跑 + `git reset`**（karpathy）：原子性最好、实现最简，但失败实验在 git 历史中不留痕，事后无法审计 agent 试过什么；reset 还会改写分支位置，与并行的其他工作冲突风险高。
- **先 commit 后 verify + `git revert`**（uditgoenka）：失败历史保留可供后续学习（agent 可读失败 diff 避免重复试错），但每个失败实验都产生一个 commit + 一个 revert commit，长循环下 git 历史噪音翻倍，且 revert 对"改了又被 revert 的文件再改"易生冲突。
- 折中（每 N 个失败实验 squash 一次）：引入额外状态与复杂度，收益不明确，否决。

## Consequences

- 买到了：git 历史即"被接受的实验链"，干净可 review；失败实验仍记录在 `.auto/log.jsonl`（含 description 与 ASI 诊断信息），不依赖 git 保存失败痕迹；回滚零 commit 噪音。
- 付出的：失败 diff 不在 git 里（要看重跑前后需从账本 ASI 或 agent 描述还原）；`git add -A` 会把工作区无关脏文件一并 commit（继承 pi 的已知弱点，实现时可用 Files-in-Scope 过滤缓解）；要求实验分支隔离（setup 时 `git checkout -b autoresearch/<tag>`）以保护用户主分支。
