# Tasks：跨平台 Node 启动器

## 1. 启动器

- [x] `plugin/scripts/launcher.mjs`：解析顺序（覆盖 → PATH → nvm → 固定位）、版本门 ≥24、stdout 纯净、`--resolve`、退出码透传（signal → 128+n）
- [x] Win32 搜索链：PATH `node.exe` → `%NVM_HOME%`/`%APPDATA%\nvm` 最新优先 → `%ProgramFiles%\nodejs`
- [x] POSIX 搜索链移植（nvm 改最新优先）

## 2. 接线

- [x] `plugin/.mcp.json`：`command` 回到 `node`，入口 `scripts/launcher.mjs`
- [x] `plugin/hooks/hooks.json`：四处 hooks 全部 `node scripts/launcher.mjs`
- [x] 退役 `plugin/scripts/run-node.sh`

## 3. 测试

- [x] `plugin/tests/launcher.test.ts`：覆盖权威/不可让步/PATH 优先/nvm 回落（POSIX stub + win32 实机链接）/穷尽 127/退出码透传/stdout 纯净/MCP 握手回归
- [x] Windows 实机 `node --test`：7 pass 0 fail（原 run-node.test.ts 在 win32 整文件跳过）
- [x] 三平台 CI（push 后由 GitHub Actions 验证）

## 4. 文档

- [x] `plugin/README.md` 运行要求段、目录树、已知限制段（Windows 未验证 → 已验证）
- [x] `plugin/README_CN.md` 同步
- [x] 根 `AGENTS.md` 架构速览「启动解析」条

## 5. 决策记录

- [x] `adrkit record` 新决策（跨平台启动器；raised-by agent，decided-by human）
- [x] `adrkit supersede` 接管 ADR-9 的警告
- [x] `adrkit validate`
