export interface TencentAuthUser {
  id: string;
  email?: string;
  phone?: string;
  nickname: string;
  avatarUrl?: string;
  membershipType: 'free' | 'premium' | 'lifetime';
  membershipExpireAt?: string;
  invitedBy?: string;
  inviteCodeUsed: boolean;
  createdAt: string;
  lastLoginAt?: string;
  passwordMigrated?: boolean;
}

export interface TencentAuthSession {
  token: string;
  user: TencentAuthUser;
  expiresAt?: string;
}

export interface InviteCodeRow {
  id: string;
  code: string;
  type: '30days' | '365days' | '1095days' | 'strategy_project';
  grantKind?: 'member_days' | 'strategy_project';
  bonusDays: number;
  maxUses: number;
  usedCount: number;
  status: 'valid' | 'redeemed' | 'disabled';
  createdBy: string;
  createdAt: string;
  usedBy?: string[];
  projectId?: string;
  projectNameSnapshot?: string;
}
