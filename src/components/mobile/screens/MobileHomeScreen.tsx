import {
  Compass, Users, Sparkles, Library, ArrowRight, ChevronRight,
  Rocket, Code2, Heart, Store,
} from 'lucide-react';
import { MobileAppShell } from '../MobileAppShell';

// 移动端 App 化首页 (样板屏 / 设计语言锚点)。桌面端 OpenSourceHomePage 不受影响。
// 把桌面 7 段长叙事重排为 App 块: 英雄卡 → 能力横滑 → 总账仪表卡 → 参与列表 → 金句。
// 设计语言见 docs/MOBILE_APP_REDESIGN_PLAN.md。内容取自现有 sections 真实文案。

interface ScreenProps {
  onNavigate: (page: string, id?: string) => void;
}

const CAPABILITIES = [
  { icon: Compass, title: '理解业务', desc: '把模糊方向收敛成清晰、能落地的路径。', tint: 'from-os-navy/[0.06]' },
  { icon: Users, title: '推进协作', desc: '让沟通对齐不再反复消耗团队精力。', tint: 'from-os-blue/[0.08]' },
  { icon: Sparkles, title: '辅助决策', desc: '让数据真正进入每一次关键判断。', tint: 'from-os-violet/[0.07]' },
  { icon: Library, title: '沉淀经验', desc: '把一次次行动沉淀成组织的能力。', tint: 'from-os-navy/[0.06]' },
];

const STATS = [
  { label: '当前余额', value: '¥128,400', },
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

export function MobileHomeScreen({ onNavigate }: ScreenProps) {
  return (
    <MobileAppShell onNavigate={onNavigate}>
      <div className="space-y-7 pb-6">
        {/* ── 英雄卡 ── */}
        <section className="animate-fade-in-up rounded-3xl bg-gradient-to-br from-os-navy via-[#1d3a78] to-[#2C6FD0] p-6 text-white shadow-[0_24px_60px_-28px_rgba(22,38,94,0.7)] overflow-hidden relative">
          <div className="absolute -right-8 -top-10 w-40 h-40 rounded-full bg-white/10 blur-2xl" />
          <p className="text-[11px] font-medium tracking-[0.12em] text-white/70 uppercase">Open Source for Actioners</p>
          <h1 className="mt-3 font-serif-display text-[30px] leading-[1.18] font-semibold">
            给行动者的<br />一份礼物
          </h1>
          <p className="mt-3 text-[13.5px] leading-relaxed text-white/80">
            把战略咨询、管理思想与 AI 工作流开源出来，让行动者用更低成本，获得理解业务、推进协作、辅助决策与沉淀经验的后台能力。
          </p>
          <div className="mt-5 flex items-center gap-2.5">
            <button
              onClick={() => onNavigate('workbench')}
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-full bg-white text-os-navy text-[14px] font-semibold py-3 active:scale-[0.97] transition-transform"
            >
              下载开源版 <ArrowRight size={16} />
            </button>
            <button
              onClick={() => onNavigate('consult-apply')}
              className="rounded-full bg-white/12 ring-1 ring-white/25 text-white text-[14px] font-medium px-5 py-3 active:scale-[0.97] transition-transform"
            >
              申请内测
            </button>
          </div>
        </section>

        {/* ── 能力横滑 shelf ── */}
        <section className="animate-fade-in-up" style={{ animationDelay: '0.08s' }}>
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="font-serif-display text-[19px] font-semibold text-os-ink">我们能帮你</h2>
            <span className="text-[12px] text-os-muted">左右滑动 →</span>
          </div>
          <div className="flex gap-3 overflow-x-auto -mx-4 px-4 pb-1 snap-x snap-mandatory scrollbar-none">
            {CAPABILITIES.map((c) => {
              const Icon = c.icon;
              return (
                <article
                  key={c.title}
                  className={`snap-start shrink-0 w-[62%] rounded-2xl bg-gradient-to-br ${c.tint} to-white ring-1 ring-os-line p-4`}
                >
                  <span className="inline-flex w-10 h-10 rounded-xl bg-white ring-1 ring-os-line items-center justify-center text-os-navy">
                    <Icon size={20} strokeWidth={1.9} />
                  </span>
                  <h3 className="mt-3 text-[15.5px] font-semibold text-os-ink">{c.title}</h3>
                  <p className="mt-1 text-[12.5px] leading-relaxed text-os-muted">{c.desc}</p>
                </article>
              );
            })}
          </div>
        </section>

        {/* ── 平台总账 仪表卡 ── */}
        <section className="animate-fade-in-up" style={{ animationDelay: '0.16s' }}>
          <div className="rounded-3xl bg-white ring-1 ring-os-line p-5 shadow-[0_16px_40px_-28px_rgba(22,38,94,0.4)]">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-serif-display text-[18px] font-semibold text-os-ink">平台总账</h2>
                <p className="text-[12px] text-os-muted mt-0.5">在这里，看见改变如何发生</p>
              </div>
              <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-px bg-os-line rounded-2xl overflow-hidden ring-1 ring-os-line">
              {STATS.map((s) => (
                <div key={s.label} className="bg-os-canvas/60 px-4 py-3.5">
                  <p className="text-[11.5px] text-os-muted">{s.label}</p>
                  <p className="mt-1 text-[18px] font-semibold text-os-navy tracking-tight tabular-nums">{s.value}</p>
                </div>
              ))}
            </div>
            <button
              onClick={() => onNavigate('consult-apply')}
              className="mt-4 w-full inline-flex items-center justify-center gap-1.5 text-[13.5px] font-medium text-os-navy py-2.5 rounded-xl bg-os-mist/60 active:scale-[0.98] transition-transform"
            >
              查看完整账目 <ArrowRight size={15} />
            </button>
          </div>
        </section>

        {/* ── 参与方式 列表 ── */}
        <section className="animate-fade-in-up" style={{ animationDelay: '0.24s' }}>
          <h2 className="font-serif-display text-[19px] font-semibold text-os-ink mb-1">与行动者同行</h2>
          <p className="text-[12.5px] text-os-muted mb-3">真正让世界变好的，是那些把想法落地的行动者。</p>
          <div className="rounded-2xl bg-white ring-1 ring-os-line divide-y divide-os-line overflow-hidden">
            {ROLES.map((r) => {
              const Icon = r.icon;
              return (
                <button
                  key={r.title}
                  onClick={() => onNavigate(r.page)}
                  className="w-full flex items-center gap-3.5 px-4 py-3.5 text-left active:bg-os-mist/40 transition-colors"
                >
                  <span className="inline-flex w-9 h-9 rounded-xl bg-os-mist/70 items-center justify-center text-os-navy shrink-0">
                    <Icon size={18} strokeWidth={1.9} />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-[14.5px] font-semibold text-os-ink">{r.title}</span>
                    <span className="block text-[12px] text-os-muted truncate">{r.desc}</span>
                  </span>
                  <ChevronRight size={18} className="text-os-muted/60 shrink-0" />
                </button>
              );
            })}
          </div>
        </section>

        {/* ── 金句 ── */}
        <section className="animate-fade-in-up px-2" style={{ animationDelay: '0.32s' }}>
          <blockquote className="text-center">
            <p className="font-serif-display text-[19px] leading-[1.5] text-os-ink">
              “技术是思想的延伸。”
            </p>
            <footer className="mt-2 text-[12.5px] text-os-muted">
              益语智库，是管理思想与人工智能结合的一次表达。
            </footer>
          </blockquote>
        </section>
      </div>
    </MobileAppShell>
  );
}
