import { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle,
  Crown,
  Download,
  Eye,
  Mail,
  Phone,
  RefreshCw,
  Search,
  Shield,
  Target,
  User as UserIcon,
} from 'lucide-react';
import { fetchAdminUsers, type AdminManagedUser } from '../lib/adminUserApi';
import { getAdminRoleMeta, mapStoredMemberTypeToAdminRole } from '../lib/adminRoles';

type ActivityFilter = 'all' | 'active' | 'inactive';
type InstitutionFilter = 'all' | 'unbound' | string;

const ACTIVE_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

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

function formatDate(value?: string, fallback = '-') {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return date.toLocaleString('zh-CN');
}

function formatShortDate(value?: string) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('zh-CN');
}

function isRecentlyActive(user: AdminManagedUser) {
  if (!user.lastLoginAt) return false;
  const lastLoginAt = new Date(user.lastLoginAt);
  if (Number.isNaN(lastLoginAt.getTime())) return false;
  return Date.now() - lastLoginAt.getTime() <= ACTIVE_WINDOW_MS;
}

function formatMemberLabel(user: AdminManagedUser) {
  if (user.adminRole === 'admin') {
    return getAdminRoleMeta('admin');
  }
  return getAdminRoleMeta(mapStoredMemberTypeToAdminRole(user.memberType || 'regular'));
}

function isPaidUser(user: AdminManagedUser) {
  return user.adminRole !== 'admin' && user.memberType !== 'regular';
}

function getActivityMeta(user: AdminManagedUser) {
  if (isRecentlyActive(user)) {
    return {
      label: '活跃',
      badgeClass: 'bg-emerald-100 text-emerald-700',
    };
  }
  return {
    label: '不活跃',
    badgeClass: 'bg-slate-100 text-slate-700',
  };
}

function exportUsersCsv(rows: AdminManagedUser[]) {
  const header = ['昵称', '身份', '机构', '最近登录', '活跃状态', '手机号', '邮箱'];
  const lines = rows.map((user) => {
    const roleMeta = formatMemberLabel(user);
    const activity = getActivityMeta(user);
    return [
      user.nickname || '未命名用户',
      roleMeta.label,
      user.strategyProjectName || '未绑定机构',
      formatDate(user.lastLoginAt),
      activity.label,
      user.phone || '',
      sanitizeEmail(user.email) || '',
    ];
  });

  const csv = [header, ...lines]
    .map((row) => row.map((cell) => `"${String(cell || '').replace(/"/g, '""')}"`).join(','))
    .join('\n');

  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `益语用户列表_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function UserManagementPage() {
  const [users, setUsers] = useState<AdminManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activityFilter, setActivityFilter] = useState<ActivityFilter>('all');
  const [institutionFilter, setInstitutionFilter] = useState<InstitutionFilter>('all');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
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

  const institutionOptions = useMemo(() => {
    return Array.from(
      new Set(
        users
          .map((user) => String(user.strategyProjectName || '').trim())
          .filter(Boolean)
      )
    ).sort((a, b) => a.localeCompare(b, 'zh-CN'));
  }, [users]);

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const haystack = [
        user.nickname,
        user.email,
        user.phone,
        user.strategyProjectName,
      ].join(' ').toLowerCase();
      if (searchQuery.trim() && !haystack.includes(searchQuery.trim().toLowerCase())) {
        return false;
      }

      const isActive = isRecentlyActive(user);
      if (activityFilter === 'active' && !isActive) {
        return false;
      }
      if (activityFilter === 'inactive' && isActive) {
        return false;
      }

      if (institutionFilter === 'unbound' && user.strategyProjectId) {
        return false;
      }
      if (institutionFilter !== 'all' && institutionFilter !== 'unbound' && user.strategyProjectName !== institutionFilter) {
        return false;
      }

      return true;
    });
  }, [activityFilter, institutionFilter, searchQuery, users]);

  const stats = useMemo(() => {
    return {
      total: users.length,
      active: users.filter((user) => isRecentlyActive(user)).length,
      paid: users.filter((user) => isPaidUser(user)).length,
      strategyBound: users.filter((user) => Boolean(user.strategyProjectId)).length,
    };
  }, [users]);

  const selectedUsers = useMemo(() => {
    return filteredUsers.filter((user) => selectedUserIds.includes(user.id));
  }, [filteredUsers, selectedUserIds]);

  const allFilteredSelected = filteredUsers.length > 0 && filteredUsers.every((user) => selectedUserIds.includes(user.id));

  const handleToggleSelectAll = () => {
    if (allFilteredSelected) {
      setSelectedUserIds((prev) => prev.filter((id) => !filteredUsers.some((user) => user.id === id)));
      return;
    }
    setSelectedUserIds((prev) => Array.from(new Set([...prev, ...filteredUsers.map((user) => user.id)])));
  };

  const handleToggleSelectUser = (userId: string) => {
    setSelectedUserIds((prev) => (
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    ));
  };

  const handleExport = () => {
    const rows = selectedUsers.length > 0 ? selectedUsers : filteredUsers;
    if (rows.length === 0) {
      setMessage({ type: 'error', text: '当前没有可导出的用户。' });
      return;
    }
    exportUsersCsv(rows);
    setMessage({
      type: 'success',
      text: selectedUsers.length > 0 ? `已导出 ${selectedUsers.length} 位用户。` : `已导出当前筛选结果，共 ${filteredUsers.length} 位用户。`,
    });
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
          <div className="text-sm text-gray-500">活跃用户</div>
          <div className="mt-2 text-2xl font-semibold text-emerald-600">{stats.active}</div>
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
            <select value={activityFilter} onChange={(e) => setActivityFilter(e.target.value as ActivityFilter)} className="px-4 py-3 rounded-2xl border border-gray-200 text-sm bg-white">
              <option value="all">全部活跃状态</option>
              <option value="active">活跃</option>
              <option value="inactive">不活跃</option>
            </select>
            <select value={institutionFilter} onChange={(e) => setInstitutionFilter(e.target.value as InstitutionFilter)} className="px-4 py-3 rounded-2xl border border-gray-200 text-sm bg-white">
              <option value="all">全部机构</option>
              <option value="unbound">未绑定机构</option>
              {institutionOptions.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
            <button onClick={handleExport} className="inline-flex items-center gap-2 px-4 py-3 rounded-2xl border border-gray-200 text-sm hover:bg-gray-50">
              <Download className="w-4 h-4" />
              {selectedUserIds.length > 0 ? `导出所选 (${selectedUserIds.length})` : '导出名单'}
            </button>
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
                <th className="px-4 py-4 text-left">
                  <input
                    type="checkbox"
                    checked={allFilteredSelected}
                    onChange={handleToggleSelectAll}
                    className="w-4 h-4 rounded border-gray-300"
                    aria-label="全选当前筛选结果"
                  />
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">用户</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">身份</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">机构</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">最近登录</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">状态</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredUsers.map((user) => {
                const roleMeta = formatMemberLabel(user);
                const activityMeta = getActivityMeta(user);
                return (
                  <tr key={user.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="px-4 py-4 align-top">
                      <input
                        type="checkbox"
                        checked={selectedUserIds.includes(user.id)}
                        onChange={() => handleToggleSelectUser(user.id)}
                        className="w-4 h-4 rounded border-gray-300"
                        aria-label={`选择用户 ${user.nickname || user.id}`}
                      />
                    </td>
                    <td className="px-6 py-4 align-top">
                      <div className="font-medium text-gray-900">{user.nickname || '未命名用户'}</div>
                    </td>
                    <td className="px-6 py-4 align-top">
                      <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${roleMeta.badgeClass}`}>
                        {user.adminRole === 'admin' ? <Shield className="w-3 h-3" /> : isPaidUser(user) ? <Crown className="w-3 h-3" /> : <UserIcon className="w-3 h-3" />}
                        {roleMeta.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 align-top text-sm text-gray-600">
                      {user.strategyProjectName ? (
                        <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 text-xs font-medium">
                          <Target className="w-3 h-3" />
                          {user.strategyProjectName}
                        </span>
                      ) : (
                        <span className="text-gray-400">未绑定机构</span>
                      )}
                    </td>
                    <td className="px-6 py-4 align-top text-sm text-gray-600">{formatDate(user.lastLoginAt)}</td>
                    <td className="px-6 py-4 align-top">
                      <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${activityMeta.badgeClass}`}>
                        <CheckCircle className="w-3 h-3" />
                        {activityMeta.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 align-top">
                      <button onClick={() => setDetailUser(user)} className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-gray-200 text-sm hover:bg-gray-50">
                        <Eye className="w-4 h-4" />
                        查看
                      </button>
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
                <div className="text-xs text-gray-500 mb-2">当前身份</div>
                <div>{formatMemberLabel(detailUser).label}</div>
              </div>
              <div className="rounded-2xl border border-gray-100 p-4">
                <div className="text-xs text-gray-500 mb-2">账号状态</div>
                <div>{detailUser.status === 'deactivated' ? '已注销' : detailUser.status === 'disabled' ? '已停用' : '正常'}</div>
              </div>
              <div className="rounded-2xl border border-gray-100 p-4">
                <div className="text-xs text-gray-500 mb-2">活跃状态</div>
                <div>{getActivityMeta(detailUser).label}</div>
              </div>
              <div className="rounded-2xl border border-gray-100 p-4">
                <div className="text-xs text-gray-500 mb-2">最近登录</div>
                <div>{formatDate(detailUser.lastLoginAt)}</div>
              </div>
              <div className="rounded-2xl border border-gray-100 p-4">
                <div className="text-xs text-gray-500 mb-2">邮箱</div>
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-gray-400" />
                  {sanitizeEmail(detailUser.email) || '未绑定邮箱'}
                </div>
              </div>
              <div className="rounded-2xl border border-gray-100 p-4">
                <div className="text-xs text-gray-500 mb-2">手机号</div>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-gray-400" />
                  {detailUser.phone || '未绑定手机号'}
                </div>
              </div>
              <div className="rounded-2xl border border-gray-100 p-4">
                <div className="text-xs text-gray-500 mb-2">登录方式</div>
                <div>{getLoginMethod(detailUser)}</div>
              </div>
              <div className="rounded-2xl border border-gray-100 p-4">
                <div className="text-xs text-gray-500 mb-2">付费到期时间</div>
                <div>{detailUser.paidExpiresAt ? formatDate(detailUser.paidExpiresAt) : (isPaidUser(detailUser) ? '长期有效' : '未开通')}</div>
              </div>
              <div className="rounded-2xl border border-gray-100 p-4">
                <div className="text-xs text-gray-500 mb-2">邀请码</div>
                <div>{detailUser.invitationCode || '未使用邀请码'}</div>
              </div>
              <div className="rounded-2xl border border-gray-100 p-4">
                <div className="text-xs text-gray-500 mb-2">注册时间</div>
                <div>{formatShortDate(detailUser.createdAt)}</div>
              </div>
              <div className="rounded-2xl border border-gray-100 p-4 md:col-span-2">
                <div className="text-xs text-gray-500 mb-2">机构绑定</div>
                <div>{detailUser.strategyProjectName || '未绑定机构'}</div>
                {detailUser.strategyProjectId ? (
                  <div className="mt-2 text-xs text-gray-500">
                    绑定来源：{detailUser.strategyAccessSource || 'invite_code'}，绑定时间：{formatDate(detailUser.strategyBoundAt)}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
