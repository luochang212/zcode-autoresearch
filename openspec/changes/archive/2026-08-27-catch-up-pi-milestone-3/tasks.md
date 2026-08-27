## 1. PermissionRequest 门禁

- [x] 1.1 实现 hooks/permission-gate.mjs：读 stdin（tool_name + 项目目录 argv），工作区无 .auto/log.jsonl 且工具属实验工具集 → deny；否则放行（fail-open）
- [x] 1.2 hooks.json 注册 PermissionRequest 事件（process 类型，传 ${ZCODE_PROJECT_DIR}）
- [x] 1.3 测试：无会话 deny 五工具、有会话放行、非实验工具放行

## 2. 自动激活提示与 off 决策

- [x] 2.1 session-start.mjs 增强：有 log.jsonl 且 config 无 autoresearchOff → 注入续跑引导；有 off → 不注入
- [x] 2.2 新增 commands/off.md（/autoresearch:off：写 config.json autoresearchOff: true，说明如何恢复）
- [x] 2.3 测试：session-start 三种状态（无会话/活动/off）

## 3. 文档与收尾

- [x] 3.1 SKILL.md / README 更新（门禁近似说明、off 命令、自动激活提示）
- [x] 3.2 全量测试通过；集成验证（无头会话 session-start/off 行为）
- [x] 3.3 openspec validate --strict 通过，全部任务勾选，adrkit validate 通过
