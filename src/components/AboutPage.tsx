import {
  BookOpen,
  Boxes,
  HeartHandshake,
  TrendingUp,
  Bot,
  CalendarDays,
  Sparkles,
  ClipboardCheck,
  Cpu,
  Megaphone,
  Phone,
  Mail,
  QrCode,
  ArrowRight,
  type LucideIcon,
} from 'lucide-react';
import { Header } from './Header';
import { OpenSourceFooter } from './open-source-home/OpenSourceFooter';
import { Section, Container, Reveal, Button, SectionHeading } from './open-source-home/ui';
import { ClientLogoWall } from './open-source-home/sections/ClientLogoWall';
import { SITE_CONTACT_EMAIL, SITE_CONTACT_PHONE, SITE_WECHAT_OFFICIAL } from '../lib/siteMeta';
import { getYiyuPageAttrs } from '../lib/yiyuTongSiteMap';
import { useLang, type Bilingual } from '../lib/i18n';

// ============================================================
// 关于我们 —— 依据《益语智库介绍文档·详细版》彻底重写。
// 真实定位: 以「可落地的增长咨询」为核心承诺的战略陪伴机构;
// 始于公益、不止公益; 成长合伙人式陪伴; 六步法; 公益×商业双线;
// 真实案例 + 人机协作团队(3 人类 + 4 AI 同事)。
// UI 沿用 open-source-home 设计系统 + .feature-motion-card 精品卡语言。
// ============================================================

interface AboutPageProps {
  onNavigate?: (page: string) => void;
}

const CONSULT = '?page=consult-apply';
const WORKBENCH = '?page=workbench';
const CARD =
  'feature-motion-card group relative rounded-[20px] bg-os-paper ring-1 ring-os-line shadow-os overflow-hidden transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-os-lg hover:ring-os-violet/45';

// ⚠️ TODO 占位数据 —— 上线前替换为真实数字 (来源: 介绍文档 + 业务方核实)
const STATS: { value: string; label: Bilingual; placeholder?: boolean }[] = [
  { value: '60+', label: { zh: '服务企业 / 基金会 / 公益组织', en: 'Companies / foundations / nonprofits served' } },          // 文档确证「60余家」
  { value: '10+', label: { zh: '年战略咨询与组织陪伴经验', en: 'Years of strategy consulting and organizational partnership' }, placeholder: true }, // TODO 占位
  { value: '3', label: { zh: '部公开出版著作', en: 'Published books' } },                          // 文档确证 3 本
  { value: '7×24', label: { zh: '人机协作 · 3 位人类 + 4 位 AI 同事', en: 'Human-AI collaboration · 3 humans + 4 AI colleagues' } },     // 文档确证团队结构
];

// 三个关键词
const KEYWORDS: { icon: LucideIcon; title: Bilingual; body: Bilingual }[] = [
  { icon: BookOpen, title: { zh: '内容', en: 'Content' }, body: { zh: '把复杂问题看清楚、讲明白，形成战略判断和对外表达。', en: 'See complex problems clearly and explain them plainly, turning them into strategic judgment and outward expression.' } },
  { icon: Boxes, title: { zh: '工具', en: 'Tools' }, body: { zh: '把方法沉淀为流程、系统、模板、工作坊和 AI 应用。', en: 'Distill methods into processes, systems, templates, workshops, and AI applications.' } },
  { icon: HeartHandshake, title: { zh: '陪伴', en: 'Partnership' }, body: { zh: '陪客户把战略拆成任务、节奏和复盘机制，直到组织真正动起来。', en: 'Work alongside clients to break strategy into tasks, cadence, and review mechanisms—until the organization truly moves.' } },
];

// 与传统咨询的不同 (对比)
const CONTRAST: { traditional: Bilingual; yiyu: Bilingual }[] = [
  { traditional: { zh: '交付一份报告 / PPT 后离场', en: 'Deliver a report or deck, then walk away' }, yiyu: { zh: '成长合伙人，长期陪伴落地', en: 'A growth partner who stays to see it through' } },
  { traditional: { zh: '只做战略判断与宏观建议', en: 'Only strategic judgment and high-level advice' }, yiyu: { zh: '拆成项目、任务、节奏与责任', en: 'Broken into projects, tasks, cadence, and ownership' } },
  { traditional: { zh: '依赖客户团队或外部技术方落地', en: 'Relies on the client team or outside vendors to execute' }, yiyu: { zh: '从流程交付，走向应用交付', en: 'From process delivery to application delivery' } },
  { traditional: { zh: '一次性顾问关系', en: 'A one-off advisory relationship' }, yiyu: { zh: '在变化中持续校准方向', en: 'Continuously recalibrating direction as things change' } },
];

// 战略观 · 生产力组件
const PRODUCTIVITY: { era: Bilingual; desc: Bilingual }[] = [
  { era: { zh: '人 · 财 · 物', en: 'People · Capital · Materials' }, desc: { zh: '传统组织围绕人力、资金、物料配置资源。', en: 'Traditional organizations allocate resources around labor, capital, and materials.' } },
  { era: { zh: '＋ 数据', en: '+ Data' }, desc: { zh: '数据成为关键生产要素，驱动决策与运营。', en: 'Data becomes a key factor of production, driving decisions and operations.' } },
  { era: { zh: '＋ AI · API · 工具 · 自动化', en: '+ AI · APIs · Tools · Automation' }, desc: { zh: 'AI 专岗、MCP、Skill、开源项目、硬件接入成为新的生产力组件。', en: 'AI roles, MCP, skills, open-source projects, and hardware integration become new components of productivity.' } },
];

// 三大核心业务模块 (含输出物清单)
const SERVICES: { icon: LucideIcon; no: string; title: Bilingual; scene: Bilingual; outputs: Bilingual[] }[] = [
  {
    icon: TrendingUp,
    no: '01',
    title: { zh: '战略路径清晰化', en: 'Clarifying the Strategic Path' },
    scene: { zh: '组织进入新阶段、方向模糊、项目多但缺主线，或面临行业变化不知抓什么、舍什么。', en: 'The organization enters a new phase with an unclear direction, many projects but no through-line, or faces industry shifts without knowing what to pursue or drop.' },
    outputs: [
      { zh: '战略判断', en: 'Strategic judgment' },
      { zh: '阶段目标', en: 'Phase goals' },
      { zh: '优先级排序', en: 'Prioritization' },
      { zh: '关键项目组合', en: 'Key project portfolio' },
      { zh: '三年支持路径', en: 'Three-year support roadmap' },
      { zh: '行动方案', en: 'Action plan' },
    ],
  },
  {
    icon: Boxes,
    no: '02',
    title: { zh: '组织效能重构', en: 'Rebuilding Organizational Effectiveness' },
    scene: { zh: '团队忙碌但协作低效、岗位职责不清、会议多但决策质量不高、执行靠个人责任心支撑。', en: 'The team is busy but collaboration is inefficient, roles are unclear, meetings are frequent but decisions are weak, and execution rests on individual diligence.' },
    outputs: [
      { zh: '组织架构建议', en: 'Org structure recommendations' },
      { zh: '岗位职责', en: 'Role definitions' },
      { zh: '协作机制', en: 'Collaboration mechanisms' },
      { zh: '会议节奏', en: 'Meeting cadence' },
      { zh: 'OKR / 任务体系', en: 'OKR / task system' },
      { zh: '组织复盘机制', en: 'Organizational review mechanism' },
    ],
  },
  {
    icon: Cpu,
    no: '03',
    title: { zh: '数字化与 AI 落地赋能', en: 'Digital & AI Enablement' },
    scene: { zh: '资料多但难复用、工具堆叠却用不起来、想用 AI 却不知如何进入真实业务场景。', en: 'Plenty of material but hard to reuse, tools piled up but unused, eager to apply AI but unsure how to bring it into real business scenarios.' },
    outputs: [
      { zh: '客户工作台', en: 'Client workbench' },
      { zh: '数据中心', en: 'Data center' },
      { zh: '向量知识库', en: 'Vector knowledge base' },
      { zh: 'AI 问答', en: 'AI Q&A' },
      { zh: '任务与日程', en: 'Tasks & calendar' },
      { zh: 'AI 工作坊', en: 'AI workshops' },
      { zh: '自动化报告', en: 'Automated reports' },
    ],
  },
];

// 适合服务的客户类型
const AUDIENCES: { title: Bilingual; body: Bilingual }[] = [
  { title: { zh: '升级中的公益机构与基金会', en: 'Nonprofits & foundations leveling up' }, body: { zh: '希望从项目执行升级为战略型、系统型组织。', en: 'Aiming to evolve from project execution into a strategic, systematic organization.' } },
  { title: { zh: '平台型资方', en: 'Platform funders' }, body: { zh: '需要议题研究、资助策略与地方服务生态建设。', en: 'Need issue research, funding strategy, and local service-ecosystem building.' } },
  { title: { zh: '增长拐点期的商业组织', en: 'Businesses at a growth inflection point' }, body: { zh: '处在组织升级、品牌重构或数字化转型期。', en: 'In the midst of organizational upgrade, brand reinvention, or digital transformation.' } },
  { title: { zh: '战略慈善企业', en: 'Strategic philanthropy companies' }, body: { zh: '希望把公益、品牌、产品与社会价值结合起来。', en: 'Looking to integrate philanthropy, brand, product, and social value.' } },
  { title: { zh: '想真正用起 AI 的团队', en: 'Teams ready to truly put AI to work' }, body: { zh: '已意识到 AI 重要，但不知如何放进业务与协作。', en: 'Aware that AI matters, but unsure how to embed it into work and collaboration.' } },
];

// "可落地"典型问题对照
const PROBLEMS: { state: Bilingual; goal: Bilingual }[] = [
  { state: { zh: '战略想法很多，但方向不清、重心不明', en: 'Plenty of strategic ideas, but no clear direction or focus' }, goal: { zh: '形成清晰的阶段目标、优先级和关键成功标准', en: 'Clear phase goals, priorities, and success criteria' } },
  { state: { zh: '项目很多，但彼此割裂，难以形成整体影响力', en: 'Many projects, but disconnected, with little collective impact' }, goal: { zh: '重构项目组合，让项目服务于组织长期战略', en: 'A restructured portfolio where projects serve long-term strategy' } },
  { state: { zh: '团队很忙，但协作效率低，责任边界模糊', en: 'A busy team, but inefficient collaboration and blurred ownership' }, goal: { zh: '建立任务、会议、复盘和岗位之间的协作闭环', en: 'A closed loop across tasks, meetings, reviews, and roles' } },
  { state: { zh: '资料和经验很多，但散落在文件、聊天和个人脑中', en: 'Rich material and experience, scattered across files, chats, and people' }, goal: { zh: '用知识底座、向量检索与 AI 摘要沉淀组织资产', en: 'Organizational assets captured via a knowledge base, vector search, and AI summaries' } },
  { state: { zh: 'AI 热度很高，但不知道怎么真正用在业务里', en: 'High AI hype, but no idea how to actually use it in the business' }, goal: { zh: '从具体场景出发，把 AI 做成客户能用的"业务应用"', en: 'Starting from real scenarios, turning AI into business applications clients can use' } },
];

// 战略陪伴六步法
const STEPS: { title: Bilingual; desc: Bilingual }[] = [
  { title: { zh: '资料收集与现状梳理', en: 'Gather Material & Map the Status Quo' }, desc: { zh: '系统收集战略、项目、品牌、筹款财务、会议纪要等资料，建立对现状、目标、历史与信息缺口的整体理解。', en: 'Systematically collect strategy, project, brand, fundraising, finance, and meeting records to build a full picture of the current state, goals, history, and information gaps.' } },
  { title: { zh: '核心问题诊断', en: 'Diagnose the Core Problems' }, desc: { zh: '区分表面现象和真实卡点，判断问题属于战略、组织、项目、品牌、筹款、协作还是数字化层面，并给出优先级。', en: 'Separate surface symptoms from real bottlenecks, identify whether they are strategic, organizational, project, brand, fundraising, collaboration, or digital, and prioritize them.' } },
  { title: { zh: '战略方向对齐', en: 'Align on Strategic Direction' }, desc: { zh: '与核心团队对齐方向、阶段目标和关键成功标准，让组织内部形成可共同执行的基本共识。', en: 'Align with the core team on direction, phase goals, and success criteria, building a shared foundation the whole organization can execute on.' } },
  { title: { zh: '路径设计与方案拆解', en: 'Design the Path & Break It Down' }, desc: { zh: '把战略方向拆成可执行的路径、项目清单、角色分工、推进节奏和任务机制。', en: 'Translate strategic direction into an executable path: project lists, role assignments, cadence, and task mechanisms.' } },
  { title: { zh: '推进陪伴与过程校准', en: 'Accompany Execution & Recalibrate' }, desc: { zh: '围绕会议、任务、客户沟通和项目进展持续跟进，识别偏差、风险和新的卡点，及时调整。', en: 'Stay engaged around meetings, tasks, client communication, and project progress—spotting drift, risks, and new bottlenecks and adjusting in time.' } },
  { title: { zh: '复盘沉淀与迭代升级', en: 'Review, Distill & Iterate' }, desc: { zh: '把可复制的部分沉淀为手册、流程、培训内容、系统模板或下一阶段方案。', en: 'Capture the repeatable parts as handbooks, processes, training content, system templates, or the next phase plan.' } },
];

// 公益 × 商业双线
const DOMAINS: { icon: LucideIcon; tag: Bilingual; title: Bilingual; body: Bilingual; points: Bilingual[] }[] = [
  {
    icon: HeartHandshake,
    tag: { zh: '始于公益', en: 'Rooted in philanthropy' },
    title: { zh: '公益与社会创新', en: 'Philanthropy & Social Innovation' },
    body: { zh: '把社会问题、利益相关方、组织能力、项目机制、证据沉淀、筹款传播与长期影响力放在一起思考——从"项目做了什么"，转向"地方最终能留下什么"。', en: 'Considering social problems, stakeholders, organizational capacity, program mechanisms, evidence, fundraising, and long-term impact together—shifting from "what the project did" to "what is ultimately left behind in a place."' },
    points: [
      { zh: '战略与组织发展', en: 'Strategy & organizational development' },
      { zh: '项目设计与优化', en: 'Program design & optimization' },
      { zh: '基金会 / 资方策略', en: 'Foundation / funder strategy' },
      { zh: '公益品牌与传播', en: 'Nonprofit brand & communications' },
      { zh: 'AI 与数字化应用', en: 'AI & digital applications' },
    ],
  },
  {
    icon: TrendingUp,
    tag: { zh: '延展到商业', en: 'Extending to business' },
    title: { zh: '商业增长与战略慈善', en: 'Business Growth & Strategic Philanthropy' },
    body: { zh: '面向增长拐点、组织升级、数字化转型、品牌重构或战略慈善布局中的企业，把增长焦虑拆解为可判断、可执行、可复盘的问题。', en: 'For companies at a growth inflection, organizational upgrade, digital transformation, brand reinvention, or strategic philanthropy buildout—turning growth anxiety into problems that can be judged, executed, and reviewed.' },
    points: [
      { zh: '企业战略与增长路径', en: 'Corporate strategy & growth path' },
      { zh: '战略慈善与社会价值设计', en: 'Strategic philanthropy & social value design' },
      { zh: '组织协作与管理机制', en: 'Collaboration & management mechanisms' },
      { zh: 'AI 工作流与业务系统', en: 'AI workflows & business systems' },
      { zh: '品牌与内容策略', en: 'Brand & content strategy' },
    ],
  },
];

// 代表案例与在途项目
const CASES: { name: Bilingual; desc: Bilingual; ongoing?: boolean }[] = [
  { name: { zh: '蓝信封', en: 'Blue Envelope' }, desc: { zh: '乡村孩子书信陪伴、志愿者体系、月捐增长与伦理边界的长期战略陪伴。', en: 'Long-term strategic partnership on letter-based mentorship for rural children, the volunteer system, recurring-donation growth, and ethical boundaries.' } },
  { name: { zh: '日慈基金会', en: 'Rcich Foundation' }, desc: { zh: '儿童青少年心理健康三年战略陪伴，推动数字化团队与可复用方法形成。', en: 'A three-year strategic partnership on youth mental health, fostering a digital team and reusable methods.' } },
  { name: { zh: '中国乡村发展基金会', en: 'China Foundation for Rural Development' }, desc: { zh: '大型公益组织数字化启蒙工作坊，厘清信息化与数字化、业务重构与数字资产。', en: 'A digital-foundations workshop for a large nonprofit, clarifying informatization vs. digitalization and business redesign vs. digital assets.' } },
  { name: { zh: '云南儿童公益研究', en: 'Yunnan Children Philanthropy Study' }, desc: { zh: '从资方视角梳理需求、组织生态、点位差异与三年支持路径。', en: 'From a funder perspective, mapping needs, the organizational ecosystem, site differences, and a three-year support path.' } },
  { name: { zh: '善加公益基金会', en: 'Shanjia Foundation' }, desc: { zh: '组织发展、项目组合、人员结构与 AI/自动化运营的尽调与三年建议。', en: 'Due diligence and a three-year plan covering organizational development, project portfolio, staffing, and AI/automation operations.' } },
  { name: { zh: '校园足球公益项目', en: 'Campus Football Charity Program' }, desc: { zh: '山东、云南两地三年期项目，从预算、执行、赛事到过程监测的质量提升。', en: 'A three-year program across Shandong and Yunnan, raising quality from budgeting and execution to events and process monitoring.' } },
  { name: { zh: '贝石基金会', en: 'Beishi Foundation' }, desc: { zh: '家长读写行动手册、使用指南、专家核对、测试与推广策略的拆解与执行。', en: 'Breaking down and executing a parent literacy action handbook, user guide, expert review, testing, and rollout strategy.' } },
  { name: { zh: '为爱黔行', en: 'Journey for Love (Guizhou)' }, desc: { zh: '客户工作台、资料知识底座、战略诊断与品牌传播的系统化陪伴。', en: 'Systematic partnership on a client workbench, knowledge base, strategic diagnosis, and brand communications.' }, ongoing: true },
];

// 核心 AI 同事
const AIS: { name: Bilingual; dept: Bilingual; role: Bilingual }[] = [
  { name: { zh: '庆华', en: 'Qinghua' }, dept: { zh: '战略设计 / 咨询策略部', en: 'Strategy Design / Consulting Strategy' }, role: { zh: '战略问题讨论的信息管理员、结构化分析者与 AI CTO 式协调者。', en: 'Information steward, structured analyst, and AI-CTO-style coordinator for strategy discussions.' } },
  { name: { zh: '佳乐', en: 'Jiale' }, dept: { zh: '科技发展部', en: 'Technology Development' }, role: { zh: '技术路径探索、系统功能落地、开发协同与工具验证。', en: 'Exploring technical paths, shipping system features, coordinating development, and validating tools.' } },
  { name: { zh: '大周', en: 'Dazhou' }, dept: { zh: '信息数据部', en: 'Information & Data' }, role: { zh: '资料收集、信息分拣、数据整理与行业信号监测。', en: 'Material collection, information sorting, data organization, and industry-signal monitoring.' } },
  { name: { zh: '刘洁', en: 'Liu Jie' }, dept: { zh: '对外协作 / 客户服务部', en: 'External Collaboration / Client Service' }, role: { zh: '客户沟通、进度提醒、协作反馈与外部接口支持。', en: 'Client communication, progress reminders, collaboration feedback, and external interface support.' } },
];

// 合作方式
const COOPERATION: { icon: LucideIcon; title: Bilingual; body: Bilingual }[] = [
  { icon: CalendarDays, title: { zh: '年度战略陪伴', en: 'Annual Strategic Partnership' }, body: { zh: '以一年或三年为周期，持续陪伴战略梳理、组织优化、项目推进与复盘迭代。', en: 'On a one- or three-year cycle, an ongoing partnership across strategy, organizational optimization, project execution, and review.' } },
  { icon: Sparkles, title: { zh: '战略梳理 AI 工作坊', en: 'Strategy AI Workshop' }, body: { zh: '资料梳理 + 机构共创 + 人工判断 + 系统报告，快速形成组织表达、议题地图与行动建议。', en: 'Material review + co-creation + human judgment + system-generated report, quickly producing organizational messaging, an issue map, and action recommendations.' } },
  { icon: ClipboardCheck, title: { zh: '组织诊断与发展建议', en: 'Organizational Diagnosis & Recommendations' }, body: { zh: '结合资料、访谈与内部诊断，形成资方或管理层可判断的组织发展建议。', en: 'Combining materials, interviews, and internal diagnosis into development recommendations funders or leadership can act on.' } },
  { icon: Cpu, title: { zh: '数字化与 AI 应用共创', en: 'Digital & AI Co-Creation' }, body: { zh: '围绕客户工作台、知识库、任务复盘、会议流、自动化报告进行定制化共创。', en: 'Custom co-creation around the client workbench, knowledge base, task reviews, meeting flows, and automated reports.' } },
  { icon: Megaphone, title: { zh: '品牌传播与内容产品', en: 'Brand Communications & Content' }, body: { zh: '围绕品牌定位、传播策略、筹款表达、手册、课程与信息图进行设计与交付。', en: 'Design and delivery across brand positioning, communications strategy, fundraising messaging, handbooks, courses, and infographics.' } },
];

export function AboutPage({ onNavigate }: AboutPageProps) {
  const { t } = useLang();
  const go = (page: string) => onNavigate?.(page);

  return (
    <div {...getYiyuPageAttrs('about')} className="min-h-screen bg-os-canvas">
      <Header onNavigate={(page) => go(page)} />

      {/* ① Hero */}
      <section className="relative pt-32 pb-16 sm:pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden bg-os-canvas">
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          <div className="absolute top-[-15%] left-[8%] w-[40%] h-[60%] rounded-full bg-os-navy/[0.05] blur-[120px]" />
          <div className="absolute top-[-10%] right-[10%] w-[35%] h-[55%] rounded-full bg-os-blue/[0.06] blur-[120px]" />
        </div>
        <div className="max-w-[1100px] mx-auto relative z-10">
          <Reveal>
            <div className="text-center max-w-4xl mx-auto">
              <div className="flex items-center justify-center gap-2.5 mb-6">
                <span className="h-px w-7 bg-os-blue/70" />
                <span className="text-[12px] font-semibold tracking-[0.2em] text-os-blue">{t({ zh: '关于益语智库', en: 'About Yiyu Institute' })}</span>
                <span className="h-px w-7 bg-os-blue/70" />
              </div>
              <h1 className="font-serif-display text-[36px] sm:text-[50px] lg:text-[58px] font-semibold leading-[1.18] tracking-tight text-os-navy">
                {t({ zh: '可落地的增长咨询，', en: 'Growth consulting that actually lands—' })}
                <br />
                <span className="text-ink-accent">{t({ zh: '助力组织持续增长的战略陪伴者', en: 'a strategic partner for sustained organizational growth' })}</span>
              </h1>
              <p className="mt-7 text-[16px] sm:text-[18px] leading-[1.85] text-os-muted max-w-3xl mx-auto">
                {t({ zh: '益语智库是一家兼具战略洞察、组织设计、公益与商业理解、数字化与 AI 落地能力的战略陪伴机构。我们不把战略理解为一份报告，而是陪客户把方向变成机制、把机制变成行动、把行动沉淀为组织能力。', en: 'Yiyu Institute is a strategic-partnership firm combining strategic insight, organizational design, an understanding of both philanthropy and business, and the ability to put digital and AI tools to work. We treat strategy not as a report, but as a journey alongside clients—turning direction into mechanisms, mechanisms into action, and action into lasting organizational capability.' })}
              </p>
              <div className="mt-10 flex flex-col sm:flex-row gap-4 items-center justify-center">
                <Button variant="primary" withArrow onClick={() => go('consult-apply')}>
                  {t({ zh: '申请深度战略陪伴', en: 'Apply for a strategic partnership' })}
                </Button>
                <Button variant="secondary" withArrow onClick={() => go('workbench')}>
                  {t({ zh: '了解益语智库 AI', en: 'Explore Yiyu AI' })}
                </Button>
              </div>
            </div>
          </Reveal>

          {/* 数据背书条 (⚠️ 含 TODO 占位数字, 上线前替换) */}
          <Reveal delay={120}>
            <div className="mt-14 grid grid-cols-2 lg:grid-cols-4 gap-px overflow-hidden rounded-[20px] bg-os-line ring-1 ring-os-line">
              {STATS.map((s) => (
                <div key={s.label.zh} className="bg-os-paper px-5 py-7 text-center">
                  <div className="font-serif-display text-[32px] sm:text-[40px] font-semibold leading-none text-os-navy">
                    {s.value}
                  </div>
                  <div className="mt-2.5 text-[12.5px] leading-5 text-os-muted">{t(s.label)}</div>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ② 我们是谁 */}
      <Section id="about-who" tone="paper">
        <Container>
          <Reveal>
            <SectionHeading
              eyebrow={t({ zh: '我们是谁', en: 'Who We Are' })}
              title={t({ zh: '始于公益，但不止公益', en: 'Rooted in philanthropy, but reaching beyond it' })}
              subtitle={t({ zh: '益语始于公益慈善、社会创新与教育，并把这里对使命、利益相关方、组织能力的深层理解，转化为服务商业组织、社会企业与企业社会责任项目的战略方法。', en: 'Yiyu began in philanthropy, social innovation, and education—and turns the deep understanding of mission, stakeholders, and organizational capacity gained there into strategic methods that serve businesses, social enterprises, and CSR programs.' })}
            />
          </Reveal>
          <Reveal>
            <div className="mt-10 max-w-3xl mx-auto rounded-[20px] bg-os-canvas/70 ring-1 ring-os-line p-7 sm:p-8">
              <p className="text-[15px] sm:text-[16px] leading-[1.95] text-os-muted">
                {t({ zh: '与传统咨询公司不同，益语不是只输出报告、PPT 或一次工作坊，而更像客户身边的', en: 'Unlike a traditional consulting firm, Yiyu does not just hand over a report, a deck, or a one-off workshop—we are more like a' })}
                <span className="text-os-navy font-semibold">{t({ zh: '成长合伙人', en: ' growth partner ' })}</span>
                {t({ zh: '：前期帮客户完成资料梳理与问题诊断，中期共创战略路径与组织机制，后期持续陪伴落地，并把经验沉淀为组织可以反复使用的能力。', en: 'at the client\'s side: first mapping materials and diagnosing problems, then co-creating the strategic path and organizational mechanisms, and finally staying through execution while distilling experience into capabilities the organization can reuse.' })}
              </p>
            </div>
          </Reveal>
          <div className="mt-10 grid sm:grid-cols-3 gap-5 lg:gap-6">
            {KEYWORDS.map((k, i) => {
              const Icon = k.icon;
              return (
                <Reveal key={k.title.zh} delay={i * 80} className="h-full">
                  <div className={`${CARD} h-full p-6 sm:p-7`}>
                    <div className="w-12 h-12 rounded-[14px] bg-os-indigo/10 text-os-indigo flex items-center justify-center mb-5 feature-motion-icon">
                      <Icon className="w-[22px] h-[22px]" strokeWidth={1.7} />
                    </div>
                    <h3 className="font-serif-display text-[20px] font-semibold text-os-navy mb-2.5">{t(k.title)}</h3>
                    <p className="text-[14px] leading-[1.85] text-os-muted">{t(k.body)}</p>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </Container>
      </Section>

      {/* 与传统咨询的不同 (对比) */}
      <Section id="about-different" tone="canvas">
        <Container>
          <Reveal>
            <SectionHeading
              eyebrow={t({ zh: '与传统咨询的不同', en: 'How We Differ' })}
              title={t({ zh: '不是交一份报告就离场，而是成长合伙人', en: 'Not a report-and-leave consultant, but a growth partner' })}
              subtitle={t({ zh: '从「流程交付」走向「应用交付」——把看透的场景、讲清的路径、设计好的机制，真正做成组织能用的产品与系统。', en: 'From process delivery to application delivery—turning the scenarios we understand, the paths we clarify, and the mechanisms we design into products and systems the organization can actually use.' })}
            />
          </Reveal>
          <div className="mt-12 max-w-3xl mx-auto overflow-hidden rounded-[20px] ring-1 ring-os-line">
            <div className="grid grid-cols-2 bg-os-paper text-[12px] font-semibold tracking-[0.08em]">
              <div className="px-5 py-3.5 text-os-muted/70 border-b border-os-line">{t({ zh: '传统咨询', en: 'Traditional consulting' })}</div>
              <div className="px-5 py-3.5 text-os-navy border-b border-l border-os-line bg-os-mist/40">{t({ zh: '益语智库', en: 'Yiyu Institute' })}</div>
            </div>
            {CONTRAST.map((c, i) => (
              <Reveal key={c.yiyu.zh} delay={i * 60}>
                <div className="grid grid-cols-2 text-[13.5px] leading-[1.6]">
                  <div className="px-5 py-4 text-os-muted/75 border-b border-os-line bg-os-paper">{t(c.traditional)}</div>
                  <div className="px-5 py-4 text-os-ink font-medium border-b border-l border-os-line bg-os-mist/25">
                    <span className="inline-flex items-start gap-2">
                      <ArrowRight className="mt-1 h-3.5 w-3.5 shrink-0 text-os-indigo" />
                      {t(c.yiyu)}
                    </span>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </Container>
      </Section>

      {/* 战略观 · 生产力方式的重新组合 (深色, 思想权威) */}
      <Section id="about-strategy-view" tone="navy">
        <Container>
          <Reveal>
            <div className="text-center max-w-3xl mx-auto">
              <div className="flex items-center justify-center gap-2.5 mb-6">
                <span className="h-px w-7 bg-os-spark/70" />
                <span className="text-[12px] font-semibold tracking-[0.18em] text-os-spark">{t({ zh: '我们如何理解战略', en: 'How We See Strategy' })}</span>
                <span className="h-px w-7 bg-os-spark/70" />
              </div>
              <h2 className="font-serif-display text-[28px] sm:text-[36px] lg:text-[42px] font-semibold leading-[1.3] tracking-tight text-white">
                {t({ zh: '战略的本质，是对最佳', en: 'At its core, strategy is the orchestration of the best ' })}<span className="text-os-spark">{t({ zh: '生产力方式', en: 'modes of productivity' })}</span>{t({ zh: '的排列组合', en: '' })}
              </h2>
              <p className="mt-6 text-[15px] sm:text-[16px] leading-[1.85] text-white/70">
                {t({ zh: '组织不再只是设计「人如何做流程」，而要重新设计人、数据、机器、工具、流程、组织协同如何共同完成复杂任务——人回到判断、连接、创造与关键决策上。', en: 'Organizations no longer just design "how people run processes"—they must redesign how people, data, machines, tools, processes, and collaboration together accomplish complex work, so people can return to judgment, connection, creation, and key decisions.' })}
              </p>
            </div>
          </Reveal>
          <div className="mt-14 grid sm:grid-cols-3 gap-4 lg:gap-5">
            {PRODUCTIVITY.map((p, i) => (
              <Reveal key={p.era.zh} delay={i * 90} className="h-full">
                <div className="relative h-full rounded-[18px] bg-white/[0.05] ring-1 ring-white/10 p-6">
                  <div className="text-[11px] font-semibold tracking-[0.16em] text-white/40">{t({ zh: `阶段 ${i + 1}`, en: `Stage ${i + 1}` })}</div>
                  <div className="mt-3 font-serif-display text-[20px] font-semibold text-white leading-snug">{t(p.era)}</div>
                  <p className="mt-3 text-[13px] leading-[1.8] text-white/65">{t(p.desc)}</p>
                  {i < PRODUCTIVITY.length - 1 && (
                    <ArrowRight className="hidden sm:block absolute top-1/2 -right-[14px] -translate-y-1/2 h-5 w-5 text-os-spark/50 z-10" />
                  )}
                </div>
              </Reveal>
            ))}
          </div>
        </Container>
      </Section>

      {/* 三大核心业务模块 (含输出物清单) */}
      <Section id="about-services" tone="paper">
        <Container>
          <Reveal>
            <SectionHeading
              eyebrow={t({ zh: '三大核心业务', en: 'Three Core Services' })}
              title={t({ zh: '把战略判断，拆成组织能用的交付', en: 'Turning strategic judgment into deliverables an organization can use' })}
              subtitle={t({ zh: '每一项业务都对应明确的输出物——不是观点，而是组织可以反复使用的机制与系统。', en: 'Each service maps to concrete outputs—not opinions, but mechanisms and systems the organization can reuse.' })}
            />
          </Reveal>
          <div className="mt-12 grid lg:grid-cols-3 gap-5 lg:gap-6">
            {SERVICES.map((s, i) => {
              const Icon = s.icon;
              return (
                <Reveal key={s.title.zh} delay={i * 90} className="h-full">
                  <div className={`${CARD} h-full p-7 flex flex-col`}>
                    <div className="flex items-center justify-between mb-5">
                      <div className="w-12 h-12 rounded-[14px] bg-os-indigo/10 text-os-indigo flex items-center justify-center feature-motion-icon">
                        <Icon className="w-[22px] h-[22px]" strokeWidth={1.7} />
                      </div>
                      <span className="font-serif-display text-[34px] font-bold leading-none text-os-indigo/15">{s.no}</span>
                    </div>
                    <h3 className="font-serif-display text-[20px] font-semibold text-os-navy mb-2.5">{t(s.title)}</h3>
                    <p className="text-[13.5px] leading-[1.8] text-os-muted">{t(s.scene)}</p>
                    <div className="mt-5 pt-5 border-t border-os-line">
                      <div className="text-[11px] font-semibold tracking-[0.12em] text-os-muted/60 mb-2.5">{t({ zh: '交付输出', en: 'Deliverables' })}</div>
                      <div className="flex flex-wrap gap-1.5">
                        {s.outputs.map((o) => (
                          <span key={o.zh} className="inline-flex items-center rounded-full bg-os-mist ring-1 ring-os-line px-2.5 py-1 text-[12px] text-os-navy/80">
                            {t(o)}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </Container>
      </Section>

      {/* ③ 可落地 = 典型问题对照 */}
      <Section id="about-landable" tone="canvas">
        <Container>
          <Reveal>
            <SectionHeading
              eyebrow={t({ zh: '核心定位 · 可落地的增长咨询', en: 'Our Core Promise · Growth Consulting That Lands' })}
              title={t({ zh: '“可落地”，是益语最重要的承诺', en: '"Actionable" is Yiyu\'s most important promise' })}
              subtitle={t({ zh: '咨询成果不能停留在漂亮的观点里，而要进入组织架构、岗位职责、项目设计、会议节奏、数据系统和日常任务。', en: 'Consulting results cannot stay as elegant ideas—they must enter org structure, roles, project design, meeting cadence, data systems, and everyday tasks.' })}
            />
          </Reveal>
          <div className="mt-12 max-w-3xl mx-auto space-y-3">
            <Reveal>
              <div className="grid grid-cols-[1fr_auto_1fr] gap-3 sm:gap-5 px-5 pb-1 text-[11px] font-semibold tracking-[0.14em] text-os-muted/60">
                <span>{t({ zh: '客户常见状态', en: 'Common client situation' })}</span>
                <span className="w-4" />
                <span className="text-os-indigo/80">{t({ zh: '益语介入后', en: 'After Yiyu steps in' })}</span>
              </div>
            </Reveal>
            {PROBLEMS.map((p, i) => (
              <Reveal key={p.state.zh} delay={i * 60}>
                <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-5 rounded-[16px] bg-os-paper ring-1 ring-os-line p-5 transition-shadow duration-300 hover:shadow-os">
                  <p className="text-[14px] leading-[1.7] text-os-muted">{t(p.state)}</p>
                  <ArrowRight className="hidden sm:block w-4 h-4 text-os-indigo/55 mx-auto shrink-0" />
                  <p className="text-[14px] leading-[1.7] text-os-navy font-medium">{t(p.goal)}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </Container>
      </Section>

      {/* ④ 战略陪伴六步法（深蓝重音） */}
      <Section id="about-method" tone="navy">
        <Container>
          <Reveal>
            <div className="text-center max-w-3xl mx-auto">
              <div className="flex items-center justify-center gap-2.5 mb-6">
                <span className="h-px w-7 bg-os-spark/70" />
                <span className="text-[12px] font-semibold tracking-[0.18em] text-os-spark">{t({ zh: '战略陪伴六步法', en: 'Our Six-Step Method' })}</span>
                <span className="h-px w-7 bg-os-spark/70" />
              </div>
              <h2 className="font-serif-display text-[28px] sm:text-[36px] lg:text-[42px] font-semibold leading-[1.32] tracking-tight text-white">
                {t({ zh: '不是做完一份方案就离场', en: "We don't finish a plan and walk away" })}
              </h2>
              <p className="mt-6 text-[15px] sm:text-[16px] leading-[1.85] text-white/70">
                {t({ zh: '而是陪客户把方向真正变成行动，把共识真正变成结果——持续看清变化、识别真正卡点、校准优先级。', en: 'We stay with clients to turn direction into action and consensus into results—continually reading change, spotting the real bottlenecks, and recalibrating priorities.' })}
              </p>
            </div>
          </Reveal>
          <div className="mt-14 grid sm:grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-6">
            {STEPS.map((s, i) => (
              <Reveal key={s.title.zh} delay={(i % 3) * 80} className="h-full">
                <div className="h-full rounded-[18px] bg-white/[0.04] ring-1 ring-white/10 p-6 transition-colors duration-300 hover:bg-white/[0.07]">
                  <span className="font-serif-display text-[30px] font-bold leading-none text-os-spark">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <h3 className="mt-4 text-[16px] font-semibold text-white">{t(s.title)}</h3>
                  <p className="mt-2.5 text-[13px] leading-[1.85] text-white/65">{t(s.desc)}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </Container>
      </Section>

      {/* ⑤ 公益 × 商业双线 */}
      <Section id="about-domains" tone="paper">
        <Container>
          <Reveal>
            <SectionHeading
              eyebrow={t({ zh: '两条业务线', en: 'Two Practice Lines' })}
              title={t({ zh: '始于公益的理解，延展到商业增长', en: 'From a philanthropic foundation to business growth' })}
            />
          </Reveal>
          <div className="mt-12 grid lg:grid-cols-2 gap-5 lg:gap-6">
            {DOMAINS.map((d, i) => {
              const Icon = d.icon;
              return (
                <Reveal key={d.title.zh} delay={i * 90} className="h-full">
                  <div className={`${CARD} h-full p-7 sm:p-8 flex flex-col`}>
                    <div className="flex items-center gap-3 mb-5">
                      <div className="w-12 h-12 rounded-[14px] bg-os-indigo/10 text-os-indigo flex items-center justify-center feature-motion-icon">
                        <Icon className="w-[22px] h-[22px]" strokeWidth={1.7} />
                      </div>
                      <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-os-indigo/70">{t(d.tag)}</span>
                    </div>
                    <h3 className="font-serif-display text-[21px] sm:text-[23px] font-semibold text-os-navy mb-3">{t(d.title)}</h3>
                    <p className="text-[14px] leading-[1.85] text-os-muted">{t(d.body)}</p>
                    <div className="mt-5 pt-5 border-t border-os-line flex flex-wrap gap-2">
                      {d.points.map((pt) => (
                        <span key={pt.zh} className="inline-flex items-center rounded-full bg-os-mist ring-1 ring-os-line px-3 py-1.5 text-[12.5px] text-os-navy/80">
                          {t(pt)}
                        </span>
                      ))}
                    </div>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </Container>
      </Section>

      {/* 客户 logo 墙 (灰度→彩色 + 科技点阵底纹, 接 case_showcases 真实数据) */}
      <ClientLogoWall />

      {/* ⑥ 代表案例与在途项目 */}
      <Section id="about-cases" tone="canvas">
        <Container>
          <Reveal>
            <SectionHeading
              eyebrow={t({ zh: '代表案例与在途项目', en: 'Selected & Ongoing Work' })}
              title={t({ zh: '不是只完成一次交付，而是重构机制、沉淀方法', en: 'Not a single delivery, but rebuilt mechanisms and distilled methods' })}
            />
          </Reveal>
          <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {CASES.map((c, i) => (
              <Reveal key={c.name.zh} delay={(i % 4) * 70} className="h-full">
                <div className={`${CARD} h-full p-6`}>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <h3 className="font-serif-display text-[17px] font-semibold text-os-navy">{t(c.name)}</h3>
                    {c.ongoing && (
                      <span className="shrink-0 inline-flex items-center rounded-full bg-os-spark/12 px-2.5 py-0.5 text-[11px] font-semibold text-os-spark">{t({ zh: '在途', en: 'Ongoing' })}</span>
                    )}
                  </div>
                  <p className="text-[13px] leading-[1.8] text-os-muted">{t(c.desc)}</p>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal>
            <p className="mt-8 text-center text-[12px] text-os-muted/55">{t({ zh: '部分项目仍在持续陪伴与迭代中。', en: 'Some projects remain in active partnership and iteration.' })}</p>
          </Reveal>
        </Container>
      </Section>

      {/* ⑦ 团队：人机协作 */}
      <Section id="about-team" tone="paper">
        <Container>
          <Reveal>
            <SectionHeading
              eyebrow={t({ zh: '团队 · 人机协作', en: 'Team · Human-AI Collaboration' })}
              title={t({ zh: '三位人类同事，四位 AI 同事', en: 'Three human colleagues, four AI colleagues' })}
              subtitle={t({ zh: '我们不把 AI 当作替代人的工具，而是设置为组织中的协作岗位——人类专注判断、关系、定向与关键决策，AI 同事承担信息处理、技术推进、资料分析与外部协作。', en: 'We treat AI not as a tool to replace people, but as collaborative roles within the organization—humans focus on judgment, relationships, direction, and key decisions, while AI colleagues handle information processing, technical execution, data analysis, and external coordination.' })}
            />
          </Reveal>

          {/* 顾源源 featured */}
          <Reveal>
            <div className={`${CARD} mt-12 p-7 sm:p-9 flex flex-col sm:flex-row gap-6 sm:gap-8`}>
              <div className="shrink-0 flex sm:block items-center gap-4">
                <div className="w-[68px] h-[68px] rounded-[20px] bg-os-navy text-white font-serif-display text-[28px] font-semibold flex items-center justify-center">
                  {t({ zh: '顾', en: 'G' })}
                </div>
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <h3 className="font-serif-display text-[22px] font-semibold text-os-navy">{t({ zh: '顾源源', en: 'Gu Yuanyuan' })}</h3>
                  <span className="text-[13px] text-os-indigo font-medium">{t({ zh: '首席战略专家 · 核心决策者', en: 'Chief Strategy Expert · Lead Decision-Maker' })}</span>
                </div>
                <p className="mt-3 text-[14px] leading-[1.9] text-os-muted">
                  {t({ zh: '颗粒公益传播发展中心创始人，福布斯 30 位 30 岁以下创业精英。长期深耕公益品牌建设、战略设计、内容传播与组织赋能，曾为 60 余家企业、基金会及公益组织提供系统性战略设计与落地陪伴，近年持续探索 AI 在咨询、传播、组织协作与数字化流程中的应用。', en: 'Founder of the Granular Philanthropy Communication & Development Center and a Forbes 30 Under 30 honoree. With deep experience in nonprofit branding, strategy design, content communications, and organizational enablement, Gu has provided systematic strategy and hands-on partnership to more than 60 companies, foundations, and nonprofits, and in recent years has continually explored applying AI across consulting, communications, collaboration, and digital workflows.' })}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {([
                    { zh: '《创建一个公益品牌》', en: 'Building a Nonprofit Brand' },
                    { zh: '《学习型组织笔记》', en: 'Notes on the Learning Organization' },
                    { zh: '《创业者需要回答的 51 个问题》', en: '51 Questions Every Founder Should Answer' },
                  ] as Bilingual[]).map((bk) => (
                    <span key={bk.zh} className="inline-flex items-center rounded-full bg-os-mist ring-1 ring-os-line px-3 py-1 text-[12px] text-os-navy/80">
                      {t(bk)}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </Reveal>

          {/* 林佳维 + 乐乐 */}
          <div className="mt-5 grid sm:grid-cols-2 gap-5 lg:gap-6">
            {[
              { initial: '林', name: '林佳维', role: '项目推进与技术落地负责人', desc: '承担技术开发、技术攻关与系统落地，把战略设想转化为可验证的产品与系统。' },
              { initial: '乐', name: '乐乐', role: '客户协同与项目节奏负责人', desc: '负责客户对接、进度跟踪、协作统筹与交付把控，保障复杂项目稳定推进。' },
            ].map((m, i) => (
              <Reveal key={m.name} delay={i * 80} className="h-full">
                <div className={`${CARD} h-full p-6 sm:p-7 flex items-start gap-5`}>
                  <div className="shrink-0 w-[52px] h-[52px] rounded-[16px] bg-os-navy/85 text-white font-serif-display text-[22px] font-semibold flex items-center justify-center">
                    {m.initial}
                  </div>
                  <div>
                    <h3 className="font-serif-display text-[18px] font-semibold text-os-navy">{m.name}</h3>
                    <div className="text-[12.5px] text-os-indigo font-medium mt-0.5">{m.role}</div>
                    <p className="mt-2.5 text-[13.5px] leading-[1.8] text-os-muted">{m.desc}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>

          {/* AI 同事 */}
          <Reveal>
            <div className="mt-12 flex items-center gap-3">
              <span className="text-[12px] font-semibold tracking-[0.16em] text-os-violet">核心 AI 同事</span>
              <span className="h-px flex-1 bg-os-line" />
            </div>
          </Reveal>
          <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5">
            {AIS.map((a, i) => (
              <Reveal key={a.name.zh} delay={(i % 4) * 70} className="h-full">
                <div className={`${CARD} h-full p-6`}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-11 h-11 rounded-[13px] bg-os-violet/12 text-os-violet flex items-center justify-center feature-motion-icon">
                      <Bot className="w-5 h-5" strokeWidth={1.7} />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-serif-display text-[17px] font-semibold text-os-navy leading-tight">{t(a.name)}</h3>
                      <div className="text-[11px] text-os-violet/80 mt-0.5 truncate">{t(a.dept)}</div>
                    </div>
                  </div>
                  <p className="text-[12.5px] leading-[1.8] text-os-muted">{t(a.role)}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </Container>
      </Section>

      {/* 适合服务的客户 */}
      <Section id="about-audience" tone="canvas">
        <Container>
          <Reveal>
            <SectionHeading
              eyebrow="适合服务的客户"
              title="我们最常陪伴这五类组织"
            />
          </Reveal>
          <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {AUDIENCES.map((a, i) => (
              <Reveal key={a.title.zh} delay={(i % 3) * 70} className="h-full">
                <div className={`${CARD} h-full p-6 flex items-start gap-4`}>
                  <span className="shrink-0 font-serif-display text-[22px] font-bold leading-none text-os-indigo/30 mt-0.5">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div>
                    <h3 className="font-serif-display text-[16.5px] font-semibold text-os-navy leading-snug">{t(a.title)}</h3>
                    <p className="mt-2 text-[13px] leading-[1.8] text-os-muted">{t(a.body)}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </Container>
      </Section>

      {/* ⑧ 合作方式 + 联系 */}
      <Section id="about-cooperation" tone="paper">
        <Container>
          <Reveal>
            <SectionHeading eyebrow="合作方式" title="从一次轻量的组织诊断开始" />
          </Reveal>
          <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {COOPERATION.map((c, i) => {
              const Icon = c.icon;
              return (
                <Reveal key={c.title.zh} delay={(i % 3) * 70} className="h-full">
                  <div className={`${CARD} h-full p-6`}>
                    <div className="w-11 h-11 rounded-[13px] bg-os-indigo/10 text-os-indigo flex items-center justify-center mb-4 feature-motion-icon">
                      <Icon className="w-5 h-5" strokeWidth={1.7} />
                    </div>
                    <h3 className="font-serif-display text-[17px] font-semibold text-os-navy mb-2">{t(c.title)}</h3>
                    <p className="text-[13px] leading-[1.8] text-os-muted">{t(c.body)}</p>
                  </div>
                </Reveal>
              );
            })}
          </div>

          {/* 联系 + CTA */}
          <Reveal>
            <div className="mt-14 rounded-[24px] bg-os-paper ring-1 ring-os-line p-8 sm:p-10 grid lg:grid-cols-[1.1fr_1fr] gap-8 items-center">
              <div>
                <h3 className="font-serif-display text-[22px] sm:text-[24px] font-semibold text-os-navy">和我们聊聊你的组织</h3>
                <p className="mt-3 text-[14px] leading-[1.85] text-os-muted">
                  如果你正在梳理组织方向、推进战略落地，或想评估团队协作与数字化，我们可以先从一次轻量诊断开始——不收费、不承诺，先把问题聊清楚。
                </p>
                <div className="mt-7 flex flex-wrap gap-3">
                  <Button variant="primary" withArrow onClick={() => go('consult-apply')}>
                    申请深度战略陪伴
                  </Button>
                  <Button variant="ghost" withArrow onClick={() => go('workbench')}>
                    先逛逛益语智库 AI
                  </Button>
                </div>
              </div>
              <div className="space-y-3">
                <a href={`tel:${SITE_CONTACT_PHONE}`} data-yiyu-contact="phone" className="flex items-center gap-4 p-4 bg-os-canvas/70 rounded-[14px] ring-1 ring-os-line hover:ring-os-navy/30 transition-[box-shadow,border-color] duration-300">
                  <div className="w-10 h-10 rounded-[11px] bg-os-mist text-os-navy flex items-center justify-center"><Phone className="w-[18px] h-[18px]" /></div>
                  <div><p className="text-[11.5px] text-os-muted/70">联系电话</p><p className="font-semibold text-[14px] text-os-navy">{SITE_CONTACT_PHONE}</p></div>
                </a>
                <a href={`mailto:${SITE_CONTACT_EMAIL}`} data-yiyu-contact="email" className="flex items-center gap-4 p-4 bg-os-canvas/70 rounded-[14px] ring-1 ring-os-line hover:ring-os-navy/30 transition-[box-shadow,border-color] duration-300">
                  <div className="w-10 h-10 rounded-[11px] bg-os-mist text-os-navy flex items-center justify-center"><Mail className="w-[18px] h-[18px]" /></div>
                  <div><p className="text-[11.5px] text-os-muted/70">联系邮箱</p><p className="font-semibold text-[14px] text-os-navy">{SITE_CONTACT_EMAIL}</p></div>
                </a>
                <div data-yiyu-contact="wechat" className="flex items-center gap-4 p-4 bg-os-canvas/70 rounded-[14px] ring-1 ring-os-line">
                  <div className="w-10 h-10 rounded-[11px] bg-os-mist text-os-navy flex items-center justify-center"><QrCode className="w-[18px] h-[18px]" /></div>
                  <div><p className="text-[11.5px] text-os-muted/70">微信公众号</p><p className="font-semibold text-[14px] text-os-navy">{SITE_WECHAT_OFFICIAL}</p></div>
                </div>
              </div>
            </div>
          </Reveal>
        </Container>
      </Section>

      <OpenSourceFooter />
    </div>
  );
}

export default AboutPage;
