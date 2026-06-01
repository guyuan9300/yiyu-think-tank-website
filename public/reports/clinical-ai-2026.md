---
title: State of Clinical AI Report 2026
publisher: ARISE Network
date: 2026-01-01
summary: 2026 年临床 AI 已经从“模型性能展示”进入“真实照护转译”阶段：前沿模型在受控推理、影像识别和风险预测中快速逼近或超过人类，但真实临床价值仍取决于评估质量、工作流协同、不确定性校准、安全护栏和前瞻性证据。
topics: [战略, AI 技术]
---

# 《State of Clinical AI Report 2026》报告解读：临床 AI 从能力展示走向真实照护转译

## 报告速览

这份报告由 ARISE Network 于 2026 年 1 月发布，关注的是临床 AI 在 2025 年前后的真实发展状态。报告并不只看模型在医学考试或封闭 benchmark 上的表现，而是进一步追问：这些系统在真实医疗环境中是否可靠，是否能改变医生工作流，是否能改善患者结局，以及风险会从哪里出现。

报告的核心判断是：前沿 AI 系统已经很强，尤其在复杂临床推理、影像识别、个体风险预测、多模态诊断和部分工作流自动化上展现出接近或超过人类的能力；但临床转译仍远未成熟。当前最大缺口不再只是“模型能不能答对”，而是“能否在不确定、信息缺失、责任复杂、患者直接接触的场景中安全地产生价值”。

最值得抓住的 5 个结论是：第一，模型能力快速提升，但真实临床影响证据仍不足；第二，多项 benchmark 已经被刷到饱和，评估必须转向真实工作流、安全失败模式和患者结局；第三，医生与 AI 的协作效果高度依赖界面和流程设计，并不天然优于 AI 单独表现；第四，面向患者的 AI 将显著改变可及性和参与度，但过度信任和无人监督是核心风险；第五，短期最可能落地的是窄领域、任务清晰、终点明确的 AI 系统，而不是泛化的“全能临床医生”。

| 项目 | 内容 |
| --- | --- |
| 报告标题 | State of Clinical AI Report 2026 |
| 发布机构 | ARISE Network |
| 发布时间 | 2026 年 1 月 |
| 研究定位 | 临床 AI 的目标性综述，覆盖模型性能、评估、基础方法、临床工作流、患者端 AI、应用案例与 2026 年预测 |
| 核心主张 | 前沿 AI 已经具备强能力，关键在于安全、有效地转译到真实照护 |
| 最主要风险 | 证据不足、评估不真实、不确定性处理差、过度自信、工作流协同不足、患者过度信任、监管与责任机制滞后 |

```chart
type: hbar
title: 临床 AI 已广泛部署但证据透明度不足
unit: %
x: FDA设备经510k通道, 设备摘要未报告人口统计, 设备摘要缺少偏倚评估, 设备摘要缺少样本量, 设备摘要省略研究设计, 设备摘要报告患者结局
y: 95, 95, 91, 53, 50, 1
```

> 图中“报告患者结局”在原报告中为 `<1%`，为满足图表渲染的纯数字要求，此处以 `1` 表示“不到 1%”。这组数据揭示了报告最重要的背景：临床 AI 已经进入真实医疗系统，但证据、透明度和安全评估没有同步跟上。

## 核心问题

报告试图回答的不是“AI 会不会进入医疗”，而是“已经进入医疗之后，哪些能力是真的，哪些证据仍然不足，哪些场景最接近真实落地，哪些风险必须先被处理”。可以把核心问题拆成以下 8 个：

| 核心问题 | 报告中的对应讨论 |
| --- | --- |
| 模型是否已经具备接近或超过医生的临床推理能力？ | o1-preview/o1、AMIE、Dr. CaBot 在复杂病例、管理推理、多轮疾病管理和 CPC 专家讨论中的表现 |
| 模型在哪些情况下仍然脆弱？ | NOTA 测试、Script Concordance Testing、MetaMedQA、CRAFT-MD、多模态扰动测试 |
| 当前 benchmark 是否测到了真实临床能力？ | 519 项 LLM 医疗评估综述、HealthBench、MedHELM、MedAgentBench、NOHARM |
| AI 与医生协作是否一定优于医生或 AI 单独工作？ | GPT-4 管理推理 RCT、Collaborative AI 诊断试验、人机协作 meta-analysis、自动化偏见和技能退化研究 |
| AI 最先在哪些临床工作流中产生价值？ | AI scribe、消息路由、出院小结、EHR 事实核查、急诊/专科转诊/临床试验筛选 |
| 患者直接使用 AI 是否安全？ | AMIE 诊断对话、低准确 AI 建议的过度信任、AI 健康教练、DPP、临床笔记通俗化和翻译 |
| 多模态、多智能体和医学事件基础模型是否代表下一阶段方向？ | Delphi-2M、CoMET、MAI-DxO、MAC、TrialGenie、AMIE multimodal、MUSK、EyeFM、SourceCheckup |
| 2026 年临床 AI 的现实发展方向是什么？ | 急诊代理、AI 书写、工作流标注、保险与医疗系统 AI 对抗、监管滞后、前瞻性部署结果出现 |

```chart
type: pie
title: 报告主体内容的六个主题方向
unit: 个
x: 模型性能, 基准与评估, 基础方法, 临床工作流, 患者端AI, 应用案例与Demo
y: 1, 1, 1, 1, 1, 1
```

## 核心结论

### 1. 模型能力正在加速，但真实临床影响证据仍然有限

报告认为，前沿模型在受控任务上的表现已经非常强。例如 o1-preview 在医生评分的临床推理质量中，99% 的时间取得满分，显著高于 GPT-4 的 59% 和主治医生的 35%；在管理推理上，o1-preview 为 86%，高于 GPT-4 的 42% 和“医生 + GPT-4”的 41%。在真实急诊病例的三个诊断触点中，模型初诊 exact/near-exact diagnosis 达到 66%，高于医生初始分诊时的 48%-54%。

但报告同时强调，这些仍主要是受控环境、回顾性评估或模拟场景。真正关键的是前瞻性试验：模型介入后，是否减少误诊、缩短诊疗时间、降低并发症、提高患者理解，或者改善死亡率和再住院率。

```chart
type: bar
title: o1-preview 在受控临床推理任务中的表现
unit: %
x: o1-preview临床推理, GPT-4临床推理, 主治医生临床推理, o1-preview管理推理, GPT-4管理推理, 医生加GPT-4管理推理
y: 99, 59, 35, 86, 42, 41
```

### 2. 前沿模型表现并不均匀，最危险的弱点是“不知道自己不知道”

模型在复杂推理题上可能很强，但一旦遇到不确定性、缺失信息、答案分布变化或动态对话，能力会明显下降。NOTA 研究把 100 道 MedQA 题修改为“其他选项均不正确”才是正确答案，多个模型表现下降 9%-38%；报告特别指出，如果一个系统在答案模式变化时从 81% 降到 43%，就不适合自主临床使用。

Script Concordance Testing 更接近真实临床不确定性，要求模型在新信息出现时调整判断。o3 最高也只有 68%，GPT-4o 为 64%，只能匹配医学生，低于住院医和主治医生；模型还倾向选择极端判断，较少选择中性，显示出过度自信和校准不足。

```chart
type: bar
title: Script Concordance Testing 中部分模型表现
unit: %
x: o3, GPT-4o, Gemini2.5
y: 68, 64, 52
```

### 3. 现有评估体系过度测医学知识，低估真实工作流、安全和公平性

一项系统综述纳入 2022-2024 年的 519 项 LLM 医疗评估，发现最常被评估的是医学执照考试类知识问答（45%）和临床诊断（19%），而计费编码、处方书写等行政任务仅 0.2%。95% 的研究把准确率作为主要指标，只有 5% 使用真实患者数据，16% 评估公平、偏倚和毒性，5% 评估部署问题，只有 1% 评估校准或不确定性。

这说明，医疗 AI 评估最大的问题不是评估不够多，而是评估对象偏离真实需求。医生最想让 AI 减轻的行政、文书、沟通和工作流负担，反而长期被 benchmark 低估。

```chart
type: hbar
title: 医疗 LLM 评估中被测任务和指标的失衡
unit: %
x: 医学执照考试, 临床诊断, 以准确率为主指标, 使用真实患者数据, 评估公平偏倚毒性, 评估部署问题, 评估校准不确定性, 计费编码, 处方书写
y: 45, 19, 95, 5, 16, 5, 1, 0.2, 0.2
```

### 4. 医生与 AI 的协作不是天然有效，工作流设计和训练是决定因素

报告反复指出，人机协作并不是简单的“医生 + AI = 更好结果”。GPT-4 管理推理 RCT 中，医生使用 GPT-4 比常规资源提高 7%，但“医生 + GPT-4”与 GPT-4 单独表现相近（43% vs 44%），说明协作并未被优化。另一个 Collaborative AI 诊断试验中，AI 将医生诊断准确率从 75% 提高到 82%-85%，但仍没有超过 AI 单独表现。

更重要的是，医生也会出现自动化偏见。即使接受过 20 小时 AI literacy training，当医生接触到含错误的 GPT-4o 建议时，诊断推理准确率从 85% 降到 73%，首选诊断准确率从 91% 降到 76%。另有结肠镜研究显示，长期使用息肉检测 AI 后，医生在无 AI 条件下腺瘤检出率从 28.4% 降至 22.4%，提示存在 deskilling 风险。

```chart
type: bar
title: AI 协作带来的提升与偏见风险
unit: %
x: 常规诊断准确率, AI二次意见准确率, AI一次意见准确率, 错误建议组诊断推理, 无错误建议组诊断推理, AI前腺瘤检出率, AI后无AI腺瘤检出率
y: 75, 82, 85, 73, 85, 28.4, 22.4
```

### 5. 面向患者的 AI 潜力巨大，但不能把患者当作安全监督者

患者端 AI 可以扩大服务可及性，尤其在健康教练、生活方式干预、临床信息理解、语言翻译和可穿戴数据解释方面。AI-led Diabetes Prevention Program 与人类教练项目在 12 个月非劣效 RCT 中几乎相同：复合主要结局达成率为 31.7% vs 31.9%。临床笔记通俗化能显著提高患者理解：客观理解提高 1.2/4，主观理解提高 2.4/16，自信提高 2/8，阅读时间减少。

但患者也容易过度信任 AI。300 名参与者面对医生答案、高准确 AI 答案和低准确 AI 答案时，无法稳定区分来源；高准确 AI 被评为比医生更有效、可信、完整，低准确 AI 也被评为与医生相当。报告由此强调：患者端 AI 必须有强护栏和可规模化监督，不能假设普通用户能识别危险建议。

```chart
type: bar
title: 患者端 AI 的效果与风险并存
unit: %
x: AI-DPP主要结局, 人类DPP主要结局, TTM匹配AI消息偏好, 一般AI消息偏好, AI说明客观理解提升折算
y: 31.7, 31.9, 68, 85, 30
```

> “AI说明客观理解提升折算”为 1.2/4 折算成 30%，用于图表呈现；正文仍保留原始量表数据。

### 6. 短期落地会优先发生在窄任务、强数据、清晰终点的场景

Applied AI 部分显示，临床 AI 最快转译的方向是影像、ECG、低成本无创数据、专科分诊、临床试验筛选等任务清晰的场景。典型例子包括：乳腺癌筛查中 AI 将检出率从 5.7/1000 提高到 6.7/1000，且没有显著增加召回率；英格兰 NHS 使用卒中影像 AI 后，AI 医院 EVT 率从 2.3% 提升到 4.6%；腹腔疾病病理 AI 在独立测试集准确率 97.5%、敏感性 95.5%、特异性 97.8%；Smart Match 在术前输血准备中 AUROC 达到 0.94，优于医生和传统 MSBOS。

这些案例说明，越是边界清楚、数据稳定、判断后果可衡量的任务，越容易从模型能力走向真实临床价值。

```chart
type: bar
title: 部分应用 AI 的可衡量临床效果
unit: %
x: 腹腔疾病病理准确率, 乳腺癌检出率提升, 卒中EVT率提升, 结直肠严重并发症下降, AI输血准备AUROC, AMI排除敏感性
y: 97.5, 17.6, 100, 32.1, 94, 99.6
```

> 图中“卒中 EVT 率提升”为从 2.3% 到 4.6% 的相对提升，约为 100%；“结直肠严重并发症下降”为 28% 降至 19% 的相对下降，约 32.1%。

## 方法 / 指标体系

### 研究方法

报告采用的是 clinical AI targeted review，而不是系统综述。作者检索 PubMed、medRxiv、arXiv 等文献来源，使用关键词包括 large language models in medicine、AI、diagnostic reasoning、management reasoning、diagnostic error、benchmarks、patient-facing AI 等；同时邀请学术机构中的临床医生和 AI 研究者，并通过 LinkedIn 等社交媒体开放征集高质量研究。

纳入标准是：研究在临床语境中使用 AI 模型或 LLM；报告定量或定性结果，例如诊断准确率、偏倚、校准、工作流、用户表现；并被作者和审阅者判断为高影响研究。排除标准包括：纯技术模型论文、没有面向医生或患者评估的论文、社论、非临床 AI，例如药物发现和 biotech。

| 维度 | 报告做法 |
| --- | --- |
| 数据来源 | PubMed、medRxiv、arXiv 等预印本服务器、学术机构专家推荐、社交媒体开放征集 |
| 关键词 | LLM in medicine、AI、diagnostic reasoning、management reasoning、diagnostic error、benchmarks、patient-facing AI 等 |
| 纳入对象 | 临床语境中的 AI/LLM 实证研究，且报告诊断、偏倚、校准、工作流、用户表现等结果 |
| 排除对象 | 纯技术模型论文、没有临床或患者端评估的研究、社论、药物发现和 biotech 等非临床 AI |
| 报告取向 | 不只评估模型性能，还评估真实影响、协作方式、安全风险和部署条件 |

### 报告结构目录

| 报告章节 | 核心讨论对象 | 关键判断 |
| --- | --- | --- |
| Model Performance | 模型独立完成预测和临床推理任务的能力 | 模型在受控任务上快速接近或超过人类，但不确定性、校准和过度自信仍是主要风险 |
| Benchmarks & Evaluations | 定义医学 AI 能力的评估体系 | 多选题和医学知识题已经不够，评估必须进入真实数据、多轮对话、EHR 工作流和安全失败模式 |
| Foundational Methods | 优化临床 AI 的底层方法 | 医学事件 token 化、多智能体、多模态和推理奖励模型正在成为新基础能力 |
| AI in Clinical Workflows | 医生与 AI 如何在真实或模拟环境中协作 | AI 价值取决于协作设计、医生训练、失败模式认知和工作流整合 |
| Patient Facing AI | AI 如何直接与患者互动 | 患者端 AI 可扩展健康支持和理解能力，但必须解决过度信任和无人监督风险 |
| Applied AI & Demos | 专科化应用和原型系统 | 近期最可转译的是窄任务、强数据、明确终点的系统，尤其是影像和低成本无创数据 |
| Predictions | 2026 年临床 AI 发展预测 | 急诊代理、AI scribe、监管探索、责任纠纷和工作流竞争会加速出现 |

```chart
type: hbar
title: 临床 AI 评估需要覆盖的能力层次
unit: 层
x: 模型独立能力, 真实任务评估, 医生协作, 患者直接使用, 工作流部署, 安全与责任
y: 1, 1, 1, 1, 1, 1
```

## 01 模型性能：受控任务上接近超人，不确定性场景仍然脆弱

2025 年模型性能的主要变化，是前沿推理模型在“自主临床推理”和“规模化预测”上取得明显跃升。报告总结的模型性能并不是一个单一结论，而是一个张力：一方面，LLM 在复杂病例、管理推理、CPC 讨论、预测任务上表现很强；另一方面，这些模型在不确定性、缺失信息、动态场景和答案模式变化下暴露出明显弱点。

### 复杂临床推理：能力已经非常强

| 页码 | 研究 / 系统 | 样本或任务 | 关键数据 | 报告含义 |
| ---: | --- | --- | --- | --- |
| 18 | o1-preview / o1 | NEJM CPC、管理病例、真实 ED 病例 | CPC 诊断准确率 78%，正确下一步检查 87%；临床推理满分 99%，GPT-4 59%，主治医生 35%；管理推理 o1-preview 86%，GPT-4 42%，医生+GPT-4 41%；真实 ED exact/near-exact diagnosis 66% | 受控环境下，前沿 LLM 可能已经超过一般医生的诊断和管理推理水平，需要前瞻性临床试验验证真实部署 |
| 19 | Google AMIE 多轮疾病管理 | 100 个三次就诊模拟场景，21 名 PCP 对照 | Follow-up visit 2 检查建议精确度 99% vs PCP 84%；visit 3 为 100% vs 88%；RxQA 药物推理中困难问题优于 PCP | 多智能体/长上下文/指南 grounding 可让 AI 在慢病管理和连续照护中提供更一致的决策支持 |
| 20 | Dr. CaBot / CPC-Bench | 7102 个 NEJM CPC、1021 个 NEJM Image Challenges、10 类任务 | o3 在 CPC differential diagnosis 中 top-1 60%、top-10 84%，下一步检查 98%；优于 20 名医生 baseline；医生盲评难以区分 AI 与专家且更高评价 AI 推理 | AI 已能模拟专家 case discussant 的完整角色，包括书面和视频病例陈述 |

```chart
type: bar
title: AMIE 在随访检查建议中的精确度
unit: %
x: AMIE第2次随访, PCP第2次随访, AMIE第3次随访, PCP第3次随访
y: 99, 84, 100, 88
```

### 关键弱点：模型仍然过度自信，无法稳定处理不确定性

| 页码 | 研究 / 测试 | 核心设计 | 关键数据 | 风险含义 |
| ---: | --- | --- | --- | --- |
| 21 | NOTA-modified MedQA | 将正确答案替换为“None of the other answers” | DeepSeek-R1、o3-mini、Claude 3.5 Sonnet、Gemini 2.0 Flash、GPT-4o、Llama 3.3-70B 均下降；下降范围 9%-38%；报告举例系统可从 81% 降至 43% | 模型可能学会了题型和答案分布，而不是真正稳定推理 |
| 22 | Script Concordance Testing | 750 个 SCT 项，10 个数据集，1500+ 临床医生对照 | o3 68%、GPT-4o 64%、Gemini 2.5 52%；模型匹配医学生但低于住院医和主治医生；模型过度使用极端评分 | 临床推理核心是随新信息修正判断，当前模型在这种能力上仍不足 |
| 33 | MetaMedQA | 加入虚构问题、畸形问题、I don’t know/NOTA 选项 | GPT-4o 修改后准确率 73%；多数模型给最高置信度；答案不存在时 0% 能识别为不可回答 | “不知道自己不知道”是医疗安全的底层风险 |
| 34 | CRAFT-MD | 将静态病例转换为自然对话 | GPT-4 从静态 0.82 降到对话 0.63；GPT-3.5 从 0.66 降到 0.47；去掉多选答案后 GPT-4 降到 0.49 | 单轮、静态、多选题高分不能代表真实问诊能力 |

```chart
type: bar
title: 静态病例转为对话后模型诊断准确率下降
unit: 准确率
x: GPT-4静态, GPT-4对话, GPT-4无多选对话, GPT-3.5静态, GPT-3.5对话
y: 0.82, 0.63, 0.49, 0.66, 0.47
```

### 规模化预测：从单病种预测走向可穿戴、常规体检和临床计算器自动化

| 页码 | 方向 | 样本 / 数据 | 关键数据 | 报告含义 |
| ---: | --- | --- | --- | --- |
| 23 | 住院恶化预测 | 888 名非 ICU 住院患者，连续可穿戴生命体征 | 5 小时 HR/RR 等序列；8-24 小时前预测 9 倍更多 MEWS>6 警报；AUROC 回顾性 0.89、前瞻性 0.84-0.90；11 个硬结局中预测 9 个，最早提前 17 小时 | 可穿戴数据可填补 4-8 小时测量间隔，帮助更早识别恶化 |
| 24 | 生物年龄预测 | >1000 万人，6 个队列，常规健康记录文本 | LLM biological age C-index 0.76；优于表观遗传钟、端粒长度、frailty index 和传统 ML；age-gap 与全因死亡相关 HR 1.05；发现 316 个衰老相关蛋白 biomarker | 常规记录文本可被 LLM 转化为人群尺度老化评估工具 |
| 25 | 胰岛素抵抗预测 | 1165 人，wearables + labs | 仅人口+可穿戴 AUROC 0.70；加入空腹血糖 0.78；全模型 AUROC 0.80、敏感性 76%、特异性 84%；肥胖+久坐人群敏感性 93%、调整特异性 95% | 可穿戴 + 常规实验室数据可做早期风险筛查，加入 LLM coach 后更个性化 |
| 26 | JETS 可穿戴时间序列基础模型 | 16522 用户，约 300 万 person-days，63 个低频指标 | ME/CFS AUROC 0.81，HTN AUROC 0.87；优于 MAE、PrimeNet、transformer baseline | 自监督可穿戴基础模型能在稀疏、不规则现实数据中学习健康表征 |
| 27 | AgentMD 临床风险计算器 | 自动转换 PubMed 文献为 2164 个可执行计算器 | 专家质检准确率 >85%，单元测试通过率 >90%；RiskQA 88% vs GPT-4 41%；MIMIC 9800+ 入院记录改善院内死亡预测 | LLM agent + 工具调用比裸模型更适合可解释风险预测 |

```chart
type: hbar
title: 规模化预测研究中的部分 AUROC / C-index
unit: 分数
x: 住院恶化回顾性AUROC, 住院恶化前瞻性AUROC上限, 生物年龄C-index, 胰岛素抵抗全模型AUROC, JETS-MECFS-AUROC, JETS高血压AUROC
y: 0.89, 0.90, 0.76, 0.80, 0.81, 0.87
```

> 模型性能部分的底层判断：受控任务强，不等于可自主部署。下一步重点是提高模型 metacognition，即模型对自身不确定性的认识，并把大规模预测连接到明确、可行动、可前瞻性验证的临床决策点。

## 02 基准与评估：不是再刷分，而是测真实临床任务和安全失败模式

报告认为，临床 AI 的 benchmark 正在从“医学知识考试”转向“真实健康对话、EHR 任务、动态多轮场景和安全风险”。这是临床 AI 能否可信部署的前提。

### 现有评估的主要缺口

| 页码 | 研究 / Benchmark | 关键发现 | 数据 |
| ---: | --- | --- | --- |
| 32 | 519 项 LLM 医疗评估系统综述 | 评估过度集中于医学知识与诊断，低估行政、真实患者数据、公平性、部署和校准 | 执照考试 45%、诊断 19%、真实患者数据 5%、计费编码 0.2%、处方 0.2%、准确率作为主指标 95%、公平/偏倚/毒性 16%、部署 5%、校准/不确定性 1% |
| 33 | MetaMedQA | 模型很少承认不可回答，提示严重 metacognition 缺口 | 12 个 LLM；未知答案场景 0% 识别为不可回答 |
| 34 | CRAFT-MD | 多轮对话显著降低诊断准确率 | GPT-4 0.82→0.63，GPT-3.5 0.66→0.47，GPT-4 去掉多选答案后 0.49 |

### 新一代 benchmark：真实对话、真实工作流、EHR 环境和安全

| 页码 | Benchmark | 设计 | 关键数据 | 价值 |
| ---: | --- | --- | --- | --- |
| 35 | HealthBench | 5000 个健康对话，平均 2.6 轮；262 名来自 60 国医生生成 48562 条 rubric 标准 | GPT-3.5 16%、GPT-4o 32%、o3 60%；含 HealthBench Consensus 和 HealthBench Hard；低分项包括 context seeking 和 health data tasks | 从静态题转向医生验证的真实健康对话评价 |
| 36 | MedHELM | 29 名医生建立 taxonomy；35 个 benchmark、5 类、22 子类、121 项任务，其中 12 个使用真实 EHR 数据 | DeepSeek R1 0.66、o3-mini 0.64 总体最佳；Claude 3.5 Sonnet 约低 40% 计算成本且接近；文书 0.74-0.85、患者沟通 0.76-0.89、临床决策支持 0.61-0.76、行政与工作流 0.53-0.63 | 将评估拉回医生日常任务 |
| 37 | MedAgentBench | 100 名患者、>700000 个数据元素、300 个 EHR 常见任务，一半查询、一半行动 | Claude 3.5 Sonnet pass@1 70%、GPT-4o 64%、DeepSeek-V3 63%；Claude 查询任务 85%、行动任务 54% | 测量 AI 是否能作为 agentic teammate 与 EHR 交互 |
| 38 | NOHARM | 100 个真实 primary-care-to-specialist cases，10 个专科，4249 个管理动作，12747 个专家标注 | 31 个 LLM；严重潜在伤害最高 22%；严重伤害中 77% 来自遗漏关键检查或治疗；MedQA 与 NOHARM 安全分只中等相关 R=0.61-0.64；三智能体 advisor+guardian 可显著降低伤害 | 医学知识 benchmark 不能替代临床安全评估 |

```chart
type: bar
title: HealthBench 上模型随代际进步的表现
unit: %
x: GPT-3.5, GPT-4o, o3
y: 16, 32, 60
```

```chart
type: bar
title: MedAgentBench 中模型执行 EHR 任务的成功率
unit: %
x: Claude3.5Sonnet, GPT-4o, DeepSeek-V3, Claude查询任务, Claude行动任务
y: 70, 64, 63, 85, 54
```

> 评估部分的底层判断：模型越来越强时，评估重点应转向 failure modes 和 safety。真正有价值的 benchmark 应覆盖真实数据的混乱性、长程多轮上下文、行政和工作流自动化，以及遗漏、过度自信、错误建议等临床安全问题。

## 03 基础方法：医学事件基础模型、多智能体、多模态和可验证推理

基础方法部分展示的是临床 AI 的下一层能力建设：不是直接拿通用大模型问答，而是把医疗事件、影像、病理、文本、工作流和临床工具组织成更适合医疗的系统。

### 医学事件基础模型：把患者轨迹 token 化

| 页码 | 系统 | 数据规模 | 关键数据 | 作用 |
| ---: | --- | --- | --- | --- |
| 43 | Delphi-2M | >40 万 UK Biobank 参与者训练，190 万丹麦人外部验证，覆盖 1000+ 条件 | 内部 next disease diagnosis 平均 AUC 0.76，10 年 0.70；外部 AUC 0.67；可模拟未来 20 年多病共存轨迹；超越或匹配 CVD、痴呆和死亡风险评分，但不如 HbA1c | 将患者表示为 token-age pair，形成可模拟终身疾病轨迹的生成模型 |
| 44 | Epic CoMET | 118M 患者、115B 事件，Epic Cosmos | 78 个真实世界任务中无需 fine-tuning 或 few-shot，即可匹配或超过任务专用模型；预测 readmission、length of stay、治疗反应和未来诊断；2026 年 2 月向 Cosmos 机构研究者开放 | 医疗事件 foundation model 使个体风险、运营规划和决策支持可规模化 |

```chart
type: bar
title: 医学事件基础模型的数据规模
unit: 百万人
x: Delphi训练人群, Delphi外部验证人群, CoMET患者数
y: 0.4, 1.9, 118
```

### 多智能体系统：流程设计可能比单模型能力更重要

| 页码 | 系统 / 研究 | 关键设计 | 数据与结果 | 核心启示 |
| ---: | --- | --- | --- | --- |
| 45 | Microsoft MAI-DxO | 五个 AI clinician 虚拟面板，逐步选择最有信息量的问题和检查 | 与 o3 结合后诊断准确率 80%，人类医生 20%；比 off-the-shelf o3 节约最高 70% 成本 | 编排和配置能同时提高准确性和成本效率 |
| 46 | Multi-agent Conversation for rare disease | 多医生 agent + supervisor，稀有病病例 primary consult 和 follow-up consult | MAC 78% vs GPT-4 58%；约 4 个 doctor agents + supervisor 是甜点；supervisor 有实际贡献，单纯专家 persona 不保证提升 | 关键不是“扮演专家”，而是结构化分工与分歧处理 |
| 47 | TrialGenie | Trialist、Informatician、Clinician、Statistician、Supervisor 五类 agent | 将 free-text eligibility、intervention、endpoint 转为 MIMIC-IV SQL，自动构建 cohort 和 trial emulation；GPT-4o agents 在 trial parsing、SQL、临床推理上更强 | 临床试验设计可被拆成多 agent 专家流程 |
| 48 | Multi-Agent Optimization Paradox | 2400 个 MIMIC-CDM ED 病例，8 个 single-agent 与 26 个 multi-agent 系统 | “best of breed”组件级优化系统 lab interpretation 86%，但诊断准确率仅 68%；较不优化的多智能体系统诊断 77% | 组件最优不等于系统最优，必须端到端验证信息流 |

```chart
type: bar
title: 多智能体系统与对照表现
unit: %
x: MAI-DxO诊断准确率, 人类医生诊断准确率, MAC稀有病准确率, GPT-4稀有病准确率, 最优组件系统诊断, 较少优化系统诊断
y: 80, 20, 78, 58, 68, 77
```

### 多模态系统：把文本、图像、病理、心电和临床数据合到一起

| 页码 | 系统 / 研究 | 数据与场景 | 关键结果 | 风险 / 含义 |
| ---: | --- | --- | --- | --- |
| 49 | Multimodal AMIE | 105 个 multimodal OSCE 场景，文本、皮肤照片、ECG、临床文档 | AMIE 在 top-1 到 top-10 鉴别诊断准确率上超过 PCP，涵盖诊断、解释、管理推理、沟通质量 | 多模态对话系统开始接近真实医生工作流 |
| 50 | 肾癌复发风险多模态模型 | 临床特征、增强 CT radiomics、whole-slide pathology pathomics | C-index 训练 0.92、内部验证 0.89、外部验证 0.84；将 83% KEYNOTE-564 低风险但复发者重分为高风险，将 58% 非复发中高风险者重分为低风险 | 多模态可降低辅助治疗的不足与过度治疗 |
| 51 | MUSK 肿瘤视觉-语言模型 | 5000 万病理图像、10 亿文本 token、100 万图文对；8000+ 患者 outcome prediction | 23 个 benchmark 优于 7 个 foundation models；PathVQA +7%，PathMMU retrieval +34%；黑色素瘤复发 AUC 0.83，pan-cancer prognosis C-index 0.75，免疫治疗反应 AUC 0.77；RCC 风险分层 HR 36.8 | 肿瘤基础模型可把视觉和语言数据用于预后与治疗反应预测 |
| 52 | EyeFM 眼科多模态 copilot | 1450 万眼部图像、5 种影像模态、40 万+临床文本；中国 668 名患者 RCT | 医生诊断正确率 75%→92%，转诊正确率 81%→92%；自我管理随访依从性 70% vs 49%，转诊行动 38% vs 20% | 罕见的前瞻性 RCT，证明多模态 AI 可改善实际医疗行为 |
| 53 | 多模态 benchmark 脆弱性 | 对多模态医学问题做扰动 | 模型会为错误诊断生成高置信解释，甚至描述不存在的视觉特征；缺少图像仍能高于随机正确 | benchmark 高分不等于视觉 grounding 和临床 readiness |

```chart
type: bar
title: EyeFM 对真实眼科照护的改善
unit: %
x: 对照诊断正确率, EyeFM诊断正确率, 对照转诊正确率, EyeFM转诊正确率, 对照自我管理依从性, EyeFM自我管理依从性
y: 75, 92, 81, 92, 49, 70
```

### 推理模型和证据 grounding：要奖励过程，也要核查引用

| 页码 | 方法 / 研究 | 关键发现 | 数据 |
| ---: | --- | --- | --- |
| 54 | Med-PRM | 医学 Process Reward Model 对每一步推理评分，包括事实准确性、逻辑一致性和临床相关性；用 RAG-as-a-judge 生成标签，再用于 SFT/RL | <10B 开源模型中达到 72%-73% 准确率，在七个 benchmark 中 SOTA，尤其提升复杂推理任务 |
| 55 | Disentangling Knowledge and Reasoning | 11 个 biomedical QA benchmark 中只有 33% 真正需要多步推理；模型被错误初始假设干扰时常崩溃 | 错误 hypothesis 可让模型下降 40%-60%；SFT+RL 在 adversarial 条件下降幅仅 4%-6% |
| 56 | Fine-tuning frontier models | 新 FDA 批准药物、合成 EHR、更新指南等知识 fine-tune 后不等于真正 generalization | 新药 facts generalization 30%，合成 EHR 12%，更新指南 20%；某些 memorization >90%；GPT-4o mini 药物 vignette 约 51%、EHR 约 33% |
| 57 | SourceCheckup | 自动检查 LLM 引用是否支持医学陈述；800 个问题、约 58000 个 statement-source pairs，与美国医生一致率 89% | 50%-90% 回答不是完全被引用支持；即使 GPT-4o + RAG 也只有 55% response-level support，30% statement 缺少证据支持 |

```chart
type: bar
title: 新医学知识 fine-tuning 的泛化表现
unit: %
x: 新药知识泛化, 合成EHR泛化, 更新指南泛化, 记忆化任务上限, GPT-4o-mini药物vignette, GPT-4o-mini-EHR任务
y: 30, 12, 20, 90, 51, 33
```

> 基础方法部分的底层判断：临床 AI 未来进步不只来自更大的 base model，而来自如何把模型适配到医疗知识、医疗时间线、医疗多模态数据、医疗工具调用和端到端工作流中。与此同时，“说得流畅”不等于“有证据支持”，claim-level grounding 将成为医疗信任的关键。

## 04 临床工作流：价值来自协作设计，而不是简单替代医生

临床工作流部分是报告最有现实价值的章节之一。它显示，AI 并不是只要“答得比医生好”就能落地。医生如何使用 AI，AI 何时介入，界面如何呈现建议，错误如何被提示，是否会造成自动化偏见或技能退化，这些都决定最终价值。

### 临床推理与决策支持

| 页码 | 研究 / 系统 | 场景 | 关键数据 | 含义 |
| ---: | --- | --- | --- | --- |
| 62 | GPT-4 管理推理 RCT | 92 名医生，5 个真实去标识病例 | GPT-4 + 常规资源比常规资源提高 7%；医生+GPT-4 43%，GPT-4 单独 44%；多花约 2 分钟/例，无潜在伤害增加 | AI 能提升复杂管理推理，但协作设计未优化 |
| 63 | Collaborative AI 诊断试验 | 70 名医生，AI 作为 first opinion 或 second opinion | 准确率 75%→82%-85%；减少低分病例；仍未超过 AI alone | 人机交互设计是诊断协作的新前沿 |
| 64 | 急诊 AI chatbot | 461 个 urgent care presentations | AI 与医生一致 57%；AI optimal 77% vs 医生 67%；potentially harmful 2.8% vs 4.6%；分歧时 AI 更常被评为高质量 | AI 擅长指南一致和适当检查，医生擅长不一致信息和体格检查整合 |
| 65-66 | AI Consult | 肯尼亚 Penda Health，39849 次就诊，20589 使用 AI，18990 未使用 AI，15 个 clinic | 历史采集错误相对降低 32%，检查错误 10%，诊断错误 16%，治疗错误 13%；NNT 诊断 18.1、治疗 13.9；若全年 40 万访问，可减少约 22102 个诊断错误和 28880 个治疗错误 | 这是 AI 增强临床推理的真实世界前瞻性验证之一 |

```chart
type: bar
title: AI Consult 对不同临床错误的相对降低
unit: %
x: 历史采集错误, 检查错误, 诊断错误, 治疗错误
y: 32, 10, 16, 13
```

### 专科任务：影像、筛查和解释支持

| 页码 | 研究 | 样本 / 场景 | 关键数据 | 含义 |
| ---: | --- | --- | --- | --- |
| 67 | 乳腺癌筛查 AI | 德国真实世界研究，12 个站点、119 名放射科医生、463094 名女性，260739 例 AI 支持 | Breast cancer detection rate 6.7 vs 5.7/1000，提升 17.6%；召回率 37.4 vs 38.3/1000，略低且非劣；safety-net 触发 3969 次，采纳 1077 次，发现 204 例原本会漏掉的癌症 | AI 可提高筛查检出率而不增加假警报 |
| 68 | AI 辅助肺功能解释 | 133 名 GP / NP，50 个病例 | AI 组 top diagnosis 平均 +9%，COPD 诊断 +16%，纳入鉴别 +7%；也改善 FEV1/FVC 技术质量评级 | 可缩小基层与专家解释差距，但医生仍希望解释性更强 |

```chart
type: bar
title: AI 在筛查和基层解释任务中的提升
unit: %
x: 乳腺癌检出率相对提升, 肺功能top诊断提升, COPD诊断提升, COPD纳入鉴别提升
y: 17.6, 9, 16, 7
```

### 人机协作的结构性风险：协作未优化、自动化偏见、技能退化

| 页码 | 研究 | 核心发现 | 数据 |
| ---: | --- | --- | --- |
| 69 | 52 项研究 meta-analysis | Human-AI medical teaming 平均高于 human-only，但很少实现完全互补，也常常不能超过二者中最佳一方；同步协作优于顺序协作；初级医生收益大于高级医生 | 52 项研究、87 个 teaming/expertise 条件 |
| 70 | AI training + GPT-4o RCT | 巴基斯坦 58 名医生完成 20 小时 AI literacy 后使用 GPT-4o | 诊断推理 43%→71%，GPT-4o alone 83%；38% 病例中医生+LLM 超过 GPT-4o alone |
| 71 | AI-trained physician automation bias | 44 名受训医生，264 个病例，半数看到含错误建议 | 错误建议组准确率 73% vs 无错误建议 85%；首选诊断 76% vs 91%；咨询率相近 69% vs 67% | 训练不能完全消除自动化偏见，界面护栏不可少 |
| 72 | Colonoscopy deskilling | 1443 例 standard non-AI colonoscopy，比较 AI 使用前后 | 腺瘤检出率 28.4%→22.4%；调整后 OR 0.69 | 长期 AI 暴露可能削弱医生独立警觉性 |

```chart
type: bar
title: AI 培训带来的收益与自动化偏见风险
unit: %
x: 常规资源诊断推理, AI支持诊断推理, GPT-4o单独, 错误建议组准确率, 无错误建议组准确率, 错误建议组首诊准确率, 无错误建议组首诊准确率
y: 43, 71, 83, 73, 85, 76, 91
```

### 文书和行政工作流：主观改善明显，客观节省仍需扩大任务边界

| 页码 | 工作流 | 样本 / 系统 | 关键数据 | 含义 |
| ---: | --- | --- | --- | --- |
| 73 | Ambient AI scribe | 272 名医生，多中心前后对照，使用 30 天 | 自报 burnout 52%→39%，即 74% lower odds；认知负荷、患者注意力、下班后文档时间等均改善 | 医生主观负担明显下降 |
| 74 | AI scribe RCTs | Abridge、Microsoft DAX Copilot、Nabla，Epic Signal 数据 | 客观节省约每条 note 20 秒，类似 human scribe；主观 burnout 仍有改善 | 当前 scribe 的客观效率提升有限，未来需接入沟通、医嘱等 downstream tasks |
| 75 | AI message routing | Emory 4 个门诊 clinic，469 个 live threads vs 402 个未路由 | 分类路由正确 98%；首次 staff interaction 1.2h→0.2h；会话解决 26.7h→4.2h；每条消息减少 2 次互动 | 行政流程类 AI 对效率价值非常直接 |
| 76 | LLM 出院小结 | 100 个真实住院 encounters，GPT-4 vs 医生 | 总体质量 3.7 vs 3.8；更简洁 4.0 vs 3.7，更连贯 4.2 vs 4.0，但完整性较低 3.7 vs 4.1；错误 2.9 vs 1.8，伤害评分低 0.84 vs 0.36 | 适合作为草稿，但必须人工审查 |
| 77 | VeriFact | 100 名患者，人类和 LLM 生成 Brief Hospital Course，atomic claims | 最佳配置与医生共识一致率 93%，高于临床医生间一致率 89% | EHR-grounded fact-checking 可作为临床文档安全层 |

**AI 行政工作流的典型效果**（不同指标量纲不同，用表格对比）

| 工作流指标 | 前 / 基线 | 后 / 用 AI | 单位 |
| --- | ---: | ---: | --- |
| Ambient Scribe · 医生 burnout | 52 | 39 | % |
| 消息首次互动时长 | 1.2 | 0.2 | 小时 |
| 消息会话解决时长 | 26.7 | 4.2 | 小时 |
| 消息路由分类正确率 | — | 98 | % |

> 临床工作流部分的底层判断：AI 的短期价值不一定来自“替代医生做最终判断”，而更可能来自结构化协作、减少遗漏、加快信息流动、降低文书负担和改善工作流。真正的产品设计重点是让人和模型各自的错误模式互补，而不是简单把模型答案塞进医生界面。

## 05 面向患者的 AI：可扩展健康支持与过度信任风险同时上升

患者端 AI 是报告中最具社会影响的一部分。它可能重塑患者参与、健康教育、慢病管理和服务可及性，但也带来不同于医生端 AI 的安全问题：普通患者无法承担模型监督责任。

### 诊断对话与过度信任

| 页码 | 研究 / 系统 | 核心数据 | 含义 |
| ---: | --- | --- | --- |
| 82 | Google AMIE 诊断对话 | 159 个模拟患者案例，20 名医生对照；AMIE 在 30/32 个专家评价轴和 25/26 个患者演员评价轴上优于医生 | AI 已经能在文字诊断对话中表现出强诊断准确率、沟通质量和同理心，但与真实面诊仍有差异 |
| 83 | AI 医疗建议过度信任 | 300 名参与者，90 个医学问答，医生、高准确 AI、低准确 AI 来源盲法 | 高准确 AI 被评为比医生更 valid/trustworthy/complete；低准确 AI 与医生相当；参与者对低准确 AI 也同样倾向进一步搜索、采纳建议、就医 | 患者端 AI 必须有强护栏，不能依赖用户识别错误 |

### AI 健康教练：规模化、个性化和参与度提升

| 页码 | 系统 / 研究 | 样本 / 设计 | 关键数据 | 含义 |
| ---: | --- | --- | --- | --- |
| 84 | CV-Coach | LLaMA 3-70B，基于 TTM 和心血管健康 literature fine-tune | 632 名参与者；TTM stage-matched 场景 68% 偏好 AI，一般比较 85% 偏好 AI；专家 effectiveness 4.4 vs 2.8，TTM alignment 4.1 vs 3.5 | LLM 可将行为科学框架规模化转成短促、可执行、阶段匹配的健康 nudges |
| 85 | GPTCoach | GPT-4 健康教练，motivational interviewing + 3 个月 wearable data | 16 名参与者；MI 一致语言 93%；参与者感到被支持和舒适 | 好的 AI coach 不是直接给建议，而是保持非指令、个性化、非评判语气 |
| 86 | AI-led DPP | 368 名 prediabetes 成人，12 个月非劣效 RCT，AI-led vs human-led | 主要复合结局 31.7% vs 31.9%，AI 非劣；参与度和完成率更高，无不良事件；<1% eligible patients 参与传统 DPP | 完全自主生活方式干预可接近人类教练效果，有助于降低参与门槛 |
| 87 | REVERIE AI VR exercise | 227 名肥胖青少年，8 周 RCT，AI VR 乒乓/足球 vs 真实运动 vs 对照 | 脂肪量 -4.3kg vs 对照，接近真实运动 -5kg；额外改善工作记忆和嗅觉功能，fMRI 显示 neural efficiency/neuroplasticity 改善 | AI+VR 可提供生理、心理和认知综合干预 |

**AI 健康教练与人类教练对比**（百分比与评分量纲不同，用表格对比）

| 对比项 | AI | 人类 / 对照 | 单位 |
| --- | ---: | ---: | --- |
| TTM 阶段匹配场景偏好 AI | 68 | — | % |
| 一般场景偏好 AI | 85 | — | % |
| 教练有效性评分 | 4.4 | 2.8 | 分（/5） |
| DPP 主要复合结局达成 | 31.7 | 31.9 | % |
| GPTCoach · MI 一致语言 | 93 | — | % |

### 阅读理解、翻译和可穿戴数据解释

| 页码 | 系统 / 研究 | 关键数据 | 含义 |
| ---: | --- | --- | --- |
| 88 | AI 通俗化临床笔记 | 患者阅读 4 份常见疾病出院小结；GPT-4 转为低健康素养摘要 | 客观理解 +1.2/4，主观理解 +2.4/16，自信 +2/8；阅读时间减少；黑人、西语裔、老年和健康知识有限者收益更明显 | AI 可作为健康素养补齐工具 |
| 89 | GPT-4o 临床语言翻译 | 20 个真实儿科指令，英文转西班牙文，与专业译者对比 | 与专业译者统计等效；误译 1.8 vs 4.1/样本；专家偏好 AI 52%、偏好人类 20%、中立 28% | 可扩展到 portal messages、intake forms、consent forms |
| 90 | PH-LLM | Gemini Ultra 1.0 fine-tune，可穿戴睡眠/运动数据 | 睡眠医学考试 79% vs 人类 76%，fitness 88% vs 71%；857 个真实 case studies 中与专家相当；预测自报睡眠 AUROC 接近专用模型 | 可穿戴 LLM 使闭环睡眠和运动教练更可行 |
| 91 | 多智能体个人健康助手 | Gemini 2 Flash/Pro，Data Scientist、Domain Expert、Health Coach 三 agent | 基于 1370 个真实 health queries、555 名 Fitbit 用户调查、7,000+ 人类标注和 1100 小时专家/用户工作；比单 agent 和并行 multi-agent 更可信、更个性化 | 个人健康助手需要数据分析、医学推理、行为教练的编排 |

```chart
type: bar
title: GPT-4o 临床翻译专家偏好结果
unit: %
x: 偏好AI翻译, 偏好人类翻译, 中立
y: 52, 20, 28
```

> 患者端 AI 的底层判断：高价值患者端 AI 应用必须围绕客观临床终点，而不是只追求 engagement。由于平台和 vendor 可能有用户粘性、商业化等利益，患者端 AI 需要更严格的安全护栏、角色边界和人工监督机制。

## 06 应用 AI 与 Demo：真实转译从窄任务开始

Applied AI & Demos 是报告中案例最多的部分。它显示，临床 AI 的落地路线并不是“一个大模型统治医疗”，而是不同专科把高质量、低成本、强信号数据重新组织成任务明确的系统。影像仍是主战场，但 ECG、视网膜、笑脸视频、EHR、临床试验材料等低成本数据正在被重新开发。

### 影像与专科模型：最成熟的临床 AI 方向

| 页码 | 领域 | 系统 / 研究 | 数据与关键结果 | 临床意义 |
| ---: | --- | --- | --- | --- |
| 96 | 病理 / 乳糜泻 | Whole-slide AI | 3383 张训练切片，644 张独立测试；AUROC 99.2%-99.7%，准确率 97.5%，敏感性 95.5%，特异性 97.8%；模型-病理专家一致 90.5%，专家间一致 90.3% | 达到病理医生水平，且跨性别、年龄、医院表现 >94% |
| 97 | 鼻腔倒置乳头状瘤 CT | Google Vertex AutoML | 19 家机构、958 名患者、41099 张 CT 切片；AUC 99.8%，准确率 99.1%，precision 99.2%，敏感性 95.8%，特异性 99.7% | 可补充术前活检漏诊局灶恶变的问题，但需外部和前瞻验证 |
| 98 | 乳腺 MRI | MOME mixture-of-modality-experts | 1042 个病例；AUROC 0.91、AUPRC 0.95，匹配或超过 4/6 名放射科医生 | 可减少 BI-RADS 4 不必要活检，并预测三阴性乳腺癌和新辅助化疗反应 |
| 99 | 卒中影像 | NHS Brainomix 360 | 英格兰 26 家医院真实世界部署；EVT 率 2.3%→4.6%，非 AI 医院 1.6%→2.6%；AI-reviewed 患者 OR 1.57；转运 door-in-door-out 192→128 分钟；good functional outcomes OR 1.16 | 大规模真实世界证据显示 AI 改变治疗率和流程时间 |
| 100 | 肺 CT | LCTfound | 105184 CT、2800 万+图像，5 家中国医院，14 种肺病 | 罕见病如肺泡蛋白沉积症 AUROC 0.95；支持 NSCLC 预后、肿瘤分割、低剂量去噪、virtual CTA、3D 手术导航 | 一个 CT foundation model 可减少每个任务重建模型和标注 pipeline 的需求 |
| 101 | 肿瘤进展预测 | Woollie oncology LLM | 38719 份 MSK 放射印象，3402 名患者；MSK AUROC up to 0.97；UCSF 外部 AUROC 0.88，肺癌进展 0.95 | 专科 LLM 可从真实放射报告中预测 cancer progression |
| 102 | 血管超声机器人 | UltraBot | 247000 个专家 image-action examples；>90% 扫描任务完成；5.5 倍更高重复性 | 模仿学习可推动自主、高精度超声 |
| 103 | 心脏淀粉样变 echo | CNN 单 apical four-chamber echo video | 2719 名多中心、多族群验证；AUROC 0.93，敏感性 85%，特异性 93%；优于 transthyretin CA score 0.74 和 wall thickness score 0.80 | 单个常规 echo 视频可筛查常漏诊的心衰原因 |
| 104 | 全面 echo 解读 | EchoPrime | 1210 万 echo videos + 心脏科报告，5 个健康系统 | 平均 AUC 0.85-0.92；STEMI AUC 0.90，amyloidosis AUC 0.95；无需特定任务 tuning 生成 exam-level findings | 多视角、多任务 echo foundation model 需要前瞻临床试验验证 |

```chart
type: hbar
title: 影像和专科模型的部分性能指标
unit: %
x: 乳糜泻病理准确率, 倒置乳头状瘤CT准确率, 心脏淀粉样变敏感性, 心脏淀粉样变特异性, EchoPrime-STEMI-AUC, EchoPrime淀粉样变AUC, LungCT罕见病AUROC
y: 97.5, 99.1, 85, 93, 90, 95, 95
```

### ECG、视网膜和简单视频：低成本数据被重新发现

| 页码 | 数据来源 | 系统 / 研究 | 关键数据 | 意义 |
| ---: | --- | --- | --- | --- |
| 105 | ECG | advanced chronic liver disease screening | 98 个 primary care teams、15596 名患者；新诊断 advanced CLD 0.5%→1.0%，OR 2.1；ECG-ML positive 患者 4% vs 1%，OR 4.4 | 常规 ECG 可用于肝病早筛 |
| 106 | ECG | EchoNext | >120 万 ECG-echo pairs；内部 AUROC 85%，外部 78%-80%；150 张 ECG 上准确率 77% vs 心脏科医生 64%，医生咨询 AI 后 69% | ECG 可扩展结构性心脏病筛查 |
| 107 | ECG 图像 | PRESENT-SHD | 261228 个 ECG 图像；六个外部 cohort AUROC 0.85-0.90；手机照片和 EHR 截图也保持高准确 | opportunistic screening 成本更低 |
| 108 | ECG | ROMIAE AMI 排除 | 韩国 18 家大学教学医院，8493 名疑似 AMI ED 患者 | AI-ECG AMI AUROC 0.88，与 HEART score 相当；低风险 8.2% 患者，敏感性 99.6%，NPV 99.1%；加入 HEART score 净重分类改善 20% | 无需等 troponin 即可帮助 ED 早期风险分层 |
| 109 | 笑脸视频 | Parkinson’s disease screening | 1452 名参与者，391 名 PD；外部准确率 80%-85%；非专家 68%-80%，专家 70%-93% | 手机/摄像头可用于低门槛远程神经病筛查 |
| 110 | 视网膜 | DeepRETStroke | 近 90 万眼底照片；AUC 0.75-0.80 检测 silent brain infarction，5 年 incident stroke AUC 0.73-0.90，recurrent stroke AUC 0.73-0.77；218 名既往卒中社区前瞻研究中，AI 指导分层 + 干预后复发卒中减少 >80% | 视网膜可作为脑卒中风险窗口 |

```chart
type: bar
title: 低成本无创数据的筛查性能
unit: %
x: EchoNext内部AUROC, PRESENT-SHD外部AUROC上限, ROMIAE低风险敏感性, ROMIAE低风险NPV, PD笑脸视频准确率上限, DeepRETStroke五年卒中AUC上限
y: 85, 90, 99.6, 99.1, 85, 90
```

### 改善患者结局和资源配置：从预测转向行动

| 页码 | 场景 | 系统 / 研究 | 关键数据 | 真实价值 |
| ---: | --- | --- | --- | --- |
| 111 | 脓毒性休克 | RL vasopressin initiation | >3600 患者训练，10217 验证；模型建议 87% 使用 vasopressin vs 实践 31%；更早启动 4h vs 5h；更低 norepinephrine 0.20 vs 0.37 µg/kg/min；与模型一致治疗院内死亡 aOR 0.81 | RL 可发现治疗时机策略，但需前瞻验证 |
| 112 | 糖尿病肾病 | DeepDKD retinal AI | 734084 张视网膜图像预训练，90067 患者；>186000 参与者开发验证；DKD AUC 0.79-0.84，metadata 0.57-0.72；区分 DN vs non-DKD AUC up to 0.91；前瞻基层约 90% 敏感性 | 非侵入方式识别肾病，可能减少活检需求 |
| 113 | 结直肠癌手术 | AI 1 年死亡风险分层 | 18403 名患者 registry；风险组 ≤1%、1-5%、5-15%、>15% | 部署后 severe complications 19% vs 28%，aOR 0.63；medical complications 24% vs 37%，aOR 0.53；readmission IRR 0.66；97% 模拟场景 cost-saving | AI 风险分层触发围手术期干预可改善结局和成本 |
| 114 | 术前输血准备 | Smart Match | >235000 病例训练，24003 例 silent prospective validation | 回顾 AUROC 0.96、AUPRC 0.62；前瞻 AUROC 0.94；敏感性 0.72、PPV 0.34，优于医生和 MSBOS | 实时、机构特异模型可减少不必要血液准备并提升安全 |

```chart
type: bar
title: AI 指导干预前后的结直肠手术并发症
unit: %
x: 对照严重并发症, AI组严重并发症, 对照医学并发症, AI组医学并发症
y: 28, 19, 37, 24
```

### 运营与临床试验：减少排队、筛选和人工 adjudication 负担

| 页码 | 场景 | 系统 / 研究 | 关键数据 | 意义 |
| ---: | --- | --- | --- | --- |
| 115 | ED 分诊 / 转诊 / 诊断 | Claude + RAG on MIMIC-IV | 2000 个真实 ED cases；Claude 3.5 Sonnet + RAG exact triage 66%；正确诊断至少一个近 80%；正确专科转诊 >77% | 适合辅助患者和医生理解病情严重程度、分诊和诊断支持 |
| 116 | 专科转诊 gatekeeping | AI referral screen | 45039 条训练，1750 独立验证，5 个专科 | 准确率绝对提升 19%，即每 100 人多正确重分类 19 人；准确率和特异性高于人类 gatekeeper，但敏感性较低 | 可减少不合适转诊，但需人工监督防止漏诊 |
| 117 | 临床试验 MACE adjudication | Auto-MACE | o1-mini + Clinical Longformer | 高置信时 CV death 97%、MI 89%、stroke 88% 一致；PARADISE-MI HR AI 0.91 vs CEC 0.90；CEC 可能耗费最高 1.5 亿美元 | 可把人工工作集中在模型不确定病例 |
| 118 | 临床试验预筛 | RECTIFIER | 4476 名 HF trial structured eligible patients 随机 AI vs manual | 15 天内几乎识别全部 eligible vs manual 50 天；HR 1.8；eligibility 20% vs 13%；enrollment 2% vs 1%，HR 1.8 | AI 可缩短筛选时间并提高入组率 |
| 119 | 肿瘤试验匹配 | HopeLLM | 38 名乳腺癌 retrospective，22 名连续患者 live co-spective | 患者实际入组 trial top-5 recall 100%；live recall@10 88%；已在 City of Hope feasibility team 生产使用 | agentic eligibility evaluation 可处理数百页病历和试验匹配 |

```chart
type: bar
title: 临床运营和试验筛选中的 AI 效果
unit: %
x: ED准确分诊, ED至少一个正确诊断, ED正确专科转诊, 转诊准确率绝对提升, MACE-CV死亡一致, MACE-MI一致, MACE卒中一致, HopeLLM回顾recall5, HopeLLM实时recall10
y: 66, 80, 77, 19, 97, 89, 88, 100, 88
```

### Demo：下一波产品原型集中在 EHR、eConsult、安全 leaderboard 和心理支持

| 页码 | Demo | 能力 | 关键数据 / 状态 | 含义 |
| ---: | --- | --- | --- | --- |
| 120 | ChatEHR | HIPAA-compliant 环境下实时访问 patient data，结构化/非结构化搜索，数据转换，工作流自动化 | Stanford 多个 clinical sites，1000+ users，支持 12000 patients | EHR 搜索和工作流自动化是医生端 AI 的核心落地方向 |
| 121 | SAGE | Stanford eConsult interface，自动提取患者信息、LLM synthesis、订单推荐 | 长期目标是增强 PCP 和 specialist，2026 年前瞻 pilot 计划 | 专科咨询可从“多日等待”转向就诊当场实时支持 |
| 122 | Chopper / Internist.ai | 本地部署 EHR、health networks、medical literature 自然语言接口 | 比利时 Cliniques Universitaires Saint-Luc，2000+ users，50000+ conversations；open models，本地 isolated hardware | on-premise 与 source validation 是医疗系统采用 AI 的重要路径 |
| 123 | MAST & NOHARM leaderboard | 医学 AI benchmark suite，比较模型表现、安全、多 agent 组合 | BENCH.ARISE-AI.ORG；可看模型排名、性能画像、多 agent 数据库 | 安全和 benchmark 透明化将成为临床 AI 选择模型的基础设施 |
| 124 | Grow Therapy AI Coach | therapy session 之间的日常压力支持，不是 therapy chatbot；human-on-the-loop | proprietary coach bench 覆盖 safety、security、role adherence、functional performance、relationship dynamics、bias； therapist 可见或收到 flagged 对话 | 心理健康 AI 需要清晰角色边界和治疗师监督 |

```chart
type: bar
title: EHR Demo 的真实使用规模
unit: 数量
x: ChatEHR用户数, ChatEHR服务患者数, Chopper用户数, Chopper对话数
y: 1000, 12000, 2000, 50000
```

> 应用部分的底层判断：真正走向临床的路径很具体。影像仍是最大应用场景，但越来越多专科开始重用低成本、非侵入、常规可得的数据来做风险评估。AI 能力已经明确存在，下一步最需要的是随机、前瞻、嵌入真实流程的临床试验。

## 2026 年预测

报告最后给出 10 条对 2026 年临床 AI 的预测。这些预测并非单纯技术展望，而是对临床、监管、责任、保险和商业竞争的判断。

| 序号 | 预测 | 说明 |
| ---: | --- | --- |
| 1 | 会出现第一起 AI 在错误中扮演重要角色的医疗过失诉讼 | 当 AI 进入真实工作流，责任边界会从理论问题变成法律问题 |
| 2 | urgent care AI agents 会进入主流，并被越来越多 health systems 提供 | 急诊/急症场景任务清楚、需求大、效率压力高 |
| 3 | 临床数据标注系统会被整合进真实工作流 | 部署 AI 需要持续标注、反馈和质量控制，而不是一次性训练 |
| 4 | health systems 与 insurers 会进入 AI-bot arms race | prior authorization、claims denials、coding optimization 等环节可能互相自动化对抗，供应商获益但系统不一定净受益 |
| 5 | FDA 会探索生成式 AI 产品的新监管机制，但不会有重大进展 | 生成式 AI 的更新频率、适应性和泛化场景挑战传统审批 |
| 6 | 接受 AI 医疗治疗、咨询和建议的人数会超过 live humans | 患者端 AI 可及性高，可能快速扩展，但安全护栏更重要 |
| 7 | >90% 临床 note 文本将由 AI 生成或参与生成 | ambient scribe 普及后，难以知道临床医生真实思考过程如何体现在记录中 |
| 8 | 会看到临床 AI CDS 系统前瞻性部署到真实 workflow 的结果 | 证据会从 benchmark 走向 prospective deployment |
| 9 | 前沿模型会继续在 benchmark 上超过人类，新研究会转向 human-machine collaboration | 研究重点从模型能力转向协作机制 |
| 10 | scribe 市场继续增长，能力扩展到 downstream workflow tasks | 记录只是入口，后续将连接沟通、医嘱、任务、结算等流程 |

```chart
type: pie
title: 2026 年预测涉及的主要领域
unit: 条
x: 法律责任, 临床代理, 数据工作流, 保险与支付对抗, 监管, 患者端服务, 文书自动化, 前瞻性证据, 人机协作研究, Scribe市场
y: 1, 1, 1, 1, 1, 1, 1, 1, 1, 1
```

## 结语 / 启示

这份报告最重要的价值，是把临床 AI 的讨论从“模型会不会超过医生”推进到“怎样在真实医疗系统中产生可验证的好处”。如果只看模型能力，2025 年已经足够惊人；但如果看真实照护，真正的问题才刚开始。

第一，临床 AI 的成熟度不能用单一 accuracy 评估。医疗任务天然包含不确定性、缺失信息、风险权衡和责任分配，因此必须同时评估校准、偏倚、遗漏、可解释性、引用支持、用户行为、工作流摩擦和患者结局。

第二，短期最靠谱的落地不是“通用 AI 医生”，而是专科化、窄任务、强约束、可审计的系统。比如影像筛查、ECG 风险识别、临床试验预筛、消息路由、出院小结草稿、EHR 事实核查等。这些场景的共同点是数据相对稳定、目标明确、出错边界可设定、结果可以被前瞻性验证。

第三，患者端 AI 必须比医生端 AI 更谨慎。患者端工具的价值在可及性、陪伴、理解和行为改变，但风险在于普通用户没有能力发现错误，也很容易被流畅、温和、看似专业的回答说服。因此，角色边界、人类监督、危机转介、claim-level grounding 和客观结局评估是底线。

第四，医生不会简单被 AI 替代，但医生工作会被 AI 重构。AI 可能先改变的是文书、分诊、信息检索、决策提示、风险分层和沟通，而不是最后的医疗责任。未来真正需要建设的不是一个“更聪明的模型”，而是一个能让医生、患者、数据、模型、流程和安全机制稳定协作的医疗系统。

> 报告给出的最终判断可以概括为一句话：临床 AI 已经足够强大，问题不再是“有没有能力”，而是“是否有足够证据、足够护栏、足够好的工作流，把这种能力转化为真实照护中的安全收益”。
