# Tasks

## 1. git 层

- [x] 1.1 从 `commitExperiment` 抽取 `stageResearchTree(cwd)`（index reset → `add -A -- .` → 剔会话态与 dashboard），keep 行为逐位不变
- [x] 1.2 新增 `commitFoundingState(cwd, name)`：共用 stageResearchTree，暂存空返回 null，非空提交 `segment:` 前缀 message 并返回短 hash

## 2. init 流程

- [x] 2.1 `init_experiment` 增加可选布尔 `foundingCommit`；脏树（会话态豁免口径）+ opt-in 时折入段首提交，返回携带短 hash；干净树或暂存空时 no-op 说明；缺省路径逐字不变（ADR-11 警告）
- [x] 2.2 工具 schema 与 README（中英）同步参数说明

## 3. 测试

- [x] 3.1 git.test.ts：staging 抽取后 keep 行为回归；commitFoundingState 三态（折入 / 干净 no-op / gitignored 跳过）；折入后 keep 不夹带、discard 幸存（红转绿复现场景固化）
- [x] 3.2 mcp-integration.test.ts：init 传 foundingCommit 的返回字段（foundingCommit hash / no-op 说明）与缺省警告逐字不变

## 4. 校验

- [x] 4.1 `openspec validate --strict` + 全量 `npm test`
