import { authRequest } from './authHttp';

export interface PaymentOrder {
  id: string;
  orderNo: string;
  userId?: string;
  userNickname?: string;
  planId: 'monthly' | 'yearly' | 'lifetime';
  planName: string;
  amountFen: number;
  amount: number;
  currency: string;
  durationDays: number | null;
  memberTypeTarget: 'gold' | 'diamond' | 'regular';
  channel: string;
  providerName: string;
  status: string;
  note?: string;
  expiresAt?: string;
  paidAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentReadiness {
  provider: string;
  channel: string;
  mode: 'prep_only';
  enabled: boolean;
  items: Array<{ key: string; label: string; configured: boolean }>;
  notifyUrl?: string;
  h5Domain?: string;
  totalOrders: number;
  paidOrders: number;
  openOrders: number;
}

export function createPaymentOrderApi(planId: 'monthly' | 'yearly' | 'lifetime') {
  return authRequest<{ order: PaymentOrder; readiness: PaymentReadiness; paymentUrl: string | null }>(
    '/payment/orders',
    { method: 'POST', body: JSON.stringify({ planId }) },
    { withAuth: true }
  );
}

export function fetchAdminPaymentOrders(limit = 20) {
  const params = new URLSearchParams({ scope: 'admin', limit: String(limit) });
  return authRequest<PaymentOrder[]>(`/payment/orders?${params.toString()}`, undefined, { withAuth: true });
}

export function fetchPaymentReadiness() {
  return authRequest<PaymentReadiness>('/payment/readiness', undefined, { withAuth: true });
}
