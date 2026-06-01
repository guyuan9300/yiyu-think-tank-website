import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronRight, ChevronLeft, Shield } from 'lucide-react';
import { useLang, type Bilingual } from '../../../lib/i18n';
import { useCashFlow, computeTotals, type CashFlowItem } from '../../../lib/cashFlowData';

// ============================================================
// 现金流量表 · 平台总账抽屉
// 点击 Ledger 首张"平台总账"卡片打开。
// 数据：示例/占位，与 Ledger 卡片保持一致（128.54 流入 − 42.17 流出 = 86.37 结余）。
// 上线前需替换为真实账目（守 ANTI_FAKE 红线）。
// ============================================================

// 渲染用条目 = 共享数据条目 + 计算出的占比/配色
interface CashFlowEntry extends CashFlowItem {
  share: number;
  swatch: string;
  barClass: string;
}

// 配色按序分配(收入=绿系, 支出=橙红系); 新增科目自动循环取色
const IN_PALETTE = [
  { swatch: 'bg-[#34c77b]', barClass: 'bg-gradient-to-r from-[#34c77b] to-[#6cdba0]' },
  { swatch: 'bg-[#2bb673]', barClass: 'bg-gradient-to-r from-[#2bb673] to-[#5fc99a]' },
  { swatch: 'bg-[#22a566]', barClass: 'bg-gradient-to-r from-[#22a566] to-[#52b585]' },
  { swatch: 'bg-[#1f9657]', barClass: 'bg-gradient-to-r from-[#1f9657] to-[#4ea579]' },
  { swatch: 'bg-[#1c7a48]', barClass: 'bg-gradient-to-r from-[#1c7a48] to-[#479671]' },
];
const OUT_PALETTE = [
  { swatch: 'bg-[#ef7a5f]', barClass: 'bg-gradient-to-r from-[#ef7a5f] to-[#f5a081]' },
  { swatch: 'bg-[#ec6b4f]', barClass: 'bg-gradient-to-r from-[#ec6b4f] to-[#f3936f]' },
  { swatch: 'bg-[#d95f45]', barClass: 'bg-gradient-to-r from-[#d95f45] to-[#e6886a]' },
  { swatch: 'bg-[#c2553d]', barClass: 'bg-gradient-to-r from-[#c2553d] to-[#d27d65]' },
  { swatch: 'bg-[#a64a37]', barClass: 'bg-gradient-to-r from-[#a64a37] to-[#bd7560]' },
];

function toEntries(items: CashFlowItem[], total: number, palette: typeof IN_PALETTE): CashFlowEntry[] {
  return items.map((it, i) => ({
    ...it,
    share: total > 0 ? (it.amount / total) * 100 : 0,
    ...palette[i % palette.length],
  }));
}


const UNIT_WAN: Bilingual = { zh: '万元', en: 'k' };

// ============================================================
// 数字滚动动效
// ============================================================
function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function useCountUp(target: number, options: { decimals?: number; duration?: number; active: boolean }): string {
  const { decimals = 2, duration = 1500, active } = options;
  const [value, setValue] = useState<number>(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!active) {
      setValue(0);
      return;
    }
    const start = performance.now();
    const tick = (now: number): void => {
      const t = Math.min((now - start) / duration, 1);
      setValue(target * easeOutCubic(t));
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [target, duration, active]);

  return value.toFixed(decimals);
}

interface NumProps {
  value: number;
  decimals?: number;
  active: boolean;
  duration?: number;
  className?: string;
}

function Num({ value, decimals = 2, active, duration, className }: NumProps): JSX.Element {
  const text = useCountUp(value, { decimals, duration, active });
  return <span className={`tabular-nums ${className ?? ''}`}>{text}</span>;
}

// ============================================================
// 折叠行
// ============================================================
interface RowProps {
  entry: CashFlowEntry;
  active: boolean;
  index: number;
  tone: 'in' | 'out';
}

function FlowRow({ entry, active, index, tone }: RowProps): JSX.Element {
  const { t } = useLang();
  const [open, setOpen] = useState<boolean>(false);
  const [barWidth, setBarWidth] = useState<string>('0%');

  useEffect(() => {
    if (!active) {
      setBarWidth('0%');
      return;
    }
    const t = setTimeout(() => setBarWidth(`${entry.share}%`), 320 + index * 60);
    return () => clearTimeout(t);
  }, [active, entry.share, index]);

  const amountColor = tone === 'in' ? 'text-os-navy' : 'text-os-navy';

  return (
    <div className="border-b border-os-line/60 last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full text-left px-7 sm:px-8 py-5 grid grid-cols-[1fr_140px_56px_24px] gap-x-5 items-center hover:bg-os-navy/[0.025] transition-colors"
        aria-expanded={open}
      >
        <div className="flex items-center gap-4 min-w-0">
          <div className={`w-[6px] h-[34px] rounded-[3px] ${entry.swatch} opacity-85 flex-shrink-0`} />
          <div className="flex flex-col gap-1 min-w-0 flex-1">
            <div className="text-[15px] font-semibold text-os-navy truncate">{t(entry.name)}</div>
            <div className="text-[12px] text-os-muted truncate">{t(entry.subtitle)}</div>
            <div className="relative mt-1 h-[4px] rounded-full bg-os-navy/[0.06] overflow-hidden max-w-[320px]">
              <div
                className={`h-full rounded-full ${entry.barClass} transition-[width] duration-[1400ms] ease-out`}
                style={{ width: barWidth }}
              />
            </div>
          </div>
        </div>
        <div className={`text-[18px] font-bold ${amountColor} text-right leading-none`}>
          <Num value={entry.amount} active={active} className="tracking-[-0.01em]" />
          <span className="text-[11px] text-os-muted font-medium ml-1">{t(UNIT_WAN)}</span>
        </div>
        <div className="text-[13px] text-os-muted text-right tabular-nums">{entry.share.toFixed(1)}%</div>
        <ChevronRight
          className={`w-5 h-5 text-os-muted/70 transition-transform duration-300 ${open ? 'rotate-90 text-os-navy' : ''}`}
        />
      </button>

      <div
        className="overflow-hidden transition-[max-height] duration-500 ease-out bg-gradient-to-b from-os-navy/[0.015] to-transparent"
        style={{ maxHeight: open ? '1200px' : '0px' }}
      >
        <div className="pl-14 sm:pl-16 pr-7 sm:pr-8 pb-6 pt-1">
          <div className="border-l border-dashed border-os-navy/15 pl-5">
            {entry.transactions.map((tx) => (
              <div
                key={`${tx.date}-${tx.party.zh}`}
                className="grid grid-cols-[60px_1fr_140px] gap-4 items-baseline py-2.5 text-[13px] text-os-ink border-b border-os-line/50 last:border-b-0"
              >
                <span className="text-os-muted tabular-nums">{tx.date}</span>
                <span className="text-os-navy truncate">{t(tx.party)}</span>
                <span className="text-right text-os-navy font-medium tabular-nums">
                  {tx.amount}
                  <span className="text-os-muted text-[11px] font-normal ml-1">{t({ zh: '元', en: 'CNY' })}</span>
                </span>
              </div>
            ))}
            {entry.moreCount && (
              <div className="mt-3 text-[12px] text-os-muted italic">
                {t({ zh: `… 还有 ${entry.moreCount} 笔，查看完整明细 ›`, en: `… ${entry.moreCount} more — view full detail ›` })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// 主面板
// ============================================================
interface CashFlowPanelProps {
  active: boolean;
}

function CashFlowPanel({ active }: CashFlowPanelProps): JSX.Element {
  const { t } = useLang();
  const data = useCashFlow();
  const { totalIn, totalOut, balance } = computeTotals(data);
  const inEntries = toEntries(data.inflows, totalIn, IN_PALETTE);
  const outEntries = toEntries(data.outflows, totalOut, OUT_PALETTE);
  const [ribbonOn, setRibbonOn] = useState<boolean>(false);

  useEffect(() => {
    if (!active) {
      setRibbonOn(false);
      return;
    }
    const t = setTimeout(() => setRibbonOn(true), 380);
    return () => clearTimeout(t);
  }, [active]);

  return (
    <div className="bg-os-canvas">
      {/* ===== Hero ===== */}
      <div className="relative bg-os-paper px-7 sm:px-10 pt-9 pb-8 overflow-hidden">
        <div
          aria-hidden
          className="absolute -top-32 -right-16 w-[420px] h-[260px] rounded-full"
          style={{ background: 'radial-gradient(closest-side, rgba(44,111,208,.10), transparent 70%)' }}
        />
        <div className="relative flex items-end justify-between mb-7 flex-wrap gap-4">
          <div>
            <div className="text-[11px] text-os-muted tracking-[0.16em] uppercase mb-2 font-semibold">
              {t({ zh: 'Platform Cash Flow · 成立以来累计', en: 'Platform Cash Flow · since inception' })}
            </div>
            <h2 className="font-serif-display text-[28px] sm:text-[32px] font-semibold tracking-tight text-os-navy">
              {t({ zh: '现金流量表 · 总表', en: 'Cash Flow Statement · Summary' })}
            </h2>
          </div>
        </div>

        {/* metrics */}
        <div className="relative grid grid-cols-2 sm:grid-cols-[1.4fr_24px_1fr_24px_1fr_1.4fr] items-center gap-y-4 sm:gap-y-0">
          <Metric label={t({ zh: '期初余额', en: 'Opening balance' })} value={data.opening} active={active} tone="ink" />
          <Op>＋</Op>
          <Metric label={t({ zh: '累计流入', en: 'Total inflow' })} value={totalIn} active={active} tone="in" prefix="+" />
          <Op>−</Op>
          <Metric label={t({ zh: '累计流出', en: 'Total outflow' })} value={totalOut} active={active} tone="out" prefix="−" />
          <Metric label={t({ zh: '当前结余', en: 'Current balance' })} value={balance} active={active} tone="blue" align="right" />
        </div>

        {/* ribbon */}
        <div className="relative mt-7 pt-4 border-t border-os-line">
          <div
            className="grid h-[14px] gap-1.5"
            style={{ gridTemplateColumns: `${totalIn}fr ${totalOut}fr ${balance}fr` }}
          >
            <Ribbon className="bg-gradient-to-br from-[#34c77b] to-[#6cdba0]" on={ribbonOn} delay={0} />
            <Ribbon className="bg-gradient-to-br from-[#ef7a5f] to-[#f5a081]" on={ribbonOn} delay={140} />
            <Ribbon className="bg-gradient-to-br from-os-blue to-[#6c9bff]" on={ribbonOn} delay={280} />
          </div>
          <div className="flex justify-between text-[12px] text-os-muted mt-2.5">
            <span>{t({ zh: '累计资金流向', en: 'Cumulative fund flow' })}</span>
            <span>{t({ zh: '单位 · 万元', en: 'Unit · 10k CNY' })}</span>
          </div>
        </div>
      </div>

      {/* ===== Inflows ===== */}
      <FlowSection
        tone="in"
        title={t({ zh: '流入', en: 'Inflow' })}
        meta={t({ zh: `${data.inflows.length} 类收入`, en: `${data.inflows.length} revenue types` })}
        total={totalIn}
        prefix="+"
        entries={inEntries}
        active={active}
      />

      {/* ===== Outflows ===== */}
      <FlowSection
        tone="out"
        title={t({ zh: '流出', en: 'Outflow' })}
        meta={t({ zh: `${data.outflows.length} 类支出`, en: `${data.outflows.length} spending types` })}
        total={totalOut}
        prefix="−"
        entries={outEntries}
        active={active}
      />

      {/* ===== Reconcile ===== */}
      <div className="mx-7 sm:mx-10 mt-7 mb-9 relative overflow-hidden rounded-3xl border border-os-line bg-gradient-to-br from-os-paper to-[#F1F4FF] px-8 py-7">
        <div
          aria-hidden
          className="absolute -bottom-32 -right-16 w-[360px] h-[360px] rounded-full"
          style={{ background: 'radial-gradient(closest-side, rgba(44,111,208,.10), transparent 70%)' }}
        />
        <div className="relative grid grid-cols-2 sm:grid-cols-[1fr_24px_1fr_24px_1fr_1fr] gap-y-4 sm:gap-y-0 items-center">
          <ReconcileItem label={t({ zh: '期初余额', en: 'Opening balance' })} value={data.opening} active={active} tone="ink" />
          <Op>＋</Op>
          <ReconcileItem label={t({ zh: '累计流入', en: 'Total inflow' })} value={totalIn} active={active} tone="in" prefix="+" />
          <Op>−</Op>
          <ReconcileItem label={t({ zh: '累计流出', en: 'Total outflow' })} value={totalOut} active={active} tone="out" prefix="−" />
          <ReconcileItem label={t({ zh: '当前结余', en: 'Current balance' })} value={balance} active={active} tone="blue" align="right" size="lg" />
        </div>
      </div>

      <div className="px-7 sm:px-10 pb-9 text-center text-[12px] text-os-muted/90 leading-relaxed">
        <span className="inline-flex items-center gap-1.5">
          <Shield className="w-3.5 h-3.5 opacity-60" />
          {t({ zh: '公司成立以来累计 · 真实数据接入中，当前为示例账目', en: 'Cumulative since inception · real data integration in progress; sample figures shown for now' })}
        </span>
        <span className="mx-2 text-os-line">·</span>
        <span>{t({ zh: '金额单位：万元', en: 'Unit: 10k CNY' })}</span>
      </div>
    </div>
  );
}

function Op({ children }: { children: ReactNode }): JSX.Element {
  return <div className="hidden sm:block text-center text-[20px] text-os-line/90 leading-none pt-7 select-none">{children}</div>;
}

interface MetricProps {
  label: string;
  value: number;
  active: boolean;
  tone: 'ink' | 'in' | 'out' | 'blue';
  prefix?: string;
  align?: 'left' | 'right';
}

function Metric({ label, value, active, tone, prefix, align = 'left' }: MetricProps): JSX.Element {
  const { t } = useLang();
  const colorMap: Record<MetricProps['tone'], string> = {
    ink: 'text-os-navy',
    in: 'text-[#2bb673]',
    out: 'text-[#ec6b4f]',
    blue: 'text-os-blue',
  };
  return (
    <div className={align === 'right' ? 'text-right' : ''}>
      <div className="text-[12px] text-os-muted mb-2">{label}</div>
      <div className={`text-[26px] font-bold leading-[1.1] tracking-[-0.01em] ${colorMap[tone]}`}>
        {prefix && <span>{prefix}</span>}
        <Num value={value} active={active} />
        <span className="text-[12px] text-os-muted font-medium ml-1">{t(UNIT_WAN)}</span>
      </div>
    </div>
  );
}

function Ribbon({ className, on, delay }: { className: string; on: boolean; delay: number }): JSX.Element {
  return (
    <div
      className={`h-[14px] rounded-full ${className} origin-left transition-transform duration-[900ms] ease-out`}
      style={{ transform: on ? 'scaleX(1)' : 'scaleX(0)', transitionDelay: `${delay}ms` }}
    />
  );
}

interface FlowSectionProps {
  tone: 'in' | 'out';
  title: string;
  meta: string;
  total: number;
  prefix: string;
  entries: CashFlowEntry[];
  active: boolean;
}

function FlowSection({ tone, title, meta, total, prefix, entries, active }: FlowSectionProps): JSX.Element {
  const { t } = useLang();
  const totalColor = tone === 'in' ? 'text-[#2bb673]' : 'text-[#ec6b4f]';
  const dotColor = tone === 'in' ? 'bg-[#2bb673]' : 'bg-[#ec6b4f]';
  return (
    <div className="mx-7 sm:mx-10 mt-7 rounded-3xl border border-os-line bg-os-paper shadow-os overflow-hidden">
      <div className="sticky top-0 z-[2] flex justify-between items-center px-7 sm:px-8 py-5 bg-white/92 backdrop-blur border-b border-os-line">
        <div className="flex items-baseline gap-3">
          <span className={`inline-block w-2 h-2 rounded-full -translate-y-[2px] ${dotColor}`} />
          <h3 className="text-[18px] font-bold text-os-navy tracking-[-0.01em]">{title}</h3>
          <span className="text-[12px] text-os-muted">{meta}</span>
        </div>
        <div className={`text-[22px] font-bold ${totalColor} tracking-[-0.01em]`}>
          <span>{prefix}</span>
          <Num value={total} active={active} />
          <span className="text-[12px] text-os-muted font-medium ml-1">{t(UNIT_WAN)}</span>
        </div>
      </div>
      <div className="py-2">
        {entries.map((e, i) => (
          <FlowRow key={e.name.zh} entry={e} active={active} index={i} tone={tone} />
        ))}
      </div>
    </div>
  );
}

interface ReconcileItemProps {
  label: string;
  value: number;
  active: boolean;
  tone: 'in' | 'out' | 'blue' | 'ink';
  prefix?: string;
  align?: 'left' | 'right';
  size?: 'md' | 'lg';
}

function ReconcileItem({ label, value, active, tone, prefix, align = 'left', size = 'md' }: ReconcileItemProps): JSX.Element {
  const { t } = useLang();
  const colorMap: Record<ReconcileItemProps['tone'], string> = {
    in: 'text-[#2bb673]',
    out: 'text-[#ec6b4f]',
    blue: 'text-os-blue',
    ink: 'text-os-navy',
  };
  const sizeCls = size === 'lg' ? 'text-[26px]' : 'text-[20px]';
  return (
    <div className={align === 'right' ? 'text-right' : ''}>
      <div className="text-[12px] text-os-muted mb-1.5">{label}</div>
      <div className={`${sizeCls} font-bold tabular-nums tracking-[-0.01em] ${colorMap[tone]}`}>
        {prefix && <span>{prefix}</span>}
        <Num value={value} active={active} />
        <span className="text-[11px] text-os-muted font-medium ml-1">{t(UNIT_WAN)}</span>
      </div>
    </div>
  );
}

// ============================================================
// 抽屉壳子（背景遮罩 + 居中面板 + ESC 关闭 + 滚动锁）
// ============================================================
const DRAWER_CSS = `
@keyframes cfsBackdropIn { from { opacity: 0 } to { opacity: 1 } }
@keyframes cfsPanelIn {
  from { opacity: 0; transform: translateY(24px) scale(0.985); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}
`;

interface CashFlowDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function CashFlowDrawer({ open, onClose }: CashFlowDrawerProps): JSX.Element | null {
  const { t } = useLang();
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;
  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t({ zh: '平台现金流量表', en: 'Platform cash flow statement' })}
      className="fixed inset-0 z-[100] flex items-start sm:items-center justify-center p-0 sm:p-8"
    >
      <style>{DRAWER_CSS}</style>

      <div
        aria-hidden
        onClick={onClose}
        className="absolute inset-0 bg-os-navy/45"
        style={{
          backdropFilter: 'blur(14px) saturate(140%)',
          WebkitBackdropFilter: 'blur(14px) saturate(140%)',
          animation: 'cfsBackdropIn 0.28s ease both',
        }}
      />

      <div
        className="relative w-full sm:max-w-[1080px] max-h-screen sm:max-h-[88vh] overflow-y-auto rounded-none sm:rounded-3xl bg-os-canvas shadow-[0_40px_80px_-20px_rgba(15,23,42,0.45)] ring-1 ring-os-line"
        style={{ animation: 'cfsPanelIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) both' }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label={t({ zh: '关闭', en: 'Close' })}
          className="sticky top-4 ml-auto mr-4 z-[3] flex h-9 w-9 items-center justify-center rounded-full bg-white text-os-muted ring-1 ring-os-line hover:text-os-navy hover:ring-os-navy/30 transition-all hover:scale-105 float-right"
        >
          <X className="w-4 h-4" />
        </button>
        <CashFlowPanel active={open} />
      </div>
    </div>,
    document.body,
  );
}
