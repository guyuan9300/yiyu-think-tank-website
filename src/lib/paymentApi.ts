import { authRequest } from './authHttp';
import type { PaymentPlanId } from './paymentPlans';

export interface PaymentOrder {
  id: string;
  orderNo: string;
  userId?: string;
  userNickname?: string;
  planId: PaymentPlanId;
  planName: string;
  amountFen: number;
  amount: number;
  currency: string;
  durationDays: number | null;
  memberTypeTarget: 'paid';
  buyerName?: string;
  buyerOrg?: string;
  buyerPhone?: string;
  buyerEmail?: string;
  buyerNote?: string;
  channel: string;
  providerName: string;
  status: 'pending' | 'paid' | 'closed' | 'expired' | 'failed' | string;
  note?: string;
  expiresAt?: string;
  timeExpire?: string;
  paidAt?: string;
  h5UrlSnapshot?: string;
  providerOrderId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentReadiness {
  provider: string;
  channel: string;
  mode: 'live' | 'setup_pending';
  enabled: boolean;
  items: Array<{ key: string; label: string; configured: boolean }>;
  notifyUrl?: string;
  h5Domain?: string;
  returnUrl?: string;
  totalOrders: number;
  paidOrders: number;
  openOrders: number;
}

export interface CreatePaymentOrderPayload {
  planId: PaymentPlanId;
  buyerName: string;
  buyerOrg?: string;
  buyerPhone: string;
  buyerEmail: string;
  buyerNote?: string;
}

export function createPaymentOrderApi(payload: CreatePaymentOrderPayload) {
  return authRequest<{ order: PaymentOrder; readiness: PaymentReadiness; h5Url: string; timeExpire?: string }>(
    '/payment/orders',
    { method: 'POST', body: JSON.stringify(payload) },
    { withAuth: true }
  );
}

export function fetchAdminPaymentOrders(limit = 20) {
  const params = new URLSearchParams({ scope: 'admin', limit: String(limit) });
  return authRequest<PaymentOrder[]>(`/payment/orders?${params.toString()}`, undefined, { withAuth: true });
}

export function fetchUserPaymentOrders(limit = 20) {
  const params = new URLSearchParams({ limit: String(limit) });
  return authRequest<PaymentOrder[]>(`/payment/orders?${params.toString()}`, undefined, { withAuth: true });
}

export function fetchPaymentOrder(orderNo: string) {
  return authRequest<PaymentOrder>(`/payment/orders/${encodeURIComponent(orderNo)}`, undefined, { withAuth: true });
}

export function fetchPaymentReadiness() {
  return authRequest<PaymentReadiness>('/payment/readiness', undefined, { withAuth: true });
}
