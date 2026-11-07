---
status: implemented
date: 2026-11-07
description: 判断护栏类变更或「旁路」报告是否值得开 change、评审修复提案的证据资格、或设计 review 提问轴时读。
raised-by: human
decided-by: human
created: 2026-11-07
paths: [plugin/mcp/**]
---

# ADR: 11 护栏威胁模型定为合作但会犯错的 Agent:护栏语义为数据完整性与错误引导而非对抗防作弊

## Problem

2026-11 修复轨迹复盘坐实威胁模型错位,两类修复的证据来路完全分离:

- **现场实证事故全部是意外类**(无一蓄意):宿主会话目录 `.zcode` 被扫入实验提交、又被回滚 `clean -fd` 整目录删除(close-zcode-exemption-gaps,2026-11-05 实证,见其 proposal);方向标签小数点截断致数值失真(dota2-wave1 segment 实证);git ≥2.55 exclude pathspec 杀死 gitignore 场景的全部 keep;循环体验四问题(calibrate-loop-feedback,2026-11-02 segment 2 全 15 轮第一手反馈)。
- **「防 Agent 钻空子」类修复的证据全是红队构造**(Agent 在现场从未做过其中任何一件):benchmark 锁赋值前缀夹带、guard-frozen ApplyPatch 目标解析(close-guardrail-gaps,「实测坐实」= reviewer 构造后验证存在)、checks_failed 自证门(close-log-attestation-gaps,「红测实证」)、凭空落账/假 crash(bind-log-to-observation)、metrics 编造(bind-secondary-metrics-to-observation,「可编造」)。

对抗性 review 是对系统状态不敏感的必然有产搜索:工具面图灵完备,「能不能绕」的答案几乎总是「能」;构造一个旁路只要几分钟,堵一个旁路是完整 change(proposal+design+红测+文档+归档)。按此轨迹投入会无限生成工作量,而现代 Agent 不会在机械层面蓄意作弊、更愿意正常思考。缺一条明确的威胁模型与证据门槛,未来 review 与护栏变更无据可依,「永远修不完」的感受会持续。

已知局限:现场样本有限(单一项目、数个 segment),「Agent 从未做过」是观测陈述而非普适断言;本条据此立规则,并以 Consequences 中的触发条件对冲该局限。

## Decision

威胁模型定为**合作但会犯错的 Agent**(非蓄意对抗者):

1. **护栏语义 = 数据完整性 + 错误引导**。硬校验的保留判据:Agent 无恶意时零摩擦、犯错时错误消息给出下一步指引(checks_failed 门引导改用 discard/crash 即合规样本)。纯对抗面的机械封堵不再新增。
2. **证据门槛**:护栏类 change 必须引用现场观测事故或可信的意外路径;红队构造的纯假设旁路降级为 known-boundary 诚实文档留痕(先例:Bash 重定向绕过、Windows spawn 链,见 plugin README 已知边界),不开 change。
3. **review 提问轴换向**:从「Agent 能怎么绕过」换成「哪里卡住 / 哪里困惑 / 哪里浪费轮次 / 哪条信号读不懂」(help-first;calibrate-loop-feedback 的现场反馈单是产出样本)。
4. **既有硬校验保留**:观测绑定同时废除手抄数字(自动化),审计不变量保护账本作为 Agent 自身记忆与仪表盘数据源的可信度——它们是 help 穿着防弹衣,不因本条拆除。ADR-5 的「防顺手作弊不防对抗性伪造」是本条在其层级语义内的先声,本条推广为全部护栏的威胁模型声明。
5. **真对手在语义层**:过拟合基准、goal 漂移、reward hacking。那一层由 checks 设计、goal.md/scope.md 围栏与二阶循环承载(已有),不新增机械封堵。

## Alternatives considered

- **维持对抗威胁模型**(红队构造 → 封堵循环继续):否决。开放集搜索永不收敛且产出率与系统质量无关;现场采样为零;成本结构不对称(构造便宜、封堵昂贵),清单只增不减。
- **拆除现有硬校验**(视为对抗遗留一并清理):否决。会连带给 Agent 自身造成真实损失——账本可信度下降、观测绑定退回手抄;判据(无恶意零摩擦 + 犯错给指引)已把数据完整性设施与纯对抗设施区分开,只应冻结后者的新增。

## Consequences

- 买到的:review 产出收敛为有限的现场事故单;护栏立项有了可执行的证据门槛;「help Agent」成为第一方向,预算导向体验与语义层(checks 质量、goal/scope 围栏、信号可读性)。
- 付出的:对真正蓄意的机械对抗不再增强防御,known-boundary 文档与漂移检测(ADR-5,警告级)兜底;若未来出现真实对抗证据(账本/现场观测,非构造演示),即重估本条——这是对「现场样本有限」局限的对冲。
- 边界:本条不改变 ADR-5 各层的校验语义、硬拒/警告边界与解锁出口;ADR-5 管「怎么校验」,本条管「凭什么新增校验」。
