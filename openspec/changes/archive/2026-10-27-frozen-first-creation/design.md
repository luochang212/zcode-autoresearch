# 设计：frozen-first-creation

## 根因（一句话）

guard-frozen 用路径匹配当判决书，把「创建」也算成了「改写」。冻结的本意是记录之后不可改写，而路径级 hook 只有查证文件是否已在磁盘才能区分两者。

## 修法

FROZEN 命中后加 `existsSync(resolve(cwd, rel))`：不存在 → 放行（创建窗口），存在 → deny。deny 理由文本无需改动，它描述的正是「已记录」场景；此前在创建场景说出 "was recorded" 是因为 hook 分不清两种场景，修复后 deny 只在理由为真时出现。

## 备选与否决

- **仅改文档（setup 教 Bash heredoc 创建）**：否决。它不解决 deny 理由在创建场景的语义错位，每次 setup 仍必吃一次 deny+重试；教 agent 绕护栏不如让护栏语义对齐协议。
- **按会话状态放行（无活动 segment 时放行）**：否决。hook 依赖账本状态使语义复杂化（setup 与 init 的顺序耦合、resume 场景歧义）；existsSync 已覆盖实际威胁模型（改写已在磁盘的记录），Bash 旁路本就存在。
- **维持绝对 deny + 改 deny 理由提示用 Bash**：否决。故意制造 deny+fallback 摩擦没有安全价值（Bash 本就旁路 matcher），纯增噪。

## 已知边界（不解决，留痕）

- Bash 写入始终旁路 hook（matcher 仅 Write|Edit|ApplyPatch），属 advisory 层，与 ADR-5 信任模型一致；measure.sh/checks.sh 的硬层是漂移检测（首见即基准）。
- setup 跳过的冻结文件可被 loop 中途创建（如 checks.sh）。hook 无法区分「用户在场的 setup」与「loop 自行创建」；漂移检测对 init 后才出现的脚本以首见为基准，checks 须 setup 约定的纪律由 SKILL/memory-inject 提示兜底。
- `clear_experiments` 只删 log.jsonl，goal/scope 存活，同目录换新目标需用户手动清 `.auto/`，「存在即拒」与该生命周期自洽。

## ADR 取舍

不为此立 ADR：单机制、语义已入主规范 scenario；若未来出现第二个「创建窗口」类机制或本 hook 升级为硬校验，再收决策记忆。
