# 设计：harness 留痕（强制记账）

## D1 记账挂载点：工具时点哈希对账，而非 PostToolUse 钩子

两个候选：

- **(a) PostToolUse 钩子**：编辑成功落盘后钩子查路径、命中可编辑面就写账本行。实时、逐次；但只抓**工具**编辑（用户手改抓不住），且账本出现第二个写入者（hook 进程），并发语义与失败模式都要新立约。
- **(b) 工具时点对账（采用）**：server 在既有记账时点把可编辑面哈希与基线比对，变了就写行。单一写入者（账本本就归 server 所有、`appendFileSync` 追加）、抓住**一切**改动（agent 工具编辑、用户手改、脚本改写）、零新宿主事件依赖，且是 `benchmarkHashes` 漂移检测的镜像（同一模式已在生产）。

代价是粒度：痕迹落在下一个记账时点而非逐次实时。可接受，记账的目的是「事后可审计」，不是实时告警；且编辑步的触发时机（plateau/doom/固定间隔/segment 收尾）本就紧跟 log/run 边界。

三个记账时点的取舍：`run_experiment`（开跑前，痕迹先于它可能影响的 run）、`log_experiment`（入账前，抓住 run 后、log 前的窗口）、`export_dashboard`（收口，抓住最后一次 log 之后的尾部编辑，保证「最终台账」完整）。`finalize` 是 bash 脚本、不在 server 内，不加（尾部已由 export 收口）。

## D2 基线：session config `harnessHashes`，镜像 benchmarkHashes

`init_experiment` 时把可编辑面哈希写入 `config.json` 的 `harnessHashes`（与 `benchmarkHashes` 同一 patch 调用）。无基线的旧会话（config.json 无该键）：首次对账**静默补基线、不追溯行**，与 benchmarkHashes 的漂移语义一致（对账只对「会话基线之后」负责）。config.json 不进 git、不入账本，是运行时状态，适合作基线载体；账本行才是事实源。

## D3 留痕行 schema

```jsonc
{ "type": "harness_edit", "ts": "<ISO>", "segment": 3, "file": ".auto/prompt.md",
  "digest_before": "<sha256|null>", "digest_after": "<sha256|null>" }
{ "type": "frozen_attempt", "ts": "<ISO>", "file": ".auto/goal.md", "tool": "Edit" }
```

- 一文件一行（不做聚合行）：行序即修改序，digest 链可自校验。
- `segment` 取对账时的当前 segment；`digest_*` 为 null 表示「该时点文件不存在」（如删除 experience.md）或「无基线可比」。
- `frozen_attempt` 不带 segment（setup 期的企图先于任何 config 行）。
- 类型扩展安全性已被 `{type:"hook"}` 行先例与 `rebuildState`/`rebuildHistory`/`validateLedger` 的消费面核实（仅 config/run 被消费）。

## D4 留痕集合 = 规程可编辑面白名单 + experience.md

规范（experiment-loop「harness 编辑步」）定义的可编辑面：`prompt.md` 表层区块、`ideas.md`、`.auto/hooks/` 配置、repeat/segment 决策参数；`harness-edit-hardening` 加了 `experience.md`（经验库）。磁盘上的留痕集合取：

`.auto/prompt.md`、`.auto/ideas.md`、`.auto/experience.md`、`.auto/hooks/before.sh`、`.auto/hooks/after.sh`

**排除 `.auto/config.json`**：server 自管键（`pendingChecksFailed`、`benchmarkHashes`、`harnessHashes` 本身）会频繁写它，纳入会制造 server 自触发的噪音行。「repeat/segment 决策参数」经工具参数表达，不经 config 编辑，无文件痕迹可记。goal.md/scope.md/measure.sh/checks.sh 已有更强的语义（deny；measure/checks 另有漂移检测），不重复记。

## D5 fail-open 纪律不变

guard-frozen 现行为：路径不命中/文件不存在/解析失败 → exit 0 放行；命中已存在冻结文件 → deny。加留痕后：**deny 是主行为，留痕是副作用**。`appendLedgerEntry` 包 try/catch，账本写失败（磁盘满、权限）时静默吞掉，deny 照常返回；deny reason 追加一句「attempt recorded to the ledger」仅在实际写入成功时。server 侧 `recordHarnessEdits` 同理：对账失败不得阻断 run/log/export 主流程（包 try/catch，失败即本轮无痕，记账是增强不是门禁）。

## D6 明确不做

- **dashboard 展示 harness 修改史**：台账已有事实；展示涉及 `docs/design/dashboard.md` 的数据口径与验收规则，单独 change。
- **归因字段进留痕行**：verdict（helped/hurt/confounded）是判断，属于 advisory 的编辑行/experience.md；机械行只记事实。两层分离对应项目原则「信号均 advisory，除非明确硬校验」。留痕是硬事实（必写），归因是软判断（按规程写）。
- **实时逐次留痕（PostToolUse）**：见 D1，需求出现时再评估。

## 验证方式

- 红→绿集成测试（JSON-RPC 驱动真实 server，同 `mcp-integration.test.ts` 模式）：init→编辑 prompt.md→log_experiment → 断言账本出现 harness_edit 行（现状下红）；无编辑周期不产行；export 收口尾部编辑；旧会话补基线不追溯。
- guard-frozen 直调测试：deny → 账本出现 frozen_attempt；首次创建放行 → 不产行。
- schema 安全回归：rebuildState/rebuildHistory 对含新行的账本输出与不含时一致。
