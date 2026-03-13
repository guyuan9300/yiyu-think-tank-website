import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  AlertTriangle,
  Calendar,
  CheckCircle,
  Crown,
  CreditCard,
  Gift,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
  User as UserIcon,
  Wallet,
  XCircle,
} from 'lucide-react';
import {
  extendAdminUserPaidApi,
  fetchAdminUsers,
  setAdminUserPaidApi,
  updateAdminUserStatusApi,
  type AdminManagedUser,
} from '../lib/adminUserApi';
import {
  fetchAdminPaymentOrders,
  fetchPaymentReadiness,
  type PaymentOrder,
  type PaymentReadiness,
} from '../lib/paymentApi';

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

const ORDER_STATUS_META: Record<string, { label: string; badge: string }> = {
  awaiting_configuration: { label: '待补齐配置', badge: 'bg-slate-100 text-slate-700' },
  awaiting_provider_integration: { label: '待接支付', badge: 'bg-blue-100 text-blue-700' },
  pending: { label: '待支付', badge: 'bg-amber-100 text-amber-700' },
  paid: { label: '已支付', badge: 'bg-emerald-100 text-emerald-700' },
  expired: { label: '已过期', badge: 'bg-rose-100 text-rose-700' },
  closed: { label: '已关闭', badge: 'bg-slate-100 text-slate-700' },
};

function normalizePaidSource(user: AdminManagedUser): Exclude<PaidSourceValue, 'all'> {
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

function isPaid(user: AdminManagedUser) {
  return user.adminRole !== 'admin' && user.memberType !== 'regular';
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

function getLifecycle(user: AdminManagedUser): StatusFilter {
  if (user.status === 'disabled') return 'disabled';
  const expiresAt = toDateValue(user.paidExpiresAt);
  if (!expiresAt) return 'active';
  const now = Date.now();
  if (expiresAt.getTime() <= now) return 'expired';
  if (expiresAt.getTime() - now <= 30 * 24 * 3600 * 1000) return 'expiring';
  return 'active';
}

function getOrderStatusMeta(status: string) {
  return ORDER_STATUS_META[status] || { label: status || '未知状态', badge: 'bg-slate-100 text-slate-700' };
}

export function PaymentManagementPage() {
  const [users, setUsers] = useState<AdminManagedUser[]>([]);
  const [orders, setOrders] = useState<PaymentOrder[]>([]);
  const [readiness, setReadiness] = useState<PaymentReadiness | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState<PaidSourceValue>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const flash = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    window.setTimeout(() => setMessage(null), 3000);
  };

  const loadData = async (background = false) => {
    if (background) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    const [usersResult, readinessResult, ordersResult] = await Promise.all([
      fetchAdminUsers(),
      fetchPaymentReadiness(),
      fetchAdminPaymentOrders(12),
    ]);

    if (usersResult.ok && usersResult.data) {
      setUsers(usersResult.data);
    } else {
      setUsers([]);
    }

    if (readinessResult.ok && readinessResult.data) {
      setReadiness(readinessResult.data);
    } else {
      setReadiness(null);
    }

    if (ordersResult.ok && ordersResult.data) {
      setOrders(ordersResult.data);
    } else {
      setOrders([]);
    }

    const error = usersResult.error || readinessResult.error || ordersResult.error;
    if (error) {
      flash('error', error);
    }

    setIsLoading(false);
    setIsRefreshing(false);
  };

  useEffect(() => {
    void loadData();
  }, []);

  const paidUsers = useMemo(() => {
    return users
      .filter((user) => isPaid(user))
      .filter((user) => {
        const query = searchQuery.trim().toLowerCase();
        const source = normalizePaidSource(user);
        const lifecycle = getLifecycle(user);
        const nickname = user.nickname || '';
        const matchesQuery = !query
          || nickname.toLowerCase().includes(query)
          || (user.email || '').toLowerCase().includes(query)
          || user.phone?.includes(query)
          || (user.invitationCode || '').toLowerCase().includes(query)
          || (user.paidNote || '').toLowerCase().includes(query);
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

  const handleExtend = async (user: AdminManagedUser) => {
    const result = await extendAdminUserPaidApi(user.id, 30);
    if (!result.ok) {
      flash('error', result.error || '续期失败，请稍后重试');
      return;
    }
    flash('success', `已为 ${user.nickname || '该用户'} 顺延 30 天付费资格`);
    await loadData(true);
  };

  const handleTogglePaid = async (user: AdminManagedUser) => {
    if (!window.confirm(`确定要将 ${user.nickname} 转为普通会员吗？`)) return;
    const result = await setAdminUserPaidApi(user.id, { enabled: false });
    if (!result.ok) {
      flash('error', result.error || '操作失败，请稍后重试');
      return;
    }
    flash('success', `${user.nickname} 已转为普通会员`);
    await loadData(true);
  };

  const handleToggleStatus = async (user: AdminManagedUser) => {
    const nextStatus = user.status === 'active' ? 'disabled' : 'active';
    const result = await updateAdminUserStatusApi(user.id, nextStatus);
    if (!result.ok) {
      flash('error', result.error || '状态更新失败，请稍后重试');
      return;
    }
    flash('success', `${user.nickname} 已${nextStatus === 'active' ? '启用' : '禁用'}`);
    await loadData(true);
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center text-gray-500">
        <Loader2 className="w-8 h-8 mx-auto mb-3 animate-spin" />
        <p>正在加载付费管理数据...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-sm font-medium">
              <Crown className="w-4 h-4" />
              付费管理
            </div>
            <h2 className="mt-4 text-2xl font-semibold text-gray-900">付费会员与支付接入状态</h2>
            <p className="mt-2 text-sm text-gray-600 max-w-3xl leading-6">
              查看付费会员资格、开通来源、到期节奏，以及支付接入所需的关键配置与订单记录。
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loadData(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
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
          <p className="mt-2 text-xs text-gray-500">当前处于付费资格中的账号</p>
        </div>
        <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
          <p className="text-sm text-gray-500">30 天内到期</p>
          <p className="mt-3 text-3xl font-semibold text-amber-600">{stats.expiring}</p>
          <p className="mt-2 text-xs text-gray-500">建议优先跟进续期</p>
        </div>
        <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
          <p className="text-sm text-gray-500">邀请码开通</p>
          <p className="mt-3 text-3xl font-semibold text-purple-600">{stats.invite}</p>
          <p className="mt-2 text-xs text-gray-500">通过邀请码获得付费资格</p>
        </div>
        <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
          <p className="text-sm text-gray-500">已禁用付费账号</p>
          <p className="mt-3 text-3xl font-semibold text-rose-600">{stats.disabled}</p>
          <p className="mt-2 text-xs text-gray-500">账号状态会覆盖付费资格</p>
        </div>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-[1.2fr_1fr] gap-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 text-sm font-medium text-gray-600">
                <Wallet className="w-4 h-4" />
                支付接入状态
              </div>
              <h3 className="mt-3 text-xl font-semibold text-gray-900">
                {readiness?.enabled ? '支付参数已齐备' : '支付参数待补齐'}
              </h3>
              <p className="mt-2 text-sm text-gray-600">
                当前后台已经记录支付订单与配置项，待微信支付商户参数齐备后即可继续联调。
              </p>
            </div>
            <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${
              readiness?.enabled ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
            }`}>
              {readiness?.enabled ? <CheckCircle className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
              {readiness?.enabled ? '可继续接入' : '待配置'}
            </span>
          </div>

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
              <p className="text-xs text-gray-500">已配置项</p>
              <p className="mt-2 text-2xl font-semibold text-gray-900">
                {readiness ? readiness.items.filter((item) => item.configured).length : 0}
                <span className="ml-1 text-sm font-normal text-gray-500">/ {readiness?.items.length || 0}</span>
              </p>
            </div>
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
              <p className="text-xs text-gray-500">待处理订单</p>
              <p className="mt-2 text-2xl font-semibold text-gray-900">{readiness?.openOrders || 0}</p>
            </div>
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
              <p className="text-xs text-gray-500">已支付订单</p>
              <p className="mt-2 text-2xl font-semibold text-gray-900">{readiness?.paidOrders || 0}</p>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(readiness?.items || []).map((item) => (
              <div
                key={item.key}
                className={`rounded-xl border px-4 py-3 flex items-center justify-between ${
                  item.configured ? 'border-emerald-100 bg-emerald-50' : 'border-amber-100 bg-amber-50'
                }`}
              >
                <span className="text-sm text-gray-700">{item.label}</span>
                <span className={`inline-flex items-center gap-1 text-xs font-medium ${
                  item.configured ? 'text-emerald-700' : 'text-amber-700'
                }`}>
                  {item.configured ? <CheckCircle className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                  {item.configured ? '已配置' : '待配置'}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-600">
            <CreditCard className="w-4 h-4" />
            最近订单
          </div>
          <div className="mt-4 space-y-3">
            {orders.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-200 px-4 py-8 text-center text-sm text-gray-500">
                暂无支付订单
              </div>
            ) : (
              orders.map((order) => {
                const statusMeta = getOrderStatusMeta(order.status);
                return (
                  <div key={order.id} className="rounded-xl border border-gray-100 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-gray-900">{order.planName}</p>
                        <p className="mt-1 text-xs text-gray-500">订单号：{order.orderNo}</p>
                      </div>
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${statusMeta.badge}`}>
                        {statusMeta.label}
                      </span>
                    </div>
                    <div className="mt-3 text-sm text-gray-600 space-y-1">
                      <p>用户：{order.userNickname || '未命名用户'}</p>
                      <p>金额：¥{order.amount.toFixed(2)}</p>
                      <p>创建时间：{formatDate(order.createdAt)}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
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
                placeholder="搜索昵称 / 邮箱 / 手机号 / 邀请码 / 备注"
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
                          {(user.nickname || '会').charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{user.nickname || '未命名用户'}</p>
                          <p className="text-sm text-gray-500">ID: {user.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      <div className="space-y-1">
                        <p>{user.email || '-'}</p>
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
                          onClick={() => void handleExtend(user)}
                          className="px-3 py-2 rounded-lg border border-amber-200 text-amber-700 hover:bg-amber-50 transition-colors text-sm"
                        >
                          续期 30 天
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleToggleStatus(user)}
                          className="px-3 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors text-sm"
                        >
                          {user.status === 'active' ? '禁用账号' : '启用账号'}
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleTogglePaid(user)}
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
