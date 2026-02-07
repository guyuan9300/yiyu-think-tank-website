import { useEffect, useMemo, useState } from 'react';
import { Header } from './Header';
import { SettingsPage } from './SettingsPage';
import { clearUser, getSavedUserRaw } from '../lib/storage';
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
};

type UserCenterPageProps = {
  onNavigate?: (page: string) => void;
};

export default function UserCenterPage({ onNavigate }: UserCenterPageProps) {
  const [user, setUser] = useState<LocalUser | null>(null);
  const [activeTab, setActiveTab] = useState<'profile' | 'settings'>('profile');

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
        setUser(JSON.parse(raw));
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
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white text-xl font-bold">
              {(user.nickname || user.email || '益').slice(0, 1).toUpperCase()}
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
