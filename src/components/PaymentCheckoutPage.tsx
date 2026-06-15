import { Loader2, ShieldCheck, Lock, Crown, MapPin, Truck, Check, Sparkles } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Header } from './Header';
import { fetchCurrentProfile } from '../lib/authApi';
import { createPaymentOrderApi, type PaymentReadiness } from '../lib/paymentApi';
import { getBookByPlanId, BOOK_51, BOOK_ORG, BUNDLE_PRICE, LIFETIME_TAGLINE } from '../lib/books';
import { getSavedUserRaw } from '../lib/storage';
import { getYiyuPageAttrs, getYiyuSectionAttrs } from '../lib/yiyuTongSiteMap';
import { useLang, type Bilingual } from '../lib/i18n';

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

function formatReadinessMessage(readiness: PaymentReadiness | undefined, t: (text: Bilingual) => string) {
  if (!readiness) return t({ zh: '支付配置暂未完成，请稍后再试。', en: 'Payment configuration is not complete yet. Please try again later.' });
  const missing = readiness.items.filter((item) => !item.configured).map((item) => item.label);
  if (missing.length === 0) return t({ zh: '支付配置暂未完成，请稍后再试。', en: 'Payment configuration is not complete yet. Please try again later.' });
  return t({
    zh: `支付配置尚未完成：${missing.join('、')}。请先在腾讯云服务器补齐微信支付参数。`,
    en: `Payment configuration incomplete: ${missing.join(', ')}. Please complete the WeChat Pay parameters on the Tencent Cloud server first.`,
  });
}

/** 会员账号脱敏: 手机中段隐藏 / 邮箱保留首尾 */
function maskAccount(value: string): string {
  if (!value) return '';
  if (/^1\d{10}$/.test(value)) return value.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
  const at = value.indexOf('@');
  if (at > 0) {
    const name = value.slice(0, at);
    const masked = name.length <= 2 ? name[0] + '*' : name[0] + '***' + name[name.length - 1];
    return masked + value.slice(at);
  }
  return value;
}

const INPUT =
  'w-full rounded-xl border border-os-line bg-white px-3.5 py-2.5 text-[14px] text-os-ink shadow-[0_1px_2px_rgba(22,38,94,0.04)] outline-none transition placeholder:text-os-muted/45 hover:border-os-navy/30 focus:border-os-navy/60 focus:ring-4 focus:ring-os-navy/10';

// 一年会员权益 (2026-05-30 顾源源定)
const MEMBER_BENEFITS: Bilingual[] = [
  { zh: '无限量阅读最新文章', en: 'Unlimited reading of the latest articles' },
  { zh: '无限量下载最新报告', en: 'Unlimited downloads of the latest reports' },
  { zh: '无限量参与益语智库全国各地沙龙活动', en: 'Unlimited access to Yiyu Institute salons nationwide' },
  { zh: '获得对应实体书（包邮寄送）', en: 'Receive the matching physical book (free shipping)' },
];

export function PaymentCheckoutPage({ planId, onNavigate }: PaymentCheckoutPageProps) {
  const { t } = useLang();
  const user = useMemo(() => getCurrentUser(), []);

  // 单一会员模型: 只有「一年会员」, 通过购买书籍开通。
  const orderPlanId = (planId === 'book_51' || planId === 'book_org' || planId === 'book_bundle') ? planId : 'book_51';
  const isBundle = orderPlanId === 'book_bundle';
  const book = getBookByPlanId(orderPlanId);
  const planTitle = isBundle ? t({ zh: '两本合购套装', en: 'Two-book bundle' }) : book?.title || BOOK_51.title;
  const listPriceYuan = isBundle ? BOOK_51.priceYuan + BOOK_ORG.priceYuan : book?.priceYuan ?? BOOK_51.priceYuan;
  const payPriceYuan = isBundle ? BUNDLE_PRICE : book?.priceYuan ?? BOOK_51.priceYuan;
  const discountYuan = listPriceYuan - payPriceYuan;
  const coverList = isBundle ? [BOOK_51, BOOK_ORG] : [book || BOOK_51];

  // 会员账号 = 登录账号 (锁定不可改): 优先手机, 否则邮箱。
  const accountValue: string = user?.phone || user?.email || '';
  const accountIsPhone = Boolean(user?.phone);

  const [form, setForm] = useState({
    receiverName: user?.nickname || '',
    receiverPhone: user?.phone || '',
    addressDetail: '',
    email: user?.email || '',
    note: '',
  });
  const [pasteText, setPasteText] = useState('');
  const [parseHint, setParseHint] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 智能地址识别: 粘贴「姓名 电话 地址」整串 → 自动拆分回填
  const handleParseAddress = (raw: string) => {
    const text = raw.replace(/\s+/g, ' ').trim();
    if (!text) {
      setParseHint(t({ zh: '请先粘贴包含姓名、手机号、地址的整段文字', en: 'Please paste a full block of text with name, phone, and address first' }));
      return;
    }
    // 1) 手机号: 11 位 1 开头 (允许中间有空格/横线)
    const phoneMatch = text.replace(/[-\s]/g, '').match(/1\d{10}/);
    const phone = phoneMatch ? phoneMatch[0] : '';
    // 2) 去掉手机号后的余文
    let rest = text;
    if (phone) {
      const re = new RegExp(phone.split('').join('[-\\s]?'));
      rest = text.replace(re, ' ').replace(/\s+/g, ' ').trim();
    }
    // 3) 姓名: 取剩余里第一个 2-4 个连续汉字的词 (排在地址关键词前的短词)
    let name = '';
    const tokens = rest.split(/[ ,，、:：]+/).filter(Boolean);
    const addrKeywords = /[省市区县镇乡村路街道号栋单元楼室号院区]/;
    for (const t of tokens) {
      if (/^[一-龥·]{2,4}$/.test(t) && !addrKeywords.test(t)) {
        name = t;
        break;
      }
    }
    // 4) 地址 = 去掉姓名后的剩余 (含省市区详细)
    let address = rest;
    if (name) address = address.replace(name, ' ').replace(/\s+/g, ' ').trim();
    address = address.replace(/^收件人[:：]?/, '').replace(/^电话[:：]?/, '').trim();

    setForm((prev) => ({
      ...prev,
      receiverName: name || prev.receiverName,
      receiverPhone: phone || prev.receiverPhone,
      addressDetail: address || prev.addressDetail,
    }));
    const got: string[] = [];
    if (name) got.push(t({ zh: '姓名', en: 'Name' }));
    if (phone) got.push(t({ zh: '手机号', en: 'Phone' }));
    if (address) got.push(t({ zh: '地址', en: 'Address' }));
    setParseHint(got.length ? t({ zh: `已识别：${got.join(' · ')}，请核对`, en: `Recognized: ${got.join(' · ')}. Please verify.` }) : t({ zh: '未能识别，请手动填写或检查格式', en: 'Could not recognize. Please fill in manually or check the format.' }));
  };

  useEffect(() => {
    let cancelled = false;
    const syncProfile = async () => {
      const result = await fetchCurrentProfile();
      if (cancelled || !result.ok || !result.data?.user) return;
      const u = result.data.user;
      setForm((prev) => ({
        ...prev,
        receiverName: prev.receiverName || u.nickname || '',
        receiverPhone: prev.receiverPhone || u.phone || '',
        email: prev.email || u.email || '',
      }));
    };
    if (user) void syncProfile();
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (!user) {
    return (
      <div {...getYiyuPageAttrs('payment-checkout')} className="min-h-screen bg-os-canvas">
        <Header onNavigate={(page) => onNavigate?.(page)} />
        <div className="pt-28 px-6 max-w-md mx-auto">
          <div className="rounded-[24px] border border-os-line bg-os-paper p-10 text-center shadow-os">
            <div className="mx-auto mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-os-mist text-os-navy">
              <Lock className="h-5 w-5" />
            </div>
            <h1 className="font-serif-display text-[22px] font-semibold text-os-ink">{t({ zh: '请先登录', en: 'Please sign in first' })}</h1>
            <p className="mt-2 text-[14px] text-os-muted">{t({ zh: '登录后才能下单购买并开通一年会员。', en: 'Sign in to place an order and activate one-year membership.' })}</p>
            <button
              type="button"
              onClick={() => onNavigate?.('login')}
              className="mt-6 inline-flex items-center justify-center rounded-xl bg-os-navy px-6 py-3 text-[14px] font-medium text-white transition hover:bg-os-navy-700"
            >
              {t({ zh: '去登录', en: 'Go to sign in' })}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const setField = (k: keyof typeof form, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = async () => {
    if (!form.receiverName.trim()) return setMessage({ type: 'error', text: t({ zh: '请填写收件人姓名。', en: 'Please enter the recipient name.' }) });
    if (!/^1\d{10}$/.test(form.receiverPhone.trim())) return setMessage({ type: 'error', text: t({ zh: '请填写正确的收货手机号。', en: 'Please enter a valid shipping phone number.' }) });
    if (!form.addressDetail.trim()) return setMessage({ type: 'error', text: t({ zh: '请填写收货地址。', en: 'Please enter the shipping address.' }) });

    setIsSubmitting(true);
    setMessage(null);
    const result = await createPaymentOrderApi({
      planId: orderPlanId,
      buyerName: form.receiverName.trim(),
      buyerPhone: form.receiverPhone.trim(),
      buyerEmail: form.email.trim() || undefined,
      buyerNote: form.note.trim(),
      receiverName: form.receiverName.trim(),
      receiverPhone: form.receiverPhone.trim(),
      shippingAddress: form.addressDetail.trim(),
    });
    setIsSubmitting(false);

    if (!result.ok || !result.data?.order || !result.data?.h5Url) {
      const readiness = (result.data as { readiness?: PaymentReadiness } | undefined)?.readiness;
      setMessage({
        type: 'error',
        text: readiness ? formatReadinessMessage(readiness, t) : (result.error || t({ zh: '支付订单创建失败，请稍后重试。', en: 'Failed to create payment order. Please try again later.' })),
      });
      return;
    }

    const launchUrl = appendRedirectUrl(result.data.h5Url, buildPaymentReturnUrl(result.data.order.orderNo));
    window.location.href = launchUrl;
  };

  return (
    <div {...getYiyuPageAttrs('payment-checkout')} className="min-h-screen bg-os-canvas">
      <Header onNavigate={(page) => onNavigate?.(page)} isLoggedIn userType="member" />

      <main className="pt-24 pb-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="mb-5 flex items-center gap-2 text-[13px] text-os-muted">
            <button onClick={() => onNavigate?.('book-detail', orderPlanId)} className="hover:text-os-navy transition-colors">{t({ zh: '商品详情', en: 'Product details' })}</button>
            <span className="text-os-line">/</span>
            <span className="text-os-ink font-medium">{t({ zh: '确认订单', en: 'Confirm order' })}</span>
          </div>

          <div className="grid lg:grid-cols-[1fr_360px] gap-6">
            {/* ── 左: 收货 + 联系 表单 ───────────────────── */}
            <div className="space-y-5">
              {/* 会员账号 (锁定) */}
              <section
                {...getYiyuSectionAttrs('payment-checkout', 'payment-checkout-account')}
                className="rounded-[18px] border border-os-line bg-os-paper p-5 shadow-os"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-os-mist text-os-navy">
                      <Crown className="h-4 w-4" />
                    </span>
                    <div>
                      <div className="text-[13px] font-semibold text-os-ink">{t({ zh: '本单将为此账号开通一年会员', en: 'This order will activate one-year membership for this account' })}</div>
                      <div className="mt-0.5 text-[12.5px] text-os-muted font-mono">
                        {maskAccount(accountValue)}
                        <span className="ml-2 font-sans">（{accountIsPhone ? t({ zh: '手机账号', en: 'Phone account' }) : t({ zh: '邮箱账号', en: 'Email account' })}）</span>
                      </div>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-os-canvas px-2.5 py-1 text-[11px] font-medium text-os-muted ring-1 ring-os-line">
                    <Lock className="h-3 w-3" />{t({ zh: '会员号锁定', en: 'Member ID locked' })}
                  </span>
                </div>
              </section>

              {/* 收货信息 */}
              <section
                {...getYiyuSectionAttrs('payment-checkout', 'payment-checkout-shipping')}
                className="rounded-[18px] border border-os-line bg-os-paper p-5 sm:p-6 shadow-os"
              >
                <div className="mb-4 flex items-center gap-2 text-os-navy">
                  <Truck className="h-4 w-4 text-os-blue" />
                  <h2 className="font-serif-display text-[16px] font-semibold tracking-tight">{t({ zh: '收货信息', en: 'Shipping information' })}</h2>
                  <span className="ml-1 text-[12px] text-os-muted">{t({ zh: '实体书 · 包邮寄送', en: 'Physical book · free shipping' })}</span>
                </div>

                {/* 智能粘贴框: 一次粘贴自动拆出姓名/电话/地址 */}
                <div className="mb-4 rounded-xl border border-dashed border-os-blue/40 bg-os-mist/30 p-3">
                  <div className="flex items-center gap-1.5 text-[12px] font-medium text-os-blue">
                    <Sparkles className="h-3.5 w-3.5" />{t({ zh: '智能填写 · 粘贴整段收货信息自动识别', en: 'Smart fill · paste the full shipping info to auto-detect' })}
                  </div>
                  <div className="mt-2 flex gap-2">
                    <input
                      className={INPUT}
                      value={pasteText}
                      onChange={(e) => setPasteText(e.target.value)}
                      placeholder={t({ zh: '例：张三 13800138000 广东省深圳市南山区科技园 xx 大厦 5 楼', en: 'e.g. Zhang San 13800138000 5F, XX Building, Tech Park, Nanshan District, Shenzhen, Guangdong' })}
                    />
                    <button
                      type="button"
                      onClick={() => handleParseAddress(pasteText)}
                      className="shrink-0 rounded-xl bg-os-navy px-4 text-[13px] font-medium text-white transition hover:bg-os-navy-700"
                    >
                      {t({ zh: '识别', en: 'Detect' })}
                    </button>
                  </div>
                  {parseHint && <div className="mt-1.5 text-[12px] text-os-muted">{parseHint}</div>}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <Field label={t({ zh: '收件人', en: 'Recipient' })} required>
                    <input className={INPUT} value={form.receiverName} onChange={(e) => setField('receiverName', e.target.value)} placeholder={t({ zh: '请填写收件人姓名', en: 'Enter the recipient name' })} />
                  </Field>
                  <Field label={t({ zh: '收货手机', en: 'Shipping phone' })} required>
                    <input className={INPUT} type="tel" value={form.receiverPhone} onChange={(e) => setField('receiverPhone', e.target.value)} placeholder={t({ zh: '11 位手机号', en: '11-digit phone number' })} />
                  </Field>
                  <Field label={t({ zh: '收货地址', en: 'Shipping address' })} required className="sm:col-span-2">
                    <div className="relative">
                      <MapPin className="absolute left-3 top-3 h-4 w-4 text-os-muted/50" />
                      <textarea
                        className={`${INPUT} pl-9 min-h-[64px] resize-y`}
                        value={form.addressDetail}
                        onChange={(e) => setField('addressDetail', e.target.value)}
                        placeholder={t({ zh: '省市区 + 街道门牌，可直接粘贴完整地址', en: 'Province/city/district + street and number; you can paste the full address' })}
                        rows={2}
                      />
                    </div>
                  </Field>
                </div>
              </section>

              {/* 联系方式 */}
              <section
                {...getYiyuSectionAttrs('payment-checkout', 'payment-checkout-contact')}
                className="rounded-[18px] border border-os-line bg-os-paper p-5 sm:p-6 shadow-os"
              >
                <div className="mb-4 flex items-center gap-2 text-os-navy">
                  <h2 className="font-serif-display text-[16px] font-semibold tracking-tight">{t({ zh: '联系方式', en: 'Contact information' })}</h2>
                  <span className="ml-1 text-[12px] text-os-muted">{t({ zh: '用于发货通知与会员开通确认', en: 'Used for shipping notices and membership confirmation' })}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <Field label={t({ zh: '邮箱', en: 'Email' })} hint={t({ zh: '选填', en: 'Optional' })}>
                    <input className={INPUT} type="email" value={form.email} onChange={(e) => setField('email', e.target.value)} placeholder={t({ zh: '可选，用于接收电子发票/通知', en: 'Optional, for e-invoices / notifications' })} />
                  </Field>
                  <Field label={t({ zh: '订单备注', en: 'Order note' })} hint={t({ zh: '选填', en: 'Optional' })}>
                    <input className={INPUT} value={form.note} onChange={(e) => setField('note', e.target.value)} placeholder={t({ zh: '如有特殊说明可填写', en: 'Add any special instructions' })} />
                  </Field>
                </div>
              </section>
            </div>

            {/* ── 右: 订单摘要 (sticky) ───────────────────── */}
            <aside className="lg:sticky lg:top-24 h-fit">
              <section
                {...getYiyuSectionAttrs('payment-checkout', 'payment-checkout-summary')}
                className="rounded-[18px] border border-os-line bg-os-paper p-5 shadow-os"
              >
                <h2 className="font-serif-display text-[16px] font-semibold tracking-tight text-os-navy">{t({ zh: '订单摘要', en: 'Order summary' })}</h2>

                {/* 商品 */}
                <div className="mt-4 flex items-start gap-3">
                  <div className="flex shrink-0 -space-x-3">
                    {coverList.map((b) => (
                      <div key={b.planId} className="h-[64px] w-[48px] overflow-hidden rounded-md ring-1 ring-os-line shadow-sm bg-os-paper">
                        <img src={b.cover} alt={b.title} className="h-full w-full object-cover object-top" />
                      </div>
                    ))}
                  </div>
                  <div className="min-w-0">
                    <div className="text-[13.5px] font-semibold leading-snug text-os-ink">{planTitle}</div>
                    <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-os-mist px-2 py-0.5 text-[11px] font-medium text-os-blue ring-1 ring-os-blue/20">
                      <Crown className="h-3 w-3" />{t({ zh: '含一年会员', en: 'Includes one-year membership' })}
                    </div>
                  </div>
                </div>

                {/* 会员权益清单 */}
                <div className="mt-4 rounded-xl bg-os-mist/40 p-3.5">
                  <div className="text-[12px] font-semibold text-os-navy">{t({ zh: '一年会员权益', en: 'One-year membership benefits' })}</div>
                  <ul className="mt-2 space-y-1.5">
                    {MEMBER_BENEFITS.map((b) => (
                      <li key={b.zh} className="flex items-start gap-2 text-[12.5px] leading-5 text-os-ink/80">
                        <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />{t(b)}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* 价格明细 */}
                <div className="mt-5 space-y-2 border-t border-os-line pt-4 text-[13px]">
                  <div className="flex items-center justify-between text-os-muted">
                    <span>{t({ zh: '商品金额', en: 'Item total' })}</span><span>¥{listPriceYuan}</span>
                  </div>
                  {discountYuan > 0 && (
                    <div className="flex items-center justify-between text-os-muted">
                      <span>{t({ zh: '合购优惠', en: 'Bundle discount' })}</span><span className="text-emerald-600">−¥{discountYuan}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-os-muted">
                    <span>{t({ zh: '运费', en: 'Shipping' })}</span><span className="text-emerald-600">{t({ zh: '包邮', en: 'Free' })}</span>
                  </div>
                </div>

                <div className="mt-4 flex items-end justify-between border-t border-os-line pt-4">
                  <span className="text-[13px] text-os-muted">{t({ zh: '应付金额', en: 'Amount due' })}</span>
                  <span className="font-serif-display text-[28px] font-semibold leading-none text-os-ink">¥{payPriceYuan}</span>
                </div>
                <div className="mt-1 text-right text-[12px] text-os-muted/70">{t({ zh: '一年会员 · 一次开通一年有效', en: 'One-year membership · activate once, valid for one year' })}</div>

                {message && (
                  <div className={`mt-4 rounded-xl px-3.5 py-2.5 text-[13px] ${message.type === 'error' ? 'bg-rose-50 text-rose-700 ring-1 ring-rose-200/70' : 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/70'}`}>
                    {message.text}
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  data-yiyu-cta="submit-payment"
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#07C160] px-6 py-3.5 text-[15px] font-medium text-white shadow-[0_10px_30px_-10px_rgba(7,193,96,0.55)] transition hover:bg-[#06AD56] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <svg viewBox="0 0 1024 1024" className="h-[18px] w-[18px]" fill="currentColor" aria-hidden>
                      <path d="M664 379c11 0 22 1 32 2-29-134-173-234-337-234C181 147 36 270 36 422c0 88 48 166 124 218l-31 93 108-59c39 11 70 22 109 22 11 0 21-1 32-2-7-22-11-45-11-69 0-143 124-246 267-246zM510 295c24 0 40 16 40 40 0 23-16 39-40 39-23 0-47-16-47-39 0-24 24-40 47-40zM314 374c-23 0-47-16-47-39 0-24 24-40 47-40 24 0 40 16 40 40 0 23-16 39-40 39z" />
                      <path d="M988 651c0-128-128-232-271-232-152 0-272 104-272 232 0 129 120 232 272 232 32 0 64-8 96-16l87 48-24-80c64-48 112-112 112-184zM699 620c-16 0-32-16-32-32 0-15 16-31 32-31 24 0 40 16 40 31 0 16-16 32-40 32zM873 620c-16 0-32-16-32-32 0-15 16-31 32-31 23 0 39 16 39 31 0 16-16 32-39 32z" />
                    </svg>
                  )}
                  {isSubmitting ? t({ zh: '创建订单中…', en: 'Creating order…' }) : t({ zh: `微信支付 ¥${payPriceYuan}`, en: `WeChat Pay ¥${payPriceYuan}` })}
                </button>

                <div className="mt-3 flex items-start gap-2 text-[12px] leading-5 text-os-muted/80">
                  <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                  <span>{t({ zh: '支付成功后自动开通一年会员并安排发货，订单同步进入后台。', en: 'After payment, one-year membership is activated automatically and shipping is arranged; the order syncs to the backend.' })}{LIFETIME_TAGLINE}。</span>
                </div>

                <button
                  type="button"
                  onClick={() => onNavigate?.('book-detail', orderPlanId)}
                  className="mt-3 w-full text-center text-[12.5px] text-os-muted hover:text-os-navy transition-colors"
                >
                  {t({ zh: '返回商品详情', en: 'Back to product details' })}
                </button>
              </section>
            </aside>
          </div>
        </div>
      </main>
    </div>
  );
}

function Field({
  label,
  required,
  hint,
  className = '',
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={`block space-y-1.5 ${className}`}>
      <span className="flex items-center gap-1 text-[12.5px] font-medium text-os-ink/75">
        {label}
        {required ? <span className="text-rose-500">*</span> : null}
        {hint ? <span className="ml-1 text-[11px] font-normal text-os-muted/60">{hint}</span> : null}
      </span>
      {children}
    </label>
  );
}
