import { useState } from 'react';
import { ArrowLeft, Mail, Lock, Eye, EyeOff, User, Smartphone, CheckCircle } from 'lucide-react';
import { registerByCode, sendVerifyCode } from '../lib/authApi';
import { getYiyuPageAttrs, getYiyuSectionAttrs } from '../lib/yiyuTongSiteMap';

// NOTE: 邮箱验证邮件的跳转地址由 auth.ts 内的 emailRedirectTo 控制（需包含 BASE_URL 子路径）。

type RegisterTab = 'phone' | 'email';

interface RegisterPageProps {
  onNavigate?: (page: 'login' | 'register' | 'home' | 'terms-of-service' | 'privacy-policy') => void;
  onRegisterSuccess?: () => void;
}

export function RegisterPage({ onNavigate, onRegisterSuccess }: RegisterPageProps) {
  // 当前注册的Tab
  const [activeTab, setActiveTab] = useState<RegisterTab>('phone');

  // 表单数据
  const [formData, setFormData] = useState({
    phone: '',
    email: '',
    password: '',
    confirmPassword: '',
    verifyCode: '',
    nickname: '',
    inviteCode: '',
  });

  // 状态
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [countdown, setCountdown] = useState(0);

  // Tab配置
  const tabs = [
    { id: 'phone' as RegisterTab, label: '手机注册', icon: Smartphone },
    { id: 'email' as RegisterTab, label: '邮箱注册', icon: Mail },
  ];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
    setError('');
    setSuccess('');
  };

  // 发送验证码
  const handleSendCode = async () => {
    setError('');
    const normalizedPhone = formData.phone.trim();
    const normalizedEmail = formData.email.trim();

    if (activeTab === 'phone') {
      if (!/^1[3-9]\d{9}$/.test(normalizedPhone)) {
        setError('请输入正确的手机号码');
        return;
      }

      setIsSendingCode(true);
      const result = await sendVerifyCode('phone', normalizedPhone, 'register');
      setIsSendingCode(false);

      if (result.ok) {
        setSuccess('验证码已发送，请查收短信');
        setCountdown(60);
        const timer = setInterval(() => {
          setCountdown(prev => {
            if (prev <= 1) {
              clearInterval(timer);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } else {
        setError(result.error || '发送失败，请稍后重试');
      }
    } else if (activeTab === 'email') {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
        setError('请输入正确的邮箱地址');
        return;
      }

      setIsSendingCode(true);
      const result = await sendVerifyCode('email', normalizedEmail, 'register');
      setIsSendingCode(false);

      if (result.ok) {
        setSuccess('验证码已发送，请查收邮件');
        setCountdown(60);
        const timer = setInterval(() => {
          setCountdown(prev => {
            if (prev <= 1) {
              clearInterval(timer);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } else {
        setError(result.error || '发送失败，请稍后重试');
      }
    }
  };

  // 提交注册
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const normalizedNickname = formData.nickname.trim();
    const normalizedPhone = formData.phone.trim();
    const normalizedEmail = formData.email.trim();
    const normalizedCode = formData.verifyCode.trim();
    const normalizedInviteCode = formData.inviteCode.trim().toUpperCase();

    // 验证表单
    if (true) {
      if (!normalizedNickname) {
        setError('请输入昵称');
        return;
      }

      if (formData.password.length < 8) {
        setError('密码长度至少为8位');
        return;
      }

      if (formData.password !== formData.confirmPassword) {
        setError('两次输入的密码不一致');
        return;
      }

      if (!normalizedCode) {
        setError('请输入验证码');
        return;
      }

      if (activeTab === 'phone' && !/^1[3-9]\d{9}$/.test(normalizedPhone)) {
        setError('请输入正确的手机号码');
        return;
      }

      if (activeTab === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
        setError('请输入正确的邮箱地址');
        return;
      }
    }

    if (!agreedToTerms) {
      setError('请同意服务条款和隐私政策');
      return;
    }

    setIsLoading(true);

    try {
      let result: any;

      if (activeTab === 'phone') {
        result = await registerByCode({
          channel: 'phone',
          target: normalizedPhone,
          code: normalizedCode,
          password: formData.password,
          nickname: normalizedNickname || undefined,
          inviteCode: normalizedInviteCode || undefined,
        });
      } else if (activeTab === 'email') {
        result = await registerByCode({
          channel: 'email',
          target: normalizedEmail,
          code: normalizedCode,
          password: formData.password,
          nickname: normalizedNickname || undefined,
          inviteCode: normalizedInviteCode || undefined,
        });
      }

      if (result.ok) {
        const upgradedByInvite = result.data?.user?.paidSource === 'invite_code' || result.data?.user?.memberType === 'gold';
        setSuccess(upgradedByInvite ? '注册成功，已为你开通付费会员，正在跳转...' : '注册成功！正在跳转...');
        setTimeout(() => {
          if (onRegisterSuccess) {
            onRegisterSuccess();
          } else if (onNavigate) {
            onNavigate('login');
          }
        }, 1500);
      } else {
        setError(result.error || '注册失败，请稍后重试');
      }
    } catch (err) {
      setError('注册失败，请稍后重试');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div {...getYiyuPageAttrs('register')} className="min-h-screen bg-background">
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-primary/[0.04] via-transparent to-transparent" />
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(900px_circle_at_20%_10%,rgba(59,130,246,0.10),transparent_55%)]" />
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(900px_circle_at_80%_20%,rgba(168,85,247,0.08),transparent_55%)]" />
      {/* Register Form */}
      <div className="min-h-screen flex items-center justify-center px-4 py-10">
        <div
          {...getYiyuSectionAttrs('register', 'register-form')}
          className="w-full max-w-md rounded-[28px] bg-white border border-border/40 shadow-2xl shadow-black/[0.06] p-6 sm:p-8"
        >
          {/* Brand */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center overflow-hidden">
              <img
                src={`${import.meta.env.BASE_URL}yiyu-avatar.png`}
                alt="益语智库"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex flex-col items-start">
              <span className="text-xl font-semibold text-foreground leading-tight">益语智库</span>
              <span className="text-[13px] text-muted-foreground/70 mt-1">提供可落地的增长咨询</span>
            </div>
          </div>

          {/* Back Button */}
          <button
            onClick={() => onNavigate?.('home')}
            className="flex items-center gap-2 text-gray-500 hover:text-foreground transition-colors duration-200 mb-6 group"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform duration-200" />
            <span className="text-sm font-medium">返回首页</span>
          </button>

          {/* Access rule card removed (避免与左侧说明重复) */}

          {/* Title Section */}
          <div className="mb-8">
            <h2 className="text-[28px] font-semibold text-foreground mb-2 tracking-tight">
              创建账户
            </h2>
            <p className="text-gray-500 text-[13px]">
              已有账号？{' '}
              <button
                onClick={() => onNavigate?.('login')}
                className="text-primary hover:text-primary/80 font-medium transition-colors duration-200 relative group"
              >
                立即登录
                <span className="absolute -bottom-0.5 left-0 w-0 h-0.5 bg-primary group-hover:w-full transition-all duration-300" />
              </button>
            </p>
          </div>

          {/* Tab Navigation */}
          <div className="flex gap-2 p-1 bg-gray-100/80  rounded-2xl mb-8 text-[13px]">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setError('');
                  setSuccess('');
                }}
                className={`flex-1 py-3 px-4 rounded-xl text-sm font-medium transition-all duration-300 flex items-center justify-center gap-2 relative overflow-hidden ${
                  activeTab === tab.id
                    ? 'bg-white text-primary shadow-md'
                    : 'text-gray-500 hover:text-foreground hover:bg-white/50'
                }`}
              >
                {activeTab === tab.id && (
                  <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-accent/5 rounded-xl" />
                )}
                <tab.icon className={`w-4 h-4 relative z-10 ${activeTab === tab.id ? 'text-primary' : ''}`} />
                <span className="hidden sm:inline relative z-10">{tab.label}</span>
              </button>
            ))}
          </div>

          <div className="mb-6 rounded-2xl border border-blue-100 bg-blue-50/80 px-4 py-3 text-[13px] text-blue-700">
            可使用手机号或邮箱创建账号。后续若同时绑定手机号和邮箱，它们会作为同一账号的两种入口，并共用一个密码。
          </div>

          {/* Success Message */}
          {success && (
            <div className="mb-6 p-4 rounded-2xl bg-green-50/80  border border-green-200/50 text-green-600 text-sm flex items-center gap-3 animate-fadeIn">
              <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-4 h-4" />
              </div>
              <span className="font-medium">{success}</span>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 rounded-2xl bg-red-50/80  border border-red-200/50 text-red-600 text-sm animate-fadeIn">
              <span className="font-medium">{error}</span>
            </div>
          )}

          {/* Register Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* 昵称（所有方式都需要） */}
            <div className="animate-fadeInUp" style={{ animationDelay: '0ms' }}>
              <label className="block text-[13px] font-medium text-foreground mb-2">
                昵称
              </label>
              <div className="relative group">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-primary transition-colors duration-200" />
                <input
                  type="text"
                  name="nickname"
                  value={formData.nickname}
                  onChange={handleChange}
                  placeholder="请输入您的昵称"
                  className="w-full py-3.5 pl-12 pr-4 rounded-2xl border border-border/40 bg-white  focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all duration-300 hover:border-border/60 text-[13px]"
                  required
                />
              </div>
            </div>

            {/* 手机号注册表单 */}
            {activeTab === 'phone' && (
              <>
                <div className="animate-fadeInUp" style={{ animationDelay: '100ms' }}>
                  <label className="block text-[13px] font-medium text-foreground mb-2">
                    手机号码
                  </label>
                  <div className="relative group">
                    <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-primary transition-colors duration-200" />
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="请输入手机号码"
                      className="w-full py-3.5 pl-12 pr-4 rounded-2xl border border-border/40 bg-white  focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all duration-300 hover:border-border/60 text-[13px]"
                      required
                    />
                  </div>
                </div>

                <div className="animate-fadeInUp" style={{ animationDelay: '150ms' }}>
                  <label className="block text-[13px] font-medium text-foreground mb-2">
                    验证码
                  </label>
                  <div className="flex gap-3">
                    <div className="relative flex-1 group">
                      <CheckCircle className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-primary transition-colors duration-200" />
                      <input
                        type="text"
                        name="verifyCode"
                        value={formData.verifyCode}
                        onChange={handleChange}
                        placeholder="请输入验证码"
                        className="w-full py-3.5 pl-12 pr-4 rounded-2xl border border-border/40 bg-white  focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all duration-300 hover:border-border/60 text-[13px]"
                        required
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleSendCode}
                      disabled={isSendingCode || countdown > 0}
                      className="px-5 py-3.5 bg-gray-100/80  text-gray-700 rounded-2xl font-medium hover:bg-gray-200 hover:scale-[1.02] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap shadow-sm hover:shadow-md text-[13px]"
                    >
                      {countdown > 0 ? `${countdown}s` : '获取验证码'}
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* 邮箱注册表单 */}
            {activeTab === 'email' && (
              <>
                <div className="animate-fadeInUp" style={{ animationDelay: '100ms' }}>
                  <label className="block text-[13px] font-medium text-foreground mb-2">
                    邮箱地址
                  </label>
                  <div className="relative group">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-primary transition-colors duration-200" />
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="请输入邮箱地址"
                      className="w-full py-3.5 pl-12 pr-4 rounded-2xl border border-border/40 bg-white  focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all duration-300 hover:border-border/60 text-[13px]"
                      required
                    />
                  </div>
                </div>

                <div className="animate-fadeInUp" style={{ animationDelay: '150ms' }}>
                  <label className="block text-[13px] font-medium text-foreground mb-2">
                    验证码
                  </label>
                  <div className="flex gap-3">
                    <div className="relative flex-1 group">
                      <CheckCircle className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-primary transition-colors duration-200" />
                      <input
                        type="text"
                        name="verifyCode"
                        value={formData.verifyCode}
                        onChange={handleChange}
                        placeholder="请输入验证码"
                        className="w-full py-3.5 pl-12 pr-4 rounded-2xl border border-border/40 bg-white  focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all duration-300 hover:border-border/60 text-[13px]"
                        required
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleSendCode}
                      disabled={isSendingCode || countdown > 0}
                      className="px-5 py-3.5 bg-gray-100/80  text-gray-700 rounded-2xl font-medium hover:bg-gray-200 hover:scale-[1.02] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap shadow-sm hover:shadow-md text-[13px]"
                    >
                      {countdown > 0 ? `${countdown}s` : '获取验证码'}
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-gray-500 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5" />
                    验证码将发送到您的邮箱，请注意查收
                  </p>
                </div>
              </>
            )}

            <div className="animate-fadeInUp" style={{ animationDelay: '180ms' }}>
              <label className="block text-[13px] font-medium text-foreground mb-2">
                邀请码（选填）
              </label>
              <div className="relative group">
                <CheckCircle className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-primary transition-colors duration-200" />
                <input
                  type="text"
                  name="inviteCode"
                  value={formData.inviteCode}
                  onChange={handleChange}
                  placeholder="如有邀请码，可注册时直接开通付费会员或绑定机构战略陪伴"
                  className="w-full py-3.5 pl-12 pr-4 rounded-2xl border border-border/40 bg-white focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all duration-300 hover:border-border/60 text-[13px]"
                />
              </div>
            </div>

            {/* 密码输入（手机和邮箱需要） */}
            {true && (
              <>
                <div className="animate-fadeInUp" style={{ animationDelay: '200ms' }}>
                  <label className="block text-[13px] font-medium text-foreground mb-2">
                    设置密码
                  </label>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-primary transition-colors duration-200" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="请设置密码（至少8位）"
                      className="w-full py-3.5 pl-12 pr-12 rounded-2xl border border-border/40 bg-white  focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all duration-300 hover:border-border/60 text-[13px]"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-foreground transition-colors duration-200 p-1"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-gray-500">
                    该密码会作为此账号的统一登录密码；后续若同时绑定手机号和邮箱，二者共用这一个密码。
                  </p>
                </div>

                <div className="animate-fadeInUp" style={{ animationDelay: '250ms' }}>
                  <label className="block text-[13px] font-medium text-foreground mb-2">
                    确认密码
                  </label>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-primary transition-colors duration-200" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      placeholder="请再次输入密码"
                      className="w-full py-3.5 pl-12 pr-4 rounded-2xl border border-border/40 bg-white  focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all duration-300 hover:border-border/60 text-[13px]"
                      required
                    />
                  </div>
                </div>
              </>
            )}

            {/* Terms Agreement */}
            <div className="flex items-start gap-3 pt-2 animate-fadeInUp" style={{ animationDelay: '300ms' }}>
              <div className="mt-0.5">
                <input
                  type="checkbox"
                  id="terms"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  className="w-4 h-4 rounded border border-gray-900 accent-black focus:ring-0 focus:ring-offset-0"
                />
              </div>
              <label htmlFor="terms" className="text-[13px] text-gray-600 leading-relaxed cursor-pointer">
                我已阅读并同意
                <button
                  type="button"
                  onClick={() => onNavigate?.('terms-of-service')}
                  className="text-primary hover:text-primary/80 font-medium transition-colors duration-200 mx-1"
                >
                  服务条款
                </button>
                和
                <button
                  type="button"
                  onClick={() => onNavigate?.('privacy-policy')}
                  className="text-primary hover:text-primary/80 font-medium transition-colors duration-200 ml-1"
                >
                  隐私政策
                </button>
              </label>
            </div>

            {/* Submit Button */}
            {true && (
              <button
                type="submit"
                disabled={isLoading || !agreedToTerms}
                className="w-full py-3.5 rounded-2xl bg-primary text-primary-foreground text-[14px] font-medium hover:bg-primary/90 hover:scale-[1.02] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed mt-2 shadow-lg shadow-primary/20 hover:shadow-xl animate-fadeInUp text-[13px]"
                style={{ animationDelay: '350ms' }}
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    注册中...
                  </span>
                ) : (
                  '立即注册'
                )}
              </button>
            )}
          </form>
        </div>
      </div>

    </div>
  );
}

export default RegisterPage;
