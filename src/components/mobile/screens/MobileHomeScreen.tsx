import { ArrowRight, ChevronRight, Check, Rocket, Code2, Heart, Store, Crown } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { MobileAppShell } from '../MobileAppShell';
import { Reveal } from '../Reveal';
import { CountUp, useScrollProgress } from '../scrollMotion';
import { CAPABILITY_ICONS } from '../icons/CapabilityIcons';
import { useCashFlow, computeTotals } from '../../../lib/cashFlowData';
import { useSupportPool } from '../../../lib/supportPoolData';
import { CashFlowDrawer } from '../../open-source-home/sections/CashFlowStatement';
import { SupportPoolDrawer } from '../../open-source-home/sections/SupportPoolProjects';

// 移动端 App 化首页 = 价值展示页。风格: 极简 + iOS 分组 + 灰度质感过渡 + 滚动惊喜。
// 反「单调」: 分组面微渐变/深色收束区/噪点肌理 制造节奏; 逐行级联 + 强调条生长 制造惊喜。
// 意图分析见 docs/MOBILE_APP_REDESIGN_PLAN.md。

interface ScreenProps {
  onNavigate: (page: string, id?: string) => void;
}

const DIMENSIONS = ['影响力', '筹款能力', '业务模式', '品牌信任', '组织效率', '数字化能力'];

const SHIFTS = [
  { pain: '想法很多，方向却不清', after: '清晰的阶段目标与优先级' },
  { pain: '项目很多，却各自为战', after: '服务长期战略的项目组合' },
  { pain: '团队很忙，协作却低效', after: '任务 · 会议 · 复盘的闭环' },
  { pain: '资料经验散落各处', after: '知识底座 + AI，随取随用' },
  { pain: '都说用 AI，却用不起来', after: '团队真正在用的业务应用' },
];

const PHASES = [
  { tag: '前期 · 梳理与诊断', desc: '看清现状，区分表面现象与真实卡点。' },
  { tag: '中期 · 共创战略与机制', desc: '把战略拆成路径、项目、角色与节奏。' },
  { tag: '后期 · 陪伴落地、沉淀能力', desc: '把可复制的部分，沉淀为组织能力。' },
];

const CAPABILITIES = [
  '战略路径清晰化', '组织效能重构', '数字化与 AI 落地',
  '公益与社会创新', '商业增长与战略慈善', '内容 · 工具 · 知识沉淀',
];

const PATHS = [
  { title: '深度战略陪伴', desc: '企业 / 组织 leader · 全程陪伴', page: 'consult-apply' },
  { title: '益语智库 AI（开源）', desc: '行动者 / 公益 / 小团队', page: 'workbench' },
];

// 益语智库出品的两本书 (与网页版 BooksShowcase 同源, 点击进 book-detail 购买)
const BOOKS = [
  { cover: '/images/books/book-51-questions-cover.png', title: '创业者应该回答的51个问题', tagline: '看机会 · 找对人 · 通模式 · 能增长', price: 198, planId: 'book_51' },
  { cover: '/images/books/book-learning-org.png', title: '学习型组织笔记', tagline: '让组织持续学习 · 让战略自驱生长', price: 138, planId: 'book_org' },
];
const BOOK_BUNDLE_PRICE = 198 + 138 - 50; // 286

// 平台总账元信息 (数值在组件内取 useCashFlow/useSupportPool 实时计算, 与抽屉/桌面同源)
type LedgerStat = { label: string; end: number; decimals: number; comma: boolean; unit: string; action?: 'cashflow' | 'pool' };

// 行动者参与入口 (桌面 Join 四类角色)
const ROLES = [
  { icon: Rocket, title: '我是行动者', desc: '提交真实需求 · 申请开源版', page: 'consult-apply' },
  { icon: Code2, title: '我是开发者', desc: '认领模块 · 提交 PR 共建', page: 'workbench' },
  { icon: Heart, title: '我是支持者', desc: '提供算力 · 资助使用计划', page: 'consult-apply' },
  { icon: Store, title: '我是服务伙伴', desc: '提供资源 · 模块试点机会', page: 'consult-apply' },
];

const SURFACE = 'rounded-[20px] bg-gradient-to-b from-white to-[#fafbfe] ring-1 ring-os-line/70 shadow-[0_1px_2px_rgba(22,38,94,0.04),0_18px_36px_-26px_rgba(22,38,94,0.28)]';

function Group({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section>
      <p className="px-1 mb-2.5 text-[11px] font-semibold tracking-[0.14em] uppercase text-os-muted">{label}</p>
      <div className={`${SURFACE} overflow-hidden`}>{children}</div>
    </section>
  );
}

export function MobileHomeScreen({ onNavigate }: ScreenProps) {
  const phase = useScrollProgress<HTMLDivElement>();
  const glow = useScrollProgress<HTMLDivElement>();
  const [cashFlowOpen, setCashFlowOpen] = useState(false);
  const [supportPoolOpen, setSupportPoolOpen] = useState(false);

  // 与抽屉/桌面同源的实时数据
  const cf = computeTotals(useCashFlow());
  const { stats: poolStats } = useSupportPool();
  const LEDGER_STATS: LedgerStat[] = [
    { label: '平台结余', end: cf.balance, decimals: 2, comma: false, unit: '万元', action: 'cashflow' },
    { label: '行动者支持池', end: poolStats.balance, decimals: 2, comma: false, unit: '万元', action: 'pool' },
    { label: '共建参与', end: 1246, decimals: 0, comma: true, unit: '人次' },
    { label: '行动者影响', end: 132.6, decimals: 1, comma: false, unit: '万人次' },
  ];

  return (
    <MobileAppShell onNavigate={onNavigate} scrollTitle="可落地的增长咨询">
      <div className="pb-14">
        {/* ── 大标题 Hero (错峰入场) ── */}
        <section className="pt-9 pb-10">
          <Reveal><p className="text-[12px] tracking-[0.04em] text-os-muted">益语智库 · 战略陪伴者</p></Reveal>
          <Reveal delay={80}>
            <h1 className="mt-4 font-serif-display text-[42px] leading-[1.08] font-semibold text-os-ink">
              可落地的<br />增长咨询
            </h1>
          </Reveal>
          <Reveal delay={170}>
            <div className="mt-6 flex items-stretch gap-3">
              <span className="bar-grow w-[3px] rounded-full bg-gradient-to-b from-os-blue to-os-navy" />
              <p className="font-serif-display text-[22px] leading-[1.35] text-os-navy">
                别人给观点，<br />我们交结果。
              </p>
            </div>
          </Reveal>
          <Reveal delay={250}>
            <p className="mt-5 text-[13.5px] leading-[1.85] text-os-muted">
              把方向变成机制，把机制变成行动，把行动沉淀为组织能持续使用的能力。
            </p>
          </Reveal>
          <Reveal delay={330}>
            <button onClick={() => onNavigate('consult-apply')}
              className="group mt-8 w-full inline-flex items-center justify-center gap-2 rounded-2xl text-white text-[15.5px] font-semibold py-4
                bg-gradient-to-br from-[#22417f] to-[#14224f]
                shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_16px_32px_-12px_rgba(22,38,94,0.7)] active:scale-[0.98] transition-transform">
              申请深度战略陪伴
              <ArrowRight size={17} className="transition-transform duration-300 group-active:translate-x-1" />
            </button>
          </Reveal>
        </section>

        <div className="space-y-10">
          {/* ── 痛点共鸣 (逐行级联) ── */}
          <div>
            <Reveal>
              <div className="px-1 mb-4">
                <p className="text-[11px] font-semibold tracking-[0.16em] uppercase text-os-blue">什么叫「可落地」</p>
                <h2 className="mt-2.5 font-serif-display text-[27px] leading-tight font-semibold text-os-ink">益语智库，陪你改变</h2>
                <p className="mt-3 text-[12.5px] leading-relaxed text-os-muted">
                  我们说的「增长」不只是收入 · <span className="text-os-ink/65">{DIMENSIONS.join(' · ')}</span>
                </p>
              </div>
            </Reveal>
            <div className={`${SURFACE} divide-y divide-os-line/70`}>
              {SHIFTS.map((s, i) => (
                <Reveal key={i} delay={i * 70} variant="left">
                  <div className="px-4 py-4">
                    <p className="text-[11.5px] text-os-muted/75 line-through decoration-os-muted/30">{s.pain}</p>
                    <p className="mt-1.5 flex items-start gap-2 text-[14.5px] font-medium text-os-ink leading-snug">
                      <Check size={15} className="mt-[3px] text-os-blue shrink-0" strokeWidth={2.6} />
                      {s.after}
                    </p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>

          {/* ── 怎么陪你 (时间线随滑动填充) ── */}
          <Reveal>
            <p className="px-1 mb-2.5 text-[11px] font-semibold tracking-[0.14em] uppercase text-os-muted">我们怎么陪你落地</p>
            <div className={`${SURFACE} overflow-hidden`}>
              <div ref={phase.ref} className="relative px-5 py-6">
                {/* 轨道 + 填充 (穿过编号圆心) */}
                <span className="absolute left-[35px] top-[38px] bottom-[38px] w-[2px] bg-os-line/80 rounded-full" />
                <span
                  className="absolute left-[35px] top-[38px] w-[2px] bg-gradient-to-b from-os-blue to-os-navy rounded-full"
                  style={{ height: `calc((100% - 76px) * ${phase.progress})` }}
                />
                <div className="space-y-6">
                  {PHASES.map((p, i) => (
                    <div key={i} className="relative flex gap-4">
                      <span className="relative z-10 w-8 h-8 rounded-full bg-os-navy text-white text-[13px] font-semibold flex items-center justify-center ring-4 ring-white shrink-0">
                        {i + 1}
                      </span>
                      <div className="flex-1 pt-1">
                        <h3 className="text-[15px] font-semibold text-os-ink">{p.tag}</h3>
                        <p className="mt-1 text-[12.5px] leading-relaxed text-os-muted">{p.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Reveal>

          {/* ── 能力领域 (逐行级联) ── */}
          <div>
            <Reveal><p className="px-1 mb-2.5 text-[11px] font-semibold tracking-[0.14em] uppercase text-os-muted">从战略切入 · 能力领域</p></Reveal>
            <div className={`${SURFACE} divide-y divide-os-line/70`}>
              {CAPABILITIES.map((c, i) => {
                const Icon = CAPABILITY_ICONS[i];
                return (
                  <Reveal key={c} delay={i * 55} variant="scale">
                    <div className="px-4 py-3.5 flex items-center gap-3.5">
                      <span className="inline-flex w-9 h-9 rounded-xl bg-gradient-to-br from-os-mist/80 to-os-mist/30 items-center justify-center text-os-navy/75 shrink-0">
                        <Icon size={19} strokeWidth={1.6} />
                      </span>
                      <span className="text-[15px] text-os-ink">{c}</span>
                    </div>
                  </Reveal>
                );
              })}
            </div>
          </div>

          {/* ── 正在陪伴的组织 ── */}
          <Reveal>
            <p className="px-1 text-[12px] leading-relaxed text-os-muted">
              <span className="text-os-ink/55">正在陪伴 ·</span> 公益基金会 / 品牌咨询机构 / 创业公司 / 行业领军企业 / 社会创新组织
            </p>
          </Reveal>

          {/* ── 益语出品 · 两本好书 (放在"选择方式"上方) ── */}
          <div>
            <Reveal>
              <p className="px-1 mb-2.5 text-[11px] font-semibold tracking-[0.14em] uppercase text-os-muted">益语智库出品 · 两本好书</p>
            </Reveal>
            <Reveal delay={60}>
              <div className={`${SURFACE} overflow-hidden`}>
                <div className="grid grid-cols-2 gap-3.5 p-4">
                  {BOOKS.map((b) => (
                    <button key={b.planId} onClick={() => onNavigate('book-detail', b.planId)}
                      className="group text-left active:scale-[0.98] transition-transform">
                      <div className="relative aspect-[3/4.1] overflow-hidden rounded-r-[8px] rounded-l-[2px] ring-1 ring-os-line shadow-[0_16px_32px_-20px_rgba(22,38,94,0.5)]">
                        <img src={b.cover} alt={b.title} loading="lazy" className="h-full w-full object-cover object-top" />
                        <span className="pointer-events-none absolute inset-y-0 left-0 w-[8px] bg-gradient-to-r from-black/25 via-black/8 to-transparent" />
                      </div>
                      <h3 className="mt-2.5 text-[13px] font-semibold leading-snug text-os-ink">{b.title}</h3>
                      <p className="mt-0.5 text-[11px] leading-snug text-os-muted/80">{b.tagline}</p>
                      <p className="mt-1 text-[12px] font-semibold text-os-navy">¥{b.price}<span className="ml-1 text-[10.5px] font-normal text-os-muted">含一年会员</span></p>
                    </button>
                  ))}
                </div>
                <p className="px-4 pb-3 text-[11.5px] leading-relaxed text-os-muted">
                  购买任意一本即成为益语智库<span className="font-medium text-os-ink/70">一年会员</span>，畅读全部文章与报告。
                </p>
                <button onClick={() => onNavigate('book-detail', 'book_bundle')}
                  className="w-full flex items-center gap-2 border-t border-os-line/70 px-4 py-3.5 text-left active:bg-os-mist/40 transition-colors bg-gradient-to-r from-os-mist/30 to-transparent">
                  <Crown size={16} className="text-os-blue shrink-0" />
                  <span className="flex-1 text-[13px] font-semibold text-os-ink">两本合购 ¥{BOOK_BUNDLE_PRICE}<span className="ml-1.5 text-[11.5px] font-normal text-os-muted">再省 50 元</span></span>
                  <ChevronRight size={18} className="text-os-muted/45 shrink-0" />
                </button>
              </div>
            </Reveal>
          </div>

          {/* ── 两条路径 ── */}
          <Reveal>
            <Group label="选择适合你的方式">
              <div className="divide-y divide-os-line/70">
                {PATHS.map((p) => (
                  <button key={p.title} onClick={() => onNavigate(p.page)}
                    className="w-full px-4 py-4 flex items-center gap-3 text-left active:bg-os-mist/40 transition-colors">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-[15.5px] font-semibold text-os-ink">{p.title}</h3>
                      <p className="mt-0.5 text-[12.5px] text-os-muted">{p.desc}</p>
                    </div>
                    <ChevronRight size={19} className="text-os-muted/45 shrink-0" />
                  </button>
                ))}
              </div>
            </Group>
          </Reveal>

          {/* ── 平台总账 (真实数字 · 公开透明) ── */}
          <div>
            <Reveal>
              <div className="px-1 mb-2.5 flex items-center justify-between">
                <p className="text-[11px] font-semibold tracking-[0.14em] uppercase text-os-muted">平台总账 · 公开透明</p>
                <span className="flex items-center gap-1.5 text-[10.5px] text-os-muted">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_7px_rgba(16,185,129,0.7)]" />更新于 2025-05
                </span>
              </div>
            </Reveal>
            <Reveal delay={60}>
              <div className={`${SURFACE} overflow-hidden`}>
                <div className="grid grid-cols-2 gap-px bg-os-line/60">
                  {LEDGER_STATS.map((s) => {
                    const tappable = !!s.action;
                    const onTap = () => {
                      if (s.action === 'cashflow') setCashFlowOpen(true);
                      else if (s.action === 'pool') setSupportPoolOpen(true);
                    };
                    return (
                      <button
                        key={s.label}
                        type="button"
                        onClick={tappable ? onTap : undefined}
                        disabled={!tappable}
                        className={`text-left bg-gradient-to-b from-white to-[#fafbfe] px-4 py-4 transition-colors ${
                          tappable ? 'active:bg-os-mist/50' : 'cursor-default'
                        }`}
                      >
                        <span className="flex items-center gap-1 text-[11.5px] text-os-muted">
                          {s.label}
                          {tappable && <ChevronRight size={12} className="text-os-blue/60" />}
                        </span>
                        <span className="mt-1 block text-os-navy">
                          <CountUp end={s.end} decimals={s.decimals} withComma={s.comma}
                            className="text-[21px] font-bold tracking-tight tabular-nums" />
                          <span className="ml-1 text-[12px] text-os-muted font-medium">{s.unit}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </Reveal>
          </div>

          {/* ── 行动者参与入口 (逐行右滑) ── */}
          <div>
            <Reveal><p className="px-1 mb-2.5 text-[11px] font-semibold tracking-[0.14em] uppercase text-os-muted">与行动者同行 · 参与入口</p></Reveal>
            <div className={`${SURFACE} divide-y divide-os-line/70`}>
              {ROLES.map((r, i) => {
                const Icon = r.icon;
                return (
                  <Reveal key={r.title} delay={i * 60} variant="right">
                    <button onClick={() => onNavigate(r.page)}
                      className="w-full px-4 py-3.5 flex items-center gap-3.5 text-left active:bg-os-mist/40 transition-colors">
                      <span className="inline-flex w-9 h-9 rounded-xl bg-gradient-to-br from-os-mist/80 to-os-mist/30 items-center justify-center text-os-navy/75 shrink-0">
                        <Icon size={18} strokeWidth={1.9} />
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-[14.5px] font-semibold text-os-ink">{r.title}</span>
                        <span className="block text-[12px] text-os-muted truncate">{r.desc}</span>
                      </span>
                      <ChevronRight size={18} className="text-os-muted/45 shrink-0" />
                    </button>
                  </Reveal>
                );
              })}
            </div>
          </div>

          {/* ── 深色收束金句 (满幅 · 噪点 · 光晕视差) ── */}
          <Reveal variant="scale">
            <section ref={glow.ref} className="tex-grain relative -mx-5 mt-2 px-8 py-16 overflow-hidden text-center
              bg-[radial-gradient(130%_120%_at_50%_-10%,#22417f_0%,#16265E_50%,#0d1a40_100%)]">
              <div
                className="pointer-events-none absolute left-1/2 w-60 h-44 rounded-full bg-os-blue/25 blur-3xl"
                style={{ transform: `translate(-50%, ${-40 + glow.progress * 80}px)` }}
              />
              <p className="relative font-serif-display text-[23px] leading-[1.5] text-white">“技术是思想的延伸。”</p>
              <p className="relative mt-3.5 text-[12.5px] leading-relaxed text-white/60">益语智库，是管理思想与人工智能结合的一次表达。</p>
            </section>
          </Reveal>
        </div>
      </div>

      {/* 详情抽屉: 复用桌面同款 (现金流量表 / 行动者支持项目卡片) */}
      <CashFlowDrawer open={cashFlowOpen} onClose={() => setCashFlowOpen(false)} />
      <SupportPoolDrawer open={supportPoolOpen} onClose={() => setSupportPoolOpen(false)} />
    </MobileAppShell>
  );
}
