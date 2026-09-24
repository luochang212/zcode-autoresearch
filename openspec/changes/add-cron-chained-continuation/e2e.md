# E2E 门禁执行单：CronCreate 有界自唤醒（对应 tasks.md 任务 1）

> 执行环境：运行中的 ZCode 桌面应用（本机已确认在跑；自动化任务持久化于本机 sqlite `tasks-index.sqlite`、绑定创建时的 session，应用打开时由 agent 服务触发）。**应用保持打开约 10 分钟**。
> 会话位置：任选一个草稿目录（建议不要在 zcode-autoresearch 仓库内，避免污染）。
> 三个验证点对应 tasks.md 1.1-1.3；任务 1.4（结论回填 design.md 与 ADR-7）由 agent 在收到结果后完成。

## Step 1：创建有界唤醒任务（验证 1.1 可用性）

在会话里发送：

```text
用 CronCreate 创建一个定时任务：每 2 分钟触发一次、最多 3 次，提示词为：
「[E2E] 唤醒检查：只输出一行 PONG-<当前时间>。然后尝试用 CronDelete 删除本任务的
automationId：如果被拒绝，原样记录拒绝文案。最后列出当前可用工具中是否包含
init_experiment 与 run_experiment（只报有无，不要调用）。不做其他任何事。」
创建后用 CronList 确认，并把 automationId、scheduleRule、maxRuns 告诉我。
```

预期：创建成功；recurring 且 maxRuns=3（有界）；CronList 可见；任务绑定当前会话。
（若创建时弹出权限确认，批准它——权限面是否放行 CronCreate 本身就是观察项之一。）

## Step 2：观察三次唤醒（验证 1.2 形态 + 1.3 防失控）

等待约 7 分钟，逐次观察：

| 观察项                       | 预期                                                                                             |
| ---------------------------- | ------------------------------------------------------------------------------------------------ |
| 唤醒是否出现在同一会话       | 是（不新建 session）                                                                             |
| 输出 `PONG-<时间>`           | 3 次、间隔约 2 分钟                                                                              |
| 唤醒 turn 中 CronDelete 尝试 | 被宿主拒绝，文案含 "not allowed while running a scheduled automation"                            |
| 工具可见性报告               | 如会话装了 autoresearch 插件，应报告 init_experiment / run_experiment 有无（记录即可，不要调用） |

## Step 3：清理

对任务执行 CronDelete（用户交互轮应可删除）；或等 3 次后自然耗尽。

## 结果回传（回答 4 个问题）

1. 唤醒 turn 是否出现在同一会话（是/否）？
2. PONG 出现几次、间隔多少？
3. CronDelete 的拒绝文案原样是什么（如有）？
4. init_experiment / run_experiment 在唤醒 turn 的可用工具里吗（有/无）？

> 第 4 项决定 design D6 的「MCP 工具在 automation turn 可达性」结论。
> 「Stop hook 是否在 automation turn 触发」列为第二阶段观察（影响每次唤醒跑 1 个还是 1+3 个实验；design D6 已注明两种结果均可用，不阻塞本门禁）——cron 通道验证通过后，在带活跃实验循环的会话里顺带观察。
> E2E 失败（工具不可用 / 唤醒不触发 / automation turn 不可用）→ 按 tasks.md 1.4 终止 change 并回滚 ADR-7。
