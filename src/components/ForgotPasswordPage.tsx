import { useState } from 'react';
import { ArrowLeft, Mail, Smartphone } from 'lucide-react';
import { sendVerifyCode } from '../lib/authApi';

type ResetChannel = 'email' | 'phone';

interface ForgotPasswordPageProps {
  onNavigate?: (page: 'login' | 'register' | 'home' | 'reset-password') => void;
}

export function ForgotPasswordPage({ onNavigate }: ForgotPasswordPageProps) {
  const params = new URLSearchParams(window.location.search);
  const initialChannel = params.get('channel') === 'phone' ? 'phone' : 'email';
  const [channel, setChannel] = useState<ResetChannel>(initialChannel);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const formatError = (message?: string) => {
    if (!message) return '发送失败，请稍后重试';
    if (message.includes('短信服务未配置') || message.includes('短信模板未配置')) {
      return '短信服务暂时不可用，请稍后重试或先使用邮箱找回密码。';
    }
    return message;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPhone = phone.trim();

    if (channel === 'email') {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
        setError('请输入正确的邮箱地址');
        return;
      }
    } else {
      if (!/^1[3-9]\d{9}$/.test(normalizedPhone)) {
        setError('请输入正确的手机号码');
        return;
      }
    }

    setIsLoading(true);
    try {
      const result = await sendVerifyCode(channel, channel === 'email' ? normalizedEmail : normalizedPhone, 'reset');
      if (!result.ok) {
        setError(formatError(result.error));
      } else {
        setSuccess(channel === 'email' ? '验证码已发送，请查收邮箱后继续重置密码。' : '验证码已发送，请查收短信后继续重置密码。');
        setTimeout(() => {
          const target = channel === 'email' ? normalizedEmail : normalizedPhone;
          const encoded = encodeURIComponent(target);
          window.location.href = `${window.location.pathname}?page=reset-password&channel=${channel}&target=${encoded}`;
        }, 800);
      }
    } catch (e: any) {
      setError(formatError(e?.message));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-white/80 backdrop-blur rounded-3xl shadow-xl border border-border/40 p-8">
          <button type="button" onClick={() => onNavigate?.('login')} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
            返回登录
          </button>

          <h1 className="mt-6 text-2xl font-bold text-gray-900">找回密码</h1>
          <p className="mt-2 text-sm text-muted-foreground">支持邮箱找回和手机找回。输入对应账号后，使用验证码即可重设密码。</p>
          <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50/80 px-4 py-3 text-[13px] text-blue-700">
            若手机号和邮箱已绑定到同一账号，通过任一已绑定方式重置后，该账号的密码都会同步更新。
          </div>

          <div className="mt-6 grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => {
                setChannel('email');
                setError('');
                setSuccess('');
              }}
              className={`rounded-2xl px-4 py-2.5 text-sm font-medium transition ${channel === 'email' ? 'bg-white text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <span className="inline-flex items-center gap-2"><Mail className="h-4 w-4" />邮箱找回</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setChannel('phone');
                setError('');
                setSuccess('');
              }}
              className={`rounded-2xl px-4 py-2.5 text-sm font-medium transition ${channel === 'phone' ? 'bg-white text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <span className="inline-flex items-center gap-2"><Smartphone className="h-4 w-4" />手机找回</span>
            </button>
          </div>

          {error && <div className="mt-5 p-4 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm">{error}</div>}
          {success && <div className="mt-5 p-4 rounded-xl bg-green-50 border border-green-100 text-green-700 text-sm">{success}</div>}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {channel === 'email' ? (
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">邮箱地址</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="请输入邮箱地址" className="w-full py-3 pl-12 pr-4 rounded-full border border-border/60 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all bg-white" required />
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">手机号码</label>
                <div className="relative">
                  <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                  <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="请输入手机号码" className="w-full py-3 pl-12 pr-4 rounded-full border border-border/60 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all bg-white" required />
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  若当前手机号已绑定到账号，短信验证码可直接用于找回密码。
                </p>
              </div>
            )}

            <button type="submit" disabled={isLoading} className="w-full py-3 rounded-full bg-primary text-primary-foreground font-medium hover:opacity-95 disabled:opacity-50 transition">
              {isLoading ? '发送中...' : '发送验证码'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default ForgotPasswordPage;
