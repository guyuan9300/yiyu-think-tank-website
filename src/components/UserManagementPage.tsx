import { useEffect, useMemo, useState } from 'react';
import {
  Ban,
  CheckCircle,
  Crown,
  Eye,
  Mail,
  Phone,
  RefreshCw,
  Search,
  Shield,
  Target,
  User as UserIcon,
} from 'lucide-react';
import { fetchAdminUsers, updateAdminUserStatusApi, type AdminManagedUser } from '../lib/adminUserApi';
import { getAdminRoleMeta, mapStoredMemberTypeToAdminRole } from '../lib/adminRoles';

type StatusFilter = 'all' | 'active' | 'disabled' | 'deactivated';
type BindingFilter = 'all' | 'strategy' | 'unbound';

function sanitizeEmail(email?: string) {
  if (!email || email.endsWith('@phone.local')) return '';
  return email;
}

function hasPhone(user: AdminManagedUser) {
  return Boolean(String(user.phone || '').trim());
}

function hasEmail(user: AdminManagedUser) {
  return Boolean(sanitizeEmail(user.email));
}

function getLoginMethod(user: AdminManagedUser) {
  if (hasPhone(user) && hasEmail(user)) return '手机号 + 邮箱';
  if (hasPhone(user)) return '手机号';
  if (hasEmail(user)) return '邮箱';
  return '未绑定';
}

function formatDate(value?: string) {
  if (!value) return '-';
  return new Date(value).toLocaleString('zh-CN');
}

function formatMemberLabel(user: AdminManagedUser) {
  if (user.adminRole === 'admin') {
    return getAdminRoleMeta('admin');
  }
  return getAdminRoleMeta(mapStoredMemberTypeToAdminRole(user.memberType || 'regular'));
}

export function UserManagementPage() {
  const [users, setUsers] = useState<AdminManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [bindingFilter, setBindingFilter] = useState<BindingFilter>('all');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [detailUser, setDetailUser] = useState<AdminManagedUser | null>(null);

  const loadUsers = async () => {
    setLoading(true);
    const result = await fetchAdminUsers();
    if (result.ok && result.data) {
      setUsers(result.data);
    } else {
      setUsers([]);
      setMessage({ type: 'error', text: result.error || '用户数据加载失败。' });
    }
    setLoading(false);
  };

  useEffect(() => {
    void loadUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const haystack = [user.nickname, user.email, user.phone, user.strategyProjectName].join(' ').toLowerCase();
      if (searchQuery.trim() && !haystack.includes(searchQuery.trim().toLowerCase())) {
        return false;
      }
      if (statusFilter !== 'all' && user.status !== statusFilter) {
        return false;
      }
      if (bindingFilter === 'strategy' && !user.strategyProjectId) {
        return false;
      }
      if (bindingFilter === 'unbound' && user.strategyProjectId) {
        return false;
      }
      return true;
    });
  }, [bindingFilter, searchQuery, statusFilter, users]);

  const stats = useMemo(() => {
    const total = users.length;
    const active = users.filter((user) => user.status === 'active').length;
    const paid = users.filter((user) => user.memberType === 'gold' || user.memberType === 'diamond').length;
    const strategyBound = users.filter((user) => Boolean(user.strategyProjectId)).length;
    return { total, active, paid, strategyBound };
  }, [users]);

  const handleToggleStatus = async (user: AdminManagedUser) => {
    const nextStatus = user.status === 'active' ? 'disabled' : 'active';
    const result = await updateAdminUserStatusApi(user.id, nextStatus);
    if (!result.ok || !result.data?.user) {
      setMessage({ type: 'error', text: result.error || '用户状态更新失败。' });
      return;
    }
    setUsers((prev) => prev.map((item) => (item.id === user.id ? result.data!.user : item)));
    setDetailUser((prev) => (prev?.id === user.id ? result.data!.user : prev));
    setMessage({ type: 'success', text: nextStatus === 'active' ? '账号已启用。' : '账号已禁用。' });
  };

  return (
    <div className="space-y-6">
      {message && (
        <div className={`rounded-2xl border px-4 py-3 text-sm ${message.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-red-50 border-red-100 text-red-700'}`}>
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <div className="text-sm text-gray-500">账号总数</div>
          <div className="mt-2 text-2xl font-semibold text-gray-900">{stats.total}</div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <div className="text-sm text-gray-500">正常账号</div>
          <div className="mt-2 text-2xl font-semibold text-green-600">{stats.active}</div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <div className="text-sm text-gray-500">付费会员</div>
          <div className="mt-2 text-2xl font-semibold text-amber-600">{stats.paid}</div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <div className="text-sm text-gray-500">已绑定机构</div>
          <div className="mt-2 text-2xl font-semibold text-blue-600">{stats.strategyBound}</div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 items-center gap-3 rounded-2xl border border-gray-200 px-4 py-3">
            <Search className="w-4 h-4 text-gray-400" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索昵称、邮箱、手机号或机构名称"
              className="flex-1 outline-none text-sm"
            />
          </div>
          <div className="flex flex-wrap gap-3">
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as StatusFilter)} className="px-4 py-3 rounded-2xl border border-gray-200 text-sm bg-white">
              <option value="all">全部状态</option>
              <option value="active">正常</option>
              <option value="disabled">已禁用</option>
              <option value="deactivated">已注销</option>
            </select>
            <select value={bindingFilter} onChange={(e) => setBindingFilter(e.target.value as BindingFilter)} className="px-4 py-3 rounded-2xl border border-gray-200 text-sm bg-white">
              <option value="all">全部机构状态</option>
              <option value="strategy">已绑定机构</option>
              <option value="unbound">未绑定机构</option>
            </select>
            <button onClick={() => void loadUsers()} className="inline-flex items-center gap-2 px-4 py-3 rounded-2xl border border-gray-200 text-sm hover:bg-gray-50">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              刷新
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px]">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">用户</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">身份</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">绑定信息</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">战略陪伴</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">最近登录</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">状态</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredUsers.map((user) => {
                const roleMeta = formatMemberLabel(user);
                const isDisabled = user.status !== 'active';
                return (
                  <tr key={user.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="px-6 py-4 align-top">
                      <div className="space-y-1">
                        <div className="font-medium text-gray-900">{user.nickname || '未命名用户'}</div>
                        <div className="text-sm text-gray-500">{user.id}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 align-top">
                      <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${roleMeta.badgeClass}`}>
                        {user.adminRole === 'admin' ? <Shield className="w-3 h-3" /> : user.memberType === 'gold' || user.memberType === 'diamond' ? <Crown className="w-3 h-3" /> : <UserIcon className="w-3 h-3" />}
                        {roleMeta.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 align-top text-sm text-gray-600">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-gray-400" />{user.phone || '未绑定手机号'}</div>
                        <div className="flex items-center gap-2"><Mail className="w-3.5 h-3.5 text-gray-400" />{sanitizeEmail(user.email) || '未绑定邮箱'}</div>
                        <div className="text-xs text-gray-500">登录方式：{getLoginMethod(user)}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 align-top text-sm text-gray-600">
                      {user.strategyProjectId ? (
                        <div className="space-y-1">
                          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 text-xs font-medium">
                            <Target className="w-3 h-3" />
                            已绑定机构
                          </div>
                          <div>{user.strategyProjectName || '已绑定机构'}</div>
                          <div className="text-xs text-gray-500">来源：{user.strategyAccessSource || 'invite_code'}</div>
                          <div className="text-xs text-gray-500">时间：{formatDate(user.strategyBoundAt)}</div>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">未绑定机构</span>
                      )}
                    </td>
                    <td className="px-6 py-4 align-top text-sm text-gray-600">{formatDate(user.lastLoginAt)}</td>
                    <td className="px-6 py-4 align-top">
                      <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${user.status === 'active' ? 'bg-green-100 text-green-700' : user.status === 'disabled' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>
                        {user.status === 'active' ? <CheckCircle className="w-3 h-3" /> : <Ban className="w-3 h-3" />}
                        {user.status === 'active' ? '正常' : user.status === 'disabled' ? '已禁用' : '已注销'}
                      </span>
                    </td>
                    <td className="px-6 py-4 align-top">
                      <div className="flex items-center gap-2">
                        <button onClick={() => setDetailUser(user)} className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-gray-200 text-sm hover:bg-gray-50">
                          <Eye className="w-4 h-4" />
                          查看
                        </button>
                        {user.status !== 'deactivated' && (
                          <button onClick={() => void handleToggleStatus(user)} className={`inline-flex items-center gap-1 px-3 py-2 rounded-xl text-sm ${isDisabled ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-red-50 text-red-700 hover:bg-red-100'}`}>
                            {isDisabled ? <CheckCircle className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                            {isDisabled ? '启用' : '禁用'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {!loading && filteredUsers.length === 0 && (
          <div className="p-12 text-center text-gray-500">当前筛选条件下暂无用户。</div>
        )}
      </div>

      {detailUser && (
        <div className="fixed inset-0 bg-black/45 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{detailUser.nickname || '未命名用户'}</h3>
                <p className="text-sm text-gray-500 mt-1">{detailUser.id}</p>
              </div>
              <button onClick={() => setDetailUser(null)} className="px-4 py-2 rounded-2xl border border-gray-200 text-sm hover:bg-gray-50">关闭</button>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="rounded-2xl border border-gray-100 p-4">
                <div className="text-xs text-gray-500 mb-2">邮箱</div>
                <div>{sanitizeEmail(detailUser.email) || '未绑定邮箱'}</div>
              </div>
              <div className="rounded-2xl border border-gray-100 p-4">
                <div className="text-xs text-gray-500 mb-2">手机号</div>
                <div>{detailUser.phone || '未绑定手机号'}</div>
              </div>
              <div className="rounded-2xl border border-gray-100 p-4">
                <div className="text-xs text-gray-500 mb-2">当前身份</div>
                <div>{formatMemberLabel(detailUser).label}</div>
              </div>
              <div className="rounded-2xl border border-gray-100 p-4">
                <div className="text-xs text-gray-500 mb-2">账号状态</div>
                <div>{detailUser.status === 'active' ? '正常' : detailUser.status === 'disabled' ? '已禁用' : '已注销'}</div>
              </div>
              <div className="rounded-2xl border border-gray-100 p-4">
                <div className="text-xs text-gray-500 mb-2">付费到期时间</div>
                <div>{detailUser.paidExpiresAt ? formatDate(detailUser.paidExpiresAt) : (detailUser.memberType === 'gold' || detailUser.memberType === 'diamond' ? '长期有效' : '未开通')}</div>
              </div>
              <div className="rounded-2xl border border-gray-100 p-4">
                <div className="text-xs text-gray-500 mb-2">邀请码</div>
                <div>{detailUser.invitationCode || '未使用邀请码'}</div>
              </div>
              <div className="rounded-2xl border border-gray-100 p-4 md:col-span-2">
                <div className="text-xs text-gray-500 mb-2">战略陪伴绑定</div>
                <div>{detailUser.strategyProjectName || '未绑定机构'}</div>
                {detailUser.strategyProjectId ? (
                  <div className="mt-2 text-xs text-gray-500">绑定来源：{detailUser.strategyAccessSource || 'invite_code'}，绑定时间：{formatDate(detailUser.strategyBoundAt)}</div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
