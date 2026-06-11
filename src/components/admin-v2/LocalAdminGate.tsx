import { useEffect, useState, type ReactNode } from 'react';
import { LoginPage } from '../LoginPage';
import { fetchCurrentSession } from '../../lib/authApi';

// ============================================================
// admin-v2 · 管理员 Gate
//
// 身份判定改为【服务端权威校验】:带登录 token 调后端 /session,
// 由服务端依据 PG users 表 (admin_role / 管理员邮箱白名单) 计算 adminRole。
// 客户端无法通过改 localStorage(yiyu_is_admin / yiyu_current_user.adminRole)伪造。
// 仅本地 dev (import.meta.env.DEV) 直通,生产 build 会被 tree-shake。
// ============================================================

async function verifyAdmin(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  if (import.meta.env.DEV) return true;
  try {
    const res = await fetchCurrentSession();
    return res.ok === true && res.data?.user?.adminRole === 'admin';
  } catch {
    return false;
  }
}

export function LocalAdminGate({
  children,
  onNavigate,
}: {
  children: ReactNode;
  onNavigate?: (page: string) => void;
}) {
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    let canceled = false;
    const check = () => {
      void verifyAdmin().then((ok) => {
        if (!canceled) setAllowed(ok);
      });
    };
    check();
    // 登录成功后会触发 yiyu_user_updated;storage 跨标签页变更也重新校验
    const recheck = () => check();
    window.addEventListener('yiyu_user_updated', recheck);
    window.addEventListener('storage', recheck);
    return () => {
      canceled = true;
      window.removeEventListener('yiyu_user_updated', recheck);
      window.removeEventListener('storage', recheck);
    };
  }, []);

  if (allowed === null) {
    return (
      <div className="min-h-screen bg-os-canvas flex items-center justify-center">
        <div className="text-os-muted text-[14px]">验证管理员身份...</div>
      </div>
    );
  }

  if (!allowed) {
    return (
      <LoginPage
        onNavigate={(page) => {
          if (onNavigate) onNavigate(page === 'login' ? 'home' : page);
        }}
        onAdminLogin={() => {
          void verifyAdmin().then(setAllowed);
        }}
        onLoginSuccess={() => {
          void verifyAdmin().then(setAllowed);
        }}
      />
    );
  }

  return <>{children}</>;
}
