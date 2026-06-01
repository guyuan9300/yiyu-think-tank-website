import { useState } from 'react';
import { Compass, Building2, Cpu, HeartHandshake, TrendingUp, Library, ArrowUpRight } from 'lucide-react';
import { Container, Section, Button, Reveal } from '../ui';
import { ValueDrawer, type ValueDetail } from './ValueDrawer';
import { useLang, type Bilingual } from '../../../lib/i18n';

// ============================================================
// 关于益语智库 · 价值全景 — 插在 Manifesto 与 QuoteBand 之间。
//
// 内容取自《益语智库介绍文档·详细版》: 前 3 张 = 文档"三大核心业务模块"
// (战略路径清晰化 / 组织效能重构 / 数字化与 AI 落地), 后 3 张展现
// 公益 × 商业双线 + 内容工具体系的广度。
//
// 每张卡可点开 ValueDrawer 看详情 (信号 / 做法 / 产出 / AI 承接), 内容均来自文档。
// 视觉沿用 Features 同源 .feature-motion-card 精品卡 (lavender 底 + 紫罗兰系 + 持久 ↗)。
// ============================================================

const CONSULT = '?page=consult-apply';
const WORKBENCH = '?page=workbench';

const VALUES: (ValueDetail & { body: Bilingual })[] = [
  {
    num: '01',
    icon: Compass,
    title: { zh: '战略路径清晰化', en: 'Clarifying the Strategic Path' },
    body: { zh: '把模糊方向，变成 3 年愿景 + 1 年关键任务 + 季度落地动作。', en: 'Turn a vague direction into a 3-year vision, 1-year key tasks, and quarterly actions.' },
    essence: { zh: '组织进入新阶段、方向模糊、项目缺主线时，把方向收敛成清晰、对齐、能落地的路径。', en: 'When an organization enters a new phase with a blurry direction and projects lacking a through-line, we converge it into a clear, aligned, executable path.' },
    signals: [
      { zh: '进入新阶段，方向模糊、重心不明', en: 'Entering a new phase with an unclear direction and focus' },
      { zh: '项目很多，却缺少一条贯穿的主线', en: 'Many projects, but no connecting through-line' },
      { zh: '行业在变，不知道该抓什么、舍什么', en: 'The industry is shifting, and it is unclear what to pursue or drop' },
    ],
    approach: { zh: '从外部趋势、内部资源、核心问题、利益相关方与长期使命出发，收敛方向与取舍，拆成「3 年愿景 + 1 年关键任务 + 季度落地动作」，并定义清楚"怎么算成功"。', en: 'Starting from external trends, internal resources, core problems, stakeholders, and long-term mission, we converge direction and trade-offs into a 3-year vision, 1-year key tasks, and quarterly actions — and define clearly what success looks like.' },
    outputs: [
      { zh: '战略判断', en: 'Strategic judgment' },
      { zh: '阶段目标', en: 'Phase goals' },
      { zh: '优先级排序', en: 'Prioritization' },
      { zh: '关键项目组合', en: 'Key project portfolio' },
      { zh: '三年支持路径', en: 'Three-year support path' },
      { zh: '行动方案', en: 'Action plan' },
    ],
    aiNote: { zh: '方向、目标与项目组合沉淀在客户工作台同一张画布上，AI 回到项目背景帮你起草、对齐与复盘——不是开完一次会就丢。', en: 'Direction, goals, and project portfolio live on one canvas in the client workspace. AI returns to that context to help you draft, align, and review — not something thrown away after a single meeting.' },
    cta: { label: { zh: '申请深度战略陪伴', en: 'Apply for Deep Strategy Companionship' }, href: CONSULT },
  },
  {
    num: '02',
    icon: Building2,
    title: { zh: '组织效能重构', en: 'Rebuilding Organizational Effectiveness' },
    body: { zh: '让角色、机制、会议与复盘节奏，支撑战略被组织真正承接。', en: 'Align roles, mechanisms, meetings, and review rhythms so the organization can truly carry the strategy.' },
    essence: { zh: '团队很忙却协作低效、责任边界模糊时，重建角色、流程与机制之间的关系，让战略落得下去。', en: 'When the team is busy but collaboration is inefficient and responsibilities blur, we rebuild the links between roles, processes, and mechanisms so strategy can actually land.' },
    signals: [
      { zh: '团队很忙，但协作效率低', en: 'The team is busy, but collaboration is inefficient' },
      { zh: '岗位职责不清，责任边界模糊', en: 'Unclear roles and blurry lines of responsibility' },
      { zh: '会议很多，但决策质量不高、执行靠个人责任心', en: 'Plenty of meetings, but weak decisions and execution that relies on individual conscientiousness' },
    ],
    approach: { zh: '重建角色—能力—流程—机制之间的关系，设计会议与复盘节奏，在任务、会议、复盘和岗位之间建立可运转的协作闭环。', en: 'We rebuild the relationships among roles, capabilities, processes, and mechanisms, design meeting and review rhythms, and create a working collaboration loop across tasks, meetings, reviews, and roles.' },
    outputs: [
      { zh: '组织架构建议', en: 'Org structure recommendations' },
      { zh: '岗位职责', en: 'Role definitions' },
      { zh: '协作机制', en: 'Collaboration mechanisms' },
      { zh: '会议节奏', en: 'Meeting rhythm' },
      { zh: 'OKR / 任务体系', en: 'OKR / task system' },
      { zh: '组织复盘机制', en: 'Organizational review system' },
    ],
    aiNote: { zh: '任务与日程模块配合周计划、周总结与复盘，让管理者看见组织节奏、卡点、责任空档与季度目标风险。', en: 'The tasks and calendar modules, paired with weekly plans, summaries, and reviews, let managers see the organization’s rhythm, bottlenecks, accountability gaps, and risks to quarterly goals.' },
    cta: { label: { zh: '申请深度战略陪伴', en: 'Apply for Deep Strategy Companionship' }, href: CONSULT },
  },
  {
    num: '03',
    icon: Cpu,
    title: { zh: '数字化与 AI 落地', en: 'Digitalization and AI Adoption' },
    body: { zh: '从真实工作流出发，把 AI 变成团队稳定在用的业务应用。', en: 'Start from real workflows and turn AI into business apps the team actually keeps using.' },
    essence: { zh: '资料散、工具堆叠用不起来、想用 AI 却进不了业务场景时，从真实工作流出发把 AI 做成能用的系统。', en: 'When materials are scattered, tools pile up unused, and AI never reaches real work, we start from actual workflows and build AI into a system people can use.' },
    signals: [
      { zh: '资料和经验很多，却散落在文件、聊天与个人脑中', en: 'Lots of material and experience, scattered across files, chats, and people’s heads' },
      { zh: '工具堆叠，真正用不起来', en: 'Tools pile up but never really get used' },
      { zh: '知道 AI 重要，却不知怎么放进业务、流程与协作', en: 'AI clearly matters, but it is unclear how to fit it into the business, processes, and collaboration' },
    ],
    approach: { zh: '从资料、会议、目标、任务、项目、传播、筹款等真实场景出发，设计各场景的 AI 支撑方式——把 AI 做成"业务应用"，而不是又一个聊天框。', en: 'Starting from real scenarios — materials, meetings, goals, tasks, projects, outreach, fundraising — we design how AI supports each one, building AI into a business application rather than yet another chat box.' },
    outputs: [
      { zh: '客户工作台', en: 'Client workspace' },
      { zh: '数据中心', en: 'Data center' },
      { zh: '向量知识库', en: 'Vector knowledge base' },
      { zh: 'AI 问答', en: 'AI Q&A' },
      { zh: '任务与日程', en: 'Tasks and calendar' },
      { zh: 'AI 工作坊', en: 'AI workshop' },
      { zh: '自动化报告系统', en: 'Automated reporting system' },
    ],
    aiNote: { zh: '这正是益语智库 AI 的主场——客户工作台、数据中心、AI 同事与任务系统，把这套能力直接交付成你能用的应用。', en: 'This is exactly where Yiyu AI shines — the client workspace, data center, AI teammates, and task system deliver these capabilities as apps you can use right away.' },
    cta: { label: { zh: '了解益语智库 AI', en: 'Explore Yiyu AI' }, href: WORKBENCH },
  },
  {
    num: '04',
    icon: HeartHandshake,
    title: { zh: '公益与社会创新', en: 'Philanthropy and Social Innovation' },
    body: { zh: '从"项目做了什么"，转向"地方最终能留下什么"。', en: 'Shift from what a project did to what a community is finally left with.' },
    essence: { zh: '益语最早、最深的实践土壤——把社会问题、组织能力、项目机制与长期影响力放在一起思考。', en: 'Yiyu’s earliest and deepest ground of practice — thinking about social problems, organizational capability, project mechanisms, and long-term impact together.' },
    signals: [
      { zh: '主要靠热情、经验和单个项目推动', en: 'Driven mainly by passion, experience, and one-off projects' },
      { zh: '方法难沉淀，地方能力留不下来', en: 'Methods are hard to retain, and local capacity does not stay behind' },
      { zh: '资方想从"看项目"转向"看体系"', en: 'Funders want to move from looking at projects to looking at systems' },
    ],
    approach: { zh: '把社会问题、利益相关方、组织能力、项目机制、证据沉淀、筹款传播与长期影响力放在一起思考，从受益人处境与地方承接能力重新设计项目。', en: 'We consider social problems, stakeholders, organizational capability, project mechanisms, evidence, fundraising and outreach, and long-term impact together, redesigning projects from the beneficiaries’ reality and local capacity to carry them.' },
    outputs: [
      { zh: '战略与组织发展', en: 'Strategy and org development' },
      { zh: '项目设计与优化', en: 'Project design and optimization' },
      { zh: '基金会 / 资方策略', en: 'Foundation / funder strategy' },
      { zh: '公益品牌与传播', en: 'Nonprofit brand and communications' },
      { zh: 'AI 与数字化应用', en: 'AI and digital applications' },
    ],
    aiNote: { zh: '围绕筹款、传播/舆情、项目设计三大公益高频场景，把资料整理、议题研究、文案诊断与会议复盘转化为可用系统。', en: 'Around the three high-frequency nonprofit scenarios — fundraising, communications/public sentiment, and project design — we turn material organization, issue research, copy review, and meeting follow-up into usable systems.' },
    cta: { label: { zh: '申请深度战略陪伴', en: 'Apply for Deep Strategy Companionship' }, href: CONSULT },
  },
  {
    num: '05',
    icon: TrendingUp,
    title: { zh: '商业增长与战略慈善', en: 'Business Growth and Strategic Philanthropy' },
    body: { zh: '把增长焦虑，拆成可判断、可执行、可复盘的问题。', en: 'Break growth anxiety into problems you can assess, execute, and review.' },
    essence: { zh: '面向增长拐点、组织升级、数字化转型、品牌重构或战略慈善布局中的企业。', en: 'For companies at a growth inflection point, upgrading their organization, transforming digitally, rebuilding their brand, or shaping strategic philanthropy.' },
    signals: [
      { zh: '处在增长拐点或组织升级期', en: 'At a growth inflection point or organizational upgrade' },
      { zh: '想做数字化转型 / AI 应用却怕"只追工具"', en: 'Want digital transformation or AI, but fear just chasing tools' },
      { zh: '想把公益、品牌与业务连成可持续的战略慈善', en: 'Want to connect philanthropy, brand, and business into sustainable strategic giving' },
    ],
    approach: { zh: '不用传统框架包装问题，而是深入理解组织真正想完成的事，把战略、组织、技术与人的习惯放在一起设计，让技术真正服务业务。', en: 'Instead of dressing problems in standard frameworks, we deeply understand what the organization truly wants to accomplish, designing strategy, organization, technology, and human habits together so technology genuinely serves the business.' },
    outputs: [
      { zh: '企业战略与增长路径', en: 'Corporate strategy and growth path' },
      { zh: '战略慈善与社会价值设计', en: 'Strategic philanthropy and social-value design' },
      { zh: '组织协作与管理机制', en: 'Collaboration and management mechanisms' },
      { zh: 'AI 工作流与业务系统', en: 'AI workflows and business systems' },
      { zh: '品牌与内容策略', en: 'Brand and content strategy' },
    ],
    aiNote: { zh: 'AI 用于研究、报告、客户沟通、内容生成、内部协作与数据分析，让增长动作有系统支撑、可持续推进。', en: 'AI supports research, reporting, client communication, content generation, internal collaboration, and data analysis — giving growth moves a systematic, sustainable backbone.' },
    cta: { label: { zh: '申请深度战略陪伴', en: 'Apply for Deep Strategy Companionship' }, href: CONSULT },
  },
  {
    num: '06',
    icon: Library,
    title: { zh: '内容 · 工具 · 知识沉淀', en: 'Content · Tools · Knowledge Capture' },
    body: { zh: '把方法、研究与经验，沉淀为可反复使用的组织资产。', en: 'Turn methods, research, and experience into reusable organizational assets.' },
    essence: { zh: '益语的关键词之一是"内容与工具"——把看清的判断与做法，做成组织能反复使用的资产。', en: 'One of Yiyu’s keywords is content and tools — turning hard-won judgment and practice into assets the organization can reuse again and again.' },
    signals: [
      { zh: '经验散落在文件、聊天与个人脑中', en: 'Experience scattered across files, chats, and people’s heads' },
      { zh: '做过的方法留不下来、传不下去', en: 'Methods that worked cannot be retained or passed on' },
      { zh: '想把团队实践变成结构化的组织资产', en: 'Want to turn team practice into structured organizational assets' },
    ],
    approach: { zh: '通过知识萃取工作坊、战略行动手册、自动化报告与知识底座，把团队实践经验转化为结构化知识、流程、模板与系统资产。', en: 'Through knowledge-extraction workshops, strategy playbooks, automated reports, and a knowledge base, we turn team experience into structured knowledge, processes, templates, and system assets.' },
    outputs: [
      { zh: '出版物 / 课程', en: 'Publications / courses' },
      { zh: '知识萃取工作坊', en: 'Knowledge-extraction workshops' },
      { zh: '战略行动手册', en: 'Strategy action playbooks' },
      { zh: '自动化报告系统', en: 'Automated reporting system' },
      { zh: '通识语料机器人', en: 'Knowledge corpus bot' },
      { zh: '客户工作台', en: 'Client workspace' },
    ],
    aiNote: { zh: '资料导入后自动预扫描、摘要、打标签、去重与向量化，配合文件卡与证据引用，让经验沉淀成 AI 能调用的组织资产。', en: 'Once imported, materials are automatically pre-scanned, summarized, tagged, deduplicated, and vectorized; together with file cards and evidence citations, experience becomes an organizational asset AI can draw on.' },
    cta: { label: { zh: '了解益语智库 AI', en: 'Explore Yiyu AI' }, href: WORKBENCH },
  },
];

// ⚠️ 客户占位：守 ANTI_FAKE 红线，上线前换成真实客户标识（需征得客户授权后再露出名称/logo）。
const CLIENT_PLACEHOLDERS: { label: Bilingual; kind: Bilingual }[] = [
  { label: { zh: '公益基金会', en: 'Charitable Foundation' }, kind: { zh: '战略陪伴 + 工作台部署', en: 'Strategy companionship + workspace deployment' } },
  { label: { zh: '品牌咨询机构', en: 'Brand Consultancy' }, kind: { zh: '组织能力沉淀', en: 'Organizational capability capture' } },
  { label: { zh: '创业公司 · 早期', en: 'Startup · Early Stage' }, kind: { zh: '0→1 阶段陪伴', en: '0-to-1 stage companionship' } },
  { label: { zh: '行业领军企业', en: 'Industry Leader' }, kind: { zh: '组织数字化转型', en: 'Organizational digital transformation' } },
  { label: { zh: '社会创新组织', en: 'Social Innovation Org' }, kind: { zh: '使命驱动经营', en: 'Mission-driven operations' } },
];

export function IntroduceYiyu() {
  const { t } = useLang();
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  return (
    <Section id="about-yiyu" tone="lavender">
      <Container>
        {/* 标题区 */}
        <Reveal>
          <div className="text-center max-w-3xl mx-auto">
            <div className="flex items-center justify-center gap-2.5 mb-6">
              <span className="h-px w-7 bg-os-indigo/50" />
              <span className="text-[12px] font-semibold tracking-[0.18em] text-os-indigo">
                {t({ zh: '关于益语智库 · 可落地的增长咨询', en: 'About Yiyu Institute · Growth consulting that lands' })}
              </span>
              <span className="h-px w-7 bg-os-indigo/50" />
            </div>
            <h2 className="font-serif-display text-[28px] sm:text-[36px] lg:text-[44px] font-semibold leading-[1.32] tracking-tight text-os-navy">
              {t({ zh: '从战略切入，', en: 'Starting from strategy,' })}
              <br />
              <span className="text-ink-accent">{t({ zh: '陪组织把每件大事想清楚、做出来', en: 'we help organizations think through every big thing and get it done' })}</span>
            </h2>
            <p className="mt-6 text-[15px] sm:text-[16px] leading-[1.85] text-os-muted">
              {t({ zh: '益语智库是一家以「可落地的增长咨询」为核心承诺的战略陪伴机构——不只给一个理念，而是把战略判断、组织协同、数字化与 AI 放在同一张工作图上，把方向变成机制、把机制变成行动、把行动沉淀为长期能力。', en: 'Yiyu Institute is a strategy companionship firm built on one core promise: growth consulting that actually lands. Rather than handing over an idea, we put strategic judgment, organizational coordination, digitalization, and AI on one shared work map — turning direction into mechanisms, mechanisms into action, and action into lasting capability.' })}
            </p>
          </div>
        </Reveal>

        {/* 价值全景：6 张可点开的精品卡 */}
        <div className="mt-14 grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {VALUES.map((v, i) => {
            const Icon = v.icon;
            return (
              <Reveal key={v.title.zh} delay={(i % 3) * 90 + Math.floor(i / 3) * 120} className="h-full">
                <button
                  type="button"
                  onClick={() => setOpenIdx(i)}
                  aria-label={`${t({ zh: '查看价值详情', en: 'View value details' })}: ${t(v.title)}`}
                  className="feature-motion-card group relative block h-full w-full text-left p-7 rounded-[20px] bg-os-paper ring-1 ring-os-line shadow-os overflow-hidden cursor-pointer transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-os-lg hover:ring-os-violet/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-os-blue/55 focus-visible:ring-offset-2 focus-visible:ring-offset-[#F3F3FC]"
                >
                  <ArrowUpRight
                    aria-hidden="true"
                    className="feature-motion-arrow absolute top-6 right-6 w-[18px] h-[18px] text-os-indigo/35 transition-all duration-300 group-hover:text-os-violet group-hover:-translate-y-[2px] group-hover:translate-x-[2px]"
                    strokeWidth={2}
                  />
                  <div className="relative grid grid-cols-[auto_1fr] gap-x-5 gap-y-4 items-start">
                    <span className="feature-motion-number font-serif-display text-[30px] font-bold leading-none text-os-indigo transition-colors duration-300 group-hover:text-os-violet">
                      {v.num}
                    </span>
                    <h3 className="font-serif-display text-[17px] sm:text-[19px] font-semibold leading-[1.4] text-os-navy self-center pr-9">
                      {t(v.title)}
                    </h3>
                    <Icon className="feature-motion-icon w-8 h-8 text-os-indigo mt-1" strokeWidth={1.6} />
                    <p className="text-[13.5px] leading-[1.9] text-os-muted">{t(v.body)}</p>
                  </div>
                </button>
              </Reveal>
            );
          })}
        </div>

        {/* 客户认知带 */}
        <Reveal>
          <div className="mt-16 pt-10 border-t border-os-line">
            <p className="text-center text-[12px] tracking-[0.2em] font-semibold text-os-muted/70 mb-8">
              {t({ zh: '益语智库正在陪伴的组织', en: 'Organizations Yiyu Institute is working with' })}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
              {CLIENT_PLACEHOLDERS.map((c) => (
                <div
                  key={c.label.zh}
                  className="rounded-[14px] ring-1 ring-os-line bg-os-paper/70 px-4 py-5 text-center transition-shadow duration-300 hover:shadow-os"
                >
                  <div className="text-[14px] font-semibold text-os-navy/85 leading-tight">{t(c.label)}</div>
                  <div className="mt-1.5 text-[11px] text-os-muted/75 leading-relaxed">{t(c.kind)}</div>
                </div>
              ))}
            </div>
            <p className="mt-5 text-center text-[11px] text-os-muted/55">
              {t({ zh: '* 部分客户出于隐私约定暂以类型呈现；完整合作请见', en: '* Some clients are shown by type for privacy reasons; for full partnerships, see' })}{' '}
              <a
                href="?page=about"
                className="underline decoration-os-line hover:text-os-blue transition-colors"
              >
                {t({ zh: '关于我们', en: 'About Us' })}
              </a>
            </p>
          </div>
        </Reveal>

        {/* 双 CTA */}
        <Reveal>
          <div className="mt-14 flex flex-col sm:flex-row gap-4 items-center justify-center">
            <Button href={CONSULT} variant="primary" withArrow>
              {t({ zh: '申请深度战略陪伴', en: 'Apply for Deep Strategy Companionship' })}
            </Button>
            <Button href={WORKBENCH} variant="secondary" withArrow>
              {t({ zh: '了解益语智库 AI', en: 'Explore Yiyu AI' })}
            </Button>
          </div>
          <p className="mt-4 text-center text-[12px] text-os-muted/65">
            {t({ zh: '企业 / 组织 leader 走战略陪伴线 · 行动者 / 公益 / 小团队 用益语智库 AI（开源）', en: 'Enterprise and org leaders take the strategy-companionship path · Actioners, nonprofits, and small teams use Yiyu AI (open source)' })}
          </p>
        </Reveal>
      </Container>

      <ValueDrawer value={openIdx === null ? null : VALUES[openIdx]} onClose={() => setOpenIdx(null)} />
    </Section>
  );
}
