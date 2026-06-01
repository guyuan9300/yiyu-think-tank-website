import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Sparkles, type LucideIcon } from 'lucide-react';
import { Button } from '../ui';
import { useLang, type Bilingual } from '../../../lib/i18n';

// ============================================================
// 价值卡详情抽屉 (可复用) —— 点开「关于益语智库 · 价值全景」任一卡片时弹出。
// 壳子沿用 Ledger 抽屉同款 (createPortal + 背景模糊 + 面板滑入 + ESC/点外关闭),
// UI 做精致: 渐变头部 + 大号序号水印 + 图标芯片 + 分区小标签 + 产出胶囊 + AI 承接 callout。
// 内容取自《益语智库介绍文档·详细版》。守 ANTI_FAKE: 只放做法/产出/信号, 不放编造数字。
// ============================================================

export interface ValueDetail {
  num: string;
  icon: LucideIcon;
  title: Bilingual;
  essence: Bilingual;
  signals: Bilingual[];
  approach: Bilingual;
  outputs: Bilingual[];
  aiNote: Bilingual;
  cta: { label: Bilingual; href: string };
}

const DRAWER_CSS = `
@keyframes vdBackdropIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes vdPanelIn {
  from { opacity: 0; transform: translateY(26px) scale(0.985); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}
@media (prefers-reduced-motion: reduce) {
  .vd-backdrop, .vd-panel { animation: none !important; }
}
`;

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-os-indigo/75 mb-3.5">
      {children}
    </div>
  );
}

interface ValueDrawerProps {
  value: ValueDetail | null;
  onClose: () => void;
}

export function ValueDrawer({ value, onClose }: ValueDrawerProps): JSX.Element | null {
  const { t } = useLang();
  useEffect(() => {
    if (!value) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [value, onClose]);

  useEffect(() => {
    if (!value) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [value]);

  if (!value) return null;
  if (typeof document === 'undefined') return null;

  const Icon = value.icon;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${t({ zh: '益语智库价值', en: 'Yiyu Institute value' })} · ${t(value.title)}`}
      className="fixed inset-0 z-[100] flex items-start sm:items-center justify-center p-0 sm:p-6"
    >
      <style>{DRAWER_CSS}</style>

      <div
        aria-hidden
        onClick={onClose}
        className="vd-backdrop absolute inset-0 bg-os-navy/45"
        style={{
          backdropFilter: 'blur(14px) saturate(140%)',
          WebkitBackdropFilter: 'blur(14px) saturate(140%)',
          animation: 'vdBackdropIn 0.28s ease both',
        }}
      />

      <div
        className="vd-panel relative w-full sm:max-w-[680px] max-h-screen sm:max-h-[90vh] overflow-y-auto rounded-none sm:rounded-[28px] bg-os-canvas"
        style={{
          boxShadow: '0 40px 90px -24px rgba(15,23,42,0.5), inset 0 0 0 1px #E3E6F1',
          animation: 'vdPanelIn 0.42s cubic-bezier(0.16, 1, 0.3, 1) both',
        }}
      >
        {/* 关闭 */}
        <button
          type="button"
          onClick={onClose}
          aria-label={t({ zh: '关闭', en: 'Close' })}
          className="absolute top-5 right-5 z-[3] flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-os-muted ring-1 ring-os-line backdrop-blur-sm transition-all hover:text-os-navy hover:ring-os-navy/30 hover:scale-105"
        >
          <X className="w-4 h-4" />
        </button>

        {/* 头部：渐变 + 序号水印 + 图标芯片 + 标题 + 本质 */}
        <header className="relative overflow-hidden px-7 sm:px-10 pt-11 pb-9 bg-gradient-to-br from-[#EFEFFA] via-os-paper to-os-canvas">
          <span
            aria-hidden
            className="pointer-events-none absolute -top-6 right-4 font-serif-display font-bold leading-none text-os-indigo/[0.07] select-none"
            style={{ fontSize: '150px' }}
          >
            {value.num}
          </span>
          <div className="relative">
            <div className="w-[52px] h-[52px] rounded-[16px] bg-os-indigo/10 text-os-indigo flex items-center justify-center mb-5">
              <Icon className="w-6 h-6" strokeWidth={1.7} />
            </div>
            <h2 className="font-serif-display text-[24px] sm:text-[28px] font-semibold tracking-tight text-os-navy">
              {t(value.title)}
            </h2>
            <p className="mt-3 text-[14.5px] sm:text-[15px] leading-[1.8] text-os-muted max-w-[34rem]">
              {t(value.essence)}
            </p>
          </div>
        </header>

        <div className="px-7 sm:px-10 py-9 space-y-9">
          {/* 这通常发生在你 */}
          <section>
            <SectionLabel>{t({ zh: '这通常发生在你', en: 'This usually happens when you' })}</SectionLabel>
            <ul className="space-y-2.5">
              {value.signals.map((s) => (
                <li key={s.zh} className="flex items-start gap-3 text-[14px] leading-[1.7] text-os-navy/80">
                  <span className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-os-spark" />
                  {t(s)}
                </li>
              ))}
            </ul>
          </section>

          {/* 我们怎么陪你做 */}
          <section>
            <SectionLabel>{t({ zh: '我们怎么陪你做', en: 'How we work alongside you' })}</SectionLabel>
            <p className="text-[14px] leading-[1.9] text-os-muted">{t(value.approach)}</p>
          </section>

          {/* 你会得到 */}
          <section>
            <SectionLabel>{t({ zh: '你会得到', en: 'What you get' })}</SectionLabel>
            <div className="flex flex-wrap gap-2.5">
              {value.outputs.map((o) => (
                <span
                  key={o.zh}
                  className="inline-flex items-center rounded-full bg-os-mist ring-1 ring-os-line px-3.5 py-[7px] text-[13px] font-medium text-os-navy/85"
                >
                  {t(o)}
                </span>
              ))}
            </div>
          </section>

          {/* 在益语智库 AI 里 */}
          <section className="rounded-[18px] bg-os-navy/[0.035] ring-1 ring-os-line p-5 sm:p-6">
            <div className="flex items-center gap-2 mb-2.5">
              <Sparkles className="w-[18px] h-[18px] text-os-violet" strokeWidth={1.8} />
              <span className="text-[13px] font-semibold tracking-[0.04em] text-os-navy">{t({ zh: '在益语智库 AI 里怎么承接', en: 'How Yiyu AI carries this forward' })}</span>
            </div>
            <p className="text-[13.5px] leading-[1.85] text-os-muted">{t(value.aiNote)}</p>
          </section>

          {/* CTA */}
          <div className="pt-1">
            <Button href={value.cta.href} variant="primary" withArrow>
              {t(value.cta.label)}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
