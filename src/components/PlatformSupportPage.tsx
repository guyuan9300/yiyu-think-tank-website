import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, LayoutGrid, GitBranch, PenLine, Brain, Bot, Settings, Upload, Workflow, Users, MessageCircle } from 'lucide-react';
import { Header } from './Header';
import { OpenSourceFooter } from './open-source-home/OpenSourceFooter';
import { Reveal } from './open-source-home/ui';
import { getYiyuPageAttrs } from '../lib/yiyuTongSiteMap';
import { ACCENT, Block, AccentLabel, SectionTitle, Body, Quote, PhotoSlot, FeatureCard, StepRow, AccentButton, GhostButton } from './projectPageKit';

// ============================================================
// 益语智库智能平台公益组织支持计划 · 项目介绍页 (配色/排版同前两个项目)
// 定位: 不是"免费送软件", 也不是"AI 工具培训", 而是——
//   把益语多年组织管理与行动方法装进开源 AI 工作平台, 再陪公益组织真正用起来。
// ============================================================

interface Props {
  onNavigate: (page: string, id?: string) => void;
}

export function PlatformSupportPage({ onNavigate }: Props) {
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
  const openSource = () => onNavigate('consult-apply');
  const showSticky = !topVisible && !actionVisible;

  return (
    <div {...getYiyuPageAttrs('platform-support')} className="min-h-screen bg-os-canvas text-os-ink antialiased font-sans">
      <Header onNavigate={(p) => onNavigate(p)} />

      <main className="pt-[68px]">
        {/* 顶部 · 项目概述 */}
        <div ref={topRef}>
          <section className="bg-os-paper border-b border-os-line">
            <div className="mx-auto w-full max-w-[920px] px-5 sm:px-6 lg:px-8 pt-9 pb-12">
              <button onClick={() => onNavigate('home')} className="mb-8 inline-flex items-center gap-1.5 text-[13px] font-medium text-os-muted hover:text-os-navy transition-colors">
                <ArrowLeft className="h-4 w-4" />返回
              </button>

              <Reveal><AccentLabel>益语智库智能平台 · 公益组织支持计划</AccentLabel></Reveal>
              <Reveal delay={70}>
                <h1 className="mt-4 max-w-[780px] font-serif-display text-[28px] sm:text-[38px] lg:text-[42px] font-semibold leading-[1.32] tracking-tight text-os-navy">
                  让公益组织不只是会用 AI，而是让 AI 进入组织工作。
                </h1>
              </Reveal>
              <Reveal delay={140}>
                <p className="mt-5 max-w-[710px] text-[15px] sm:text-[16px] leading-[1.9] text-os-muted">
                  平台本身开源免费，但真正困难的不是下载一个软件，而是把 AI 放进组织的真实业务里。这个项目提供免费使用辅导，帮助公益组织完成平台配置、资料整理、模型接入和工作流设计，让 AI 逐渐成为项目推进、资料沉淀、报告生成和组织复盘的工作后台。
                </p>
              </Reveal>
              <Reveal delay={200}>
                <div className="mt-7 flex flex-wrap items-center gap-x-3 gap-y-2">
                  {['平台开源免费', '面向民政注册公益组织', '提供配置与使用辅导'].map((t) => (
                    <span key={t} className="inline-flex items-center rounded-full bg-os-mist/70 ring-1 ring-os-line px-3.5 py-1.5 text-[12.5px] font-medium text-os-navy">{t}</span>
                  ))}
                </div>
              </Reveal>
              <Reveal delay={260}>
                <div className="mt-8 flex flex-wrap items-center gap-3.5">
                  <AccentButton onClick={apply}>提交组织申请<ArrowRight className="h-4 w-4" /></AccentButton>
                  <GhostButton onClick={openSource}>了解平台开源说明</GhostButton>
                </div>
              </Reveal>
              <Reveal delay={320}>
                <div className="mt-10"><PhotoSlot label="平台工作台 / 使用辅导截图" ratio="aspect-[16/8]" /></div>
              </Reveal>
            </div>
          </section>
        </div>

        {/* 01 主张金句 */}
        <Block tone="canvas">
          <Quote>AI 真正有用，不是因为它会回答，而是因为它能进入组织每天的工作。</Quote>
        </Block>

        {/* 02 为什么需要它 */}
        <Block tone="paper">
          <AccentLabel>为什么需要它</AccentLabel>
          <SectionTitle>公益组织最缺的，不是更多工具，而是能承接真实工作的后台。</SectionTitle>
          <Body>
            很多公益组织已经开始尝试 AI，但大多数使用仍停留在“问一问、写一段、改一篇”的层面。真正进入项目时，问题马上出现：过去资料太散，AI 不知道背景；项目周期太长，AI 接不上历史；结项报告要查大量文件，AI 又容易编；同事之间信息不同步，每个人问 AI 得到的答案也不一致。
          </Body>
          <Body>
            所以公益组织需要的不是一个更聪明的聊天框，而是一个能理解组织资料、项目过程和工作流的 AI 平台。
          </Body>
          <Quote className="mt-8">公益组织不是不会用 AI，而是缺少让 AI 理解自己工作的环境。</Quote>
        </Block>

        {/* 03 平台能帮组织接住什么 */}
        <Block tone="canvas">
          <AccentLabel>平台能帮组织接住什么</AccentLabel>
          <SectionTitle>把资料、项目、任务、报告和复盘放进同一个工作台。</SectionTitle>
          <Body>益语智库智能平台不是单点工具，而是一套围绕组织行动设计的 AI 工作系统。它可以帮助公益组织逐步建立：</Body>
          <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { icon: LayoutGrid, t: '项目工作台', d: '每个项目有自己的资料、会议、任务、文件和判断，不再混在一起。' },
              { icon: GitBranch, t: '事件线', d: '项目中发生过什么、谁做了什么、留下了什么附件，都可以沿着时间线追溯。' },
              { icon: PenLine, t: '智能编辑', d: '写报告、方案、说明时，AI 可以读取项目背景和资料来源，减少空话和错漏。' },
              { icon: Brain, t: '公司大脑', d: '把已确认的信息、线索和待澄清事项分开，避免 AI 把不确定内容写成事实。' },
              { icon: Bot, t: 'AI 同事', d: '让 AI 参与整理资料、拆解任务、生成草稿和提醒下一步，但关键判断仍由人确认。' },
            ].map((c) => (
              <FeatureCard key={c.t} icon={c.icon} title={c.t} desc={c.d} />
            ))}
          </div>
          <Quote className="mt-8">不是把资料交给 AI，而是让资料变成组织可以继续使用的记忆。</Quote>
        </Block>

        {/* 04 我们怎么支持 */}
        <Block tone="mist">
          <AccentLabel>我们怎么支持</AccentLabel>
          <SectionTitle>免费的不只是软件，还有真正用起来的陪伴。</SectionTitle>
          <Body>平台开源免费，但公益组织要真正用起来，仍然需要有人陪它走过第一段路。这个项目提供的支持包括：</Body>
          <div className="mt-8 space-y-4">
            <StepRow no={1} icon={Settings} tag="第一步" title="平台安装与基础配置" desc="帮助组织完成账号、工作台、模型接入、权限和基础使用环境配置。" />
            <StepRow no={2} icon={Upload} tag="第二步" title="资料整理与导入" desc="协助组织梳理已有项目资料、会议记录、报告、合同、票据和附件，明确哪些内容可以进入工作台。" />
            <StepRow no={3} icon={Workflow} tag="第三步" title="项目工作流设计" desc="围绕组织真实业务，设计项目推进、事件线、报告生成、任务拆解和复盘流程。" />
            <StepRow no={4} icon={Users} tag="第四步" title="团队使用培训" desc="帮助项目人员、负责人和资料管理人员理解如何在日常工作中使用平台，而不是只把它当成 AI 问答工具。" />
            <StepRow no={5} icon={MessageCircle} tag="第五步" title="一对一答疑" desc="在初期使用中，针对模型配置、文件导入、报告生成、事实澄清和工作流使用提供答疑。" />
          </div>
          <Quote className="mt-8">开源让软件免费，陪伴让软件真正进入组织。</Quote>
        </Block>

        {/* 05 谁可以申请 */}
        <Block tone="paper">
          <AccentLabel>谁可以申请</AccentLabel>
          <SectionTitle>我们优先支持真正愿意把 AI 用进项目里的公益组织。</SectionTitle>
          <Body>本项目面向中国境内依法登记、民政注册的公益慈善组织开放。</Body>
          <div className="mt-8 grid sm:grid-cols-2 gap-5">
            <div className="rounded-[18px] p-6 ring-1" style={{ background: 'rgba(46,165,111,0.06)', borderColor: 'rgba(46,165,111,0.25)' }}>
              <div className="font-serif-display text-[17px] font-semibold text-os-navy">我们优先支持</div>
              <ul className="mt-3 space-y-2">
                {['正在执行长期公益项目的组织', '项目资料较多、结项报告压力大的组织', '希望提升内部协作和项目管理能力的组织', '愿意开放真实项目资料进行试点的组织', '有专人负责平台使用和内部推广的组织', '希望把 AI 从“写稿工具”升级为“项目工作流”的组织'].map((t) => (
                  <li key={t} className="flex items-start gap-2.5 text-[14px] leading-7 text-os-ink/85"><span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: ACCENT }} />{t}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-[18px] bg-os-canvas ring-1 ring-os-line p-6">
              <div className="font-serif-display text-[17px] font-semibold text-os-muted">不太适合</div>
              <ul className="mt-3 space-y-2">
                {['只想临时让 AI 帮写一篇文章', '不愿意整理任何历史资料', '没有实际项目场景', '没有人负责后续使用', '期待 AI 替代组织做最终判断'].map((t) => (
                  <li key={t} className="flex items-start gap-2.5 text-[14px] leading-7 text-os-muted"><span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-os-line" />{t}</li>
                ))}
              </ul>
            </div>
          </div>
          <Quote className="mt-8">我们支持的不是“想试试 AI”的组织，而是愿意把工作重新整理一遍的组织。</Quote>
        </Block>

        {/* 06 最终留下什么 */}
        <Block tone="canvas">
          <AccentLabel>最终留下什么</AccentLabel>
          <SectionTitle>留下的不只是一个账号，而是一套组织数字能力。</SectionTitle>
          <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { t: '留下一个工作台', d: '组织不再靠微信群、个人电脑和零散文件维持项目记忆。' },
              { t: '留下一条事件线', d: '项目发生过什么、留下了什么证据、对应什么报告，都可以追溯。' },
              { t: '留下一套 AI 工作流', d: 'AI 不只是写文案，而是参与资料整理、任务拆解、事实澄清、报告生成和复盘。' },
              { t: '留下一批组织资产', d: '项目资料、服务经验、报告内容和工作方法，不再只停留在个人脑子里。' },
            ].map((c) => (
              <div key={c.t} className="rounded-[18px] bg-os-paper ring-1 ring-os-line shadow-os p-6">
                <div className="h-1 w-8 rounded-full mb-4" style={{ background: ACCENT }} />
                <div className="font-serif-display text-[16px] font-semibold text-os-navy">{c.t}</div>
                <p className="mt-2.5 text-[13.5px] leading-7 text-os-muted">{c.d}</p>
              </div>
            ))}
          </div>
          <Quote className="mt-8">公益组织真正需要的，不是更会写稿的 AI，而是能让经验留下来的系统。</Quote>
        </Block>

        {/* 行动区 */}
        <div ref={actionRef}>
          <section className="bg-os-paper border-t border-os-line">
            <div className="mx-auto w-full max-w-[920px] px-5 sm:px-6 lg:px-8 py-16 sm:py-20">
              <AccentLabel>申请加入</AccentLabel>
              <h2 className="mt-4 font-serif-display text-[26px] sm:text-[34px] font-semibold leading-[1.3] tracking-tight text-os-navy">
                申请公益组织智能平台支持
              </h2>
              <p className="mt-5 max-w-2xl text-[15px] sm:text-[16px] leading-[1.9] text-os-muted">
                如果你的组织已经民政注册，并且正在执行真实公益项目，欢迎申请益语智库智能平台免费使用辅导。我们会优先支持资料较多、项目周期较长、协作压力较大，并且愿意把 AI 工作流真正接入组织日常工作的公益慈善组织。
              </p>
              <div className="mt-9 flex flex-wrap items-center gap-3.5">
                <AccentButton onClick={apply}>提交组织申请<ArrowRight className="h-4 w-4" /></AccentButton>
                <GhostButton onClick={openSource}>了解平台开源说明</GhostButton>
              </div>
              <p className="mt-6 max-w-2xl text-[12.5px] leading-7 text-os-muted/75">
                平台开源免费。模型调用、云空间、文件解析等可能产生实际成本，具体以申请后的使用方案为准。
              </p>
              <div className="mt-10 border-t border-os-line pt-8">
                <Quote>让公益组织把更多时间还给服务对象，把更少时间浪费在重复整理里。</Quote>
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
              <div className="text-[13px] sm:text-[14px] font-semibold text-os-navy truncate">益语智库智能平台 · 公益组织支持计划</div>
              <div className="mt-0.5 text-[11.5px] text-os-muted">开源免费 · 面向民政注册公益组织 · 免费使用辅导</div>
            </div>
            <AccentButton onClick={apply} small>提交组织申请<ArrowRight className="h-4 w-4" /></AccentButton>
          </div>
        </div>
      </div>
    </div>
  );
}
