import { Loader2, ShieldCheck } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Header } from './Header';
import { fetchCurrentProfile } from '../lib/authApi';
import { createPaymentOrderApi, type PaymentReadiness } from '../lib/paymentApi';
import { PAYMENT_PLAN_MAP, type PaymentPlanId, formatPlanMoney } from '../lib/paymentPlans';
import { getSavedUserRaw } from '../lib/storage';
import { getYiyuPageAttrs, getYiyuSectionAttrs } from '../lib/yiyuTongSiteMap';

type PaymentCheckoutPageProps = {
  planId?: string;
  onNavigate?: (page: string, id?: string) => void;
};

function getCurrentUser() {
  const raw = getSavedUserRaw();
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function buildPaymentReturnUrl(orderNo: string) {
  const url = new URL(window.location.origin + window.location.pathname);
  url.searchParams.set('page', 'payment-result');
  url.searchParams.set('id', orderNo);
  return url.toString();
}

function appendRedirectUrl(h5Url: string, redirectUrl: string) {
  const separator = h5Url.includes('?') ? '&' : '?';
  return `${h5Url}${separator}redirect_url=${encodeURIComponent(redirectUrl)}`;
}

function formatReadinessMessage(readiness?: PaymentReadiness) {
  if (!readiness) {
    return '支付配置暂未完成，请稍后再试。';
  }
  const missing = readiness.items.filter((item) => !item.configured).map((item) => item.label);
  if (missing.length === 0) {
    return '支付配置暂未完成，请稍后再试。';
  }
  return `支付配置尚未完成：${missing.join('、')}。请先在腾讯云服务器补齐微信支付参数。`;
}

export function PaymentCheckoutPage({ planId, onNavigate }: PaymentCheckoutPageProps) {
  const user = useMemo(() => getCurrentUser(), []);
  const normalizedPlanId = (planId === 'monthly_trial' || planId === 'yearly') ? planId as PaymentPlanId : 'monthly_trial';
  const plan = PAYMENT_PLAN_MAP[normalizedPlanId];

  const [form, setForm] = useState({
    buyerName: user?.nickname || '',
    buyerOrg: user?.strategyProjectName || '',
    buyerPhone: user?.phone || '',
    buyerEmail: user?.email || '',
    buyerNote: '',
  });
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const syncProfile = async () => {
      const result = await fetchCurrentProfile();
      if (cancelled || !result.ok || !result.data?.user) return;
      setForm((prev) => ({
        ...prev,
        buyerName: prev.buyerName || result.data?.user.nickname || '',
        buyerOrg: prev.buyerOrg || result.data?.user.strategyProjectName || '',
        buyerPhone: prev.buyerPhone || result.data?.user.phone || '',
        buyerEmail: prev.buyerEmail || result.data?.user.email || '',
      }));
    };
    if (user) {
      void syncProfile();
    }
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (!user) {
    return (
      <div {...getYiyuPageAttrs('payment-checkout')} className="min-h-screen bg-background">
        <Header onNavigate={(page) => onNavigate?.(page)} />
        <div className="pt-24 px-6 max-w-3xl mx-auto">
          <div className="rounded-3xl border border-border/40 bg-white/80 p-10 text-center">
            <h1 className="text-2xl font-semibold text-foreground">请先登录</h1>
            <p className="mt-3 text-sm text-muted-foreground/70">登录后才能提交付费信息并进入微信支付。</p>
            <button
              type="button"
              onClick={() => onNavigate?.('login')}
              className="mt-6 px-5 py-3 rounded-2xl bg-primary text-primary-foreground"
            >
              去登录
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleSubmit = async () => {
    if (!form.buyerName.trim() || !form.buyerPhone.trim() || !form.buyerEmail.trim()) {
      setMessage({ type: 'error', text: '请先完整填写姓名、手机号和邮箱。' });
      return;
    }

    setIsSubmitting(true);
    setMessage(null);
    const result = await createPaymentOrderApi({
      planId: normalizedPlanId,
      buyerName: form.buyerName.trim(),
      buyerOrg: form.buyerOrg.trim(),
      buyerPhone: form.buyerPhone.trim(),
      buyerEmail: form.buyerEmail.trim(),
      buyerNote: form.buyerNote.trim(),
    });
    setIsSubmitting(false);

    if (!result.ok || !result.data?.order || !result.data?.h5Url) {
      const readiness = (result.data as { readiness?: PaymentReadiness } | undefined)?.readiness;
      setMessage({
        type: 'error',
        text: readiness ? formatReadinessMessage(readiness) : (result.error || '支付订单创建失败，请稍后重试。'),
      });
      return;
    }

    const launchUrl = appendRedirectUrl(result.data.h5Url, buildPaymentReturnUrl(result.data.order.orderNo));
    window.location.href = launchUrl;
  };

  return (
    <div {...getYiyuPageAttrs('payment-checkout')} className="min-h-screen bg-background">
      <Header onNavigate={(page) => onNavigate?.(page)} isLoggedIn userType="member" />

      <div className="pt-24 px-6 pb-16 max-w-5xl mx-auto space-y-8">
        <section
          {...getYiyuSectionAttrs('payment-checkout', 'payment-checkout-hero')}
          className="rounded-[32px] border border-border/40 bg-white/80 p-8 md:p-10"
        >
          <div className="flex items-start justify-between gap-6 flex-col md:flex-row">
            <div>
              <div className="text-sm text-muted-foreground/70">支付信息确认</div>
              <h1 className="mt-2 font-serif-display text-[32px] sm:text-[36px] font-semibold tracking-tight text-foreground">{plan.name}</h1>
              <p className="mt-3 text-sm text-muted-foreground/80">提交信息后会直接跳转到微信 H5 支付页面。</p>
            </div>
            <div className="rounded-2xl border border-border/40 bg-white px-5 py-4">
              <div className="text-xs text-muted-foreground/70">应付金额</div>
              <div className="mt-2 text-3xl font-semibold text-foreground">{formatPlanMoney(plan.amountFen)}</div>
              <div className="mt-1 text-sm text-muted-foreground/70">{plan.durationDays} 天有效期</div>
            </div>
          </div>
        </section>

        <section
          {...getYiyuSectionAttrs('payment-checkout', 'payment-checkout-form')}
          className="rounded-[32px] border border-border/40 bg-white/80 p-8 md:p-10 space-y-5"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <label className="space-y-2">
              <span className="text-sm font-medium text-foreground">姓名</span>
              <input
                value={form.buyerName}
                onChange={(e) => setForm((prev) => ({ ...prev, buyerName: e.target.value }))}
                className="w-full px-4 py-3 rounded-2xl border border-border/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-foreground">机构</span>
              <input
                value={form.buyerOrg}
                onChange={(e) => setForm((prev) => ({ ...prev, buyerOrg: e.target.value }))}
                className="w-full px-4 py-3 rounded-2xl border border-border/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-foreground">手机号</span>
              <input
                value={form.buyerPhone}
                onChange={(e) => setForm((prev) => ({ ...prev, buyerPhone: e.target.value }))}
                className="w-full px-4 py-3 rounded-2xl border border-border/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-foreground">邮箱</span>
              <input
                value={form.buyerEmail}
                onChange={(e) => setForm((prev) => ({ ...prev, buyerEmail: e.target.value }))}
                className="w-full px-4 py-3 rounded-2xl border border-border/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </label>
          </div>

          <label className="space-y-2 block">
            <span className="text-sm font-medium text-foreground">备注</span>
            <textarea
              value={form.buyerNote}
              onChange={(e) => setForm((prev) => ({ ...prev, buyerNote: e.target.value }))}
              rows={4}
              className="w-full px-4 py-3 rounded-2xl border border-border/50 focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
            />
          </label>

          {message && (
            <div className={`rounded-2xl px-4 py-3 text-sm ${message.type === 'error' ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'}`}>
              {message.text}
            </div>
          )}

          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 mt-0.5" />
            <span>支付成功后会自动开通或顺延你的付费会员有效期，订单也会同步记录到后台付费管理。</span>
          </div>

          <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
            <button
              type="button"
              onClick={() => onNavigate?.('membership')}
              className="px-5 py-3 rounded-2xl border border-border/50 hover:bg-muted/30"
            >
              返回套餐页
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-5 py-3 rounded-2xl bg-foreground text-white hover:bg-foreground/90 disabled:opacity-60 inline-flex items-center justify-center gap-2"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {isSubmitting ? '创建订单中…' : '提交并前往微信支付'}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
