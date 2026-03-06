import { useEffect, useMemo, useState } from 'react';
import { Header } from './Header';
import { clearUser, getSavedUserRaw, saveUserRaw, USER_KEY } from '../lib/storage';
import { generateAvatarImage } from '../lib/hfImageGen';
import { resetPasswordByCode, sendVerifyCode } from '../lib/authApi';
import {
  User as UserIcon,
  Crown,
  Shield,
  LogOut,
  Settings as SettingsIcon,
  ChevronRight,
  Lock,
  Eye,
  EyeOff,
  KeyRound,
} from 'lucide-react';

type MemberType = 'regular' | 'gold' | 'diamond';

type LocalUser = {
  id: string;
  email?: string;
  phone?: string;
  nickname?: string;
  memberType?: MemberType;
  status?: string;
  avatarUrl?: string;
  preferences?: string[];
  plainPassword?: string;
};

type UserCenterPageProps = {
  onNavigate?: (page: string) => void;
};

export default function UserCenterPage({ onNavigate }: UserCenterPageProps) {
  const [user, setUser] = useState<LocalUser | null>(null);
  const [activeTab, setActiveTab] = useState<'profile' | 'security'>('profile');
  const [avatarKeywords, setAvatarKeywords] = useState('');
  const [prefInput, setPrefInput] = useState('');
  const [isGeneratingAvatar, setIsGeneratingAvatar] = useState(false);

  const [showSavedPassword, setShowSavedPassword] = useState(false);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [verifyCode, setVerifyCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [securityMessage, setSecurityMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const isAdmin = useMemo(() => {
    const flag = localStorage.getItem('yiyu_is_admin') ?? sessionStorage.getItem('yiyu_is_admin');
    return flag === 'true' || user?.id === 'admin';
  }, [user?.id]);

  useEffect(() => {
    const load = () => {
      const raw = getSavedUserRaw();
      if (!raw) {
        setUser(null);
        return;
      }
      try {
        const u = JSON.parse(raw);
        setUser(u);
        setAvatarKeywords(u?.nickname || u?.email || '');
      } catch {
        setUser(null);
      }
    };

    load();
    window.addEventListener('storage', load);
    window.addEventListener('yiyu_user_updated', load as any);
    return () => {
      window.removeEventListener('storage', load);
      window.removeEventListener('yiyu_user_updated', load as any);
    };
  }, []);

  const persistUserPatch = (patch: Partial<LocalUser>) => {
    const raw = getSavedUserRaw();
    if (!raw) return;
    let current: any = null;
    try {
      current = JSON.parse(raw);
    } catch {
      return;
    }

    const next = { ...current, ...patch };
    const remember = localStorage.getItem(USER_KEY) != null;
    saveUserRaw(JSON.stringify(next), remember);
    setUser(next);
    window.dispatchEvent(new Event('yiyu_user_updated'));
  };

  const memberBadge = useMemo(() => {
    const t = user?.memberType || 'regular';
    if (t === 'diamond') {
      return { label: '钻石会员', icon: <Shield className="w-4 h-4" />, cls: 'bg-purple-50 text-purple-700 border-purple-100' };
    }
    if (t === 'gold') {
      return { label: '黄金会员', icon: <Crown className="w-4 h-4" />, cls: 'bg-amber-50 text-amber-700 border-amber-100' };
    }
    return { label: '普通会员', icon: <UserIcon className="w-4 h-4" />, cls: 'bg-slate-50 text-slate-700 border-slate-200' };
  }, [user?.memberType]);

  const handleLogout = () => {
    clearUser();
    localStorage.removeItem('yiyu_current_user');
    sessionStorage.removeItem('yiyu_current_user');
    localStorage.removeItem('yiyu_is_admin');
    sessionStorage.removeItem('yiyu_is_admin');
    localStorage.removeItem('yiyu_admin_email');
    sessionStorage.removeItem('yiyu_admin_email');

    window.dispatchEvent(new Event('yiyu_user_updated'));
    if (onNavigate) onNavigate('home');
  };

  const getAuthTarget = () => {
    if (!user) return null;
    if (user.phone) return { channel: 'phone' as const, target: user.phone };
    if (user.email) return { channel: 'email' as const, target: user.email };
    return null;
  };

  const handleSendCode = async () => {
    const auth = getAuthTarget();
    if (!auth) {
      setSecurityMessage({ type: 'error', text: '当前账号缺少邮箱/手机号，无法发送验证码。' });
      return;
    }

    setIsSendingCode(true);
    setSecurityMessage(null);
    const result = await sendVerifyCode(auth.channel, auth.target, 'reset');
    setIsSendingCode(false);

    if (!result.ok) {
      setSecurityMessage({ type: 'error', text: result.error || '验证码发送失败，请稍后重试。' });
      return;
    }

    setSecurityMessage({
      type: 'success',
      text: auth.channel === 'phone' ? '验证码已发送到你的手机号。' : '验证码已发送到你的邮箱。',
    });
  };

  const handleChangePassword = async () => {
    const auth = getAuthTarget();
    if (!auth) {
      setSecurityMessage({ type: 'error', text: '当前账号缺少邮箱/手机号，无法重置密码。' });
      return;
    }
    if (!verifyCode.trim()) {
      setSecurityMessage({ type: 'error', text: '请输入验证码。' });
      return;
    }
    if (newPassword.length < 8) {
      setSecurityMessage({ type: 'error', text: '新密码至少 8 位。' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setSecurityMessage({ type: 'error', text: '两次输入的新密码不一致。' });
      return;
    }

    setIsChangingPassword(true);
    setSecurityMessage(null);
    const result = await resetPasswordByCode({
      channel: auth.channel,
      target: auth.target,
      code: verifyCode.trim(),
      newPassword,
    });
    setIsChangingPassword(false);

    if (!result.ok) {
      setSecurityMessage({ type: 'error', text: result.error || '密码修改失败，请稍后重试。' });
      return;
    }

    persistUserPatch({ plainPassword: newPassword });
    setVerifyCode('');
    setNewPassword('');
    setConfirmPassword('');
    setSecurityMessage({ type: 'success', text: '密码已修改成功。' });
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Header onNavigate={(p) => onNavigate?.(p)} />
        <div className="pt-24 px-6 max-w-3xl mx-auto">
          <div className="bg-white/70 backdrop-blur rounded-3xl border border-border/40 p-10 text-center">
            <p className="text-lg font-semibold mb-2">请先登录</p>
            <p className="text-sm text-muted-foreground/70 mb-6">登录后即可查看个人中心与账号设置</p>
            <button
              className="px-5 py-3 rounded-2xl bg-primary text-primary-foreground font-medium"
              onClick={() => onNavigate?.('login')}
            >
              去登录
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header onNavigate={(p) => onNavigate?.(p)} isLoggedIn={true} userType="member" />

      <div className="pt-24 px-6 pb-16 max-w-5xl mx-auto">
        <div className="bg-white/70 backdrop-blur rounded-3xl border border-border/40 p-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl overflow-hidden border border-border/40 bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white text-xl font-bold">
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                (user.nickname || user.email || '益').slice(0, 1).toUpperCase()
              )}
            </div>
            <div>
              <div className="text-xl font-semibold">{user.nickname || '用户'}</div>
              <div className="text-sm text-muted-foreground/70 break-all">{user.email || user.phone || ''}</div>
              <div className={`inline-flex items-center gap-2 mt-3 px-3 py-1.5 rounded-full border text-xs font-medium ${memberBadge.cls}`}>
                {memberBadge.icon}
                <span>{memberBadge.label}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveTab('security')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl border border-border/50 hover:bg-muted/30 transition"
            >
              <SettingsIcon className="w-4 h-4" />
              <span className="text-sm font-medium">账号设置</span>
            </button>
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-red-50 text-red-700 hover:bg-red-100 transition"
            >
              <LogOut className="w-4 h-4" />
              <span className="text-sm font-medium">退出</span>
            </button>
          </div>
        </div>

        <div className="mt-8 flex items-center gap-2">
          <button
            onClick={() => setActiveTab('profile')}
            className={`px-4 py-2 rounded-2xl text-sm font-medium transition ${activeTab === 'profile' ? 'bg-foreground text-white' : 'bg-white/70 border border-border/40 text-muted-foreground/70 hover:text-foreground'}`}
          >
            个人信息
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`px-4 py-2 rounded-2xl text-sm font-medium transition ${activeTab === 'security' ? 'bg-foreground text-white' : 'bg-white/70 border border-border/40 text-muted-foreground/70 hover:text-foreground'}`}
          >
            账号安全
          </button>
        </div>

        {activeTab === 'profile' ? (
          <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white/70 backdrop-blur rounded-3xl border border-border/40 p-6">
              <h3 className="text-base font-semibold mb-4">账号信息</h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between py-2 border-b border-border/30">
                  <span className="text-muted-foreground/70">昵称</span>
                  <span className="font-medium">{user.nickname || '-'}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-border/30">
                  <span className="text-muted-foreground/70">邮箱</span>
                  <span className="font-medium break-all">{user.email || '-'}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-border/30">
                  <span className="text-muted-foreground/70">手机号</span>
                  <span className="font-medium">{user.phone || '-'}</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-muted-foreground/70">会员等级</span>
                  <span className="font-medium">{memberBadge.label}</span>
                </div>
              </div>
              <div className="mt-6">
                <button
                  className="inline-flex items-center gap-2 text-sm text-primary hover:text-primary/80"
                  onClick={() => setActiveTab('security')}
                >
                  去账号安全
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="bg-white/70 backdrop-blur rounded-3xl border border-border/40 p-6">
              <h3 className="text-base font-semibold mb-4">快捷入口</h3>
              <div className="space-y-2">
                <button
                  className="w-full text-left px-4 py-3 rounded-2xl hover:bg-muted/30 border border-border/30 transition text-sm"
                  onClick={() => onNavigate?.('my-learning')}
                >
                  我的学习
                </button>
                <button
                  className="w-full text-left px-4 py-3 rounded-2xl hover:bg-muted/30 border border-border/30 transition text-sm"
                  onClick={() => onNavigate?.('strategy-companion')}
                >
                  战略陪伴
                </button>
                {isAdmin && (
                  <button
                    className="w-full text-left px-4 py-3 rounded-2xl hover:bg-amber-50 border border-amber-200 text-amber-700 transition text-sm"
                    onClick={() => onNavigate?.('admin')}
                  >
                    后台管理
                  </button>
                )}
              </div>
            </div>

            <div className="lg:col-span-3 bg-white/70 backdrop-blur rounded-3xl border border-border/40 p-6">
              <h3 className="text-base font-semibold mb-4">头像与偏好</h3>

              <div className="flex flex-col sm:flex-row gap-6">
                <div className="shrink-0">
                  <div className="w-24 h-24 rounded-3xl overflow-hidden border border-border/40 bg-white flex items-center justify-center">
                    {user.avatarUrl ? (
                      <img src={user.avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-3xl font-semibold text-slate-600">{(user.nickname || user.email || '益').slice(0, 1).toUpperCase()}</span>
                    )}
                  </div>
                </div>

                <div className="flex-1 space-y-3">
                  <div className="text-sm text-muted-foreground/70">支持上传头像，或输入关键词用 AI 生成（极简风）。</div>

                  <div className="flex flex-wrap items-center gap-3">
                    <label className="px-4 py-2 rounded-2xl border border-border/50 hover:bg-muted/30 transition text-sm cursor-pointer">
                      上传头像
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={async (e) => {
                          const f = e.target.files?.[0];
                          if (!f) return;
                          if (f.size > 2 * 1024 * 1024) {
                            alert('图片过大，建议 ≤ 2MB');
                            return;
                          }
                          const reader = new FileReader();
                          reader.onload = () => {
                            const url = String(reader.result || '');
                            if (url) persistUserPatch({ avatarUrl: url });
                          };
                          reader.readAsDataURL(f);
                        }}
                      />
                    </label>

                    <button
                      className="px-4 py-2 rounded-2xl bg-foreground text-white hover:bg-foreground/90 transition text-sm disabled:opacity-60"
                      disabled={isGeneratingAvatar || !avatarKeywords.trim()}
                      onClick={async () => {
                        try {
                          setIsGeneratingAvatar(true);
                          const dataUrl = await generateAvatarImage({
                            keywords: avatarKeywords.trim(),
                            tags: user.preferences || [],
                          });
                          persistUserPatch({ avatarUrl: dataUrl });
                        } catch (e: any) {
                          alert('AI 生成头像失败：' + (e?.message || String(e)) + '\n\n提示：请先在后台「系统设置」里填写 Hugging Face Token。');
                        } finally {
                          setIsGeneratingAvatar(false);
                        }
                      }}
                    >
                      {isGeneratingAvatar ? '生成中…' : 'AI 生成头像'}
                    </button>

                    {user.avatarUrl && (
                      <button
                        className="px-4 py-2 rounded-2xl bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 transition text-sm"
                        onClick={() => persistUserPatch({ avatarUrl: undefined })}
                      >
                        移除头像
                      </button>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">关键词（用于 AI 生成）</label>
                    <input
                      value={avatarKeywords}
                      onChange={(e) => setAvatarKeywords(e.target.value)}
                      placeholder="例如：极简、专业、理性、蓝紫渐变"
                      className="w-full px-4 py-2 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">偏好标签</label>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {(user.preferences || []).map((t, i) => (
                        <button
                          key={i}
                          type="button"
                          className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs hover:bg-slate-200"
                          onClick={() => {
                            const next = (user.preferences || []).filter((_, idx) => idx !== i);
                            persistUserPatch({ preferences: next });
                          }}
                          title="点击删除"
                        >
                          {t} ×
                        </button>
                      ))}
                    </div>

                    <div className="flex gap-2">
                      <input
                        value={prefInput}
                        onChange={(e) => setPrefInput(e.target.value)}
                        placeholder="回车/点击添加，例如：AI、组织学习、公益"
                        className="flex-1 px-4 py-2 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            const v = prefInput.trim();
                            if (!v) return;
                            const next = Array.from(new Set([...(user.preferences || []), v])).slice(0, 12);
                            persistUserPatch({ preferences: next });
                            setPrefInput('');
                          }
                        }}
                      />
                      <button
                        type="button"
                        className="px-4 py-2 rounded-2xl border border-border/50 hover:bg-muted/30 transition text-sm"
                        onClick={() => {
                          const v = prefInput.trim();
                          if (!v) return;
                          const next = Array.from(new Set([...(user.preferences || []), v])).slice(0, 12);
                          persistUserPatch({ preferences: next });
                          setPrefInput('');
                        }}
                      >
                        添加
                      </button>
                    </div>
                    <div className="text-[11px] text-muted-foreground/70 mt-2">这些标签会作为 AI 生成头像/后续订阅推荐的偏好输入。</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-6 bg-white/70 backdrop-blur rounded-3xl border border-border/40 p-6 md:p-8">
            <h3 className="text-base font-semibold mb-5">密码与安全</h3>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="rounded-2xl border border-border/40 p-5 bg-white/80">
                <div className="flex items-center gap-2 text-sm font-medium mb-3">
                  <KeyRound className="w-4 h-4" />
                  已存密码（当前会话）
                </div>

                <div className="text-xs text-muted-foreground/70 mb-3">
                  这里展示的是当前账号在本机会话保存的密码；若为空，先完成一次“修改密码”后会显示。
                </div>

                <div className="flex items-center gap-2 rounded-xl border border-border/40 px-3 py-2 bg-muted/20">
                  <span className="text-sm font-mono flex-1">
                    {user.plainPassword ? (showSavedPassword ? user.plainPassword : '•'.repeat(Math.max(8, user.plainPassword.length))) : '未保存'}
                  </span>
                  <button
                    type="button"
                    className="p-1.5 rounded-lg hover:bg-muted/40"
                    onClick={() => setShowSavedPassword((v) => !v)}
                    disabled={!user.plainPassword}
                  >
                    {showSavedPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-border/40 p-5 bg-white/80">
                <div className="flex items-center gap-2 text-sm font-medium mb-3">
                  <Lock className="w-4 h-4" />
                  修改密码
                </div>

                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={handleSendCode}
                    disabled={isSendingCode}
                    className="w-full px-4 py-2 rounded-xl border border-border/50 hover:bg-muted/30 text-sm disabled:opacity-60"
                  >
                    {isSendingCode ? '发送中…' : '发送验证码'}
                  </button>

                  <input
                    value={verifyCode}
                    onChange={(e) => setVerifyCode(e.target.value)}
                    placeholder="验证码"
                    className="w-full px-3 py-2 rounded-xl border border-border/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />

                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="新密码（至少8位）"
                    className="w-full px-3 py-2 rounded-xl border border-border/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />

                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="确认新密码"
                    className="w-full px-3 py-2 rounded-xl border border-border/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />

                  <button
                    type="button"
                    onClick={handleChangePassword}
                    disabled={isChangingPassword}
                    className="w-full px-4 py-2 rounded-xl bg-foreground text-white hover:bg-foreground/90 text-sm disabled:opacity-60"
                  >
                    {isChangingPassword ? '提交中…' : '确认修改密码'}
                  </button>
                </div>

                {securityMessage && (
                  <div className={`mt-3 text-xs px-3 py-2 rounded-xl ${securityMessage.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
                    {securityMessage.text}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
