import { useEffect, useState } from 'react';

// 移动端判定: 按屏宽 (<768px) 而非 userAgent 嗅探 —— 更稳, 桌面窄窗/横竖屏切换都正确。
// 768 与 Tailwind `md` 断点对齐 (md = 768px, md:hidden / hidden md:flex 据此).
const MOBILE_QUERY = '(max-width: 767px)';

function getMatch(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia(MOBILE_QUERY).matches;
}

/** 当前视口是否为移动端宽度。监听 resize/旋转, 跨断点即时更新, 无需刷新。 */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState<boolean>(getMatch);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mql = window.matchMedia(MOBILE_QUERY);
    const onChange = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    // 初值兜底 (SSR / 首帧与实际不一致时)
    setIsMobile(mql.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  return isMobile;
}
