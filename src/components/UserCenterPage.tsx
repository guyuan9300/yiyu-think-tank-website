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
import { getYiyuPageAttrs, getYiyuSectionAttrs } from '../lib/yiyuTongSiteMap';
import { useLang, type Bilingual } from '../lib/i18n';
import { getReports, getInsights, getBooks, getMethodologies } from '../lib/dataService';
import { loadMyFavorites, removeMyFavorite, type FavoriteRef } from '../lib/myFavorites';
import type { ContentEngagementType } from '../lib/contentEngagementApi';
import {
  User as UserIcon,
  Crown,
  Eye,
  EyeOff,
  KeyRound,
  Mail,
  ShieldAlert,
  Smartphone,
  Bookmark,
  FileText,
  BookOpen,
  Compass,
  ExternalLink,
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
type AccountTab = 'profile' | 'membership' | 'security' | 'favorites';

// 收藏项解析后的展示模型
interface FavoriteItem {
  ref: FavoriteRef;
  title: string;
  page: string;   // 阅读器页面 key
  exists: boolean;
}

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

const UNBOUND: Bilingual = { zh: '未绑定', en: 'Not bound' };

function maskEmail(email?: string): Bilingual {
  const value = sanitizeDisplayEmail(email);
  if (!value) return UNBOUND;
  const [name, domain] = value.split('@');
  if (!name || !domain) return { zh: value, en: value };
  if (name.length <= 2) return { zh: `${name[0] || ''}***@${domain}`, en: `${name[0] || ''}***@${domain}` };
  return { zh: `${name.slice(0, 2)}***@${domain}`, en: `${name.slice(0, 2)}***@${domain}` };
}

function maskPhone(phone?: string): Bilingual {
  const value = String(phone || '').trim();
  if (!value) return UNBOUND;
  if (value.length !== 11) return { zh: value, en: value };
  return { zh: `${value.slice(0, 3)}****${value.slice(-4)}`, en: `${value.slice(0, 3)}****${value.slice(-4)}` };
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

function getSecurityHint(user: LocalUser | null): Bilingual {
  const channels = getAvailableAuthChannels(user);
  if (channels.length === 2) {
    return { zh: '当前账号已同时绑定手机号和邮箱，二者共用同一个密码。', en: 'This account has both phone and email bound; they share a single password.' };
  }
  if (channels[0] === 'phone') {
    return { zh: '当前账号通过绑定手机号接收验证码；后续若再绑定邮箱，二者仍共用同一个密码。', en: 'This account receives codes via its bound phone; if you later bind an email, they still share one password.' };
  }
  if (channels[0] === 'email') {
    return { zh: '当前账号通过绑定邮箱接收验证码；后续若再绑定手机号，二者仍共用同一个密码。', en: 'This account receives codes via its bound email; if you later bind a phone, they still share one password.' };
  }
  return { zh: '当前账号尚未绑定可用的手机号或邮箱。', en: 'This account has no usable phone or email bound yet.' };
}

export default function UserCenterPage({ onNavigate }: UserCenterPageProps) {
  const { t } = useLang();
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

  // 分区 tab + 我的收藏
  const [activeTab, setActiveTab] = useState<AccountTab>('profile');
  const [favorites, setFavorites] = useState<FavoriteRef[]>([]);
  const [favoritesLoading, setFavoritesLoading] = useState(false);
  const [favoritesSource, setFavoritesSource] = useState<'cloud' | 'local'>('cloud');
  const [favReloadKey, setFavReloadKey] = useState(0);

  useEffect(() => {
    if (activeTab !== 'favorites') return;
    let alive = true;
    setFavoritesLoading(true);
    loadMyFavorites().then((res) => {
      if (!alive) return;
      setFavorites(res.items);
      setFavoritesSource(res.source);
      setFavoritesLoading(false);
    });
    return () => { alive = false; };
  }, [activeTab, favReloadKey]);

  const memberBadge = useMemo(() => {
    const mt = user?.memberType || 'regular';
    if (mt === 'gold' || mt === 'diamond') {
      return { label: { zh: '付费会员', en: 'Paid member' } as Bilingual, icon: <Crown className="w-4 h-4" />, cls: 'bg-amber-50 text-amber-700 border-amber-100' };
    }
    return { label: { zh: '普通会员', en: 'Free member' } as Bilingual, icon: <UserIcon className="w-4 h-4" />, cls: 'bg-slate-50 text-slate-700 border-slate-200' };
  }, [user?.memberType]);

  const authChannels = useMemo(() => getAvailableAuthChannels(user), [user]);

  // 收藏类型元信息: 标签 / 图标 / 阅读器页面
  const FAV_TYPE_META: Record<ContentEngagementType, { label: Bilingual; icon: typeof FileText; page: string }> = {
    report: { label: { zh: '报告', en: 'Reports' }, icon: FileText, page: 'report' },
    insight: { label: { zh: '文章', en: 'Articles' }, icon: BookOpen, page: 'article' },
    book: { label: { zh: '书籍', en: 'Books' }, icon: BookOpen, page: 'book-reader' },
    methodology: { label: { zh: '方法论', en: 'Methodologies' }, icon: Compass, page: 'methodology-library' },
  };

  // 把收藏引用解析成可展示的标题(从本地内容库取标题, 找不到则标记失效)
  const resolvedFavorites = useMemo<FavoriteItem[]>(() => {
    const titleOf = (type: ContentEngagementType, id: string): string | null => {
      const find = (list: Array<{ id: string; title?: string }>) => list.find((x) => x.id === id)?.title || null;
      if (type === 'report') return find(getReports());
      if (type === 'insight') return find(getInsights() as any);
      if (type === 'book') return find(getBooks() as any);
      if (type === 'methodology') return find(getMethodologies() as any);
      return null;
    };
    return favorites.map((ref) => {
      const title = titleOf(ref.contentType, ref.contentId);
      return {
        ref,
        title: title || (ref.contentType === 'report' ? '（报告已下架或清除）' : '（内容已不可用）'),
        page: FAV_TYPE_META[ref.contentType].page,
        exists: !!title,
      };
    });
  }, [favorites]);

  const handleRemoveFavorite = async (ref: FavoriteRef) => {
    await removeMyFavorite(ref.contentType, ref.contentId);
    setFavorites((prev) => prev.filter((f) => !(f.contentType === ref.contentType && f.contentId === ref.contentId)));
  };

  const openFavorite = (item: FavoriteItem) => {
    if (!item.exists) return;
    const { page } = item;
    const url = page === 'methodology-library'
      ? `?page=${page}`
      : `?page=${page}&id=${encodeURIComponent(item.ref.contentId)}`;
    if (typeof window !== 'undefined') window.location.href = url;
  };

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
      setProfileMessage({ type: 'error', text: t({ zh: '头像图片过大，建议控制在 1MB 以内。', en: 'Avatar image is too large; please keep it under 1MB.' }) });
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
      setProfileMessage({ type: 'error', text: t({ zh: '昵称不能为空。', en: 'Nickname cannot be empty.' }) });
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
      setProfileMessage({ type: 'error', text: result.error || t({ zh: '资料保存失败，请稍后重试。', en: 'Failed to save profile, please try again later.' }) });
      return;
    }

    const nextUser = {
      ...normalizeLoginUser(result.data.user),
      plainPassword: user.plainPassword,
    } as LocalUser;
    persistUser(nextUser);
    setProfileMessage({ type: 'success', text: result.message || t({ zh: '个人资料已保存。', en: 'Profile saved.' }) });
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
          text: channel === 'email' ? t({ zh: '请输入正确的邮箱地址。', en: 'Please enter a valid email address.' }) : t({ zh: '请输入正确的手机号码。', en: 'Please enter a valid phone number.' }),
        },
      }));
      return;
    }

    if (target === currentTarget) {
      setBindingMessage((prev) => ({
        ...prev,
        [channel]: {
          type: 'error',
          text: channel === 'email' ? t({ zh: '该邮箱已绑定当前账号。', en: 'This email is already bound to your account.' }) : t({ zh: '该手机号已绑定当前账号。', en: 'This phone is already bound to your account.' }),
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
          text: result.error || t({ zh: '验证码发送失败，请稍后重试。', en: 'Failed to send the code, please try again later.' }),
        },
      }));
      return;
    }

    setBindingMessage((prev) => ({
      ...prev,
      [channel]: {
        type: 'success',
        text: channel === 'email' ? t({ zh: '验证码已发送到新邮箱。', en: 'Code sent to the new email.' }) : t({ zh: '验证码已发送到新手机号。', en: 'Code sent to the new phone.' }),
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
          text: channel === 'email' ? t({ zh: '请输入正确的邮箱地址。', en: 'Please enter a valid email address.' }) : t({ zh: '请输入正确的手机号码。', en: 'Please enter a valid phone number.' }),
        },
      }));
      return;
    }
    if (!form.code.trim()) {
      setBindingMessage((prev) => ({
        ...prev,
        [channel]: { type: 'error', text: t({ zh: '请输入验证码。', en: 'Please enter the verification code.' }) },
      }));
      return;
    }
    if (!form.currentPassword) {
      setBindingMessage((prev) => ({
        ...prev,
        [channel]: { type: 'error', text: t({ zh: '请输入当前密码。', en: 'Please enter your current password.' }) },
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
          text: result.error || t({ zh: '绑定失败，请稍后重试。', en: 'Binding failed, please try again later.' }),
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
        text: result.message || (channel === 'email' ? t({ zh: '邮箱已绑定成功。', en: 'Email bound successfully.' }) : t({ zh: '手机号已绑定成功。', en: 'Phone bound successfully.' })),
      },
    }));
    setActivePanel(null);
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 8) {
      setSecurityMessage({ type: 'error', text: t({ zh: '新密码至少 8 位。', en: 'New password must be at least 8 characters.' }) });
      return;
    }
    if (newPassword !== confirmPassword) {
      setSecurityMessage({ type: 'error', text: t({ zh: '两次输入的新密码不一致。', en: 'The two new passwords do not match.' }) });
      return;
    }

    setIsChangingPassword(true);
    setSecurityMessage(null);
    const result = await changeCurrentPassword({
      newPassword,
    });
    setIsChangingPassword(false);

    if (!result.ok || !result.data?.user) {
      setSecurityMessage({ type: 'error', text: result.error || t({ zh: '密码修改失败，请稍后重试。', en: 'Failed to change password, please try again later.' }) });
      return;
    }

    const nextUser = {
      ...normalizeLoginUser(result.data.user),
      plainPassword: newPassword,
    } as LocalUser;
    persistUser(nextUser);
    setNewPassword('');
    setConfirmPassword('');
    setSecurityMessage({ type: 'success', text: result.message || t({ zh: '密码已修改成功。', en: 'Password changed successfully.' }) });
    setActivePanel(null);
  };

  const handleRedeemInviteCode = async () => {
    if (!user) return;
    const code = inviteCodeInput.trim().toUpperCase();
    if (!code) {
      setInviteMessage({ type: 'error', text: t({ zh: '请输入邀请码。', en: 'Please enter an invite code.' }) });
      return;
    }

    setIsRedeemingInvite(true);
    setInviteMessage(null);
    const result = await redeemInviteCodeApi(code);
    setIsRedeemingInvite(false);

    if (!result.ok || !result.data?.user) {
      setInviteMessage({ type: 'error', text: result.error || t({ zh: '邀请码兑换失败，请稍后重试。', en: 'Failed to redeem invite code, please try again later.' }) });
      return;
    }

    const nextUser = {
      ...normalizeLoginUser(result.data.user),
      plainPassword: user.plainPassword,
    } as LocalUser;
    persistUser(nextUser);
    setInviteCodeInput('');
    setInviteMessage({ type: 'success', text: result.message || t({ zh: '邀请码兑换成功。', en: 'Invite code redeemed successfully.' }) });
  };

  const handleSendDeactivateCode = async () => {
    const target = getBoundTarget(user, deactivateForm.channel);
    if (!target) {
      setDeactivateMessage({ type: 'error', text: deactivateForm.channel === 'phone' ? t({ zh: '当前账号未绑定手机号。', en: 'No phone number is bound to this account.' }) : t({ zh: '当前账号未绑定邮箱。', en: 'No email is bound to this account.' }) });
      return;
    }

    setSendingDeactivateCode(true);
    setDeactivateMessage(null);
    const result = await sendVerifyCode(deactivateForm.channel, target, 'deactivate', { withAuth: true });
    setSendingDeactivateCode(false);

    if (!result.ok) {
      setDeactivateMessage({ type: 'error', text: result.error || t({ zh: '验证码发送失败，请稍后重试。', en: 'Failed to send the code, please try again later.' }) });
      return;
    }

    setDeactivateMessage({
      type: 'success',
      text: deactivateForm.channel === 'phone' ? t({ zh: '验证码已发送到绑定手机号。', en: 'Code sent to the bound phone.' }) : t({ zh: '验证码已发送到绑定邮箱。', en: 'Code sent to the bound email.' }),
    });
  };

  const handleDeactivateAccount = async () => {
    if (!deactivateForm.code.trim()) {
      setDeactivateMessage({ type: 'error', text: t({ zh: '请输入验证码。', en: 'Please enter the verification code.' }) });
      return;
    }
    if (!deactivateForm.currentPassword) {
      setDeactivateMessage({ type: 'error', text: t({ zh: '请输入当前密码。', en: 'Please enter your current password.' }) });
      return;
    }

    const confirmed = window.confirm(t({ zh: '注销后，当前账号的所有绑定方式都会被解除，系统会立即退出登录，且无法再通过手机号或邮箱登录或找回密码。确定继续吗？', en: 'After deactivation, all bound methods are removed, you are signed out immediately, and you can no longer sign in or recover the password by phone or email. Continue?' }));
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
      setDeactivateMessage({ type: 'error', text: result.error || t({ zh: '注销失败，请稍后重试。', en: 'Deactivation failed, please try again later.' }) });
      return;
    }

    clearUser();
    window.dispatchEvent(new Event('yiyu_user_updated'));
    window.alert(t({ zh: '账号已注销。', en: 'Account deactivated.' }));
    onNavigate?.('home');
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Header onNavigate={(p) => onNavigate?.(p)} />
        <div className="pt-24 px-6 max-w-3xl mx-auto">
          <div className="bg-white/70 backdrop-blur rounded-3xl border border-border/40 p-10 text-center">
            <p className="text-lg font-semibold mb-2">{t({ zh: '请先登录', en: 'Please sign in first' })}</p>
            <p className="text-sm text-muted-foreground/70 mb-6">{t({ zh: '登录后即可查看个人中心。', en: 'Sign in to view your user center.' })}</p>
            <button
              className="px-5 py-3 rounded-2xl bg-primary text-primary-foreground font-medium"
              onClick={() => onNavigate?.('login')}
            >
              {t({ zh: '去登录', en: 'Go to sign in' })}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const paidActive = user.memberType === 'gold' || user.memberType === 'diamond';
  const expireText = user.paidExpiresAt
    ? new Date(user.paidExpiresAt).toLocaleDateString('zh-CN')
    : paidActive
      ? t({ zh: '长期有效', en: 'Lifetime' })
      : t({ zh: '未开通', en: 'Not activated' });
  const securityHint = getSecurityHint(user);

  return (
    <div {...getYiyuPageAttrs('user-center')} className="min-h-screen bg-background">
      <Header onNavigate={(p) => onNavigate?.(p)} isLoggedIn={true} userType="member" />

      <div className="pt-24 px-6 pb-16 max-w-6xl mx-auto">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* 左侧分区导航 */}
          <nav className="lg:w-56 shrink-0 flex lg:flex-col gap-1.5 overflow-x-auto lg:overflow-visible">
            {([
              { id: 'profile' as AccountTab, label: { zh: '账号资料', en: 'Profile' } as Bilingual, icon: UserIcon },
              { id: 'membership' as AccountTab, label: { zh: '我的会员', en: 'Membership' } as Bilingual, icon: Crown },
              { id: 'security' as AccountTab, label: { zh: '账号安全', en: 'Security' } as Bilingual, icon: KeyRound },
              { id: 'favorites' as AccountTab, label: { zh: '我的收藏', en: 'Favorites' } as Bilingual, icon: Bookmark },
            ]).map((item) => {
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`shrink-0 inline-flex items-center gap-2.5 px-4 py-3 rounded-2xl text-sm font-medium transition whitespace-nowrap ${
                    active ? 'bg-foreground text-white shadow-sm' : 'text-muted-foreground/80 hover:bg-muted/40'
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  <span>{t(item.label)}</span>
                  {item.id === 'favorites' && favorites.length > 0 && (
                    <span className={`ml-auto text-[11px] px-1.5 py-0.5 rounded-full ${active ? 'bg-white/20' : 'bg-muted/60 text-muted-foreground'}`}>{favorites.length}</span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* 右侧内容区 */}
          <div className="flex-1 min-w-0 space-y-6">
        {activeTab === 'profile' && (
        <section
          {...getYiyuSectionAttrs('user-center', 'user-center-profile')}
          className="bg-white/70 backdrop-blur rounded-3xl border border-border/40 p-6 md:p-8"
        >
          <div>
            <h2 className="font-serif-display text-[24px] sm:text-[28px] font-semibold tracking-tight text-foreground">{t({ zh: '个人资料', en: 'Profile' })}</h2>
            <p className="text-sm text-muted-foreground/70 mt-2">{t({ zh: '这里只保留当前账号真正需要维护的信息：头像、昵称与会员状态。', en: 'Only the essentials are kept here: avatar, nickname, and membership status.' })}</p>
          </div>

          <div className="mt-6 grid grid-cols-1 lg:grid-cols-[220px,1fr] gap-8">
            <div className="space-y-4">
              <div className="w-36 h-36 rounded-[32px] overflow-hidden border border-border/40 bg-white flex items-center justify-center text-3xl font-semibold text-slate-600">
                {avatarPreview ? (
                  <img src={avatarPreview} alt={t({ zh: '头像预览', en: 'Avatar preview' })} className="w-full h-full object-cover" />
                ) : (
                  (user.nickname || user.phone || '益').slice(0, 1).toUpperCase()
                )}
              </div>

              <div className="space-y-2">
                <label className="block">
                  <span className="sr-only">{t({ zh: '上传头像', en: 'Upload avatar' })}</span>
                  <span className="inline-flex w-full justify-center px-4 py-2 rounded-2xl border border-border/50 hover:bg-muted/30 transition text-sm cursor-pointer">
                    {t({ zh: '上传头像', en: 'Upload avatar' })}
                  </span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                </label>
                {avatarPreview && (
                  <button
                    type="button"
                    className="w-full px-4 py-2 rounded-2xl bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 transition text-sm"
                    onClick={() => setAvatarPreview('')}
                  >
                    {t({ zh: '移除头像', en: 'Remove avatar' })}
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t({ zh: '昵称', en: 'Nickname' })}</label>
                <input
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder={t({ zh: '请输入昵称', en: 'Enter your nickname' })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="rounded-2xl border border-border/40 bg-white/80 p-4">
                  <div className="text-xs text-muted-foreground/70 mb-2">{t({ zh: '当前身份', en: 'Current status' })}</div>
                  <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium ${memberBadge.cls}`}>
                    {memberBadge.icon}
                    <span>{t(memberBadge.label)}</span>
                  </div>
                </div>
                <div className="rounded-2xl border border-border/40 bg-white/80 p-4">
                  <div className="text-xs text-muted-foreground/70 mb-2">{t({ zh: '付费到期时间', en: 'Membership expiry' })}</div>
                  <div className="font-medium">{expireText}</div>
                </div>
                <div className="rounded-2xl border border-border/40 bg-white/80 p-4">
                  <div className="text-xs text-muted-foreground/70 mb-2">{t({ zh: '战略陪伴', en: 'Strategic Companion' })}</div>
                  <div className="font-medium">{user.strategyProjectName || t({ zh: '未绑定机构', en: 'No organization bound' })}</div>
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
                    <div className="text-sm font-medium text-foreground">{t({ zh: '付费服务', en: 'Paid services' })}</div>
                    <p className="text-xs text-muted-foreground/70 mt-1">
                      {paidActive ? t({ zh: '如需继续保持付费会员状态，可在这里续费。', en: 'Renew here to keep your paid membership active.' }) : t({ zh: '开通付费会员后，可在后续统一解锁更多付费服务。', en: 'Once you activate paid membership, more paid services will be unlocked over time.' })}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onNavigate?.('membership')}
                    className="px-5 py-3 rounded-2xl bg-foreground text-white hover:bg-foreground/90 text-sm"
                  >
                    {paidActive ? t({ zh: '续费', en: 'Renew' }) : t({ zh: '开通付费', en: 'Activate' })}
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-border/40 bg-white/80 p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <div className="text-sm font-medium text-foreground">{t({ zh: '兑换邀请码', en: 'Redeem invite code' })}</div>
                    <p className="text-xs text-muted-foreground/70 mt-1">{t({ zh: '可用于开通付费会员或绑定机构战略陪伴。', en: 'Can activate paid membership or bind organizational Strategic Companion.' })}</p>
                  </div>
                  <div className="flex w-full max-w-xl gap-3">
                    <input
                      value={inviteCodeInput}
                      onChange={(e) => {
                        setInviteCodeInput(e.target.value.toUpperCase());
                        setInviteMessage(null);
                      }}
                      placeholder={t({ zh: '输入邀请码', en: 'Enter invite code' })}
                      className="flex-1 px-4 py-3 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                    <button
                      type="button"
                      onClick={handleRedeemInviteCode}
                      disabled={isRedeemingInvite}
                      className="px-5 py-3 rounded-2xl border border-border/50 hover:bg-muted/30 text-sm disabled:opacity-60"
                    >
                      {isRedeemingInvite ? t({ zh: '兑换中…', en: 'Redeeming…' }) : t({ zh: '确认兑换', en: 'Redeem' })}
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
                  {isSavingProfile ? t({ zh: '保存中…', en: 'Saving…' }) : t({ zh: '保存资料', en: 'Save profile' })}
                </button>
              </div>
            </div>
          </div>
        </section>
        )}

        {activeTab === 'membership' && (
        <section className="bg-white/70 backdrop-blur rounded-3xl border border-border/40 p-6 md:p-8">
          <div>
            <h2 className="font-serif-display text-[24px] sm:text-[28px] font-semibold tracking-tight text-foreground">{t({ zh: '我的会员', en: 'My membership' })}</h2>
            <p className="text-sm text-muted-foreground/70 mt-2">{t({ zh: '查看你的会员等级、有效期与开通来源，可在此续费或升级。', en: 'Your membership tier, validity and source. Renew or upgrade here.' })}</p>
          </div>

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div className="rounded-2xl border border-border/40 bg-white/80 p-5">
              <div className="text-xs text-muted-foreground/70 mb-2">{t({ zh: '当前等级', en: 'Tier' })}</div>
              <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium ${memberBadge.cls}`}>
                {memberBadge.icon}
                <span>{t(memberBadge.label)}</span>
              </div>
            </div>
            <div className="rounded-2xl border border-border/40 bg-white/80 p-5">
              <div className="text-xs text-muted-foreground/70 mb-2">{t({ zh: '付费到期时间', en: 'Expiry' })}</div>
              <div className="font-medium text-base">{expireText}</div>
            </div>
            <div className="rounded-2xl border border-border/40 bg-white/80 p-5">
              <div className="text-xs text-muted-foreground/70 mb-2">{t({ zh: '开通来源', en: 'Source' })}</div>
              <div className="font-medium">
                {paidActive
                  ? t(({
                      manual: { zh: '后台开通', en: 'Admin granted' },
                      invite_code: { zh: '邀请码', en: 'Invite code' },
                      payment: { zh: '微信支付', en: 'WeChat Pay' },
                      strategy_client: { zh: '战略客户', en: 'Strategy client' },
                    } as Record<string, Bilingual>)[user.paidSource || 'manual'] || { zh: '—', en: '—' })
                  : t({ zh: '未开通', en: 'Not activated' })}
              </div>
            </div>
          </div>

          {user.strategyProjectName && (
            <div className="mt-4 rounded-2xl border border-border/40 bg-white/80 p-5 text-sm">
              <div className="text-xs text-muted-foreground/70 mb-1">{t({ zh: '战略陪伴机构', en: 'Strategic Companion org' })}</div>
              <div className="font-medium">{user.strategyProjectName}</div>
            </div>
          )}

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => onNavigate?.('membership')}
              className="px-5 py-3 rounded-2xl bg-foreground text-white hover:bg-foreground/90 text-sm"
            >
              {paidActive ? t({ zh: '续费 / 升级', en: 'Renew / Upgrade' }) : t({ zh: '开通付费会员', en: 'Activate membership' })}
            </button>
          </div>
        </section>
        )}

        {activeTab === 'security' && (
        <>
        <section
          {...getYiyuSectionAttrs('user-center', 'user-center-security')}
          className="bg-white/70 backdrop-blur rounded-3xl border border-border/40 p-6 md:p-8"
        >
          <div>
            <h2 className="text-lg font-semibold text-foreground">{t({ zh: '账号安全', en: 'Account security' })}</h2>
            <p className="text-sm text-muted-foreground/70 mt-1">{t(securityHint)}</p>
          </div>

          <div className="mt-6 space-y-4">
            <div className="rounded-2xl border border-border/40 bg-white/80 p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <KeyRound className="w-4 h-4" />
                    {t({ zh: '原密码', en: 'Current password' })}
                  </div>
                  <div className="mt-3 flex items-center gap-2 rounded-xl border border-border/40 px-3 py-2 bg-muted/20">
                    <span className="text-sm font-mono flex-1">
                      {user.plainPassword ? (showSavedPassword ? user.plainPassword : '•'.repeat(Math.max(8, user.plainPassword.length))) : t({ zh: '当前会话未保存', en: 'Not saved in this session' })}
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
                  {activePanel === 'password' ? t({ zh: '收起', en: 'Collapse' }) : t({ zh: '修改密码', en: 'Change password' })}
                </button>
              </div>

              {activePanel === 'password' && (
                <div className="mt-5 border-t border-border/40 pt-5 space-y-3">
                  <p className="text-sm text-muted-foreground/80">
                    {t({ zh: '当前已处于登录状态，直接提交新密码即可生效；密码修改后会立即同步到云端账号。', en: 'You are signed in, so submitting a new password takes effect immediately and syncs to your cloud account.' })}
                  </p>

                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder={t({ zh: '新密码（至少8位）', en: 'New password (at least 8 characters)' })}
                    className="w-full px-3 py-2 rounded-xl border border-border/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />

                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder={t({ zh: '确认新密码', en: 'Confirm new password' })}
                    className="w-full px-3 py-2 rounded-xl border border-border/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />

                  <button
                    type="button"
                    onClick={handleChangePassword}
                    disabled={isChangingPassword}
                    className="px-4 py-2 rounded-xl bg-foreground text-white hover:bg-foreground/90 text-sm disabled:opacity-60"
                  >
                    {isChangingPassword ? t({ zh: '提交中…', en: 'Submitting…' }) : t({ zh: '确认修改密码', en: 'Confirm password change' })}
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
                title: { zh: '手机号', en: 'Phone' } as Bilingual,
                icon: Smartphone,
                value: maskPhone(user.phone),
                actionLabel: (hasPhoneBinding(user.phone) ? { zh: '更换', en: 'Change' } : { zh: '绑定', en: 'Bind' }) as Bilingual,
                targetPlaceholder: (hasPhoneBinding(user.phone) ? { zh: '请输入新的手机号码', en: 'Enter the new phone number' } : { zh: '请输入要绑定的手机号码', en: 'Enter the phone number to bind' }) as Bilingual,
                successText: { zh: '验证码将发送到新手机号。', en: 'The code will be sent to the new phone.' } as Bilingual,
              },
              {
                channel: 'email' as ContactChannel,
                title: { zh: '邮箱', en: 'Email' } as Bilingual,
                icon: Mail,
                value: maskEmail(user.email),
                actionLabel: (hasEmailBinding(user.email) ? { zh: '更换', en: 'Change' } : { zh: '绑定', en: 'Bind' }) as Bilingual,
                targetPlaceholder: (hasEmailBinding(user.email) ? { zh: '请输入新的邮箱地址', en: 'Enter the new email address' } : { zh: '请输入要绑定的邮箱地址', en: 'Enter the email address to bind' }) as Bilingual,
                successText: { zh: '验证码将发送到新邮箱。', en: 'The code will be sent to the new email.' } as Bilingual,
              },
            ]).map((item) => (
              <div key={item.channel} className="rounded-2xl border border-border/40 bg-white/80 p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                      <item.icon className="w-4 h-4" />
                      {t(item.title)}
                    </div>
                    <div className="mt-2 text-sm text-foreground">{t(item.value)}</div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setBindingMessage((prev) => ({ ...prev, [item.channel]: null }));
                      setActivePanel((prev) => (prev === item.channel ? null : item.channel));
                    }}
                    className="px-4 py-2 rounded-xl border border-border/50 hover:bg-muted/30 text-sm"
                  >
                    {activePanel === item.channel ? t({ zh: '收起', en: 'Collapse' }) : t(item.actionLabel)}
                  </button>
                </div>

                {activePanel === item.channel && (
                  <div className="mt-5 border-t border-border/40 pt-5 space-y-3">
                    <input
                      type={item.channel === 'email' ? 'email' : 'tel'}
                      value={bindingForms[item.channel].target}
                      onChange={(e) => updateBindingForm(item.channel, 'target', e.target.value)}
                      placeholder={t(item.targetPlaceholder)}
                      className="w-full px-3 py-2 rounded-xl border border-border/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />

                    <div className="flex gap-3">
                      <input
                        value={bindingForms[item.channel].code}
                        onChange={(e) => updateBindingForm(item.channel, 'code', e.target.value)}
                        placeholder={t({ zh: '验证码', en: 'Verification code' })}
                        className="flex-1 px-3 py-2 rounded-xl border border-border/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                      <button
                        type="button"
                        onClick={() => handleSendBindingCode(item.channel)}
                        disabled={sendingBindingCode === item.channel}
                        className="px-4 py-2 rounded-xl border border-border/50 hover:bg-muted/30 text-sm disabled:opacity-60"
                      >
                        {sendingBindingCode === item.channel ? t({ zh: '发送中…', en: 'Sending…' }) : t({ zh: '发送验证码', en: 'Send code' })}
                      </button>
                    </div>

                    <input
                      type="password"
                      value={bindingForms[item.channel].currentPassword}
                      onChange={(e) => updateBindingForm(item.channel, 'currentPassword', e.target.value)}
                      placeholder={t({ zh: '请输入当前密码', en: 'Enter your current password' })}
                      className="w-full px-3 py-2 rounded-xl border border-border/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />

                    <button
                      type="button"
                      onClick={() => handleSubmitBinding(item.channel)}
                      disabled={submittingBinding === item.channel}
                      className="px-4 py-2 rounded-xl bg-foreground text-white hover:bg-foreground/90 text-sm disabled:opacity-60"
                    >
                      {submittingBinding === item.channel ? t({ zh: '提交中…', en: 'Submitting…' }) : t(item.actionLabel)}
                    </button>

                    <p className="text-xs text-muted-foreground/70">{t(item.successText)}</p>

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

            {/* 微信绑定(占位, 第二期接微信开放平台 OAuth 回调) */}
            <div className="rounded-2xl border border-border/40 bg-white/80 p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-md bg-[#1AAD19] text-white text-[11px] font-bold">微</span>
                    {t({ zh: '微信', en: 'WeChat' })}
                  </div>
                  <div className="mt-2 text-sm text-muted-foreground/80">{t({ zh: '绑定后可用微信扫码登录。功能即将开放。', en: 'Bind to enable WeChat scan login. Coming soon.' })}</div>
                </div>
                <button
                  type="button"
                  disabled
                  className="px-4 py-2 rounded-xl border border-border/40 text-sm text-muted-foreground/60 bg-muted/20 cursor-not-allowed"
                >
                  {t({ zh: '即将开放', en: 'Coming soon' })}
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white/70 backdrop-blur rounded-3xl border border-red-100 p-6 md:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2 text-base font-semibold text-red-700">
                <ShieldAlert className="w-5 h-5" />
                {t({ zh: '注销账号', en: 'Deactivate account' })}
              </div>
              <p className="mt-2 text-sm text-red-700/80">
                {t({ zh: '注销后，当前账号的所有绑定方式都会被解除，系统会立即退出登录，之后无法再通过手机号或邮箱登录或找回密码。', en: 'After deactivation, all bound methods are removed, you are signed out immediately, and you can no longer sign in or recover the password by phone or email.' })}
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
              {activePanel === 'deactivate' ? t({ zh: '收起', en: 'Collapse' }) : t({ zh: '注销账号', en: 'Deactivate account' })}
            </button>
          </div>

          {activePanel === 'deactivate' && (
            <div className="mt-5 border-t border-red-100 pt-5 space-y-3">
              {authChannels.length > 1 && (
                <div>
                  <div className="text-sm font-medium text-foreground mb-2">{t({ zh: '选择验证方式', en: 'Choose verification method' })}</div>
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
                        {channel === 'phone' ? t({ zh: '手机号', en: 'Phone' }) : t({ zh: '邮箱', en: 'Email' })}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="text-sm text-muted-foreground/80">
                {deactivateForm.channel === 'phone' ? t({ zh: '验证码将发送到绑定手机号。', en: 'The code will be sent to the bound phone.' }) : t({ zh: '验证码将发送到绑定邮箱。', en: 'The code will be sent to the bound email.' })}
              </div>

              <div className="flex gap-3">
                <input
                  value={deactivateForm.code}
                  onChange={(e) => {
                    setDeactivateForm((prev) => ({ ...prev, code: e.target.value }));
                    setDeactivateMessage(null);
                  }}
                  placeholder={t({ zh: '验证码', en: 'Verification code' })}
                  className="flex-1 px-3 py-2 rounded-xl border border-red-100 bg-white focus:outline-none focus:ring-2 focus:ring-red-100"
                />
                <button
                  type="button"
                  onClick={handleSendDeactivateCode}
                  disabled={sendingDeactivateCode}
                  className="px-4 py-2 rounded-xl border border-red-200 hover:bg-red-100 text-sm text-red-700 disabled:opacity-60"
                >
                  {sendingDeactivateCode ? t({ zh: '发送中…', en: 'Sending…' }) : t({ zh: '发送验证码', en: 'Send code' })}
                </button>
              </div>

              <input
                type="password"
                value={deactivateForm.currentPassword}
                onChange={(e) => {
                  setDeactivateForm((prev) => ({ ...prev, currentPassword: e.target.value }));
                  setDeactivateMessage(null);
                }}
                placeholder={t({ zh: '请输入当前密码', en: 'Enter your current password' })}
                className="w-full px-3 py-2 rounded-xl border border-red-100 bg-white focus:outline-none focus:ring-2 focus:ring-red-100"
              />

              <button
                type="button"
                onClick={handleDeactivateAccount}
                disabled={submittingDeactivate || !authChannels.length}
                className="px-4 py-2 rounded-xl bg-red-600 text-white hover:bg-red-700 text-sm disabled:opacity-60"
              >
                {submittingDeactivate ? t({ zh: '提交中…', en: 'Submitting…' }) : t({ zh: '确认注销账号', en: 'Confirm deactivation' })}
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
        </>
        )}

        {activeTab === 'favorites' && (
        <section className="bg-white/70 backdrop-blur rounded-3xl border border-border/40 p-6 md:p-8">
          <div className="flex items-end justify-between gap-3 flex-wrap">
            <div>
              <h2 className="font-serif-display text-[24px] sm:text-[28px] font-semibold tracking-tight text-foreground">{t({ zh: '我的收藏', en: 'My favorites' })}</h2>
              <p className="text-sm text-muted-foreground/70 mt-2">{t({ zh: '你收藏的文章、报告、书籍与方法论，可随时回看或取消收藏。', en: 'Articles, reports, books and methodologies you favorited. Revisit or unfavorite anytime.' })}</p>
            </div>
            <button
              type="button"
              onClick={() => setFavReloadKey((k) => k + 1)}
              className="px-4 py-2 rounded-xl border border-border/50 hover:bg-muted/30 text-sm"
            >
              {t({ zh: '刷新', en: 'Refresh' })}
            </button>
          </div>

          {favoritesSource === 'local' && !favoritesLoading && (
            <div className="mt-4 rounded-2xl bg-amber-50 border border-amber-100 px-4 py-2.5 text-[12.5px] text-amber-800">
              {t({ zh: '网络不可达，当前显示本地缓存的收藏；恢复网络后点「刷新」同步云端。', en: 'Network unreachable — showing locally cached favorites. Click Refresh after reconnecting.' })}
            </div>
          )}

          <div className="mt-6">
            {favoritesLoading ? (
              <div className="py-12 text-center text-sm text-muted-foreground/70">{t({ zh: '加载收藏中…', en: 'Loading favorites…' })}</div>
            ) : resolvedFavorites.length === 0 ? (
              <div className="py-12 text-center">
                <Bookmark className="w-10 h-10 mx-auto text-muted-foreground/40" />
                <p className="mt-3 text-sm text-muted-foreground/70">{t({ zh: '还没有收藏。在文章 / 报告页点收藏后，会出现在这里。', en: 'No favorites yet. Favorite an article or report and it shows up here.' })}</p>
              </div>
            ) : (
              <div className="space-y-6">
                {(['report', 'insight', 'book', 'methodology'] as ContentEngagementType[]).map((type) => {
                  const group = resolvedFavorites.filter((f) => f.ref.contentType === type);
                  if (group.length === 0) return null;
                  const meta = FAV_TYPE_META[type];
                  return (
                    <div key={type}>
                      <div className="flex items-center gap-2 text-sm font-semibold text-foreground/80 mb-3">
                        <meta.icon className="w-4 h-4" />
                        {t(meta.label)}
                        <span className="text-xs font-normal text-muted-foreground/60">· {group.length}</span>
                      </div>
                      <div className="space-y-2">
                        {group.map((item) => (
                          <div key={`${item.ref.contentType}:${item.ref.contentId}`} className="flex items-center gap-3 rounded-2xl border border-border/40 bg-white/80 px-4 py-3">
                            <button
                              type="button"
                              onClick={() => openFavorite(item)}
                              disabled={!item.exists}
                              className={`min-w-0 flex-1 text-left ${item.exists ? 'hover:text-primary' : 'cursor-not-allowed'}`}
                            >
                              <div className={`text-sm font-medium truncate ${item.exists ? 'text-foreground' : 'text-muted-foreground/60 line-through'}`}>{item.title}</div>
                              <div className="text-[11.5px] text-muted-foreground/60 mt-0.5">{t({ zh: '收藏于', en: 'Saved' })} {item.ref.createdAt?.slice(0, 10) || '—'}</div>
                            </button>
                            {item.exists && (
                              <button
                                type="button"
                                onClick={() => openFavorite(item)}
                                className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-border/50 hover:bg-muted/30 text-xs text-foreground/80"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />{t({ zh: '查看', en: 'Open' })}
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleRemoveFavorite(item.ref)}
                              className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs text-muted-foreground/70 hover:text-red-600 hover:bg-red-50"
                            >
                              {t({ zh: '取消收藏', en: 'Remove' })}
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
        )}
          </div>
        </div>
      </div>
    </div>
  );
}
