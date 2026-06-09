import { useEffect, useState } from 'react';
import { X, Send, CheckCircle2, ArrowRight } from 'lucide-react';
import { useLang, type Bilingual } from '../../../lib/i18n';

// 行动方案接收邮箱(可改);提交走 mailto,真实送达、不做假数据。
const CONTACT_EMAIL = 'guyuan9300@gmail.com';

const SUPPORT_OPTIONS: { value: string; label: Bilingual }[] = [
  { value: 'funding', label: { zh: '资助（资金 / 算力）', en: 'Funding (money / compute)' } },
  { value: 'strategy', label: { zh: '战略咨询支持', en: 'Strategy consulting' } },
  { value: 'orgdev', label: { zh: '组织发展咨询支持', en: 'Org development consulting' } },
  { value: 'ai', label: { zh: 'AI 数字化咨询支持', en: 'AI & digital consulting' } },
  { value: 'other', label: { zh: '其他支持', en: 'Other support' } },
];

export function ActionerModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useLang();
  const [support, setSupport] = useState(SUPPORT_OPTIONS[0].value);
  const [doing, setDoing] = useState('');
  const [need, setNeed] = useState('');
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (!open) {
      setSupport(SUPPORT_OPTIONS[0].value); setDoing(''); setNeed(''); setName(''); setContact(''); setErr(null); setSent(false);
      return;
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [open, onClose]);

  if (!open) return null;

  const submit = () => {
    if (!doing.trim()) { setErr(t({ zh: '请说说你正在做什么', en: 'Tell us what you’re doing' })); return; }
    if (!need.trim()) { setErr(t({ zh: '请说说你具体需要什么', en: 'Tell us what you need' })); return; }
    if (!contact.trim()) { setErr(t({ zh: '留个联系方式，方便我们找到你', en: 'Leave a way to reach you' })); return; }
    const supportLabel = SUPPORT_OPTIONS.find((o) => o.value === support)?.label.zh ?? support;
    const subject = `【行动方案】${name.trim() || '一位行动者'} · ${supportLabel}`;
    const body = [
      `需要的支持：${supportLabel}`,
      '',
      '正在做什么 / 会带来什么改变：',
      doing.trim(),
      '',
      '具体需要什么知识 / 资源：',
      need.trim(),
      '',
      `联系人：${name.trim() || '(未填)'}`,
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
            <h3 className="font-serif-display text-[21px] font-semibold text-os-ink">{t({ zh: '收到你的行动方案', en: 'Got your action plan' })}</h3>
            <p className="mt-2.5 text-[13.5px] leading-[1.85] text-os-muted">{t({ zh: '我们已为你准备好邮件，点「发送」即送达；我们会尽其所能联系你、把它接住。', en: 'We’ve drafted the email for you — hit “send” and it reaches us. We’ll do everything we can to catch it.' })}</p>
            <button onClick={onClose} className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-os-navy to-os-indigo px-6 py-2.5 text-[13px] font-semibold text-white shadow-os hover:brightness-110">{t({ zh: '我知道了', en: 'Got it' })}</button>
          </div>
        ) : (
          <>
            <div className="px-7 pt-7 pb-4">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-os-navy to-os-indigo text-white mb-4"><Send className="h-5 w-5" /></div>
              <h3 className="font-serif-display text-[21px] font-semibold tracking-tight text-os-ink">{t({ zh: '提交我的行动方案', en: 'Submit My Action Plan' })}</h3>
              <p className="mt-2 text-[13.5px] leading-[1.8] text-os-muted">{t({ zh: '用三句话告诉我们：你需要哪种支持、你在做什么会带来什么改变、你具体需要什么。我们会尽其所能支持你。', en: 'In three lines: which support you need, what you’re doing and the change it brings, and what exactly you need. We’ll do everything we can to support you.' })}</p>
            </div>

            <div className="px-7 pb-7 space-y-4">
              <div>
                <label className="block text-[12px] font-semibold text-os-navy mb-1.5">{t({ zh: '① 你需要哪种支持？', en: '① Which support do you need?' })}</label>
                <select value={support} onChange={(e) => { setSupport(e.target.value); setErr(null); }} className={inputCls}>
                  {SUPPORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{t(o.label)}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-os-navy mb-1.5">{t({ zh: '② 你正在做一件什么事？它会带来什么改变？', en: '② What are you doing, and what change will it bring?' })}</label>
                <textarea value={doing} onChange={(e) => { setDoing(e.target.value); setErr(null); }} rows={3} placeholder={t({ zh: '简单讲讲你正在推进的行动，以及它想带来的改变。', en: 'Briefly: the action you’re pushing, and the change you hope it brings.' })} className={inputCls} />
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-os-navy mb-1.5">{t({ zh: '③ 你具体需要什么样的知识 / 资源？', en: '③ What knowledge / resources do you need?' })}</label>
                <textarea value={need} onChange={(e) => { setNeed(e.target.value); setErr(null); }} rows={3} placeholder={t({ zh: '越具体越好，方便我们和共建者对接。', en: 'The more specific, the easier for us and co-builders to help.' })} className={inputCls} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-semibold text-os-navy mb-1.5">{t({ zh: '你的称呼', en: 'Your name' })}</label>
                  <input value={name} onChange={(e) => { setName(e.target.value); setErr(null); }} placeholder={t({ zh: '怎么称呼你', en: 'How to call you' })} className={inputCls} />
                </div>
                <div>
                  <label className="block text-[12px] font-semibold text-os-navy mb-1.5">{t({ zh: '联系方式', en: 'Contact' })}</label>
                  <input value={contact} onChange={(e) => { setContact(e.target.value); setErr(null); }} placeholder={t({ zh: '邮箱 / 微信 / 手机', en: 'Email / WeChat / phone' })} className={inputCls} />
                </div>
              </div>

              {err && <p className="text-[12.5px] text-rose-600">{err}</p>}

              <button onClick={submit} className="group w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-os-navy to-os-indigo px-5 py-3 text-[14px] font-semibold text-white shadow-os hover:brightness-110 transition">
                {t({ zh: '提交行动方案', en: 'Submit Action Plan' })}<ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5" />
              </button>
              <p className="text-[11px] leading-5 text-os-muted/70 text-center">{t({ zh: '提交后会用你的邮件客户端发给我们；我们会尽快联系你。', en: 'Submitting opens your email client to send it to us; we’ll reach out soon.' })}</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
