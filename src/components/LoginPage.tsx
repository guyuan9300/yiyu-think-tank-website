import { useState, useEffect } from 'react';
import { ArrowLeft, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { WeChatLoginModal } from './WeChatLoginModal';
import { WeChatIcon } from './WeChatIcon';
import { saveUser, getUserByEmail, recordUserLogin, type User } from '../lib/dataService';

// Admin credentials (global constant)
const ADMIN_CREDENTIALS = {
  username: 'guyuan9300@gmail.com',
  password: 'Guyuan9300'
};

// Mock users (for testing)
const MOCK_USERS = [
  { email: 'test@example.com', password: 'test123' },
  { email: 'user@example.com', password: 'user123' }
];

interface LoginPageProps {
  onNavigate?: (page: 'login' | 'register' | 'home' | 'forgot-password' | 'admin') => void;
  onLoginSuccess?: () => void;
  onAdminLogin?: () => void;
}

export function LoginPage({ onNavigate, onLoginSuccess, onAdminLogin }: LoginPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showWeChatModal, setShowWeChatModal] = useState(false);
  
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const page = params.get('page');
    if (page === 'admin') {
      console.log('检测到管理员登录跳转');
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const isAdmin = email === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password;
    
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      
      if (isAdmin) {
        localStorage.setItem('yiyu_is_admin', 'true');
        localStorage.setItem('yiyu_admin_email', email);

        // 同时写入当前用户信息，确保从后台回到前台后依然保持“已登录/管理员”状态
        const adminUser: User = {
          id: 'admin',
          email,
          nickname: '超级管理员',
          memberType: 'diamond',
          status: 'active',
          loginCount: 1,
          commentsCount: 0,
          favoritesCount: 0,
          createdAt: new Date().toISOString(),
          lastLoginAt: new Date().toISOString(),
        };
        localStorage.setItem('yiyu_current_user', JSON.stringify(adminUser));
        window.dispatchEvent(new Event('yiyu_user_updated'));

        // Prefer SPA navigation when available (avoid full reload / webview click issues)
        if (onAdminLogin) {
          onAdminLogin();
          return;
        }
        if (onNavigate) {
          onNavigate('admin');
          return;
        }

        const baseUrl = window.location.protocol + '//' + window.location.host + window.location.pathname;
        console.log('管理员登录成功，跳转URL:', baseUrl + '?page=admin');
        window.location.href = baseUrl + '?page=admin';
        return;
      }
      
      if (!email || !password) {
        setError('请输入邮箱和密码');
        setIsLoading(false);
        return;
      }
      
      const mockUser = MOCK_USERS.find(u => u.email === email && u.password === password);
      if (mockUser) {
        let user = getUserByEmail(email);
        
        if (!user) {
          user = saveUser({
            email: email,
            nickname: email.split('@')[0],
            memberType: 'regular',
            status: 'active',
            loginCount: 1,
            commentsCount: 0,
            favoritesCount: 0,
            createdAt: new Date().toISOString(),
            lastLoginAt: new Date().toISOString(),
          });
          console.log('新用户注册成功:', user);
        } else {
          recordUserLogin(user.id);
          console.log('用户登录成功，已更新登录记录:', user);
        }
        
        localStorage.setItem('yiyu_current_user', JSON.stringify(user));
        
        if (onLoginSuccess) {
          onLoginSuccess();
        } else if (onNavigate) {
          onNavigate('home');
        }
      } else {
        setError('邮箱或密码错误，请检查输入');
      }
    } catch (err) {
      setError('登录失败，请稍后重试');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialLogin = (provider: string) => {
    if (provider === 'wechat') {
      setShowWeChatModal(true);
    } else {
      console.log(`Login with ${provider}`);
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary via-primary to-accent p-12 flex-col justify-between relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-white rounded-full blur-2xl" />
        </div>
        
        {/* Content */}
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-12 h-12 rounded-[12px] bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <span className="text-white font-bold text-xl">益</span>
            </div>
            <span className="text-white text-xl font-semibold">益语智库</span>
          </div>
          
          <h1 className="text-[36px] font-bold text-white mb-6 leading-tight tracking-tight">
            让战略落到地上<br />
            <span className="text-white/80 font-normal">让组织持续增长</span>
          </h1>
          
          <p className="text-white/70 text-[15px] mb-10 max-w-sm leading-relaxed">
            登录您的专属智库，开启战略洞察、组织效能与数字化转型之旅
          </p>
          
          {/* Features */}
          <div className="space-y-4">
            {[
              '解锁专属会员内容与报告',
              '订阅个性化洞察推送',
              '参与战略陪伴客户专区'
            ].map((feature, index) => (
              <div key={index} className="flex items-center gap-3 text-white/80">
                <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center">
                  <span className="text-xs">✓</span>
                </div>
                <span className="text-[14px]">{feature}</span>
              </div>
            ))}
          </div>
        </div>
        
        {/* Footer */}
        <div className="relative z-10 text-white/60 text-[12px]">
          © 2026 益语智库 Yiyu Think Tank. All rightsreserved.
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <div className="w-12 h-12 rounded-[12px] bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <span className="text-white font-bold text-xl">益</span>
            </div>
            <span className="text-xl font-semibold text-foreground">益语智库</span>
          </div>

          {/* Back Button */}
          <button
            onClick={() => onNavigate?.('home')}
            className="flex items-center gap-2 text-muted-foreground/70 hover:text-foreground transition-colors mb-8 text-[14px]"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>返回首页</span>
          </button>

          {/* Title */}
          <h2 className="text-[26px] font-semibold text-foreground mb-2">欢迎回来</h2>
          <p className="text-muted-foreground/70 text-[14px] mb-8">
            还没有账号？{' '}
            <button
              onClick={() => onNavigate?.('register')}
              className="text-primary hover:text-primary/80 font-medium transition-colors"
            >
              立即注册
            </button>
          </p>

          {/* Social Login */}
          <div className="space-y-3 mb-6">
            <button
              onClick={() => handleSocialLogin('wechat')}
              className="w-full py-3 px-4 rounded-full border border-border/60 hover:border-[#07C160]/50 transition-all flex items-center justify-center gap-3 group bg-[#07C160] hover:bg-[#06AD56] text-white shadow-lg shadow-[#07C160]/20"
            >
              <WeChatIcon className="w-5 h-5" />
              <span className="font-medium text-[14px]">微信一键登录</span>
            </button>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1 h-px bg-border/40" />
            <span className="text-[12px] text-muted-foreground/60 uppercase tracking-wide">或使用邮箱登录</span>
            <div className="flex-1 h-px bg-border/40" />
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 rounded-[12px] bg-red-50 border border-red-100 text-red-600 text-[13px]">
              {error}
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label className="block text-[13px] font-medium text-muted-foreground/70 mb-2">邮箱地址</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="请输入邮箱地址"
                  className="w-full py-3 pl-12 pr-4 rounded-full border border-border/60 text-[14px] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all bg-white/80"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-[13px] font-medium text-muted-foreground/70">密码</label>
                <button
                  type="button"
                  onClick={() => onNavigate?.('forgot-password')}
                  className="text-[13px] text-primary hover:text-primary/80 transition-colors"
                >
                  忘记密码？
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="请输入密码"
                  className="w-full py-3 pl-12 pr-12 rounded-full border border-border/60 text-[14px] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all bg-white/80"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="remember"
                className="w-4 h-4 rounded border-border/60 text-primary focus:ring-primary/20"
              />
              <label htmlFor="remember" className="text-[13px] text-muted-foreground/70">
                记住我
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 rounded-full bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-all hover:scale-[1.02] hover:shadow-lg hover:shadow-primary/25 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2 text-[14px]">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  登录中...
                </span>
              ) : (
                <span className="text-[14px]">登录</span>
              )}
            </button>
          </form>

          {/* Terms */}
          <p className="mt-8 text-center text-[12px] text-muted-foreground/60">
            登录即表示您同意{' '}
            <a href="#" className="text-primary hover:underline">服务条款</a>
            {' '}和{' '}
            <a href="#" className="text-primary hover:underline">隐私政策</a>
          </p>
        </div>
      </div>

      {/* WeChat Login Modal */}
      <WeChatLoginModal
        isOpen={showWeChatModal}
        onClose={() => setShowWeChatModal(false)}
      />
    </div>
  );
}

export default LoginPage;
