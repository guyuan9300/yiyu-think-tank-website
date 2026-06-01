import { useMemo, useState } from 'react';
import { ArrowLeft, Lock, Eye, EyeOff, Mail, Smartphone } from 'lucide-react';
import { resetPasswordByCode } from '../lib/authApi';
import { getYiyuPageAttrs, getYiyuSectionAttrs } from '../lib/yiyuTongSiteMap';
import { useLang } from '../lib/i18n';

interface ResetPasswordPageProps {
  onNavigate?: (page: 'login' | 'register' | 'home' | 'forgot-password') => void;
}

export function ResetPasswordPage({ onNavigate }: ResetPasswordPageProps) {
  const { t } = useLang();
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const channel = (params.get('channel') === 'phone' ? 'phone' : 'email') as 'phone' | 'email';
  const target = params.get('target') || '';

  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!target) {
      setError(t({ zh: '缺少重置目标，请返回重新获取验证码', en: 'Missing reset target. Please go back and request a code again.' }));
      return;
    }
    if (!code.trim()) {
      setError(t({ zh: '请输入验证码', en: 'Please enter the verification code' }));
      return;
    }
    if (!password || password.length < 8) {
      setError(t({ zh: '密码至少 8 位', en: 'Password must be at least 8 characters' }));
      return;
    }
    if (password !== confirmPassword) {
      setError(t({ zh: '两次密码不一致', en: 'The two passwords do not match' }));
      return;
    }

    setIsLoading(true);
    try {
      const result = await resetPasswordByCode({ channel, target, code: code.trim(), newPassword: password });
      if (!result.ok) {
        setError(result.error || t({ zh: '重置失败，请稍后重试', en: 'Reset failed, please try again later' }));
      } else {
        setSuccess(t({ zh: '密码已重置，请使用新密码登录。', en: 'Password reset. Please sign in with your new password.' }));
      }
    } catch (e: any) {
      setError(e?.message || t({ zh: '重置失败，请稍后重试', en: 'Reset failed, please try again later' }));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div {...getYiyuPageAttrs('reset-password')} className="min-h-screen bg-os-canvas flex items-center justify-center px-4 relative">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(900px_circle_at_20%_10%,rgba(44,111,208,0.10),transparent_55%)]" />
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(900px_circle_at_80%_20%,rgba(124,58,237,0.08),transparent_55%)]" />
      <div className="w-full max-w-md">
        <div
          {...getYiyuSectionAttrs('reset-password', 'reset-password-form')}
          className="bg-white/80 backdrop-blur rounded-3xl shadow-xl border border-border/40 p-8"
        >
          <button type="button" onClick={() => onNavigate?.('login')} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
            {t({ zh: '返回登录', en: 'Back to sign in' })}
          </button>

          <h1 className="mt-6 font-serif-display text-[28px] sm:text-[32px] font-semibold tracking-tight text-os-ink">{t({ zh: '重置密码', en: 'Reset password' })}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{t({ zh: '请输入收到的验证码并设置新密码。', en: 'Enter the verification code you received and set a new password.' })}</p>
          <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50/80 px-4 py-3 text-[13px] text-blue-700">
            {t({ zh: '同一账号只保留一个密码。若手机号和邮箱已同时绑定到该账号，重置后两种登录方式都会使用这一个新密码。', en: 'Each account keeps a single password. If both phone and email are bound to the account, both sign-in methods will use this new password after reset.' })}
          </div>

          {error && <div className="mt-5 p-4 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm">{error}</div>}
          {success && <div className="mt-5 p-4 rounded-xl bg-green-50 border border-green-100 text-green-700 text-sm">{success}</div>}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">{t({ zh: '重置目标', en: 'Reset target' })}</label>
              <div className="relative">
                {channel === 'email' ? <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" /> : <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />}
                <input value={target} readOnly className="w-full py-3 pl-12 pr-4 rounded-full border border-border/60 text-sm bg-os-mist/30 text-os-muted" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">{t({ zh: '验证码', en: 'Verification code' })}</label>
              <input value={code} onChange={(e) => setCode(e.target.value)} placeholder={t({ zh: '请输入验证码', en: 'Enter the verification code' })} className="w-full py-3 px-4 rounded-full border border-border/60 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all bg-white" required />
            </div>

            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">{t({ zh: '新密码', en: 'New password' })}</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder={t({ zh: '至少 8 位', en: 'At least 8 characters' })} className="w-full py-3 pl-12 pr-12 rounded-full border border-border/60 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all bg-white" required />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground transition-colors">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {t({ zh: '设置完成后，该账号下已绑定的手机号和邮箱将共用这个新密码。', en: 'Once set, the phone and email bound to this account will share this new password.' })}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">{t({ zh: '确认新密码', en: 'Confirm new password' })}</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                <input type={showPassword ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder={t({ zh: '再次输入', en: 'Enter again' })} className="w-full py-3 pl-12 pr-4 rounded-full border border-border/60 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all bg-white" required />
              </div>
            </div>

            <button type="submit" disabled={isLoading} className="w-full py-3 rounded-full bg-primary text-primary-foreground font-medium hover:opacity-95 disabled:opacity-50 transition">
              {isLoading ? t({ zh: '提交中...', en: 'Submitting...' }) : t({ zh: '确认重置', en: 'Confirm reset' })}
            </button>
          </form>

          {success && (
            <button type="button" onClick={() => onNavigate?.('login')} className="mt-4 w-full py-3 rounded-full bg-os-navy text-white font-semibold hover:bg-os-navy/90 transition">
              {t({ zh: '去登录', en: 'Go to sign in' })}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default ResetPasswordPage;
