# Design: fix-hook-spec-alignment

## D1 平台期放行的输出形态

guardrails 规范要求 plateau 时"放行，reason 中说明"。zcode Stop hook 的输出契约只有两种有效形态：stdout JSON `{decision: "block", reason}`（请求续跑，3 次窗口）与 exit 0（放行）；schema 严格校验，无 allow-with-reason 形态。因此放行 = exit 0 + 空 stdout，平台期建议（复测/开新 segment/收尾）写 stderr——留在 hook 日志里可观测，不进模型上下文。

顺序上 plateau 判定保持在 isStopReached 之后（连败/上限优先级更高，两者皆放行，不冲突）。

## D2 off 开关的读取口径

server 侧所有 session config 读写都走 projectCwd（`patchSessionConfig`/`readSessionConfig`），`/autoresearch:off` 落在项目目录 `.auto/config.json`。`session-start.ts` 的修法：账本定位继续用 `resolveWorkCwd(projectCwd)`（workingDir 语义不变），但 off 只从项目目录 config 读。非 workingDir 场景 projectCwd === 研究目录，行为不变（既有用例无需改）。

不读研究目录 config 的 off：那不是 server 管理的文件，双读会引入未定义的第二开关来源。

## D3 测试翻转与补充

- `stop-continue reports plateau convergence`：断言从 `decision: "block"` 翻转为 stdout 为空（放行）。5 条 flat keep 记录（42×5）触发 plateau 的构造不变。
- 新增 workingDir off 用例：项目 config `{workingDir: "work", autoresearchOff: true}`，账本在 `work/.auto/log.jsonl` → 输出为空；对照用例（无 off）仍注入。
- runHook 直接 execFile hook 脚本，stderr 默认继承不干扰断言。
