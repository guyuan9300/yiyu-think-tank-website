import {
  ArrowRight, ArrowDown, Check, ChevronRight,
  Rocket, Code2, Heart, Store,
} from 'lucide-react';
import { MobileAppShell } from '../MobileAppShell';

// 移动端 App 化首页 (设计语言锚点)。桌面端 OpenSourceHomePage 不受影响。
// 忠实承接桌面首页开场叙事 (HomeScrollStory): 战略陪伴者 → 增长维度 → 别人给观点我们交结果
// → 三段陪伴 → 平台总账 → 参与。设计语言/铺开计划见 docs/MOBILE_APP_REDESIGN_PLAN.md。

interface ScreenProps {
  onNavigate: (page: string, id?: string) => void;
}

const HERO_IMG = `${import.meta.env.BASE_URL}images/open-source/hero-product.png`;

// 「增长不只是收入」的 6 个维度
const DIMENSIONS = ['影响力', '筹款能力', '业务模式', '品牌信任', '组织效率', '数字化能力'];

// 别人给观点，我们交结果 —— 痛点 → 益语介入后
const SHIFTS = [
  { pain: '战略想法很多，方向却不清', after: '清晰的阶段目标、优先级与成功标准' },
  { pain: '项目很多，却各自为战', after: '重构项目组合，服务组织长期战略' },
  { pain: '团队很忙，协作却低效', after: '任务、会议、复盘之间的协作闭环' },
  { pain: '资料和经验散落各处', after: '知识底座 + AI，随时可被调用' },
  { pain: '都说要用 AI，却用不起来', after: '做成团队真正能用的「业务应用」' },
];

// 三段陪伴
const PHASES = [
  { tag: '前期', title: '梳理与诊断', desc: '系统梳理资料、看清现状，区分表面现象与真实卡点。' },
  { tag: '中期', title: '共创战略与机制', desc: '一起对齐方向，把战略拆成路径、项目、角色与节奏。' },
  { tag: '后期', title: '陪伴落地、沉淀能力', desc: '持续推进与校准，把可复制的部分沉淀为组织能力。' },
];

const STATS = [
  { label: '当前余额', value: '¥128,400' },
  { label: '本月已支持', value: '¥36,800' },
  { label: '共建参与', value: '480 人次' },
  { label: '影响范围', value: '12,000+' },
];

const ROLES = [
  { icon: Rocket, title: '我是行动者', desc: '青年行动者 / 公益组织 / 小企业团队', page: 'consult-apply' },
  { icon: Code2, title: '我是开发者', desc: '认领模块、提交 PR、把需求变成工具', page: 'workbench' },
  { icon: Heart, title: '我是支持者', desc: '为行动者提供算力、资助一个使用计划', page: 'consult-apply' },
  { icon: Store, title: '我是服务伙伴', desc: '提供优惠资源、真实场景与试点机会', page: 'consult-apply' },
];

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
      <div className="space-y-12 pb-8">
        {/* ── 英雄区 ── */}
        <section className="animate-fade-in-up -mt-3">
          <div className="relative overflow-hidden rounded-[28px] px-6 pt-7 pb-6 text-white
            bg-[radial-gradient(120%_120%_at_85%_0%,#2c4d96_0%,#16265E_46%,#0e1c44_100%)]
            shadow-[0_30px_70px_-30px_rgba(14,28,68,0.85)]">
            {/* 质感: 网格 + 光晕 */}
            <div className="pointer-events-none absolute inset-0 opacity-[0.18]"
              style={{ backgroundImage: 'linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)', backgroundSize: '34px 34px', maskImage: 'radial-gradient(120% 80% at 80% 0%,#000,transparent 70%)' }} />
            <div className="pointer-events-none absolute -top-16 -right-10 w-52 h-52 rounded-full bg-os-blue/30 blur-3xl" />

            <div className="relative">
              <p className="text-[11.5px] font-medium tracking-[0.04em] text-white/65">益语智库 · 助力组织持续增长的战略陪伴者</p>
              <h1 className="mt-3 font-serif-display text-[37px] leading-[1.1] font-semibold">
                可落地的<br /><span className="text-os-blue/95">增长咨询</span>
              </h1>
              <p className="mt-4 text-[13.5px] leading-[1.7] text-white/78">
                我们不停在观点和漂亮的 PPT——而是陪你把方向变成机制、把机制变成行动、把行动沉淀为组织能持续使用的能力。
              </p>
              <div className="mt-5 flex flex-col gap-2.5">
                <button onClick={() => onNavigate('consult-apply')}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-white text-os-navy text-[14.5px] font-semibold py-3.5 shadow-[0_14px_30px_-12px_rgba(0,0,0,0.4)] active:scale-[0.97] transition-transform">
                  申请深度战略陪伴 <ArrowRight size={16} />
                </button>
                <button onClick={() => onNavigate('about')}
                  className="inline-flex items-center justify-center gap-1.5 rounded-full bg-white/10 ring-1 ring-white/20 text-white text-[14px] font-medium py-3 active:scale-[0.97] transition-transform">
                  了解益语智库
                </button>
              </div>
            </div>

            {/* 产品画面 peek */}
            <div className="relative mt-7 -mb-2">
              <div className="rounded-2xl overflow-hidden ring-1 ring-white/15 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.6)] bg-white/5">
                <img src={HERO_IMG} alt="益语智库工作台" className="w-full block" loading="eager" />
              </div>
            </div>
          </div>
        </section>

        {/* ── 增长维度 ── */}
        <section className="animate-fade-in-up" style={{ animationDelay: '0.06s' }}>
          <p className="text-[14px] text-os-ink font-medium">
            我们说的<span className="font-serif-display text-os-navy">「增长」</span>，不只是收入
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {DIMENSIONS.map((d) => (
              <span key={d} className="px-3.5 py-2 rounded-full bg-white ring-1 ring-os-line text-[13px] font-medium text-os-ink/85 shadow-[0_2px_8px_-4px_rgba(22,38,94,0.25)]">
                {d}
              </span>
            ))}
          </div>
        </section>

        {/* ── 别人给观点，我们交结果 ── */}
        <section className="animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          <SectionLabel>什么叫「可落地」</SectionLabel>
          <h2 className="mt-2.5 font-serif-display text-[25px] leading-tight font-semibold text-os-ink">
            别人给观点，<br />我们交结果
          </h2>
          <p className="mt-2.5 text-[13px] leading-relaxed text-os-muted">
            咨询成果不能停在漂亮的判断里，而要进入项目、任务、会议、系统和复盘。
          </p>

          <div className="mt-5 space-y-2.5">
            {SHIFTS.map((s, i) => (
              <div key={i} className="rounded-2xl bg-white ring-1 ring-os-line p-4 shadow-[0_8px_24px_-18px_rgba(22,38,94,0.5)]">
                <p className="flex items-start gap-2 text-[13px] text-os-muted">
                  <span className="mt-[3px] shrink-0 text-[10px] font-semibold tracking-wide text-os-muted/70">常遇到</span>
                  <span className="line-through decoration-os-muted/30">{s.pain}</span>
                </p>
                <div className="my-2 ml-[2px] flex items-center gap-1 text-os-blue/40">
                  <ArrowDown size={14} />
                </div>
                <p className="flex items-start gap-2 text-[13.5px] font-medium text-os-ink">
                  <Check size={16} className="mt-[2px] shrink-0 text-os-blue" strokeWidth={2.6} />
                  {s.after}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ── 三段陪伴 (时间线) ── */}
        <section className="animate-fade-in-up" style={{ animationDelay: '0.14s' }}>
          <SectionLabel>我们怎么陪你落地</SectionLabel>
          <h2 className="mt-2.5 font-serif-display text-[22px] font-semibold text-os-ink mb-5">从诊断到沉淀，全程陪伴</h2>
          <ol className="relative pl-9">
            <span className="absolute left-[14px] top-2 bottom-2 w-px bg-gradient-to-b from-os-blue/60 via-os-line to-os-line" />
            {PHASES.map((p, i) => (
              <li key={p.tag} className={`relative ${i < PHASES.length - 1 ? 'pb-6' : ''}`}>
                <span className="absolute -left-9 top-0 w-7 h-7 rounded-full bg-os-navy text-white text-[12px] font-semibold flex items-center justify-center ring-4 ring-os-canvas">
                  {i + 1}
                </span>
                <span className="inline-block px-2 py-0.5 rounded-md bg-os-mist/70 text-[11px] font-semibold text-os-navy">{p.tag}</span>
                <h3 className="mt-1.5 text-[16px] font-semibold text-os-ink">{p.title}</h3>
                <p className="mt-1 text-[13px] leading-relaxed text-os-muted">{p.desc}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* ── 平台总账 ── */}
        <section className="animate-fade-in-up" style={{ animationDelay: '0.18s' }}>
          <div className="rounded-[26px] bg-white ring-1 ring-os-line p-5 shadow-[0_20px_50px_-30px_rgba(22,38,94,0.5)]">
            <div className="flex items-center justify-between">
              <div>
                <SectionLabel>平台总账</SectionLabel>
                <p className="mt-1.5 font-serif-display text-[18px] font-semibold text-os-ink">在这里，看见改变如何发生</p>
              </div>
              <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.7)]" />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-px bg-os-line rounded-2xl overflow-hidden ring-1 ring-os-line">
              {STATS.map((s) => (
                <div key={s.label} className="bg-gradient-to-b from-white to-os-canvas/40 px-4 py-4">
                  <p className="text-[11.5px] text-os-muted">{s.label}</p>
                  <p className="mt-1 text-[19px] font-semibold text-os-navy tracking-tight tabular-nums">{s.value}</p>
                </div>
              ))}
            </div>
            <button onClick={() => onNavigate('consult-apply')}
              className="mt-4 w-full inline-flex items-center justify-center gap-1.5 text-[13.5px] font-medium text-os-navy py-3 rounded-xl bg-os-mist/60 active:scale-[0.98] transition-transform">
              查看完整账目 <ArrowRight size={15} />
            </button>
          </div>
        </section>

        {/* ── 参与方式 ── */}
        <section className="animate-fade-in-up" style={{ animationDelay: '0.22s' }}>
          <SectionLabel>与行动者同行</SectionLabel>
          <p className="mt-2.5 text-[13.5px] leading-relaxed text-os-muted mb-4">
            真正让世界变好的，是那些把想法落地的行动者。益语智库愿做他们身后的底层能力。
          </p>
          <div className="rounded-[20px] bg-white ring-1 ring-os-line divide-y divide-os-line overflow-hidden shadow-[0_12px_30px_-24px_rgba(22,38,94,0.5)]">
            {ROLES.map((r) => {
              const Icon = r.icon;
              return (
                <button key={r.title} onClick={() => onNavigate(r.page)}
                  className="w-full flex items-center gap-3.5 px-4 py-4 text-left active:bg-os-mist/40 transition-colors">
                  <span className="inline-flex w-10 h-10 rounded-xl bg-gradient-to-br from-os-mist to-white ring-1 ring-os-line items-center justify-center text-os-navy shrink-0">
                    <Icon size={19} strokeWidth={1.9} />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-[15px] font-semibold text-os-ink">{r.title}</span>
                    <span className="block text-[12px] text-os-muted truncate">{r.desc}</span>
                  </span>
                  <ChevronRight size={18} className="text-os-muted/50 shrink-0" />
                </button>
              );
            })}
          </div>
        </section>

        {/* ── 金句 ── */}
        <section className="animate-fade-in-up px-3" style={{ animationDelay: '0.26s' }}>
          <blockquote className="text-center">
            <p className="font-serif-display text-[21px] leading-[1.5] text-os-ink">“技术是思想的延伸。”</p>
            <footer className="mt-2.5 text-[12.5px] text-os-muted">益语智库，是管理思想与人工智能结合的一次表达。</footer>
          </blockquote>
        </section>
      </div>
    </MobileAppShell>
  );
}
