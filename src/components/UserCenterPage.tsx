import { useEffect, useMemo, useState, type ChangeEvent } from 'react';
import { Header } from './Header';
import { AUTH_TOKEN_KEY, clearUser, getSavedUserRaw, saveUserRaw, USER_KEY } from '../lib/storage';
import {
  bindCurrentContact,
  fetchCurrentProfile,
  normalizeLoginUser,
  resetPasswordByCode,
  sendVerifyCode,
  unbindCurrentContact,
  updateCurrentProfile,
} from '../lib/authApi';
import {
  User as UserIcon,
  Crown,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Mail,
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
};

type UserCenterPageProps = {
  onNavigate?: (page: string) => void;
};

type ContactChannel = 'phone' | 'email';

type BindingFormState = {
  target: string;
  code: string;
  currentPassword: string;
};

type UnbindFormState = {
  code: string;
  currentPassword: string;
};

function rememberMode() {
  return localStorage.getItem(USER_KEY) != null || localStorage.getItem(AUTH_TOKEN_KEY) != null;
}

function sanitizeDisplayEmail(email?: string) {
  if (!email || email.endsWith('@phone.local')) return '-';
  return email;
}

function hasEmailBinding(email?: string) {
  return Boolean(email && !email.endsWith('@phone.local'));
}

function hasPhoneBinding(phone?: string) {
  return Boolean(phone?.trim());
}

function getLoginMethodLabel(email?: string, phone?: string) {
  const emailBound = hasEmailBinding(email);
  const phoneBound = hasPhoneBinding(phone);

  if (emailBound && phoneBound) return '手机号 + 邮箱';
  if (phoneBound) return '手机号';
  if (emailBound) return '邮箱';
  return '未绑定';
}

export default function UserCenterPage({ onNavigate }: UserCenterPageProps) {
  const [user, setUser] = useState<LocalUser | null>(null);
  const [nickname, setNickname] = useState('');
  const [avatarPreview, setAvatarPreview] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
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
  const [unbindForms, setUnbindForms] = useState<Record<ContactChannel, UnbindFormState>>({
    email: { code: '', currentPassword: '' },
    phone: { code: '', currentPassword: '' },
  });
  const [unbindMessage, setUnbindMessage] = useState<Record<ContactChannel, { type: 'success' | 'error'; text: string } | null>>({
    email: null,
    phone: null,
  });
  const [sendingUnbindCode, setSendingUnbindCode] = useState<ContactChannel | null>(null);
  const [submittingUnbind, setSubmittingUnbind] = useState<ContactChannel | null>(null);

  const [showSavedPassword, setShowSavedPassword] = useState(false);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [verifyCode, setVerifyCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [securityMessage, setSecurityMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

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
        target: hasEmailBinding(user.email) ? String(user.email || '') : '',
        code: '',
        currentPassword: '',
      },
      phone: {
        target: user.phone || '',
        code: '',
        currentPassword: '',
      },
    });
    setUnbindForms({
      email: { code: '', currentPassword: '' },
      phone: { code: '', currentPassword: '' },
    });
  }, [user?.email, user?.phone]);

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

  const getCurrentBoundTarget = (channel: ContactChannel) => {
    if (!user) return '';
    if (channel === 'email') {
      return hasEmailBinding(user.email) ? String(user.email || '') : '';
    }
    return user.phone || '';
  };

  const isLastBinding = (channel: ContactChannel) => {
    if (!user) return false;
    const emailBound = hasEmailBinding(user.email);
    const phoneBound = hasPhoneBinding(user.phone);
    if (channel === 'email') return emailBound && !phoneBound;
    return phoneBound && !emailBound;
  };

  const handleSendBindingCode = async (channel: ContactChannel) => {
    if (!user) return;
    const target = normalizeBindingTarget(channel, bindingForms[channel].target);
    const currentTarget = getCurrentBoundTarget(channel);

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

  const updateUnbindForm = (channel: ContactChannel, field: keyof UnbindFormState, value: string) => {
    setUnbindForms((prev) => ({
      ...prev,
      [channel]: {
        ...prev[channel],
        [field]: value,
      },
    }));
    setUnbindMessage((prev) => ({ ...prev, [channel]: null }));
  };

  const handleSendUnbindCode = async (channel: ContactChannel) => {
    const target = getCurrentBoundTarget(channel);
    if (!target) {
      setUnbindMessage((prev) => ({
        ...prev,
        [channel]: {
          type: 'error',
          text: channel === 'email' ? '当前账号未绑定邮箱。' : '当前账号未绑定手机号。',
        },
      }));
      return;
    }

    setSendingUnbindCode(channel);
    setUnbindMessage((prev) => ({ ...prev, [channel]: null }));
    const result = await sendVerifyCode(channel, target, 'unbind', { withAuth: true });
    setSendingUnbindCode(null);

    if (!result.ok) {
      setUnbindMessage((prev) => ({
        ...prev,
        [channel]: {
          type: 'error',
          text: result.error || '验证码发送失败，请稍后重试。',
        },
      }));
      return;
    }

    setUnbindMessage((prev) => ({
      ...prev,
      [channel]: {
        type: 'success',
        text: channel === 'email' ? '验证码已发送到当前绑定邮箱。' : '验证码已发送到当前绑定手机号。',
      },
    }));
  };

  const handleSubmitUnbind = async (channel: ContactChannel) => {
    const target = getCurrentBoundTarget(channel);
    if (!target) {
      setUnbindMessage((prev) => ({
        ...prev,
        [channel]: {
          type: 'error',
          text: channel === 'email' ? '当前账号未绑定邮箱。' : '当前账号未绑定手机号。',
        },
      }));
      return;
    }

    const form = unbindForms[channel];
    if (!form.code.trim()) {
      setUnbindMessage((prev) => ({
        ...prev,
        [channel]: { type: 'error', text: '请输入验证码。' },
      }));
      return;
    }
    if (!form.currentPassword) {
      setUnbindMessage((prev) => ({
        ...prev,
        [channel]: { type: 'error', text: '请输入当前密码。' },
      }));
      return;
    }

    const lastBinding = isLastBinding(channel);
    const confirmed = window.confirm(
      lastBinding
        ? '当前这是账号最后一种登录方式。解除后，账号将视为注销，系统会立即退出登录，之后无法再通过手机号或邮箱登录，也无法找回密码。确定继续吗？'
        : '解除绑定后，你仍可通过另一种已绑定方式登录和找回密码。确定继续吗？'
    );
    if (!confirmed) {
      return;
    }

    setSubmittingUnbind(channel);
    setUnbindMessage((prev) => ({ ...prev, [channel]: null }));
    const result = await unbindCurrentContact({
      channel,
      code: form.code.trim(),
      currentPassword: form.currentPassword,
    });
    setSubmittingUnbind(null);

    if (!result.ok) {
      setUnbindMessage((prev) => ({
        ...prev,
        [channel]: {
          type: 'error',
          text: result.error || '解除绑定失败，请稍后重试。',
        },
      }));
      return;
    }

    if (result.data?.deactivated) {
      clearUser();
      window.dispatchEvent(new Event('yiyu_user_updated'));
      window.alert('最后一种绑定方式已解除，账号已注销。');
      onNavigate?.('home');
      return;
    }

    if (!result.data?.user || !user) {
      setUnbindMessage((prev) => ({
        ...prev,
        [channel]: {
          type: 'error',
          text: '解除绑定后未能刷新账号信息，请重新登录后再试。',
        },
      }));
      return;
    }

    const nextUser = {
      ...normalizeLoginUser(result.data.user),
      plainPassword: user.plainPassword,
    } as LocalUser;
    persistUser(nextUser);
    setUnbindMessage((prev) => ({
      ...prev,
      [channel]: {
        type: 'success',
        text: result.message || (channel === 'email' ? '邮箱已解除绑定。' : '手机号已解除绑定。'),
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
  };

  const getAuthTarget = () => {
    if (!user) return null;
    if (user.phone) return { channel: 'phone' as const, target: user.phone };
    if (user.email && !user.email.endsWith('@phone.local')) return { channel: 'email' as const, target: user.email };
    return null;
  };

  const handleSendCode = async () => {
    const auth = getAuthTarget();
    if (!auth) {
      setSecurityMessage({ type: 'error', text: '当前账号缺少可用的邮箱或手机号。' });
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
      text: auth.channel === 'phone' ? '验证码已发送到绑定手机号。' : '验证码已发送到绑定邮箱。',
    });
  };

  const handleChangePassword = async () => {
    const auth = getAuthTarget();
    if (!auth) {
      setSecurityMessage({ type: 'error', text: '当前账号缺少可用的邮箱或手机号。' });
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

    const nextUser = {
      ...(user || {}),
      plainPassword: newPassword,
    } as LocalUser;
    persistUser(nextUser);
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

  const contactText = user.phone || sanitizeDisplayEmail(user.email);
  const paidActive = user.memberType === 'gold' || user.memberType === 'diamond';
  const emailBound = hasEmailBinding(user.email);
  const phoneBound = hasPhoneBinding(user.phone);
  const loginMethodText = getLoginMethodLabel(user.email, user.phone);
  const expireText = user.paidExpiresAt
    ? new Date(user.paidExpiresAt).toLocaleDateString('zh-CN')
    : paidActive
      ? '长期有效'
      : '未开通';
  const passwordHint = emailBound && phoneBound
    ? '当前账号已同时绑定手机号和邮箱，二者共用同一个密码。修改密码时将优先向绑定手机号发送验证码。'
    : phoneBound
      ? '当前账号通过绑定手机号接收验证码。若后续再绑定邮箱，手机号和邮箱将共用同一个密码。'
      : emailBound
        ? '当前账号通过绑定邮箱接收验证码。若后续再绑定手机号，手机号和邮箱将共用同一个密码。'
        : '当前账号尚未绑定可用的手机号或邮箱。';

  return (
    <div className="min-h-screen bg-background">
      <Header onNavigate={(p) => onNavigate?.(p)} isLoggedIn={true} userType="member" />

      <div className="pt-24 px-6 pb-16 max-w-5xl mx-auto space-y-6">
        <section className="bg-white/70 backdrop-blur rounded-3xl border border-border/40 p-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-3xl overflow-hidden border border-border/40 bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white text-xl font-bold">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="avatar" className="w-full h-full object-cover" />
                ) : (
                  (user.nickname || user.phone || '益').slice(0, 1).toUpperCase()
                )}
              </div>
              <div>
                <div className="text-xl font-semibold">{user.nickname || '用户'}</div>
                <div className="text-sm text-muted-foreground/70 break-all">{contactText}</div>
                <div className="mt-1 text-xs text-muted-foreground/70">登录入口：{loginMethodText}</div>
                <div className={`inline-flex items-center gap-2 mt-3 px-3 py-1.5 rounded-full border text-xs font-medium ${memberBadge.cls}`}>
                  {memberBadge.icon}
                  <span>{memberBadge.label}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white/70 backdrop-blur rounded-3xl border border-border/40 p-6 md:p-8">
          <div className="flex items-start justify-between gap-6">
            <div>
              <h2 className="text-lg font-semibold text-foreground">个人资料</h2>
              <p className="text-sm text-muted-foreground/70 mt-1">支持直接修改头像和昵称，变更后会同步保存到云端；手机号和邮箱作为同一账号的绑定方式展示。</p>
            </div>
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="rounded-2xl border border-border/40 bg-white/80 p-4">
                  <div className="text-xs text-muted-foreground/70 mb-2">邮箱</div>
                  <div className="font-medium break-all">{sanitizeDisplayEmail(user.email)}</div>
                </div>
                <div className="rounded-2xl border border-border/40 bg-white/80 p-4">
                  <div className="text-xs text-muted-foreground/70 mb-2">邮箱绑定状态</div>
                  <div className="font-medium">{emailBound ? '已绑定' : '未绑定'}</div>
                </div>
                <div className="rounded-2xl border border-border/40 bg-white/80 p-4">
                  <div className="text-xs text-muted-foreground/70 mb-2">手机号</div>
                  <div className="font-medium">{user.phone || '-'}</div>
                </div>
                <div className="rounded-2xl border border-border/40 bg-white/80 p-4">
                  <div className="text-xs text-muted-foreground/70 mb-2">手机号绑定状态</div>
                  <div className="font-medium">{phoneBound ? '已绑定' : '未绑定'}</div>
                </div>
                <div className="rounded-2xl border border-border/40 bg-white/80 p-4">
                  <div className="text-xs text-muted-foreground/70 mb-2">登录方式</div>
                  <div className="font-medium">{loginMethodText}</div>
                </div>
                <div className="rounded-2xl border border-border/40 bg-white/80 p-4">
                  <div className="text-xs text-muted-foreground/70 mb-2">账号状态</div>
                  <div className="font-medium">
                    {user.status === 'disabled' ? '已停用' : user.status === 'deactivated' ? '已注销' : '正常'}
                  </div>
                </div>
              </div>

              {profileMessage && (
                <div className={`text-sm px-4 py-3 rounded-2xl ${profileMessage.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
                  {profileMessage.text}
                </div>
              )}

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
            <h2 className="text-lg font-semibold text-foreground">会员服务</h2>
            <p className="text-sm text-muted-foreground/70 mt-1">只保留当前账号最核心的会员状态信息。</p>
          </div>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-2xl border border-border/40 bg-white/80 p-5">
              <div className="text-xs text-muted-foreground/70">当前身份</div>
              <div className="mt-2 text-lg font-semibold text-foreground">{memberBadge.label}</div>
            </div>
            <div className="rounded-2xl border border-border/40 bg-white/80 p-5">
              <div className="text-xs text-muted-foreground/70">付费状态</div>
              <div className="mt-2 text-lg font-semibold text-foreground">{paidActive ? '已开通' : '未开通'}</div>
            </div>
            <div className="rounded-2xl border border-border/40 bg-white/80 p-5">
              <div className="text-xs text-muted-foreground/70">有效期</div>
              <div className="mt-2 text-lg font-semibold text-foreground">{expireText}</div>
            </div>
          </div>
        </section>

        <section className="bg-white/70 backdrop-blur rounded-3xl border border-border/40 p-6 md:p-8">
          <h2 className="text-lg font-semibold text-foreground">账号安全</h2>

          <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-2xl border border-border/40 p-5 bg-white/80">
              <div className="flex items-center gap-2 text-sm font-medium mb-3">
                <KeyRound className="w-4 h-4" />
                原密码
              </div>

              <div className="flex items-center gap-2 rounded-xl border border-border/40 px-3 py-2 bg-muted/20">
                <span className="text-sm font-mono flex-1">
                  {user.plainPassword ? (showSavedPassword ? user.plainPassword : '•'.repeat(Math.max(8, user.plainPassword.length))) : '未显示'}
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
              <div className="mt-3 text-xs text-muted-foreground/70">
                当前账号只保留这一套密码。若手机号和邮箱已同时绑定，它们登录时共用这个密码。
              </div>
            </div>

            <div className="rounded-2xl border border-border/40 p-5 bg-white/80">
              <div className="flex items-center gap-2 text-sm font-medium mb-3">
                <Lock className="w-4 h-4" />
                修改密码
              </div>

              <div className="text-xs text-muted-foreground/70 mb-4">
                {passwordHint}
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

          <div className="mt-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-base font-semibold text-foreground">绑定方式管理</h3>
                <p className="mt-1 text-sm text-muted-foreground/70">可绑定或更换邮箱、手机号。完成后可用新绑定方式登录和找回密码，且仍共用同一个密码。</p>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-amber-100 bg-amber-50/80 px-4 py-3 text-sm text-amber-800">
              账号至少需要保留一种已绑定的手机号或邮箱，才能继续登录或找回密码。若解除最后一种绑定方式，账号将视为注销并立即退出登录。
            </div>

            <div className="mt-5 grid grid-cols-1 lg:grid-cols-2 gap-6">
              {([
                {
                  channel: 'email' as ContactChannel,
                  title: emailBound ? '更换邮箱' : '绑定邮箱',
                  icon: Mail,
                  currentLabel: sanitizeDisplayEmail(user.email),
                  statusLabel: emailBound ? '已绑定' : '未绑定',
                  targetPlaceholder: emailBound ? '请输入新的邮箱地址' : '请输入要绑定的邮箱地址',
                  note: '绑定成功后，可用邮箱登录、找回密码，并与手机号共用同一密码。',
                },
                {
                  channel: 'phone' as ContactChannel,
                  title: phoneBound ? '更换手机号' : '绑定手机号',
                  icon: Smartphone,
                  currentLabel: user.phone || '-',
                  statusLabel: phoneBound ? '已绑定' : '未绑定',
                  targetPlaceholder: phoneBound ? '请输入新的手机号码' : '请输入要绑定的手机号码',
                  note: '绑定成功后，可用手机号登录、找回密码，并与邮箱共用同一密码。',
                },
              ]).map((item) => (
                <div key={item.channel} className="rounded-2xl border border-border/40 p-5 bg-white/80">
                  <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <item.icon className="w-4 h-4" />
                    <span>{item.title}</span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-xl border border-border/40 bg-muted/20 px-3 py-2">
                      <div className="text-xs text-muted-foreground/70">当前绑定</div>
                      <div className="mt-1 break-all font-medium">{item.currentLabel}</div>
                    </div>
                    <div className="rounded-xl border border-border/40 bg-muted/20 px-3 py-2">
                      <div className="text-xs text-muted-foreground/70">状态</div>
                      <div className="mt-1 font-medium">{item.statusLabel}</div>
                    </div>
                  </div>

                  <div className="mt-4 space-y-3">
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
                      className="w-full px-4 py-2 rounded-xl bg-foreground text-white hover:bg-foreground/90 text-sm disabled:opacity-60"
                    >
                      {submittingBinding === item.channel ? '提交中…' : item.title}
                    </button>

                    <p className="text-xs text-muted-foreground/70">{item.note}</p>

                    {bindingMessage[item.channel] && (
                      <div className={`text-xs px-3 py-2 rounded-xl ${
                        bindingMessage[item.channel]?.type === 'success'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                          : 'bg-red-50 text-red-700 border border-red-100'
                      }`}>
                        {bindingMessage[item.channel]?.text}
                      </div>
                    )}

                    {item.statusLabel === '已绑定' && (
                      <div className="rounded-2xl border border-red-100 bg-red-50/70 p-4">
                        <div className="text-sm font-medium text-red-700">
                          {isLastBinding(item.channel) ? '解除绑定并注销账号' : `解除${item.channel === 'email' ? '邮箱' : '手机号'}绑定`}
                        </div>
                        <p className="mt-1 text-xs text-red-600/90">
                          {isLastBinding(item.channel)
                            ? '当前这是账号最后一种登录方式。解除后，账号会被注销，系统会立即退出登录。'
                            : '解除后，你仍可通过另一种已绑定方式登录和找回密码。'}
                        </p>

                        <div className="mt-3 space-y-3">
                          <div className="flex gap-3">
                            <input
                              value={unbindForms[item.channel].code}
                              onChange={(e) => updateUnbindForm(item.channel, 'code', e.target.value)}
                              placeholder="解绑验证码"
                              className="flex-1 px-3 py-2 rounded-xl border border-red-100 bg-white focus:outline-none focus:ring-2 focus:ring-red-100"
                            />
                            <button
                              type="button"
                              onClick={() => handleSendUnbindCode(item.channel)}
                              disabled={sendingUnbindCode === item.channel}
                              className="px-4 py-2 rounded-xl border border-red-200 hover:bg-red-100 text-sm text-red-700 disabled:opacity-60"
                            >
                              {sendingUnbindCode === item.channel ? '发送中…' : '发送验证码'}
                            </button>
                          </div>

                          <input
                            type="password"
                            value={unbindForms[item.channel].currentPassword}
                            onChange={(e) => updateUnbindForm(item.channel, 'currentPassword', e.target.value)}
                            placeholder="请输入当前密码"
                            className="w-full px-3 py-2 rounded-xl border border-red-100 bg-white focus:outline-none focus:ring-2 focus:ring-red-100"
                          />

                          <button
                            type="button"
                            onClick={() => handleSubmitUnbind(item.channel)}
                            disabled={submittingUnbind === item.channel}
                            className="w-full px-4 py-2 rounded-xl bg-red-600 text-white hover:bg-red-700 text-sm disabled:opacity-60"
                          >
                            {submittingUnbind === item.channel
                              ? '提交中…'
                              : isLastBinding(item.channel)
                                ? '解除绑定并注销账号'
                                : `解除${item.channel === 'email' ? '邮箱' : '手机号'}绑定`}
                          </button>

                          {unbindMessage[item.channel] && (
                            <div className={`text-xs px-3 py-2 rounded-xl ${
                              unbindMessage[item.channel]?.type === 'success'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                : 'bg-red-100 text-red-700 border border-red-200'
                            }`}>
                              {unbindMessage[item.channel]?.text}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
