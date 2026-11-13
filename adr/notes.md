2026-11-07 00:25 confidenceForSegment（server.ts）与 rebuildState（ledger.ts）的 segment 聚合走查逐谓词重复：下次改 confidence 语义时收编为 experiment.ts 纯函数（worth-fix 2026-11-07 判定暂不修：两侧测试钉住语义、纯卫生重构）
2026-11-07 00:25 config.json 若 pending* 机制键继续增多，可拆 server 全权 .auto/state.json（clear 整文件删除）；当前 2 键 + pending* 前缀边界重置规则已覆盖同类风险，暂不修（worth-fix 2026-11-07）
2026-11-07 13:01 niceTicks 两日内两轮同类补丁(首轮补丁埋下 norm===2.5 精确相等边界 bug,次轮改 (2,2.5] 带属性封类)——若出现第三次同类补丁,停:换刻度算法或补定义域 property test,不写第四个补丁
2026-11-13 10:46 MCP server 不代拉浏览器：观看由 agent 在首次 export_dashboard 后代开 live URL 一次（headless/用户拒绝豁免，结束时从未打开不补开），每轮刷新由 SSE 承担；不加配置项，静态 html 保持快照语义
2026-11-13 21:10 dashboard.ts 有效 metric 判定式(r.metric != null && Number.isFinite)在 renderTrendSvg/validCount/firstToBest 三处重复,STATUS_BADGE 回退写两次——若出现第四次同类补丁,收编为单一谓词/方向感知 helper(worth-fix 2026-11-13 判定暂不修:卫生级,两侧测试钉住语义)
