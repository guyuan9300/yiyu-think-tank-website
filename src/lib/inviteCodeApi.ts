export type InviteCodeType = '30days' | '365days' | '1095days';
export type InviteCodeStatus = 'valid' | 'redeemed' | 'disabled';

export interface InviteCodeDto {
  id: string;
  code: string;
  type: InviteCodeType;
  bonusDays: number;
  maxUses: number;
  usedCount: number;
  status: InviteCodeStatus;
  createdBy: string;
  createdAt: string;
  usedBy?: string[];
}

interface ApiResult<T = any> {
  ok: boolean;
  error?: string;
  message?: string;
  data?: T;
}

const AUTH_BASE = (import.meta as any)?.env?.VITE_AUTH_API_BASE_URL || '/api/auth';

async function req<T>(path: string, init?: RequestInit): Promise<ApiResult<T>> {
  try {
    const res = await fetch(`${AUTH_BASE}${path}`, {
      headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
      ...init,
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || json?.ok === false) return { ok: false, error: json?.error || `请求失败(${res.status})` };
    return { ok: true, data: json?.data, message: json?.message };
  } catch (e: any) {
    return { ok: false, error: e?.message || '网络异常，请稍后重试' };
  }
}

export const fetchInviteCodes = () => req<InviteCodeDto[]>('/invite-codes');
export const createInviteCode = (type: InviteCodeType, maxUses = 1) => req<InviteCodeDto>('/invite-codes', { method: 'POST', body: JSON.stringify({ type, maxUses }) });
export const disableInviteCodeApi = (code: string) => req<null>(`/invite-codes/${encodeURIComponent(code)}/disable`, { method: 'POST' });
export const deleteInviteCodeApi = (code: string) => req<null>(`/invite-codes/${encodeURIComponent(code)}`, { method: 'DELETE' });
