import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Wallet, Heart, Users, UserRound, Shield, type LucideIcon } from 'lucide-react';
import { Container, Section, Card, Reveal } from '../ui';
import { CashFlowDrawer } from './CashFlowStatement';

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

function useCountUp(target: number, options: CountUpOptions = {}): { ref: React.RefObject<HTMLElement>; text: string } {
  const { decimals = 2, duration = 1500, withComma = false } = options;
  const ref = useRef<HTMLElement | null>(null);
  const [value, setValue] = useState<number>(0);
  const startedRef = useRef<boolean>(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || startedRef.current) return;
        startedRef.current = true;
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
  }, [target, duration]);

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
}: LedgerCardProps) {
  const inner = (
    <Card className={`flex-1 p-6 sm:p-7 group ${interactive ? 'cursor-pointer' : ''}`}>
      <div
        className={`w-11 h-11 rounded-[13px] ${chip} flex items-center justify-center mb-5 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3`}
      >
        <Icon className={`w-5 h-5 ${accent}`} strokeWidth={1.8} />
      </div>
      <h3 className="text-[16px] font-bold text-os-navy mb-2.5">{title}</h3>
      <div className="flex items-baseline gap-1.5 mb-5">
        <span className={`text-[36px] font-bold leading-none ${accent}`}>{bigNumber}</span>
        <span className="text-[13.5px] text-os-muted">{unit}</span>
      </div>
      {children}
      {interactive && (
        <div className="mt-4 inline-flex items-center gap-1 text-[12px] text-os-blue/80 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          查看完整账目 →
        </div>
      )}
    </Card>
  );

  if (interactive && onClick) {
    return (
      <div className="flex flex-col h-full">
        <button
          type="button"
          onClick={onClick}
          className="flex flex-col h-full text-left w-full rounded-[20px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-os-blue/40 focus-visible:ring-offset-2 focus-visible:ring-offset-os-canvas"
          aria-label={`查看${title}详细现金流量表`}
        >
          {inner}
        </button>
        <p className="mt-4 px-2 text-center text-[12.5px] leading-relaxed text-os-muted">{caption}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {inner}
      <p className="mt-4 px-2 text-center text-[12.5px] leading-relaxed text-os-muted">{caption}</p>
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
  const [cashFlowOpen, setCashFlowOpen] = useState<boolean>(false);

  return (
    <Section id="ledger" tone="canvas">
      <Container>
        <Reveal>
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="font-serif-display text-[28px] sm:text-[36px] lg:text-[42px] font-semibold tracking-tight text-os-navy">
              这份礼物，应该被看见它如何发生
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
              title="平台总账"
              bigNumber={<BigNumber target={86.37} />}
              unit="万元"
              caption="平台本月资金总览，包含全部收入、支出与结余情况。点击查看完整流水。"
              interactive
              onClick={() => setCashFlowOpen(true)}
            >
              <div className="space-y-2.5">
                <AnimatedRow label="收入" target={128.54} suffix="万元" />
                <AnimatedRow label="支出" target={42.17} suffix="万元" negative />
                <div className="h-px bg-os-line my-1" />
                <AnimatedRow label="结余" target={86.37} suffix="万元" strong accent="text-os-blue" />
              </div>
            </LedgerCard>
          </Reveal>

          {/* 2 · 行动者支持池 */}
          <Reveal delay={80}>
            <LedgerCard
              icon={Heart}
              accent="text-[#2EA56F]"
              chip="bg-[#2EA56F]/12"
              title="行动者支持池"
              bigNumber={<BigNumber target={52.68} />}
              unit="万元"
              caption="专门用于支持行动者与公益组织的资金池，持续助力真实行动发生。"
            >
              <ProgressBar pct={75} colorClass="bg-[#2EA56F]" />
              <div className="space-y-2.5 mt-4">
                <AnimatedRow label="当前余额" target={52.68} suffix="万元" />
                <AnimatedRow label="本月已支持" target={17.32} suffix="万元" />
                <AnimatedRow label="剩余额度" target={75} decimals={0} suffix="%" accent="text-[#2EA56F] font-bold" />
              </div>
            </LedgerCard>
          </Reveal>

          {/* 3 · 共建参与人次 */}
          <Reveal delay={160}>
            <LedgerCard
              icon={Users}
              accent="text-os-violet"
              chip="bg-os-spark-soft"
              title="共建参与人次"
              bigNumber={<BigNumber target={1246} decimals={0} withComma />}
              unit="人次"
              caption="本月参与共建的行动者、开发者与支持者的人次统计。"
            >
              <div className="grid grid-cols-3 gap-x-3 gap-y-3">
                <CountStat label="需求" target={218} />
                <CountStat label="Bug" target={182} />
                <CountStat label="测试" target={356} />
                <CountStat label="PR" target={86} border />
                <CountStat label="故事" target={192} border />
                <CountStat label="模块建议" target={212} border />
              </div>
            </LedgerCard>
          </Reveal>

          {/* 4 · 行动者影响范围 */}
          <Reveal delay={240}>
            <LedgerCard
              icon={UserRound}
              accent="text-[#E0894B]"
              chip="bg-[#E0894B]/12"
              title="行动者影响范围"
              bigNumber={<BigNumber target={32.6} decimals={1} />}
              unit="万人次"
              caption="通过被支持的组织与项目，间接影响的服务对象与受益人群规模。"
            >
              <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                <CountStat label="公益组织" target={68} suffix=" 个" />
                <CountStat label="支持行动者" target={236} suffix=" 位" />
                <CountStat label="项目工作台" target={128} suffix=" 个" border />
                <CountStat label="覆盖人群" target={32.6} decimals={1} suffix=" 万人次" border />
              </div>
            </LedgerCard>
          </Reveal>
        </div>

        {/* 脚注 */}
        <Reveal delay={120}>
          <div className="mt-12 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[12.5px] text-os-muted/80">
            <span className="inline-flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-os-muted/60" />
              数据每月更新，部分数据来自系统记录，部分来自人工核对，完整账本请查看详情。
            </span>
            <span className="hidden sm:inline text-os-line">|</span>
            <span>最后更新：{UPDATED_AT}</span>
          </div>
        </Reveal>
      </Container>

      <CashFlowDrawer open={cashFlowOpen} onClose={() => setCashFlowOpen(false)} />
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
