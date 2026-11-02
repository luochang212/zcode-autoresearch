# 任务：反浅层认知引导

## 1. 协议文档

- [x] 1.1 `plugin/skills/autoresearch/references/loop-protocol.md`：新增「Segment cold start (ideation first)」小节（先构思写 `ideas.md` 再读代码；tier 前缀约定 `[struct]/[tune]/[ensemble]`；校准两问）；循环「One iteration」第 1 步补一句新 segment 时先走构思步
- [x] 1.2 `plugin/skills/autoresearch/SKILL.md`：循环第 1 步同步一句（新 segment → 构思步）；hypothesis 约定提及 tier 前缀

## 2. 示例钩子

- [x] 2.1 `plugin/hooks/examples/before/idea-rotator.sh`：追加浅层连击检查（读账本尾部 6 行 hypothesis 前缀；已标注 ≥3 且全 `[tune]`/`[ensemble]` → 注入提醒；否则静默；fail-open）
- [x] 2.2 `plugin/hooks/examples/before/self-check.sh`（新）：墙钟自检（`started_at_epoch` + `.auto/selfcheck.state`；>3600s 或无状态文件 → 注入问题清单并刷新状态；缺失/异常静默）

## 3. 教学与文档同步

- [x] 3.1 `plugin/skills/autoresearch-hooks/SKILL.md`：示例场景清单加「时段自检」；浅层连击归入 idea-rotator 条目
- [x] 3.2 `plugin/README.md` / `plugin/README_CN.md`：示例数 6→7，清单补 self-check（时段自检）

## 4. 验证

- [x] 4.1 `bash -n` 全部改动的 .sh；两示例各用伪造 stdin（node 生成 payload）手动各跑一次：触发与静默两路都验证
- [x] 4.2 `npm test` 全量无回归（本 change 不新增单测：无 MCP 代码改动，示例为素材级，验证以 4.1 实跑为准）
- [x] 4.3 `openspec validate --strict add-anti-shallow-guidance` 通过
