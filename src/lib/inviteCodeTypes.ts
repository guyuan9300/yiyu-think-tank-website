export type InviteCodeType = '30days' | '365days' | '1095days' | 'strategy_project';
export type InviteCodeStatus = 'valid' | 'redeemed' | 'disabled';
export type InviteGrantKind = 'member_days' | 'strategy_project';

export interface InviteCode {
  id: string;
  code: string;
  type: InviteCodeType;
  grantKind: InviteGrantKind;
  bonusDays: number;
  maxUses: number;
  usedCount: number;
  status: InviteCodeStatus;
  createdBy: string;
  createdAt: string;
  usedBy?: string[];
  projectId?: string;
  projectNameSnapshot?: string;
}

export const INVITE_CODE_TYPES: Record<InviteCodeType, { label: string; bonusDays: number; description: string }> = {
  '30days': { label: '30天试用', bonusDays: 30, description: '有效期30天的试用邀请码' },
  '365days': { label: '年卡会员', bonusDays: 365, description: '有效期365天的会员邀请码' },
  '1095days': { label: '三年会员', bonusDays: 1095, description: '有效期3年的会员邀请码' },
  'strategy_project': { label: '机构战略邀请码', bonusDays: 0, description: '绑定机构战略陪伴并开通付费资格' },
};
