# Tasks

## 1. 规程文本

- [x] 1.1 `plugin/skills/autoresearch/SKILL.md` Dashboard 节：载明代开一次（含三平台命令）、headless/拒绝豁免、结束不补开、静态快照语义
- [x] 1.2 `plugin/skills/autoresearch/references/loop-protocol.md` Stopping 节：最终 export 为报告归档，从未打开不补开、只交链接
- [x] 1.3 `plugin/commands/export.md` 步骤 3：收紧为「首次导出代开一次；headless 或用户拒绝则只给 URL」

## 2. 决策留痕

- [x] 2.1 `adrkit note` 记录「MCP server 不代拉浏览器，观看由 agent 首次 export 后代开一次；不加配置项」

## 3. 校验与验证

- [x] 3.1 `openspec validate --strict add-dashboard-viewing-protocol` 通过
- [x] 3.2 全量 `npm test` 通过（规程变更不改工具行为，现有测试应全绿）
- [x] 3.3 对照新规程文本重放实测链路（export → 代开一次 → SSE 刷新），确认规程每一步可执行
