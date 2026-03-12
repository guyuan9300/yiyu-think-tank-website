import type { InviteCode, InviteCodeType } from './inviteCodeTypes';
import { authRequest } from './authHttp';
import type { AuthApiUser } from './authApi';

export type InviteCodeDto = InviteCode;

export const fetchInviteCodes = () => authRequest<InviteCodeDto[]>('/invite-codes', undefined, { withAuth: true });

export const createInviteCode = (type: InviteCodeType, maxUses = 1) =>
  authRequest<InviteCodeDto>(
    '/invite-codes',
    { method: 'POST', body: JSON.stringify({ type, maxUses }) },
    { withAuth: true }
  );

export const disableInviteCodeApi = (code: string) =>
  authRequest<null>(
    `/invite-codes/${encodeURIComponent(code)}/disable`,
    { method: 'POST' },
    { withAuth: true }
  );

export const deleteInviteCodeApi = (code: string) =>
  authRequest<null>(
    `/invite-codes/${encodeURIComponent(code)}`,
    { method: 'DELETE' },
    { withAuth: true }
  );

export const redeemInviteCodeApi = (code: string) =>
  authRequest<{ user: AuthApiUser }>(
    '/invite-codes/redeem',
    { method: 'POST', body: JSON.stringify({ code }) },
    { withAuth: true }
  );
