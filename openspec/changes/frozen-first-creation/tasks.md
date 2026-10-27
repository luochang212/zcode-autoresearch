# 任务：frozen-first-creation

## 1. 机械保障

- [x] 1.1 `plugin/tests/hooks.test.ts`：deny 断言前置文件创建；新增「首次创建放行、落盘后拒绝」用例（先在未修复 hook 上跑出红）
- [x] 1.2 `plugin/hooks/guard-frozen.ts`：FROZEN 命中后 existsSync 放行不存在的目标；同批测试转绿
- [x] 1.3 `cd plugin && node --test tests/hooks.test.ts` 全绿（既有放行断言不回归）

## 2. 规程与文档

- [x] 2.1 `plugin/skills/autoresearch/references/setup-guide.md`：第 2/4/5 步措辞对齐——创建是合法动作，冻结自文件落盘起生效
- [x] 2.2 `plugin/README.md` / `plugin/README_CN.md`：写保护行改「改写拒绝 / setup 创建放行」

## 3. 全量验证

- [x] 3.1 根目录 `npm test` 全过、`npm run lint`、`npm run fmt:check`、`npm run typecheck`
- [x] 3.2 `openspec validate --strict frozen-first-creation` 通过
