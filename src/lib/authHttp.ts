import { getSavedAuthToken } from './storage';

export interface ApiResult<T = any> {
  ok: boolean;
  error?: string;
  message?: string;
  data?: T;
}

export const AUTH_BASE = (import.meta as any)?.env?.VITE_AUTH_API_BASE_URL || '/api/auth';

export async function authRequest<T = any>(
  path: string,
  init?: RequestInit,
  options?: { withAuth?: boolean }
): Promise<ApiResult<T>> {
  try {
    const headers = new Headers(init?.headers || {});
    if (!headers.has('Content-Type') && !(init?.body instanceof FormData)) {
      headers.set('Content-Type', 'application/json');
    }

    if (options?.withAuth) {
      const token = getSavedAuthToken();
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
    }

    const res = await fetch(`${AUTH_BASE}${path}`, {
      ...init,
      headers,
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || json?.ok === false) {
      return { ok: false, error: json?.error || `请求失败(${res.status})` };
    }
    return { ok: true, data: json?.data, message: json?.message };
  } catch (error: any) {
    return { ok: false, error: error?.message || '网络异常，请稍后重试' };
  }
}
