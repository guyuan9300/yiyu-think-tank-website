import { ArrowRight, CheckCircle2, Crown } from 'lucide-react';
import { useMemo } from 'react';
import { Header } from './Header';
import { getSavedUserRaw } from '../lib/storage';
import { PAYMENT_PLAN_OPTIONS, formatPlanMoney } from '../lib/paymentPlans';
import { getYiyuPageAttrs, getYiyuSectionAttrs } from '../lib/yiyuTongSiteMap';

type PaymentIntroPageProps = {
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

export function PaymentIntroPage({ onNavigate }: PaymentIntroPageProps) {
  const user = useMemo(() => getCurrentUser(), []);
  const isPaid = user?.memberType === 'gold' || user?.memberType === 'diamond';

  if (!user) {
    return (
      <div {...getYiyuPageAttrs('membership')} className="min-h-screen bg-background">
        <Header onNavigate={(page) => onNavigate?.(page)} />
        <div className="pt-24 px-6 max-w-3xl mx-auto">
          <div className="rounded-3xl border border-border/40 bg-white/80 p-10 text-center">
            <h1 className="text-2xl font-semibold text-foreground">请先登录</h1>
            <p className="mt-3 text-sm text-muted-foreground/70">登录后即可开通付费会员或续费。</p>
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

  return (
    <div {...getYiyuPageAttrs('membership')} className="min-h-screen bg-background">
      <Header onNavigate={(page) => onNavigate?.(page)} isLoggedIn userType="member" />

      <div className="pt-24 px-6 pb-16 max-w-6xl mx-auto space-y-8">
        <section
          {...getYiyuSectionAttrs('membership', 'membership-hero')}
          className="rounded-[32px] border border-border/40 bg-white/80 p-8 md:p-10"
        >
          <div className="flex items-start justify-between gap-6 flex-col md:flex-row">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-medium border border-amber-100">
                <Crown className="w-3.5 h-3.5" />
                {isPaid ? '付费会员续费' : '付费会员开通'}
              </div>
              <h1 className="mt-4 text-3xl md:text-4xl font-semibold tracking-tight text-foreground">
                选择适合你的付费方案
              </h1>
              <p className="mt-3 text-sm md:text-base text-muted-foreground/80 max-w-2xl leading-7">
                本轮先提供两档标准套餐。支付成功后会自动开通或顺延你的付费会员有效期，后续更细的会员权益范围再继续打磨。
              </p>
            </div>
          </div>
        </section>

        <section
          {...getYiyuSectionAttrs('membership', 'membership-plans')}
          className="grid grid-cols-1 md:grid-cols-2 gap-6"
        >
          {PAYMENT_PLAN_OPTIONS.map((plan) => (
            <article
              key={plan.id}
              data-yiyu-membership-plan={plan.id}
              data-yiyu-membership-price={formatPlanMoney(plan.amountFen)}
              className="rounded-[32px] border border-border/40 bg-white/80 p-8 shadow-sm"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm text-muted-foreground/70">{plan.highlight}</div>
                  <h2 className="mt-2 text-2xl font-semibold text-foreground">{plan.name}</h2>
                  <div className="mt-4 text-4xl font-semibold text-foreground">{formatPlanMoney(plan.amountFen)}</div>
                  <p className="mt-2 text-sm text-muted-foreground/70">{plan.description}</p>
                </div>
                <div className="text-xs px-3 py-1.5 rounded-full border border-border/50 text-muted-foreground/80">
                  {plan.durationDays} 天
                </div>
              </div>

              <div className="mt-8 space-y-3">
                <div className="flex items-center gap-2 text-sm text-foreground">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  支付成功后立即生效
                </div>
                <div className="flex items-center gap-2 text-sm text-foreground">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  可在个人中心查看当前有效期
                </div>
                <div className="flex items-center gap-2 text-sm text-foreground">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  订单会同步进入后台付费管理
                </div>
              </div>

              <button
                type="button"
                data-yiyu-cta="open-checkout"
                data-yiyu-plan-id={plan.id}
                onClick={() => onNavigate?.('payment-checkout', plan.id)}
                className="mt-8 w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-foreground text-white hover:bg-foreground/90 transition"
              >
                立即开通
                <ArrowRight className="w-4 h-4" />
              </button>
            </article>
          ))}
        </section>
      </div>
    </div>
  );
}
