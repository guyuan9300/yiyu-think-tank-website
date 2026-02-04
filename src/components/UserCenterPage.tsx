import React, { useState, useEffect } from 'react';
import {
  Crown,
  Gift,
  CreditCard,
  Copy,
  Check,
  AlertCircle,
  ChevronRight,
  LogOut,
  Settings,
  Wallet,
  Calendar,
  Tag,
  Shield,
  User,
} from 'lucide-react';
import {
  getCurrentUser,
  logout,
  getMembershipPlans,
  useInviteCode,
  createPaymentOrder,
  getUserInvitationCode,
  generateInvitationCode,
  MembershipPlan,
} from '../lib/auth';
import './UserCenterPage.css';

// 用户类型（与auth.ts保持一致）
interface User {
  id: string;
  phone?: string;
  email?: string;
  wechatOpenid?: string;
  nickname: string;
  avatarUrl?: string;
  membershipType: 'free' | 'premium' | 'lifetime';
  membershipExpireAt?: string;
  invitedBy?: string;
  inviteCodeUsed: boolean;
  createdAt: string;
  lastLoginAt?: string;
}

type MembershipType = 'free' | 'premium' | 'lifetime';

type UserCenterPageProps = {
  onNavigate?: (page: 'home' | 'login' | 'register' | string) => void;
};

const UserCenterPage: React.FC<UserCenterPageProps> = ({ onNavigate }) => {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'upgrade' | 'invite'>('overview');
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [myInviteCode, setMyInviteCode] = useState<string>('');
  const [inviteCodeInput, setInviteCodeInput] = useState('');
  const [redeeming, setRedeeming] = useState(false);
  const [redeemMessage, setRedeemMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [payingPlan, setPayingPlan] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Use provided onNavigate or simple navigation
  const handleNavigate = (page: string) => {
    if (onNavigate) {
      onNavigate(page);
    } else {
      // Fallback: reload page with new parameter
      const url = new URL(window.location.href);
      url.searchParams.set('page', page);
      window.history.pushState({}, '', url);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  const handleLogout = async () => {
    await logout();
    window.location.reload();
  };

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      setLoading(true);
      const currentUser = await getCurrentUser();
      setUser(currentUser);

      if (currentUser) {
        const plansData = getMembershipPlans();
        setPlans(plansData);
        const code = await getUserInvitationCode(currentUser.id);
        setMyInviteCode(code);
      }
    } catch (error) {
      console.error('Failed to load user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRedeemCode = async () => {
    if (!inviteCodeInput.trim()) {
      setRedeemMessage({ type: 'error', text: '请输入邀请码' });
      return;
    }

    try {
      setRedeeming(true);
      setRedeemMessage(null);
      const result = await useInviteCode(inviteCodeInput.trim(), user?.id || '');

      if (result.success) {
        setRedeemMessage({ type: 'success', text: '恭喜！会员升级成功！' });
        setInviteCodeInput('');
        loadUserData();
      } else {
        setRedeemMessage({ type: 'error', text: result.message || '邀请码无效或已使用' });
      }
    } catch (error) {
      setRedeemMessage({ type: 'error', text: '邀请码验证失败，请稍后重试' });
    } finally {
      setRedeeming(false);
    }
  };

  const handlePayment = async (planId: 'monthly' | 'yearly' | 'lifetime') => {
    try {
      setPayingPlan(planId);
      const result = await createPaymentOrder(planId);

      if (result.success && result.paymentUrl) {
        // Redirect to payment page or open payment URL
        window.open(result.paymentUrl, '_blank');
      } else {
        alert(result.message || '创建订单失败，请稍后重试');
      }
    } catch (error) {
      alert('支付创建失败，请稍后重试');
    } finally {
      setPayingPlan(null);
    }
  };

  const copyInviteCode = () => {
    navigator.clipboard.writeText(myInviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getMembershipStatus = (type: MembershipType): { text: string; color: string; icon: React.ReactNode } => {
    const statusMap = {
      free: { text: '普通会员', color: '#6b7280', icon: <User size={18} /> },
      premium: { text: '付费会员', color: '#f59e0b', icon: <Crown size={18} /> },
      lifetime: { text: '终身会员', color: '#8b5cf6', icon: <Shield size={18} /> },
    };
    return statusMap[type];
  };

  const formatDate = (dateString?: string): string => {
    if (!dateString) return '无';
    return new Date(dateString).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="user-center-page">
        <div className="loading-container">
          <div className="loading-spinner" />
          <p className="loading-text">加载中...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="user-center-page">
        <div className="not-logged-in">
          <div className="not-logged-in-icon">
            <AlertCircle size={64} />
          </div>
          <h2>请先登录</h2>
          <p>登录后即可查看会员中心</p>
          <button className="btn-primary" onClick={() => handleNavigate('login')}>
            立即登录
          </button>
        </div>
      </div>
    );
  }

  const status = getMembershipStatus(user.membershipType as MembershipType);

  return (
    <div className="user-center-page">
      <div className="user-center-container">
        {/* 顶部用户信息卡片 */}
        <div className="user-header-card animate-fadeInUp">
          <div className="user-avatar-section">
            <div className="user-avatar">
              {user.nickname?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="user-basic-info">
              <h1 className="user-nickname">{user.nickname || '用户'}</h1>
              <div className="user-contact">
                {user.phone && (
                  <span>
                    <PhoneIcon /> {user.phone}
                  </span>
                )}
                {user.email && (
                  <span>
                    <EmailIcon /> {user.email}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="membership-badge">
            <div className="badge-icon" style={{ backgroundColor: status.color }}>
              {status.icon}
            </div>
            <div className="badge-info">
              <span className="badge-label">当前会员</span>
              <span className="badge-value">{status.text}</span>
            </div>
          </div>
        </div>

        {/* 会员到期信息 */}
        {user.membershipType !== 'free' && user.membershipExpireAt && (
          <div className="membership-expiry-card animate-fadeInUp" style={{ animationDelay: '100ms' }}>
            <Calendar size={22} className="flex-shrink-0" />
            <div className="expiry-info">
              <span className="expiry-label">会员到期时间</span>
              <span className="expiry-date">{formatDate(user.membershipExpireAt)}</span>
            </div>
          </div>
        )}

        {/* 标签页导航 */}
        <div className="tab-navigation animate-fadeInUp" style={{ animationDelay: '150ms' }}>
          {[
            { id: 'overview', icon: Wallet, label: '会员概览' },
            { id: 'upgrade', icon:Crown, label: '升级会员' },
            { id: 'invite', icon: Gift, label: '邀请有礼' },
          ].map((tab) => (
            <button
              key={tab.id}
              className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id as 'overview' | 'upgrade' | 'invite')}
            >
              <tab.icon size={18} />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* 标签页内容 */}
        <div className="tab-content">
          {/* 概览页 */}
          {activeTab === 'overview' && (
            <div className="overview-tab">
              <div className="quick-actions-grid">
                {[
                  { icon: Crown, color: '#f59e0b', title: '升级会员', desc: '解锁更多特权', action: () => setActiveTab('upgrade') },
                  { icon: Gift, color: '#10b981', title: '邀请好友', desc: '获取邀请码', action: () => setActiveTab('invite') },
                  { icon: Settings, color: '#3b82f6', title: '账户设置', desc: '管理个人信息' },
                  { icon: LogOut, color: '#ef4444', title: '退出登录', desc: '安全退出账户', action: handleLogout },
                ].map((item, index) => (
                  <div
                    key={index}
                    className={`action-card ${index === 3 ? 'logout-card' : ''}`}
                    onClick={item.action}
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <item.icon size={32} style={{ color: item.color }} />
                    <h3>{item.title}</h3>
                    <p>{item.desc}</p>
                    {index < 2 && <ChevronRight size={20} className="action-arrow" />}
                  </div>
                ))}
              </div>

              {/* 会员权益对比 */}
              <div className="benefits-comparison animate-fadeInUp" style={{ animationDelay: '400ms' }}>
                <h2>会员权益</h2>
                <div className="benefits-table">
                  <div className="benefits-header">
                    <div className="benefit-item">权益项目</div>
                    <div className="benefit-level">普通会员</div>
                    <div className="benefit-level premium">付费会员</div>
                    <div className="benefit-level lifetime">终身会员</div>
                  </div>
                  <div className="benefits-body">
                    {[
                      { item: '每日AI对话次数', free: '10次', premium: '无限次', lifetime: '无限次' },
                      { item: '专业报告生成', free: true, premium: true, lifetime: true },
                      { item: '深度分析功能', free: false, premium: true, lifetime: true },
                      { item: '优先客服支持', free: false, premium: true, lifetime: true },
                    ].map((row, index) => (
                      <div key={index} className="benefit-row">
                        <div className="benefit-item">{row.item}</div>
                        <div className="benefit-level">
                          {typeof row.free === 'boolean' ? (
                            row.free ? (
                              <Check size={16} className="text-green-500" />
                            ) : (
                              <AlertCircle size={16} className="text-gray-400" />
                            )
                          ) : (
                            row.free
                          )}
                        </div>
                        <div className="benefit-level premium">
                          {typeof row.premium === 'boolean' ? (
                            row.premium ? (
                              <Check size={16} />
                            ) : (
                              <AlertCircle size={16} />
                            )
                          ) : (
                            row.premium
                          )}
                        </div>
                        <div className="benefit-level lifetime">
                          {typeof row.lifetime === 'boolean' ? (
                            row.lifetime ? (
                              <Check size={16} />
                            ) : (
                              <AlertCircle size={16} />
                            )
                          ) : (
                            row.lifetime
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 升级页 */}
          {activeTab === 'upgrade' && (
            <div className="upgrade-tab">
              {/* 邀请码兑换 */}
              <div className="redeem-section animate-fadeInUp">
                <h2>
                  <Tag size={20} /> 使用邀请码升级
                </h2>
                <p className="section-desc">
                  输入邀请码可免费升级会员，有效邀请码可获得30天/365天/1095天(3年)会员时长
                </p>
                <div className="redeem-form">
                  <input
                    type="text"
                    placeholder="请输入邀请码"
                    value={inviteCodeInput}
                    onChange={(e) => setInviteCodeInput(e.target.value)}
                    className="redeem-input"
                  />
                  <button
                    className="redeem-btn"
                    onClick={handleRedeemCode}
                    disabled={redeeming}
                  >
                    {redeeming ? '兑换中...' : '立即兑换'}
                  </button>
                </div>
                {redeemMessage && (
                  <div className={`redeem-message ${redeemMessage.type}`}>
                    {redeemMessage.type === 'success' ? (
                      <>
                        <Check size={16} /> {redeemMessage.text}
                      </>
                    ) : (
                      <>
                        <AlertCircle size={16} /> {redeemMessage.text}
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* 付费升级方案 */}
              <div className="payment-plans-section animate-fadeInUp" style={{ animationDelay: '200ms' }}>
                <h2>
                  <CreditCard size={20} /> 付费升级方案
                </h2>
                <div className="plans-grid">
                  {plans.map((plan, index) => (
                    <div
                      key={plan.id}
                      className={`plan-card ${plan.popular ? 'popular' : ''}`}
                      style={{ animationDelay: `${index * 150}ms` }}
                    >
                      {plan.popular && <span className="popular-badge">最受欢迎</span>}
                      <div className="plan-header">
                        <h3>{plan.name}</h3>
                        <div className="plan-price">
                          {plan.originalPrice && (
                            <span className="original-price">¥{plan.originalPrice}</span>
                          )}
                          <span className="current-price">¥{plan.price}</span>
                          <span className="price-unit">/{plan.durationText}</span>
                        </div>
                      </div>
                      <ul className="plan-features">
                        <li>
                          <Check size={14} /> 无限AI对话次数
                        </li>
                        <li>
                          <Check size={14} /> 专业报告生成
                        </li>
                        <li>
                          <Check size={14} /> 深度分析功能
                        </li>
                        <li>
                          <Check size={14} /> 优先客服支持
                        </li>
                        {plan.id === 'yearly' && (
                          <li className="bonus">
                            <Gift size={14} /> 额外赠送30天
                          </li>
                        )}
                        {plan.id === 'lifetime' && (
                          <li className="bonus">
                            <Gift size={14} /> 终身免费使用
                          </li>
                        )}
                      </ul>
                      <button
                        className={`pay-btn ${plan.id === 'yearly' ? 'recommended' : ''}`}
                        onClick={() => handlePayment(plan.id as 'monthly' | 'yearly' | 'lifetime')}
                        disabled={payingPlan === plan.id || user.membershipType === 'lifetime'}
                      >
                        {payingPlan === plan.id
                          ? '创建订单中...'
                          : user.membershipType === 'lifetime'
                            ? '已是终身会员'
                            : plan.id === 'lifetime'
                              ? '立即解锁终身'
                              : '立即升级'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 邀请页 */}
          {activeTab === 'invite' && (
            <div className="invite-tab">
              <div className="my-invite-section animate-fadeIn">
                <h2>
                  <Gift size={20} /> 我的邀请码
                </h2>
                <p className="section-desc">
                  分享您的邀请码给好友，好友注册时使用您的邀请码，您将获得会员时长奖励
                </p>

                <div className="invite-code-display">
                  <div className="code-box animate-fadeInUp">
                    <span className="code-label">您的专属邀请码</span>
                    <div className="code-value">
                      { '加载中...myInviteCode ||'}
                      <button
                        className="copy-btn"
                        onClick={copyInviteCode}
                        disabled={!myInviteCode}
                      >
                        {copied ? (
                          <>
                            <Check size={16} /> 已复制
                          </>
                        ) : (
                          <>
                            <Copy size={16} /> 复制
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="invite-rewards animate-fadeInUp" style={{ animationDelay: '200ms' }}>
                    <h3>邀请奖励规则</h3>
                    <div className="rewards-list">
                      {[
                        { label: '成功邀请1人', value: '+7天会员时长' },
                        { label: '成功邀请3人', value: '+30天会员时长' },
                        { label: '成功邀请10人', value: '+90天会员时长' },
                      ].map((reward, index) => (
                        <div key={index} className="reward-item">
                          <span className="reward-label">{reward.label}</span>
                          <span className="reward-value">{reward.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="share-section animate-fadeInUp" style={{ animationDelay: '300ms' }}>
                    <h3>分享到</h3>
                    <div className="share-buttons">
                      <button
                        className="share-btn wechat"
                        onClick={() => {
                          if (navigator.share) {
                            navigator.share({
                              title: '加入益语智库',
                              text: `使用我的邀请码 ${myInviteCode} 注册益语智库，解锁无限AI对话！`,
                              url: window.location.origin,
                            });
                          }
                        }}
                      >
                        <WeChatIcon size={24} />
                        微信
                      </button>
                      <button
                        className="share-btn copy-link"
                        onClick={() => {
                          navigator.clipboard.writeText(
                            `使用我的邀请码 ${myInviteCode} 注册益语智库，解锁无限AI对话！${window.location.origin}`
                          );
                          alert('链接已复制');
                        }}
                      >
                        <Copy size={24} />
                        复制链接
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// 简单的图标组件
const PhoneIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
  </svg>
);

const EmailIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
    <polyline points="22,6 12,13 2,6" />
  </svg>
);

const WeChatIcon = ({ size = 24 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 0 1 .213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 0 0 .167-.054l1.903-1.114a.864.864 0 0 1 .717-.098 10.16 10.16 0 0 0 2.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.596-6.348zM5.785 5.991c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178A1.17 1.17 0 0 1 4.623 7.17c0-.651.52-1.18 1.162-1.18zm5.813 0c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178 1.17 1.17 0 0 1-1.162-1.178c0-.651.52-1.18 1.162-1.18zm5.34 2.867c-1.797-.052-3.746.512-5.28 1.786-1.72 1.428-2.687 3.72-1.78 6.22.942 2.453 3.666 4.229 6.884 4.229.826 0 1.622-.12 2.361-.336a.722.722 0 0 1 .598.082l1.584.926a.272.272 0 0 0 .14.047c.134 0 .24-.111.24-.247 0-.06-.023-.12-.038-.177l-.327-1.233a.582.582 0 0 1-.023-.156.49.49 0 0 1 .201-.398C23.024 18.48 24 16.82 24 14.98c0-3.21-2.931-5.837-6.656-6.088V8.89l-.006-.033zm-2.634 2.588c.535 0 .969.44.969.982a.976.976 0 0 1-.969.983.976.976 0 0 1-.969-.983c0-.542.434-.982.97-.982zm4.844 0c.535 0 .969.44.969.982a.976.976 0 0 1-.969.983.976.976 0 0 1-.969-.983c0-.542.434-.982.97-.982z" />
  </svg>
);

export default UserCenterPage;
