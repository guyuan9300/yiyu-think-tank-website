/**
 * 用户管理页面
 * 功能：用户列表、用户详情、用户操作、统计数据
 */
import { useState, useEffect } from 'react';
import {
  Users, Search, Filter, MoreVertical, Edit, Trash2, Ban, CheckCircle,
  XCircle, Eye, Crown, Shield, Calendar, Clock, MessageSquare, Heart,
  Mail, Phone, User as UserIcon, X, Save, AlertTriangle, RefreshCw,
  TrendingUp, Award, Activity, Gift
} from 'lucide-react';
import {
  getUsers, getUserStats, saveUser, updateUserStatus, updateUserMemberType,
  deleteUser, searchUsers, type User
} from '../lib/dataService';

// 头像上传处理函数
const handleAvatarUpload = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result;
      if (typeof result === 'string') {
        resolve(result);
      } else {
        reject(new Error('Failed to read file'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
};

export function UserManagementPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMemberType, setFilterMemberType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState<Partial<User>>({});
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [topTab, setTopTab] = useState<'member-db' | 'permissions'>('member-db');

  // 加载数据
  useEffect(() => {
    loadData();
  }, [searchQuery, filterMemberType, filterStatus]);

  const loadData = () => {
    const filteredUsers = searchUsers(searchQuery, filterMemberType, filterStatus);
    setUsers(filteredUsers);
    setStats(getUserStats());
  };

  // 获取会员类型徽章样式
  const getMemberTypeBadge = (memberType: string) => {
    switch (memberType) {
      case 'diamond':
        return { label: '钻石会员', color: 'bg-purple-100 text-purple-700', icon: <Award className="w-3 h-3" /> };
      case 'gold':
        return { label: '黄金会员', color: 'bg-amber-100 text-amber-700', icon: <Crown className="w-3 h-3" /> };
      default:
        return { label: '普通会员', color: 'bg-gray-100 text-gray-600', icon: <UserIcon className="w-3 h-3" /> };
    }
  };

  // 获取状态徽章样式
  const getStatusBadge = (status: string) => {
    return status === 'active'
      ? { label: '正常', color: 'bg-green-100 text-green-700', icon: <CheckCircle className="w-3 h-3" /> }
      : { label: '已禁用', color: 'bg-red-100 text-red-700', icon: <Ban className="w-3 h-3" /> };
  };

  // 查看用户详情
  const handleViewDetail = (user: User) => {
    setSelectedUser(user);
    setShowDetailModal(true);
  };

  // 编辑用户
  const handleEdit = (user: User) => {
    setEditingUser({ ...user });
    setAvatarPreview(user.avatar || '');
    setAvatarFile(null);
    setShowEditModal(true);
  };

  // 处理头像选择
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 验证文件类型
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setMessage({ type: 'error', text: '请选择JPG、PNG、GIF或WebP格式的图片' });
      setTimeout(() => setMessage(null), 3000);
      return;
    }

    // 验证文件大小（最大2MB）
    if (file.size > 2 * 1024 * 1024) {
      setMessage({ type: 'error', text: '图片大小不能超过2MB' });
      setTimeout(() => setMessage(null), 3000);
      return;
    }

    setIsUploading(true);
    try {
      const base64 = await handleAvatarUpload(file);
      setAvatarPreview(base64);
      setEditingUser({ ...editingUser, avatar: base64 });
      setAvatarFile(file);
    } catch (error) {
      setMessage({ type: 'error', text: '头像上传失败，请重试' });
      setTimeout(() => setMessage(null), 3000);
    } finally {
      setIsUploading(false);
    }
  };

  // 移除头像
  const handleRemoveAvatar = () => {
    setAvatarPreview('');
    setAvatarFile(null);
    setEditingUser({ ...editingUser, avatar: undefined });
  };

  // 保存编辑
  const handleSaveEdit = () => {
    if (!editingUser.id) return;
    
    saveUser(editingUser);
    loadData();
    setShowEditModal(false);
    setMessage({ type: 'success', text: '用户信息已更新' });
    setTimeout(() => setMessage(null), 3000);
  };

  // 切换用户状态
  const handleToggleStatus = (userId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'disabled' : 'active';
    const action = newStatus === 'disabled' ? '禁用' : '启用';
    
    if (window.confirm(`确定要${action}该用户吗？`)) {
      updateUserStatus(userId, newStatus);
      loadData();
      setMessage({ type: 'success', text: `用户已${action}` });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  // 修改会员类型
  const handleChangeMemberType = (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (!user) return;
    
    const types: ('regular' | 'gold' | 'diamond')[] = ['regular', 'gold', 'diamond'];
    const currentIndex = types.indexOf(user.memberType);
    const nextType = types[(currentIndex + 1) % types.length];
    
    updateUserMemberType(userId, nextType);
    loadData();
    setMessage({ type: 'success', text: `会员类型已更改为${getMemberTypeBadge(nextType).label}` });
    setTimeout(() => setMessage(null), 3000);
  };

  // 删除用户
  const handleDelete = (userId: string) => {
    if (window.confirm('确定要删除该用户吗？此操作不可恢复。')) {
      deleteUser(userId);
      loadData();
      setMessage({ type: 'success', text: '用户已删除' });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  // 重置密码（模拟）
  const handleResetPassword = (userId: string) => {
    if (window.confirm('确定要重置该用户的密码吗？新密码将通过邮件发送给用户。')) {
      // 模拟重置密码逻辑
      setMessage({ type: 'success', text: '密码重置成功，新密码已发送至用户邮箱' });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  // 格式化日期
  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // 计算活跃度
  const getActivityLevel = (user: User) => {
    const score = user.loginCount * 2 + user.commentsCount * 5 + user.favoritesCount * 3;
    if (score > 200) return { label: '高活跃', color: 'text-green-600' };
    if (score > 100) return { label: '中活跃', color: 'text-blue-600' };
    return { label: '低活跃', color: 'text-gray-400' };
  };

  return (
    <div className="space-y-6">
      {/* 顶层 Tab（会员数据库 / 权限管理） */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-2 inline-flex gap-2">
        <button
          onClick={() => setTopTab('member-db')}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
            topTab === 'member-db' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          会员数据库
        </button>
        <button
          onClick={() => setTopTab('permissions')}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
            topTab === 'permissions' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          权限管理
        </button>
      </div>

      {topTab === 'member-db' && (
      <>
      {/* 消息提示 */}
      {message && (
        <div className={`p-4 rounded-xl flex items-center gap-2 ${
          message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
        }`}>
          {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
          {message.text}
        </div>
      )}

      {/* 统计卡片 */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <span className="text-sm text-green-600 font-medium flex items-center gap-1">
                <TrendingUp className="w-4 h-4" />
                +{stats.todayNew}
              </span>
            </div>
            <p className="text-2xl font-bold text-gray-900 mb-1">{stats.total}</p>
            <p className="text-sm text-gray-500">用户总数</p>
          </div>

          <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                <Activity className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900 mb-1">{stats.active}</p>
            <p className="text-sm text-gray-500">活跃用户</p>
          </div>

          <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
                <Crown className="w-6 h-6 text-amber-600" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900 mb-1">
              {stats.gold + stats.diamond}
            </p>
            <p className="text-sm text-gray-500">付费会员</p>
          </div>

          <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900 mb-1">{stats.membershipRate}%</p>
            <p className="text-sm text-gray-500">会员转化率</p>
          </div>
        </div>
      )}

      {/* 搜索和筛选 */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <div className="flex flex-wrap gap-4 items-center flex-1">
            <div className="relative flex-1 min-w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="搜索用户（昵称/邮箱/手机号）..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <select
              value={filterMemberType}
              onChange={(e) => setFilterMemberType(e.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="all">全部会员</option>
              <option value="regular">普通会员</option>
              <option value="gold">黄金会员</option>
              <option value="diamond">钻石会员</option>
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="all">全部状态</option>
              <option value="active">正常</option>
              <option value="disabled">已禁用</option>
            </select>
          </div>
          
          <button
            onClick={loadData}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
          >
            <RefreshCw className="w-5 h-5" />
            刷新
          </button>
        </div>
      </div>

      {/* 用户列表 */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">用户信息</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">联系方式</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">会员类型</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">活跃度</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">注册时间</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">最后登录</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">状态</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((user) => {
                const memberBadge = getMemberTypeBadge(user.memberType);
                const statusBadge = getStatusBadge(user.status);
                const activity = getActivityLevel(user);
                
                return (
                  <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-medium flex-shrink-0">
                          {user.nickname.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{user.nickname}</p>
                          <p className="text-sm text-gray-500">ID: {user.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <p className="text-sm text-gray-600 flex items-center gap-1">
                          <Mail className="w-3 h-3" /> {user.email}
                        </p>
                        {user.phone && (
                          <p className="text-sm text-gray-600 flex items-center gap-1">
                            <Phone className="w-3 h-3" /> {user.phone}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 w-fit ${memberBadge.color}`}>
                        {memberBadge.icon}
                        {memberBadge.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="space-y-1">
                        <p className={`text-sm font-medium ${activity.color}`}>{activity.label}</p>
                        <div className="flex items-center gap-3 text-xs text-gray-500">
                          <span title="登录次数">{user.loginCount}次</span>
                          <span title="评论数">💬{user.commentsCount}</span>
                          <span title="收藏数">❤️{user.favoritesCount}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {formatDate(user.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {formatDate(user.lastLoginAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 w-fit ${statusBadge.color}`}>
                        {statusBadge.icon}
                        {statusBadge.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleViewDetail(user)}
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600"
                          title="查看详情"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleEdit(user)}
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600"
                          title="编辑"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleChangeMemberType(user.id)}
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-amber-600"
                          title="修改会员类型"
                        >
                          <Crown className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleToggleStatus(user.id, user.status)}
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-blue-600"
                          title={user.status === 'active' ? '禁用' : '启用'}
                        >
                          {user.status === 'active' ? <Ban className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => handleDelete(user.id)}
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-red-500"
                          title="删除"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        
        {users.length === 0 && (
          <div className="p-12 text-center text-gray-500">
            <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>暂无用户数据</p>
          </div>
        )}
      </div>

      {/* 用户详情弹窗 */}
      {showDetailModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white z-10">
              <h3 className="text-lg font-semibold text-gray-900">用户详情</h3>
              <button
                onClick={() => setShowDetailModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* 基本信息 */}
              <div>
                <h4 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
                  <UserIcon className="w-5 h-5" />
                  基本信息
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">用户ID</p>
                    <p className="text-gray-900">{selectedUser.id}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">昵称</p>
                    <p className="text-gray-900">{selectedUser.nickname}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">邮箱</p>
                    <p className="text-gray-900">{selectedUser.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">手机号</p>
                    <p className="text-gray-900">{selectedUser.phone || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">会员类型</p>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium inline-flex items-center gap-1 ${getMemberTypeBadge(selectedUser.memberType).color}`}>
                      {getMemberTypeBadge(selectedUser.memberType).icon}
                      {getMemberTypeBadge(selectedUser.memberType).label}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">账号状态</p>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium inline-flex items-center gap-1 ${getStatusBadge(selectedUser.status).color}`}>
                      {getStatusBadge(selectedUser.status).icon}
                      {getStatusBadge(selectedUser.status).label}
                    </span>
                  </div>
                </div>
              </div>

              {/* 活动统计 */}
              <div>
                <h4 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  活动统计
                </h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-blue-50 rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-blue-600 mb-1">{selectedUser.loginCount}</p>
                    <p className="text-sm text-gray-600">登录次数</p>
                  </div>
                  <div className="bg-green-50 rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-green-600 mb-1">{selectedUser.commentsCount}</p>
                    <p className="text-sm text-gray-600">评论数</p>
                  </div>
                  <div className="bg-pink-50 rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-pink-600 mb-1">{selectedUser.favoritesCount}</p>
                    <p className="text-sm text-gray-600">收藏数</p>
                  </div>
                </div>
              </div>

              {/* 时间信息 */}
              <div>
                <h4 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  时间信息
                </h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-600">注册时间</span>
                    <span className="text-sm font-medium text-gray-900">{formatDate(selectedUser.createdAt)}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-600">最后登录</span>
                    <span className="text-sm font-medium text-gray-900">{formatDate(selectedUser.lastLoginAt)}</span>
                  </div>
                </div>
              </div>

              {/* 邀请信息 */}
              {(selectedUser.invitationCode || selectedUser.invitedBy) && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
                    <Gift className="w-5 h-5" />
                    邀请信息
                  </h4>
                  <div className="space-y-3">
                    {selectedUser.invitationCode && (
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="text-sm text-gray-600">使用邀请码</span>
                        <code className="text-sm font-mono font-medium text-purple-600">{selectedUser.invitationCode}</code>
                      </div>
                    )}
                    {selectedUser.invitedBy && (
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="text-sm text-gray-600">邀请人ID</span>
                        <span className="text-sm font-medium text-gray-900">{selectedUser.invitedBy}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            <div className="p-6 border-t border-gray-200 flex justify-end gap-4">
              <button
                onClick={() => handleResetPassword(selectedUser.id)}
                className="px-6 py-3 border border-amber-200 text-amber-700 rounded-xl hover:bg-amber-50 transition-colors"
              >
                重置密码
              </button>
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  handleEdit(selectedUser);
                }}
                className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
              >
                编辑用户
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 编辑用户弹窗 */}
      {showEditModal && editingUser && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white z-10">
              <h3 className="text-lg font-semibold text-gray-900">编辑用户</h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              {/* 头像上传 */}
              <div className="flex items-center gap-6">
                <div className="relative">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-2xl font-bold overflow-hidden">
                    {avatarPreview ? (
                      <img src={avatarPreview} alt="头像预览" className="w-full h-full object-cover" />
                    ) : (
                      editingUser.nickname?.charAt(0) || '?'
                    )}
                  </div>
                  {isUploading && (
                    <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                      <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  )}
                </div>
                <div>
                  <label className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors cursor-pointer">
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/gif,image/webp"
                      onChange={handleAvatarChange}
                      className="hidden"
                      disabled={isUploading}
                    />
                    {avatarPreview ? '更换头像' : '上传头像'}
                  </label>
                  {avatarPreview && (
                    <button
                      onClick={handleRemoveAvatar}
                      className="ml-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                    >
                      移除
                    </button>
                  )}
                  <p className="mt-2 text-sm text-gray-500">支持JPG、PNG、GIF格式，最大2MB</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">昵称</label>
                <input
                  type="text"
                  value={editingUser.nickname || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, nickname: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">邮箱</label>
                <input
                  type="email"
                  value={editingUser.email || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">手机号</label>
                <input
                  type="tel"
                  value={editingUser.phone || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, phone: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">会员类型</label>
                <select
                  value={editingUser.memberType || 'regular'}
                  onChange={(e) => setEditingUser({ ...editingUser, memberType: e.target.value as any })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="regular">普通会员</option>
                  <option value="gold">黄金会员</option>
                  <option value="diamond">钻石会员</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">账号状态</label>
                <select
                  value={editingUser.status || 'active'}
                  onChange={(e) => setEditingUser({ ...editingUser, status: e.target.value as any })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="active">正常</option>
                  <option value="disabled">已禁用</option>
                </select>
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-200 flex justify-end gap-4">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-6 py-3 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <Save className="w-5 h-5" />
                保存
              </button>
            </div>
          </div>
        </div>
      )}
      </>
      )}

      {topTab === 'permissions' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">权限管理</h3>
            <p className="text-sm text-gray-500 mb-4">这里先完成前端结构调整：后续将接入服务端权限策略与实时判权结果。</p>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b border-gray-100">
                    <th className="py-3 pr-6">资源</th>
                    <th className="py-3 pr-6">Guest</th>
                    <th className="py-3 pr-6">User</th>
                    <th className="py-3 pr-6">Member</th>
                    <th className="py-3 pr-6">Companion</th>
                  </tr>
                </thead>
                <tbody className="text-gray-800">
                  <tr className="border-b border-gray-50"><td className="py-3 pr-6">article</td><td>预览20%</td><td>预览20%</td><td>全文</td><td>全文</td></tr>
                  <tr className="border-b border-gray-50"><td className="py-3 pr-6">book</td><td>不可见</td><td>预览20%</td><td>全文</td><td>全文</td></tr>
                  <tr className="border-b border-gray-50"><td className="py-3 pr-6">report</td><td>摘要</td><td>摘要</td><td>全文</td><td>全文</td></tr>
                  <tr className="border-b border-gray-50"><td className="py-3 pr-6">download</td><td>不可下载</td><td>不可下载</td><td>允许</td><td>允许</td></tr>
                  <tr><td className="py-3 pr-6">companion</td><td>不可见</td><td>不可见</td><td>不可见</td><td>仅本机构</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
