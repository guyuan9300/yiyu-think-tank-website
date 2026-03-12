import { authRequest } from './authHttp';
import type { User } from './dataService';

export type AdminManagedUser = User & {
  adminRole?: 'admin';
};

export function fetchAdminUsers() {
  return authRequest<AdminManagedUser[]>('/admin/users', undefined, { withAuth: true });
}

export function updateAdminUserStatusApi(userId: string, status: 'active' | 'disabled') {
  return authRequest<{ user: AdminManagedUser }>(
    `/admin/users/${encodeURIComponent(userId)}/status`,
    { method: 'POST', body: JSON.stringify({ status }) },
    { withAuth: true }
  );
}

export function setAdminUserPaidApi(userId: string, payload: {
  enabled: boolean;
  source?: 'manual' | 'invite_code' | 'payment' | 'strategy_client';
  note?: string;
}) {
  return authRequest<{ user: AdminManagedUser }>(
    `/admin/users/${encodeURIComponent(userId)}/paid/set`,
    { method: 'POST', body: JSON.stringify(payload) },
    { withAuth: true }
  );
}

export function extendAdminUserPaidApi(userId: string, days = 30) {
  return authRequest<{ user: AdminManagedUser }>(
    `/admin/users/${encodeURIComponent(userId)}/paid/extend`,
    { method: 'POST', body: JSON.stringify({ days }) },
    { withAuth: true }
  );
}
