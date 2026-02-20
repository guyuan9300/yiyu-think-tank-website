/**
 * 用户认证函数库
 * 
 * 支持：
 * - 手机号注册/登录
 * - 邮箱注册/登录
 * - 微信登录
 * - 会员状态查询
 * - 邀请码系统（30天/365天/3年）
 */

import { ZHIXIAOYUN_CONFIG, MEMBERSHIP_PLANS } from './zhixiaoyun';

// 用户类型定义
export interface User {
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

// 邀请码类型：30天、365天、3年（1095天）
export type InviteCodeType = '30days' | '365days' | '1095days';

// 邀请码状态
export type InviteCodeStatus = 'valid' | 'redeemed' | 'disabled';

// 邀请码接口
export interface InviteCode {
  id: string;
  code: string;           // 12位随机邀请码
  type: InviteCodeType;   // 类型
  bonusDays: number;      // 奖励天数
  maxUses: number;        // 最大使用次数
  usedCount: number;      // 已使用次数
  status: InviteCodeStatus; // 状态
  createdBy: string;      // 创建者ID
  createdAt: string;      // 创建时间
  usedBy?: string[];      // 使用者ID列表
}

// 邀请码类型配置
export const INVITE_CODE_TYPES: Record<InviteCodeType, { label: string; bonusDays: number; description: string }> = {
  '30days': {
    label: '30天会员',
    bonusDays: 30,
    description: '有效期30天的会员邀请码'
  },
  '365days': {
    label: '年卡会员',
    bonusDays: 365,
    description: '有效期365天的会员邀请码'
  },
  '1095days': {
    label: '三年会员',
    bonusDays: 1095,
    description: '有效期3年的会员邀请码'
  }
};

export interface RegisterParams {
  type: 'phone' | 'email' | 'wechat';
  phone?: string;
  email?: string;
  password?: string;
  verifyCode: string;
  nickname?: string;
  wechatCode?: string;
}

export interface LoginParams {
  type: 'phone' | 'email' | 'wechat';
  phone?: string;
  email?: string;
  password?: string;
  wechatCode?: string;
}

export interface AuthResult {
  success: boolean;
  user?: User;
  token?: string;
  error?: string;
}

// 当前用户状态
let currentUser: User | null = null;
let authToken: string | null = null;

// 初始化认证状态
export function initAuth() {
  // 从localStorage恢复登录状态
  const savedUser = localStorage.getItem('yiyu_user');
  const savedToken = localStorage.getItem('yiyu_token');
  
  if (savedUser && savedToken) {
    try {
      currentUser = JSON.parse(savedUser);
      authToken = savedToken;
      return true;
    } catch (e) {
      // 解析失败，清除数据
      localStorage.removeItem('yiyu_user');
      localStorage.removeItem('yiyu_token');
    }
  }
  return false;
}

// 获取当前用户
export function getCurrentUser(): User | null {
  return currentUser;
}

// 检查是否已登录
export function isLoggedIn(): boolean {
  return currentUser !== null;
}

// 检查是否是付费会员
export function isPremiumMember(): boolean {
  if (!currentUser) return false;
  
  if (currentUser.membershipType === 'lifetime') {
    return true;
  }
  
  if (currentUser.membershipType === 'premium') {
    if (currentUser.membershipExpireAt) {
      const expireDate = new Date(currentUser.membershipExpireAt);
      return expireDate > new Date();
    }
    return true;
  }
  
  return false;
}

// 获取会员剩余天数
export function getMembershipDays(): number | null {
  if (!currentUser || !currentUser.membershipExpireAt) {
    return null;
  }
  
  const expireDate = new Date(currentUser.membershipExpireAt);
  const now = new Date();
  const diffTime = expireDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays > 0 ? diffDays : 0;
}

// 发送短信验证码
export async function sendSMSCode(phone: string): Promise<{ success: boolean; error?: string }> {
  try {
    // TODO: 调用知晓云短信发送接口
    // const response = await fetch(`${ZHIXIAOYUN_CONFIG.serverURL}/sms/send`, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ phone, template: 'register' })
    // });
    
    // 模拟发送
    console.log(`发送短信验证码到: ${phone}`);
    
    // 存储验证码（测试用）
    localStorage.setItem(`verify_code_${phone}`, '123456');
    
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// 发送邮箱验证码（已废弃，使用 Supabase Auth 自动发送验证邮件）
export async function sendEmailCode(email: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Supabase Auth 在注册时会自动发送验证邮件，无需单独调用
    // 这个函数保留是为了向后兼容
    console.log(`Supabase 将在注册时自动发送验证邮件到: ${email}`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// 验证验证码
export function verifyCode(target: string, code: string): boolean {
  const savedCode = localStorage.getItem(`verify_code_${target}`);
  return savedCode === code;
}

// 手机号注册
export async function registerWithPhone(
  phone: string,
  password: string,
  code: string,
  nickname?: string
): Promise<AuthResult> {
  try {
    // 验证验证码
    if (!verifyCode(phone, code)) {
      return { success: false, error: '验证码错误或已过期' };
    }
    
    // TODO: 调用知晓云注册接口
    // const response = await fetch(`${ZHIXIAOYUN_CONFIG.serverURL}/auth/register/phone`, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ phone, password, nickname })
    // });
    
    // 模拟注册成功
    const mockUser: User = {
      id: generateUserId(),
      phone,
      nickname: nickname || `用户${phone.slice(-4)}`,
      membershipType: 'free',
      inviteCodeUsed: false,
      createdAt: new Date().toISOString()
    };
    
    // 保存登录状态
    currentUser = mockUser;
    authToken = generateToken();
    saveAuthState();
    
    return { success: true, user: mockUser, token: authToken };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// 邮箱注册（使用 Supabase Auth）
export async function registerWithEmail(
  email: string,
  password: string,
  code: string,  // 保留参数以向后兼容，但不再使用
  nickname?: string
): Promise<AuthResult> {
  try {
    // 导入 Supabase 客户端
    const { supabase } = await import('./dataServiceSupabase');
    
    // 使用 Supabase Auth 注册（会自动发送验证邮件）
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          nickname: nickname || `用户${email.split('@')[0]}`,
        },
        // GitHub Pages 部署在子路径（/yiyu-think-tank-website/），不能只用 origin。
        // 必须包含 BASE_URL，否则邮箱验证跳转会落到 https://guyuan9300.github.io/?page=... 导致打不开。
        emailRedirectTo: `${window.location.origin}${import.meta.env.BASE_URL}?page=login&verified=true`
      }
    });
    
    if (error) {
      console.error('Supabase 注册失败:', error);
      return { success: false, error: error.message };
    }
    
    if (!data.user) {
      return { success: false, error: '注册失败，请稍后重试' };
    }
    
    // 创建用户对象
    const mockUser: User = {
      id: data.user.id,
      email: data.user.email || email,
      nickname: nickname || `用户${email.split('@')[0]}`,
      membershipType: 'free',
      inviteCodeUsed: false,
      createdAt: new Date().toISOString()
    };
    
    // 保存会话信息
    if (data.session) {
      currentUser = mockUser;
      authToken = data.session.access_token;
      saveAuthState();
    }
    
    return { 
      success: true, 
      user: mockUser, 
      token: data.session?.access_token,
      error: data.user.email_confirmed_at ? undefined : '请查收邮箱验证邮件以完成注册'
    };
  } catch (error: any) {
    console.error('邮箱注册异常:', error);
    return { success: false, error: error.message || '注册失败，请稍后重试' };
  }
}

// 手机号登录
export async function loginWithPhone(phone: string, password: string): Promise<AuthResult> {
  try {
    // TODO: 调用知晓云登录接口
    
    // 模拟登录成功
    const mockUser: User = {
      id: generateUserId(),
      phone,
      nickname: `用户${phone.slice(-4)}`,
      membershipType: 'free',
      inviteCodeUsed: false,
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString()
    };
    
    currentUser = mockUser;
    authToken = generateToken();
    saveAuthState();
    
    return { success: true, user: mockUser, token: authToken };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// 邮箱登录（使用 Supabase Auth）
export async function loginWithEmail(email: string, password: string): Promise<AuthResult> {
  try {
    // 导入 Supabase 客户端
    const { supabase } = await import('./dataServiceSupabase');
    
    // 使用 Supabase Auth 登录
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (error) {
      console.error('Supabase 登录失败:', error);
      return { success: false, error: '邮箱或密码错误' };
    }
    
    if (!data.user || !data.session) {
      return { success: false, error: '登录失败，请稍后重试' };
    }
    
    // 检查邮箱是否已验证
    if (!data.user.email_confirmed_at) {
      return { success: false, error: '请先验证您的邮箱后再登录' };
    }
    
    // 创建用户对象
    const mockUser: User = {
      id: data.user.id,
      email: data.user.email || email,
      nickname: data.user.user_metadata?.nickname || `用户${email.split('@')[0]}`,
      avatarUrl: data.user.user_metadata?.avatar_url || undefined,
      membershipType: 'free',
      inviteCodeUsed: false,
      createdAt: data.user.created_at || new Date().toISOString(),
      lastLoginAt: new Date().toISOString()
    };
    
    // 保存会话信息
    currentUser = mockUser;
    authToken = data.session.access_token;
    saveAuthState();
    
    return { success: true, user: mockUser, token: authToken || undefined };
  } catch (error: any) {
    console.error('邮箱登录异常:', error);
    return { success: false, error: error.message || '登录失败，请稍后重试' };
  }
}

// 微信登录
export async function loginWithWechat(code: string): Promise<AuthResult> {
  try {
    // TODO: 调用知晓云微信登录接口
    // 1. 使用code换取openid
    // 2. 获取用户信息
    // 3. 创建/更新用户
    
    const mockUser: User = {
      id: generateUserId(),
      wechatOpenid: 'mock_openid_' + Date.now(),
      nickname: '微信用户',
      avatarUrl: 'https://via.placeholder.com/100',
      membershipType: 'free',
      inviteCodeUsed: false,
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString()
    };
    
    currentUser = mockUser;
    authToken = generateToken();
    saveAuthState();
    
    return { success: true, user: mockUser, token: authToken };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// 退出登录
export function logout() {
  currentUser = null;
  authToken = null;
  localStorage.removeItem('yiyu_user');
  localStorage.removeItem('yiyu_token');
}

// 创建付费订单
export async function createPaymentOrder(
  planId: keyof typeof MEMBERSHIP_PLANS
): Promise<{ success: boolean; orderNo?: string; paymentUrl?: string; error?: string; message?: string }> {
  try {
    if (!currentUser) {
      return { success: false, error: '请先登录' };
    }
    
    const plan = MEMBERSHIP_PLANS[planId];
    if (!plan) {
      return { success: false, error: '无效的套餐' };
    }
    
    // 生成订单号
    const orderNo = `ORDER_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // TODO: 调用支付接口创建订单
    // const response = await fetch(`${ZHIXIAOYUN_CONFIG.serverURL}/payment/create`, {
    //   method: 'POST',
    //   headers: { 
    //     'Content-Type': 'application/json',
    //     'Authorization': `Bearer ${authToken}`
    //   },
    //   body: JSON.stringify({
    //     userId: currentUser.id,
    //     planId,
    //     amount: plan.price,
    //     orderNo
    //   })
    // });
    
    // 模拟创建成功，返回支付链接
    const paymentUrl = `${window.location.origin}/payment?order=${orderNo}&plan=${planId}`;
    console.log(`创建订单: ${orderNo}, 金额: ${plan.price} ${plan.currency}`);
    
    return { success: true, orderNo, paymentUrl };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// 生成邀请码（管理员功能）
export async function generateInvitationCode(
  type: InviteCodeType,
  maxUses: number = 1
): Promise<{ success: boolean; code?: InviteCode; error?: string }> {
  try {
    // 检查是否是有效的邀请码类型
    if (!INVITE_CODE_TYPES[type]) {
      return { success: false, error: '无效的邀请码类型' };
    }
    
    // 生成12位安全的随机邀请码
    let newCode: string;
    let isUnique = false;
    let attempts = 0;
    const maxAttempts = 10;
    
    // 确保邀请码唯一
    do {
      newCode = generateSecureInviteCode();
      if (!mockInviteCodes.has(newCode)) {
        isUnique = true;
      }
      attempts++;
    } while (!isUnique && attempts < maxAttempts);
    
    if (!isUnique) {
      return { success: false, error: '生成邀请码失败，请重试' };
    }
    
    const config = INVITE_CODE_TYPES[type];
    const inviteCode: InviteCode = {
      id: generateUUID(),
      code: newCode,
      type: type,
      bonusDays: config.bonusDays,
      maxUses: maxUses,
      usedCount: 0,
      status: 'valid',
      createdBy: currentUser?.id || 'admin',
      createdAt: new Date().toISOString(),
      usedBy: []
    };
    
    // 存储邀请码
    mockInviteCodes.set(newCode, inviteCode);
    
    console.log(`生成邀请码: ${newCode}, 类型: ${config.label}, 最大使用次数: ${maxUses}`);
    
    return { success: true, code: inviteCode };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// 获取所有邀请码
export async function getAllInviteCodes(): Promise<InviteCode[]> {
  try {
    return Array.from(mockInviteCodes.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  } catch (error) {
    console.error('Failed to get invite codes:', error);
    return [];
  }
}

// 验证邀请码
export async function verifyInviteCode(code: string): Promise<{ 
  success: boolean; 
  valid?: boolean; 
  message?: string;
  inviteCode?: InviteCode;
}> {
  try {
    const normalizedCode = code.trim().toUpperCase();
    
    if (!normalizedCode) {
      return { success: false, valid: false, message: '请输入邀请码' };
    }
    
    const inviteCode = mockInviteCodes.get(normalizedCode);
    
    if (!inviteCode) {
      return { success: false, valid: false, message: '邀请码不存在' };
    }
    
    if (inviteCode.status === 'disabled') {
      return { success: false, valid: false, message: '邀请码已禁用' };
    }
    
    if (inviteCode.status === 'redeemed' && inviteCode.usedCount >= inviteCode.maxUses) {
      return { success: false, valid: false, message: '邀请码已兑换完毕' };
    }
    
    return { success: true, valid: true, inviteCode };
  } catch (error: any) {
    return { success: false, valid: false, message: '验证失败' };
  }
}

// 使用邀请码
export async function useInviteCode(code: string, userId: string): Promise<{ 
  success: boolean; 
  message?: string;
  bonusDays?: number;
}> {
  try {
    const normalizedCode = code.trim().toUpperCase();
    
    // 检查是否已登录
    if (!currentUser) {
      return { success: false, message: '请先登录' };
    }
    
    // 检查用户是否已使用过邀请码
    if (currentUser.inviteCodeUsed) {
      return { success: false, message: '您已使用过邀请码' };
    }
    
    // 验证邀请码
    const verifyResult = await verifyInviteCode(normalizedCode);
    if (!verifyResult.success || !verifyResult.valid) {
      return { success: false, message: verifyResult.message };
    }
    
    const inviteCode = verifyResult.inviteCode!;
    
    // 检查是否还能使用
    if (inviteCode.usedCount >= inviteCode.maxUses) {
      return { success: false, message: '邀请码已兑换完毕' };
    }
    
    // 更新邀请码状态
    inviteCode.usedCount++;
    inviteCode.usedBy?.push(userId);
    
    if (inviteCode.usedCount >= inviteCode.maxUses) {
      inviteCode.status = 'redeemed';
    }
    
    // 更新用户会员状态
    const expireDate = new Date();
    expireDate.setDate(expireDate.getDate() + inviteCode.bonusDays);
    
    currentUser.membershipType = 'premium';
    currentUser.membershipExpireAt = expireDate.toISOString();
    currentUser.inviteCodeUsed = true;
    currentUser.invitedBy = inviteCode.createdBy;
    
    // 保存状态
    saveAuthState();
    
    console.log(`用户 ${userId} 使用邀请码 ${normalizedCode}，获得 ${inviteCode.bonusDays} 天会员`);
    
    return { 
      success: true, 
      message: `恭喜！成功获得 ${inviteCode.bonusDays} 天会员时长`,
      bonusDays: inviteCode.bonusDays
    };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

// 禁用邀请码
export async function disableInviteCode(code: string): Promise<{ success: boolean; message?: string }> {
  try {
    const normalizedCode = code.trim().toUpperCase();
    const inviteCode = mockInviteCodes.get(normalizedCode);
    
    if (!inviteCode) {
      return { success: false, message: '邀请码不存在' };
    }
    
    inviteCode.status = 'disabled';
    console.log(`邀请码 ${normalizedCode} 已禁用`);
    
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

// 删除邀请码
export async function deleteInviteCode(code: string): Promise<{ success: boolean; message?: string }> {
  try {
    const normalizedCode = code.trim().toUpperCase();
    
    if (!mockInviteCodes.has(normalizedCode)) {
      return { success: false, message: '邀请码不存在' };
    }
    
    mockInviteCodes.delete(normalizedCode);
    console.log(`邀请码 ${normalizedCode} 已删除`);
    
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

// 获取用户的邀请码
export async function getUserInvitationCode(userId: string): Promise<string> {
  try {
    // 查找用户是否已被分配了邀请码
    const codes = Array.from(mockInviteCodes.values());
    const userCode = codes.find(code => 
      code.usedBy?.includes(userId)
    );
    
    if (userCode) {
      return userCode.code;
    }
    
    // 为用户生成一个专属邀请码
    let newCode: string;
    let isUnique = false;
    let attempts = 0;
    
    do {
      newCode = generateSecureInviteCode();
      if (!mockInviteCodes.has(newCode)) {
        isUnique = true;
      }
      attempts++;
    } while (!isUnique && attempts < 10);
    
    if (!isUnique) {
      // 返回一个基于用户ID的编码
      return 'INV' + userId.replace(/[^a-zA-Z0-9]/g, '').substring(0, 9).toUpperCase();
    }
    
    const inviteCode: InviteCode = {
      id: generateUUID(),
      code: newCode,
      type: '30days',
      bonusDays: 30,
      maxUses: 1,
      usedCount: 0,
      status: 'valid',
      createdBy: userId,
      createdAt: new Date().toISOString(),
      usedBy: []
    };
    
    mockInviteCodes.set(newCode, inviteCode);
    return newCode;
  } catch (error) {
    console.error('Failed to get invitation code:', error);
    return '';
  }
}

// 获取会员套餐列表
export function getMembershipPlans(): MembershipPlan[] {
  return [
    {
      id: 'monthly',
      name: '月卡',
      price: 99,
      originalPrice: 99,
      currency: 'CNY',
      duration: 30,
      durationText: '月',
      features: ['无限AI对话', '专业报告', '深度分析', '优先客服'],
      popular: false
    },
    {
      id: 'yearly',
      name: '年卡',
      price: 899,
      originalPrice: 999,
      currency: 'CNY',
      duration: 365,
      durationText: '年',
      features: ['无限AI对话', '专业报告', '深度分析', '优先客服', '赠送30天'],
      popular: true,
      bonus: '额外赠送30天会员时长'
    },
    {
      id: 'lifetime',
      name: '终身会员',
      price: 2999,
      originalPrice: 2999,
      currency: 'CNY',
      duration: null,
      durationText: '终身',
      features: ['无限AI对话', '专业报告', '深度分析', '优先客服', '终身免费'],
      popular: false,
      bonus: '一次性付费，终身享用'
    }
  ];
}

export interface MembershipPlan {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  currency: string;
  duration: number | null;
  durationText: string;
  features: string[];
  popular?: boolean;
  bonus?: string;
}

// 辅助函数
function generateUserId(): string {
  return 'user_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

function generateToken(): string {
  return 'token_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 16);
}

// 生成安全的12位随机邀请码
function generateSecureInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 去除易混淆字符（I、O、0、1）
  const length = 12;
  const randomValues = new Uint32Array(length);
  crypto.getRandomValues(randomValues);
  
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars[randomValues[i] % chars.length];
  }
  
  // 添加前缀标识类型
  return 'INV' + code;
}

// 生成UUID（用于邀请码ID）
function generateUUID(): string {
  return crypto.randomUUID?.() || 
    'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
}

function saveAuthState() {
  if (currentUser && authToken) {
    localStorage.setItem('yiyu_user', JSON.stringify(currentUser));
    localStorage.setItem('yiyu_token', authToken);
  }
}

// 模拟邀请码存储（实际应该存储在后端数据库）
const mockInviteCodes: Map<string, InviteCode> = new Map();

// 初始化一些测试邀请码
function initMockInviteCodes() {
  if (mockInviteCodes.size === 0) {
    // 添加一些示例邀请码
    const sampleCodes: InviteCode[] = [
      {
        id: generateUUID(),
        code: generateSecureInviteCode(),
        type: '30days',
        bonusDays: 30,
        maxUses: 5,
        usedCount: 2,
        status: 'valid',
        createdBy: 'admin',
        createdAt: new Date().toISOString(),
        usedBy: ['user1', 'user2']
      },
      {
        id: generateUUID(),
        code: generateSecureInviteCode(),
        type: '365days',
        bonusDays: 365,
        maxUses: 1,
        usedCount: 0,
        status: 'valid',
        createdBy: 'admin',
        createdAt: new Date().toISOString(),
        usedBy: []
      },
      {
        id: generateUUID(),
        code: generateSecureInviteCode(),
        type: '1095days',
        bonusDays: 1095,
        maxUses: 1,
        usedCount: 1,
        status: 'redeemed',
        createdBy: 'admin',
        createdAt: new Date().toISOString(),
        usedBy: ['user3']
      }
    ];
    
    sampleCodes.forEach(code => {
      mockInviteCodes.set(code.code, code);
    });
  }
}

// 初始化
initMockInviteCodes();

export default {
  initAuth,
  getCurrentUser,
  isLoggedIn,
  isPremiumMember,
  getMembershipDays,
  sendSMSCode,
  sendEmailCode,
  verifyCode,
  registerWithPhone,
  registerWithEmail,
  loginWithPhone,
  loginWithEmail,
  loginWithWechat,
  logout,
  useInviteCode,
  createPaymentOrder,
  getUserInvitationCode,
  generateInvitationCode,
  getAllInviteCodes,
  verifyInviteCode,
  disableInviteCode,
  deleteInviteCode,
  getMembershipPlans,
  INVITE_CODE_TYPES
};
