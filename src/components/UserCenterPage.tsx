import { useEffect, useMemo, useState } from 'react';
import { Header } from './Header';
import { SettingsPage } from './SettingsPage';
import { clearUser, getSavedUserRaw, saveUserRaw, USER_KEY } from '../lib/storage';
import { generateAvatarImage } from '../lib/hfImageGen';
import {
  User as UserIcon,
  Crown,
  Shield,
  LogOut,
  Settings as SettingsIcon,
  ChevronRight,
} from 'lucide-react';

type MemberType = 'regular' | 'gold' | 'diamond';

type LocalUser = {
  id: string;
  email?: string;
  nickname?: string;
  memberType?: MemberType;
  status?: string;
  avatarUrl?: string;
  preferences?: string[];
};

type UserCenterPageProps = {
  onNavigate?: (page: string) => void;
};

export default function UserCenterPage({ onNavigate }: UserCenterPageProps) {
  const [user, setUser] = useState<LocalUser | null>(null);
  const [activeTab, setActiveTab] = useState<'profile' | 'settings'>('profile');
  const [avatarKeywords, setAvatarKeywords] = useState('');
  const [prefInput, setPrefInput] = useState('');
  const [isGeneratingAvatar, setIsGeneratingAvatar] = useState(false);

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
        // prefill
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

    // Decide remember mode by where the user is stored.
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
    // legacy keys cleanup
    localStorage.removeItem('yiyu_current_user');
    sessionStorage.removeItem('yiyu_current_user');
    localStorage.removeItem('yiyu_is_admin');
    sessionStorage.removeItem('yiyu_is_admin');
    localStorage.removeItem('yiyu_admin_email');
    sessionStorage.removeItem('yiyu_admin_email');

    window.dispatchEvent(new Event('yiyu_user_updated'));
    if (onNavigate) onNavigate('home');
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Header onNavigate={(p) => onNavigate?.(p)} />
        <div className="pt-24 px-6 max-w-3xl mx-auto">
          <div className="bg-white/70 backdrop-blur rounded-3xl border border-border/40 p-10 text-center">
            <p className="text-lg font-semibold mb-2">请先登录</p>
            <p className="text-sm text-muted-foreground/70 mb-6">登录后即可查看个人中心与设置</p>
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
        {/* Top card */}
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
              <div className="text-sm text-muted-foreground/70 break-all">{user.email || ''}</div>
              <div className={`inline-flex items-center gap-2 mt-3 px-3 py-1.5 rounded-full border text-xs font-medium ${memberBadge.cls}`}>
                {memberBadge.icon}
                <span>{memberBadge.label}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveTab('settings')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl border border-border/50 hover:bg-muted/30 transition"
            >
              <SettingsIcon className="w-4 h-4" />
              <span className="text-sm font-medium">设置</span>
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

        {/* Tabs */}
        <div className="mt-8 flex items-center gap-2">
          <button
            onClick={() => setActiveTab('profile')}
            className={`px-4 py-2 rounded-2xl text-sm font-medium transition ${activeTab === 'profile' ? 'bg-foreground text-white' : 'bg-white/70 border border-border/40 text-muted-foreground/70 hover:text-foreground'}`}
          >
            个人信息
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2 rounded-2xl text-sm font-medium transition ${activeTab === 'settings' ? 'bg-foreground text-white' : 'bg-white/70 border border-border/40 text-muted-foreground/70 hover:text-foreground'}`}
          >
            设置
          </button>
        </div>

        {/* Content */}
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
                <div className="flex items-center justify-between py-2">
                  <span className="text-muted-foreground/70">会员等级</span>
                  <span className="font-medium">{memberBadge.label}</span>
                </div>
              </div>
              <div className="mt-6">
                <button
                  className="inline-flex items-center gap-2 text-sm text-primary hover:text-primary/80"
                  onClick={() => setActiveTab('settings')}
                >
                  去设置
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Avatar & Preferences */}
            <div className="lg:col-span-2 bg-white/70 backdrop-blur rounded-3xl border border-border/40 p-6">
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
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-6">
            {!isAdmin ? (
              <div className="bg-white/70 backdrop-blur rounded-3xl border border-border/40 p-10 text-center">
                <p className="text-sm text-muted-foreground/70">当前账号没有管理员权限，暂不展示系统设置。</p>
              </div>
            ) : (
              <div className="bg-white/70 backdrop-blur rounded-3xl border border-border/40 overflow-hidden">
                {/* Reuse existing SettingsPage (merged into personal center) */}
                <SettingsPage onBack={() => setActiveTab('profile')} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
