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
import { getSavedUserRaw, getSavedAuthToken, saveAuthToken, saveUserRaw, clearUser, USER_KEY } from './storage';
import { getSessionUser } from './authState';
import { loginByPassword, registerByCode, resetPasswordByCode, sendVerifyCode } from './authApi';
import { createInviteCode, deleteInviteCodeApi, disableInviteCodeApi, fetchInviteCodes, redeemInviteCodeApi } from './inviteCodeApi';
import { INVITE_CODE_TYPES, type InviteCode, type InviteCodeType } from './inviteCodeTypes';
import { createPaymentOrderApi } from './paymentApi';

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
  const savedUser = getSavedUserRaw();
  const savedToken = getSavedAuthToken();
  if (savedUser && savedToken) {
    try {
      currentUser = JSON.parse(savedUser);
      authToken = savedToken;
      return true;
    } catch {
      clearUser();
    }
  }
  return false;
}

// 获取当前用户
export function getCurrentUser(): User | null {
  return (getSessionUser() as User | null) || currentUser;
}

// 检查是否已登录
export function isLoggedIn(): boolean {
  return !!getCurrentUser();
}

// 检查是否是付费会员
export function isPremiumMember(): boolean {
  const user = getCurrentUser();
  if (!user) return false;
  if (user.membershipType === 'lifetime' || user.membershipType === 'premium') return true;
  const mt = (user as any).memberType;
  return mt === 'gold' || mt === 'diamond';
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
  const result = await sendVerifyCode('phone', phone, 'register');
  return { success: result.ok, error: result.error };
}

// 发送邮箱验证码（已废弃，使用 Supabase Auth 自动发送验证邮件）
export async function sendEmailCode(email: string): Promise<{ success: boolean; error?: string }> {
  const result = await sendVerifyCode('email', email, 'register');
  return { success: result.ok, error: result.error };
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
    const result = await registerByCode({ channel: 'phone', target: phone.trim(), code: code.trim(), password, nickname });
    if (!result.ok || !result.data?.user) {
      return { success: false, error: result.error || '注册失败，请稍后重试' };
    }
    const user: User = {
      id: result.data.user.id,
      phone: result.data.user.phone || phone,
      email: result.data.user.email,
      nickname: result.data.user.nickname || nickname || `用户${phone.slice(-4)}`,
      membershipType: result.data.user.memberType === 'regular' ? 'free' : 'premium',
      membershipExpireAt: result.data.user.paidExpiresAt,
      invitedBy: result.data.user.invitedBy,
      inviteCodeUsed: Boolean(result.data.user.invitationCode),
      createdAt: result.data.user.createdAt || new Date().toISOString(),
      lastLoginAt: result.data.user.lastLoginAt,
    };
    currentUser = user;
    authToken = result.data.token || null;
    const remember = localStorage.getItem(USER_KEY) != null;
    saveUserRaw(JSON.stringify(user), remember);
    if (result.data.token) saveAuthToken(result.data.token, remember);
    return { success: true, user, token: result.data.token };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// 邮箱注册（使用 Supabase Auth）
export async function registerWithEmail(
  email: string,
  password: string,
  code: string,
  nickname?: string
): Promise<AuthResult> {
  try {
    const result = await registerByCode({ channel: 'email', target: email.trim().toLowerCase(), code: code.trim(), password, nickname });
    if (!result.ok || !result.data?.user) {
      return { success: false, error: result.error || '注册失败，请稍后重试' };
    }
    const user: User = {
      id: result.data.user.id,
      email: result.data.user.email || email,
      phone: result.data.user.phone,
      nickname: result.data.user.nickname || nickname || `用户${email.split('@')[0]}`,
      membershipType: result.data.user.memberType === 'regular' ? 'free' : 'premium',
      membershipExpireAt: result.data.user.paidExpiresAt,
      invitedBy: result.data.user.invitedBy,
      inviteCodeUsed: Boolean(result.data.user.invitationCode),
      createdAt: result.data.user.createdAt || new Date().toISOString(),
      lastLoginAt: result.data.user.lastLoginAt,
    };
    currentUser = user;
    authToken = result.data.token || null;
    const remember = localStorage.getItem(USER_KEY) != null;
    saveUserRaw(JSON.stringify(user), remember);
    if (result.data.token) saveAuthToken(result.data.token, remember);
    return { success: true, user, token: result.data.token };
  } catch (error: any) {
    return { success: false, error: error.message || '注册失败，请稍后重试' };
  }
}

// 手机号登录
export async function loginWithPhone(phone: string, password: string): Promise<AuthResult> {
  try {
    const result = await loginByPassword({ channel: 'phone', target: phone.trim(), password });
    if (!result.ok || !result.data?.user) {
      return { success: false, error: result.error || '登录失败，请稍后重试' };
    }
    const user: User = {
      id: result.data.user.id,
      phone: result.data.user.phone || phone,
      email: result.data.user.email,
      nickname: result.data.user.nickname || `用户${phone.slice(-4)}`,
      membershipType: result.data.user.memberType === 'regular' ? 'free' : 'premium',
      membershipExpireAt: result.data.user.paidExpiresAt,
      invitedBy: result.data.user.invitedBy,
      inviteCodeUsed: Boolean(result.data.user.invitationCode),
      createdAt: result.data.user.createdAt || new Date().toISOString(),
      lastLoginAt: result.data.user.lastLoginAt || new Date().toISOString(),
    };
    currentUser = user;
    authToken = result.data.token || null;
    const remember = localStorage.getItem(USER_KEY) != null;
    saveUserRaw(JSON.stringify(user), remember);
    if (result.data.token) saveAuthToken(result.data.token, remember);
    return { success: true, user, token: result.data.token };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// 邮箱登录（使用 Supabase Auth）
export async function loginWithEmail(email: string, password: string): Promise<AuthResult> {
  try {
    const result = await loginByPassword({ channel: 'email', target: email.trim().toLowerCase(), password });
    if (!result.ok || !result.data?.user) {
      return { success: false, error: result.error || '邮箱或密码错误' };
    }
    const user: User = {
      id: result.data.user.id,
      email: result.data.user.email || email,
      phone: result.data.user.phone,
      nickname: result.data.user.nickname || `用户${email.split('@')[0]}`,
      membershipType: result.data.user.memberType === 'regular' ? 'free' : 'premium',
      membershipExpireAt: result.data.user.paidExpiresAt,
      invitedBy: result.data.user.invitedBy,
      inviteCodeUsed: Boolean(result.data.user.invitationCode),
      createdAt: result.data.user.createdAt || new Date().toISOString(),
      lastLoginAt: result.data.user.lastLoginAt || new Date().toISOString(),
    };
    currentUser = user;
    authToken = result.data.token || null;
    const remember = localStorage.getItem(USER_KEY) != null;
    saveUserRaw(JSON.stringify(user), remember);
    if (result.data.token) saveAuthToken(result.data.token, remember);
    return { success: true, user, token: result.data.token };
  } catch (error: any) {
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
    saveUserRaw(JSON.stringify(currentUser), true);
    if (authToken) saveAuthToken(authToken, true);
    
    return { success: true, user: mockUser, token: authToken };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// 退出登录
export function logout() {
  currentUser = null;
  authToken = null;
  clearUser();
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
    
    const result = await createPaymentOrderApi(planId);
    if (!result.ok || !result.data?.order) {
      return { success: false, error: result.error || '创建订单失败，请稍后重试' };
    }

    console.log(`创建订单: ${result.data.order.orderNo}, 金额: ${plan.price} ${plan.currency}`);
    return {
      success: true,
      orderNo: result.data.order.orderNo,
      paymentUrl: result.data.paymentUrl || undefined,
      message: result.message,
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// 生成邀请码（管理员功能）
export async function generateInvitationCode(
  type: InviteCodeType,
  maxUses: number = 1
): Promise<{ success: boolean; code?: InviteCode; error?: string }> {
  const result = await createInviteCode({ type, maxUses });
  return { success: result.ok, code: result.data as InviteCode | undefined, error: result.error };
}

// 获取所有邀请码
export async function getAllInviteCodes(): Promise<InviteCode[]> {
  const result = await fetchInviteCodes();
  return result.ok && result.data ? (result.data as InviteCode[]) : [];
}

// 验证邀请码
export async function verifyInviteCode(code: string): Promise<{ 
  success: boolean; 
  valid?: boolean; 
  message?: string;
  inviteCode?: InviteCode;
}> {
  const normalizedCode = code.trim().toUpperCase();
  if (!normalizedCode) return { success: false, valid: false, message: '请输入邀请码' };
  const list = await getAllInviteCodes();
  const inviteCode = list.find((x) => x.code === normalizedCode);
  if (!inviteCode) return { success: false, valid: false, message: '邀请码不存在' };
  if (inviteCode.status === 'disabled') return { success: false, valid: false, message: '邀请码已禁用' };
  if (inviteCode.status === 'redeemed' && inviteCode.usedCount >= inviteCode.maxUses) return { success: false, valid: false, message: '邀请码已兑换完毕' };
  return { success: true, valid: true, inviteCode };
}

// 使用邀请码
export async function useInviteCode(code: string, _userId: string): Promise<{ 
  success: boolean; 
  message?: string;
  bonusDays?: number;
}> {
  const result = await redeemInviteCodeApi(code);
  return {
    success: result.ok,
    message: result.ok ? (result.message || '邀请码兑换成功') : result.error,
  };
}

// 禁用邀请码
export async function disableInviteCode(code: string): Promise<{ success: boolean; message?: string }> {
  const result = await disableInviteCodeApi(code);
  return { success: result.ok, message: result.error };
}

// 删除邀请码
export async function deleteInviteCode(code: string): Promise<{ success: boolean; message?: string }> {
  const result = await deleteInviteCodeApi(code);
  return { success: result.ok, message: result.error };
}

// 获取用户的邀请码
export async function getUserInvitationCode(_userId: string): Promise<string> {
  return '';
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
