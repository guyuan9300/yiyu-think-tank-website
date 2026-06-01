import { type ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Image as ImageIcon } from 'lucide-react';
import { Reveal } from './open-source-home/ui';
import { useLang } from '../lib/i18n';

// ============================================================
// 项目介绍页 · 共用样式件 (浅底 + 绿色强调 #2EA56F, 文档式)
// 供 独角兽战略陪伴 / 数字化战略工作坊 等项目介绍页复用
// ============================================================

export const ACCENT = '#2EA56F';

export function Block({ children, tone = 'canvas' }: { children: ReactNode; tone?: 'paper' | 'canvas' | 'mist' }) {
  const bg = tone === 'paper' ? 'bg-os-paper' : tone === 'mist' ? 'bg-os-mist/30' : 'bg-os-canvas';
  return (
    <section className={`${bg} border-b border-os-line`}>
      <div className="mx-auto w-full max-w-[920px] px-5 sm:px-6 lg:px-8 py-14 sm:py-16">
        <Reveal>{children}</Reveal>
      </div>
    </section>
  );
}

export function AccentLabel({ children }: { children: ReactNode }) {
  return (
    <div className="inline-flex items-center gap-2 text-[12px] font-bold tracking-[0.16em] uppercase" style={{ color: ACCENT }}>
      <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: ACCENT }} />
      {children}
    </div>
  );
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return <h2 className="mt-4 font-serif-display text-[24px] sm:text-[30px] lg:text-[33px] font-semibold leading-[1.35] tracking-tight text-os-navy">{children}</h2>;
}

export function Body({ children }: { children: ReactNode }) {
  return <p className="mt-5 max-w-[720px] text-[15px] sm:text-[16px] leading-[1.95] text-os-muted">{children}</p>;
}

export function Quote({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <blockquote className={`border-l-[3px] pl-5 ${className}`} style={{ borderColor: ACCENT }}>
      <p className="font-serif-display text-[20px] sm:text-[25px] leading-[1.55] tracking-tight text-os-navy">{children}</p>
    </blockquote>
  );
}

export function PhotoSlot({ label, ratio = 'aspect-[16/9]' }: { label: string; ratio?: string }) {
  const { t } = useLang();
  return (
    <div className={`w-full ${ratio} rounded-[18px] border-2 border-dashed border-os-line bg-os-mist/30 flex flex-col items-center justify-center text-center text-os-muted/70`}>
      <ImageIcon className="h-7 w-7 mb-2 opacity-50" />
      <span className="text-[13px] font-medium text-os-muted">{label}</span>
      <span className="text-[11px] text-os-muted/55 mt-1">{t({ zh: '照片 / 图片位 · 待补', en: 'Photo / image placeholder · to be added' })}</span>
    </div>
  );
}

export function FeatureCard({ icon: Icon, title, desc }: { icon: LucideIcon; title: string; desc: string }) {
  return (
    <div className="rounded-[18px] bg-os-paper ring-1 ring-os-line shadow-os p-6">
      <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl" style={{ background: 'rgba(46,165,111,0.10)', color: ACCENT }}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="mt-4 font-serif-display text-[18px] font-semibold text-os-navy">{title}</div>
      <p className="mt-2 text-[14px] leading-7 text-os-muted">{desc}</p>
    </div>
  );
}

export function StepRow({ no, icon: Icon, tag, title, desc, bullets }: { no: number; icon: LucideIcon; tag: string; title: string; desc?: string; bullets?: string[] }) {
  return (
    <div className="flex items-start gap-5 rounded-[18px] bg-os-paper ring-1 ring-os-line shadow-os p-6">
      <div className="flex flex-col items-center shrink-0">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl text-white" style={{ background: ACCENT }}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="mt-2 font-serif-display text-[13px] font-semibold" style={{ color: ACCENT }}>{String(no).padStart(2, '0')}</div>
      </div>
      <div className="min-w-0">
        <div className="flex items-baseline gap-3">
          <span className="text-[12px] font-semibold tracking-[0.14em] text-os-muted uppercase">{tag}</span>
          <span className="font-serif-display text-[19px] font-semibold text-os-navy">{title}</span>
        </div>
        {desc && <p className="mt-2 text-[14px] leading-7 text-os-muted">{desc}</p>}
        {bullets && (
          <ul className="mt-3 space-y-1.5">
            {bullets.map((b) => (
              <li key={b} className="flex items-start gap-2.5 text-[14px] leading-7 text-os-ink/85">
                <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: ACCENT }} />{b}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export function AccentButton({ children, onClick, small }: { children: ReactNode; onClick?: () => void; small?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex shrink-0 items-center justify-center gap-2 rounded-xl font-semibold text-white transition hover:brightness-105 ${small ? 'px-5 py-2.5 text-[13.5px]' : 'px-7 py-3.5 text-[15px]'}`}
      style={{ background: ACCENT, boxShadow: '0 12px 30px -12px rgba(46,165,111,0.6)' }}
    >
      {children}
    </button>
  );
}

export function GhostButton({ children, onClick }: { children: ReactNode; onClick?: () => void }) {
  return (
    <button onClick={onClick} className="inline-flex items-center justify-center gap-2 rounded-xl bg-os-paper px-6 py-3.5 text-[15px] font-medium text-os-navy ring-1 ring-os-line shadow-os transition hover:ring-os-navy/30">
      {children}
    </button>
  );
}
