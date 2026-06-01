import { CheckCircle2, Clock3, Loader2, RefreshCw, XCircle } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Header } from './Header';
import { fetchPaymentOrder, type PaymentOrder } from '../lib/paymentApi';
import { formatPlanMoney } from '../lib/paymentPlans';
import { getYiyuPageAttrs, getYiyuSectionAttrs } from '../lib/yiyuTongSiteMap';
import { useLang, type Bilingual } from '../lib/i18n';

type PaymentResultPageProps = {
  orderNo?: string;
  onNavigate?: (page: string, id?: string) => void;
};

type StatusMeta = { title: Bilingual; desc: Bilingual; tone: 'error' | 'success' | 'pending' };

function statusMeta(order?: PaymentOrder): StatusMeta {
  if (!order) {
    return {
      title: { zh: '订单不存在', en: 'Order not found' },
      desc: { zh: '未找到对应订单，请返回个人中心重新发起。', en: 'No matching order was found. Please return to the user center and start again.' },
      tone: 'error' as const,
    };
  }
  if (order.status === 'paid') {
    return {
      title: { zh: '支付成功', en: 'Payment successful' },
      desc: { zh: '付费会员状态已自动更新，可以返回个人中心查看。', en: 'Your paid membership has been updated automatically. You can check it in the user center.' },
      tone: 'success' as const,
    };
  }
  if (order.status === 'pending') {
    return {
      title: { zh: '支付处理中', en: 'Payment processing' },
      desc: { zh: '系统正在确认微信支付结果，请稍候。', en: 'Confirming your WeChat Pay result, please wait.' },
      tone: 'pending' as const,
    };
  }
  return {
    title: { zh: '支付未完成', en: 'Payment incomplete' },
    desc: order.note ? { zh: order.note, en: order.note } : { zh: '当前订单还未支付成功，你可以返回后重新发起。', en: 'This order has not been paid yet. You can go back and start again.' },
    tone: 'error' as const,
  };
}

export function PaymentResultPage({ orderNo, onNavigate }: PaymentResultPageProps) {
  const { t } = useLang();
  const [order, setOrder] = useState<PaymentOrder | null>(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const meta = useMemo(() => statusMeta(order ?? undefined), [order]);

  const loadOrder = async (background = false) => {
    if (!orderNo) {
      setError(t({ zh: '缺少订单号', en: 'Missing order number' }));
      setIsLoading(false);
      return;
    }
    if (background) {
      setRefreshing(true);
    } else {
      setIsLoading(true);
    }
    const result = await fetchPaymentOrder(orderNo);
    if (!result.ok || !result.data) {
      setError(result.error || t({ zh: '订单查询失败', en: 'Failed to query the order' }));
      setOrder(null);
    } else {
      setError('');
      setOrder(result.data);
    }
    setIsLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    void loadOrder();
  }, [orderNo]);

  useEffect(() => {
    if (!orderNo || order?.status !== 'pending') return;
    const timer = window.setInterval(() => {
      void loadOrder(true);
    }, 3000);
    return () => window.clearInterval(timer);
  }, [order?.status, orderNo]);

  const icon = meta.tone === 'success'
    ? <CheckCircle2 className="w-10 h-10 text-emerald-600" />
    : meta.tone === 'pending'
      ? <Clock3 className="w-10 h-10 text-amber-600" />
      : <XCircle className="w-10 h-10 text-red-600" />;

  return (
    <div {...getYiyuPageAttrs('payment-result')} className="min-h-screen bg-background">
      <Header onNavigate={(page) => onNavigate?.(page)} isLoggedIn userType="member" />

      <div className="pt-24 px-6 pb-16 max-w-4xl mx-auto">
        <section
          {...getYiyuSectionAttrs('payment-result', 'payment-result-status')}
          className="rounded-[32px] border border-border/40 bg-white/80 p-8 md:p-10"
        >
          {isLoading ? (
            <div className="py-10 text-center">
              <Loader2 className="w-8 h-8 mx-auto animate-spin text-muted-foreground/70" />
              <p className="mt-3 text-sm text-muted-foreground/70">{t({ zh: '正在获取订单状态…', en: 'Loading order status…' })}</p>
            </div>
          ) : (
            <>
              <div className="flex items-start gap-4">
                {icon}
                <div>
                  <h1 className="font-serif-display text-[32px] sm:text-[36px] font-semibold tracking-tight text-foreground">{t(meta.title)}</h1>
                  <p className="mt-2 text-sm text-muted-foreground/75">{error || t(meta.desc)}</p>
                </div>
              </div>

              {order && (
                <div className="mt-8 rounded-3xl border border-border/40 bg-white p-6 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-muted-foreground/70">{t({ zh: '订单号', en: 'Order number' })}</div>
                    <div className="mt-1 font-medium break-all">{order.orderNo}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground/70">{t({ zh: '套餐', en: 'Plan' })}</div>
                    <div className="mt-1 font-medium">{order.planName}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground/70">{t({ zh: '金额', en: 'Amount' })}</div>
                    <div className="mt-1 font-medium">{formatPlanMoney(order.amountFen)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground/70">{t({ zh: '状态', en: 'Status' })}</div>
                    <div className="mt-1 font-medium">{t(meta.title)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground/70">{t({ zh: '下单时间', en: 'Order time' })}</div>
                    <div className="mt-1 font-medium">{new Date(order.createdAt).toLocaleString('zh-CN')}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground/70">{t({ zh: '支付时间', en: 'Payment time' })}</div>
                    <div className="mt-1 font-medium">{order.paidAt ? new Date(order.paidAt).toLocaleString('zh-CN') : '—'}</div>
                  </div>
                </div>
              )}

              <div className="mt-8 flex flex-col sm:flex-row gap-3 sm:justify-end">
                {order?.status === 'pending' && (
                  <button
                    type="button"
                    onClick={() => void loadOrder(true)}
                    className="px-5 py-3 rounded-2xl border border-border/50 hover:bg-muted/30 inline-flex items-center justify-center gap-2"
                  >
                    <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                    {t({ zh: '刷新状态', en: 'Refresh status' })}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onNavigate?.('user-center')}
                  className="px-5 py-3 rounded-2xl bg-foreground text-white hover:bg-foreground/90"
                >
                  {t({ zh: '返回个人中心', en: 'Back to user center' })}
                </button>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
