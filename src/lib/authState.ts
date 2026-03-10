import { getSavedUserRaw } from './storage';

export type SessionUser = {
  id: string;
  email?: string;
  phone?: string;
  nickname?: string;
  memberType?: 'regular' | 'gold' | 'diamond';
  status?: string;
  createdAt?: string;
  lastLoginAt?: string;
};

export function getSessionUser(): SessionUser | null {
  const raw = getSavedUserRaw();
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SessionUser;
  } catch {
    return null;
  }
}

export function isPremiumLike(user: SessionUser | null): boolean {
  if (!user) return false;
  return user.memberType === 'gold' || user.memberType === 'diamond';
}
