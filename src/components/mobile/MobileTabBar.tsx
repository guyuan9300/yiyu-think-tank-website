import { useEffect } from 'react';
import { Home, Newspaper, BarChart3, Sparkles, type LucideIcon } from 'lucide-react';
import { useIsMobile } from '../../lib/useIsMobile';
import { useLang, type Bilingual } from '../../lib/i18n';

// 底部 Tab 栏: 仅移动端 + 仅 4 个主页面显示。详见 docs/MOBILE_APP_SHELL_PLAN.md。
// 第 4 个 Tab「益语AI」→ workbench (益语智库 AI 介绍页)。

interface TabDef {
  /** onNavigate 入参 (复用 Header 已用的 nav id; App.handleNavigate 会 normalize) */
  navId: string;
  /** 命中这些 currentPage 时算「当前 Tab」(高亮) */
  match: string[];
  label: Bilingual;
  icon: LucideIcon;
}

const TABS: TabDef[] = [
  { navId: 'home', match: ['home', 'open-source-home'], label: { zh: '首页', en: 'Home' }, icon: Home },
  { navId: 'articles', match: ['article-center'], label: { zh: '文章', en: 'Articles' }, icon: Newspaper },
  { navId: 'reports', match: ['report-library'], label: { zh: '报告', en: 'Reports' }, icon: BarChart3 },
  { navId: 'workbench', match: ['workbench'], label: { zh: '益语AI', en: 'Yiyu AI' }, icon: Sparkles },
];

// 显示该栏的页面集合 (= 所有 match 的并集)
const TAB_PAGES = new Set(TABS.flatMap((t) => t.match));

interface MobileTabBarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
}

export function MobileTabBar({ currentPage, onNavigate }: MobileTabBarProps) {
  const isMobile = useIsMobile();
  const { t } = useLang();
  const visible = isMobile && TAB_PAGES.has(currentPage);

  // 可见时给 body 挂 class: 触发正文底部留白 + 浮球避让 (见 index.css)
  useEffect(() => {
    if (!visible) return;
    document.body.classList.add('has-mobile-tabbar');
    return () => document.body.classList.remove('has-mobile-tabbar');
  }, [visible]);

  if (!visible) return null;

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-[60] bg-white/95 backdrop-blur-md border-t border-os-line/80 safe-bottom"
      aria-label="主导航"
      data-yiyu-section-type="mobile-tabbar"
    >
      <ul className="flex items-stretch justify-around px-1 pt-1.5">
        {TABS.map((tab) => {
          const active = tab.match.includes(currentPage);
          const Icon = tab.icon;
          return (
            <li key={tab.navId} className="flex-1">
              <button
                type="button"
                onClick={() => onNavigate(tab.navId)}
                aria-current={active ? 'page' : undefined}
                className={`w-full flex flex-col items-center gap-0.5 py-1 rounded-xl transition-colors ${
                  active ? 'text-os-navy' : 'text-os-ink/55 hover:text-os-ink/80'
                }`}
              >
                <Icon size={22} strokeWidth={active ? 2.4 : 1.9} />
                <span className={`text-[11px] leading-none ${active ? 'font-semibold' : 'font-medium'}`}>
                  {t(tab.label)}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
