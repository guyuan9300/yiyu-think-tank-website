import { useEffect, useState } from 'react';
import { Menu, X, Github } from 'lucide-react';
import { Button } from './ui';
import { ANCHORS, GITHUB_URL } from './links';
import { useLang, type Bilingual } from '../../lib/i18n';

const NAV_ITEMS: { label: Bilingual; key: string; href: string; external?: boolean }[] = [
  { label: { zh: '行动者宣言', en: 'Manifesto' }, key: 'manifesto', href: ANCHORS.manifesto },
  { label: { zh: '功能模块', en: 'Modules' }, key: 'features', href: ANCHORS.features },
  { label: { zh: '行动者故事', en: 'Stories' }, key: 'stories', href: ANCHORS.stories },
  { label: { zh: '加入我们', en: 'Join Us' }, key: 'join', href: ANCHORS.join },
  { label: { zh: 'Roadmap', en: 'Roadmap' }, key: 'roadmap', href: ANCHORS.roadmap },
  { label: { zh: 'GitHub', en: 'GitHub' }, key: 'github', href: GITHUB_URL, external: true },
];

// 移动端聚焦核心入口（下载在顶栏按钮）：功能模块 / 加入我们 / GitHub
const MOBILE_NAV_ITEMS = NAV_ITEMS.filter((it) =>
  ['features', 'join', 'github'].includes(it.key),
);

export function OpenSourceNav() {
  const { t } = useLang();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-os-canvas/85 backdrop-blur-md border-b border-os-line' : 'bg-transparent border-b border-transparent'
      }`}
    >
      <div className="mx-auto w-full max-w-[1200px] px-5 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-[68px]">
          {/* Logo + 副标识 */}
          <a href="#top" className="flex items-center gap-3 group" aria-label={t({ zh: '益语智库 · 返回顶部', en: 'Yiyu Institute · Back to top' })}>
            <span className="w-9 h-9 rounded-[10px] overflow-hidden ring-1 ring-os-navy/10 bg-os-navy/[0.04] flex items-center justify-center">
              <img src={`${import.meta.env.BASE_URL}yiyu-avatar.png`} alt={t({ zh: '益语智库', en: 'Yiyu Institute' })} className="w-full h-full object-cover" />
            </span>
            <span className="leading-tight">
              <span className="block font-serif-display text-[15.5px] font-semibold text-os-navy leading-tight">{t({ zh: '益语智库智能平台', en: 'Yiyu Institute Intelligent Platform' })}</span>
              <span className="block text-[9.5px] tracking-[0.03em] text-os-muted/80">YiYu ThinkTank Intelligent Platform</span>
            </span>
          </a>

          {/* 桌面导航 */}
          <nav className="hidden lg:flex items-center gap-1">
            {NAV_ITEMS.map((it) => (
              <a
                key={it.key}
                href={it.href}
                {...(it.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                className="inline-flex items-center gap-1 px-3.5 py-2 rounded-full text-[14px] font-medium text-os-ink/75 hover:text-os-navy hover:bg-os-navy/[0.05] transition-colors"
              >
                {t(it.label)}
                {it.external && <Github className="w-3.5 h-3.5 opacity-60" aria-hidden="true" />}
              </a>
            ))}
          </nav>

          {/* 右侧按钮（桌面） */}
          <div className="hidden lg:flex items-center gap-2.5">
            <Button href={ANCHORS.join} variant="secondary" className="px-5 py-2 text-[14px]">
              {t({ zh: '参与共建', en: 'Contribute' })}
            </Button>
            <Button href={ANCHORS.download} variant="primary" className="px-5 py-2 text-[14px]">
              {t({ zh: '下载开源版', en: 'Download Open Source' })}
            </Button>
          </div>

          {/* 移动端：菜单 + 下载 */}
          <div className="flex lg:hidden items-center gap-2">
            <Button href={ANCHORS.download} variant="primary" className="px-4 py-2 text-[13px]">
              {t({ zh: '下载', en: 'Download' })}
            </Button>
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-label={open ? t({ zh: '关闭菜单', en: 'Close menu' }) : t({ zh: '打开菜单', en: 'Open menu' })}
              className="p-2 rounded-xl text-os-navy hover:bg-os-navy/[0.06] transition-colors"
            >
              {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* 移动端折叠菜单 */}
      {open && (
        <div className="lg:hidden bg-os-canvas border-t border-os-line">
          <div className="px-5 py-4 space-y-1">
            {MOBILE_NAV_ITEMS.map((it) => (
              <a
                key={it.key}
                href={it.href}
                {...(it.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                onClick={() => setOpen(false)}
                className="block px-4 py-3 rounded-xl text-[15px] font-medium text-os-ink/80 hover:bg-os-navy/[0.05] transition-colors"
              >
                {t(it.label)}
              </a>
            ))}
            <div className="pt-2">
              <Button href={ANCHORS.join} variant="secondary" className="w-full">
                {t({ zh: '参与共建', en: 'Contribute' })}
              </Button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
