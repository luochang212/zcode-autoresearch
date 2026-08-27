## 1. 基准 hash 记录

- [x] 1.1 server.mjs：init_experiment 计算 measure.sh/checks.sh 的 sha256（存在时），写入 `.auto/config.json` 的 `benchmarkHashes`（不存在则建）
- [x] 1.2 工具函数 sha256File（lib 或 server 内），缺失文件 → null

## 2. 漂移检测

- [x] 2.1 run_experiment 开始前：读 config.json 的 benchmarkHashes 与当前文件 hash 比对——不一致 → 返回 benchmark_drift: true + 警告文本（仍执行）；首见（记录 null 且文件存在）→ 记录并提示；无变化 → 无字段
- [x] 2.2 协议测试：改 measure.sh 后 run 返回 benchmark_drift；未改静默；首见记录

## 3. 文档与收尾

- [x] 3.1 SKILL.md 规则（收到 benchmark_drift 必须新 segment 或确认）+ README 更新
- [x] 3.2 全量测试通过；集成验证（真实会话改基准 → 警告）
- [x] 3.3 openspec validate --strict 通过，全部任务勾选，adrkit validate 通过
