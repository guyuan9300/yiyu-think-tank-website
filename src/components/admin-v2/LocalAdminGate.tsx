import { useEffect, useState, type ReactNode } from 'react';
import { LoginPage } from '../LoginPage';
import { ADMIN_FLAG_KEY, ADMIN_EMAIL_KEY } from '../../lib/storage';

// ============================================================
// admin-v2 · 本地超管 Gate (验收期, 不依赖后端 user 表)
//
// 判断顺序:
//   1. localStorage / sessionStorage 里有 yiyu_is_admin = 'true' → 放行
//   2. yiyu_current_user 解析后 adminRole === 'admin' → 放行 (后端已正经登录)
//   3. yiyu_current_user.email 在白名单里 → 放行 (本地白名单)
//   4. 都没有 → 显示 LoginPage
//
// 部署生产时, 应该把白名单逻辑移到后端 PG users 表 + adminRole 字段,
// 然后用 AdminAccessGate (调 fetchCurrentSession) 替换本组件.
// ============================================================

const ADMIN_EMAIL_WHITELIST = ['guyuan9300@gmail.com', 'guyuan@klngo.org'];

function isLocalAdmin(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    // flag 已写过
    const flag = localStorage.getItem(ADMIN_FLAG_KEY) || sessionStorage.getItem(ADMIN_FLAG_KEY);
    if (flag === 'true') return true;
    // 解析当前 user
    const raw = localStorage.getItem('yiyu_current_user') || sessionStorage.getItem('yiyu_current_user');
    if (!raw) return false;
    const user = JSON.parse(raw);
    if (user?.adminRole === 'admin') return true;
    if (user?.email && ADMIN_EMAIL_WHITELIST.includes(String(user.email).toLowerCase())) {
      // 同步写一次 flag 以便下次直接放行
      try {
        localStorage.setItem(ADMIN_FLAG_KEY, 'true');
        localStorage.setItem(ADMIN_EMAIL_KEY, user.email);
      } catch {}
      return true;
    }
    return false;
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
    setAllowed(isLocalAdmin());
    // 监听 yiyu_user_updated 事件 (登录成功后会触发)
    const recheck = () => setAllowed(isLocalAdmin());
    window.addEventListener('yiyu_user_updated', recheck);
    window.addEventListener('storage', recheck);
    return () => {
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
          // LoginPage 内部已写好 ADMIN_FLAG_KEY, 这里重新校验
          setAllowed(isLocalAdmin());
        }}
        onLoginSuccess={() => {
          // 普通用户登录成功也重新校验 (可能后端返回 adminRole=admin)
          setAllowed(isLocalAdmin());
        }}
      />
    );
  }

  return <>{children}</>;
}
