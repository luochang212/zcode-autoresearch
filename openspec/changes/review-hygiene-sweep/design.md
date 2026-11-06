# Design

## Context

review P3 存量的机械扫荡。共同主题：never-silent 纪律在几个次要路径上的补齐 + 两处小渲染缺陷 + 测试卫生。逐项独立、互不依赖。

## Goals / Non-Goals

**Goals**

1. 非法输入（env、JSON-RPC 帧、无换行流、损坏 config）一律「回退/有界 + stderr」，无静默路径。
2. dashboard 刻度与 CSS 的两处小缺陷修正。
3. 测试与示例卫生（临时目录、转义顺序、author 守卫）。

**Non-Goals**（见 proposal 不修表）：dashboard-server 异步化、memory-inject 尾窗、溢出截断边界、hooks.json schema 守卫、guard-frozen Bash 绕过与 Windows spawn 验证（后两者转 README 诚实说明）。

## Decisions

**D1 env 非法 = 回退 + 诊断，而非启动失败**。env 是便利通道（清单 userConfig 经宿主注入才是正道），非法值不应 brick server；但必须响亮——`||` 链的隐式吞掉正是原 bug（`-1` 为真值直通）。helper 统一三处（maxIterations 既有守卫并入同风格）。

**D2 stdin 上限 10MB 丢弃而非断连**。行帧协议下无换行即非法帧；断连会让宿主看到 server 退出（更难诊断），丢弃 + stderr 保留会话其余工具。上限常量与 LLM 截断常量同级命名。

**D3 clear 容忍损坏 config**。`resetPendingState` 的注释明文「clear 不得新增失败模式」；patchSessionConfig 抛错把这条 aspiration 打破了。容忍 = 账本删除（clear 的主语义）照常、autoresearchOff 未重置以 stderr 说明——config 反正已损坏，用户必须手修，无隐藏状态。

**D4 niceTicks 小数位按数量级推导**。`step >= 1` 走既有 String 路径（整数/2.5 已正确）；`step < 1` 用 `-floor(log10(step)) + (norm===2.5 ? 1 : 0)`——norm ∈ {1,2,2.5,5,10} 是封闭集合，2.5 多一位。上限 20 位防病态浮点。

**D5 临时目录用 node:test `after` 注册**（文件级 teardown），而非 withServer 内清理——重启存活类用例对同一 cwd 跑两个 server，withServer 内清理会破坏它们；after 在文件末尾统一 rm，时序安全。

## Risks / Trade-offs

- `-32700` 对噪声行响应会在 stdout 出现额外帧：通道本就是专用 JSON-RPC，宿主对未知 id 的响应应忽略；stderr 同时留痕。测试 harness 的响应匹配按 id 索引，不受影响。
- clear 容忍损坏 config 后 `autoresearchOff` 可能残留 true：下一 session init 不读它……实际上 config 已损坏（不可解析），修复时用户整体重写，残留无实际通路。
