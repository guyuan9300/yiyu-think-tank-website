import { ArrowRight, ArrowDown, Check, ShieldCheck } from 'lucide-react';
import { MobileAppShell } from '../MobileAppShell';
import { CAPABILITY_ICONS } from '../icons/CapabilityIcons';

// 移动端 App 化首页 = 价值展示页。设计目标: 手机狭窄高密度屏上, 客户 3 秒抓住价值。
// 重排逻辑(按板块意图, 非照搬): 价值钩子(可落地+别人给观点我们交结果) → 痛点共鸣 → 怎么陪你
// → 能力广度+客户背书 → 两条路径(主战略陪伴/次开源AI) → 收束。
// 意图分析与铺开计划见 docs/MOBILE_APP_REDESIGN_PLAN.md。

interface ScreenProps {
  onNavigate: (page: string, id?: string) => void;
}

const HERO_IMG = `${import.meta.env.BASE_URL}images/open-source/hero-product.png`;

const DIMENSIONS = ['影响力', '筹款能力', '业务模式', '品牌信任', '组织效率', '数字化能力'];

const SHIFTS = [
  { pain: '想法很多，方向却不清', after: '清晰的阶段目标与优先级' },
  { pain: '项目很多，却各自为战', after: '服务长期战略的项目组合' },
  { pain: '团队很忙，协作却低效', after: '任务·会议·复盘的闭环' },
  { pain: '资料经验散落各处', after: '知识底座 + AI 随取随用' },
  { pain: '都说用 AI，却用不起来', after: '团队真正在用的业务应用' },
];

const PHASES = [
  { tag: '前期', title: '梳理与诊断', desc: '看清现状，区分表面现象与真实卡点。' },
  { tag: '中期', title: '共创战略与机制', desc: '把战略拆成路径、项目、角色与节奏。' },
  { tag: '后期', title: '陪伴落地、沉淀能力', desc: '把可复制的部分，沉淀为组织能力。' },
];

const CAPABILITIES = [
  { title: '战略路径', tag: '愿景→关键任务' },
  { title: '组织效能', tag: '机制承接战略' },
  { title: '数字化 · AI', tag: '稳定在用的应用' },
  { title: '公益创新', tag: '留下真实改变' },
  { title: '商业增长', tag: '可判断可执行' },
  { title: '知识沉淀', tag: '复用的组织资产' },
];

const CLIENTS = ['公益基金会', '品牌咨询机构', '创业公司 · 早期', '行业领军企业', '社会创新组织'];

function SectionLabel({ children }: { children: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.14em] text-os-blue uppercase">
      <span className="w-4 h-px bg-os-blue/50" />
      {children}
    </span>
  );
}

export function MobileHomeScreen({ onNavigate }: ScreenProps) {
  return (
    <MobileAppShell onNavigate={onNavigate}>
      <div className="space-y-11 pb-10">
        {/* ── 价值钩子 Hero ── */}
        <section className="animate-fade-in-up -mt-3">
          <div className="relative overflow-hidden rounded-[28px] px-6 pt-7 pb-6 text-white
            bg-[radial-gradient(120%_120%_at_85%_0%,#2c4d96_0%,#16265E_46%,#0e1c44_100%)]
            shadow-[0_30px_70px_-30px_rgba(14,28,68,0.85)]">
            <div className="pointer-events-none absolute inset-0 opacity-[0.16]"
              style={{ backgroundImage: 'linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)', backgroundSize: '34px 34px', maskImage: 'radial-gradient(120% 80% at 80% 0%,#000,transparent 70%)' }} />
            <div className="pointer-events-none absolute -top-16 -right-10 w-52 h-52 rounded-full bg-os-blue/30 blur-3xl" />

            <div className="relative">
              <p className="text-[11.5px] font-medium tracking-[0.04em] text-white/65">益语智库 · 助力组织持续增长的战略陪伴者</p>
              <h1 className="mt-3 font-serif-display text-[36px] leading-[1.12] font-semibold">
                可落地的<span className="text-os-blue/95">增长咨询</span>
              </h1>

              {/* 最强价值差异点 —— 提到 hero */}
              <div className="mt-4 flex items-stretch gap-3">
                <span className="w-[3px] rounded-full bg-os-blue/80" />
                <p className="font-serif-display text-[19px] leading-snug text-white">
                  别人给观点，<span className="text-os-blue/95">我们交结果。</span>
                </p>
              </div>
              <p className="mt-3 text-[13px] leading-[1.7] text-white/72">
                把方向变成机制，把机制变成行动，把行动沉淀为组织能持续使用的能力。
              </p>

              <button onClick={() => onNavigate('consult-apply')}
                className="mt-5 w-full inline-flex items-center justify-center gap-2 rounded-full bg-white text-os-navy text-[15px] font-semibold py-3.5 shadow-[0_14px_30px_-12px_rgba(0,0,0,0.45)] active:scale-[0.97] transition-transform">
                申请深度战略陪伴 <ArrowRight size={16} />
              </button>
            </div>

            <div className="relative mt-6 -mb-2 rounded-2xl overflow-hidden ring-1 ring-white/15 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.6)] bg-white/5">
              <img src={HERO_IMG} alt="益语智库工作台" className="w-full block" loading="eager" />
            </div>
          </div>
        </section>

        {/* ── 痛点共鸣 ── */}
        <section className="animate-fade-in-up" style={{ animationDelay: '0.06s' }}>
          <SectionLabel>什么叫「可落地」</SectionLabel>
          <h2 className="mt-2.5 font-serif-display text-[23px] leading-tight font-semibold text-os-ink">你是不是也卡在这里？</h2>
          <p className="mt-2 text-[12.5px] text-os-muted">我们说的「增长」不只是收入——</p>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {DIMENSIONS.map((d) => (
              <span key={d} className="px-2.5 py-1 rounded-full bg-os-mist/70 text-[12px] font-medium text-os-navy/80">{d}</span>
            ))}
          </div>

          <ul className="mt-4 space-y-2">
            {SHIFTS.map((s, i) => (
              <li key={i} className="flex items-center gap-2.5 rounded-2xl bg-white ring-1 ring-os-line px-3.5 py-3 shadow-[0_6px_20px_-18px_rgba(22,38,94,0.6)]">
                <span className="flex-1 text-[12.5px] text-os-muted line-through decoration-os-muted/30">{s.pain}</span>
                <ArrowRight size={14} className="text-os-blue/50 shrink-0" />
                <span className="flex-1 flex items-center gap-1.5 text-[13px] font-medium text-os-ink">
                  <Check size={14} className="text-os-blue shrink-0" strokeWidth={2.8} />{s.after}
                </span>
              </li>
            ))}
          </ul>
        </section>

        {/* ── 怎么陪你（三段，信任） ── */}
        <section className="animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          <SectionLabel>我们怎么陪你落地</SectionLabel>
          <h2 className="mt-2.5 font-serif-display text-[22px] leading-tight font-semibold text-os-ink mb-5">
            不做完方案就离场，<br />做你身边的成长合伙人
          </h2>
          <ol className="relative pl-9">
            <span className="absolute left-[14px] top-2 bottom-2 w-px bg-gradient-to-b from-os-blue/60 via-os-line to-os-line" />
            {PHASES.map((p, i) => (
              <li key={p.tag} className={`relative ${i < PHASES.length - 1 ? 'pb-5' : ''}`}>
                <span className="absolute -left-9 top-0 w-7 h-7 rounded-full bg-os-navy text-white text-[12px] font-semibold flex items-center justify-center ring-4 ring-os-canvas">{i + 1}</span>
                <span className="inline-block px-2 py-0.5 rounded-md bg-os-mist/70 text-[11px] font-semibold text-os-navy">{p.tag}</span>
                <h3 className="mt-1.5 text-[15.5px] font-semibold text-os-ink">{p.title}</h3>
                <p className="mt-0.5 text-[12.5px] leading-relaxed text-os-muted">{p.desc}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* ── 能力广度 + 客户背书 ── */}
        <section className="animate-fade-in-up" style={{ animationDelay: '0.14s' }}>
          <SectionLabel>从战略切入</SectionLabel>
          <h2 className="mt-2.5 font-serif-display text-[22px] leading-tight font-semibold text-os-ink mb-4">把每件大事想清楚、做出来</h2>
          <div className="grid grid-cols-2 gap-2.5">
            {CAPABILITIES.map((c, i) => {
              const Icon = CAPABILITY_ICONS[i];
              return (
                <div key={c.title} className="rounded-2xl bg-white ring-1 ring-os-line p-3.5 shadow-[0_6px_20px_-18px_rgba(22,38,94,0.6)]">
                  <span className="inline-flex w-9 h-9 rounded-xl bg-gradient-to-br from-os-mist to-white ring-1 ring-os-line items-center justify-center text-os-navy"><Icon size={19} /></span>
                  <h3 className="mt-2.5 text-[14px] font-semibold text-os-ink">{c.title}</h3>
                  <p className="mt-0.5 text-[11.5px] text-os-muted leading-snug">{c.tag}</p>
                </div>
              );
            })}
          </div>

          <div className="mt-4 flex items-center gap-2 overflow-x-auto -mx-4 px-4 scrollbar-none">
            <span className="text-[11.5px] text-os-muted shrink-0 mr-1">正在陪伴</span>
            {CLIENTS.map((c) => (
              <span key={c} className="shrink-0 px-3 py-1.5 rounded-full bg-white ring-1 ring-os-line text-[12px] font-medium text-os-ink/80">{c}</span>
            ))}
          </div>
        </section>

        {/* ── 两条路径（转化） ── */}
        <section className="animate-fade-in-up" style={{ animationDelay: '0.18s' }}>
          <div className="relative overflow-hidden rounded-[26px] bg-[linear-gradient(135deg,#16265E,#22417f)] text-white p-6 shadow-[0_24px_55px_-28px_rgba(14,28,68,0.85)]">
            <div className="pointer-events-none absolute -bottom-12 -left-8 w-44 h-44 rounded-full bg-os-blue/25 blur-3xl" />
            <h2 className="relative font-serif-display text-[20px] font-semibold">选择适合你的方式</h2>
            <div className="relative mt-4 space-y-2.5">
              <button onClick={() => onNavigate('consult-apply')}
                className="w-full text-left rounded-2xl bg-white/[0.08] ring-1 ring-white/15 p-4 active:scale-[0.98] transition-transform">
                <div className="flex items-center justify-between">
                  <span className="text-[15px] font-semibold">深度战略陪伴</span>
                  <ArrowRight size={16} className="text-white/70" />
                </div>
                <p className="mt-1 text-[12px] text-white/65">企业 / 组织 leader · 从战略到落地的全程陪伴</p>
              </button>
              <button onClick={() => onNavigate('workbench')}
                className="w-full text-left rounded-2xl bg-white/[0.08] ring-1 ring-white/15 p-4 active:scale-[0.98] transition-transform">
                <div className="flex items-center justify-between">
                  <span className="text-[15px] font-semibold">益语智库 AI（开源）</span>
                  <ArrowRight size={16} className="text-white/70" />
                </div>
                <p className="mt-1 text-[12px] text-white/65">行动者 / 公益 / 小团队 · 低成本用上后台能力</p>
              </button>
            </div>
            <p className="relative mt-4 flex items-center gap-1.5 text-[11.5px] text-white/55">
              <ShieldCheck size={13} /> 开源平台公开账本 · 看见每一分支持去向
            </p>
          </div>
        </section>

        {/* ── 收束金句 ── */}
        <section className="animate-fade-in-up px-3" style={{ animationDelay: '0.22s' }}>
          <blockquote className="text-center">
            <p className="font-serif-display text-[20px] leading-[1.5] text-os-ink">“技术是思想的延伸。”</p>
            <footer className="mt-2.5 text-[12px] text-os-muted">益语智库，是管理思想与人工智能结合的一次表达。</footer>
          </blockquote>
        </section>
      </div>
    </MobileAppShell>
  );
}
