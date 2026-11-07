# Design

## Context

会话状态豁免目前以「每个 git 消费点各自枚举路径」实现，共四处，且各站点的枚举语法互不相同（`reset --` 路径参数、`status :(exclude)`、`checkout :(exclude,glob)`、`clean -e`）。2026-11-05 的实证（见 proposal）表明枚举已两次漏项：`.auto` 当年是单点修复后膨胀成四站点；`.zcode` 今日重演，且当日修复只覆盖了四分之一——keep 暂存。另见 `experiment-loop/spec.md` 的 log_experiment requirement：其豁免范围写的是 `.auto/`，今晨的 `.zcode` 提交修复本身已偏离规范文本。

## Goals / Non-Goals

**Goals**

1. 四个消费点的目录集合统一为单一常量（`SESSION_STATE_DIRS = [".auto", ".zcode"]`；dashboard 文件沿用 `DASHBOARD_FILE` 常量），补齐 `.zcode` 后四个站点行为一致。
2. init 时以 `.git/info/exclude` 声明 `.zcode`，把「未跟踪会话文件」从各站点的枚举负担降为 git 原生 ignore 语义（`add -A` 不扫入、`status` 不可见、`clean -fd` 不触碰——已用裸 git 对照实验验证三者同时成立）。
3. 回归测试固化：回滚不删未跟踪 `.zcode`、不回退 tracked `.zcode`、脏判定排除 `.zcode`、init 幂等声明。

**Non-Goals**

- 不为其他宿主目录（`.claude`/`.cursor` 等）加豁免——本插件目标是 zcode，为假想的第三方加目录是投机泛化。
- 不改 keep 提交的「全量改动」语义（不做 scope 白名单）——`add -u` 类收窄会让合法的实验新增文件丢失，且 scope.md 是面向人的散文、非机器可读清单。
- 不修 directionLabel 的逗号截断（见下「明确不修」）。

## Decisions

**D1 排除集合常量化 + ignore 声明双层**。常量层保证 tracked/预暂存等 ignore 语义覆盖不到的情形仍被枚举兜底；声明层把最高频危害（未跟踪会话文件被 `clean -fd` 删除）降为 git 原生行为。ignore 规则只作用于未跟踪文件，故 `.zcode` 内容被合法 track 的仓库（如本仓库自身的 `.zcode/skills/`）不受影响。声明写 `.git/info/exclude`（本地、不进提交、不污染用户 `.gitignore`）；写入前用 `git check-ignore -q .zcode` 探测，已忽略则跳过；失败静默放行（枚举层是正确性兜底，声明层是优化，不引入新的 init 失败面）。

**D2 crash 门禁的脏判定同源**。`dirtyFiles` 是「工作树改动」的唯一定义点（`isDirty` 与回滚 `rolledBack`/`residual` 均由它派生），只改这一处即同时修复门禁死锁与回报失真，无需碰 server.ts 的门禁逻辑。

**D3 测试放 git.test.ts 单元层**（直击 `rollbackWorkingTree`/`dirtyFiles`/`ensureSessionStateIgnored` 真实函数）+ mcp-integration 一条 init 集成路径。先红后绿：本 change 的复现脚本已证实三个场景在现状代码上为红。

## Retro：当日先行提交的规范偏差（2026-11-05）

三个插件提交未走 change 即落 main，规范偏差一并在此付清、不另立 retro change：

- keep 暂存排除 `.zcode`：本 change 的子集，由此 change 补全为全覆盖并回写规范。
- directionLabel 半角句点：guardrails 规范只说「提炼方向标签」，未规定拆分标点，无文本冲突，偏差为规范未覆盖而非冲突，接受现状。
- run_experiment command 缺省：experiment-loop 规范说「SHALL 接受任意 shell 命令」，未规定必填；`required` 从 schema 移除属工具契约变更，规范既未违反也未覆盖，接受现状；README 已可补一句说明（tasks 内）。

## 明确不修（worth-fix 判定留痕）

**directionLabel 逗号截断与去重键塌缩**：实测坐实（`"lr 0.1, batch 256"` → 标签 `"lr 0.1"`；`"lr 0.1, wd 1e-4"` 与 `"lr 0.1, wd 5e-4"` 塌缩同一去重键）。不修理由：影响面在 advisory 记忆注入层、无错值（不同于已修的小数点显示 0）、根因修复（结构化 direction 字段）动 schema 契约成本高。触发条件：再有真实会话因方向标签失真导致误判（账本证据），即升级为结构化字段的 change。

## Risks / Trade-offs

- `.git/info/exclude` 属仓库本地状态，用户手删后枚举层兜底仍在，无正确性风险。
- tracked `.zcode` 文件的**会话期间实验性修改**回滚时保留（豁免语义），意味着实验循环不会覆盖这些文件的改动——与 `.auto` 的既有豁免语义一致，属有意取舍。

## Open Questions

（无）
