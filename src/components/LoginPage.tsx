import { useState, useEffect } from 'react';
import { ArrowLeft, Mail, Lock, Eye, EyeOff, Smartphone } from 'lucide-react';
import { type User } from '../lib/dataService';
import { saveUserRaw, saveAuthToken, setSavedItem, ADMIN_FLAG_KEY, ADMIN_EMAIL_KEY } from '../lib/storage';
import { loginByPassword, normalizeLoginUser } from '../lib/authApi';
import { notifyNotOpenYet } from '../lib/uxFeedback';
import { logger } from '../lib/logger';

// Admin credentials (global constant)
const ADMIN_CREDENTIALS = {
  username: 'guyuan9300@gmail.com',
  password: 'Guyuan9300'
};

// 兼容保留账号（在 Auth API 尚未接通或迁移期失败时兜底）
const LEGACY_TEST_ACCOUNTS = [
  { channel: 'phone' as const, target: '13631445251', password: 'immomobot', nickname: '默默的同事', memberType: 'regular' as const },
  { channel: 'phone' as const, target: '18027370767', password: 'imdoubaobot', nickname: '豆包的同事', memberType: 'gold' as const },
];


type LoginMode = 'email' | 'phone';

interface LoginPageProps {
  onNavigate?: (page: 'login' | 'register' | 'home' | 'forgot-password' | 'admin') => void;
  onLoginSuccess?: () => void;
  onAdminLogin?: () => void;
}

export function LoginPage({ onNavigate, onLoginSuccess, onAdminLogin }: LoginPageProps) {
  const [loginMode, setLoginMode] = useState<LoginMode>('email');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const page = params.get('page');
    if (page === 'admin') {
      logger.info('login', '检测到管理员登录跳转');
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const normalizedEmail = email.trim();
    const normalizedPhone = phone.trim();
    const isAdmin = normalizedEmail === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password;
    
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      
      if (isAdmin) {
        setSavedItem(ADMIN_FLAG_KEY, 'true', rememberMe);
        setSavedItem(ADMIN_EMAIL_KEY, normalizedEmail, rememberMe);

        // 同时写入当前用户信息，确保从后台回到前台后依然保持“已登录/管理员”状态
        const adminUser: User & { plainPassword?: string } = {
          id: 'admin',
          email: normalizedEmail,
          nickname: '超级管理员',
          memberType: 'diamond',
          status: 'active',
          loginCount: 1,
          commentsCount: 0,
          favoritesCount: 0,
          createdAt: new Date().toISOString(),
          lastLoginAt: new Date().toISOString(),
          plainPassword: password,
        };
        saveUserRaw(JSON.stringify(adminUser), rememberMe);
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
        logger.info('login', '管理员登录成功，跳转URL', baseUrl + '?page=admin');
        window.location.href = baseUrl + '?page=admin';
        return;
      }
      
      if ((loginMode === 'email' && !normalizedEmail) || (loginMode === 'phone' && !normalizedPhone) || !password) {
        setError(loginMode === 'phone' ? '请输入手机号和密码' : '请输入邮箱和密码');
        setIsLoading(false);
        return;
      }

      const result = await loginByPassword({
        channel: loginMode,
        target: loginMode === 'phone' ? normalizedPhone : normalizedEmail,
        password,
      });

      if (!result.ok || !result.data?.user) {
        // 迁移期兜底：保留既有可登录测试账号
        const legacy = LEGACY_TEST_ACCOUNTS.find((a) => a.channel === loginMode && a.target === (loginMode === 'phone' ? normalizedPhone : normalizedEmail) && a.password === password);
        if (!legacy) {
          setError(result.error || '登录失败，请检查账号或密码');
          return;
        }

        const now = new Date().toISOString();
        const legacyUser: User & { plainPassword?: string } = {
          id: `legacy_${legacy.target}`,
          email: `${legacy.target}@phone.local`,
          phone: legacy.target,
          nickname: legacy.nickname,
          memberType: legacy.memberType,
          status: 'active',
          loginCount: 1,
          commentsCount: 0,
          favoritesCount: 0,
          createdAt: now,
          lastLoginAt: now,
          plainPassword: password,
        };
        saveUserRaw(JSON.stringify(legacyUser), rememberMe);
        window.dispatchEvent(new Event('yiyu_user_updated'));

        if (onLoginSuccess) onLoginSuccess();
        else if (onNavigate) onNavigate('home');
        return;
      }

      const user = normalizeLoginUser(result.data.user) as User & { plainPassword?: string };
      user.plainPassword = password;
      saveUserRaw(JSON.stringify(user), rememberMe);
      if (result.data.token) {
        saveAuthToken(result.data.token, rememberMe);
      }
      window.dispatchEvent(new Event('yiyu_user_updated'));

      // 非管理员登录：清理可能残留的管理员标记，避免普通账号看到/访问管理后台
      try {
        localStorage.removeItem(ADMIN_FLAG_KEY);
        sessionStorage.removeItem(ADMIN_FLAG_KEY);
        localStorage.removeItem(ADMIN_EMAIL_KEY);
        sessionStorage.removeItem(ADMIN_EMAIL_KEY);
      } catch {}

      logger.info('login', '用户登录成功', { id: user.id, loginMode });

      if (onLoginSuccess) {
        onLoginSuccess();
      } else if (onNavigate) {
        onNavigate('home');
      }
    } catch (err) {
      setError('登录失败，请稍后重试');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-primary/[0.04] via-transparent to-transparent" />
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(900px_circle_at_20%_10%,rgba(59,130,246,0.10),transparent_55%)]" />
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(900px_circle_at_80%_20%,rgba(168,85,247,0.08),transparent_55%)]" />
      {/* Login Form */}
      <div className="min-h-screen flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md rounded-[28px] bg-white/80 backdrop-blur-xl border border-border/40 shadow-2xl shadow-black/[0.06] p-6 sm:p-8">
          {/* Brand */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-[12px] bg-gradient-to-br from-primary to-accent flex items-center justify-center overflow-hidden">
              <img
                src={`${import.meta.env.BASE_URL}yiyu-avatar.png`}
                alt="益语智库"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-semibold text-foreground leading-tight">益语智库</span>
              <span className="text-[13px] text-muted-foreground/70 mt-1">提供可落地的增长咨询</span>
            </div>
          </div>

          {/* Back Button */}
          <button
            onClick={() => onNavigate?.('home')}
            className="flex items-center gap-2 text-muted-foreground/70 hover:text-foreground transition-colors mb-6 text-[14px]"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>返回首页</span>
          </button>

          {/* Access rule card removed (避免与左侧说明重复) */}

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

          {/* Login Mode */}
          <div className="grid grid-cols-2 gap-2 mb-6">
            <button
              type="button"
              onClick={() => setLoginMode('email')}
              className={`px-4 py-2.5 rounded-2xl border text-[14px] font-medium transition ${loginMode === 'email' ? 'bg-primary/10 border-primary/20 text-primary' : 'bg-white/60 border-border/40 text-muted-foreground/80 hover:bg-white'}`}
            >
              <span className="inline-flex items-center gap-2"><Mail className="w-4 h-4" />邮箱登录</span>
            </button>
            <button
              type="button"
              onClick={() => setLoginMode('phone')}
              className={`px-4 py-2.5 rounded-2xl border text-[14px] font-medium transition ${loginMode === 'phone' ? 'bg-primary/10 border-primary/20 text-primary' : 'bg-white/60 border-border/40 text-muted-foreground/80 hover:bg-white'}`}
            >
              <span className="inline-flex items-center gap-2"><Smartphone className="w-4 h-4" />手机登录</span>
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 rounded-[12px] bg-red-50 border border-red-100 text-red-600 text-[13px]">
              {error}
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Credentials */}
            {loginMode === 'email' ? (
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
            ) : (
              <div>
                <label className="block text-[13px] font-medium text-muted-foreground/70 mb-2">手机号码</label>
                <div className="relative">
                  <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="请输入手机号码"
                    className="w-full py-3 pl-12 pr-4 rounded-full border border-border/60 text-[14px] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all bg-white/80"
                    required
                  />
                </div>
              </div>
            )

            /* Password */}
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
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
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
            <a
              href="#"
              className="text-primary hover:underline"
              onClick={(e) => {
                e.preventDefault();
                notifyNotOpenYet('服务条款');
              }}
            >
              服务条款
            </a>
            {' '}和{' '}
            <a
              href="#"
              className="text-primary hover:underline"
              onClick={(e) => {
                e.preventDefault();
                notifyNotOpenYet('隐私政策');
              }}
            >
              隐私政策
            </a>
          </p>
        </div>
      </div>

      {/* WeChat Login Modal */}
    </div>
  );
}

export default LoginPage;
