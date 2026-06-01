import { useEffect, useRef, useState, type ReactNode } from 'react';

// 滚动入场揭示: 元素进入视口时按 variant 动画一次。尊重 prefers-reduced-motion。
// 多变体让每个模块有各自质感的「炫酷滑动」入场。

type Variant = 'up' | 'left' | 'right' | 'scale' | 'blur';

interface RevealProps {
  children: ReactNode;
  delay?: number;
  variant?: Variant;
  className?: string;
}

const HIDDEN: Record<Variant, string> = {
  up: 'translateY(18px)',
  left: 'translateX(-26px)',
  right: 'translateX(26px)',
  scale: 'scale(0.93)',
  blur: 'translateY(12px)',
};

export function Reveal({ children, delay = 0, variant = 'up', className }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduce = typeof window !== 'undefined'
      && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce) { setShown(true); return; }

    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) { setShown(true); io.disconnect(); }
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const ease = 'cubic-bezier(0.22,1,0.36,1)';
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: shown ? 1 : 0,
        transform: shown ? 'none' : HIDDEN[variant],
        filter: variant === 'blur' && !shown ? 'blur(9px)' : 'none',
        transition: `opacity 0.7s ${ease} ${delay}ms, transform 0.7s ${ease} ${delay}ms, filter 0.7s ${ease} ${delay}ms`,
        willChange: 'opacity, transform',
      }}
    >
      {children}
    </div>
  );
}
