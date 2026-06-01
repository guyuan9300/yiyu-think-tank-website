import { createContext, useContext, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { Wallet, Heart, Users, UserRound, Shield, type LucideIcon } from 'lucide-react';
import { Container, Section, Card, Reveal, usePrefersReducedMotion } from '../ui';
import { CashFlowDrawer } from './CashFlowStatement';
import { SupportPoolDrawer } from './SupportPoolProjects';
import { useSupportPool } from '../../../lib/supportPoolData';
import { useCashFlow, computeTotals } from '../../../lib/cashFlowData';
// 注: 并行 i18n 改造把 CommunityBoard 重写成默认导出 section, 已无 CommunityBoardDrawer 具名导出。
//     为恢复页面先停用社群墙抽屉, 待其抽屉版本接回。
import { useLang } from '../../../lib/i18n';

// ⚠️ 占位/示例数据 —— 上线前必须替换为真实核对数字（守 ANTI_FAKE 红线）。
//    尤其财务（收入/支出/结余）对外发布前需人工核对或先隐藏。
const UPDATED_AT = '2025-05-26';

// ============================================================
// 数字滚动动效（视口可见时触发一次）
// ============================================================
function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

interface CountUpOptions {
  decimals?: number;
  duration?: number;
  withComma?: boolean;
}

// ============================================================
// LedgerCard hover 联动: 鼠标进入 → 子级 useCountUp 重跑;
// 鼠标离开 → 触发 sweep 收尾动画 (CSS 在 LEDGER_CARD_CSS 里)
// ============================================================
interface LedgerCardCtx {
  replayKey: number;
}
const LedgerCardContext = createContext<LedgerCardCtx>({ replayKey: 0 });

// Linear / Vercel 同款 "cursor-following spotlight":
// 一层 radial-gradient 跟随鼠标位置, opacity 由 hover 状态控制.
const LEDGER_CARD_CSS = `
.ledger-spotlight {
  position: absolute;
  inset: 0;
  pointer-events: none;
  border-radius: inherit;
  background: radial-gradient(
    480px circle at var(--mx, 50%) var(--my, 50%),
    var(--sweep-color, rgba(91,123,254,0.22)),
    transparent 60%
  );
  opacity: var(--spotlight-opacity, 0);
  transition: opacity 0.4s ease;
  z-index: 1;
}
.ledger-card-frame {
  transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.4s ease;
}
.ledger-card-frame:hover {
  transform: translateY(-2px);
}
@media (prefers-reduced-motion: reduce) {
  .ledger-spotlight { display: none; }
  .ledger-card-frame:hover { transform: none; }
}
`;

function useCountUp(target: number, options: CountUpOptions = {}): { ref: React.RefObject<HTMLElement>; text: string } {
  const { decimals = 2, duration = 1500, withComma = false } = options;
  const { replayKey } = useContext(LedgerCardContext);
  const reduced = usePrefersReducedMotion();
  const ref = useRef<HTMLElement | null>(null);
  const [value, setValue] = useState<number>(0);
  const initialPlayedRef = useRef<boolean>(false);

  // 进入视口时首次播放
  useEffect(() => {
    const el = ref.current;
    if (!el || initialPlayedRef.current) return;
    // 减少动态效果: 不滚动计数, 直接显示终值。
    if (reduced) {
      initialPlayedRef.current = true;
      setValue(target);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || initialPlayedRef.current) return;
        initialPlayedRef.current = true;
        const start = performance.now();
        const tick = (now: number): void => {
          const t = Math.min((now - start) / duration, 1);
          setValue(target * easeOutCubic(t));
          if (t < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
        observer.unobserve(entry.target);
      },
      { threshold: 0.3 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [target, duration, reduced]);

  // 卡片 hover 时父级 replayKey++ → 重跑一次 (减少动态效果时不重跑)
  useEffect(() => {
    if (reduced || replayKey === 0 || !initialPlayedRef.current) return;
    let raf = 0;
    setValue(0);
    const start = performance.now();
    const tick = (now: number): void => {
      const t = Math.min((now - start) / duration, 1);
      setValue(target * easeOutCubic(t));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [replayKey, target, duration]);

  // 首次播放后, 若 target 变化(如后台改数据实时同步) → 直接同步到新值,
  // 否则数字会一直冻结在旧值, 看不到后台改动。
  useEffect(() => {
    if (!initialPlayedRef.current) return;
    setValue(target);
  }, [target]);

  const fixed = value.toFixed(decimals);
  const text = withComma
    ? (() => {
        const [intPart, decPart] = fixed.split('.');
        const formatted = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        return decPart ? `${formatted}.${decPart}` : formatted;
      })()
    : fixed;

  return { ref, text };
}

interface BigNumberProps {
  target: number;
  decimals?: number;
  withComma?: boolean;
  className?: string;
}

function BigNumber({ target, decimals = 2, withComma = false, className = '' }: BigNumberProps): JSX.Element {
  const { ref, text } = useCountUp(target, { decimals, withComma });
  return (
    <span ref={ref} className={`tabular-nums ${className}`}>
      {text}
    </span>
  );
}

function Row({ label, value, strong, accent }: { label: string; value: string; strong?: boolean; accent?: string }) {
  return (
    <div className="flex items-center justify-between text-[14px]">
      <span className={strong ? 'font-semibold text-os-navy' : 'text-os-muted'}>{label}</span>
      <span className={`${strong ? 'font-bold' : 'font-medium text-os-navy'} ${accent ?? ''}`}>{value}</span>
    </div>
  );
}

function MiniStat({ label, value, border }: { label: string; value: string; border?: boolean }) {
  return (
    <div className={border ? 'pt-3 border-t border-os-line' : ''}>
      <div className="text-[12px] text-os-muted mb-1">{label}</div>
      <div className="text-[17px] font-bold text-os-navy">{value}</div>
    </div>
  );
}

interface LedgerCardProps {
  icon: LucideIcon;
  accent: string;
  chip: string;
  title: string;
  bigNumber: ReactNode;
  unit: string;
  caption: string;
  children: ReactNode;
  onClick?: () => void;
  interactive?: boolean;
  /** sweep 收尾动画的颜色 (rgba/hex), 配合卡片强调色 */
  sweepColor?: string;
}

function LedgerCard({
  icon: Icon,
  accent,
  chip,
  title,
  bigNumber,
  unit,
  caption,
  children,
  onClick,
  interactive = false,
  sweepColor = 'rgba(91,123,254,0.22)',
}: LedgerCardProps) {
  const { t } = useLang();
  const [replayKey, setReplayKey] = useState<number>(0);
  const frameRef = useRef<HTMLDivElement>(null);

  // 鼠标进入: 数字 count-up 重跑 + spotlight 淡入
  const handleEnter = (): void => {
    setReplayKey((k) => k + 1);
    const el = frameRef.current;
    if (el) el.style.setProperty('--spotlight-opacity', '1');
  };

  // 鼠标移动: 把视口坐标转 卡片本地坐标 写进 CSS 变量, 让 radial-gradient 圆心跟随
  const handleMove = (e: React.MouseEvent<HTMLDivElement>): void => {
    const el = frameRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty('--mx', `${e.clientX - rect.left}px`);
    el.style.setProperty('--my', `${e.clientY - rect.top}px`);
  };

  // 鼠标离开: spotlight 淡出, 圆心停在最后位置 → 自然产生 "光在原地慢慢消散" 的收尾
  const handleLeave = (): void => {
    const el = frameRef.current;
    if (el) el.style.setProperty('--spotlight-opacity', '0');
  };

  const ctxValue = useMemo(() => ({ replayKey }), [replayKey]);
  const frameStyle = { '--sweep-color': sweepColor } as CSSProperties;

  const inner = (
    <div
      ref={frameRef}
      className="ledger-card-frame relative h-full"
      style={frameStyle}
      onMouseEnter={handleEnter}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
    >
      <Card className={`flex-1 h-full p-6 sm:p-7 group relative overflow-hidden ${interactive ? 'cursor-pointer' : ''}`}>
        {/* cursor-following spotlight */}
        <span className="ledger-spotlight" aria-hidden="true" />

        <div
          className={`w-11 h-11 rounded-[13px] ${chip} flex items-center justify-center mb-5 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3 relative z-[1]`}
        >
          <Icon className={`w-5 h-5 ${accent}`} strokeWidth={1.8} />
        </div>
        <h3 className="text-[16px] font-bold text-os-navy mb-2.5 relative z-[1]">{title}</h3>
        <div className="flex items-baseline gap-1.5 mb-5 relative z-[1]">
          <span className={`text-[36px] font-bold leading-none ${accent}`}>{bigNumber}</span>
          <span className="text-[13.5px] text-os-muted">{unit}</span>
        </div>
        <div className="relative z-[1]">{children}</div>
        {interactive && (
          <div className="mt-4 inline-flex items-center gap-1 text-[12px] text-os-blue/80 opacity-0 group-hover:opacity-100 transition-opacity duration-300 relative z-[1]">
            {t({ zh: '查看完整账目 →', en: 'View full ledger →' })}
          </div>
        )}
      </Card>
    </div>
  );

  const body = (
    <LedgerCardContext.Provider value={ctxValue}>{inner}</LedgerCardContext.Provider>
  );

  // 等高布局: 外层 grid 单元被拉伸到行高 → 彩色卡盒 flex-1 撑满剩余空间 →
  // caption 用统一 min-height 占位, 让 4 张卡的盒底永远对齐 (避免最长文案那张被挤短).
  const captionEl = (
    <p className="mt-4 px-2 text-center text-[12.5px] leading-relaxed text-os-muted shrink-0 min-h-[4.9em]">
      {caption}
    </p>
  );

  if (interactive && onClick) {
    return (
      <div className="flex flex-col h-full">
        <button
          type="button"
          onClick={onClick}
          className="flex flex-col flex-1 min-h-0 text-left w-full rounded-[20px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-os-blue/40 focus-visible:ring-offset-2 focus-visible:ring-offset-os-canvas"
          aria-label={`${t({ zh: '查看详情', en: 'View details' })}: ${title}`}
        >
          {body}
        </button>
        {captionEl}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-col flex-1 min-h-0">{body}</div>
      {captionEl}
    </div>
  );
}

// 行内带动效的"标签 + 数字 + 单位"
interface AnimatedRowProps {
  label: string;
  target: number;
  decimals?: number;
  suffix: string;
  negative?: boolean;
  strong?: boolean;
  accent?: string;
}

function AnimatedRow({ label, target, decimals = 2, suffix, negative, strong, accent }: AnimatedRowProps): JSX.Element {
  const { ref, text } = useCountUp(target, { decimals });
  return (
    <div className="flex items-center justify-between text-[14px]">
      <span className={strong ? 'font-semibold text-os-navy' : 'text-os-muted'}>{label}</span>
      <span ref={ref} className={`tabular-nums ${strong ? 'font-bold' : 'font-medium text-os-navy'} ${accent ?? ''}`}>
        {negative ? '-' : ''}
        {text} {suffix}
      </span>
    </div>
  );
}

export function Ledger() {
  const { t } = useLang();
  const { stats: poolStats } = useSupportPool();
  const cf = computeTotals(useCashFlow());
  const [cashFlowOpen, setCashFlowOpen] = useState<boolean>(false);
  const [supportPoolOpen, setSupportPoolOpen] = useState<boolean>(false);
  const [communityBoardOpen, setCommunityBoardOpen] = useState<boolean>(false);
  // 是否经由支付弹窗深链打开支持池(决定关闭时是返回支付还是普通关闭)
  const [supportPoolFromDeeplink, setSupportPoolFromDeeplink] = useState<boolean>(false);

  // 深链: ?panel=support-pool → 自动打开"行动者支持池"抽屉(供权益"社会创新的支持者"入口跳转)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (new URLSearchParams(window.location.search).get('panel') === 'support-pool') {
      setSupportPoolOpen(true);
      setSupportPoolFromDeeplink(true);
      document.getElementById('ledger')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  // 关闭支持池: 若来自支付弹窗深链 → 返回上一页(回到支付); 否则普通关闭
  const closeSupportPool = () => {
    setSupportPoolOpen(false);
    if (supportPoolFromDeeplink && typeof window !== 'undefined' && window.history.length > 1) {
      setSupportPoolFromDeeplink(false);
      window.history.back();
    }
  };

  return (
    <Section id="ledger" tone="canvas">
      <style>{LEDGER_CARD_CSS}</style>
      <Container>
        <Reveal>
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="font-serif-display text-[28px] sm:text-[36px] lg:text-[42px] font-semibold tracking-tight text-os-navy">
              {t({ zh: '在这里，看见改变如何发生', en: 'See how change happens, right here' })}
            </h2>
          </div>
        </Reveal>

        <div className="mt-14 grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* 1 · 平台总账（可点击打开现金流量表） */}
          <Reveal delay={0}>
            <LedgerCard
              icon={Wallet}
              accent="text-os-blue"
              chip="bg-os-blue/10"
              title={t({ zh: '平台总账', en: 'Platform Ledger' })}
              bigNumber={<BigNumber target={cf.balance} />}
              unit={t({ zh: '万元', en: '× 10K CNY' })}
              caption={t({ zh: '平台本月资金总览，包含全部收入、支出与结余情况。点击查看完整流水。', en: 'This month’s overview of platform funds — all income, spending, and balance. Click for the full statement.' })}
              interactive
              onClick={() => setCashFlowOpen(true)}
              sweepColor="rgba(91,123,254,0.14)"
            >
              <div className="space-y-2.5">
                <AnimatedRow label={t({ zh: '收入', en: 'Income' })} target={cf.totalIn} suffix={t({ zh: '万元', en: '× 10K' })} />
                <AnimatedRow label={t({ zh: '支出', en: 'Spending' })} target={cf.totalOut} suffix={t({ zh: '万元', en: '× 10K' })} negative />
                <div className="h-px bg-os-line my-1" />
                <AnimatedRow label={t({ zh: '结余', en: 'Balance' })} target={cf.balance} suffix={t({ zh: '万元', en: '× 10K' })} strong accent="text-os-blue" />
              </div>
            </LedgerCard>
          </Reveal>

          {/* 2 · 行动者支持池(可点击,查看正在支持的项目) */}
          <Reveal delay={80}>
            <LedgerCard
              icon={Heart}
              accent="text-[#2EA56F]"
              chip="bg-[#2EA56F]/12"
              title={t({ zh: '行动者支持池', en: 'Actioner Support Pool' })}
              bigNumber={<BigNumber target={poolStats.balance} />}
              unit={t({ zh: '万元', en: '× 10K CNY' })}
              caption={t({ zh: '专门用于支持行动者与公益组织的资金池，持续助力真实行动发生。点击查看正在支持的项目。', en: 'A fund dedicated to supporting actioners and nonprofits, keeping real action going. Click to see the projects it backs.' })}
              interactive
              onClick={() => setSupportPoolOpen(true)}
              sweepColor="rgba(46,165,111,0.14)"
            >
              <ProgressBar pct={poolStats.remainingPct} colorClass="bg-[#2EA56F]" />
              <div className="space-y-2.5 mt-4">
                <AnimatedRow label={t({ zh: '当前余额', en: 'Current Balance' })} target={poolStats.balance} suffix={t({ zh: '万元', en: '× 10K' })} />
                <AnimatedRow label={t({ zh: '本月已支持', en: 'Granted This Month' })} target={poolStats.thisMonth} suffix={t({ zh: '万元', en: '× 10K' })} />
                <AnimatedRow label={t({ zh: '剩余额度', en: 'Remaining' })} target={poolStats.remainingPct} decimals={0} suffix="%" accent="text-[#2EA56F] font-bold" />
              </div>
            </LedgerCard>
          </Reveal>

          {/* 3 · 共建参与人次 (可点击,查看需求 + 模块建议) */}
          <Reveal delay={160}>
            <LedgerCard
              icon={Users}
              accent="text-os-violet"
              chip="bg-os-spark-soft"
              title={t({ zh: '共建参与人次', en: 'Co-Build Participation' })}
              bigNumber={<BigNumber target={1246} decimals={0} withComma />}
              unit={t({ zh: '人次', en: 'participations' })}
              caption={t({ zh: '本月参与共建的行动者、开发者与支持者的人次统计。点击查看需求与模块建议。', en: 'This month’s count of actioners, developers, and supporters taking part in co-building. Click for needs and module ideas.' })}
              interactive
              onClick={() => setCommunityBoardOpen(true)}
              sweepColor="rgba(124,58,237,0.14)"
            >
              <div className="grid grid-cols-3 gap-x-3 gap-y-3">
                <CountStat label={t({ zh: '需求', en: 'Needs' })} target={218} />
                <CountStat label="Bug" target={182} />
                <CountStat label={t({ zh: '测试', en: 'Tests' })} target={356} />
                <CountStat label="PR" target={86} border />
                <CountStat label={t({ zh: '故事', en: 'Stories' })} target={192} border />
                <CountStat label={t({ zh: '模块建议', en: 'Module Ideas' })} target={212} border />
              </div>
            </LedgerCard>
          </Reveal>

          {/* 4 · 行动者影响范围 */}
          <Reveal delay={240}>
            <LedgerCard
              icon={UserRound}
              accent="text-[#E0894B]"
              chip="bg-[#E0894B]/12"
              title={t({ zh: '行动者影响范围', en: 'Actioner Reach' })}
              bigNumber={<BigNumber target={132.6} decimals={1} />}
              unit={t({ zh: '万人次', en: '× 10K reached' })}
              caption={t({ zh: '通过被支持的组织与项目，间接影响的服务对象与受益人群规模。', en: 'The scale of people served and benefited indirectly through the organizations and projects we support.' })}
              sweepColor="rgba(224,137,75,0.14)"
            >
              <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                <CountStat label={t({ zh: '公益组织', en: 'Nonprofits' })} target={162} suffix={t({ zh: ' 个', en: '' })} />
                <CountStat label={t({ zh: '超级行动者', en: 'Super Actioners' })} target={236} suffix={t({ zh: ' 位', en: '' })} />
                <CountStat label={t({ zh: '未来独角兽公司', en: 'Future Unicorns' })} target={18} suffix={t({ zh: ' 个', en: '' })} border />
                <CountStat label={t({ zh: '覆盖人群', en: 'People Reached' })} target={132.6} decimals={1} suffix={t({ zh: ' 万人次', en: ' × 10K' })} border />
              </div>
            </LedgerCard>
          </Reveal>
        </div>

        {/* 脚注 */}
        <Reveal delay={120}>
          <div className="mt-12 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[12.5px] text-os-muted/80">
            <span className="inline-flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-os-muted/60" />
              {t({ zh: '数据每月更新，部分数据来自系统记录，部分来自人工核对，完整账本请查看详情。', en: 'Data is updated monthly — some from system records, some manually verified. See the details for the full ledger.' })}
            </span>
            <span className="hidden sm:inline text-os-line">|</span>
            <span>{t({ zh: '最后更新：', en: 'Last updated: ' })}{UPDATED_AT}</span>
          </div>
        </Reveal>
      </Container>

      <CashFlowDrawer open={cashFlowOpen} onClose={() => setCashFlowOpen(false)} />
      <SupportPoolDrawer open={supportPoolOpen} onClose={closeSupportPool} />
      {/* 社群墙抽屉暂时停用(CommunityBoard 已被并行 i18n 改写为 section), 待接回; 保留 communityBoardOpen 状态 */}
      {communityBoardOpen ? null : null}
    </Section>
  );
}

// ============================================================
// 小工具组件
// ============================================================
function ProgressBar({ pct, colorClass }: { pct: number; colorClass: string }): JSX.Element {
  const ref = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState<string>('0%');

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setTimeout(() => setWidth(`${pct}%`), 250);
        observer.unobserve(entry.target);
      },
      { threshold: 0.3 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [pct]);

  return (
    <div ref={ref} className="h-2 rounded-full bg-os-line/80 overflow-hidden">
      <div
        className={`h-full rounded-full ${colorClass} transition-[width] duration-[1400ms] ease-out`}
        style={{ width }}
      />
    </div>
  );
}

interface CountStatProps {
  label: string;
  target: number;
  decimals?: number;
  border?: boolean;
  suffix?: string;
}

function CountStat({ label, target, decimals = 0, border, suffix = '' }: CountStatProps): JSX.Element {
  const { ref, text } = useCountUp(target, { decimals });
  return (
    <div className={border ? 'pt-3 border-t border-os-line' : ''}>
      <div className="text-[12px] text-os-muted mb-1">{label}</div>
      <div ref={ref as React.RefObject<HTMLDivElement>} className="text-[17px] font-bold text-os-navy tabular-nums">
        {text}
        {suffix}
      </div>
    </div>
  );
}

// 兼容旧 Row 接口（如果其他地方导入了）
export { Row, MiniStat };
