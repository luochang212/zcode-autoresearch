## 1. 深读 pi-autoresearch（触发/架构/能力）

- [x] 1.1 触发机制全路径：/autoresearch 命令四个子命令（text/off/clear/export）实现、skill 展开路径、shouldAutoActivateAutoresearch 判定逻辑与全部调用点、session 生命周期事件（agent_start/agent_end/before_agent_start/session_before_compact 等）注入语义，附文件行号
- [x] 1.2 架构与能力矩阵：三层边界复核 + 全部能力项（三件套/auto-resume 熔断/确定性 compaction/dashboard 三形态/finalize/hooks 教学 skill/confidence/ASI/segment/checks 背压）行为细节与文件位置
- [x] 1.3 产出能力清单（每项：行为、实现位置、生效条件、对核心循环的价值）

## 2. pi 效果证据

- [x] 2.1 npm registry 查 pi-autoresearch 下载量（周/月/总）与版本时间线；GitHub API 查 stars/forks/更新时间/open issues
- [x] 2.2 收集用户证据：README/CHANGELOG 声称、issues/discussions 中成功/失败用例；按 S/A/B 分级标注

## 3. 我方插件审计

- [x] 3.1 按 pi 能力清单逐项核对 plugin/（mcp/server.mjs、lib/*、hooks/*、skills/*、commands/*、tests/*），产出我方能力现状表（已有/部分/缺失 + 行为差异）

## 4. 差距矩阵与路线图

- [x] 4.1 产出三分类差距矩阵（可追平/zcode 受限/平台不可行 + 原因 + 替代方案）
- [x] 4.2 产出追平路线图：里程碑（能力/验证方式/优先级），受限项单独评估
- [x] 4.3 撰写 docs/research/pi-gap-analysis.md 完整报告

## 5. 决策沉淀与收尾

- [x] 5.1 adrkit 记录追平优先级决策，报告引用 ADR 编号；adrkit validate 通过
- [x] 5.2 openspec validate --strict 通过，全部任务勾选
