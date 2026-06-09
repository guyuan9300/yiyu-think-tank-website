import { type CSSProperties } from 'react';
import {
  Compass,
  Layers,
  Boxes,
  HeartHandshake,
  Quote,
  Bot,
  Phone,
  Mail,
  QrCode,
  ArrowRight,
  type LucideIcon,
} from 'lucide-react';
import { Header } from './Header';
import { OpenSourceFooter } from './open-source-home/OpenSourceFooter';
import { Section, Container, Reveal, Button, SectionHeading } from './open-source-home/ui';
import { SITE_CONTACT_EMAIL, SITE_CONTACT_PHONE, SITE_WECHAT_OFFICIAL } from '../lib/siteMeta';
import { CLIENTS, type ClientItem } from '../lib/clients';
import { getYiyuPageAttrs } from '../lib/yiyuTongSiteMap';
import { useLang, type Bilingual } from '../lib/i18n';

// ============================================================
// 关于我们 —— 信任叙事主线,刻意不重复首页(服务/方法/问题对照已在首页)。
// 主线: 身份定位 → 我们相信什么(POV) → 为什么存在(起源) → 陪谁走过(战绩)
//        → 谁在陪你(人机团队) → 和我们一起工作 → 联系。
// 定位: 一家陪伴中小型组织成长的顶尖战略咨询机构。
// ============================================================

interface AboutPageProps {
  onNavigate?: (page: string) => void;
}

const CONSULT = 'consult-apply';
const CARD =
  'feature-motion-card group relative rounded-[20px] bg-os-paper ring-1 ring-os-line shadow-os overflow-hidden transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-os-lg hover:ring-os-violet/45';

// ① 真实战绩(无占位假数据)
const STATS: { value: string; label: Bilingual }[] = [
  { value: '328', label: { zh: '服务过的企业 / 基金会 / 公益组织', en: 'Companies / foundations / nonprofits served' } },
  { value: '3', label: { zh: '部公开出版著作', en: 'Published books' } },
  { value: '3+4', label: { zh: '人机协作团队 · 人类 + AI 同事', en: 'Human-AI team · humans + AI colleagues' } },
];

// ② 我们相信什么(POV — 全页灵魂,草稿待调)
const BELIEFS: { icon: LucideIcon; title: Bilingual; body: Bilingual }[] = [
  {
    icon: HeartHandshake,
    title: { zh: '战略不是一份报告，是一场长期陪伴', en: 'Strategy is not a report — it’s a long-term partnership' },
    body: { zh: '我们不交付完 PPT 就离场。从诊断、共创到落地复盘，我们像成长合伙人一样，陪一个组织走完整个周期。', en: 'We don’t hand over a deck and leave. From diagnosis to co-creation to execution and review, we walk the full cycle alongside an organization, like a growth partner.' },
  },
  {
    icon: Layers,
    title: { zh: '组织经营是一个整体，不该被工具切碎', en: 'Running an organization is one whole — tools shouldn’t slice it apart' },
    body: { zh: '战略、组织、项目、品牌、筹款、数字化……今天的工具把它们切成碎片。我们坚持把它们放回同一张画布上一起思考。', en: 'Strategy, organization, projects, brand, fundraising, digitalization—today’s tools fragment them. We insist on putting them back on one canvas and thinking about them together.' },
  },
  {
    icon: Boxes,
    title: { zh: '最好的方法论，应该沉淀成组织用得起来的工具', en: 'The best methodology should become tools an organization can actually use' },
    body: { zh: '咨询最大的浪费，是顾问一走、能力就归零。我们把多年战略思想做成 AI 工具，让方法留在组织里、随时能调用。', en: 'The biggest waste in consulting is that capability resets to zero once the consultant leaves. We turn years of strategic thinking into AI tools, so the methods stay inside the organization, ready on demand.' },
  },
  {
    icon: Compass,
    title: { zh: '始于公益的理解，让我们更懂如何陪组织长期成长', en: 'Rooted in philanthropy, we understand how to accompany growth over the long run' },
    body: { zh: '公益让我们习惯从使命、利益相关方和长期影响出发看问题——这份理解，也让我们服务的商业组织更有人性、更可持续。', en: 'Philanthropy taught us to start from mission, stakeholders, and long-term impact—an understanding that makes the businesses we serve more humane and more sustainable, too.' },
  },
];

// ⑤ 人类同事(真实)
const FOUNDER = {
  name: { zh: '顾源源', en: 'Gu Yuanyuan' } as Bilingual,
  role: { zh: '创始人 · 首席战略专家', en: 'Founder · Chief Strategy Expert' } as Bilingual,
  bio: { zh: '颗粒公益传播发展中心创始人，福布斯 30 位 30 岁以下创业精英。长期深耕公益品牌建设、战略设计、内容传播与组织赋能，曾为 60 余家企业、基金会及公益组织提供系统性战略设计与落地陪伴，近年持续探索 AI 在咨询、传播、组织协作与数字化流程中的应用。', en: 'Founder of the Granular Philanthropy Communication & Development Center and a Forbes 30 Under 30 honoree. With deep experience in nonprofit branding, strategy design, communications, and organizational enablement, Gu has served 60+ companies, foundations, and nonprofits, and now explores applying AI across consulting, communications, collaboration, and digital workflows.' } as Bilingual,
  books: [
    { zh: '《创建一个公益品牌》', en: 'Building a Nonprofit Brand' },
    { zh: '《学习型组织笔记》', en: 'Notes on the Learning Organization' },
    { zh: '《创业者需要回答的 51 个问题》', en: '51 Questions Every Founder Should Answer' },
  ] as Bilingual[],
};
const HUMANS: { initial: string; name: Bilingual; role: Bilingual; desc: Bilingual }[] = [
  { initial: '林', name: { zh: '林佳维', en: 'Lin Jiawei' }, role: { zh: '项目推进与技术落地负责人', en: 'Lead, Execution & Engineering' }, desc: { zh: '承担技术开发、技术攻关与系统落地，把战略设想转化为可验证的产品与系统。', en: 'Owns technical development and delivery, turning strategic ideas into testable products and systems.' } },
  { initial: '乐', name: { zh: '乐乐', en: 'Lele' }, role: { zh: '客户协同与项目节奏负责人', en: 'Lead, Client & Cadence' }, desc: { zh: '负责客户对接、进度跟踪、协作统筹与交付把控，保障复杂项目稳定推进。', en: 'Owns client coordination, progress tracking, and delivery, keeping complex projects moving steadily.' } },
];

// ⑤ AI 同事(真实)
const AIS: { name: Bilingual; dept: Bilingual; role: Bilingual }[] = [
  { name: { zh: '庆华', en: 'Qinghua' }, dept: { zh: '战略设计 / 咨询策略部', en: 'Strategy Design' }, role: { zh: '战略讨论的信息管理员、结构化分析者与 AI CTO 式协调者。', en: 'Information steward, structured analyst, and AI-CTO-style coordinator for strategy.' } },
  { name: { zh: '佳乐', en: 'Jiale' }, dept: { zh: '科技发展部', en: 'Technology' }, role: { zh: '技术路径探索、系统功能落地、开发协同与工具验证。', en: 'Explores technical paths, ships features, coordinates dev, and validates tools.' } },
  { name: { zh: '大周', en: 'Dazhou' }, dept: { zh: '信息数据部', en: 'Information & Data' }, role: { zh: '资料收集、信息分拣、数据整理与行业信号监测。', en: 'Material collection, sorting, data organization, and industry-signal monitoring.' } },
  { name: { zh: '刘洁', en: 'Liu Jie' }, dept: { zh: '对外协作 / 客户服务部', en: 'Client Service' }, role: { zh: '客户沟通、进度提醒、协作反馈与外部接口支持。', en: 'Client communication, reminders, collaboration feedback, and external support.' } },
];

// ⑥ 我们适合陪谁(真实客户类型,精炼)
const AUDIENCES: { title: Bilingual; body: Bilingual }[] = [
  { title: { zh: '升级中的公益机构与基金会', en: 'Nonprofits & foundations leveling up' }, body: { zh: '希望从项目执行升级为战略型、系统型组织。', en: 'Evolving from project execution into a strategic, systematic organization.' } },
  { title: { zh: '平台型资方', en: 'Platform funders' }, body: { zh: '需要议题研究、资助策略与地方服务生态建设。', en: 'Needing issue research, funding strategy, and local ecosystem building.' } },
  { title: { zh: '增长拐点期的商业组织', en: 'Businesses at an inflection point' }, body: { zh: '处在组织升级、品牌重构或数字化转型期。', en: 'Amid organizational upgrade, brand reinvention, or digital transformation.' } },
  { title: { zh: '战略慈善企业', en: 'Strategic philanthropy companies' }, body: { zh: '希望把公益、品牌、产品与社会价值结合起来。', en: 'Integrating philanthropy, brand, product, and social value.' } },
  { title: { zh: '想真正用起 AI 的团队', en: 'Teams ready to truly use AI' }, body: { zh: '已意识到 AI 重要，但不知如何放进业务与协作。', en: 'Aware AI matters, but unsure how to embed it into work.' } },
];

// 客户弹幕:5 行、全部同方向慢速流动(不对冲,不头晕),悬停暂停以便阅读,两端淡出遮罩。
// 名单 round-robin 打散到各行,公益/政府/企业混排;纯组织名,体量本身即说服力。
const DANMAKU_ROWS = 5;
function ClientDanmaku() {
  const rows: ClientItem[][] = Array.from({ length: DANMAKU_ROWS }, () => []);
  CLIENTS.forEach((c, i) => rows[i % DANMAKU_ROWS].push(c));
  return (
    <div className="mt-8 space-y-3 overflow-hidden [mask-image:linear-gradient(to_right,transparent,#000_5%,#000_95%,transparent)]">
      <style>{`
        @keyframes aboutMq{from{transform:translateX(0)}to{transform:translateX(-50%)}}
        .about-mq{animation:aboutMq var(--dur,360s) linear infinite}
        .about-mq:hover{animation-play-state:paused}
      `}</style>
      {rows.map((items, ri) => (
        <div key={ri} className="about-mq flex w-max gap-2.5" style={{ '--dur': `${352 + ri * 24}s` } as CSSProperties}>
          {[...items, ...items].map((c, i) => (
            <span key={i} className="inline-flex items-baseline gap-1.5 rounded-full bg-os-paper ring-1 ring-os-line shadow-os px-3.5 py-2 whitespace-nowrap">
              <span className="text-[13px] font-semibold text-os-navy">{c.name}</span>
              <span className="text-[11.5px] text-os-muted">· {c.field}</span>
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}

export function AboutPage({ onNavigate }: AboutPageProps) {
  const { t } = useLang();
  const go = (page: string) => onNavigate?.(page);

  return (
    <div {...getYiyuPageAttrs('about')} className="min-h-screen bg-os-canvas">
      <Header onNavigate={(page) => go(page)} />

      {/* ① Hero · 身份定位 + 真实战绩 */}
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
              <h1 className="font-serif-display text-[34px] sm:text-[48px] lg:text-[56px] font-semibold leading-[1.2] tracking-tight text-os-navy">
                {t({ zh: '陪伴中小型组织成长的', en: 'A strategy consulting firm that' })}
                <br />
                <span className="text-ink-accent">{t({ zh: '战略咨询机构', en: 'accompanies organizations as they grow' })}</span>
              </h1>
              <p className="mt-7 text-[16px] sm:text-[18px] leading-[1.85] text-os-muted max-w-3xl mx-auto">
                {t({ zh: '我们把多年战略咨询沉淀的组织思想，做成 AI 工具与工作系统，长期陪伴企业、基金会与公益组织——不交付一份报告就离场，而是陪它把战略走完、把能力留下。', en: 'We turn years of distilled strategic thinking into AI tools and work systems, and partner long-term with companies, foundations, and nonprofits—not delivering a report and leaving, but staying to see the strategy through and leave capability behind.' })}
              </p>
              <div className="mt-10 flex flex-col sm:flex-row gap-4 items-center justify-center">
                <Button variant="primary" withArrow onClick={() => go(CONSULT)}>
                  {t({ zh: '申请深度战略陪伴', en: 'Apply for a strategic partnership' })}
                </Button>
                <Button variant="secondary" withArrow onClick={() => go('workbench')}>
                  {t({ zh: '了解益语智库 AI', en: 'Explore Yiyu AI' })}
                </Button>
              </div>
            </div>
          </Reveal>

          <Reveal delay={120}>
            <div className="mt-14 grid grid-cols-3 gap-px overflow-hidden rounded-[20px] bg-os-line ring-1 ring-os-line">
              {STATS.map((s) => (
                <div key={s.label.zh} className="bg-os-paper px-4 sm:px-5 py-7 text-center">
                  <div className="font-serif-display text-[30px] sm:text-[40px] font-semibold leading-none text-os-navy">{s.value}</div>
                  <div className="mt-2.5 text-[12px] sm:text-[12.5px] leading-5 text-os-muted">{t(s.label)}</div>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ② 我们相信什么(POV) */}
      <Section id="about-beliefs" tone="paper">
        <Container>
          <Reveal>
            <SectionHeading
              eyebrow={t({ zh: '我们相信什么', en: 'What We Believe' })}
              title={t({ zh: '比方法更重要的，是看问题的方式', en: 'More important than method is how you see the problem' })}
              subtitle={t({ zh: '这些信念，决定了我们怎么陪一个组织——也决定了我们和一份「报告 + PPT」式咨询的根本不同。', en: 'These beliefs shape how we accompany an organization—and set us apart from “report-and-deck” consulting.' })}
            />
          </Reveal>
          <div className="mt-12 grid sm:grid-cols-2 gap-5 lg:gap-6">
            {BELIEFS.map((b, i) => {
              const Icon = b.icon;
              return (
                <Reveal key={b.title.zh} delay={(i % 2) * 90} className="h-full">
                  <div className={`${CARD} h-full p-7 sm:p-8`}>
                    <div className="w-11 h-11 rounded-[13px] bg-os-mist text-os-blue ring-1 ring-os-blue/15 flex items-center justify-center mb-5">
                      <Icon className="w-5 h-5" strokeWidth={1.75} />
                    </div>
                    <h3 className="font-serif-display text-[19px] sm:text-[20px] font-semibold leading-[1.4] text-os-navy">{t(b.title)}</h3>
                    <p className="mt-3 text-[14px] leading-[1.9] text-os-muted">{t(b.body)}</p>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </Container>
      </Section>

      {/* ③ 我们为什么存在(起源) */}
      <Section id="about-origin" tone="canvas">
        <Container>
          <Reveal>
            <div className="max-w-3xl mx-auto text-center">
              <Quote className="w-9 h-9 text-os-spark/40 mx-auto mb-5" />
              <h2 className="font-serif-display text-[26px] sm:text-[32px] font-semibold leading-[1.45] tracking-tight text-os-navy">
                {t({ zh: '组织真正缺的，不是又一份报告，而是有人陪它把战略走完、并把能力留下来。', en: 'What an organization truly lacks is not another report, but someone to see the strategy through and leave the capability behind.' })}
              </h2>
            </div>
          </Reveal>
          <Reveal delay={120}>
            <div className="mt-10 max-w-3xl mx-auto rounded-[22px] bg-os-paper ring-1 ring-os-line shadow-os p-7 sm:p-9 space-y-5">
              <p className="text-[15px] sm:text-[16px] leading-[2] text-os-muted">
                {t({ zh: '益语智库起步于公益慈善、社会创新与教育领域。多年来，创始人顾源源和团队为 60 余家企业、基金会与公益组织做战略设计与落地陪伴，也写下《创建一个公益品牌》《学习型组织笔记》《创业者需要回答的 51 个问题》三本书。', en: 'Yiyu Institute began in philanthropy, social innovation, and education. Over the years, founder Gu Yuanyuan and the team have done strategy and hands-on partnership for 60+ companies, foundations, and nonprofits, and written three books.' })}
              </p>
              <p className="text-[15px] sm:text-[16px] leading-[2] text-os-muted">
                {t({ zh: '我们越来越确信：把战略当成一次性交付，是最大的浪费。于是我们把这些年沉淀的组织思想，做成一套 AI 工具与工作系统——让战略不靠人推，而能在组织里自己生长。这就是益语智库今天的样子：', en: 'We grew certain that treating strategy as a one-off deliverable is the greatest waste. So we turned years of organizational thinking into a set of AI tools and work systems—so strategy no longer relies on someone pushing it, but grows inside the organization itself. That is Yiyu today:' })}
                <span className="text-os-navy font-semibold">{t({ zh: '一家把战略思想做成 AI 工具、长期陪伴组织成长的咨询机构。', en: ' a consulting firm that turns strategic thinking into AI tools and accompanies organizations as they grow.' })}</span>
              </p>
            </div>
          </Reveal>
        </Container>
      </Section>

      {/* ④ 我们陪谁走过(战绩) */}
      <Section id="about-track" tone="paper">
        <Container>
          <Reveal>
            <SectionHeading
              eyebrow={t({ zh: '我们陪谁走过', en: 'Who We’ve Walked With' })}
              title={t({ zh: '战绩，是咨询机构唯一的说服力', en: 'A track record is a consultancy’s only real proof' })}
              subtitle={t({ zh: '从一线公益组织到平台型基金会——每一个名字背后，都是一个真实的社会问题，和一段我们一起走过的路。', en: 'From frontline nonprofits to platform foundations—behind every name is a real social problem, and a road we walked together.' })}
            />
          </Reveal>
          <ClientDanmaku />
        </Container>
      </Section>

      {/* ⑤ 谁在陪你(人机协作团队) */}
      <Section id="about-team" tone="canvas">
        <Container>
          <Reveal>
            <SectionHeading
              eyebrow={t({ zh: '谁在陪你', en: 'Who Walks With You' })}
              title={t({ zh: '我们自己，就是一支人机协作团队', en: 'We ourselves are a human-AI team' })}
              subtitle={t({ zh: '我们不把 AI 当作替代人的工具，而是组织里的协作岗位——人类专注判断、关系与关键决策，AI 同事承担信息处理、技术推进与资料分析。我们卖什么，我们自己先这么活。', en: 'We treat AI not as a replacement for people, but as collaborative roles—humans focus on judgment, relationships, and key decisions; AI colleagues handle information, technical execution, and analysis. We live the way we sell.' })}
            />
          </Reveal>

          {/* 创始人 featured */}
          <Reveal>
            <div className={`${CARD} mt-12 p-7 sm:p-9 flex flex-col sm:flex-row gap-6 sm:gap-8`}>
              <div className="shrink-0">
                <div className="w-[68px] h-[68px] rounded-[20px] bg-os-navy text-white font-serif-display text-[28px] font-semibold flex items-center justify-center">{t({ zh: '顾', en: 'G' })}</div>
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <h3 className="font-serif-display text-[22px] font-semibold text-os-navy">{t(FOUNDER.name)}</h3>
                  <span className="text-[13px] text-os-indigo font-medium">{t(FOUNDER.role)}</span>
                </div>
                <p className="mt-3 text-[14px] leading-[1.9] text-os-muted">{t(FOUNDER.bio)}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {FOUNDER.books.map((bk) => (
                    <span key={bk.zh} className="inline-flex items-center rounded-full bg-os-mist ring-1 ring-os-line px-3 py-1 text-[12px] text-os-navy/80">{t(bk)}</span>
                  ))}
                </div>
              </div>
            </div>
          </Reveal>

          {/* 人类同事 */}
          <div className="mt-5 grid sm:grid-cols-2 gap-5">
            {HUMANS.map((m, i) => (
              <Reveal key={m.name.zh} delay={i * 80} className="h-full">
                <div className={`${CARD} h-full p-6 sm:p-7 flex items-start gap-5`}>
                  <div className="shrink-0 w-[52px] h-[52px] rounded-[16px] bg-os-navy/85 text-white font-serif-display text-[22px] font-semibold flex items-center justify-center">{m.initial}</div>
                  <div>
                    <h3 className="font-serif-display text-[18px] font-semibold text-os-navy">{t(m.name)}</h3>
                    <div className="text-[12.5px] text-os-indigo font-medium mt-0.5">{t(m.role)}</div>
                    <p className="mt-2.5 text-[13.5px] leading-[1.8] text-os-muted">{t(m.desc)}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>

          {/* AI 同事 */}
          <Reveal delay={60}>
            <div className="mt-8 flex items-center gap-2">
              <span className="h-px w-7 bg-os-spark/70" />
              <span className="text-[12px] font-semibold tracking-[0.16em] text-os-spark">{t({ zh: '四位 AI 同事', en: 'Four AI Colleagues' })}</span>
            </div>
          </Reveal>
          <div className="mt-5 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {AIS.map((a, i) => (
              <Reveal key={a.name.zh} delay={(i % 4) * 70} className="h-full">
                <div className={`${CARD} h-full p-6`}>
                  <div className="w-11 h-11 rounded-[13px] bg-os-spark-soft text-os-spark ring-1 ring-os-spark/20 flex items-center justify-center mb-4"><Bot className="w-5 h-5" strokeWidth={1.75} /></div>
                  <h3 className="font-serif-display text-[17px] font-semibold text-os-navy">{t(a.name)}</h3>
                  <div className="text-[11.5px] text-os-spark font-medium mt-0.5">{t(a.dept)}</div>
                  <p className="mt-2.5 text-[12.5px] leading-[1.75] text-os-muted">{t(a.role)}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </Container>
      </Section>

      {/* ⑥ 和我们一起工作 */}
      <Section id="about-work" tone="paper">
        <Container>
          <Reveal>
            <SectionHeading
              eyebrow={t({ zh: '和我们一起工作', en: 'Work With Us' })}
              title={t({ zh: '我们适合陪谁', en: 'Who We’re a Fit For' })}
              subtitle={t({ zh: '如果你正处在下面的某个阶段，我们大概率能帮上忙。一段陪伴通常以一年或三年为周期，从梳理诊断开始。', en: 'If you’re in one of the stages below, we can likely help. A partnership usually runs on a one- or three-year cycle, starting from mapping and diagnosis.' })}
            />
          </Reveal>
          <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {AUDIENCES.map((a, i) => (
              <Reveal key={a.title.zh} delay={(i % 3) * 70} className="h-full">
                <div className="h-full rounded-[18px] bg-os-canvas ring-1 ring-os-line p-5">
                  <h3 className="text-[15px] font-semibold text-os-navy">{t(a.title)}</h3>
                  <p className="mt-1.5 text-[13px] leading-[1.75] text-os-muted">{t(a.body)}</p>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal delay={120}>
            <div className="mt-10 rounded-[22px] bg-os-navy text-white p-8 sm:p-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
              <div>
                <h3 className="font-serif-display text-[22px] sm:text-[24px] font-semibold leading-[1.4]">{t({ zh: '想聊聊你的组织？', en: 'Want to talk about your organization?' })}</h3>
                <p className="mt-2 text-[14px] leading-[1.8] text-white/70 max-w-xl">{t({ zh: '从一次战略梳理开始，看清现状、找到真正的卡点。', en: 'Start with a strategy review—see the real situation and find the true bottleneck.' })}</p>
              </div>
              <button onClick={() => go(CONSULT)} className="shrink-0 inline-flex items-center gap-2 rounded-full bg-white text-os-navy px-6 py-3 text-[15px] font-semibold hover:bg-os-mist transition">
                {t({ zh: '申请深度战略陪伴', en: 'Apply for a partnership' })}<ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </Reveal>
        </Container>
      </Section>

      {/* ⑦ 联系 */}
      <Section id="about-contact" tone="canvas">
        <Container>
          <Reveal>
            <SectionHeading eyebrow={t({ zh: '联系我们', en: 'Contact' })} title={t({ zh: '保持联系', en: 'Get in touch' })} />
          </Reveal>
          <div className="mt-10 grid sm:grid-cols-3 gap-5 max-w-4xl mx-auto">
            <a href={`tel:${SITE_CONTACT_PHONE}`} className={`${CARD} p-6 text-center`}>
              <Phone className="w-6 h-6 text-os-blue mx-auto mb-3" />
              <div className="text-[12px] text-os-muted mb-1">{t({ zh: '电话', en: 'Phone' })}</div>
              <div className="text-[15px] font-semibold text-os-navy">{SITE_CONTACT_PHONE}</div>
            </a>
            <a href={`mailto:${SITE_CONTACT_EMAIL}`} className={`${CARD} p-6 text-center`}>
              <Mail className="w-6 h-6 text-os-blue mx-auto mb-3" />
              <div className="text-[12px] text-os-muted mb-1">{t({ zh: '邮箱', en: 'Email' })}</div>
              <div className="text-[15px] font-semibold text-os-navy break-all">{SITE_CONTACT_EMAIL}</div>
            </a>
            <div className={`${CARD} p-6 text-center`}>
              <QrCode className="w-6 h-6 text-os-blue mx-auto mb-3" />
              <div className="text-[12px] text-os-muted mb-1">{t({ zh: '微信', en: 'WeChat' })}</div>
              <div className="text-[15px] font-semibold text-os-navy">{SITE_WECHAT_OFFICIAL}</div>
            </div>
          </div>
        </Container>
      </Section>

      <OpenSourceFooter />
    </div>
  );
}
