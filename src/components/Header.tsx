import { useState, useEffect } from 'react';
import { Menu, X, ChevronDown, Crown, Award, User as UserIcon, LogOut, Settings as SettingsIcon } from 'lucide-react';
import type { User } from '../lib/dataService';

interface HeaderProps {
  isLoggedIn?: boolean;
  userType?: 'visitor' | 'member' | 'client';
  onNavigate?: (page: string) => void;
}

export function Header({ isLoggedIn: propIsLoggedIn = false, userType = 'visitor', onNavigate }: HeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(propIsLoggedIn);

  // 监听localStorage变化，实时获取当前登录用户
  useEffect(() => {
    const loadCurrentUser = () => {
      const userStr = localStorage.getItem('yiyu_current_user');
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

  // 根据用户类型生成导航菜单项
  const getNavItems = () => {
    const baseItems = [
      { id: 'home', label: '首页', href: '#home' },
      { id: 'insights', label: '前沿洞察', href: '#insights' },
      { id: 'strategy', label: '战略陪伴', href: '#strategy' }, // 所有用户都显示战略陪伴
      { id: 'learning', label: '学习中心', href: '#learning' },
      { id: 'about', label: '关于我们', href: '#about' },
    ];

    return baseItems;
  };

  const navItems = getNavItems();

  // 导航点击处理 - 根据菜单项ID跳转到对应页面
  const handleNavClick = (id: string) => {
    if (onNavigate) {
      // 根据导航项ID映射到页面类型
      const pageMap: Record<string, 'home' | 'insights' | 'library' | 'strategy' | 'about' | 'login' | 'register'> = {
        'home': 'home',
        'insights': 'insights',
        'learning': 'library', // 学习中心跳转到library页面
        'strategy': 'strategy',
        'about': 'about'
      };
      
      const page = pageMap[id] || id as any;
      onNavigate(page);
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
    localStorage.removeItem('yiyu_current_user');
    setCurrentUser(null);
    setIsLoggedIn(false);
    setIsUserMenuOpen(false);
    // 触发自定义事件通知其他组件
    window.dispatchEvent(new Event('yiyu_user_updated'));
    if (onNavigate) {
      onNavigate('home');
    }
  };

  // 获取会员类型显示信息
  const getMemberTypeInfo = (memberType: string) => {
    switch (memberType) {
      case 'diamond':
        return {
          label: '钻石会员',
          icon: <Award className="w-3 h-3" />,
          color: 'bg-gradient-to-r from-purple-500 to-pink-500',
          textColor: 'text-purple-700',
          bgColor: 'bg-purple-50'
        };
      case 'gold':
        return {
          label: '黄金会员',
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
    if (currentUser?.avatar) {
      return (
        <img 
          src={currentUser.avatar} 
          alt={currentUser.nickname} 
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
    <header className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/20">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <span className="text-white font-bold text-lg">益</span>
            </div>
            <span className="font-semibold text-lg hidden sm:block">益语智库</span>
          </div>

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
            {/* Login Button */}
            {!isLoggedIn && (
              <button 
                onClick={handleLoginClick}
                className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-all"
              >
                登录
              </button>
            )}

            {/* User Menu (if logged in) */}
            {isLoggedIn && currentUser && (
              <div className="relative">
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-muted/30 transition-all"
                >
                  {/* 用户头像 */}
                  <div className={`w-8 h-8 rounded-full ${memberInfo?.color || 'bg-gradient-to-br from-primary to-accent'} flex items-center justify-center overflow-hidden border-2 border-white shadow-sm`}>
                    {getUserAvatar()}
                  </div>
                  
                  {/* 会员标识（桌面端显示） */}
                  <div className="hidden lg:flex items-center gap-2">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{currentUser.nickname}</p>
                      <div className="flex items-center gap-1">
                        <span className={`text-xs ${memberInfo?.textColor}`}>{memberInfo?.label}</span>
                      </div>
                    </div>
                  </div>
                  
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                </button>

                {/* 下拉菜单 */}
                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-2 w-64 glass rounded-2xl p-3 shadow-xl animate-scale-in">
                    {/* 用户信息卡片 */}
                    <div className="px-3 py-3 border-b border-border/30 mb-2">
                      <div className="flex items-center gap-3 mb-2">
                        <div className={`w-12 h-12 rounded-full ${memberInfo?.color} flex items-center justify-center overflow-hidden border-2 border-white shadow-sm`}>
                          {getUserAvatar()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate">{currentUser.nickname}</p>
                          <p className="text-xs text-gray-500 truncate">{currentUser.email}</p>
                        </div>
                      </div>
                      
                      {/* 会员徽章 */}
                      <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${memberInfo?.bgColor}`}>
                        {memberInfo?.icon}
                        <span className={`text-xs font-medium ${memberInfo?.textColor}`}>
                          {memberInfo?.label}
                        </span>
                        {currentUser.memberType !== 'regular' && (
                          <span className="ml-auto text-xs text-gray-500">
                            ✨ 特权会员
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {/* 菜单项 */}
                    <button 
                      className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-muted/30 transition-all flex items-center gap-2"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        if (onNavigate) onNavigate('user-center');
                      }}
                    >
                      <UserIcon className="w-4 h-4 text-gray-500" />
                      个人中心
                    </button>
                    
                    <button 
                      className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-muted/30 transition-all flex items-center gap-2"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        if (onNavigate) onNavigate('settings');
                      }}
                    >
                      <SettingsIcon className="w-4 h-4 text-gray-500" />
                      设置
                    </button>
                    
                    <div className="border-t border-border/30 my-2"></div>
                    
                    <button 
                      className="w-full text-left px-3 py-2 rounded-lg text-sm text-red-600 hover:bg-red-50 transition-all flex items-center gap-2"
                      onClick={handleLogout}
                    >
                      <LogOut className="w-4 h-4" />
                      退出登录
                    </button>
                  </div>
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
            
            {!isLoggedIn && (
              <div className="pt-4 border-t border-border/30 space-y-2">
                <button 
                  onClick={handleLoginClick}
                  className="w-full px-4 py-3 rounded-xl border border-border/30 hover:border-primary/50 transition-all"
                >
                  登录
                </button>
                <button 
                  onClick={handleRegisterClick}
                  className="w-full px-4 py-3 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all"
                >
                  免费注册
                </button>
              </div>
            )}
            
            {isLoggedIn && currentUser && (
              <div className="pt-4 border-t border-border/30 space-y-2">
                {/* 移动端用户信息卡片 */}
                <div className={`p-4 rounded-xl ${memberInfo?.bgColor}`}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-12 h-12 rounded-full ${memberInfo?.color} flex items-center justify-center overflow-hidden border-2 border-white`}>
                      {getUserAvatar()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{currentUser.nickname}</p>
                      <p className="text-xs text-gray-500 truncate">{currentUser.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {memberInfo?.icon}
                    <span className={`text-sm font-medium ${memberInfo?.textColor}`}>
                      {memberInfo?.label}
                    </span>
                  </div>
                </div>
                
                <button 
                  onClick={() => {
                    setIsMenuOpen(false);
                    if (onNavigate) onNavigate('user-center');
                  }}
                  className="w-full px-4 py-3 rounded-xl hover:bg-muted/30 transition-all text-left"
                >
                  个人中心
                </button>
                
                <button 
                  onClick={handleLogout}
                  className="w-full px-4 py-3 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 transition-all text-left"
                >
                  退出登录
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
