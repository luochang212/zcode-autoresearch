# 任务：运行时解析 wrapper

## 1. 解析器

- [x] 1.1 `plugin/scripts/run-node.sh`：候选枚举（override → PATH → nvm glob → Homebrew → /usr/local）、`node -p process.versions.node` 探测、≥24 主版本门、`exec` 原样透传、`--resolve` 诊断输出、落空时 stderr 多行报错（exit 127）
- [x] 1.2 stdout 纪律：探测全部在命令替换内捕获，正常路径零 stdout 输出，诊断只走 stderr

## 2. 接线

- [x] 2.1 `plugin/.mcp.json`：command 改 `sh`，args 前置 wrapper（env/cwd/enabled/timeoutMs 不变）
- [x] 2.2 `plugin/hooks/hooks.json`：四个 hooks 同步改接线（command 改 `sh`，args 前置 wrapper）

## 3. 测试（红→绿）

- [x] 3.1 `plugin/tests/run-node.test.ts`（新，win32 跳过）：override 权威与三态（合法/缺失/版本不足）、PATH 命中、PATH 过旧回落 nvm、落空报错（按宿主条件跳过）、exec 参数透传、`--resolve` 输出、真实 node 集成冒烟
- [x] 3.2 既有 hooks.json 引用存在性检查自动覆盖 scripts/run-node.sh（无需改动，跑通即可）

## 4. 文档与决策

- [x] 4.1 `plugin/README.md` / `plugin/README_CN.md`：运行要求段改为「Node ≥24 存在于机器即可，启动时自动解析 PATH/nvm/Homebrew，或以 AUTORESEARCH_NODE_BIN 指定」并补 Windows 说明
- [x] 4.2 根 `AGENTS.md` 架构速览补 run-node.sh 一条
- [x] 4.3 ADR：adrkit record 记录解析器策略与 Windows 取舍

## 5. 收口

- [x] 5.1 `openspec validate --strict runtime-resolution-wrapper` 通过
- [x] 5.2 全量门禁：npm test、lint、fmt:check、typecheck、adrkit validate
- [x] 5.3 真实失败模式冒烟：最小 PATH 下经 wrapper 完成 JSON-RPC initialize 握手
- [x] 5.4 归档 change，主规范合并 runtime 能力
