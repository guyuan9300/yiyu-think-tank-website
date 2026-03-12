import type { User } from './dataService';

export type AdminSurfaceRole = 'guest' | 'free_member' | 'paid_member' | 'admin';
export type AdminMembershipValue = 'regular' | 'paid';

export interface AdminSurfaceRoleMeta {
  label: string;
  shortLabel: string;
  badgeClass: string;
}

export const ADMIN_SURFACE_ROLE_META: Record<AdminSurfaceRole, AdminSurfaceRoleMeta> = {
  guest: {
    label: '访客',
    shortLabel: '访客',
    badgeClass: 'bg-slate-100 text-slate-700',
  },
  free_member: {
    label: '普通会员',
    shortLabel: '普通',
    badgeClass: 'bg-gray-100 text-gray-700',
  },
  paid_member: {
    label: '付费会员',
    shortLabel: '付费',
    badgeClass: 'bg-amber-100 text-amber-700',
  },
  admin: {
    label: '管理员',
    shortLabel: '管理',
    badgeClass: 'bg-purple-100 text-purple-700',
  },
};

export function mapStoredMemberTypeToAdminRole(memberType?: User['memberType']): AdminSurfaceRole {
  if (memberType === 'gold' || memberType === 'diamond') {
    return 'paid_member';
  }
  return 'free_member';
}

export function getAdminRoleMeta(role: AdminSurfaceRole): AdminSurfaceRoleMeta {
  return ADMIN_SURFACE_ROLE_META[role];
}

export function isStoredPaidMember(memberType?: User['memberType']): boolean {
  return memberType === 'gold' || memberType === 'diamond';
}

export function getAdminMembershipValue(memberType?: User['memberType']): AdminMembershipValue {
  return isStoredPaidMember(memberType) ? 'paid' : 'regular';
}

export function toStoredMemberType(
  value: AdminMembershipValue,
  previous?: User['memberType']
): User['memberType'] {
  if (value === 'regular') {
    return 'regular';
  }
  return previous === 'diamond' ? 'diamond' : 'gold';
}
