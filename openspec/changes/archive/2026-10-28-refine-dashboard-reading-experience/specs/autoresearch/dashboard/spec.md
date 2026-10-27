## ADDED Requirements

### Requirement: 报告阅读与证据导航

dashboard SHALL 突出 overall 改善幅度，显示指标名称、单位和方向，NO-OP 独立计数且不计入 reverted。趋势 SHALL 显示全量历史图例，并提供到对应账本行的可聚焦链接。账本 SHALL 提供全部、保留、回退、无改动筛选，按钮状态可访问；无 JavaScript 时仍显示全部实验。

#### Scenario: 计数与筛选

- **WHEN** 账本包含 keep、discard 和 noop
- **THEN** 三者分别计数，筛选只隐藏不匹配账本行，不改变趋势的全量历史

#### Scenario: 证据定位

- **WHEN** 用户通过键盘或指针激活趋势点
- **THEN** 页面定位到对应全局序号的实验行并突出该行

#### Scenario: 移动端阅读

- **WHEN** 页面在 390px 或 320px 视口打开
- **THEN** 描述、指标和控件可读且不产生页面横向溢出
