import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  AlertTriangle,
  Calendar,
  CheckCircle,
  Crown,
  CreditCard,
  Gift,
  RefreshCw,
  Search,
  ShieldCheck,
  User as UserIcon,
  XCircle,
} from 'lucide-react';
import {
  getUsers,
  saveUser,
  updateUserMemberType,
  updateUserStatus,
  type User,
} from '../lib/dataService';

type PaidSourceValue = 'all' | 'manual' | 'invite_code' | 'payment' | 'strategy_client';
type StatusFilter = 'all' | 'active' | 'expiring' | 'expired' | 'disabled';

const SOURCE_META: Record<Exclude<PaidSourceValue, 'all'>, { label: string; badge: string; icon: ReactNode }> = {
  manual: {
    label: '手动开通',
    badge: 'bg-blue-100 text-blue-700',
    icon: <ShieldCheck className="w-3 h-3" />,
  },
  invite_code: {
    label: '邀请码开通',
    badge: 'bg-purple-100 text-purple-700',
    icon: <Gift className="w-3 h-3" />,
  },
  payment: {
    label: '支付开通',
    badge: 'bg-emerald-100 text-emerald-700',
    icon: <CreditCard className="w-3 h-3" />,
  },
  strategy_client: {
    label: '战略客户',
    badge: 'bg-amber-100 text-amber-700',
    icon: <Crown className="w-3 h-3" />,
  },
};

function normalizePaidSource(user: User): Exclude<PaidSourceValue, 'all'> {
  if (user.paidSource) {
    return user.paidSource;
  }
  if (user.invitationCode) {
    return 'invite_code';
  }
  return 'manual';
}

function toDateValue(input?: string) {
  if (!input) return null;
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function isPaid(user: User) {
  return user.memberType !== 'regular';
}

function formatDate(input?: string) {
  const value = toDateValue(input);
  if (!value) return '长期有效';
  return value.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getLifecycle(user: User): StatusFilter {
  if (user.status === 'disabled') return 'disabled';
  const expiresAt = toDateValue(user.paidExpiresAt);
  if (!expiresAt) return 'active';
  const now = Date.now();
  if (expiresAt.getTime() <= now) return 'expired';
  if (expiresAt.getTime() - now <= 30 * 24 * 3600 * 1000) return 'expiring';
  return 'active';
}

export function PaymentManagementPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState<PaidSourceValue>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadUsers = () => {
    setUsers(getUsers());
  };

  useEffect(() => {
    loadUsers();
    const handleDataChange = () => loadUsers();
    window.addEventListener('yiyu_data_change', handleDataChange);
    return () => {
      window.removeEventListener('yiyu_data_change', handleDataChange);
    };
  }, []);

  const paidUsers = useMemo(() => {
    return users.filter((user) => isPaid(user)).filter((user) => {
      const query = searchQuery.trim().toLowerCase();
      const source = normalizePaidSource(user);
      const lifecycle = getLifecycle(user);
      const matchesQuery = !query
        || user.nickname.toLowerCase().includes(query)
        || user.email.toLowerCase().includes(query)
        || user.phone?.includes(query)
        || (user.invitationCode || '').toLowerCase().includes(query);
      const matchesSource = sourceFilter === 'all' || source === sourceFilter;
      const matchesStatus = statusFilter === 'all' || lifecycle === statusFilter;
      return matchesQuery && matchesSource && matchesStatus;
    });
  }, [searchQuery, sourceFilter, statusFilter, users]);

  const stats = useMemo(() => {
    const allPaid = users.filter((user) => isPaid(user));
    return {
      total: allPaid.length,
      expiring: allPaid.filter((user) => getLifecycle(user) === 'expiring').length,
      invite: allPaid.filter((user) => normalizePaidSource(user) === 'invite_code').length,
      disabled: allPaid.filter((user) => user.status === 'disabled').length,
    };
  }, [users]);

  const flash = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    window.setTimeout(() => setMessage(null), 3000);
  };

  const handleExtend = (user: User) => {
    const base = toDateValue(user.paidExpiresAt) || new Date();
    const next = new Date(base.getTime() + 30 * 24 * 3600 * 1000);
    saveUser({
      ...user,
      paidStartedAt: user.paidStartedAt || new Date().toISOString(),
      paidExpiresAt: next.toISOString(),
      paidSource: normalizePaidSource(user),
    });
    flash('success', `已为 ${user.nickname} 顺延 30 天付费资格`);
    loadUsers();
  };

  const handleTogglePaid = (user: User) => {
    const nextType = isPaid(user) ? 'regular' : 'gold';
    const action = nextType === 'regular' ? '转为普通会员' : '开通付费会员';
    if (!window.confirm(`确定要为 ${user.nickname}${action}吗？`)) return;
    updateUserMemberType(user.id, nextType);
    if (nextType === 'regular') {
      saveUser({
        ...user,
        memberType: 'regular',
        paidSource: undefined,
        paidStartedAt: undefined,
        paidExpiresAt: undefined,
      });
    } else {
      saveUser({
        ...user,
        memberType: 'gold',
        paidSource: normalizePaidSource(user),
        paidStartedAt: user.paidStartedAt || new Date().toISOString(),
      });
    }
    flash('success', `${user.nickname} 已${action}`);
    loadUsers();
  };

  const handleToggleStatus = (user: User) => {
    const nextStatus = user.status === 'active' ? 'disabled' : 'active';
    updateUserStatus(user.id, nextStatus);
    flash('success', `${user.nickname} 已${nextStatus === 'active' ? '启用' : '禁用'}`);
    loadUsers();
  };

  return (
    <div className="space-y-6">
      <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-sm font-medium">
              <Crown className="w-4 h-4" />
              付费管理
            </div>
            <h2 className="mt-4 text-2xl font-semibold text-gray-900">当前阶段只管理付费资格，不承载真实订单</h2>
            <p className="mt-2 text-sm text-gray-600 max-w-3xl leading-6">
              这里先聚焦谁已经开通付费、通过什么方式开通、是否即将到期，以及是否需要人工续期。真实支付订单会在支付链路接入腾讯云后的下一步再纳入。
            </p>
          </div>
          <button
            type="button"
            onClick={loadUsers}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            刷新
          </button>
        </div>
      </section>

      {message && (
        <div className={`p-4 rounded-xl flex items-center gap-2 ${
          message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
        }`}>
          {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
          {message.text}
        </div>
      )}

      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
          <p className="text-sm text-gray-500">付费会员总数</p>
          <p className="mt-3 text-3xl font-semibold text-gray-900">{stats.total}</p>
          <p className="mt-2 text-xs text-gray-500">当前被认定为付费会员的账号</p>
        </div>
        <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
          <p className="text-sm text-gray-500">30 天内到期</p>
          <p className="mt-3 text-3xl font-semibold text-amber-600">{stats.expiring}</p>
          <p className="mt-2 text-xs text-gray-500">需要人工跟进续期或转化</p>
        </div>
        <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
          <p className="text-sm text-gray-500">邀请码开通</p>
          <p className="mt-3 text-3xl font-semibold text-purple-600">{stats.invite}</p>
          <p className="mt-2 text-xs text-gray-500">后续会与邀请码管理打通</p>
        </div>
        <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
          <p className="text-sm text-gray-500">已禁用付费账号</p>
          <p className="mt-3 text-3xl font-semibold text-rose-600">{stats.disabled}</p>
          <p className="mt-2 text-xs text-gray-500">账号禁用会覆盖付费资格</p>
        </div>
      </section>

      <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center flex-1">
            <div className="relative flex-1 min-w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索昵称 / 邮箱 / 手机号 / 邀请码"
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value as PaidSourceValue)}
              className="px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
            >
              <option value="all">全部来源</option>
              <option value="manual">手动开通</option>
              <option value="invite_code">邀请码开通</option>
              <option value="payment">支付开通</option>
              <option value="strategy_client">战略客户</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
            >
              <option value="all">全部状态</option>
              <option value="active">正常</option>
              <option value="expiring">即将到期</option>
              <option value="expired">已到期</option>
              <option value="disabled">已禁用</option>
            </select>
          </div>
        </div>
      </section>

      <section className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px]">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">用户</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">联系方式</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">开通来源</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">有效期</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">当前状态</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">备注</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paidUsers.map((user) => {
                const source = normalizePaidSource(user);
                const sourceMeta = SOURCE_META[source];
                const lifecycle = getLifecycle(user);
                const lifecycleMeta = lifecycle === 'disabled'
                  ? { label: '账号已禁用', badge: 'bg-rose-100 text-rose-700', icon: <XCircle className="w-3 h-3" /> }
                  : lifecycle === 'expired'
                    ? { label: '已到期', badge: 'bg-gray-100 text-gray-700', icon: <Calendar className="w-3 h-3" /> }
                    : lifecycle === 'expiring'
                      ? { label: '30 天内到期', badge: 'bg-amber-100 text-amber-700', icon: <AlertTriangle className="w-3 h-3" /> }
                      : { label: '正常生效', badge: 'bg-emerald-100 text-emerald-700', icon: <CheckCircle className="w-3 h-3" /> };

                return (
                  <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-white font-medium flex-shrink-0">
                          {user.nickname.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{user.nickname}</p>
                          <p className="text-sm text-gray-500">ID: {user.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      <div className="space-y-1">
                        <p>{user.email}</p>
                        <p>{user.phone || '-'}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${sourceMeta.badge}`}>
                        {sourceMeta.icon}
                        {sourceMeta.label}
                      </span>
                      {user.invitationCode && (
                        <p className="mt-2 text-xs text-gray-500">邀请码：{user.invitationCode}</p>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      <div className="space-y-1">
                        <p>开始：{formatDate(user.paidStartedAt)}</p>
                        <p>到期：{formatDate(user.paidExpiresAt)}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${lifecycleMeta.badge}`}>
                        {lifecycleMeta.icon}
                        {lifecycleMeta.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {user.paidNote || '暂无备注'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => handleExtend(user)}
                          className="px-3 py-2 rounded-lg border border-amber-200 text-amber-700 hover:bg-amber-50 transition-colors text-sm"
                        >
                          续期 30 天
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(user)}
                          className="px-3 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors text-sm"
                        >
                          {user.status === 'active' ? '禁用账号' : '启用账号'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleTogglePaid(user)}
                          className="px-3 py-2 rounded-lg border border-rose-200 text-rose-700 hover:bg-rose-50 transition-colors text-sm"
                        >
                          转为普通会员
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {paidUsers.length === 0 && (
          <div className="p-12 text-center text-gray-500">
            <UserIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>当前筛选条件下没有付费会员</p>
          </div>
        )}
      </section>
    </div>
  );
}
