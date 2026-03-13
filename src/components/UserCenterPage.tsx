import { useEffect, useMemo, useState, type ChangeEvent } from 'react';
import { Header } from './Header';
import { AUTH_TOKEN_KEY, clearUser, getSavedUserRaw, saveUserRaw, USER_KEY } from '../lib/storage';
import {
  bindCurrentContact,
  changeCurrentPassword,
  deactivateCurrentAccount,
  fetchCurrentProfile,
  normalizeLoginUser,
  sendVerifyCode,
  updateCurrentProfile,
} from '../lib/authApi';
import { redeemInviteCodeApi } from '../lib/inviteCodeApi';
import {
  User as UserIcon,
  Crown,
  Eye,
  EyeOff,
  KeyRound,
  Mail,
  ShieldAlert,
  Smartphone,
} from 'lucide-react';

type MemberType = 'regular' | 'gold' | 'diamond';

type LocalUser = {
  id: string;
  email?: string;
  phone?: string;
  nickname?: string;
  avatar?: string;
  avatarUrl?: string;
  memberType?: MemberType;
  adminRole?: 'admin';
  status?: string;
  plainPassword?: string;
  paidSource?: 'manual' | 'invite_code' | 'payment' | 'strategy_client';
  paidStartedAt?: string;
  paidExpiresAt?: string;
  paidNote?: string;
  strategyProjectId?: string;
  strategyBoundAt?: string;
  strategyAccessSource?: string;
  strategyProjectName?: string;
};

type UserCenterPageProps = {
  onNavigate?: (page: string) => void;
};

type ContactChannel = 'phone' | 'email';
type SecurityPanel = 'password' | 'phone' | 'email' | 'deactivate' | null;

type BindingFormState = {
  target: string;
  code: string;
  currentPassword: string;
};

type DeactivateFormState = {
  channel: ContactChannel;
  code: string;
  currentPassword: string;
};

function rememberMode() {
  return localStorage.getItem(USER_KEY) != null || localStorage.getItem(AUTH_TOKEN_KEY) != null;
}

function sanitizeDisplayEmail(email?: string) {
  if (!email || email.endsWith('@phone.local')) return '';
  return email;
}

function hasEmailBinding(email?: string) {
  return Boolean(sanitizeDisplayEmail(email));
}

function hasPhoneBinding(phone?: string) {
  return Boolean(phone?.trim());
}

function maskEmail(email?: string) {
  const value = sanitizeDisplayEmail(email);
  if (!value) return '未绑定';
  const [name, domain] = value.split('@');
  if (!name || !domain) return value;
  if (name.length <= 2) return `${name[0] || ''}***@${domain}`;
  return `${name.slice(0, 2)}***@${domain}`;
}

function maskPhone(phone?: string) {
  const value = String(phone || '').trim();
  if (!value) return '未绑定';
  if (value.length !== 11) return value;
  return `${value.slice(0, 3)}****${value.slice(-4)}`;
}

function getBoundTarget(user: LocalUser | null, channel: ContactChannel) {
  if (!user) return '';
  if (channel === 'phone') return user.phone || '';
  return sanitizeDisplayEmail(user.email);
}

function getAvailableAuthChannels(user: LocalUser | null) {
  const channels: ContactChannel[] = [];
  if (hasPhoneBinding(user?.phone)) channels.push('phone');
  if (hasEmailBinding(user?.email)) channels.push('email');
  return channels;
}

function getSecurityHint(user: LocalUser | null) {
  const channels = getAvailableAuthChannels(user);
  if (channels.length === 2) {
    return '当前账号已同时绑定手机号和邮箱，二者共用同一个密码。';
  }
  if (channels[0] === 'phone') {
    return '当前账号通过绑定手机号接收验证码；后续若再绑定邮箱，二者仍共用同一个密码。';
  }
  if (channels[0] === 'email') {
    return '当前账号通过绑定邮箱接收验证码；后续若再绑定手机号，二者仍共用同一个密码。';
  }
  return '当前账号尚未绑定可用的手机号或邮箱。';
}

export default function UserCenterPage({ onNavigate }: UserCenterPageProps) {
  const [user, setUser] = useState<LocalUser | null>(null);
  const [nickname, setNickname] = useState('');
  const [avatarPreview, setAvatarPreview] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [inviteCodeInput, setInviteCodeInput] = useState('');
  const [isRedeemingInvite, setIsRedeemingInvite] = useState(false);
  const [inviteMessage, setInviteMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [bindingForms, setBindingForms] = useState<Record<ContactChannel, BindingFormState>>({
    email: { target: '', code: '', currentPassword: '' },
    phone: { target: '', code: '', currentPassword: '' },
  });
  const [bindingMessage, setBindingMessage] = useState<Record<ContactChannel, { type: 'success' | 'error'; text: string } | null>>({
    email: null,
    phone: null,
  });
  const [sendingBindingCode, setSendingBindingCode] = useState<ContactChannel | null>(null);
  const [submittingBinding, setSubmittingBinding] = useState<ContactChannel | null>(null);
  const [showSavedPassword, setShowSavedPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [securityMessage, setSecurityMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [activePanel, setActivePanel] = useState<SecurityPanel>(null);
  const [deactivateForm, setDeactivateForm] = useState<DeactivateFormState>({
    channel: 'phone',
    code: '',
    currentPassword: '',
  });
  const [deactivateMessage, setDeactivateMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [sendingDeactivateCode, setSendingDeactivateCode] = useState(false);
  const [submittingDeactivate, setSubmittingDeactivate] = useState(false);

  const isAdmin = useMemo(() => {
    const flag = localStorage.getItem('yiyu_is_admin') ?? sessionStorage.getItem('yiyu_is_admin');
    return flag === 'true' || user?.adminRole === 'admin' || user?.id === 'admin';
  }, [user?.adminRole, user?.id]);

  const memberBadge = useMemo(() => {
    const t = user?.memberType || 'regular';
    if (t === 'gold' || t === 'diamond') {
      return { label: '付费会员', icon: <Crown className="w-4 h-4" />, cls: 'bg-amber-50 text-amber-700 border-amber-100' };
    }
    return { label: '普通会员', icon: <UserIcon className="w-4 h-4" />, cls: 'bg-slate-50 text-slate-700 border-slate-200' };
  }, [user?.memberType]);

  const authChannels = useMemo(() => getAvailableAuthChannels(user), [user]);

  const persistUser = (next: LocalUser) => {
    saveUserRaw(JSON.stringify(next), rememberMode());
    setUser(next);
    setNickname(next.nickname || '');
    setAvatarPreview(next.avatarUrl || next.avatar || '');
    window.dispatchEvent(new Event('yiyu_user_updated'));
  };

  useEffect(() => {
    const loadFromStorage = () => {
      const raw = getSavedUserRaw();
      if (!raw) {
        setUser(null);
        setNickname('');
        setAvatarPreview('');
        return;
      }
      try {
        const parsed = JSON.parse(raw);
        setUser(parsed);
        setNickname(parsed?.nickname || '');
        setAvatarPreview(parsed?.avatarUrl || parsed?.avatar || '');
      } catch {
        setUser(null);
        setNickname('');
        setAvatarPreview('');
      }
    };

    loadFromStorage();
    window.addEventListener('storage', loadFromStorage);
    window.addEventListener('yiyu_user_updated', loadFromStorage as EventListener);
    return () => {
      window.removeEventListener('storage', loadFromStorage);
      window.removeEventListener('yiyu_user_updated', loadFromStorage as EventListener);
    };
  }, []);

  useEffect(() => {
    let canceled = false;

    const syncFromCloud = async () => {
      if (!getSavedUserRaw()) return;
      const result = await fetchCurrentProfile();
      if (canceled || !result.ok || !result.data?.user) return;

      const raw = getSavedUserRaw();
      let plainPassword = '';
      if (raw) {
        try {
          plainPassword = JSON.parse(raw)?.plainPassword || '';
        } catch {}
      }

      const nextUser = {
        ...normalizeLoginUser(result.data.user),
        plainPassword: plainPassword || undefined,
      } as LocalUser;
      persistUser(nextUser);
    };

    void syncFromCloud();
    return () => {
      canceled = true;
    };
  }, []);

  useEffect(() => {
    if (user && isAdmin) {
      onNavigate?.('admin');
    }
  }, [isAdmin, onNavigate, user]);

  useEffect(() => {
    if (!user) return;
    setBindingForms({
      email: {
        target: getBoundTarget(user, 'email'),
        code: '',
        currentPassword: '',
      },
      phone: {
        target: getBoundTarget(user, 'phone'),
        code: '',
        currentPassword: '',
      },
    });
  }, [user?.email, user?.phone]);

  useEffect(() => {
    if (!authChannels.length) return;
    setDeactivateForm((prev) => ({
      ...prev,
      channel: authChannels.includes(prev.channel) ? prev.channel : authChannels[0],
    }));
  }, [authChannels]);

  const handleAvatarChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 1024 * 1024) {
      setProfileMessage({ type: 'error', text: '头像图片过大，建议控制在 1MB 以内。' });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      if (!result) return;
      setAvatarPreview(result);
      setProfileMessage(null);
    };
    reader.readAsDataURL(f);
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    const trimmedNickname = nickname.trim();
    if (!trimmedNickname) {
      setProfileMessage({ type: 'error', text: '昵称不能为空。' });
      return;
    }
    setIsSavingProfile(true);
    setProfileMessage(null);
    const result = await updateCurrentProfile({
      nickname: trimmedNickname,
      avatarUrl: avatarPreview || null,
    });
    setIsSavingProfile(false);

    if (!result.ok || !result.data?.user) {
      setProfileMessage({ type: 'error', text: result.error || '资料保存失败，请稍后重试。' });
      return;
    }

    const nextUser = {
      ...normalizeLoginUser(result.data.user),
      plainPassword: user.plainPassword,
    } as LocalUser;
    persistUser(nextUser);
    setProfileMessage({ type: 'success', text: result.message || '个人资料已保存。' });
  };

  const updateBindingForm = (channel: ContactChannel, field: keyof BindingFormState, value: string) => {
    setBindingForms((prev) => ({
      ...prev,
      [channel]: {
        ...prev[channel],
        [field]: value,
      },
    }));
    setBindingMessage((prev) => ({ ...prev, [channel]: null }));
  };

  const normalizeBindingTarget = (channel: ContactChannel, value: string) => {
    const trimmed = value.trim();
    return channel === 'email' ? trimmed.toLowerCase() : trimmed;
  };

  const validateBindingTarget = (channel: ContactChannel, value: string) => {
    if (channel === 'email') {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    }
    return /^1[3-9]\d{9}$/.test(value);
  };

  const handleSendBindingCode = async (channel: ContactChannel) => {
    if (!user) return;
    const target = normalizeBindingTarget(channel, bindingForms[channel].target);
    const currentTarget = getBoundTarget(user, channel);

    if (!validateBindingTarget(channel, target)) {
      setBindingMessage((prev) => ({
        ...prev,
        [channel]: {
          type: 'error',
          text: channel === 'email' ? '请输入正确的邮箱地址。' : '请输入正确的手机号码。',
        },
      }));
      return;
    }

    if (target === currentTarget) {
      setBindingMessage((prev) => ({
        ...prev,
        [channel]: {
          type: 'error',
          text: channel === 'email' ? '该邮箱已绑定当前账号。' : '该手机号已绑定当前账号。',
        },
      }));
      return;
    }

    setSendingBindingCode(channel);
    setBindingMessage((prev) => ({ ...prev, [channel]: null }));
    const result = await sendVerifyCode(channel, target, 'bind', { withAuth: true });
    setSendingBindingCode(null);

    if (!result.ok) {
      setBindingMessage((prev) => ({
        ...prev,
        [channel]: {
          type: 'error',
          text: result.error || '验证码发送失败，请稍后重试。',
        },
      }));
      return;
    }

    setBindingMessage((prev) => ({
      ...prev,
      [channel]: {
        type: 'success',
        text: channel === 'email' ? '验证码已发送到新邮箱。' : '验证码已发送到新手机号。',
      },
    }));
  };

  const handleSubmitBinding = async (channel: ContactChannel) => {
    if (!user) return;
    const form = bindingForms[channel];
    const target = normalizeBindingTarget(channel, form.target);

    if (!validateBindingTarget(channel, target)) {
      setBindingMessage((prev) => ({
        ...prev,
        [channel]: {
          type: 'error',
          text: channel === 'email' ? '请输入正确的邮箱地址。' : '请输入正确的手机号码。',
        },
      }));
      return;
    }
    if (!form.code.trim()) {
      setBindingMessage((prev) => ({
        ...prev,
        [channel]: { type: 'error', text: '请输入验证码。' },
      }));
      return;
    }
    if (!form.currentPassword) {
      setBindingMessage((prev) => ({
        ...prev,
        [channel]: { type: 'error', text: '请输入当前密码。' },
      }));
      return;
    }

    setSubmittingBinding(channel);
    setBindingMessage((prev) => ({ ...prev, [channel]: null }));
    const result = await bindCurrentContact({
      channel,
      target,
      code: form.code.trim(),
      currentPassword: form.currentPassword,
    });
    setSubmittingBinding(null);

    if (!result.ok || !result.data?.user) {
      setBindingMessage((prev) => ({
        ...prev,
        [channel]: {
          type: 'error',
          text: result.error || '绑定失败，请稍后重试。',
        },
      }));
      return;
    }

    const nextUser = {
      ...normalizeLoginUser(result.data.user),
      plainPassword: user.plainPassword,
    } as LocalUser;
    persistUser(nextUser);
    setBindingMessage((prev) => ({
      ...prev,
      [channel]: {
        type: 'success',
        text: result.message || (channel === 'email' ? '邮箱已绑定成功。' : '手机号已绑定成功。'),
      },
    }));
    setActivePanel(null);
  };

  const handleChangePassword = async () => {
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
    const result = await changeCurrentPassword({
      newPassword,
    });
    setIsChangingPassword(false);

    if (!result.ok || !result.data?.user) {
      setSecurityMessage({ type: 'error', text: result.error || '密码修改失败，请稍后重试。' });
      return;
    }

    const nextUser = {
      ...normalizeLoginUser(result.data.user),
      plainPassword: newPassword,
    } as LocalUser;
    persistUser(nextUser);
    setNewPassword('');
    setConfirmPassword('');
    setSecurityMessage({ type: 'success', text: result.message || '密码已修改成功。' });
    setActivePanel(null);
  };

  const handleRedeemInviteCode = async () => {
    if (!user) return;
    const code = inviteCodeInput.trim().toUpperCase();
    if (!code) {
      setInviteMessage({ type: 'error', text: '请输入邀请码。' });
      return;
    }

    setIsRedeemingInvite(true);
    setInviteMessage(null);
    const result = await redeemInviteCodeApi(code);
    setIsRedeemingInvite(false);

    if (!result.ok || !result.data?.user) {
      setInviteMessage({ type: 'error', text: result.error || '邀请码兑换失败，请稍后重试。' });
      return;
    }

    const nextUser = {
      ...normalizeLoginUser(result.data.user),
      plainPassword: user.plainPassword,
    } as LocalUser;
    persistUser(nextUser);
    setInviteCodeInput('');
    setInviteMessage({ type: 'success', text: result.message || '邀请码兑换成功。' });
  };

  const handleSendDeactivateCode = async () => {
    const target = getBoundTarget(user, deactivateForm.channel);
    if (!target) {
      setDeactivateMessage({ type: 'error', text: deactivateForm.channel === 'phone' ? '当前账号未绑定手机号。' : '当前账号未绑定邮箱。' });
      return;
    }

    setSendingDeactivateCode(true);
    setDeactivateMessage(null);
    const result = await sendVerifyCode(deactivateForm.channel, target, 'deactivate', { withAuth: true });
    setSendingDeactivateCode(false);

    if (!result.ok) {
      setDeactivateMessage({ type: 'error', text: result.error || '验证码发送失败，请稍后重试。' });
      return;
    }

    setDeactivateMessage({
      type: 'success',
      text: deactivateForm.channel === 'phone' ? '验证码已发送到绑定手机号。' : '验证码已发送到绑定邮箱。',
    });
  };

  const handleDeactivateAccount = async () => {
    if (!deactivateForm.code.trim()) {
      setDeactivateMessage({ type: 'error', text: '请输入验证码。' });
      return;
    }
    if (!deactivateForm.currentPassword) {
      setDeactivateMessage({ type: 'error', text: '请输入当前密码。' });
      return;
    }

    const confirmed = window.confirm('注销后，当前账号的所有绑定方式都会被解除，系统会立即退出登录，且无法再通过手机号或邮箱登录或找回密码。确定继续吗？');
    if (!confirmed) return;

    setSubmittingDeactivate(true);
    setDeactivateMessage(null);
    const result = await deactivateCurrentAccount({
      channel: deactivateForm.channel,
      code: deactivateForm.code.trim(),
      currentPassword: deactivateForm.currentPassword,
    });
    setSubmittingDeactivate(false);

    if (!result.ok) {
      setDeactivateMessage({ type: 'error', text: result.error || '注销失败，请稍后重试。' });
      return;
    }

    clearUser();
    window.dispatchEvent(new Event('yiyu_user_updated'));
    window.alert('账号已注销。');
    onNavigate?.('home');
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Header onNavigate={(p) => onNavigate?.(p)} />
        <div className="pt-24 px-6 max-w-3xl mx-auto">
          <div className="bg-white/70 backdrop-blur rounded-3xl border border-border/40 p-10 text-center">
            <p className="text-lg font-semibold mb-2">请先登录</p>
            <p className="text-sm text-muted-foreground/70 mb-6">登录后即可查看个人中心。</p>
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

  if (isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <Header onNavigate={(p) => onNavigate?.(p)} isLoggedIn={true} userType="member" />
        <div className="pt-24 px-6 max-w-3xl mx-auto">
          <div className="bg-white/70 backdrop-blur rounded-3xl border border-border/40 p-10 text-center">
            <p className="text-lg font-semibold mb-2">正在进入后台管理</p>
            <p className="text-sm text-muted-foreground/70">管理员账号不单独提供个人资料页。</p>
          </div>
        </div>
      </div>
    );
  }

  const paidActive = user.memberType === 'gold' || user.memberType === 'diamond';
  const expireText = user.paidExpiresAt
    ? new Date(user.paidExpiresAt).toLocaleDateString('zh-CN')
    : paidActive
      ? '长期有效'
      : '未开通';
  const securityHint = getSecurityHint(user);

  return (
    <div className="min-h-screen bg-background">
      <Header onNavigate={(p) => onNavigate?.(p)} isLoggedIn={true} userType="member" />

      <div className="pt-24 px-6 pb-16 max-w-5xl mx-auto space-y-6">
        <section className="bg-white/70 backdrop-blur rounded-3xl border border-border/40 p-6 md:p-8">
          <div>
            <h2 className="text-lg font-semibold text-foreground">个人资料</h2>
            <p className="text-sm text-muted-foreground/70 mt-1">这里只保留当前账号真正需要维护的信息：头像、昵称与会员状态。</p>
          </div>

          <div className="mt-6 grid grid-cols-1 lg:grid-cols-[220px,1fr] gap-8">
            <div className="space-y-4">
              <div className="w-36 h-36 rounded-[32px] overflow-hidden border border-border/40 bg-white flex items-center justify-center text-3xl font-semibold text-slate-600">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="头像预览" className="w-full h-full object-cover" />
                ) : (
                  (user.nickname || user.phone || '益').slice(0, 1).toUpperCase()
                )}
              </div>

              <div className="space-y-2">
                <label className="block">
                  <span className="sr-only">上传头像</span>
                  <span className="inline-flex w-full justify-center px-4 py-2 rounded-2xl border border-border/50 hover:bg-muted/30 transition text-sm cursor-pointer">
                    上传头像
                  </span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                </label>
                {avatarPreview && (
                  <button
                    type="button"
                    className="w-full px-4 py-2 rounded-2xl bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 transition text-sm"
                    onClick={() => setAvatarPreview('')}
                  >
                    移除头像
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">昵称</label>
                <input
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="请输入昵称"
                  className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="rounded-2xl border border-border/40 bg-white/80 p-4">
                  <div className="text-xs text-muted-foreground/70 mb-2">当前身份</div>
                  <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium ${memberBadge.cls}`}>
                    {memberBadge.icon}
                    <span>{memberBadge.label}</span>
                  </div>
                </div>
                <div className="rounded-2xl border border-border/40 bg-white/80 p-4">
                  <div className="text-xs text-muted-foreground/70 mb-2">付费到期时间</div>
                  <div className="font-medium">{expireText}</div>
                </div>
                <div className="rounded-2xl border border-border/40 bg-white/80 p-4">
                  <div className="text-xs text-muted-foreground/70 mb-2">战略陪伴</div>
                  <div className="font-medium">{user.strategyProjectName || '未绑定机构'}</div>
                </div>
              </div>

              {profileMessage && (
                <div className={`text-sm px-4 py-3 rounded-2xl ${profileMessage.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
                  {profileMessage.text}
                </div>
              )}

              <div className="rounded-2xl border border-border/40 bg-white/80 p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <div className="text-sm font-medium text-foreground">兑换邀请码</div>
                    <p className="text-xs text-muted-foreground/70 mt-1">可用于开通付费会员或绑定机构战略陪伴。</p>
                  </div>
                  <div className="flex w-full max-w-xl gap-3">
                    <input
                      value={inviteCodeInput}
                      onChange={(e) => {
                        setInviteCodeInput(e.target.value.toUpperCase());
                        setInviteMessage(null);
                      }}
                      placeholder="输入邀请码"
                      className="flex-1 px-4 py-3 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                    <button
                      type="button"
                      onClick={handleRedeemInviteCode}
                      disabled={isRedeemingInvite}
                      className="px-5 py-3 rounded-2xl border border-border/50 hover:bg-muted/30 text-sm disabled:opacity-60"
                    >
                      {isRedeemingInvite ? '兑换中…' : '确认兑换'}
                    </button>
                  </div>
                </div>

                {inviteMessage && (
                  <div className={`mt-3 text-sm px-4 py-3 rounded-2xl ${inviteMessage.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
                    {inviteMessage.text}
                  </div>
                )}
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleSaveProfile}
                  disabled={isSavingProfile}
                  className="px-5 py-3 rounded-2xl bg-foreground text-white hover:bg-foreground/90 text-sm disabled:opacity-60"
                >
                  {isSavingProfile ? '保存中…' : '保存资料'}
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white/70 backdrop-blur rounded-3xl border border-border/40 p-6 md:p-8">
          <div>
            <h2 className="text-lg font-semibold text-foreground">账号安全</h2>
            <p className="text-sm text-muted-foreground/70 mt-1">{securityHint}</p>
          </div>

          <div className="mt-6 space-y-4">
            <div className="rounded-2xl border border-border/40 bg-white/80 p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <KeyRound className="w-4 h-4" />
                    原密码
                  </div>
                  <div className="mt-3 flex items-center gap-2 rounded-xl border border-border/40 px-3 py-2 bg-muted/20">
                    <span className="text-sm font-mono flex-1">
                      {user.plainPassword ? (showSavedPassword ? user.plainPassword : '•'.repeat(Math.max(8, user.plainPassword.length))) : '当前会话未保存'}
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

                <button
                  type="button"
                  onClick={() => {
                    setSecurityMessage(null);
                    setActivePanel((prev) => (prev === 'password' ? null : 'password'));
                  }}
                  className="px-4 py-2 rounded-xl border border-border/50 hover:bg-muted/30 text-sm"
                >
                  {activePanel === 'password' ? '收起' : '修改密码'}
                </button>
              </div>

              {activePanel === 'password' && (
                <div className="mt-5 border-t border-border/40 pt-5 space-y-3">
                  <p className="text-sm text-muted-foreground/80">
                    当前已处于登录状态，直接提交新密码即可生效；密码修改后会立即同步到云端账号。
                  </p>

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
                    className="px-4 py-2 rounded-xl bg-foreground text-white hover:bg-foreground/90 text-sm disabled:opacity-60"
                  >
                    {isChangingPassword ? '提交中…' : '确认修改密码'}
                  </button>

                  {securityMessage && (
                    <div className={`text-xs px-3 py-2 rounded-xl ${securityMessage.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
                      {securityMessage.text}
                    </div>
                  )}
                </div>
              )}
            </div>

            {([
              {
                channel: 'phone' as ContactChannel,
                title: '手机号',
                icon: Smartphone,
                value: maskPhone(user.phone),
                actionLabel: hasPhoneBinding(user.phone) ? '更换' : '绑定',
                targetPlaceholder: hasPhoneBinding(user.phone) ? '请输入新的手机号码' : '请输入要绑定的手机号码',
                successText: '验证码将发送到新手机号。',
              },
              {
                channel: 'email' as ContactChannel,
                title: '邮箱',
                icon: Mail,
                value: maskEmail(user.email),
                actionLabel: hasEmailBinding(user.email) ? '更换' : '绑定',
                targetPlaceholder: hasEmailBinding(user.email) ? '请输入新的邮箱地址' : '请输入要绑定的邮箱地址',
                successText: '验证码将发送到新邮箱。',
              },
            ]).map((item) => (
              <div key={item.channel} className="rounded-2xl border border-border/40 bg-white/80 p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                      <item.icon className="w-4 h-4" />
                      {item.title}
                    </div>
                    <div className="mt-2 text-sm text-foreground">{item.value}</div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setBindingMessage((prev) => ({ ...prev, [item.channel]: null }));
                      setActivePanel((prev) => (prev === item.channel ? null : item.channel));
                    }}
                    className="px-4 py-2 rounded-xl border border-border/50 hover:bg-muted/30 text-sm"
                  >
                    {activePanel === item.channel ? '收起' : item.actionLabel}
                  </button>
                </div>

                {activePanel === item.channel && (
                  <div className="mt-5 border-t border-border/40 pt-5 space-y-3">
                    <input
                      type={item.channel === 'email' ? 'email' : 'tel'}
                      value={bindingForms[item.channel].target}
                      onChange={(e) => updateBindingForm(item.channel, 'target', e.target.value)}
                      placeholder={item.targetPlaceholder}
                      className="w-full px-3 py-2 rounded-xl border border-border/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />

                    <div className="flex gap-3">
                      <input
                        value={bindingForms[item.channel].code}
                        onChange={(e) => updateBindingForm(item.channel, 'code', e.target.value)}
                        placeholder="验证码"
                        className="flex-1 px-3 py-2 rounded-xl border border-border/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                      <button
                        type="button"
                        onClick={() => handleSendBindingCode(item.channel)}
                        disabled={sendingBindingCode === item.channel}
                        className="px-4 py-2 rounded-xl border border-border/50 hover:bg-muted/30 text-sm disabled:opacity-60"
                      >
                        {sendingBindingCode === item.channel ? '发送中…' : '发送验证码'}
                      </button>
                    </div>

                    <input
                      type="password"
                      value={bindingForms[item.channel].currentPassword}
                      onChange={(e) => updateBindingForm(item.channel, 'currentPassword', e.target.value)}
                      placeholder="请输入当前密码"
                      className="w-full px-3 py-2 rounded-xl border border-border/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />

                    <button
                      type="button"
                      onClick={() => handleSubmitBinding(item.channel)}
                      disabled={submittingBinding === item.channel}
                      className="px-4 py-2 rounded-xl bg-foreground text-white hover:bg-foreground/90 text-sm disabled:opacity-60"
                    >
                      {submittingBinding === item.channel ? '提交中…' : item.actionLabel}
                    </button>

                    <p className="text-xs text-muted-foreground/70">{item.successText}</p>

                    {bindingMessage[item.channel] && (
                      <div className={`text-xs px-3 py-2 rounded-xl ${
                        bindingMessage[item.channel]?.type === 'success'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                          : 'bg-red-50 text-red-700 border border-red-100'
                      }`}>
                        {bindingMessage[item.channel]?.text}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        <section className="bg-white/70 backdrop-blur rounded-3xl border border-red-100 p-6 md:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2 text-base font-semibold text-red-700">
                <ShieldAlert className="w-5 h-5" />
                注销账号
              </div>
              <p className="mt-2 text-sm text-red-700/80">
                注销后，当前账号的所有绑定方式都会被解除，系统会立即退出登录，之后无法再通过手机号或邮箱登录或找回密码。
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setDeactivateMessage(null);
                setActivePanel((prev) => (prev === 'deactivate' ? null : 'deactivate'));
              }}
              className="px-4 py-2 rounded-xl bg-red-600 text-white hover:bg-red-700 text-sm"
            >
              {activePanel === 'deactivate' ? '收起' : '注销账号'}
            </button>
          </div>

          {activePanel === 'deactivate' && (
            <div className="mt-5 border-t border-red-100 pt-5 space-y-3">
              {authChannels.length > 1 && (
                <div>
                  <div className="text-sm font-medium text-foreground mb-2">选择验证方式</div>
                  <div className="flex gap-2">
                    {authChannels.map((channel) => (
                      <button
                        key={channel}
                        type="button"
                        onClick={() => {
                          setDeactivateForm((prev) => ({ ...prev, channel }));
                          setDeactivateMessage(null);
                        }}
                        className={`px-4 py-2 rounded-xl border text-sm ${
                          deactivateForm.channel === channel
                            ? 'border-red-200 bg-red-50 text-red-700'
                            : 'border-border/50 hover:bg-muted/30'
                        }`}
                      >
                        {channel === 'phone' ? '手机号' : '邮箱'}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="text-sm text-muted-foreground/80">
                验证码将发送到{deactivateForm.channel === 'phone' ? '绑定手机号' : '绑定邮箱'}。
              </div>

              <div className="flex gap-3">
                <input
                  value={deactivateForm.code}
                  onChange={(e) => {
                    setDeactivateForm((prev) => ({ ...prev, code: e.target.value }));
                    setDeactivateMessage(null);
                  }}
                  placeholder="验证码"
                  className="flex-1 px-3 py-2 rounded-xl border border-red-100 bg-white focus:outline-none focus:ring-2 focus:ring-red-100"
                />
                <button
                  type="button"
                  onClick={handleSendDeactivateCode}
                  disabled={sendingDeactivateCode}
                  className="px-4 py-2 rounded-xl border border-red-200 hover:bg-red-100 text-sm text-red-700 disabled:opacity-60"
                >
                  {sendingDeactivateCode ? '发送中…' : '发送验证码'}
                </button>
              </div>

              <input
                type="password"
                value={deactivateForm.currentPassword}
                onChange={(e) => {
                  setDeactivateForm((prev) => ({ ...prev, currentPassword: e.target.value }));
                  setDeactivateMessage(null);
                }}
                placeholder="请输入当前密码"
                className="w-full px-3 py-2 rounded-xl border border-red-100 bg-white focus:outline-none focus:ring-2 focus:ring-red-100"
              />

              <button
                type="button"
                onClick={handleDeactivateAccount}
                disabled={submittingDeactivate || !authChannels.length}
                className="px-4 py-2 rounded-xl bg-red-600 text-white hover:bg-red-700 text-sm disabled:opacity-60"
              >
                {submittingDeactivate ? '提交中…' : '确认注销账号'}
              </button>

              {deactivateMessage && (
                <div className={`text-xs px-3 py-2 rounded-xl ${
                  deactivateMessage.type === 'success'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                    : 'bg-red-100 text-red-700 border border-red-200'
                }`}>
                  {deactivateMessage.text}
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
