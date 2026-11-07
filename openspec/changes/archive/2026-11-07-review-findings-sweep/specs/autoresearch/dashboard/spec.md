## MODIFIED Requirements

### Requirement: 全量历史渲染

dashboard（静态导出与 live 模式共用渲染层）SHALL 渲染账本的全部历史而非仅当前 segment：以单一平铺序列呈现全部 run（config 行不产生视觉分组，仅刷新标题与 metric/direction 口径），hero 标题取最新 config 行的名称，baseline/best/overall 统计取全局口径（首测基线、全局 best、总改善幅度），置信度对全部有效 metric 值计算。首测基线与有效度量集合 SHALL 排除 crash 行——包括携带遗留占位 metric（如 0）的旧格式行（crash 测了 nothing，占位值不是测量；语义与 experiment-loop 的 crash 行回放排除一致），账本本身不改写。循环控制语义（`rebuildState` 的 plateau/doom/stop 判定）SHALL 不受影响，历史渲染只读账本，不参与 keep/discard 门禁。

#### Scenario: 全局口径统计

- **WHEN** 账本首测基线 412.6，全局 best 186.2
- **THEN** hero 结果构图 baseline 显示 412.6、best 显示 186.2、overall 显示全局改善幅度

#### Scenario: 遗留 crash 占位行不充当首测基线

- **WHEN** 账本首条 run 为 crash 行且携带占位 metric 0（旧格式），其后 keep 42
- **THEN** hero 的 baseline 显示 42（非 0），overall 不以 0 为分母，账本文件不被改写

#### Scenario: 循环控制不受影响

- **WHEN** dashboard 全量渲染开启后实验循环继续运行
- **THEN** plateau/doom-loop/stop 判定仍基于当前 segment（`rebuildState` 语义不变）

### Requirement: 刻度小数位的跨度不变性

静态与实时 dashboard 的坐标轴刻度标签 SHALL 在任意度量跨度下携带正确的小数位：步长小于 1 时按数量级推导小数位，步长尾数为 2.5（步长选择逻辑在归一化跨度 ∈ (2, 2.5] 整段选出 2.5 系数步长）时 SHALL 多一位——按步长尾数判断，SHALL NOT 以归一化跨度恰等于 2.5 的精确相等代替；SHALL NOT 因步长的指数字符串形式（如 `2.5e-7`）误判而把标签塌缩为 `0.0000`。

#### Scenario: 次微跨度刻度可读

- **WHEN** 度量跨度使刻度步长为 `2.5e-7`
- **THEN** 刻度标签以 8 位小数渲染（`0.00000025` 形态），SHALL NOT 全部显示为 `0.0000`

#### Scenario: 非 2.5 精确值的 2.5 系数步长同样多一位

- **WHEN** 度量跨度使归一化跨度为 2.1（如 span 0.63、步长 0.25，或 span 6.3e-7、步长 2.5e-7）
- **THEN** 刻度标签按步长尾数 2.5 渲染正确小数位（0.25 两位小数、2.5e-7 八位小数），SHALL NOT 出现网格线在 0.25 而标签为 "0.3" 的错标
