# 设计：dashboard 编辑部式重构

## 取舍

- **机制不升级**：沿用现状，TS 模板字符串 SSR、单一渲染入口（`renderBody(live)` 产静态与 live 两种输出）、无模板文件、无主题切换机制、无构建步骤。adr-kit 的模板槽位/双主题机制依赖"多生产者"前提（站点构建 + 安装资源），本插件不具备该前提（2026-10-28 会话已判定：照搬即给不存在的问题加代码）。本 change 只换呈现层（design token 级：调色板、字体栈、间距、质感）与信息结构（全量历史、单图单列表）。
- **全量历史 vs 当前 segment**：现行渲染只画当前 segment（`rebuildState` 语义）。档案页的价值在"全部留痕"，改为渲染完整账本；但**不触碰** `rebuildState` 本身。循环控制（plateau/doom/stop）继续用当前 segment 视角，新增独立的 `rebuildHistory` 纯函数，两条读法互不干扰。
- **Δ 口径**：平铺列表跨 segment，Δ 列相对**各自 segment 基线**（与 keep/discard 判定口径一致），列头显式标注"Δ vs 段基线"避免误读；hero 的 baseline/overall 用全局首测与全局 best。
- **run 编号**：账本 `run` 字段是 segment 内序号（server 按 `state.runs.length + 1` 写），平铺列表与图表改用全局序号（1..N），避免跨段重号歧义。
- **pinned hash 语义**：页脚哈希 = 生成时 `git rev-parse --short HEAD`（"这份页面定格在哪个提交"），不是某条 run 的 commit（"实验发生在哪个提交"），与 adr-kit 的 pin 语义对齐。非 git 目录 / 命令失败 fail-open 为省略 pinned 段（仪表渲染永不因元信息失败）。
- **confidence 保留**：统计带含 confidence（红黄绿着色），维持现行信息面；计算沿用 `computeConfidence`（对当前 segment 值），由 `rebuildHistory` 对最后一段计算。
- **移动端**：≤760px 账本行重排为两列网格（编号+徽章 / metric+Δ / 描述 / commit），描述列 `min-width: 0` + `overflow-wrap: anywhere` 防网格撑爆；390px 已实测无横向溢出。

## 渲染契约不变量

- 静态导出与 live 共用 `renderBody(history, live)`；live 仅多一段 SSE + 滚动保持脚本。
- `↻ Revisiting #N` 仅正整数渲染（照搬现行判据）。
- noop 中性灰、keep 绿、discard 橙、crash/checks_failed 红，方向着色语义不变，仅样式改为正式徽章（无旋转）。
- 自包含：无外部资源（字体用系统栈、纸纹为内联 SVG data URI）。
- 空账本：渲染空状态提示，不画图。

## 替代方案（已否决）

- 内嵌 JSON + 客户端渲染（解锁筛选交互）：需求未证实（单会话 run 数少），成本是双渲染路径；否决。
- 模板外置 + 槽位标记：单生产者无漂移风险可防；否决。
- 按 segment 章节化：用户明确否决，理由是"一个折线图和列表就能描述清当前实验"；segment 只以图表边界虚线 + 列表分隔线呈现。
