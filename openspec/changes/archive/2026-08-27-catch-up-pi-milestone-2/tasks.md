## 1. SSE live dashboard

- [x] 1.1 实现 lib/dashboard-server.mjs：ensureServer(workCwd) 单例、路由 /、/autoresearch.jsonl、/events（SSE 连接集合）、broadcast(workCwd)
- [x] 1.2 lib/dashboard.mjs 加 renderLiveDashboard（renderDashboard + 注入 SSE 客户端脚本：EventSource('/events') → location.reload()）
- [x] 1.3 server.mjs：export_dashboard 起 server 并返回 {ok, url, file}；init_experiment/log_experiment 写账本后 broadcast
- [x] 1.4 测试：起 server 后 / 返回 HTML、/autoresearch.jsonl 返回账本、/events 建立 SSE 连接并收到广播

## 2. workingDir 重定向

- [x] 2.1 实现 lib/paths.mjs resolveWorkCwd(projectCwd)；server 全部文件/git/spawn/hooks/dashboard 操作改用 workCwd
- [x] 2.2 hooks（memory-inject/stop-continue/session-start/guard-frozen）统一经 resolveWorkCwd
- [x] 2.3 测试：config 含 workingDir 时 init/run/log 作用于子目录；无配置行为不变

## 3. finalize 分支整理

- [x] 3.1 实现 scripts/finalize.sh：preflight（feature branch、组间文件不重叠）、按组建分支（merge-base 起，checkout kept 文件，commit）、并集验证（剔除 .auto）、失败回滚
- [x] 3.2 新增 commands/finalize.md（指引 agent：读 kept → 分组写 groups.json → 跑脚本 → 汇报）
- [x] 3.3 shell 测试：基本分组、重叠拒绝、失败回滚、会话文件剔除

## 4. 文档与收尾

- [x] 4.1 SKILL.md / loop-protocol / README 更新（live dashboard、workingDir、finalize）
- [x] 4.2 全量测试通过；集成验证（真实会话 export 返回 url + SSE 广播）
- [x] 4.3 openspec validate --strict 通过，全部任务勾选，adrkit validate 通过
