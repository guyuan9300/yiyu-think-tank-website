import { appConfig } from './config';

export type AuthChannel = 'phone' | 'email';
export type AuthScene = 'register' | 'reset';

export interface AuthApiUser {
  id: string;
  email?: string;
  phone?: string;
  nickname?: string;
  memberType?: 'regular' | 'gold' | 'diamond';
  status?: 'active' | 'disabled';
  createdAt?: string;
  lastLoginAt?: string;
}

interface ApiResult<T = any> {
  ok: boolean;
  error?: string;
  message?: string;
  data?: T;
}

export interface LoginResponseData {
  user: AuthApiUser;
}

const AUTH_BASE = appConfig.auth.baseUrl || '/api/auth';

async function post<T = any>(path: string, payload: Record<string, any>): Promise<ApiResult<T>> {
  try {
    const res = await fetch(`${AUTH_BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || json?.ok === false) {
      return { ok: false, error: json?.error || `请求失败(${res.status})` };
    }
    return { ok: true, data: json?.data, message: json?.message };
  } catch (e: any) {
    return { ok: false, error: e?.message || '网络异常，请稍后重试' };
  }
}

export async function sendVerifyCode(channel: AuthChannel, target: string, scene: AuthScene) {
  return post('/send-code', { channel, target, scene });
}

export async function registerByCode(params: {
  channel: AuthChannel;
  target: string;
  code: string;
  password: string;
  nickname?: string;
}) {
  return post<{ user: AuthApiUser }>('/register', params);
}

export async function loginByPassword(params: {
  channel: AuthChannel;
  target: string;
  password: string;
}) {
  return post<LoginResponseData>('/login', params);
}

export async function resetPasswordByCode(params: {
  channel: AuthChannel;
  target: string;
  code: string;
  newPassword: string;
}) {
  return post('/reset-password', params);
}

export function normalizeLoginUser(u: AuthApiUser) {
  const now = new Date().toISOString();
  const email = u.email || (u.phone ? `${u.phone}@phone.local` : '');
  return {
    id: u.id,
    email,
    phone: u.phone,
    nickname: u.nickname || (u.phone ? `用户${u.phone.slice(-4)}` : (email?.split('@')[0] || '用户')),
    memberType: u.memberType || 'regular',
    status: u.status || 'active',
    loginCount: 1,
    commentsCount: 0,
    favoritesCount: 0,
    createdAt: u.createdAt || now,
    lastLoginAt: u.lastLoginAt || now,
  };
}
