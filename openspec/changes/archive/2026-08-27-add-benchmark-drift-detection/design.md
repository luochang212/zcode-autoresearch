## Context

实现依据：`docs/research/next-steps.md` P1 漂移检测（Westland 借鉴）+ 防护链缺口分析：guard-frozen 仅交互式、checks 不防 measure.sh、审计不变量认账本自洽的假改进。方案：init 记录冻结文件 hash（账本 config 行），run 前比对，漂移时警告级返回（不硬拒——硬拒摩擦、警告让 agent/用户决策）。"首见即基准"兼容 setup 后 init 或 init 后 setup 的流程顺序。

## Goals / Non-Goals

**Goals:**

- 堵住"改基准造假 metric"的漏洞：基准中途变更 → 每次 run 显式警告，metric 不可比被明示。
- 成本极低（hash 比对），additive 兼容旧账本。

**Non-Goals:**

- 不做硬拒（漂移仅警告——决定权留 agent/用户；SKILL 规则引导开新 segment）。
- 不做完整 doctor 预检（开跑前全面验证基准可信——后置，等真实高价值场景）。
- 不校验 git 追踪的其它文件（只防冻结的 measure/checks）。

## Decisions

**1. hash 存放：账本 config 行（additive 字段 `benchmarkHashes`）。** 随会话走、不可被用户 config.json 覆盖；`{measure: "<sha256>"|null, checks: "<sha256>"|null}`。旧账本 config 无此字段 → 视为全 null（首见即基准）。

**2. 比对时机：`run_experiment` 开始前（crash 门禁旁）。** 逻辑：读当前 measure.sh/checks.sh 的 sha256（存在时）→ 与 config 行记录比对：

- 记录为 null（首见）→ 更新记录（写入账本 config 行？——不，config 行已写。**首见更新到内存 + 后续持久化**：简单方案——首见时把 hash 写入 config 行（重写 config 行或追加？账本 append-only…… config 行不可改写）。
  - 处理：账本 append-only，config 行写后不可改。首见记录怎么办？方案：**首见不写账本，放在 run 返回里提示"已记录基准"**——不持久化则下次 run 还是 null → 每次首见判定。简化：`null` 视为"未记录"，比对时若当前有文件则**以当前为基准**（本次不警告），并在返回中提示"已记录基准 hash"。跨 run 不持久化 → 每次都是"首次"？不行——那 drift 永远测不出（每次都是首见）。
  - 修正：需要在会话内持久化基准。选项：a) 写 `.auto/config.json`（非 append-only，可改写）加 `benchmarkHashes`；b) 改账本结构（config 行可更新——破坏 append-only）。
  - 决定：**写 `.auto/config.json` 的 `benchmarkHashes`**（该文件本就是可写的会话配置，init 时读取/写入）。init 时计算并写入；run 时读 config.json 比对；首见（init 时 measure 不存在，run 时存在）→ 本次记录到 config.json 并提示，下次生效。config.json 被审计豁免（.auto/ 内，rollback 豁免 ✓）。
- 一致 → 无警告；不一致 → `benchmark_drift: true` + 警告文本（仍执行）。

**3. 警告语义（advisory）：** 返回 `benchmark_drift: true`，不阻断；SKILL 规则"收到 benchmark_drift 必须 init_experiment 新 segment 或向用户确认基准变更"。

## Risks / Trade-offs

- [config.json 被用户/agent 改写（benchmarkHashes 伪造）] → 与 vendor 哈希同信任模型（防顺手作弊，不防对抗）；审计不变量仍兜底（假改进若账本自洽……不防。接受：漂移检测是"低成本堵普通洞"，对抗性防伪需要 doctor+签名，后置）。
- [首见写 config.json 的时序（init 时 measure 不存在）] → 首次 run 记录并提示，第二次 run 起生效；文档说明。
- [误报（用户主动改基准换目标但没 init）] → 警告提示"建议新 segment"，正是期望行为。

## Open Questions

（无。）
