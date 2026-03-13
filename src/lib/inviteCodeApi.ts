import type { InviteCode, InviteCodeType, InviteGrantKind } from './inviteCodeTypes';
import { authRequest } from './authHttp';
import type { AuthApiUser } from './authApi';

export type InviteCodeDto = InviteCode;

export const fetchInviteCodes = () => authRequest<InviteCodeDto[]>('/invite-codes', undefined, { withAuth: true });

export const createInviteCode = (params: {
  type: InviteCodeType;
  maxUses?: number;
  grantKind?: InviteGrantKind;
  projectId?: string;
}) =>
  authRequest<InviteCodeDto>(
    '/invite-codes',
    {
      method: 'POST',
      body: JSON.stringify({
        type: params.type,
        maxUses: params.maxUses ?? 1,
        grantKind: params.grantKind,
        projectId: params.projectId,
      }),
    },
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
