import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Eye, Repeat, Share2, ScanSearch, FlaskConical, Layers } from 'lucide-react';
import { Header } from './Header';
import { OpenSourceFooter } from './open-source-home/OpenSourceFooter';
import { Reveal } from './open-source-home/ui';
import { getYiyuPageAttrs } from '../lib/yiyuTongSiteMap';
import { ACCENT, Block, AccentLabel, SectionTitle, Body, Quote, PhotoSlot, FeatureCard, StepRow, AccentButton, GhostButton } from './projectPageKit';
import { useLang } from '../lib/i18n';

// ============================================================
// 独角兽战略陪伴项目 · 项目介绍页 (配色沿用支持池卡片, 文档式金句型)
// 共用样式件见 ./projectPageKit
// ============================================================

interface Props {
  onNavigate: (page: string, id?: string) => void;
}

export function UnicornCompanionPage({ onNavigate }: Props) {
  const { t } = useLang();
  const topRef = useRef<HTMLDivElement>(null);
  const actionRef = useRef<HTMLDivElement>(null);
  const [topVisible, setTopVisible] = useState(true);
  const [actionVisible, setActionVisible] = useState(false);

  useEffect(() => {
    const el = topRef.current; if (!el) return;
    const ob = new IntersectionObserver(([e]) => setTopVisible(e.isIntersecting), { threshold: 0.1 });
    ob.observe(el); return () => ob.disconnect();
  }, []);
  useEffect(() => {
    const el = actionRef.current; if (!el) return;
    const ob = new IntersectionObserver(([e]) => setActionVisible(e.isIntersecting), { threshold: 0.2 });
    ob.observe(el); return () => ob.disconnect();
  }, []);

  const apply = () => onNavigate('consult-apply');
  const becomeSupporter = () => onNavigate('consult-apply');
  const showSticky = !topVisible && !actionVisible;

  return (
    <div {...getYiyuPageAttrs('unicorn-companion')} className="min-h-screen bg-os-canvas text-os-ink antialiased font-sans">
      <Header onNavigate={(p) => onNavigate(p)} />

      <main className="pt-[68px]">
        {/* 顶部 · 项目概述 (文档封面式, 非营销大 hero) */}
        <div ref={topRef}>
          <section className="bg-os-paper border-b border-os-line">
            <div className="mx-auto w-full max-w-[920px] px-5 sm:px-6 lg:px-8 pt-9 pb-12">
              <button onClick={() => onNavigate('home')} className="mb-8 inline-flex items-center gap-1.5 text-[13px] font-medium text-os-muted hover:text-os-navy transition-colors">
                <ArrowLeft className="h-4 w-4" />{t({ zh: '返回', en: 'Back' })}
              </button>

              <Reveal>
                <AccentLabel>{t({ zh: '独角兽战略陪伴项目', en: 'Unicorn Strategic Companionship' })}</AccentLabel>
              </Reveal>
              <Reveal delay={70}>
                <h1 className="mt-4 max-w-[760px] font-serif-display text-[28px] sm:text-[38px] lg:text-[42px] font-semibold leading-[1.32] tracking-tight text-os-navy">
                  {t({ zh: '支持一个组织，是为了让一个领域多一种新解法。', en: 'Backing one organization gives an entire field a new way to solve its problems.' })}
                </h1>
              </Reveal>
              <Reveal delay={140}>
                <p className="mt-5 max-w-[680px] text-[15px] sm:text-[16px] leading-[1.9] text-os-muted">
                  {t({ zh: '独角兽战略陪伴项目面向每个公益领域中最有潜力的基金会、公益组织和社会企业。我们用三年时间陪伴组织重新理解问题、设计模式、优化协作、沉淀方法，让一次组织成长变成一个领域的公共经验。', en: 'The Unicorn Strategic Companionship program is for the most promising foundations, nonprofits, and social enterprises in each cause area. Over three years, we accompany an organization to rethink its problem, design new models, improve collaboration, and codify methods—turning one organization’s growth into shared knowledge for the whole field.' })}
                </p>
              </Reveal>

              <Reveal delay={200}>
                <div className="mt-7 flex flex-wrap items-center gap-x-3 gap-y-2">
                  {[{ zh: '3 年陪伴周期', en: '3-year companionship' }, { zh: '最高 50% 配比支持', en: 'Up to 50% matching support' }, { zh: '首批招募中', en: 'First cohort recruiting' }].map((tag) => (
                    <span key={tag.zh} className="inline-flex items-center rounded-full bg-os-mist/70 ring-1 ring-os-line px-3.5 py-1.5 text-[12.5px] font-medium text-os-navy">{t(tag)}</span>
                  ))}
                </div>
              </Reveal>

              <Reveal delay={260}>
                <div className="mt-8 flex flex-wrap items-center gap-3.5">
                  <AccentButton onClick={apply}>{t({ zh: '提交组织申请', en: 'Submit Application' })}<ArrowRight className="h-4 w-4" /></AccentButton>
                  <GhostButton onClick={becomeSupporter}>{t({ zh: '成为项目支持方', en: 'Become a Supporter' })}</GhostButton>
                </div>
              </Reveal>

              {/* 项目主照片位 */}
              <Reveal delay={320}>
                <div className="mt-10"><PhotoSlot label={t({ zh: '项目主图 / 现场照片', en: 'Program hero / on-site photo' })} ratio="aspect-[16/8]" /></div>
              </Reveal>
            </div>
          </section>
        </div>

        {/* 01 项目主张金句 */}
        <Block tone="canvas">
          <Quote>{t({ zh: '不是多做一个项目，而是多长出一种解法。', en: 'Not one more project—one more way to solve the problem.' })}</Quote>
        </Block>

        {/* 02 为什么需要它 */}
        <Block tone="paper">
          <AccentLabel>{t({ zh: '为什么需要它', en: 'Why It Matters' })}</AccentLabel>
          <SectionTitle>{t({ zh: '社会问题变了，公益不能只重复旧项目。', en: 'Social problems have changed; nonprofits cannot just repeat old projects.' })}</SectionTitle>
          <Body>
            {t({ zh: '很多公益组织长期在一线行动，最知道服务对象和地方环境正在发生变化。但它们常常被项目执行、结项报告、预算管理和日常事务困住，没有足够时间停下来重新思考：问题到底变在哪里？原来的方法哪里失效？未来应该探索什么新的回应方式？', en: 'Many nonprofits act on the front lines for years and know best how their communities and local context are changing. Yet they are often trapped in project delivery, closing reports, budget management, and daily tasks—with no time to stop and rethink: where exactly has the problem shifted? Where have the old methods failed? What new responses should they explore?' })}
          </Body>
          <Quote className="mt-8">{t({ zh: '公益的核心，不只是执行社会资源，而是创造新的回应方式。', en: 'The heart of doing good is not just deploying resources—it is creating new ways to respond.' })}</Quote>
        </Block>

        {/* 03 什么是独角兽 */}
        <Block tone="canvas">
          <AccentLabel>{t({ zh: '什么是“独角兽”', en: 'What "Unicorn" Means Here' })}</AccentLabel>
          <SectionTitle>{t({ zh: '这里的独角兽，不是估值，而是探索能力。', en: 'Here, a unicorn is not about valuation—it is about the capacity to explore.' })}</SectionTitle>
          <Body>{t({ zh: '我们寻找的不是规模最大的组织，而是最有可能在一个领域里探索出新模式的组织。它们通常具备三种特质：', en: 'We look not for the largest organizations, but for the ones most likely to discover a new model in their field. They usually share three traits:' })}</Body>
          <div className="mt-8 grid sm:grid-cols-3 gap-4">
            {[
              { icon: Eye, t: { zh: '看得深', en: 'Sees Deep' }, d: { zh: '长期在一线，真正理解问题变化。', en: 'Years on the front line, with a real grasp of how the problem is changing.' } },
              { icon: Repeat, t: { zh: '愿意变', en: 'Willing to Change' }, d: { zh: '不满足于重复执行项目，愿意重新设计服务和组织。', en: 'Not content to repeat projects—ready to redesign its services and itself.' } },
              { icon: Share2, t: { zh: '能外溢', en: 'Spreads Impact' }, d: { zh: '一旦探索成功，它的经验可以影响更多同行。', en: 'Once it succeeds, its experience can influence many peers.' } },
            ].map((c) => (
              <FeatureCard key={c.t.zh} icon={c.icon} title={t(c.t)} desc={t(c.d)} />
            ))}
          </div>
          <Quote className="mt-8">{t({ zh: '我们支持的不是最会写申请书的组织，而是最可能长出新方法的组织。', en: 'We back not the best grant writers, but the organizations most likely to grow a new method.' })}</Quote>
        </Block>

        {/* 04 怎么陪伴 · 三年 */}
        <Block tone="mist">
          <AccentLabel>{t({ zh: '怎么陪伴', en: 'How We Accompany' })}</AccentLabel>
          <SectionTitle>{t({ zh: '三年陪伴，不是交一份报告。', en: 'Three years of companionship, not the delivery of a report.' })}</SectionTitle>
          <Body>{t({ zh: '独角兽战略陪伴不是一次咨询，也不是一份战略文本，而是持续三年的共同探索。', en: 'Unicorn Strategic Companionship is not a one-off consultation or a strategy document—it is a three-year journey of shared exploration.' })}</Body>
          <div className="mt-8 space-y-4">
            {[
              { icon: ScanSearch, y: { zh: '第一年', en: 'Year 1' }, t: { zh: '看清问题', en: 'See the Problem' }, d: { zh: '重新理解服务对象、社会问题、地方生态和组织能力，找到真正值得突破的主线。', en: 'Rethink the community, the social problem, the local ecosystem, and organizational capacity, and find the workstream truly worth pursuing.' } },
              { icon: FlaskConical, y: { zh: '第二年', en: 'Year 2' }, t: { zh: '验证模式', en: 'Test the Model' }, d: { zh: '在真实项目里试点、调整、复盘，把想法变成服务路径、协作机制和产品雏形。', en: 'Pilot, adjust, and review in real projects, turning ideas into service paths, collaboration mechanisms, and product prototypes.' } },
              { icon: Layers, y: { zh: '第三年', en: 'Year 3' }, t: { zh: '沉淀方法', en: 'Codify the Method' }, d: { zh: '形成方法论、案例、工具包和传播材料，让经验可以被同行理解和借鉴。', en: 'Produce methods, cases, toolkits, and shareable materials so peers can understand and learn from the experience.' } },
            ].map((c, i) => (
              <StepRow key={c.y.zh} no={i + 1} icon={c.icon} tag={t(c.y)} title={t(c.t)} desc={t(c.d)} />
            ))}
          </div>
          <div className="mt-8"><PhotoSlot label={t({ zh: '陪伴过程 / 共创现场照片', en: 'Companionship process / co-creation photo' })} ratio="aspect-[16/7]" /></div>
          <Quote className="mt-8">{t({ zh: '一年可以完成一个项目，三年才可能长出一种方法。', en: 'A year can finish a project; only three years can grow a method.' })}</Quote>
        </Block>

        {/* 05 如何支持 */}
        <Block tone="paper">
          <AccentLabel>{t({ zh: '如何支持', en: 'How Support Works' })}</AccentLabel>
          <SectionTitle>{t({ zh: '组织自己投入，支持方为关键探索加速。', en: 'The organization invests itself; supporters accelerate the key exploration.' })}</SectionTitle>
          <Body>
            {t({ zh: '这个项目采用配比支持机制。组织支付一部分战略陪伴费用，支持池或资助方承担另一部分，', en: 'The program uses a matching-support model. The organization covers part of the companionship cost, while the support pool or funders cover the rest, ' })}<span className="font-semibold text-os-ink">{t({ zh: '最高不超过 50%', en: 'up to 50%' })}</span>{t({ zh: '。这样设计，是为了让支持关系更健康：', en: '. This design keeps the support relationship healthy:' })}
          </Body>
          <div className="mt-6 grid sm:grid-cols-2 gap-4">
            {[{ zh: '组织不是被动接受服务，而是主动承担成长责任；', en: 'The organization does not passively receive a service—it actively owns its own growth;' }, { zh: '支持方不是简单买单，而是为一次有价值的探索加速。', en: 'Supporters do not simply foot the bill—they accelerate a worthwhile exploration.' }].map((item) => (
              <div key={item.zh} className="rounded-[16px] bg-os-mist/40 ring-1 ring-os-line px-5 py-4 text-[14.5px] leading-7 text-os-ink/85">{t(item)}</div>
            ))}
          </div>
          <Quote className="mt-8">{t({ zh: '真正的陪伴，不是替组织做决定，而是让组织更有能力做决定。', en: 'True companionship does not make decisions for the organization—it makes the organization more capable of deciding.' })}</Quote>
        </Block>

        {/* 06 最终留下什么 */}
        <Block tone="canvas">
          <AccentLabel>{t({ zh: '最终留下什么', en: 'What It Leaves Behind' })}</AccentLabel>
          <SectionTitle>{t({ zh: '留下的不只是报告，而是一套可以复用的方法。', en: 'What remains is not a report, but a reusable method.' })}</SectionTitle>
          <div className="mt-8 grid sm:grid-cols-3 gap-4">
            {[
              { t: { zh: '给组织留下能力', en: 'Capability for the Organization' }, d: { zh: '更清晰的战略主线、更稳定的业务模式、更顺畅的团队协作、更强的复盘机制。', en: 'A clearer strategic line, a steadier business model, smoother collaboration, and a stronger review mechanism.' } },
              { t: { zh: '给领域留下方法', en: 'Method for the Field' }, d: { zh: '一套可理解、可传播、可借鉴的服务模型、行动路径、案例和工具。', en: 'A service model, action path, cases, and tools that are clear, shareable, and worth borrowing.' } },
              { t: { zh: '给支持方留下价值', en: 'Value for Supporters' }, d: { zh: '不是只看到一个项目完成，而是看到一个领域里新的可能性被验证出来。', en: 'Not just one completed project, but a new possibility proven out within a whole field.' } },
            ].map((c) => (
              <div key={c.t.zh} className="rounded-[18px] bg-os-paper ring-1 ring-os-line shadow-os p-6">
                <div className="h-1 w-8 rounded-full mb-4" style={{ background: ACCENT }} />
                <div className="font-serif-display text-[17px] font-semibold text-os-navy">{t(c.t)}</div>
                <p className="mt-2.5 text-[13.5px] leading-7 text-os-muted">{t(c.d)}</p>
              </div>
            ))}
          </div>
          <Quote className="mt-8">{t({ zh: '好的公益组织，不只是把事情做好，还能让别人理解为什么这样做有效。', en: 'A great nonprofit does not just do the work well—it helps others understand why it works.' })}</Quote>
        </Block>

        {/* 行动区 */}
        <div ref={actionRef}>
          <section className="bg-os-paper border-t border-os-line">
            <div className="mx-auto w-full max-w-[920px] px-5 sm:px-6 lg:px-8 py-16 sm:py-20">
              <AccentLabel>{t({ zh: '申请加入', en: 'Apply to Join' })}</AccentLabel>
              <h2 className="mt-4 font-serif-display text-[26px] sm:text-[34px] font-semibold leading-[1.3] tracking-tight text-os-navy">
                {t({ zh: '申请成为独角兽战略陪伴组织', en: 'Apply to Join the Unicorn Strategic Companionship' })}
              </h2>
              <p className="mt-5 max-w-2xl text-[15px] sm:text-[16px] leading-[1.9] text-os-muted">
                {t({ zh: '如果你不满足于把项目做完，而希望把一个领域里的新模式做出来，欢迎提交申请。我们优先选择：', en: 'If you are not content to merely finish projects but want to build a new model in your field, we welcome your application. We prioritize:' })}
              </p>
              <div className="mt-6 grid sm:grid-cols-2 gap-x-8 gap-y-3 max-w-[720px]">
                {[{ zh: '有长期行动基础的组织', en: 'Organizations with a long track record of action' }, { zh: '对问题变化有真实感知的组织', en: 'Organizations with a real sense of how the problem is changing' }, { zh: '愿意开放真实问题的组织', en: 'Organizations willing to share their real problems openly' }, { zh: '有模式外溢潜力的组织', en: 'Organizations whose model has potential to spread' }, { zh: '愿意共同投入三年成长的组织', en: 'Organizations ready to invest in three years of growth together' }].map((item) => (
                  <div key={item.zh} className="flex items-start gap-2.5 text-[14.5px] leading-7 text-os-ink/85">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: ACCENT }} />{t(item)}
                  </div>
                ))}
              </div>
              <div className="mt-9 flex flex-wrap items-center gap-3.5">
                <AccentButton onClick={apply}>{t({ zh: '提交组织申请', en: 'Submit Application' })}<ArrowRight className="h-4 w-4" /></AccentButton>
                <GhostButton onClick={becomeSupporter}>{t({ zh: '成为项目支持方', en: 'Become a Supporter' })}</GhostButton>
              </div>
              <div className="mt-12 border-t border-os-line pt-8">
                <Quote>{t({ zh: '支持一个组织，是为了让一个领域多一种可能。', en: 'Backing one organization opens up a new possibility for a whole field.' })}</Quote>
              </div>
            </div>
          </section>
        </div>
      </main>

      <OpenSourceFooter />

      {/* sticky 申请条 */}
      <div
        className="fixed inset-x-0 bottom-0 z-[80] pointer-events-none"
        style={{ opacity: showSticky ? 1 : 0, transform: showSticky ? 'translateY(0)' : 'translateY(20px)', transition: 'opacity 0.35s ease, transform 0.35s cubic-bezier(0.16,1,0.3,1)' }}
        aria-hidden={!showSticky}
      >
        <div className="mx-auto max-w-[860px] m-3 sm:m-4">
          <div className="pointer-events-auto flex items-center justify-between gap-3 sm:gap-5 rounded-2xl bg-os-paper/95 backdrop-blur-md ring-1 ring-os-line shadow-[0_20px_50px_-15px_rgba(20,35,63,0.25)] px-4 sm:px-6 py-3 sm:py-3.5">
            <div className="min-w-0 flex-1">
              <div className="text-[13px] sm:text-[14px] font-semibold text-os-navy truncate">{t({ zh: '独角兽战略陪伴项目', en: 'Unicorn Strategic Companionship' })}</div>
              <div className="mt-0.5 text-[11.5px] text-os-muted">{t({ zh: '3 年陪伴 · 最高 50% 配比 · 首批招募中', en: '3-year companionship · Up to 50% matching · First cohort recruiting' })}</div>
            </div>
            <AccentButton onClick={apply} small>{t({ zh: '提交组织申请', en: 'Submit Application' })}<ArrowRight className="h-4 w-4" /></AccentButton>
          </div>
        </div>
      </div>
    </div>
  );
}
