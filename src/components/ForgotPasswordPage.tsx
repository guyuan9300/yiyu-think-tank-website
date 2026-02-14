import { useState } from 'react';
import { ArrowLeft, Mail } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface ForgotPasswordPageProps {
  onNavigate?: (page: 'login' | 'register' | 'home') => void;
}

export function ForgotPasswordPage({ onNavigate }: ForgotPasswordPageProps) {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!email) {
      setError('请输入邮箱');
      return;
    }

    setIsLoading(true);
    try {
      // IMPORTANT: GitHub Pages 部署在子路径，需要带 BASE_URL
      const redirectTo = `${window.location.origin}${import.meta.env.BASE_URL}?page=reset-password`;
      const { error: err } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
      if (err) {
        setError(err.message);
      } else {
        setSuccess('已发送重置密码邮件，请去邮箱打开链接继续。');
      }
    } catch (e: any) {
      setError(e?.message || '发送失败，请稍后重试');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-white/80 backdrop-blur rounded-3xl shadow-xl border border-border/40 p-8">
          <button
            type="button"
            onClick={() => onNavigate?.('login')}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            返回登录
          </button>

          <h1 className="mt-6 text-2xl font-bold text-gray-900">找回密码</h1>
          <p className="mt-2 text-sm text-muted-foreground">输入注册邮箱，我们会发送重置密码链接。</p>

          {error && (
            <div className="mt-5 p-4 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm">{error}</div>
          )}
          {success && (
            <div className="mt-5 p-4 rounded-xl bg-green-50 border border-green-100 text-green-700 text-sm">{success}</div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">邮箱地址</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="请输入邮箱地址"
                  className="w-full py-3 pl-12 pr-4 rounded-full border border-border/60 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all bg-white"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-full bg-primary text-primary-foreground font-medium hover:opacity-95 disabled:opacity-50 transition"
            >
              {isLoading ? '发送中...' : '发送重置邮件'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default ForgotPasswordPage;
