import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Heart } from 'lucide-react';
import { useLang, type Bilingual } from '../../../lib/i18n';
import { useSupportPool, type Project } from '../../../lib/supportPoolData';

// ============================================================
// 行动者支持池 · 项目名册
// 点击 Ledger 第二张"行动者支持池"卡片时打开。
// 数据来自共享数据层 src/lib/supportPoolData.ts (后台可改, localStorage 桥)。
// ============================================================

const ACCENT = '#2EA56F';

const UNIT_WAN: Bilingual = { zh: '万元', en: 'k CNY' };


// ============================================================
// 数字滚动 hook (与 CashFlowStatement 同模式，按 active 触发)
// ============================================================
function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

interface CountUpOptions {
  decimals?: number;
  duration?: number;
  active: boolean;
}

function useCountUp(target: number, options: CountUpOptions): string {
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
}

function Num({ value, decimals = 2, active, duration }: NumProps): JSX.Element {
  const text = useCountUp(value, { decimals, duration, active });
  return <span className="tabular-nums">{text}</span>;
}

// ============================================================
// 项目卡片
// ============================================================
interface ProjectCardProps {
  project: Project;
  active: boolean;
  index: number;
}

function ProjectCard({ project, active, index }: ProjectCardProps): JSX.Element {
  const { t } = useLang();
  const [barWidth, setBarWidth] = useState<string>('0%');

  useEffect(() => {
    if (!active) {
      setBarWidth('0%');
      return;
    }
    const t = setTimeout(() => setBarWidth(`${project.progress}%`), 380 + index * 60);
    return () => clearTimeout(t);
  }, [active, project.progress, index]);

  return (
    <article
      className="relative bg-os-paper rounded-[20px] px-8 sm:px-10 pt-9 pb-8 overflow-hidden cursor-pointer group"
      onClick={project.href ? () => { window.location.href = project.href!; } : undefined}
      style={{
        boxShadow:
          'inset 0 0 0 1px #E3E6F1, 0 1px 2px rgba(20, 35, 63, .04), 0 8px 24px -14px rgba(20, 35, 63, .08)',
        transition: 'transform .35s cubic-bezier(.2,.7,.3,1), box-shadow .35s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow =
          'inset 0 0 0 1px rgba(46, 165, 111, .28), 0 1px 2px rgba(20, 35, 63, .04), 0 24px 40px -18px rgba(46, 165, 111, .22)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow =
          'inset 0 0 0 1px #E3E6F1, 0 1px 2px rgba(20, 35, 63, .04), 0 8px 24px -14px rgba(20, 35, 63, .08)';
      }}
    >
      {/* 头部:标题 + 金额 */}
      <div className="flex items-start justify-between gap-9 mb-4">
        <h3 className="flex-1 min-w-0 text-[20px] sm:text-[21px] font-bold text-os-navy leading-[1.4] tracking-[-0.01em]">
          {t(project.title)}
        </h3>
        <div className="flex-shrink-0 text-right leading-none">
          <div className="text-[11.5px] text-os-muted mb-2 tracking-[0.04em]">{project.amountLabel ? t(project.amountLabel) : t({ zh: '已支持', en: 'Funded' })}</div>
          <div className="text-[28px] sm:text-[30px] font-bold leading-none tabular-nums tracking-[-0.02em]" style={{ color: ACCENT }}>
            <Num value={project.amount} active={active} />
            <span className="text-[12px] text-os-muted font-medium ml-1">{project.unit ? t(project.unit) : t(UNIT_WAN)}</span>
          </div>
          <div className="mt-1.5 text-[12px] text-[#9099b5] tabular-nums">{t(project.budgetLabel)}</div>
        </div>
      </div>

      {/* 描述 */}
      <p className="text-[15px] text-os-ink leading-[1.9] mb-5 max-w-[760px]">{t(project.description)}</p>

      {/* 解决什么 */}
      <div className="mb-6 max-w-[760px]">
        <div
          className="inline-flex items-center gap-[7px] text-[11px] uppercase font-bold mb-2.5 tracking-[0.16em]"
          style={{ color: ACCENT }}
        >
          <span className="inline-block w-1 h-1 rounded-full" style={{ background: ACCENT }} />
          {t({ zh: '解决什么', en: 'What it solves' })}
        </div>
        <p className="text-[14.5px] text-os-muted leading-[1.9]">{t(project.problem)}</p>
      </div>

      {/* 底部:3 组指标 */}
      <div className="flex items-baseline gap-[22px] pt-5 border-t border-os-line flex-wrap">
        {project.stats.map((s, i) => (
          <span key={`${s.primary ?? ''}-${s.label.zh}`} className="contents">
            {i > 0 && <span className="w-px h-3 bg-os-line self-center" />}
            <div className="inline-flex items-baseline gap-1.5 text-[13.5px]">
              {s.primary && (
                <span className="text-[16px] font-bold text-os-navy tabular-nums">{s.primary}</span>
              )}
              <span className="text-os-muted text-[13px]">{t(s.label)}</span>
            </div>
          </span>
        ))}
      </div>

      {/* 了解详情 (仅有 href 的项目卡, 如独角兽战略陪伴) */}
      {project.href && (
        <div className="mt-6">
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-semibold text-white shadow-[0_8px_20px_-10px_rgba(46,165,111,0.6)] transition group-hover:brightness-105"
            style={{ background: ACCENT }}
          >
            {t({ zh: '了解详情', en: 'Learn more' })} <span aria-hidden>→</span>
          </span>
        </div>
      )}

      {/* 卡底 3px 绿色进度条 */}
      <div className="absolute left-0 right-0 bottom-0 h-[3px]" style={{ background: 'rgba(46, 165, 111, .10)' }}>
        <div
          className="h-full transition-[width] duration-[1600ms] ease-out rounded-r-[3px]"
          style={{ width: barWidth, background: ACCENT }}
        />
      </div>
    </article>
  );
}

// ============================================================
// 主面板内容
// ============================================================
interface PanelProps {
  active: boolean;
}

function SupportPoolPanel({ active }: PanelProps): JSX.Element {
  const { t } = useLang();
  const { projects, stats } = useSupportPool();
  return (
    <div className="bg-os-canvas px-7 sm:px-12 lg:px-14 py-12 sm:py-16">
      {/* ===== Hero ===== */}
      <section className="mb-12 sm:mb-14">
        {/* 与外卡同款的 44px chip + Heart icon */}
        <div
          className="w-11 h-11 rounded-[13px] flex items-center justify-center mb-5"
          style={{ background: 'rgba(46, 165, 111, .12)' }}
          aria-hidden
        >
          <Heart className="w-[22px] h-[22px]" style={{ color: ACCENT }} strokeWidth={1.8} />
        </div>

        <div className="inline-block text-[12px] uppercase font-bold tracking-[0.16em] mb-3" style={{ color: ACCENT }}>
          {t({ zh: '行动者支持池', en: 'Practitioner Support Pool' })}
        </div>

        <h2 className="font-serif-display text-[30px] sm:text-[38px] lg:text-[42px] font-semibold leading-[1.3] tracking-tight text-os-navy mb-5">
          {t({ zh: '这笔钱,正在支持这些事情发生', en: 'This is what your money is making happen' })}
        </h2>

        <p className="text-[16.5px] leading-[1.9] text-os-muted max-w-[620px]">
          {t({
            zh: '行动者支持池只用于一件事——把钱送到那些已经在做事的人和组织手里。下面是它当前正在支持的真实项目。',
            en: 'The Practitioner Support Pool does one thing — get money to the people and organizations already doing the work. Below are the real projects it’s funding now.',
          })}
        </p>

        {/* 4 个指标内联 */}
        <div className="mt-9 inline-flex flex-wrap items-baseline text-[14px] text-os-muted">
          <PulseItem
            value={<Num value={projects.length} decimals={0} active={active} duration={1000} />}
            unit={t({ zh: '个', en: '' })}
            label={t({ zh: '在持项目', en: 'active projects' })}
            greenValue
          />
          <PulseItem
            value={<Num value={stats.cumulative} active={active} />}
            unit={t(UNIT_WAN)}
            label={t({ zh: '累计支持', en: 'total funded' })}
          />
          <PulseItem
            value={<Num value={stats.thisMonth} active={active} />}
            unit={t(UNIT_WAN)}
            label={t({ zh: '本月已支持', en: 'funded this month' })}
          />
          <PulseItem
            value={<Num value={stats.balance} active={active} />}
            unit={t(UNIT_WAN)}
            label={t({ zh: '池子余额', en: 'pool balance' })}
          />
        </div>
      </section>

      {/* ===== Section Label ===== */}
      <div className="flex items-baseline justify-between mb-[18px] px-1">
        <h3 className="text-[13px] font-semibold text-os-muted tracking-[0.04em]">{t({ zh: '正在支持的项目', en: 'Projects being funded' })}</h3>
        <span className="text-[12.5px] text-[#9099b5] tabular-nums">
          {t({ zh: `${projects.length} 个 · 累计 ${stats.cumulative.toFixed(2)} 万元`, en: `${projects.length} · ${stats.cumulative.toFixed(2)}k CNY total` })}
        </span>
      </div>

      {/* ===== Projects ===== */}
      <div className="flex flex-col gap-[18px]">
        {projects.map((p, i) => (
          <ProjectCard key={p.title.zh} project={p} active={active} index={i} />
        ))}
      </div>

      {/* ===== Footnote ===== */}
      <div className="mt-12 text-center text-[12.5px] text-[#9099b5] leading-[1.8]">
        {t({ zh: '项目信息每月更新', en: 'Project info updated monthly' })}
        <span className="mx-3 text-os-line">·</span>
        {t({ zh: '所有当事人姓名与具体地点均已脱敏', en: 'All names and exact locations are anonymized' })}
        <span className="mx-3 text-os-line">·</span>
        {t({ zh: '最后更新 2025-05-26', en: 'Last updated 2025-05-26' })}
      </div>
    </div>
  );
}

interface PulseItemProps {
  value: React.ReactNode;
  unit: string;
  label: string;
  greenValue?: boolean;
}

function PulseItem({ value, unit, label, greenValue }: PulseItemProps): JSX.Element {
  return (
    <div className="inline-flex items-baseline gap-[7px] pr-5 [&:not(:first-child)]:pl-5 [&:not(:first-child)]:border-l [&:not(:first-child)]:border-os-line">
      <span
        className="text-[16px] font-bold tabular-nums text-os-navy"
        style={greenValue ? { color: ACCENT } : undefined}
      >
        {value} {unit}
      </span>
      <span className="text-[13px] text-os-muted">{label}</span>
    </div>
  );
}

// ============================================================
// 抽屉壳子(与 CashFlowDrawer 同模式)
// ============================================================
const DRAWER_CSS = `
@keyframes spdBackdropIn { from { opacity: 0 } to { opacity: 1 } }
@keyframes spdPanelIn {
  from { opacity: 0; transform: translateY(24px) scale(0.985); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}
`;

interface SupportPoolDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function SupportPoolDrawer({ open, onClose }: SupportPoolDrawerProps): JSX.Element | null {
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
      aria-label={t({ zh: '行动者支持池 · 项目名册', en: 'Practitioner Support Pool · project roster' })}
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
          animation: 'spdBackdropIn 0.28s ease both',
        }}
      />

      <div
        className="relative w-full sm:max-w-[1080px] max-h-screen sm:max-h-[88vh] overflow-y-auto rounded-none sm:rounded-3xl bg-os-canvas shadow-[0_40px_80px_-20px_rgba(15,23,42,0.45)]"
        style={{
          boxShadow: '0 40px 80px -20px rgba(15,23,42,0.45), inset 0 0 0 1px #E3E6F1',
          animation: 'spdPanelIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) both',
        }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label={t({ zh: '关闭', en: 'Close' })}
          className="sticky top-4 ml-auto mr-4 z-[3] flex h-9 w-9 items-center justify-center rounded-full bg-white text-os-muted ring-1 ring-os-line hover:text-os-navy hover:ring-os-navy/30 transition-all hover:scale-105 float-right"
        >
          <X className="w-4 h-4" />
        </button>
        <SupportPoolPanel active={open} />
      </div>
    </div>,
    document.body,
  );
}
