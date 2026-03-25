import { CheckCircle2, Clock3, Loader2, RefreshCw, XCircle } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Header } from './Header';
import { fetchPaymentOrder, type PaymentOrder } from '../lib/paymentApi';
import { formatPlanMoney } from '../lib/paymentPlans';
import { getYiyuPageAttrs, getYiyuSectionAttrs } from '../lib/yiyuTongSiteMap';

type PaymentResultPageProps = {
  orderNo?: string;
  onNavigate?: (page: string, id?: string) => void;
};

function statusMeta(order?: PaymentOrder) {
  if (!order) {
    return {
      title: '订单不存在',
      desc: '未找到对应订单，请返回个人中心重新发起。',
      tone: 'error' as const,
    };
  }
  if (order.status === 'paid') {
    return {
      title: '支付成功',
      desc: '付费会员状态已自动更新，可以返回个人中心查看。',
      tone: 'success' as const,
    };
  }
  if (order.status === 'pending') {
    return {
      title: '支付处理中',
      desc: '系统正在确认微信支付结果，请稍候。',
      tone: 'pending' as const,
    };
  }
  return {
    title: '支付未完成',
    desc: order.note || '当前订单还未支付成功，你可以返回后重新发起。',
    tone: 'error' as const,
  };
}

export function PaymentResultPage({ orderNo, onNavigate }: PaymentResultPageProps) {
  const [order, setOrder] = useState<PaymentOrder | null>(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const meta = useMemo(() => statusMeta(order ?? undefined), [order]);

  const loadOrder = async (background = false) => {
    if (!orderNo) {
      setError('缺少订单号');
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
      setError(result.error || '订单查询失败');
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
              <p className="mt-3 text-sm text-muted-foreground/70">正在获取订单状态…</p>
            </div>
          ) : (
            <>
              <div className="flex items-start gap-4">
                {icon}
                <div>
                  <h1 className="text-3xl font-semibold text-foreground">{meta.title}</h1>
                  <p className="mt-2 text-sm text-muted-foreground/75">{error || meta.desc}</p>
                </div>
              </div>

              {order && (
                <div className="mt-8 rounded-3xl border border-border/40 bg-white p-6 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-muted-foreground/70">订单号</div>
                    <div className="mt-1 font-medium break-all">{order.orderNo}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground/70">套餐</div>
                    <div className="mt-1 font-medium">{order.planName}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground/70">金额</div>
                    <div className="mt-1 font-medium">{formatPlanMoney(order.amountFen)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground/70">状态</div>
                    <div className="mt-1 font-medium">{meta.title}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground/70">下单时间</div>
                    <div className="mt-1 font-medium">{new Date(order.createdAt).toLocaleString('zh-CN')}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground/70">支付时间</div>
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
                    刷新状态
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onNavigate?.('user-center')}
                  className="px-5 py-3 rounded-2xl bg-foreground text-white hover:bg-foreground/90"
                >
                  返回个人中心
                </button>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
