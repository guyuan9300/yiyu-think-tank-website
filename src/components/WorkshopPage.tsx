import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, ScanSearch, Workflow, Database, Bot } from 'lucide-react';
import { Header } from './Header';
import { OpenSourceFooter } from './open-source-home/OpenSourceFooter';
import { Reveal } from './open-source-home/ui';
import { getYiyuPageAttrs } from '../lib/yiyuTongSiteMap';
import { ACCENT, Block, AccentLabel, SectionTitle, Body, Quote, PhotoSlot, FeatureCard, StepRow, AccentButton, GhostButton } from './projectPageKit';
import { useLang } from '../lib/i18n';

// ============================================================
// 数字化战略工作坊 · 项目介绍页 (配色/排版同独角兽, 文档式金句型)
// 定位: 不是 AI 培训, 而是行动者的数字化战略启蒙——
//   帮行动者把专业经验、组织问题和 AI 工作流重新接起来。
// ============================================================

interface Props {
  onNavigate: (page: string, id?: string) => void;
}

export function WorkshopPage({ onNavigate }: Props) {
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
  const viewSop = () => onNavigate('consult-apply');
  const showSticky = !topVisible && !actionVisible;

  return (
    <div {...getYiyuPageAttrs('digital-workshop')} className="min-h-screen bg-os-canvas text-os-ink antialiased font-sans">
      <Header onNavigate={(p) => onNavigate(p)} />

      <main className="pt-[68px]">
        {/* 顶部 · 项目概述 */}
        <div ref={topRef}>
          <section className="bg-os-paper border-b border-os-line">
            <div className="mx-auto w-full max-w-[920px] px-5 sm:px-6 lg:px-8 pt-9 pb-12">
              <button onClick={() => onNavigate('home')} className="mb-8 inline-flex items-center gap-1.5 text-[13px] font-medium text-os-muted hover:text-os-navy transition-colors">
                <ArrowLeft className="h-4 w-4" />{t({ zh: '返回', en: 'Back' })}
              </button>

              <Reveal><AccentLabel>{t({ zh: '数字化战略工作坊', en: 'Digital Strategy Workshop' })}</AccentLabel></Reveal>
              <Reveal delay={70}>
                <h1 className="mt-4 max-w-[760px] font-serif-display text-[28px] sm:text-[38px] lg:text-[42px] font-semibold leading-[1.32] tracking-tight text-os-navy">
                  {t({ zh: '让行动者不只是会用 AI，而是会用 AI 重新组织工作。', en: 'Help changemakers not just use AI, but use AI to reorganize how they work.' })}
                </h1>
              </Reveal>
              <Reveal delay={140}>
                <p className="mt-5 max-w-[700px] text-[15px] sm:text-[16px] leading-[1.9] text-os-muted">
                  {t({ zh: '数字化战略工作坊面向公益组织、社会企业、地区枢纽和行动者社群。它不是一次工具培训，而是一次战略梳理与数字化工作流重构。我们希望行动者带着真实问题进入工作坊：一个项目、一个组织、一个服务场景、一套资料，最终带走一份更清晰的问题判断、一张业务流程图、一套 AI 工作流雏形和下一步行动计划。', en: 'The Digital Strategy Workshop is for nonprofits, social enterprises, regional hubs, and changemaker communities. It is not a tool tutorial but a session for clarifying strategy and rebuilding digital workflows. Participants bring a real problem—a project, an organization, a service scenario, a body of material—and leave with a sharper read on the problem, a business process map, a first AI workflow, and a next-step action plan.' })}
                </p>
              </Reveal>
              <Reveal delay={200}>
                <div className="mt-7 flex flex-wrap items-center gap-x-3 gap-y-2">
                  {[{ zh: '2 天工作坊', en: '2-day workshop' }, { zh: '地方枢纽共办', en: 'Co-hosted with local hubs' }, { zh: '益语支持导师与工作坊费用', en: 'Yiyu covers mentors and workshop costs' }].map((tag) => (
                    <span key={tag.zh} className="inline-flex items-center rounded-full bg-os-mist/70 ring-1 ring-os-line px-3.5 py-1.5 text-[12.5px] font-medium text-os-navy">{t(tag)}</span>
                  ))}
                </div>
              </Reveal>
              <Reveal delay={260}>
                <div className="mt-8 flex flex-wrap items-center gap-3.5">
                  <AccentButton onClick={apply}>{t({ zh: '申请共办工作坊', en: 'Apply to Co-Host' })}<ArrowRight className="h-4 w-4" /></AccentButton>
                  <GhostButton onClick={viewSop}>{t({ zh: '了解工作坊 SOP', en: 'View Workshop SOP' })}</GhostButton>
                </div>
              </Reveal>
              <Reveal delay={320}>
                <div className="mt-10"><PhotoSlot label={t({ zh: '工作坊现场 / 共创照片', en: 'Workshop / co-creation photo' })} ratio="aspect-[16/8]" /></div>
              </Reveal>
            </div>
          </section>
        </div>

        {/* 01 主张金句 */}
        <Block tone="canvas">
          <Quote>{t({ zh: 'AI 不是答案，AI 是把工作重新组织起来的机会。', en: 'AI is not the answer—it is a chance to reorganize how work gets done.' })}</Quote>
        </Block>

        {/* 02 为什么需要它 */}
        <Block tone="paper">
          <AccentLabel>{t({ zh: '为什么需要它', en: 'Why It Matters' })}</AccentLabel>
          <SectionTitle>{t({ zh: '行动者缺的不是热情，而是把复杂问题看清楚的方法。', en: 'Changemakers do not lack passion—they lack a way to see complex problems clearly.' })}</SectionTitle>
          <Body>
            {t({ zh: '很多公益组织和行动者长期在一线工作，最了解服务对象，也积累了大量经验。但经验越多，越容易被日常事务淹没：项目在推进，资料在增加，会议在发生，报告在生成，可组织真正沉淀下来的东西却很少。', en: 'Many nonprofits and changemakers work on the front lines for years, know their communities best, and accumulate deep experience. But the more experience they gather, the easier it is to be buried by daily work—projects run, materials pile up, meetings happen, reports get written, yet little is truly retained by the organization.' })}
          </Body>
          <Body>
            {t({ zh: '更大的问题是，很多社会问题已经发生深层变化。如果只在现象层找答案，项目会越来越像重复执行；如果不能往下追问根因，就很难设计新的回应方式。', en: 'The bigger issue is that many social problems have shifted at a deep level. If you only look for answers at the surface, projects increasingly become rote execution; without digging into root causes, it is hard to design new responses.' })}
          </Body>
          <Quote className="mt-8">{t({ zh: '专业经验很重要，但经验需要被整理成方法，方法需要被设计成流程。', en: 'Expertise matters, but experience must be turned into method, and method into process.' })}</Quote>
        </Block>

        {/* 03 四个卡点 */}
        <Block tone="canvas">
          <AccentLabel>{t({ zh: '工作坊解决的四个卡点', en: 'Four Bottlenecks the Workshop Tackles' })}</AccentLabel>
          <SectionTitle>{t({ zh: '从现象、管理、资料、AI 四个入口，重新梳理行动能力。', en: 'Rebuild your capacity to act through four entry points: problems, management, materials, and AI.' })}</SectionTitle>
          <div className="mt-8 grid sm:grid-cols-2 gap-4">
            {[
              { icon: ScanSearch, t: { zh: '看深问题', en: 'See Problems Deeper' }, d: { zh: '帮助行动者从表层现象往下追问：服务对象处境如何变化？问题的根因在哪里？原来的解决方案为什么不够了？', en: 'Help changemakers probe beneath the surface: how is the community’s situation changing? Where do the root causes lie? Why are the old solutions no longer enough?' } },
              { icon: Workflow, t: { zh: '理顺业务', en: 'Streamline Operations' }, d: { zh: '把组织正在做的事拆成目标、流程、角色、协作、交付和复盘，找到经营管理里的盲区。', en: 'Break down what the organization does into goals, processes, roles, collaboration, delivery, and review—and find the management blind spots.' } },
              { icon: Database, t: { zh: '沉淀资料', en: 'Capture Knowledge' }, d: { zh: '把散落在个人经验、文件夹、微信群、会议纪要里的资料，整理成组织可以继续使用的数字资产。', en: 'Turn material scattered across personal memory, folders, chat groups, and meeting notes into digital assets the organization can keep using.' } },
              { icon: Bot, t: { zh: '设计 AI 工作流', en: 'Design AI Workflows' }, d: { zh: '不再只是问 AI 写一段话，而是把真实业务流程设计成 AI 可以参与、协助和复盘的工作流。', en: 'Move beyond asking AI to draft a paragraph—design real business processes into workflows AI can join, assist, and review.' } },
            ].map((c) => (
              <FeatureCard key={c.t.zh} icon={c.icon} title={t(c.t)} desc={t(c.d)} />
            ))}
          </div>
          <Quote className="mt-8">{t({ zh: '好的数字化，不是把工具搬进组织，而是让组织的经验可以被持续调用。', en: 'Good digitalization is not about moving tools into the organization—it is about making the organization’s experience continuously reusable.' })}</Quote>
        </Block>

        {/* 04 怎么发生 · 2 天 */}
        <Block tone="mist">
          <AccentLabel>{t({ zh: '工作坊怎么发生', en: 'How the Workshop Runs' })}</AccentLabel>
          <SectionTitle>{t({ zh: '2 天集中工作坊，把真实问题带进来，把行动方案带出去。', en: 'A focused 2-day workshop: bring in a real problem, leave with an action plan.' })}</SectionTitle>
          <Body>{t({ zh: '这个工作坊不是听课型培训，而是共创型工作坊。参与者需要带着真实项目、真实资料和真实问题进入现场。', en: 'This is a co-creation workshop, not a lecture. Participants come with a real project, real materials, and a real problem.' })}</Body>
          <div className="mt-8 space-y-4">
            <StepRow no={1} icon={ScanSearch} tag={t({ zh: '第一天', en: 'Day 1' })} title={t({ zh: '看清问题与业务主线', en: 'Clarify the Problem and Core Workstream' })} bullets={[
              t({ zh: '梳理服务对象和社会问题变化；', en: 'Map how the community and the social problem are changing;' }),
              t({ zh: '找出项目或组织真正卡住的地方；', en: 'Find where the project or organization is truly stuck;' }),
              t({ zh: '拆解当前业务流程；', en: 'Break down the current business process;' }),
              t({ zh: '明确未来一段时间最重要的行动主线。', en: 'Define the most important workstream for the period ahead.' }),
            ]} />
            <StepRow no={2} icon={Bot} tag={t({ zh: '第二天', en: 'Day 2' })} title={t({ zh: '设计数字资产与 AI 工作流', en: 'Design Digital Assets and AI Workflows' })} bullets={[
              t({ zh: '整理已有资料和关键证据；', en: 'Organize existing materials and key evidence;' }),
              t({ zh: '识别哪些内容可以成为组织资产；', en: 'Identify which content can become organizational assets;' }),
              t({ zh: '设计 AI 可以参与的工作流程；', en: 'Design workflows that AI can take part in;' }),
              t({ zh: '形成工作台雏形、任务包和下一步行动计划。', en: 'Produce a workbench prototype, task package, and next-step action plan.' }),
            ]} />
          </div>
          <div className="mt-8"><PhotoSlot label={t({ zh: '两天工作坊 / 共创过程照片', en: 'Two-day workshop / co-creation photo' })} ratio="aspect-[16/7]" /></div>
          <Quote className="mt-8">{t({ zh: '听懂 AI 不难，难的是把自己的工作设计成 AI 能帮得上忙的样子。', en: 'Understanding AI is easy; the hard part is shaping your own work so AI can actually help.' })}</Quote>
        </Block>

        {/* 05 谁适合共办 */}
        <Block tone="paper">
          <AccentLabel>{t({ zh: '谁适合共办', en: 'Who Should Co-Host' })}</AccentLabel>
          <SectionTitle>{t({ zh: '我们寻找的不是场地，而是地方行动者的组织入口。', en: 'We are looking not for a venue, but for an entry point into a local changemaker network.' })}</SectionTitle>
          <Body>
            {t({ zh: '这个项目优先面向地区枢纽组织、平台型机构、公益支持平台、城市行动者组织、数字游民社群或社会创新服务机构开放共办。', en: 'Co-hosting is open first to regional hubs, platform organizations, nonprofit support platforms, urban changemaker groups, digital-nomad communities, and social-innovation service agencies.' })}
          </Body>
          <div className="mt-8 grid sm:grid-cols-2 gap-5">
            <div className="rounded-[18px] bg-os-canvas ring-1 ring-os-line p-6">
              <div className="font-serif-display text-[17px] font-semibold text-os-navy">{t({ zh: '共办方承担本地执行', en: 'Co-Host Handles Local Execution' })}</div>
              <ul className="mt-3 space-y-2">
                {[{ zh: '本地组织动员', en: 'Local mobilization' }, { zh: '场地和基础物料', en: 'Venue and basic materials' }, { zh: '参与者招募', en: 'Participant recruitment' }, { zh: '现场执行协调', en: 'On-site coordination' }, { zh: '后续社群维护', en: 'Ongoing community upkeep' }].map((item) => (
                  <li key={item.zh} className="flex items-start gap-2.5 text-[14px] leading-7 text-os-ink/85"><span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: ACCENT }} />{t(item)}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-[18px] p-6 ring-1" style={{ background: 'rgba(46,165,111,0.06)', borderColor: 'rgba(46,165,111,0.25)' }}>
              <div className="font-serif-display text-[17px] font-semibold text-os-navy">{t({ zh: '益语智库支持', en: 'Yiyu Institute Provides' })}</div>
              <ul className="mt-3 space-y-2">
                {[{ zh: '导师费用', en: 'Mentor fees' }, { zh: '工作坊设计', en: 'Workshop design' }, { zh: '方法材料', en: 'Method materials' }, { zh: 'AI 工作流工具', en: 'AI workflow tools' }, { zh: '远程或现场引导', en: 'Remote or on-site facilitation' }, { zh: '部分后续答疑和复盘', en: 'Some follow-up support and review' }].map((item) => (
                  <li key={item.zh} className="flex items-start gap-2.5 text-[14px] leading-7 text-os-ink/85"><span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: ACCENT }} />{t(item)}</li>
                ))}
              </ul>
            </div>
          </div>
          <Quote className="mt-8">{t({ zh: '地方组织负责把人聚起来，益语负责把方法和工作流带进去。', en: 'Local partners bring the people together; Yiyu brings the method and the workflows.' })}</Quote>
        </Block>

        {/* 06 最终留下什么 */}
        <Block tone="canvas">
          <AccentLabel>{t({ zh: '最终留下什么', en: 'What It Leaves Behind' })}</AccentLabel>
          <SectionTitle>{t({ zh: '工作坊结束，不是培训结束，而是一个行动系统开始。', en: 'The end of the workshop is not the end of training—it is the start of an action system.' })}</SectionTitle>
          <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { t: { zh: '给行动者留下', en: 'For Changemakers' }, d: { zh: '一份更清晰的问题判断，一套可执行的行动主线。', en: 'A sharper read on the problem and an executable line of action.' } },
              { t: { zh: '给组织留下', en: 'For the Organization' }, d: { zh: '一批被整理过的资料，一张业务流程图，一个 AI 工作流雏形。', en: 'Organized materials, a business process map, and a first AI workflow.' } },
              { t: { zh: '给地方留下', en: 'For the Locality' }, d: { zh: '一批更会使用数字化和 AI 的行动者，一个可持续运营的共学社群。', en: 'A cohort of changemakers fluent in digital tools and AI, and a sustainable learning community.' } },
              { t: { zh: '给行业留下', en: 'For the Sector' }, d: { zh: '一套可以复制到不同城市、不同公益议题、不同组织场景里的工作坊方法。', en: 'A workshop method that can be replicated across cities, causes, and organizational contexts.' } },
            ].map((c) => (
              <div key={c.t.zh} className="rounded-[18px] bg-os-paper ring-1 ring-os-line shadow-os p-6">
                <div className="h-1 w-8 rounded-full mb-4" style={{ background: ACCENT }} />
                <div className="font-serif-display text-[16px] font-semibold text-os-navy">{t(c.t)}</div>
                <p className="mt-2.5 text-[13.5px] leading-7 text-os-muted">{t(c.d)}</p>
              </div>
            ))}
          </div>
          <Quote className="mt-8">{t({ zh: '工作坊真正的成果，不是大家学会了什么，而是大家回去以后能开始改变什么。', en: 'The real result of the workshop is not what people learned, but what they can start to change once they are back.' })}</Quote>
        </Block>

        {/* 行动区 */}
        <div ref={actionRef}>
          <section className="bg-os-paper border-t border-os-line">
            <div className="mx-auto w-full max-w-[920px] px-5 sm:px-6 lg:px-8 py-16 sm:py-20">
              <AccentLabel>{t({ zh: '申请共办', en: 'Apply to Co-Host' })}</AccentLabel>
              <h2 className="mt-4 font-serif-display text-[26px] sm:text-[34px] font-semibold leading-[1.3] tracking-tight text-os-navy">
                {t({ zh: '申请共办数字化战略工作坊', en: 'Apply to Co-Host the Digital Strategy Workshop' })}
              </h2>
              <p className="mt-5 max-w-2xl text-[15px] sm:text-[16px] leading-[1.9] text-os-muted">
                {t({ zh: '如果你所在的地区或平台聚集了一批正在认真做事的公益组织、社会企业、青年行动者或小团队，欢迎申请共办。我们优先选择：', en: 'If your region or platform has gathered nonprofits, social enterprises, young changemakers, or small teams doing serious work, we welcome your application to co-host. We prioritize:' })}
              </p>
              <div className="mt-6 grid sm:grid-cols-2 gap-x-8 gap-y-3 max-w-[760px]">
                {[{ zh: '有本地行动者网络的组织', en: 'Organizations with a local changemaker network' }, { zh: '能承担现场执行的合作方', en: 'Partners able to handle on-site execution' }, { zh: '能组织真实项目参与的枢纽机构', en: 'Hubs that can rally real projects to join' }, { zh: '愿意在工作坊后持续陪伴本地行动者的伙伴', en: 'Partners willing to keep supporting local changemakers afterward' }, { zh: '希望推动公益组织数字化和 AI 工作流应用的地区平台', en: 'Regional platforms eager to advance nonprofit digitalization and AI workflows' }].map((item) => (
                  <div key={item.zh} className="flex items-start gap-2.5 text-[14.5px] leading-7 text-os-ink/85">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: ACCENT }} />{t(item)}
                  </div>
                ))}
              </div>
              <div className="mt-9 flex flex-wrap items-center gap-3.5">
                <AccentButton onClick={apply}>{t({ zh: '申请共办工作坊', en: 'Apply to Co-Host' })}<ArrowRight className="h-4 w-4" /></AccentButton>
                <GhostButton onClick={viewSop}>{t({ zh: '了解工作坊 SOP', en: 'View Workshop SOP' })}</GhostButton>
              </div>
              <div className="mt-12 border-t border-os-line pt-8">
                <Quote>{t({ zh: '一个地方真正需要的，不只是更多活动，而是一批更会组织行动的人。', en: 'What a place truly needs is not more events, but more people who know how to organize action.' })}</Quote>
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
              <div className="text-[13px] sm:text-[14px] font-semibold text-os-navy truncate">{t({ zh: '数字化战略工作坊', en: 'Digital Strategy Workshop' })}</div>
              <div className="mt-0.5 text-[11.5px] text-os-muted">{t({ zh: '2 天工作坊 · 地方枢纽共办 · 开放共办申请', en: '2-day workshop · Co-hosted with local hubs · Applications open' })}</div>
            </div>
            <AccentButton onClick={apply} small>{t({ zh: '申请共办工作坊', en: 'Apply to Co-Host' })}<ArrowRight className="h-4 w-4" /></AccentButton>
          </div>
        </div>
      </div>
    </div>
  );
}
