import { appConfig } from './config';

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
  appId: appConfig.zhixiaoyun.appId,
  
  // API Key - 在知晓云后台的"API设置"中获取
  apiKey: appConfig.zhixiaoyun.apiKey,
  
  // 服务器地址（通常不需要修改）
  serverURL: appConfig.zhixiaoyun.serverURL,
  
  // 应用版本（通常不需要修改）
  version: appConfig.zhixiaoyun.version,
};

// 会员套餐配置
export const MEMBERSHIP_PLANS = {
  monthly_trial: {
    id: 'monthly_trial',
    name: '月包试用',
    price: 19.8,
    currency: 'CNY',
    duration: 30, // 天数
    features: [
      '体验 30 天付费会员服务',
      '适合先熟悉平台内容',
      '支付成功后立即生效'
    ]
  },
  yearly: {
    id: 'yearly',
    name: '年包会员',
    price: 198,
    currency: 'CNY',
    duration: 365,
    features: [
      '365 天付费会员有效期',
      '适合长期学习与持续使用',
      '支付成功后自动开通'
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
  appId: appConfig.wechat.appId,
  
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
