import { useEffect, useState } from 'react';
import { X, HeartHandshake, CheckCircle2, ArrowRight } from 'lucide-react';
import { useLang, type Bilingual } from '../../../lib/i18n';

// 与行动者一致的接收邮箱;提交走 mailto,真实送达、不做假数据。
const CONTACT_EMAIL = 'guyuan9300@gmail.com';

const SUPPORT_TYPES: { value: string; label: Bilingual }[] = [
  { value: 'space', label: { zh: '场地 / 空间', en: 'Space / venue' } },
  { value: 'service', label: { zh: '免费或优惠的服务资源', en: 'Free / discounted services' } },
  { value: 'expertise', label: { zh: '专业咨询 / 领域方法论', en: 'Expertise / methodology' } },
  { value: 'tools', label: { zh: '软件 / 工具 / 算力资源', en: 'Software / tools / compute' } },
  { value: 'training', label: { zh: '培训机会', en: 'Training' } },
  { value: 'pilot', label: { zh: '真实应用场景 / 试点机会', en: 'Real use cases / pilots' } },
  { value: 'other', label: { zh: '其他', en: 'Other' } },
];

// 你希望得到什么回报(单选)。'kickback' 是个玩笑:点了直接关弹窗 😏
const REWARD_OPTIONS: { value: string; label: Bilingual }[] = [
  { value: 'brand', label: { zh: '品牌露出 / 联合署名', en: 'Brand exposure / co-branding' } },
  { value: 'story', label: { zh: '真实影响力故事 / 案例回访', en: 'Real impact stories / case follow-ups' } },
  { value: 'kickback', label: { zh: '我需要拿回扣', en: 'I want a kickback' } },
  { value: 'none', label: { zh: '不需要回报，就想帮一把', en: 'No reward — just want to help' } },
];

export function SupporterModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useLang();
  const [types, setTypes] = useState<string[]>([]);
  const [offer, setOffer] = useState('');
  const [reward, setReward] = useState('');
  const [rewardOrder, setRewardOrder] = useState<string[]>(REWARD_OPTIONS.map((o) => o.value));
  const [who, setWho] = useState('');
  const [contact, setContact] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (!open) { setTypes([]); setOffer(''); setReward(''); setRewardOrder(REWARD_OPTIONS.map((o) => o.value)); setWho(''); setContact(''); setErr(null); setSent(false); return; }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [open, onClose]);

  if (!open) return null;

  const toggle = (v: string) => { setErr(null); setTypes((p) => (p.includes(v) ? p.filter((x) => x !== v) : [...p, v])); };

  // 「我需要拿回扣」永远选不中:每次点它,就和随机一个其他按钮换位置,逃开光标 😏
  const dodgeKickback = () => {
    setRewardOrder((prev) => {
      const ki = prev.indexOf('kickback');
      if (ki < 0) return prev;
      const others = prev.map((_, i) => i).filter((i) => i !== ki);
      const target = others[Math.floor(Math.random() * others.length)];
      const next = [...prev];
      [next[ki], next[target]] = [next[target], next[ki]];
      return next;
    });
  };

  const submit = () => {
    if (types.length === 0) { setErr(t({ zh: '勾选至少一种你能提供的支持', en: 'Pick at least one kind of support' })); return; }
    if (!offer.trim()) { setErr(t({ zh: '简单说说你具体能提供什么', en: 'Tell us what you can offer' })); return; }
    if (!contact.trim()) { setErr(t({ zh: '留个联系方式，方便我们找到你', en: 'Leave a way to reach you' })); return; }
    const typeLabels = types.map((v) => SUPPORT_TYPES.find((o) => o.value === v)?.label.zh ?? v).join('、');
    const subject = `【成为同行者】${who.trim() || '一位支持方'} · ${typeLabels}`;
    const body = [
      `能提供的支持：${typeLabels}`,
      '',
      '具体能提供什么：',
      offer.trim(),
      '',
      `希望的回报：${REWARD_OPTIONS.find((o) => o.value === reward)?.label.zh ?? '(未填)'}`,
      '',
      `称呼 / 机构：${who.trim() || '(未填)'}`,
      `联系方式：${contact.trim()}`,
    ].join('\n');
    window.location.href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    setSent(true);
  };

  const inputCls = 'w-full rounded-xl ring-1 ring-os-line bg-os-canvas px-3 py-2.5 text-[14px] text-os-ink focus:outline-none focus:ring-2 focus:ring-os-navy/30 placeholder:text-os-muted/60';

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-os-navy/45 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-[24px] bg-os-paper ring-1 ring-os-line shadow-2xl overflow-hidden max-h-[92vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 z-10 p-1.5 rounded-lg text-os-muted hover:bg-os-mist hover:text-os-navy transition" aria-label="Close"><X className="w-4 h-4" /></button>

        {sent ? (
          <div className="px-7 py-12 text-center">
            <CheckCircle2 className="w-9 h-9 text-emerald-600 mx-auto mb-3" />
            <h3 className="font-serif-display text-[21px] font-semibold text-os-ink">{t({ zh: '谢谢你愿意同行', en: 'Thank you for walking alongside' })}</h3>
            <p className="mt-2.5 text-[13.5px] leading-[1.85] text-os-muted">{t({ zh: '我们已为你准备好邮件，点「发送」即送达；我们会尽快联系你，一起帮行动者加速向前。', en: 'We’ve drafted the email for you — hit “send” and it reaches us. We’ll reach out soon to help actioners move faster, together.' })}</p>
            <button onClick={onClose} className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-os-navy to-os-indigo px-6 py-2.5 text-[13px] font-semibold text-white shadow-os hover:brightness-110">{t({ zh: '我知道了', en: 'Got it' })}</button>
          </div>
        ) : (
          <>
            <div className="px-7 pt-7 pb-4">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-os-mist text-os-blue ring-1 ring-os-blue/15 mb-4"><HeartHandshake className="h-5 w-5" /></div>
              <h3 className="font-serif-display text-[21px] font-semibold tracking-tight text-os-ink">{t({ zh: '成为同行者', en: 'Walk Alongside Us' })}</h3>
              <p className="mt-2 text-[13.5px] leading-[1.8] text-os-muted">{t({ zh: '改变世界常常很孤单。告诉我们你能提供什么 —— 不一定是钱，场地、服务、专业都可以，我们一起帮行动者加速向前。', en: 'Changing the world is often lonely. Tell us what you can offer — not only money: space, services, expertise all count. Let’s help actioners move faster, together.' })}</p>
            </div>

            <div className="px-7 pb-7 space-y-4">
              <div>
                <label className="block text-[12px] font-semibold text-os-navy mb-2">{t({ zh: '你能提供哪种支持？（可多选）', en: 'What can you offer? (multi-select)' })}</label>
                <div className="grid grid-cols-2 gap-2">
                  {SUPPORT_TYPES.map((o) => {
                    const checked = types.includes(o.value);
                    return (
                      <label key={o.value} className={`flex items-center gap-2 rounded-xl px-3 py-2 text-[13px] cursor-pointer ring-1 transition ${checked ? 'bg-os-navy/5 ring-os-navy/40 text-os-ink' : 'bg-os-canvas ring-os-line text-os-muted hover:ring-os-navy/25'}`}>
                        <input type="checkbox" checked={checked} onChange={() => toggle(o.value)} className="w-4 h-4 rounded border-os-line accent-os-navy shrink-0" />
                        <span>{t(o.label)}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-os-navy mb-1.5">{t({ zh: '具体能提供什么？', en: 'What exactly can you offer?' })}</label>
                <textarea value={offer} onChange={(e) => { setOffer(e.target.value); setErr(null); }} rows={3} placeholder={t({ zh: '简单说说你能给行动者的资源 / 服务 / 专业。', en: 'Briefly: the resources / services / expertise you can give actioners.' })} className={inputCls} />
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-os-navy mb-2">{t({ zh: '你希望得到什么回报？', en: 'What would you like in return?' })}</label>
                <div className="grid grid-cols-2 gap-2">
                  {rewardOrder.map((val) => {
                    const o = REWARD_OPTIONS.find((x) => x.value === val);
                    if (!o) return null;
                    const checked = reward === o.value;
                    return (
                      <button
                        type="button"
                        key={o.value}
                        onClick={() => { if (o.value === 'kickback') { dodgeKickback(); return; } setErr(null); setReward(o.value); }}
                        className={`text-left rounded-xl px-3 py-2 text-[13px] ring-1 transition-all duration-200 active:scale-95 ${checked ? 'bg-os-navy/5 ring-os-navy/40 text-os-ink' : 'bg-os-canvas ring-os-line text-os-muted hover:ring-os-navy/25'}`}
                      >
                        {t(o.label)}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-semibold text-os-navy mb-1.5">{t({ zh: '你的称呼 / 机构', en: 'Your name / org' })}</label>
                  <input value={who} onChange={(e) => { setWho(e.target.value); setErr(null); }} placeholder={t({ zh: '个人或机构名称', en: 'Person or org' })} className={inputCls} />
                </div>
                <div>
                  <label className="block text-[12px] font-semibold text-os-navy mb-1.5">{t({ zh: '联系方式', en: 'Contact' })}</label>
                  <input value={contact} onChange={(e) => { setContact(e.target.value); setErr(null); }} placeholder={t({ zh: '邮箱 / 微信 / 手机', en: 'Email / WeChat / phone' })} className={inputCls} />
                </div>
              </div>

              {err && <p className="text-[12.5px] text-rose-600">{err}</p>}

              <button onClick={submit} className="group w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-os-navy to-os-indigo px-5 py-3 text-[14px] font-semibold text-white shadow-os hover:brightness-110 transition">
                {t({ zh: '成为同行者', en: 'Walk Alongside Us' })}<ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5" />
              </button>
              <p className="text-[11px] leading-5 text-os-muted/70 text-center">{t({ zh: '提交后会用你的邮件客户端发给我们；我们会尽快联系你。', en: 'Submitting opens your email client to send it to us; we’ll reach out soon.' })}</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
