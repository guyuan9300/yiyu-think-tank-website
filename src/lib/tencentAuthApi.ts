import type { TencentAuthSession, TencentAuthUser } from './tencentAuthTypes';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
    ...init,
  });
  const text = await res.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch {}
  if (!res.ok) {
    throw new Error((data && data.error) || text || `HTTP ${res.status}`);
  }
  return data as T;
}

export interface TencentRegisterInput {
  email?: string;
  phone?: string;
  password: string;
  nickname?: string;
  verifyCode?: string;
}

export interface TencentLoginInput {
  channel: 'email' | 'phone';
  target: string;
  password: string;
}

export interface TencentAuthResponse {
  ok: boolean;
  session?: TencentAuthSession;
  user?: TencentAuthUser;
  error?: string;
  phase?: string;
}

const AUTH_BASE = (import.meta as any)?.env?.VITE_AUTH_API_BASE_URL || '/api/auth';

export const tencentAuthBootstrap = () => request<TencentAuthResponse>(`${AUTH_BASE}/bootstrap`);
export const tencentRegister = (input: TencentRegisterInput) => request<TencentAuthResponse>(`${AUTH_BASE}/register`, { method: 'POST', body: JSON.stringify(input) });
export const tencentLogin = (input: TencentLoginInput) => request<TencentAuthResponse>(`${AUTH_BASE}/login`, { method: 'POST', body: JSON.stringify(input) });
export const tencentSession = (token: string) => request<TencentAuthResponse>(`${AUTH_BASE}/session`, { headers: { Authorization: `Bearer ${token}` } });
