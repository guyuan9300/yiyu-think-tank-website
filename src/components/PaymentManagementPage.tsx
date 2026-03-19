import { useEffect, useMemo, useState } from 'react';
import {
  Calendar,
  CheckCircle,
  Crown,
  Download,
  Loader2,
  RefreshCw,
  Search,
  User as UserIcon,
} from 'lucide-react';
import {
  fetchAdminUsers,
  type AdminManagedUser,
} from '../lib/adminUserApi';
import {
  fetchAdminPaymentOrders,
  type PaymentOrder,
} from '../lib/paymentApi';

type CycleFilter = 'all' | 'monthly' | 'yearly' | 'other';
type BillStatusFilter = 'all' | 'receivable' | 'paid' | 'completed';

function toDateValue(input?: string) {
  if (!input) return null;
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function isPaid(user: AdminManagedUser) {
  return user.adminRole !== 'admin' && user.memberType !== 'regular';
}

function formatDate(input?: string, fallback = '长期有效') {
  const value = toDateValue(input);
  if (!value) return fallback;
  return value.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatMoney(fen = 0) {
  return `¥${(fen / 100).toFixed(2)}`;
}

function sanitizeEmail(email?: string) {
  if (!email || email.endsWith('@phone.local')) return '';
  return email;
}

function getOpenAmountFen(orders: PaymentOrder[]) {
  return orders
    .filter((order) => order.status === 'pending')
    .reduce((sum, order) => sum + order.amountFen, 0);
}

function getOrderStatusMeta(order?: PaymentOrder) {
  if (!order) {
    return { label: '已开通', badgeClass: 'bg-slate-100 text-slate-700' };
  }
  if (order.status === 'paid') {
    return { label: '已支付', badgeClass: 'bg-emerald-100 text-emerald-700' };
  }
  if (order.status === 'pending') {
    return { label: '待支付', badgeClass: 'bg-amber-100 text-amber-700' };
  }
  if (order.status === 'expired') {
    return { label: '已失效', badgeClass: 'bg-slate-100 text-slate-700' };
  }
  if (order.status === 'closed') {
    return { label: '已关闭', badgeClass: 'bg-slate-100 text-slate-700' };
  }
  return { label: order.status || '未知', badgeClass: 'bg-slate-100 text-slate-700' };
}

function inferCycle(user: AdminManagedUser, latestOrder?: PaymentOrder) {
  if (latestOrder?.planId === 'monthly_trial') {
    return { key: 'monthly' as const, label: '月卡', amountFen: latestOrder.amountFen };
  }
  if (latestOrder?.planId === 'yearly') {
    return { key: 'yearly' as const, label: '年卡', amountFen: latestOrder.amountFen };
  }
  if (user.paidSource === 'strategy_client') {
    return { key: 'other' as const, label: '战略客户', amountFen: 0 };
  }

  const startedAt = toDateValue(user.paidStartedAt);
  const expiresAt = toDateValue(user.paidExpiresAt);
  if (startedAt && expiresAt) {
    const diffDays = Math.round((expiresAt.getTime() - startedAt.getTime()) / (24 * 60 * 60 * 1000));
    if (diffDays <= 45) {
      return { key: 'monthly' as const, label: '月卡', amountFen: 0 };
    }
    if (diffDays <= 400) {
      return { key: 'yearly' as const, label: '年卡', amountFen: 0 };
    }
  }

  if (user.paidExpiresAt) {
    return { key: 'other' as const, label: '其他', amountFen: 0 };
  }
  return { key: 'other' as const, label: '长期', amountFen: 0 };
}

function exportPaymentCsv(rows: Array<{
  nickname: string;
  phone: string;
  email: string;
  cycleLabel: string;
  amountFen: number;
  expiresAt?: string;
  orderStatusLabel: string;
  note: string;
}>) {
  const header = ['用户', '手机号', '邮箱', '会员周期', '应收金额', '到期时间', '订单状态', '备注'];
  const lines = rows.map((row) => [
    row.nickname,
    row.phone,
    row.email,
    row.cycleLabel,
    formatMoney(row.amountFen),
    formatDate(row.expiresAt, '-'),
    row.orderStatusLabel,
    row.note,
  ]);

  const csv = [header, ...lines]
    .map((line) => line.map((cell) => `"${String(cell || '').replace(/"/g, '""')}"`).join(','))
    .join('\n');

  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `益语付费管理_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function PaymentManagementPage() {
  const [users, setUsers] = useState<AdminManagedUser[]>([]);
  const [orders, setOrders] = useState<PaymentOrder[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [cycleFilter, setCycleFilter] = useState<CycleFilter>('all');
  const [billStatusFilter, setBillStatusFilter] = useState<BillStatusFilter>('all');
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

    const [usersResult, ordersResult] = await Promise.all([
      fetchAdminUsers(),
      fetchAdminPaymentOrders(200),
    ]);

    if (usersResult.ok && usersResult.data) {
      setUsers(usersResult.data);
    } else {
      setUsers([]);
    }

    if (ordersResult.ok && ordersResult.data) {
      setOrders(ordersResult.data);
    } else {
      setOrders([]);
    }

    const error = usersResult.error || ordersResult.error;
    if (error) {
      flash('error', error);
    }

    setIsLoading(false);
    setIsRefreshing(false);
  };

  useEffect(() => {
    void loadData();
  }, []);

  const latestOrderByUserId = useMemo(() => {
    const map = new Map<string, PaymentOrder>();
    for (const order of orders) {
      if (!order.userId || map.has(order.userId)) continue;
      map.set(order.userId, order);
    }
    return map;
  }, [orders]);

  const paidRows = useMemo(() => {
    return users
      .filter((user) => isPaid(user))
      .map((user) => {
        const latestOrder = latestOrderByUserId.get(user.id);
        const cycle = inferCycle(user, latestOrder);
        const statusMeta = getOrderStatusMeta(latestOrder);
        const openAmountFen = latestOrder && latestOrder.status === 'pending'
          ? latestOrder.amountFen
          : 0;
        return {
          user,
          latestOrder,
          cycle,
          statusMeta,
          openAmountFen,
        };
      })
      .filter(({ user, cycle, latestOrder, statusMeta }) => {
        const query = searchQuery.trim().toLowerCase();
        const haystack = [
          user.nickname,
          user.email,
          user.phone,
          user.paidNote,
          latestOrder?.orderNo,
        ].join(' ').toLowerCase();
        if (query && !haystack.includes(query)) {
          return false;
        }
        if (cycleFilter !== 'all' && cycle.key !== cycleFilter) {
          return false;
        }
        if (billStatusFilter === 'receivable' && statusMeta.label !== '待支付') {
          return false;
        }
        if (billStatusFilter === 'paid' && statusMeta.label !== '已支付') {
          return false;
        }
        if (billStatusFilter === 'completed' && !['已支付', '已开通'].includes(statusMeta.label)) {
          return false;
        }
        return true;
      });
  }, [billStatusFilter, cycleFilter, latestOrderByUserId, searchQuery, users]);

  const stats = useMemo(() => {
    const allPaidRows = users.filter((user) => isPaid(user)).map((user) => {
      const latestOrder = latestOrderByUserId.get(user.id);
      return inferCycle(user, latestOrder);
    });
    return {
      total: allPaidRows.length,
      monthly: allPaidRows.filter((item) => item.key === 'monthly').length,
      yearly: allPaidRows.filter((item) => item.key === 'yearly').length,
      receivableFen: getOpenAmountFen(orders),
    };
  }, [latestOrderByUserId, orders, users]);

  const handleExport = () => {
    if (paidRows.length === 0) {
      flash('error', '当前没有可导出的付费记录');
      return;
    }
    exportPaymentCsv(
      paidRows.map(({ user, cycle, openAmountFen, latestOrder, statusMeta }) => ({
        nickname: user.nickname || '未命名用户',
        phone: user.phone || '',
        email: sanitizeEmail(user.email) || '',
        cycleLabel: cycle.label,
        amountFen: openAmountFen || cycle.amountFen,
        expiresAt: user.paidExpiresAt,
        orderStatusLabel: statusMeta.label,
        note: latestOrder?.note || user.paidNote || '',
      }))
    );
    flash('success', `已导出 ${paidRows.length} 条付费记录。`);
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
      {message && (
        <div className={`p-4 rounded-xl flex items-center gap-2 ${
          message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
        }`}>
          {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <Calendar className="w-5 h-5" />}
          {message.text}
        </div>
      )}

      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
          <p className="text-sm text-gray-500">付费会员总数</p>
          <p className="mt-3 text-3xl font-semibold text-gray-900">{stats.total}</p>
        </div>
        <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
          <p className="text-sm text-gray-500">月卡会员总数</p>
          <p className="mt-3 text-3xl font-semibold text-amber-600">{stats.monthly}</p>
        </div>
        <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
          <p className="text-sm text-gray-500">年卡会员总数</p>
          <p className="mt-3 text-3xl font-semibold text-blue-600">{stats.yearly}</p>
        </div>
        <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
          <p className="text-sm text-gray-500">应收款总金额</p>
          <p className="mt-3 text-3xl font-semibold text-emerald-600">{formatMoney(stats.receivableFen)}</p>
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
                placeholder="搜索昵称 / 邮箱 / 手机号 / 订单号 / 备注"
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <select
              value={cycleFilter}
              onChange={(e) => setCycleFilter(e.target.value as CycleFilter)}
              className="px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
            >
              <option value="all">全部周期</option>
              <option value="monthly">月卡</option>
              <option value="yearly">年卡</option>
              <option value="other">其他</option>
            </select>
            <select
              value={billStatusFilter}
              onChange={(e) => setBillStatusFilter(e.target.value as BillStatusFilter)}
              className="px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
            >
              <option value="all">全部状态</option>
              <option value="receivable">待支付</option>
              <option value="paid">已支付</option>
              <option value="completed">已开通</option>
            </select>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleExport}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Download className="w-4 h-4" />
              导出对账单
            </button>
            <button
              type="button"
              onClick={() => void loadData(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              刷新
            </button>
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
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">会员周期</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">金额</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">下单时间</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">支付时间</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">到期时间</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">订单状态</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">备注</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paidRows.map(({ user, cycle, openAmountFen, latestOrder, statusMeta }) => (
                <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-white font-medium flex-shrink-0">
                        {(user.nickname || '会').charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{user.nickname || '未命名用户'}</p>
                        <p className="text-sm text-gray-500">{user.paidSource === 'strategy_client' ? '战略客户' : '付费会员'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    <div className="space-y-1">
                      <p>{sanitizeEmail(user.email) || '-'}</p>
                      <p>{user.phone || '-'}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${
                      cycle.key === 'monthly'
                        ? 'bg-amber-100 text-amber-700'
                        : cycle.key === 'yearly'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-slate-100 text-slate-700'
                    }`}>
                      <Crown className="w-3 h-3" />
                      {cycle.label}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{openAmountFen || cycle.amountFen ? formatMoney(openAmountFen || cycle.amountFen) : '—'}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{latestOrder?.createdAt ? formatDate(latestOrder.createdAt, '-') : '-'}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{latestOrder?.paidAt ? formatDate(latestOrder.paidAt, '-') : '-'}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{formatDate(user.paidExpiresAt)}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${statusMeta.badgeClass}`}>
                      {statusMeta.label}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {latestOrder?.buyerNote || latestOrder?.note || user.paidNote || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {paidRows.length === 0 && (
          <div className="p-12 text-center text-gray-500">
            <UserIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>当前筛选条件下没有付费记录</p>
          </div>
        )}
      </section>
    </div>
  );
}
