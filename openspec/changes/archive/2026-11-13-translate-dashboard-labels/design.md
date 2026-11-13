# Design: translate-dashboard-labels

## Context

面向中文用户的实验记录页，英文标签无信息增益；「假设与结论」是 asi 时代的旧列名，asi 已不在页面渲染。

## 决策

- 展示层全部中文；保留英文的只有：用户自定义 metric 名、commit 哈希、产品名 autoresearch、日期与数字。
- 状态语义中文与筛选按钮（保留/回退/无改动）一致；checks_failed 定名「门禁」（与护栏语境一致）。

## Trade-offs

- 与上游英文生态的词汇对应靠状态色 + 筛选语义维持；「锚定」译 pinned 不影响哈希语义。
