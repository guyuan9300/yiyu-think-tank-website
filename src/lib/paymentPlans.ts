export type PaymentPlanId = 'monthly_trial' | 'yearly';

export interface PaymentPlanOption {
  id: PaymentPlanId;
  name: string;
  shortName: string;
  amountFen: number;
  durationDays: number;
  highlight: string;
  description: string;
}

export const PAYMENT_PLAN_OPTIONS: PaymentPlanOption[] = [
  {
    id: 'monthly_trial',
    name: '月包试用',
    shortName: '月包',
    amountFen: 1980,
    durationDays: 30,
    highlight: '适合先体验',
    description: '30 天试用期，适合先熟悉内容与服务方式。',
  },
  {
    id: 'yearly',
    name: '年包会员',
    shortName: '年包',
    amountFen: 19800,
    durationDays: 365,
    highlight: '长期陪伴更划算',
    description: '365 天有效，适合持续学习与长期使用。',
  },
];

export const PAYMENT_PLAN_MAP = Object.fromEntries(
  PAYMENT_PLAN_OPTIONS.map((plan) => [plan.id, plan])
) as Record<PaymentPlanId, PaymentPlanOption>;

export function formatPlanMoney(amountFen: number) {
  return `¥${(amountFen / 100).toFixed(2)}`;
}
