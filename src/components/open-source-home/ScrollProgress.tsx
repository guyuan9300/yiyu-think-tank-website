import { useEffect, useRef } from 'react';

// 顶部滚动进度条 —— transform: scaleX (GPU 合成, 零 layout) + rAF 节流直接写 DOM,
// 不走 React state, 避免每个滚动帧重渲染组件。home / 开源工作台页共用。
export function ScrollProgress() {
  const barRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const total = document.documentElement.scrollHeight - window.innerHeight;
      const p = total > 0 ? window.scrollY / total : 0;
      if (barRef.current) barRef.current.style.transform = `scaleX(${p})`;
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    update();
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);
  return (
    <div className="fixed top-0 inset-x-0 h-[2px] z-[60]">
      <div
        ref={barRef}
        className="h-full origin-left bg-gradient-to-r from-os-navy via-os-blue to-os-spark"
        style={{ transform: 'scaleX(0)', willChange: 'transform' }}
      />
    </div>
  );
}
