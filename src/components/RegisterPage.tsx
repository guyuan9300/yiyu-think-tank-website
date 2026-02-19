import { useState } from 'react';
import { ArrowLeft, Mail, Lock, Eye, EyeOff, User, Smartphone, CheckCircle } from 'lucide-react';
import { WeChatLoginModal } from './WeChatLoginModal';
import { WeChatIcon } from './WeChatIcon';
import {
  sendSMSCode,
  sendEmailCode,
  registerWithPhone,
  registerWithEmail,
  loginWithWechat
} from '../lib/auth';

// NOTE: 邮箱验证邮件的跳转地址由 auth.ts 内的 emailRedirectTo 控制（需包含 BASE_URL 子路径）。

type RegisterTab = 'phone' | 'email' | 'wechat';

interface RegisterPageProps {
  onNavigate?: (page: 'login' | 'register' | 'home') => void;
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
  });

  // 状态
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [showWeChatModal, setShowWeChatModal] = useState(false);
  const [countdown, setCountdown] = useState(0);

  // Tab配置
  const tabs = [
    { id: 'phone' as RegisterTab, label: '手机注册', icon: Smartphone },
    { id: 'email' as RegisterTab, label: '邮箱注册', icon: Mail },
    { id: 'wechat' as RegisterTab, label: '微信注册', icon: WeChatIcon },
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

    if (activeTab === 'phone') {
      if (!/^1[3-9]\d{9}$/.test(formData.phone)) {
        setError('请输入正确的手机号码');
        return;
      }

      setIsSendingCode(true);
      const result = await sendSMSCode(formData.phone);
      setIsSendingCode(false);

      if (result.success) {
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
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        setError('请输入正确的邮箱地址');
        return;
      }

      setIsSendingCode(true);
      const result = await sendEmailCode(formData.email);
      setIsSendingCode(false);

      if (result.success) {
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

    // 验证表单
    if (activeTab !== 'wechat') {
      if (formData.password.length < 8) {
        setError('密码长度至少为8位');
        return;
      }

      if (formData.password !== formData.confirmPassword) {
        setError('两次输入的密码不一致');
        return;
      }

      if (!formData.verifyCode) {
        setError('请输入验证码');
        return;
      }
    }

    if (!agreedToTerms) {
      setError('请同意服务条款和隐私政策');
      return;
    }

    setIsLoading(true);

    try {
      let result;

      if (activeTab === 'phone') {
        result = await registerWithPhone(
          formData.phone,
          formData.password,
          formData.verifyCode,
          formData.nickname || undefined
        );
      } else if (activeTab === 'email') {
        result = await registerWithEmail(
          formData.email,
          formData.password,
          formData.verifyCode,
          formData.nickname || undefined
        );
      } else {
        // 微信注册
        result = await loginWithWechat('code_from_wechat');
      }

      if (result.success) {
        setSuccess('注册成功！正在跳转...');
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
    <div className="min-h-screen bg-background flex">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-accent via-primary to-primary p-12 flex-col justify-between relative overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/3 right-1/3 w-80 h-80 bg-white/20 rounded-full blur-3xl animate-pulse-soft" />
          <div className="absolute bottom-1/3 left-1/3 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-pulse-soft delay-700" />
          {/* Decorative elements */}
          <div className="absolute top-20 right-20 w-20 h-20 border border-white/20 rounded-full animate-fadeIn" />
          <div className="absolute bottom-40 left-20 w-12 h-12 border border-white/20 rounded-full animate-fadeIn delay-300" />
        </div>

        {/* Content */}
        <div className="relative z-10">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-12">
            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30 shadow-lg overflow-hidden">
              <img
                src={`${import.meta.env.BASE_URL}yiyu-avatar.png`}
                alt="益语智库"
                className="w-full h-full object-cover"
              />
            </div>
            <span className="text-white text-2xl font-semibold tracking-wide">益语智库</span>
          </div>

          {/* Value Proposition */}
          <div className="mb-12">
            <h1 className="text-[44px] font-semibold text-white mb-6 leading-tight tracking-tight">
              加入益语智库
              <br />
              <span className="text-white/70 font-normal">开启增长之旅</span>
            </h1>

            <p className="text-white/70 text-[17px] leading-relaxed max-w-md mb-8">
              三种注册方式任您选择，立即成为会员解锁专属权益
            </p>
          </div>

          {/* Benefits */}
          <div className="space-y-5">
            {[
              { icon: '✓', text: '手机号快速注册' },
              { icon: '✓', text: '邮箱注册更安全' },
              { icon: '✓', text: '微信一键登录' },
              { icon: '✓', text: '成为会员享专属权益' }
            ].map((item, index) => (
              <div
                key={index}
                className="flex items-center gap-4 text-white/80 group cursor-default animate-fadeInUp"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/20 group-hover:bg-white/30 group-hover:scale-105 transition-all duration-300">
                  <span className="text-sm font-medium">{item.icon}</span>
                </div>
                <span className="text-[15px] font-medium group-hover:text-white transition-colors">
                  {item.text}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 text-white/50 text-sm font-medium">
          © 2026 益语智库 Yiyu Think Tank. All rights reserved.
        </div>
      </div>

      {/* Right Side - Register Form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 overflow-y-auto bg-gradient-to-b from-background to-background/50">
        <div className="w-full max-w-md py-4">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/20 overflow-hidden">
              <img
                src={`${import.meta.env.BASE_URL}yiyu-avatar.png`}
                alt="益语智库"
                className="w-full h-full object-cover"
              />
            </div>
            <span className="text-xl font-semibold">益语智库</span>
          </div>

          {/* Back Button */}
          <button
            onClick={() => onNavigate?.('home')}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors duration-200 mb-8 group"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform duration-200" />
            <span className="text-sm font-medium">返回首页</span>
          </button>

          {/* Title Section */}
          <div className="mb-8">
            <h2 className="text-[32px] font-semibold text-foreground mb-2 tracking-tight">
              创建账号
            </h2>
            <p className="text-muted-foreground text-[15px]">
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
          <div className="flex gap-2 p-1 bg-gray-100/80 backdrop-blur-sm rounded-2xl mb-8">
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
                    : 'text-muted-foreground hover:text-foreground hover:bg-white/50'
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

          {/* Success Message */}
          {success && (
            <div className="mb-6 p-4 rounded-2xl bg-green-50/80 backdrop-blur-sm border border-green-200/50 text-green-600 text-sm flex items-center gap-3 animate-fadeIn">
              <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-4 h-4" />
              </div>
              <span className="font-medium">{success}</span>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 rounded-2xl bg-red-50/80 backdrop-blur-sm border border-red-200/50 text-red-600 text-sm animate-fadeIn">
              <span className="font-medium">{error}</span>
            </div>
          )}

          {/* Register Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* 昵称（所有方式都需要） */}
            <div className="animate-fadeInUp" style={{ animationDelay: '0ms' }}>
              <label className="block text-sm font-medium text-foreground mb-2.5">
                昵称
              </label>
              <div className="relative group">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors duration-200" />
                <input
                  type="text"
                  name="nickname"
                  value={formData.nickname}
                  onChange={handleChange}
                  placeholder="请输入您的昵称"
                  className="w-full py-3.5 pl-12 pr-4 rounded-2xl border border-border/40 bg-white/60 backdrop-blur-sm focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all duration-300 hover:border-border/60"
                  required
                />
              </div>
            </div>

            {/* 手机号注册表单 */}
            {activeTab === 'phone' && (
              <>
                <div className="animate-fadeInUp" style={{ animationDelay: '100ms' }}>
                  <label className="block text-sm font-medium text-foreground mb-2.5">
                    手机号码
                  </label>
                  <div className="relative group">
                    <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors duration-200" />
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="请输入手机号码"
                      className="w-full py-3.5 pl-12 pr-4 rounded-2xl border border-border/40 bg-white/60 backdrop-blur-sm focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all duration-300 hover:border-border/60"
                      required
                    />
                  </div>
                </div>

                <div className="animate-fadeInUp" style={{ animationDelay: '150ms' }}>
                  <label className="block text-sm font-medium text-foreground mb-2.5">
                    验证码
                  </label>
                  <div className="flex gap-3">
                    <div className="relative flex-1 group">
                      <CheckCircle className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors duration-200" />
                      <input
                        type="text"
                        name="verifyCode"
                        value={formData.verifyCode}
                        onChange={handleChange}
                        placeholder="请输入验证码"
                        className="w-full py-3.5 pl-12 pr-4 rounded-2xl border border-border/40 bg-white/60 backdrop-blur-sm focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all duration-300 hover:border-border/60"
                        required
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleSendCode}
                      disabled={isSendingCode || countdown > 0}
                      className="px-5 py-3.5 bg-gray-100/80 backdrop-blur-sm text-gray-700 rounded-2xl font-medium hover:bg-gray-200 hover:scale-[1.02] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap shadow-sm hover:shadow-md"
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
                  <label className="block text-sm font-medium text-foreground mb-2.5">
                    邮箱地址
                  </label>
                  <div className="relative group">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors duration-200" />
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="请输入邮箱地址"
                      className="w-full py-3.5 pl-12 pr-4 rounded-2xl border border-border/40 bg-white/60 backdrop-blur-sm focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all duration-300 hover:border-border/60"
                      required
                    />
                  </div>
                </div>

                <div className="animate-fadeInUp" style={{ animationDelay: '150ms' }}>
                  <label className="block text-sm font-medium text-foreground mb-2.5">
                    验证码
                  </label>
                  <div className="flex gap-3">
                    <div className="relative flex-1 group">
                      <CheckCircle className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors duration-200" />
                      <input
                        type="text"
                        name="verifyCode"
                        value={formData.verifyCode}
                        onChange={handleChange}
                        placeholder="请输入验证码"
                        className="w-full py-3.5 pl-12 pr-4 rounded-2xl border border-border/40 bg-white/60 backdrop-blur-sm focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all duration-300 hover:border-border/60"
                        required
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleSendCode}
                      disabled={isSendingCode || countdown > 0}
                      className="px-5 py-3.5 bg-gray-100/80 backdrop-blur-sm text-gray-700 rounded-2xl font-medium hover:bg-gray-200 hover:scale-[1.02] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap shadow-sm hover:shadow-md"
                    >
                      {countdown > 0 ? `${countdown}s` : '获取验证码'}
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5" />
                    验证码将发送到您的邮箱，请注意查收
                  </p>
                </div>
              </>
            )}

            {/* 微信注册表单 */}
            {activeTab === 'wechat' && (
              <div className="py-10 text-center animate-fadeIn">
                <div className="w-24 h-24 bg-[#07C160]/10 rounded-full flex items-center justify-center mx-auto mb-6 hover:scale-110 transition-transform duration-300">
                  <div className="w-20 h-20 bg-[#07C160] rounded-full flex items-center justify-center shadow-lg shadow-[#07C160]/30">
                    <WeChatIcon className="w-10 h-10 text-white" />
                  </div>
                </div>
                <p className="text-muted-foreground mb-8 text-[15px]">
                  使用微信注册，一键完成，方便快捷
                </p>
                <button
                  type="button"
                  onClick={() => setShowWeChatModal(true)}
                  className="px-8 py-4 bg-[#07C160] text-white rounded-2xl font-medium hover:bg-[#06AD56] hover:scale-[1.02] transition-all duration-300 flex items-center justify-center gap-3 mx-auto shadow-lg shadow-[#07C160]/30 hover:shadow-xl"
                >
                  <WeChatIcon className="w-5 h-5" />
                  微信一键注册
                </button>
              </div>
            )}

            {/* 密码输入（手机和邮箱需要） */}
            {activeTab !== 'wechat' && (
              <>
                <div className="animate-fadeInUp" style={{ animationDelay: '200ms' }}>
                  <label className="block text-sm font-medium text-foreground mb-2.5">
                    设置密码
                  </label>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors duration-200" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="请设置密码（至少8位）"
                      className="w-full py-3.5 pl-12 pr-12 rounded-2xl border border-border/40 bg-white/60 backdrop-blur-sm focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all duration-300 hover:border-border/60"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors duration-200 p-1"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div className="animate-fadeInUp" style={{ animationDelay: '250ms' }}>
                  <label className="block text-sm font-medium text-foreground mb-2.5">
                    确认密码
                  </label>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors duration-200" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      placeholder="请再次输入密码"
                      className="w-full py-3.5 pl-12 pr-4 rounded-2xl border border-border/40 bg-white/60 backdrop-blur-sm focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all duration-300 hover:border-border/60"
                      required
                    />
                  </div>
                </div>
              </>
            )}

            {/* Terms Agreement */}
            <div className="flex items-start gap-3 pt-2 animate-fadeInUp" style={{ animationDelay: '300ms' }}>
              <div className="relative mt-0.5">
                <input
                  type="checkbox"
                  id="terms"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  className="w-5 h-5 rounded-lg border-border/40 text-primary focus:ring-primary/20 cursor-pointer appearance-none checked:bg-primary checked:border-primary transition-all duration-200"
                />
                {agreedToTerms && (
                  <CheckCircle className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 text-white" />
                )}
              </div>
              <label htmlFor="terms" className="text-sm text-muted-foreground leading-relaxed cursor-pointer">
                我已阅读并同意
                <a href="#" className="text-primary hover:text-primary/80 font-medium transition-colors duration-200 mx-1">
                  服务条款
                </a>
                和
                <a href="#" className="text-primary hover:text-primary/80 font-medium transition-colors duration-200 ml-1">
                  隐私政策
                </a>
              </label>
            </div>

            {/* Submit Button */}
            {activeTab !== 'wechat' && (
              <button
                type="submit"
                disabled={isLoading || !agreedToTerms}
                className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 hover:scale-[1.02] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed mt-2 shadow-lg shadow-primary/20 hover:shadow-xl animate-fadeInUp"
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

      {/* 微信登录弹窗 */}
      <WeChatLoginModal
        isOpen={showWeChatModal}
        onClose={() => setShowWeChatModal(false)}
        onSuccess={() => {
          setShowWeChatModal(false);
          if (onRegisterSuccess) {
            onRegisterSuccess();
          } else if (onNavigate) {
            onNavigate('home');
          }
        }}
      />
    </div>
  );
}

export default RegisterPage;
