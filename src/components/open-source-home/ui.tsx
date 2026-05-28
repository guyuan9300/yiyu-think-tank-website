import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowRight, ExternalLink } from 'lucide-react';

// ============================================================
// 开源官网首页 · 轻量原子组件 + 深蓝设计系统
// 主色：os.navy 深蓝 / os.canvas 米白 / os.mist 浅灰蓝 / os.spark 低饱和橙
// 阴影轻、留白足、卡片圆角统一 20px、宣言式衬线大标题。
// ============================================================

// 滚动进入视口时的轻量淡入（克制，不做大位移强动画）
export function useReveal(threshold = 0.12) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ob = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setShown(true);
          ob.unobserve(e.target);
        }
      },
      { threshold, rootMargin: '0px 0px -48px 0px' },
    );
    ob.observe(el);
    return () => ob.disconnect();
  }, [threshold]);
  return { ref, shown };
}

export function Reveal({
  children,
  delay = 0,
  className = '',
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const { ref, shown } = useReveal();
  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${shown ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

export function Container({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`mx-auto w-full max-w-[1200px] px-5 sm:px-6 lg:px-8 ${className}`}>{children}</div>;
}

type SectionTone = 'canvas' | 'paper' | 'mist' | 'navy' | 'lavender';
const SECTION_BG: Record<SectionTone, string> = {
  canvas: 'bg-os-canvas',
  paper: 'bg-os-paper',
  mist: 'bg-os-mist',
  navy: 'bg-os-navy',
  lavender: 'bg-[#F3F3FC]',
};

export function Section({
  children,
  tone = 'canvas',
  id,
  className = '',
}: {
  children: ReactNode;
  tone?: SectionTone;
  id?: string;
  className?: string;
}) {
  return (
    <section id={id} className={`scroll-mt-24 py-14 sm:py-20 lg:py-[120px] ${SECTION_BG[tone]} ${className}`}>
      {children}
    </section>
  );
}

// 区块标题：可选 eyebrow + 衬线大标题 + 副标题，统一节奏
export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  align = 'center',
  invert = false,
}: {
  eyebrow?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  align?: 'center' | 'left';
  invert?: boolean;
}) {
  const center = align === 'center';
  return (
    <div className={`${center ? 'text-center mx-auto' : 'text-left'} max-w-2xl ${center ? '' : ''}`}>
      {eyebrow && (
        <div className={`flex items-center gap-2.5 mb-5 ${center ? 'justify-center' : ''}`}>
          <span className="h-px w-7 bg-os-spark/70" />
          <span className={`text-[12px] font-semibold tracking-[0.16em] ${invert ? 'text-os-spark' : 'text-os-spark'}`}>
            {eyebrow}
          </span>
        </div>
      )}
      <h2
        className={`font-serif-display text-[28px] sm:text-[34px] lg:text-[40px] font-semibold leading-[1.3] tracking-tight ${invert ? 'text-white' : 'text-os-navy'}`}
      >
        {title}
      </h2>
      {subtitle && (
        <p className={`mt-5 text-[16px] sm:text-[17px] leading-[1.85] ${invert ? 'text-white/70' : 'text-os-muted'}`}>
          {subtitle}
        </p>
      )}
    </div>
  );
}

export function Card({
  children,
  className = '',
  hoverable = true,
}: {
  children: ReactNode;
  className?: string;
  hoverable?: boolean;
}) {
  return (
    <div
      className={`rounded-[20px] bg-os-paper ring-1 ring-os-line shadow-os ${
        hoverable ? 'transition-all duration-300 hover:shadow-os-lg hover:-translate-y-0.5' : ''
      } ${className}`}
    >
      {children}
    </div>
  );
}

type BadgeTone = 'done' | 'progress' | 'seed' | 'recruit';
const BADGE_STYLES: Record<BadgeTone, string> = {
  done: 'bg-os-mist text-os-blue ring-os-blue/15',
  progress: 'bg-os-spark-soft text-os-spark ring-os-spark/20',
  seed: 'bg-os-navy/[0.06] text-os-navy ring-os-navy/15',
  recruit: 'bg-os-spark-soft text-os-spark ring-os-spark/20',
};

export function Badge({ tone = 'done', children }: { tone?: BadgeTone; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ${BADGE_STYLES[tone]}`}
    >
      {children}
    </span>
  );
}

type ButtonVariant = 'primary' | 'secondary' | 'spark' | 'ghost';
const BTN_VARIANT: Record<ButtonVariant, string> = {
  primary: 'bg-gradient-to-r from-os-navy to-os-indigo text-white hover:brightness-110 shadow-os',
  secondary: 'bg-os-paper text-os-navy ring-1 ring-os-navy/15 hover:ring-os-navy/35',
  spark: 'bg-os-spark text-white hover:brightness-[1.05] shadow-os',
  ghost: 'text-os-navy hover:bg-os-navy/[0.05]',
};

interface ButtonProps {
  children: ReactNode;
  href?: string;
  external?: boolean;
  onClick?: () => void;
  variant?: ButtonVariant;
  withArrow?: boolean;
  className?: string;
  ariaLabel?: string;
}

// 同时支持锚点/外链/onClick，自带 hover+focus，触控高度≥44px
export function Button({
  children,
  href,
  external,
  onClick,
  variant = 'primary',
  withArrow = false,
  className = '',
  ariaLabel,
}: ButtonProps) {
  const base =
    'group inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 min-h-[44px] text-[15px] font-semibold transition-all duration-300 outline-none focus-visible:ring-2 focus-visible:ring-os-blue/40 focus-visible:ring-offset-2 focus-visible:ring-offset-os-canvas active:scale-[0.98]';
  const cls = `${base} ${BTN_VARIANT[variant]} ${className}`;
  const inner = (
    <>
      {children}
      {external && <ExternalLink className="w-4 h-4 opacity-70" aria-hidden="true" />}
      {withArrow && !external && (
        <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5" aria-hidden="true" />
      )}
    </>
  );

  if (href) {
    return (
      <a
        href={href}
        aria-label={ariaLabel}
        {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
        className={cls}
      >
        {inner}
      </a>
    );
  }
  return (
    <button type="button" aria-label={ariaLabel} onClick={onClick} className={cls}>
      {inner}
    </button>
  );
}
