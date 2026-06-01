import { useState, useEffect } from 'react';
import { Menu, X, Crown, Award, User as UserIcon, LogOut, Globe, ChevronDown } from 'lucide-react';
import type { User } from '../lib/dataService';
import { clearUser } from '../lib/storage';
import { logoutCurrentSession } from '../lib/authApi';
import { useLang } from '../lib/i18n';

// React props 里的回调在 TS 下容易触发“参数逆变”导致不好传（尤其 page 是 union 的时候）。
// 这里用 bivariant hack，让调用方可以传更窄的 union 函数，也可以传 (page: string) => void。
// 参考：React 自带的 EventHandler 类型处理方式。
type BivariantCallback<T extends (...args: any[]) => any> = {
  bivarianceHack: T;
}["bivarianceHack"];

interface HeaderProps {
  isLoggedIn?: boolean;
  userType?: 'visitor' | 'member' | 'client';
  onNavigate?: BivariantCallback<(page: string) => void>;
}

export function Header({ isLoggedIn: propIsLoggedIn = false, userType = 'visitor', onNavigate }: HeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(propIsLoggedIn);
  const { lang, toggleLang, t } = useLang();

  // 监听localStorage变化，实时获取当前登录用户
  useEffect(() => {
    const loadCurrentUser = () => {
      const userStr = (localStorage.getItem('yiyu_current_user') ?? sessionStorage.getItem('yiyu_current_user'));
      if (userStr) {
        try {
          const user = JSON.parse(userStr);
          setCurrentUser(user);
          setIsLoggedIn(true);
        } catch (e) {
          console.error('解析用户信息失败:', e);
          setCurrentUser(null);
          setIsLoggedIn(false);
        }
      } else {
        setCurrentUser(null);
        setIsLoggedIn(propIsLoggedIn);
      }
    };

    // 初始加载
    loadCurrentUser();

    // 监听storage事件（跨标签页同步）
    window.addEventListener('storage', loadCurrentUser);
    
    // 监听自定义事件（同标签页内更新）
    window.addEventListener('yiyu_user_updated', loadCurrentUser);

    return () => {
      window.removeEventListener('storage', loadCurrentUser);
      window.removeEventListener('yiyu_user_updated', loadCurrentUser);
    };
  }, [propIsLoggedIn]);

  // 顶部导航 — 4 项简化版 (2026-05-28 统一架构)
  // 首页 = 开源首页 / 文章 = article-center alias / 报告 = report-library alias / 关于我们
  const getNavItems = () => {
    return [
      { id: 'home', label: t({ zh: '首页', en: 'Home' }), href: '#home' },
      { id: 'articles', label: t({ zh: '文章', en: 'Articles' }), href: '#articles' },
      { id: 'reports', label: t({ zh: '报告', en: 'Reports' }), href: '#reports' },
      { id: 'workbench', label: t({ zh: '益语智库 AI', en: 'Yiyu AI' }), href: '#workbench' },
      { id: 'about', label: t({ zh: '关于我们', en: 'About' }), href: '#about' },
    ];
  };

  const navItems = getNavItems();

  // Brand (logo/title) click -> always go home
  const handleBrandClick = () => {
    handleNavClick('home');
  };

  // 导航点击处理 - 4 项简化版
  const handleNavClick = (id: string) => {
    // pageMap: nav id → App 路由 key
    // 新版只有 4 项,articles/reports 是 URL alias,App.tsx 内 normalize 会还原.
    const pageMap: Record<string, string> = {
      home: 'home',
      articles: 'articles',
      reports: 'reports',
      workbench: 'workbench',
      about: 'about',
    };

    const page = pageMap[id] || id;

    if (onNavigate) {
      onNavigate(page);
    } else {
      // 兜底硬跳转
      const path = window.location.pathname;
      const target = page === 'home' ? path : `${path}?page=${encodeURIComponent(page)}`;
      window.location.assign(target);
    }

    setIsMenuOpen(false);
  };

  const handleLoginClick = () => {
    if (onNavigate) {
      onNavigate('login');
    }
    setIsMenuOpen(false);
  };

  const handleRegisterClick = () => {
    if (onNavigate) {
      onNavigate('register');
    }
    setIsMenuOpen(false);
  };

  // 退出登录
  const handleLogout = () => {
    void logoutCurrentSession();
    clearUser();
    setCurrentUser(null);
    setIsLoggedIn(false);
    // 触发自定义事件通知其他组件
    window.dispatchEvent(new Event('yiyu_user_updated'));
    if (onNavigate) {
      onNavigate('home');
    }
  };

  // 是否管理员(决定「我的」菜单里是否出现「进入管理后台」入口)。
  // DEV 下放行, 与 LocalAdminGate/AdminAccessGate 的 DEV 直通一致, 断网也能进后台优化。
  const isAdminUser = import.meta.env.DEV
    || (currentUser as any)?.adminRole === 'admin'
    || localStorage.getItem('yiyu_is_admin') === 'true'
    || sessionStorage.getItem('yiyu_is_admin') === 'true';

  // 跳转到指定页面(优先 onNavigate, 否则改 URL); 顺带关闭菜单
  const goPage = (page: string) => {
    if (onNavigate) {
      onNavigate(page);
    } else {
      window.location.assign(`${window.location.pathname}?page=${page}`);
    }
    setAccountMenuOpen(false);
    setIsMenuOpen(false);
  };

  // 获取会员类型显示信息
  const getMemberTypeInfo = (memberType: string) => {
    const isAdmin = (currentUser as any)?.adminRole === 'admin'
      || localStorage.getItem('yiyu_is_admin') === 'true'
      || sessionStorage.getItem('yiyu_is_admin') === 'true';
    if (isAdmin) {
      return {
        label: '管理员',
        icon: <Award className="w-3 h-3" />,
        color: 'bg-gradient-to-r from-purple-500 to-pink-500',
        textColor: 'text-purple-700',
        bgColor: 'bg-purple-50'
      };
    }
    switch (memberType) {
      case 'diamond':
      case 'gold':
        return {
          label: '付费会员',
          icon: <Crown className="w-3 h-3" />,
          color: 'bg-gradient-to-r from-amber-400 to-yellow-500',
          textColor: 'text-amber-700',
          bgColor: 'bg-amber-50'
        };
      default:
        return {
          label: '普通会员',
          icon: <UserIcon className="w-3 h-3" />,
          color: 'bg-gradient-to-r from-gray-400 to-gray-500',
          textColor: 'text-gray-700',
          bgColor: 'bg-gray-50'
        };
    }
  };

  // 获取用户头像或默认头像
  const getUserAvatar = () => {
    const avatarSrc = (currentUser as any)?.avatarUrl || currentUser?.avatar;
    if (avatarSrc) {
      return (
        <img 
          src={avatarSrc} 
          alt={currentUser?.nickname || '用户头像'} 
          className="w-full h-full object-cover"
        />
      );
    }
    return (
      <span className="text-white text-sm font-medium">
        {currentUser?.nickname?.charAt(0) || '用'}
      </span>
    );
  };

  const memberInfo = currentUser ? getMemberTypeInfo(currentUser.memberType) : null;

  return (
    <header
      data-yiyu-section="shared-header"
      data-yiyu-section-type="nav"
      data-yiyu-section-title="顶部栏"
      data-yiyu-section-order="0"
      data-yiyu-section-enterable="true"
      className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/20"
    >
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo / Brand (clickable -> Home) */}
          <button
            type="button"
            onClick={handleBrandClick}
            className="flex items-center gap-3 hover:opacity-90 transition-opacity"
            aria-label="返回首页"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center overflow-hidden">
              <img
                src={`${import.meta.env.BASE_URL}yiyu-avatar.png`}
                alt="益语智库"
                className="w-full h-full object-cover"
              />
            </div>
            <span className="font-semibold text-lg hidden sm:block">益语智库</span>
          </button>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className="px-4 py-2 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-all"
              >
                {item.label}
              </button>
            ))}
          </nav>

          {/* Right Section */}
          <div className="flex items-center gap-3">
            {/* 语言切换 中 / EN */}
            <button
              onClick={toggleLang}
              aria-label={lang === 'zh' ? 'Switch to English' : '切换到中文'}
              title={lang === 'zh' ? 'English' : '中文'}
              className="inline-flex items-center gap-1.5 rounded-full border border-border/50 bg-white/60 px-3 py-1.5 text-[12px] font-medium text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all"
            >
              <Globe className="w-3.5 h-3.5" />
              <span className={lang === 'zh' ? 'text-foreground font-semibold' : ''}>中</span>
              <span className="text-border">/</span>
              <span className={lang === 'en' ? 'text-foreground font-semibold' : ''}>EN</span>
            </button>

            {/* Login Button */}
            {!isLoggedIn && (
              <button
                onClick={handleLoginClick}
                className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-all"
              >
                {t({ zh: '登录', en: 'Sign in' })}
              </button>
            )}

            {/* 「我的」入口 (登录后): 头像点开下拉菜单 — 个人中心 / 管理后台(仅管理员) / 退出登录 */}
            {isLoggedIn && currentUser && (
              <div className="relative">
                <button
                  onClick={() => setAccountMenuOpen((v) => !v)}
                  className="flex items-center gap-2 px-2 sm:px-3 py-2 rounded-xl hover:bg-muted/30 transition-all"
                  title={t({ zh: '我的', en: 'Me' })}
                  aria-haspopup="menu"
                  aria-expanded={accountMenuOpen}
                >
                  <div className={`w-8 h-8 rounded-full ${memberInfo?.color || 'bg-gradient-to-br from-primary to-accent'} flex items-center justify-center overflow-hidden border-2 border-white shadow-sm`}>
                    {getUserAvatar()}
                  </div>
                  <span className="hidden sm:inline text-sm font-medium text-gray-900">{t({ zh: '我的', en: 'Me' })}</span>
                  <ChevronDown className={`hidden sm:inline w-4 h-4 text-gray-400 transition-transform ${accountMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {accountMenuOpen && (
                  <>
                    {/* 点击空白关闭 */}
                    <div className="fixed inset-0 z-40" onClick={() => setAccountMenuOpen(false)} />
                    <div role="menu" className="absolute right-0 mt-2 w-60 z-50 rounded-2xl border border-border/40 bg-white shadow-xl overflow-hidden animate-slide-up">
                      {/* 用户信息头部 */}
                      <div className="px-4 py-3 border-b border-border/30 flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full ${memberInfo?.color || 'bg-gradient-to-br from-primary to-accent'} flex items-center justify-center overflow-hidden border-2 border-white shadow-sm`}>
                          {getUserAvatar()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{currentUser.nickname || t({ zh: '用户', en: 'User' })}</p>
                          <span className={`text-xs ${memberInfo?.textColor}`}>{memberInfo?.label}</span>
                        </div>
                      </div>

                      <button
                        role="menuitem"
                        onClick={() => goPage('user-center')}
                        className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-gray-800 hover:bg-muted/40 transition-all"
                      >
                        <UserIcon className="w-4 h-4 text-gray-500" />
                        {t({ zh: '个人中心', en: 'Profile' })}
                      </button>

                      {isAdminUser && (
                        <button
                          role="menuitem"
                          onClick={() => goPage('admin')}
                          className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-gray-800 hover:bg-muted/40 transition-all"
                        >
                          <Award className="w-4 h-4 text-purple-500" />
                          {t({ zh: '进入管理后台', en: 'Admin console' })}
                        </button>
                      )}

                      <div className="border-t border-border/30" />
                      <button
                        role="menuitem"
                        onClick={() => { setAccountMenuOpen(false); handleLogout(); }}
                        className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-all"
                      >
                        <LogOut className="w-4 h-4" />
                        {t({ zh: '退出登录', en: 'Sign out' })}
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-2 rounded-xl hover:bg-muted/30 transition-all"
            >
              {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden border-t border-border/30 animate-slide-up">
          <div className="px-4 py-4 space-y-2">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className="w-full text-left px-4 py-3 rounded-xl hover:bg-muted/30 transition-all font-medium"
              >
                {item.label}
              </button>
            ))}
            
            {/* 移动端语言切换 */}
            <button
              onClick={toggleLang}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-border/30 hover:border-primary/50 transition-all text-sm font-medium"
            >
              <Globe className="w-4 h-4" />
              {lang === 'zh' ? 'Switch to English' : '切换到中文'}
            </button>

            {!isLoggedIn && (
              <div className="pt-4 border-t border-border/30 space-y-2">
                <button
                  onClick={handleLoginClick}
                  className="w-full px-4 py-3 rounded-xl border border-border/30 hover:border-primary/50 transition-all"
                >
                  {t({ zh: '登录', en: 'Sign in' })}
                </button>
                <button
                  onClick={handleRegisterClick}
                  className="w-full px-4 py-3 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all"
                >
                  {t({ zh: '免费注册', en: 'Sign up free' })}
                </button>
              </div>
            )}

            {isLoggedIn && currentUser && (
              <div className="pt-4 border-t border-border/30 space-y-2">
                <button
                  onClick={() => goPage('user-center')}
                  className="w-full flex items-center gap-2.5 px-4 py-3 rounded-xl hover:bg-muted/30 transition-all text-left font-medium"
                >
                  <UserIcon className="w-4 h-4 text-gray-500" />
                  {t({ zh: '个人中心', en: 'Profile' })}
                </button>
                {isAdminUser && (
                  <button
                    onClick={() => goPage('admin')}
                    className="w-full flex items-center gap-2.5 px-4 py-3 rounded-xl hover:bg-muted/30 transition-all text-left font-medium"
                  >
                    <Award className="w-4 h-4 text-purple-500" />
                    {t({ zh: '进入管理后台', en: 'Admin console' })}
                  </button>
                )}
                <button
                  onClick={() => { setIsMenuOpen(false); handleLogout(); }}
                  className="w-full flex items-center gap-2.5 px-4 py-3 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 transition-all text-left font-medium"
                >
                  <LogOut className="w-4 h-4" />
                  {t({ zh: '退出登录', en: 'Sign out' })}
                </button>
              </div>
            )}
            
          </div>
        </div>
      )}
    </header>
  );
}
