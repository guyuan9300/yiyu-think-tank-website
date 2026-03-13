import { authRequest, type ApiResult } from './authHttp';

export type AuthChannel = 'phone' | 'email';
export type AuthScene = 'register' | 'reset';

export interface AuthApiUser {
  id: string;
  email?: string;
  phone?: string;
  nickname?: string;
  avatarUrl?: string;
  memberType?: 'regular' | 'gold' | 'diamond';
  status?: 'active' | 'disabled';
  adminRole?: 'admin';
  invitationCode?: string;
  invitedBy?: string;
  paidSource?: 'manual' | 'invite_code' | 'payment' | 'strategy_client';
  paidStartedAt?: string;
  paidExpiresAt?: string;
  paidNote?: string;
  createdAt?: string;
  lastLoginAt?: string;
  loginCount?: number;
  commentsCount?: number;
  favoritesCount?: number;
}

export interface LoginResponseData {
  user: AuthApiUser;
  token?: string;
  expiresAt?: string;
}

export async function sendVerifyCode(channel: AuthChannel, target: string, scene: AuthScene) {
  return authRequest('/send-code', {
    method: 'POST',
    body: JSON.stringify({ channel, target, scene }),
  });
}

export async function registerByCode(params: {
  channel: AuthChannel;
  target: string;
  code: string;
  password: string;
  nickname?: string;
  inviteCode?: string;
}) {
  return authRequest<LoginResponseData>('/register', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

export async function loginByPassword(params: {
  channel: AuthChannel;
  target: string;
  password: string;
}) {
  return authRequest<LoginResponseData>('/login', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

export async function resetPasswordByCode(params: {
  channel: AuthChannel;
  target: string;
  code: string;
  newPassword: string;
}) {
  return authRequest('/reset-password', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

export async function fetchCurrentSession() {
  return authRequest<{ user: AuthApiUser; expiresAt?: string }>('/session', undefined, { withAuth: true });
}

export async function fetchCurrentProfile() {
  return authRequest<{ user: AuthApiUser }>('/profile', undefined, { withAuth: true });
}

export async function updateCurrentProfile(params: { nickname: string; avatarUrl?: string | null }) {
  return authRequest<{ user: AuthApiUser }>('/profile', {
    method: 'POST',
    body: JSON.stringify(params),
  }, { withAuth: true });
}

export async function logoutCurrentSession() {
  return authRequest('/logout', { method: 'POST' }, { withAuth: true });
}

export function normalizeLoginUser(u: AuthApiUser) {
  const now = new Date().toISOString();
  const email = u.email || '';

  return {
    id: u.id,
    email: email || undefined,
    phone: u.phone,
    nickname: u.nickname || (u.phone ? `用户${u.phone.slice(-4)}` : (email?.split('@')[0] || '用户')),
    avatarUrl: u.avatarUrl,
    avatar: u.avatarUrl,
    memberType: u.memberType || 'regular',
    status: u.status || 'active',
    adminRole: u.adminRole,
    invitationCode: u.invitationCode,
    invitedBy: u.invitedBy,
    paidSource: u.paidSource,
    paidStartedAt: u.paidStartedAt,
    paidExpiresAt: u.paidExpiresAt,
    paidNote: u.paidNote,
    loginCount: u.loginCount ?? 1,
    commentsCount: u.commentsCount ?? 0,
    favoritesCount: u.favoritesCount ?? 0,
    createdAt: u.createdAt || now,
    lastLoginAt: u.lastLoginAt || now,
  };
}

export type { ApiResult };
