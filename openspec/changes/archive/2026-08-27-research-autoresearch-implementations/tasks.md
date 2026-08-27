## 1. 深读三个实现（并行）

- [x] 1.1 深读 archived/karpathy-autoresearch：program.md 的循环指令、train.py/prepare.py 分工、度量定义、git 用法，产出机制级笔记（含文件路径+行号证据），核对 README 关键声称
- [x] 1.2 深读 archived/pi-autoresearch：extension 源码（init/run/log 三工具）、skill 与 /autoresearch 命令、.auto/ 状态文件、dashboard 机制，产出机制级笔记（含文件路径+行号证据）
- [x] 1.3 深读 archived/uditgoenka-autoresearch：插件布局（claude-plugin/、plugins/autoresearch）、薄路由 SKILL.md、12 个子命令文件、orchestrator、hooks 护栏，产出机制级笔记，并用 wc -l 实测核对 README 的行数与 token 声称

## 2. 核实 zcode 插件组成

- [x] 2.1 核实 archived/zcode-plugins 的插件结构（plugin manifest、skills/commands/hooks/agents 等组成单元与示例），记录仓库版本（git log -1）

## 3. 撰写研究报告

- [x] 3.1 撰写 docs/research/autoresearch-survey.md：背景、三个实现各一章（统一小节：形态/循环/度量/状态/护栏/token）、跨实现对比章（含版本标注）
- [x] 3.2 撰写 zcode 插件设计建议章：插件组成单元建议、各实现可借鉴点、开放问题清单，并核对每条建议都映射到 zcode-plugins 中真实存在的单元类型
- [x] 3.3 通读校验：每章小节齐全、关键论断均有文件路径证据、README 声称差异已标注、报告引用了 ADR 编号

## 4. 决策沉淀与收尾

- [x] 4.1 用 adrkit decide 记录关键决策（推荐插件形态、循环机制取舍），运行 adrkit validate 通过，并把 ADR 编号回填到报告对应章节
- [x] 4.2 openspec validate --strict 通过，勾选全部任务

## 5. 环境能力验证（用户追问轮）

- [x] 5.1 实证确认无会话注入 API：bundle 全量搜索 sendUserMessage/injectUserMessage 零命中，Stop hook 为唯一续跑原语（实现级确认 a9r 条件 + soi=3）
- [x] 5.2 实测 MCP 长驻状态：同一会话连续两次 tools/call 由同一进程（pid 3945）处理，进程内状态保持
- [x] 5.3 确认 hook matcher 仅匹配工具名（路径过滤需 hook 内读 stdin），并发现无头模式不执行 hooks 的边界
- [x] 5.4 分析 dashboard 与多目标并行：均不改变根设计，可后置（§6.3 结案表）
- [x] 5.5 将验证结论回写报告 §4.1/§6.2/§6.3/§7 与 ADR-1，adrkit validate 通过
