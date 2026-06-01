import {
  Search, Workflow, Repeat,
  ChevronDown, ArrowRight, type LucideIcon,
} from 'lucide-react';
import { Button, Reveal } from '../ui';
import { useLang, type Bilingual } from '../../../lib/i18n';

// ============================================================
// 首页三屏滚动叙事 v4 —— 全部围绕核心定位「可落地的增长咨询」。
//   ① 是什么: 核心定位 + "增长不只是收入"的范围
//   ② 凭什么"可落地": 典型问题 → 益语介入后结果 (别人给观点, 我们交结果)
//   ③ 怎么落: 成长合伙人 前期→中期→后期
// 三种不同版式(声明 / before→after 清单 / 时间线), 内容取自《介绍文档·详细版》。
// ============================================================

const HSS_CSS = `
.hss-grid { position:absolute; inset:0; pointer-events:none;
  background-image: radial-gradient(circle, rgba(22,38,94,0.07) 1px, transparent 1px);
  background-size: 26px 26px;
  -webkit-mask-image: radial-gradient(ellipse 78% 68% at 50% 42%, #000 26%, transparent 84%);
          mask-image: radial-gradient(ellipse 78% 68% at 50% 42%, #000 26%, transparent 84%); }
.hss-grid-dark { background-image: radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px); }
.hss-row { transition: background-color .3s ease; }
.hss-row:hover { background-color: rgba(255,255,255,0.55); }
@keyframes hssChevron { 0%,100%{transform:translateY(0);opacity:.55} 50%{transform:translateY(5px);opacity:1} }
.hss-chevron { animation: hssChevron 1.8s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) { .hss-chevron { animation: none !important; } .hss-row { transition:none !important; } }
`;

// 我们说的"增长"不只是收入 (双语)
const GROWTH: Bilingual[] = [
  { zh: '影响力', en: 'Impact' },
  { zh: '筹款能力', en: 'Fundraising' },
  { zh: '业务模式', en: 'Business model' },
  { zh: '品牌信任', en: 'Brand trust' },
  { zh: '组织效率', en: 'Org. efficiency' },
  { zh: '数字化能力', en: 'Digital capability' },
];

// 凭什么"可落地": 你常遇到的状态 → 益语介入后的结果 (文档·典型问题表)
const OUTCOMES: { before: Bilingual; after: Bilingual }[] = [
  {
    before: { zh: '战略想法很多，方向却不清', en: 'Plenty of ideas, but no clear direction' },
    after: { zh: '清晰的阶段目标、优先级与成功标准', en: 'Clear milestones, priorities & success metrics' },
  },
  {
    before: { zh: '项目很多，却各自为战', en: 'Many projects, all working in silos' },
    after: { zh: '重构项目组合，服务组织长期战略', en: 'A coherent portfolio serving long-term strategy' },
  },
  {
    before: { zh: '团队很忙，协作却低效', en: 'A busy team, but low-efficiency collaboration' },
    after: { zh: '任务、会议、复盘之间的协作闭环', en: 'A closed loop across tasks, meetings & reviews' },
  },
  {
    before: { zh: '资料和经验散落各处', en: 'Knowledge and experience scattered everywhere' },
    after: { zh: '知识底座 + AI，随时可被调用', en: 'A knowledge base + AI, ready on demand' },
  },
  {
    before: { zh: '都说要用 AI，却用不起来', en: 'Everyone talks AI, but no one really uses it' },
    after: { zh: '做成团队真正能用的"业务应用"', en: 'AI turned into apps your team actually uses' },
  },
];

const STEPS: { icon: LucideIcon; stage: Bilingual; title: Bilingual; body: Bilingual }[] = [
  {
    icon: Search,
    stage: { zh: '前期', en: 'Discover' },
    title: { zh: '梳理与诊断', en: 'Map & Diagnose' },
    body: { zh: '系统梳理资料、看清现状，区分表面现象与真实卡点。', en: 'We organize your materials, read the real situation, and separate surface symptoms from the true bottlenecks.' },
  },
  {
    icon: Workflow,
    stage: { zh: '中期', en: 'Co-create' },
    title: { zh: '共创战略与机制', en: 'Co-create Strategy & Mechanisms' },
    body: { zh: '一起对齐方向，把战略拆成路径、项目、角色与节奏。', en: 'We align on direction together, breaking strategy into pathways, projects, roles and rhythm.' },
  },
  {
    icon: Repeat,
    stage: { zh: '后期', en: 'Accompany' },
    title: { zh: '陪伴落地、沉淀能力', en: 'Land it & Build lasting capability' },
    body: { zh: '持续推进与校准，把可复制的部分沉淀为组织能力。', en: 'We keep driving and calibrating, turning what works into capability the organization keeps.' },
  },
];

interface HomeScrollStoryProps {
  onNavigate?: (page: string) => void;
}

export function HomeScrollStory({ onNavigate }: HomeScrollStoryProps) {
  const go = (page: string) => onNavigate?.(page);
  const { t } = useLang();

  return (
    <div id="home">
      <style>{HSS_CSS}</style>

      {/* ① 核心定位 */}
      <section className="relative min-h-[100svh] flex items-center justify-center px-6 py-24 bg-os-canvas overflow-hidden">
        <div className="hss-grid" aria-hidden="true" />
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          <div className="absolute top-[-12%] left-[6%] w-[42%] h-[55%] rounded-full bg-os-navy/[0.05] blur-[130px]" />
          <div className="absolute bottom-[-10%] right-[8%] w-[38%] h-[52%] rounded-full bg-os-blue/[0.06] blur-[130px]" />
        </div>

        <div className="relative z-10 w-full max-w-3xl mx-auto text-center">
          <Reveal>
            <div className="flex items-center justify-center gap-2.5 mb-7">
              <span className="h-px w-7 bg-os-blue/70" />
              <span className="text-[12px] font-semibold tracking-[0.2em] text-os-blue">{t({ zh: '益语智库 · 助力组织持续增长的战略陪伴者', en: 'Yiyu Institute · Strategy partner for lasting growth' })}</span>
              <span className="h-px w-7 bg-os-blue/70" />
            </div>
            <h1 className="font-serif-display text-[36px] sm:text-[50px] lg:text-[60px] font-semibold leading-[1.18] tracking-tight text-os-navy">
              {t({ zh: '可落地的', en: 'Growth consulting' })}<span className="text-ink-accent">{t({ zh: '增长咨询', en: ' that lands' })}</span>
            </h1>
            <p className="mt-7 text-[16px] sm:text-[18px] leading-[1.85] text-os-muted max-w-2xl mx-auto">
              {t({ zh: '我们不停在观点和漂亮的 PPT——而是陪你把方向变成机制、把机制变成行动、把行动沉淀为组织能持续使用的能力。', en: 'We don’t stop at opinions and polished decks. We help you turn direction into mechanisms, mechanisms into action, and action into capability your organization keeps using.' })}
            </p>
          </Reveal>

          {/* 增长不只是收入 */}
          <Reveal delay={120}>
            <div className="mt-9">
              <div className="text-[12px] tracking-[0.16em] text-os-muted/60 mb-4">{t({ zh: '我们说的"增长"，不只是收入', en: 'By "growth", we mean far more than revenue' })}</div>
              <div className="flex flex-wrap items-center justify-center gap-2.5">
                {GROWTH.map((g) => (
                  <span key={g.zh} className="px-4 py-2 rounded-full bg-os-paper ring-1 ring-os-line text-[13.5px] font-medium text-os-navy/85">
                    {t(g)}
                  </span>
                ))}
              </div>
            </div>
          </Reveal>

          <Reveal delay={200}>
            <div className="mt-10 flex flex-col sm:flex-row gap-4 items-center justify-center">
              <Button variant="primary" withArrow onClick={() => go('consult-apply')}>{t({ zh: '申请深度战略陪伴', en: 'Apply for strategy partnership' })}</Button>
              <Button variant="secondary" withArrow onClick={() => go('about')}>{t({ zh: '了解益语智库', en: 'About Yiyu' })}</Button>
            </div>
          </Reveal>
        </div>

        <div className="absolute bottom-9 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 text-os-muted/55">
          <span className="text-[11px] tracking-[0.18em]">{t({ zh: '向下了解', en: 'Scroll' })}</span>
          <ChevronDown className="hss-chevron w-4 h-4" />
        </div>
      </section>

      {/* ② 凭什么"可落地": 问题 → 结果 */}
      <section className="relative min-h-[100svh] flex items-center px-6 py-24 bg-os-navy overflow-hidden">
        <div className="hss-grid hss-grid-dark" aria-hidden="true" />
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          <div className="absolute top-[8%] right-[10%] w-[42%] h-[50%] rounded-full bg-os-blue/[0.18] blur-[120px]" />
          <div className="absolute bottom-[6%] left-[8%] w-[36%] h-[46%] rounded-full bg-os-violet/[0.16] blur-[120px]" />
        </div>

        <div className="relative z-10 w-full max-w-4xl mx-auto">
          <Reveal>
            <div className="text-center max-w-3xl mx-auto mb-12">
              <div className="flex items-center justify-center gap-2.5 mb-6">
                <span className="h-px w-7 bg-[#9DB4F5]/60" />
                <span className="text-[12px] font-semibold tracking-[0.2em] text-[#AEC4FF]">{t({ zh: '什么叫"可落地"', en: 'What "lands" means' })}</span>
                <span className="h-px w-7 bg-[#9DB4F5]/60" />
              </div>
              <h2 className="font-serif-display text-[28px] sm:text-[40px] lg:text-[46px] font-semibold leading-[1.26] tracking-tight text-white">
                {t({ zh: '别人给观点，', en: 'Others give opinions. ' })}<span className="text-[#AEC4FF]">{t({ zh: '我们交结果', en: 'We deliver results.' })}</span>
              </h2>
              <p className="mt-5 text-[14.5px] sm:text-[16px] leading-[1.8] text-white/80">
                {t({ zh: '咨询成果不能停在漂亮的判断里，而要进入项目、任务、会议、系统和复盘。', en: 'Consulting can’t stop at elegant judgments — it has to enter your projects, tasks, meetings, systems and reviews.' })}
              </p>
            </div>
          </Reveal>

          {/* before → after 清单 */}
          <div className="rounded-[20px] ring-1 ring-white/15 bg-white/[0.05] overflow-hidden divide-y divide-white/12">
            <div className="hidden sm:grid grid-cols-[1fr_auto_1fr] gap-5 px-6 py-3 text-[11px] tracking-[0.16em] font-semibold text-white/55">
              <span>{t({ zh: '你常遇到的状态', en: 'What you often face' })}</span><span className="w-5" /><span className="text-[#AEC4FF]">{t({ zh: '益语介入后', en: 'After Yiyu steps in' })}</span>
            </div>
            {OUTCOMES.map((o, i) => (
              <Reveal key={o.before.zh} delay={i * 70}>
                <div className="hss-row grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-5 px-6 py-5">
                  <p className="text-[14px] sm:text-[15px] leading-[1.6] text-white/70">{t(o.before)}</p>
                  <ArrowRight className="hidden sm:block w-4 h-4 text-[#AEC4FF]/80 mx-auto shrink-0" />
                  <p className="text-[14px] sm:text-[15px] leading-[1.6] font-medium text-white">{t(o.after)}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ③ 怎么落: 成长合伙人时间线 */}
      <section className="relative min-h-[100svh] flex items-center justify-center px-6 py-24 bg-os-canvas overflow-hidden">
        <div className="hss-grid" aria-hidden="true" />
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          <div className="absolute top-[6%] left-[12%] w-[38%] h-[48%] rounded-full bg-os-spark/[0.07] blur-[130px]" />
          <div className="absolute bottom-[-8%] right-[10%] w-[40%] h-[50%] rounded-full bg-os-blue/[0.06] blur-[130px]" />
        </div>

        <div className="relative z-10 w-full max-w-5xl mx-auto">
          <Reveal>
            <div className="text-center max-w-3xl mx-auto">
              <div className="flex items-center justify-center gap-2.5 mb-7">
                <span className="h-px w-7 bg-os-blue/70" />
                <span className="text-[12px] font-semibold tracking-[0.2em] text-os-blue">{t({ zh: '我们怎么陪你落地', en: 'How we walk it through with you' })}</span>
                <span className="h-px w-7 bg-os-blue/70" />
              </div>
              <h2 className="font-serif-display text-[30px] sm:text-[42px] lg:text-[50px] font-semibold leading-[1.2] tracking-tight text-os-navy">
                {t({ zh: '不是做完方案就离场，', en: 'We don’t hand over a plan and leave —' })}
                <br />
                {t({ zh: '而是做你身边的', en: 'we stay as your ' })}<span className="text-ink-accent">{t({ zh: '成长合伙人', en: 'growth partner' })}</span>
              </h2>
            </div>
          </Reveal>

          <div className="relative mt-16 grid md:grid-cols-3 gap-10 md:gap-6">
            <div className="hidden md:block absolute top-7 left-[16.6%] right-[16.6%] h-px bg-gradient-to-r from-os-line via-os-blue/45 to-os-line" aria-hidden="true" />
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              return (
                <Reveal key={s.stage.zh} delay={i * 120}>
                  <div className="relative text-center md:text-left">
                    <div className="relative z-[1] w-14 h-14 rounded-full bg-os-navy text-white flex items-center justify-center mx-auto md:mx-0 mb-5 shadow-os ring-4 ring-os-canvas">
                      <Icon className="w-[22px] h-[22px]" strokeWidth={1.7} />
                    </div>
                    <div className="text-[12px] font-semibold tracking-[0.16em] text-os-blue mb-1.5">{t(s.stage)}</div>
                    <h3 className="font-serif-display text-[20px] font-semibold text-os-navy mb-2.5">{t(s.title)}</h3>
                    <p className="text-[14px] leading-[1.8] text-os-muted max-w-xs mx-auto md:mx-0">{t(s.body)}</p>
                  </div>
                </Reveal>
              );
            })}
          </div>

          <Reveal>
            <div className="mt-16 flex flex-col sm:flex-row gap-4 items-center justify-center">
              <Button variant="primary" withArrow onClick={() => go('consult-apply')}>{t({ zh: '申请深度战略陪伴', en: 'Apply for strategy partnership' })}</Button>
              <Button variant="secondary" withArrow onClick={() => go('workbench')}>{t({ zh: '了解益语智库 AI', en: 'Explore Yiyu AI' })}</Button>
            </div>
            <p className="mt-4 text-center text-[12px] text-os-muted/65">
              {t({ zh: '企业 / 组织 leader 走战略陪伴线 · 行动者 / 公益 / 小团队 用益语智库 AI（开源）', en: 'Leaders take the strategy-partnership track · doers, nonprofits & small teams use Yiyu AI (open source)' })}
            </p>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
