import { useState, useEffect } from 'react';
import { ArrowLeft, Mail, Lock, Eye, EyeOff, Smartphone } from 'lucide-react';
import { saveUserRaw, saveAuthToken, setSavedItem, ADMIN_FLAG_KEY, ADMIN_EMAIL_KEY } from '../lib/storage';
import { loginByPassword, normalizeLoginUser } from '../lib/authApi';
import { logger } from '../lib/logger';
import { getYiyuPageAttrs, getYiyuSectionAttrs } from '../lib/yiyuTongSiteMap';
import { useLang } from '../lib/i18n';

// 本地超管邮箱白名单 —— ⚠️ 仅 import.meta.env.DEV 生效, 生产 build 会被 tree-shake 整段移除.
// 安全红线: 不再硬编码任何明文密码.
//   旧版把管理员密码明文写进前端常量, 会被打进公开 GitHub 仓 + JS bundle, 已是泄露口 → 移除.
//   生产环境管理员鉴权完全走后端 PG users 表的 adminRole 字段 (见下方 loginByPassword 分支).
//   本地 (localhost 验收) 凭白名单邮箱直接放行, 不校验密码明文.
const LOCAL_ADMIN_EMAILS = ['guyuan9300@gmail.com', 'guyuan@klngo.org'];

function isLocalAdminEmail(email: string): boolean {
  return import.meta.env.DEV && LOCAL_ADMIN_EMAILS.includes(email.toLowerCase());
}


type LoginMode = 'email' | 'phone';

interface LoginPageProps {
  onNavigate?: (page: 'login' | 'register' | 'home' | 'forgot-password' | 'admin' | 'terms-of-service' | 'privacy-policy') => void;
  onLoginSuccess?: () => void;
  onAdminLogin?: () => void;
}

export function LoginPage({ onNavigate, onLoginSuccess, onAdminLogin }: LoginPageProps) {
  const { t } = useLang();
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

    try {
      await new Promise(resolve => setTimeout(resolve, 500));

      if ((loginMode === 'email' && !normalizedEmail) || (loginMode === 'phone' && !normalizedPhone) || !password) {
        setError(loginMode === 'phone' ? t({ zh: '请输入手机号和密码', en: 'Please enter your phone number and password' }) : t({ zh: '请输入邮箱和密码', en: 'Please enter your email and password' }));
        setIsLoading(false);
        return;
      }

      if (loginMode === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
        setError(t({ zh: '请输入正确的邮箱地址', en: 'Please enter a valid email address' }));
        setIsLoading(false);
        return;
      }

      if (loginMode === 'phone' && !/^1[3-9]\d{9}$/.test(normalizedPhone)) {
        setError(t({ zh: '请输入正确的手机号码', en: 'Please enter a valid phone number' }));
        setIsLoading(false);
        return;
      }

      // ★ 本地超管放行 —— 仅 DEV (localhost 验收期, 跳过后端 PG users 表), 生产 build 此分支被 tree-shake.
      //   不再校验密码明文; 命中白名单邮箱即构造 admin user 写入 localStorage. 生产一律走下方 loginByPassword + 后端 adminRole.
      if (loginMode === 'email' && isLocalAdminEmail(normalizedEmail)) {
        const adminUser = {
          id: `local_admin_${normalizedEmail.replace(/[^a-z0-9]/gi, '_')}`,
          email: normalizedEmail,
          nickname: normalizedEmail.split('@')[0],
          adminRole: 'admin' as const,
          memberType: 'admin' as const,
        };
        saveUserRaw(JSON.stringify(adminUser), rememberMe);
        setSavedItem(ADMIN_FLAG_KEY, 'true', rememberMe);
        setSavedItem(ADMIN_EMAIL_KEY, normalizedEmail, rememberMe);
        window.dispatchEvent(new Event('yiyu_user_updated'));
        logger.info('login', '本地白名单超管登录成功(DEV)', { email: normalizedEmail });
        if (onAdminLogin) { onAdminLogin(); return; }
        if (onLoginSuccess) { onLoginSuccess(); return; }
        if (onNavigate) { onNavigate('home'); return; }
        return;
      }

      const result = await loginByPassword({
        channel: loginMode,
        target: loginMode === 'phone' ? normalizedPhone : normalizedEmail,
        password,
      });

      if (!result.ok || !result.data?.user) {
        setError(result.error || t({ zh: '登录失败，请检查账号或密码', en: 'Sign-in failed. Please check your account or password.' }));
        return;
      }

      const user = {
        ...normalizeLoginUser(result.data.user),
        plainPassword: password,
      };
      saveUserRaw(JSON.stringify(user), rememberMe);
      if (result.data.token) {
        saveAuthToken(result.data.token, rememberMe);
      }
      window.dispatchEvent(new Event('yiyu_user_updated'));

      // 管理员判定: 一律以后端返回的 adminRole 为准 (不再用前端明文密码兜底).
      const isAdmin = user.adminRole === 'admin';
      if (isAdmin) {
        setSavedItem(ADMIN_FLAG_KEY, 'true', rememberMe);
        setSavedItem(ADMIN_EMAIL_KEY, user.email || normalizedEmail, rememberMe);
        logger.info('login', '管理员登录成功', { id: user.id, loginMode });

        if (onAdminLogin) {
          onAdminLogin();
          return;
        }
      }

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
      setError(t({ zh: '登录失败，请稍后重试', en: 'Sign-in failed, please try again later' }));
    } finally {
      setIsLoading(false);
    }
  };

  const credentialField = loginMode === 'email' ? (
    <div>
      <label className="block text-[13px] font-medium text-os-ink/70 mb-2">{t({ zh: '邮箱地址', en: 'Email address' })}</label>
      <div className="relative">
        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-os-muted/60" />
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t({ zh: '请输入邮箱地址', en: 'Enter your email address' })}
          className="w-full py-3 pl-12 pr-4 rounded-xl border border-os-line bg-white text-[14px] text-os-ink shadow-[0_1px_2px_rgba(22,38,94,0.04)] outline-none transition placeholder:text-os-muted/45 hover:border-os-navy/30 focus:border-os-navy/60 focus:ring-4 focus:ring-os-navy/10"
          required
        />
      </div>
    </div>
  ) : (
    <div>
      <label className="block text-[13px] font-medium text-os-ink/70 mb-2">{t({ zh: '手机号码', en: 'Phone number' })}</label>
      <div className="relative">
        <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-os-muted/60" />
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder={t({ zh: '请输入手机号码', en: 'Enter your phone number' })}
          className="w-full py-3 pl-12 pr-4 rounded-xl border border-os-line bg-white text-[14px] text-os-ink shadow-[0_1px_2px_rgba(22,38,94,0.04)] outline-none transition placeholder:text-os-muted/45 hover:border-os-navy/30 focus:border-os-navy/60 focus:ring-4 focus:ring-os-navy/10"
          required
        />
      </div>
    </div>
  );

  return (
    <div {...getYiyuPageAttrs('login')} className="min-h-screen bg-os-canvas">
      <div className="min-h-screen grid lg:grid-cols-[1.05fr_1fr]">
        {/* ── 左栏: 品牌叙事 (深藏蓝 os 渐变) ──────────────────── */}
        <aside className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-gradient-to-br from-os-navy via-os-navy-700 to-os-indigo px-12 py-14 text-white">
          {/* 冷光晕 + 微噪 */}
          <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(700px_circle_at_15%_0%,rgba(124,58,237,0.25),transparent_55%),radial-gradient(600px_circle_at_90%_100%,rgba(44,111,208,0.30),transparent_55%)]" />

          <div className="relative">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-[12px] bg-white/10 ring-1 ring-white/20 backdrop-blur flex items-center justify-center overflow-hidden">
                <img src={`${import.meta.env.BASE_URL}yiyu-avatar.png`} alt="益语智库" className="w-full h-full object-cover" />
              </div>
              <span className="text-[17px] font-semibold tracking-tight">{t({ zh: '益语智库', en: 'Yiyu Institute' })}</span>
            </div>
          </div>

          <div className="relative max-w-md">
            <h1 className="font-serif-display text-[40px] leading-[1.2] font-semibold tracking-tight">
              {t({ zh: '把战略思想', en: 'Turning strategic thinking' })}
              <br />{t({ zh: '做成可落地的工具', en: 'into actionable tools' })}
            </h1>
            <p className="mt-5 text-[15px] leading-7 text-white/70">
              {t({ zh: '提供可落地的增长咨询。登录后进入你的工作台，延续组织陪伴的每一步。', en: 'Actionable growth consulting. Sign in to enter your workspace and continue every step of organizational companionship.' })}
            </p>
            <ul className="mt-8 space-y-3 text-[14px] text-white/75">
              {[
                { zh: '战略陪伴 · 长期同行', en: 'Strategic Companion · long-term partnership' },
                { zh: '资讯情报 · 持续更新', en: 'Insights & Intel · continuously updated' },
                { zh: '组织诊断 · 对症落地', en: 'Organizational diagnosis · targeted execution' },
              ].map((item) => (
                <li key={item.zh} className="flex items-center gap-3">
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/15 ring-1 ring-white/25 text-[11px]">✓</span>
                  {t(item)}
                </li>
              ))}
            </ul>
          </div>

          <div className="relative text-[12px] text-white/45">{t({ zh: '© 益语智库 · 提供可落地的增长咨询', en: '© Yiyu Institute · actionable growth consulting' })}</div>
        </aside>

        {/* ── 右栏: 登录表单 ──────────────────────────────────── */}
        <div className="relative flex items-center justify-center px-4 py-10 sm:px-8">
          {/* 移动端冷蓝光晕背景 */}
          <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 lg:hidden bg-[radial-gradient(600px_circle_at_50%_0%,rgba(44,111,208,0.10),transparent_60%)]" />

          <div
            {...getYiyuSectionAttrs('login', 'login-form')}
            className="w-full max-w-[400px]"
          >
            {/* Back */}
            <button
              onClick={() => onNavigate?.('home')}
              className="inline-flex items-center gap-1.5 text-[13px] font-medium text-os-muted hover:text-os-navy transition-colors mb-8"
            >
              <ArrowLeft className="w-4 h-4" />
              {t({ zh: '返回首页', en: 'Back to home' })}
            </button>

            {/* 移动端品牌 (左栏隐藏时补上) */}
            <div className="lg:hidden flex items-center gap-2.5 mb-6">
              <div className="w-9 h-9 rounded-[10px] bg-gradient-to-br from-os-navy to-os-indigo overflow-hidden">
                <img src={`${import.meta.env.BASE_URL}yiyu-avatar.png`} alt="益语智库" className="w-full h-full object-cover" />
              </div>
              <span className="text-[15px] font-semibold text-os-navy">{t({ zh: '益语智库', en: 'Yiyu Institute' })}</span>
            </div>

            {/* Title */}
            <h2 className="font-serif-display text-[30px] sm:text-[34px] font-semibold text-os-ink tracking-tight">{t({ zh: '欢迎回来', en: 'Welcome back' })}</h2>
            <p className="mt-2 text-[14px] text-os-muted">
              {t({ zh: '还没有账号？', en: "Don't have an account?" })}{' '}
              <button
                onClick={() => onNavigate?.('register')}
                className="text-os-blue hover:text-os-navy font-medium transition-colors"
              >
                {t({ zh: '立即注册', en: 'Sign up now' })}
              </button>
            </p>

            {/* Login Mode 分段控件 */}
            <div className="mt-7 inline-flex w-full rounded-xl bg-os-mist/70 p-1 ring-1 ring-os-line">
              <button
                type="button"
                onClick={() => setLoginMode('email')}
                className={`flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-[13px] font-semibold transition ${loginMode === 'email' ? 'bg-white text-os-navy shadow-[0_1px_3px_rgba(22,38,94,0.12)]' : 'text-os-muted hover:text-os-navy'}`}
              >
                <Mail className="w-4 h-4" />{t({ zh: '邮箱登录', en: 'Email' })}
              </button>
              <button
                type="button"
                onClick={() => setLoginMode('phone')}
                className={`flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-[13px] font-semibold transition ${loginMode === 'phone' ? 'bg-white text-os-navy shadow-[0_1px_3px_rgba(22,38,94,0.12)]' : 'text-os-muted hover:text-os-navy'}`}
              >
                <Smartphone className="w-4 h-4" />{t({ zh: '手机登录', en: 'Phone' })}
              </button>
            </div>

            {/* Error */}
            {error && (
              <div className="mt-5 rounded-xl bg-rose-50 border border-rose-200/70 px-4 py-3 text-[13px] text-rose-700">
                {error}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="mt-5 space-y-5">
              {credentialField}

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-[13px] font-medium text-os-ink/70">{t({ zh: '密码', en: 'Password' })}</label>
                  <button
                    type="button"
                    onClick={() => onNavigate?.('forgot-password')}
                    className="text-[13px] text-os-blue hover:text-os-navy transition-colors"
                  >
                    {t({ zh: '忘记密码？', en: 'Forgot password?' })}
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-os-muted/60" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t({ zh: '请输入密码', en: 'Enter your password' })}
                    className="w-full py-3 pl-12 pr-12 rounded-xl border border-os-line bg-white text-[14px] text-os-ink shadow-[0_1px_2px_rgba(22,38,94,0.04)] outline-none transition placeholder:text-os-muted/45 hover:border-os-navy/30 focus:border-os-navy/60 focus:ring-4 focus:ring-os-navy/10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-os-muted/60 hover:text-os-navy transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Remember */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="remember"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-os-line text-os-navy focus:ring-os-navy/20"
                />
                <label htmlFor="remember" className="text-[13px] text-os-muted">{t({ zh: '记住我', en: 'Remember me' })}</label>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 rounded-xl bg-os-navy text-white text-[14px] font-medium shadow-[0_10px_30px_-10px_rgba(22,38,94,0.6)] transition hover:bg-os-navy-700 hover:shadow-[0_14px_34px_-10px_rgba(22,38,94,0.7)] disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    {t({ zh: '登录中...', en: 'Signing in...' })}
                  </span>
                ) : t({ zh: '登录', en: 'Sign in' })}
              </button>

              {/* 多入口说明 */}
              <p className="text-[12px] leading-5 text-os-muted/70">
                {t({ zh: '手机号和邮箱可作为同一账号的登录入口；若绑定到同一账号，将共用一个密码。', en: 'Phone and email can both sign in to the same account; if bound to one account, they share a single password.' })}
              </p>
            </form>

            {/* Terms */}
            <p className="mt-8 text-center text-[12px] text-os-muted/60">
              {t({ zh: '登录即表示您同意', en: 'By signing in, you agree to the' })}{' '}
              <button type="button" className="text-os-blue hover:underline" onClick={() => onNavigate?.('terms-of-service')}>{t({ zh: '服务条款', en: 'Terms of Service' })}</button>
              {' '}{t({ zh: '和', en: 'and' })}{' '}
              <button type="button" className="text-os-blue hover:underline" onClick={() => onNavigate?.('privacy-policy')}>{t({ zh: '隐私政策', en: 'Privacy Policy' })}</button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
