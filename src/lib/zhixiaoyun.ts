/**
 * 知晓云(ZhiXiaoYun) SDK集成配置
 * 
 * 配置说明：
 * 1. 在知晓云官网注册账号：https://www.zhixiaoyun.com
 * 2. 创建应用，获取 AppID 和 API Key
 * 3. 在知晓云后台配置：
 *    - 用户系统（手机/邮箱/微信登录）
 *    - 短信服务（用于发送验证码）
 *    - 微信开放平台配置（用于微信登录）
 *    - 支付配置（可选，用于付费会员）
 */

// 知晓云配置
export const ZHIXIAOYUN_CONFIG = {
  // 应用ID - 在知晓云后台的"应用设置"中获取
  appId: import.meta.env.VITE_ZHIXIAOYUN_APP_ID || 'your_app_id',
  
  // API Key - 在知晓云后台的"API设置"中获取
  apiKey: import.meta.env.VITE_ZHIXIAOYUN_API_KEY || 'your_api_key',
  
  // 服务器地址（通常不需要修改）
  serverURL: 'https://api.zhixiaoyun.com',
  
  // 应用版本（通常不需要修改）
  version: '1.0.0',
};

// 会员套餐配置
export const MEMBERSHIP_PLANS = {
  monthly: {
    id: 'monthly',
    name: '月卡',
    price: 99,
    currency: 'CNY',
    duration: 30, // 天数
    features: [
      '解锁全部会员内容',
      '优先客服支持',
      '参与会员专属活动'
    ]
  },
  yearly: {
    id: 'yearly',
    name: '年卡',
    price: 999,
    currency: 'CNY',
    duration: 365,
    discount: 0.1, // 9折
    originalPrice: 999,
    features: [
      '解锁全部会员内容',
      '优先客服支持',
      '参与会员专属活动',
      '9折购买增值服务'
    ]
  },
  lifetime: {
    id: 'lifetime',
    name: '终身会员',
    price: 2999,
    currency: 'CNY',
    duration: null, // 永久
    features: [
      '解锁全部会员内容',
      '优先客服支持',
      '参与会员专属活动',
      '8折购买增值服务',
      '终身免费更新'
    ]
  }
};

// 邀请码类型配置
export const INVITE_CODE_TYPES = {
  general: {
    id: 'general',
    name: '普通邀请码',
    bonusDays: 30,
    maxUses: 1,
    description: '升级为付费会员（30天）'
  },
  premium: {
    id: 'premium',
    name: '高级邀请码',
    bonusDays: 90,
    maxUses: 1,
    description: '升级为付费会员（90天）'
  },
  lifetime: {
    id: 'lifetime',
    name: '终身邀请码',
    bonusDays: null,
    maxUses: 1,
    description: '升级为终身会员'
  }
};

// 微信登录配置
export const WECHAT_LOGIN_CONFIG = {
  // 微信开放平台AppID
  appId: import.meta.env.VITE_WECHAT_APP_ID || 'your_wechat_app_id',
  
  // 回调地址
  redirectUri: encodeURIComponent(
    window.location.origin + '/api/auth/wechat/callback'
  ),
  
  // 授权 scope
  scope: 'snsapi_userinfo',
  
  // 状态参数（用于防止CSRF攻击）
  state: generateState(),
  
  // 授权URL
  getAuthUrl() {
    return `https://open.weixin.qq.com/connect/qrconnect?appid=${this.appId}&redirect_uri=${this.redirectUri}&response_type=code&scope=${this.scope}&state=${this.state}#wechat_redirect`;
  }
};

// 生成随机状态码
function generateState(): string {
  return Math.random().toString(36).substring(2, 15);
}

// 导出配置
export default {
  ZHIXIAOYUN_CONFIG,
  MEMBERSHIP_PLANS,
  INVITE_CODE_TYPES,
  WECHAT_LOGIN_CONFIG
};
