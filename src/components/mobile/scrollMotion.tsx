import { useEffect, useRef, useState } from 'react';

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
const prefersReduced = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

interface CountUpProps {
  end: number;
  decimals?: number;
  withComma?: boolean;
  durationMs?: number;
  className?: string;
}

function format(n: number, decimals: number, withComma: boolean): string {
  const fixed = n.toFixed(decimals);
  if (!withComma) return fixed;
  const [int, dec] = fixed.split('.');
  const withSep = int.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return dec ? `${withSep}.${dec}` : withSep;
}

/** 数字滚动递增: 进入视口后从 0 缓动到 end。尊重 reduced-motion。 */
export function CountUp({ end, decimals = 0, withComma = false, durationMs = 1300, className }: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const [val, setVal] = useState(0);
  const done = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (prefersReduced()) { setVal(end); return; }

    const io = new IntersectionObserver((entries) => {
      if (!entries[0]?.isIntersecting || done.current) return;
      done.current = true;
      io.disconnect();
      let raf = 0;
      let start = 0;
      const tick = (ts: number) => {
        if (!start) start = ts;
        const p = Math.min(1, (ts - start) / durationMs);
        setVal(end * easeOutCubic(p));
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
      return () => cancelAnimationFrame(raf);
    }, { threshold: 0.4 });
    io.observe(el);
    return () => io.disconnect();
  }, [end, durationMs]);

  return <span ref={ref} className={className}>{format(val, decimals, withComma)}</span>;
}

/** 元素穿过视口时的进度 0→1 (scroll-linked, 用于时间线填充等)。 */
export function useScrollProgress<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (prefersReduced()) { setProgress(1); return; }
    let raf = 0;
    const compute = () => {
      raf = 0;
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight;
      // section 顶到达 75% 视口时 0, 底离 35% 视口时 1
      const p = (vh * 0.78 - rect.top) / (rect.height * 0.85);
      setProgress(Math.max(0, Math.min(1, p)));
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(compute); };
    compute();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return { ref, progress };
}
