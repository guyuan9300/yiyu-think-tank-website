import { type ReactNode } from 'react';
import { Globe } from 'lucide-react';
import { useLang } from '../../lib/i18n';

// 移动端 App 外壳: 吸顶细顶栏 (品牌 + 语言/登录) + 滚动内容区。
// 4 个 tab 屏共用此壳, 保证「像 App」的统一框架。底部 Tab 栏由 App 单独挂载。
// 设计语言见 docs/MOBILE_APP_REDESIGN_PLAN.md。

interface MobileAppShellProps {
  onNavigate: (page: string, id?: string) => void;
  children: ReactNode;
  /** 顶栏右侧是否显示登录 (默认 true) */
  showLogin?: boolean;
}

export function MobileAppShell({ onNavigate, children, showLogin = true }: MobileAppShellProps) {
  const { t, toggleLang, lang } = useLang();

  return (
    <div className="md:hidden min-h-screen bg-os-canvas text-os-ink antialiased">
      {/* 吸顶 App 顶栏 */}
      <header className="sticky top-0 z-50 bg-os-canvas/85 backdrop-blur-xl border-b border-os-line/70 safe-top">
        <div className="h-12 px-4 flex items-center justify-between">
          <button
            type="button"
            onClick={() => onNavigate('home')}
            className="flex items-center gap-2"
            aria-label={t({ zh: '返回首页', en: 'Home' })}
          >
            <span className="w-7 h-7 rounded-lg overflow-hidden ring-1 ring-os-navy/10 bg-os-navy/[0.05] flex items-center justify-center">
              <img src={`${import.meta.env.BASE_URL}yiyu-avatar.png`} alt="益语智库" className="w-full h-full object-cover" />
            </span>
            <span className="font-serif-display text-[15px] font-semibold text-os-navy tracking-tight">益语智库</span>
          </button>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={toggleLang}
              className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-[12px] font-medium text-os-muted hover:text-os-navy transition-colors"
            >
              <Globe size={14} />
              {lang === 'zh' ? '中' : 'EN'}
            </button>
            {showLogin && (
              <button
                type="button"
                onClick={() => onNavigate('login')}
                className="px-3 py-1.5 rounded-full bg-os-navy text-white text-[12.5px] font-semibold active:scale-95 transition-transform"
              >
                {t({ zh: '登录', en: 'Sign in' })}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* 滚动内容区 (底部留白由 body.has-mobile-tabbar 提供) */}
      <main className="px-5">{children}</main>
    </div>
  );
}
