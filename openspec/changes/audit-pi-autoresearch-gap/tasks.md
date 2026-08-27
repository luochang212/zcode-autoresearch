# Tasks: audit-pi-autoresearch-gap

## 1. 审计报告

- [x] 1.1 核对当前 plugin 代码实态（server/hooks/lib/skills/commands/finalize）对照 pi 28 项能力清单
- [x] 1.2 一致性三查（实现 ↔ SKILL.md ↔ 示例脚本），定位契约不一致项
- [x] 1.3 跑 `node --test tests/*.test.mjs` 确认基线健康（58/58 通过；记录测试盲区）
- [x] 1.4 撰写 `docs/research/pi-parity-audit.md`：逐项判定 + 残留差距分级（G1–G4）+ 超出 pi 清单 + 平台硬顶复核

## 2. 收尾

- [x] 2.1 在 `docs/research/pi-gap-analysis.md` 头部标注"差距矩阵已被 pi-parity-audit 取代"
- [x] 2.2 `openspec validate --change audit-pi-autoresearch-gap` 通过
