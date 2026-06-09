import { useEffect, useState } from 'react';
import { X, Zap, Gift, BookOpen, Briefcase, QrCode, ArrowLeft, ArrowRight, ChevronRight, CheckCircle2 } from 'lucide-react';
import { useLang, type Bilingual } from '../../../lib/i18n';
import { BOOKS } from '../../../lib/books';

const CONTACT_EMAIL = 'guyuan9300@gmail.com';

type View = 'main' | 'donate' | 'book' | 'contact' | 'sent';

export function FunderModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useLang();
  const [view, setView] = useState<View>('main');
  const [sentMsg, setSentMsg] = useState<Bilingual>({ zh: '', en: '' });
  // 捐赠心愿
  const [wish, setWish] = useState('');
  const [donorName, setDonorName] = useState('');
  const [donorContact, setDonorContact] = useState('');
  // 大额资助洽谈
  const [who, setWho] = useState('');
  const [intro, setIntro] = useState('');
  const [intent, setIntent] = useState('');
  const [contact, setContact] = useState('');
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setView('main'); setWish(''); setDonorName(''); setDonorContact('');
      setWho(''); setIntro(''); setIntent(''); setContact(''); setErr(null);
      return;
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [open, onClose]);

  if (!open) return null;

  const sendMail = (subject: string, body: string) => {
    window.location.href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const submitWish = () => {
    if (!wish.trim()) { setErr(t({ zh: '写一句你想要的世界吧', en: 'Write the world you want to see' })); return; }
    const body = [
      '我想要一个什么样的世界：',
      wish.trim(),
      '',
      `称呼：${donorName.trim() || '(未填)'}`,
      `联系方式：${donorContact.trim() || '(未填)'}`,
      '（如已扫码捐赠，感谢 🙏）',
    ].join('\n');
    sendMail(`【为社区加电 · 心愿】${donorName.trim() || '一位资助方'}`, body);
    setSentMsg({ zh: '谢谢你的心愿,我们收下了。它会成为社区一起想去的方向。', en: 'Thank you — we’ve received your wish. It becomes a direction we head toward together.' });
    setView('sent');
  };

  const submitContact = () => {
    if (!intro.trim()) { setErr(t({ zh: '简单介绍一下你是谁', en: 'Tell us a bit about who you are' })); return; }
    if (!contact.trim()) { setErr(t({ zh: '留个联系方式，方便我们深聊', en: 'Leave a contact so we can talk' })); return; }
    const body = [
      '你是谁 / 简介：', intro.trim(), '',
      `资助意向：${intent.trim() || '(未填)'}`, '',
      `称呼 / 机构：${who.trim() || '(未填)'}`,
      `联系方式：${contact.trim()}`,
    ].join('\n');
    sendMail(`【大额资助洽谈】${who.trim() || '一位资助方'}`, body);
    setSentMsg({ zh: '谢谢,我们会尽快和你深聊,一起把它做成共赢的事。', en: 'Thank you — we’ll reach out soon to talk and make it a win-win.' });
    setView('sent');
  };

  const inputCls = 'w-full rounded-xl ring-1 ring-os-line bg-os-canvas px-3 py-2.5 text-[14px] text-os-ink focus:outline-none focus:ring-2 focus:ring-os-navy/30 placeholder:text-os-muted/60';
  const backBtn = (
    <button onClick={() => { setErr(null); setView('main'); }} className="inline-flex items-center gap-1 text-[13px] font-medium text-os-muted hover:text-os-navy transition mb-4"><ArrowLeft className="w-4 h-4" />{t({ zh: '返回', en: 'Back' })}</button>
  );

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-os-navy/45 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-[24px] bg-os-paper ring-1 ring-os-line shadow-2xl overflow-hidden max-h-[92vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 z-10 p-1.5 rounded-lg text-os-muted hover:bg-os-mist hover:text-os-navy transition" aria-label="Close"><X className="w-4 h-4" /></button>

        {/* ===== 成功页 ===== */}
        {view === 'sent' ? (
          <div className="px-7 py-12 text-center">
            <CheckCircle2 className="w-9 h-9 text-emerald-600 mx-auto mb-3" />
            <h3 className="font-serif-display text-[21px] font-semibold text-os-ink">{t({ zh: '已为你加电 ⚡', en: 'Powered up ⚡' })}</h3>
            <p className="mt-2.5 text-[13.5px] leading-[1.85] text-os-muted">{t(sentMsg)}</p>
            <button onClick={onClose} className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-os-spark px-6 py-2.5 text-[13px] font-semibold text-white shadow-os hover:brightness-105">{t({ zh: '我知道了', en: 'Got it' })}</button>
          </div>
        ) : (
          <>
            {/* 头部 */}
            <div className="px-7 pt-7 pb-4">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-os-spark-soft text-os-spark ring-1 ring-os-spark/20 mb-4"><Zap className="h-5 w-5" /></div>
              <h3 className="font-serif-display text-[21px] font-semibold tracking-tight text-os-ink">{t({ zh: '为社区加电', en: 'Power Up the Community' })}</h3>
              <p className="mt-2 text-[13.5px] leading-[1.8] text-os-muted">{t({ zh: '我们要的不只是出钱的人 —— 我们希望每个人都能在一件真实的事里获得共赢。选一种你喜欢的方式加电。', en: 'We don’t just need people who give money — we hope everyone wins inside something real. Pick a way to power up.' })}</p>
            </div>

            {/* ===== 主视图:三选一 ===== */}
            {view === 'main' && (
              <div className="px-7 pb-7 space-y-3">
                <ChooserRow icon={<Gift className="w-5 h-5" />} title={t({ zh: '无偿为社区捐赠', en: 'Donate to the community' })} desc={t({ zh: '扫码捐赠，金额随意，并写下你想要的世界', en: 'Scan to donate any amount, and share the world you want' })} onClick={() => { setErr(null); setView('donate'); }} />
                <ChooserRow icon={<BookOpen className="w-5 h-5" />} title={t({ zh: '买一本书支持社区', en: 'Buy a book to support us' })} desc={t({ zh: '用阅读给社区加电，还附赠终身会员', en: 'Power us up by reading — lifetime membership included' })} onClick={() => { setErr(null); setView('book'); }} />
                <ChooserRow icon={<Briefcase className="w-5 h-5" />} title={t({ zh: '洽谈大额资助', en: 'Discuss major funding' })} desc={t({ zh: '留下联系方式，我们和你深聊共赢方案', en: 'Leave your contact and we’ll talk through a win-win' })} onClick={() => { setErr(null); setView('contact'); }} />
              </div>
            )}

            {/* ===== 捐赠 + 心愿 ===== */}
            {view === 'donate' && (
              <div className="px-7 pb-7">
                {backBtn}
                <div className="rounded-2xl ring-1 ring-os-line bg-os-canvas/60 p-5 flex flex-col items-center text-center">
                  <div className="w-40 h-40 rounded-xl border-2 border-dashed border-os-line bg-os-paper flex flex-col items-center justify-center text-os-muted/70 gap-2">
                    <QrCode className="w-8 h-8" />
                    <span className="text-[12px]">{t({ zh: '收款码待放置', en: 'QR code coming soon' })}</span>
                  </div>
                  <p className="mt-3 text-[12.5px] leading-6 text-os-muted">{t({ zh: '扫码捐赠，金额随意。每一分都用于社区运转与帮行动者加速。', en: 'Scan to donate any amount. Every bit funds the community and speeds actioners up.' })}</p>
                </div>

                <div className="mt-5">
                  <label className="block text-[12px] font-semibold text-os-navy mb-1.5">{t({ zh: '你想要一个什么样的世界？', en: 'What kind of world do you want?' })}</label>
                  <textarea value={wish} onChange={(e) => { setWish(e.target.value); setErr(null); }} rows={3} placeholder={t({ zh: '写下你心里那个更好的世界 —— 我们会把它收下，未来做成社区的心愿墙。', en: 'Describe the better world you imagine — we’ll keep it, and one day build a community wish wall.' })} className={inputCls} />
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <input value={donorName} onChange={(e) => setDonorName(e.target.value)} placeholder={t({ zh: '你的称呼（选填）', en: 'Your name (optional)' })} className={inputCls} />
                  <input value={donorContact} onChange={(e) => setDonorContact(e.target.value)} placeholder={t({ zh: '联系方式（选填）', en: 'Contact (optional)' })} className={inputCls} />
                </div>

                {err && <p className="mt-3 text-[12.5px] text-rose-600">{err}</p>}
                <button onClick={submitWish} className="group mt-4 w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-os-spark px-5 py-3 text-[14px] font-semibold text-white shadow-os hover:brightness-105 transition">
                  {t({ zh: '送出我的心愿', en: 'Send My Wish' })}<ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5" />
                </button>
                <p className="mt-2 text-[11px] leading-5 text-os-muted/70 text-center">{t({ zh: '心愿会用你的邮件客户端发给我们；捐赠请用上方收款码（两者独立）。', en: 'Your wish is sent via your email client; donate via the QR above (the two are separate).' })}</p>
              </div>
            )}

            {/* ===== 买书 ===== */}
            {view === 'book' && (
              <div className="px-7 pb-7">
                {backBtn}
                <p className="text-[13px] leading-[1.8] text-os-muted mb-4">{t({ zh: '买一本顾源源的书，就是用另一种方式给社区加电 —— 还会附赠益语智库终身会员。', en: 'Buying one of Guyuan’s books is another way to power up the community — lifetime membership included.' })}</p>
                <div className="space-y-3">
                  {BOOKS.map((b) => (
                    <a
                      key={b.planId}
                      href={`?page=book-detail&id=${b.planId}`}
                      className="group flex items-center gap-4 rounded-2xl ring-1 ring-os-line bg-os-canvas/60 p-3 hover:ring-os-navy/25 hover:bg-os-canvas transition"
                    >
                      <img src={b.cover} alt={b.title} className="w-14 h-[76px] object-cover rounded-md ring-1 ring-os-line shrink-0 bg-os-mist" loading="lazy" />
                      <div className="min-w-0 flex-1">
                        <h4 className="text-[15px] font-semibold text-os-ink leading-snug">{b.title}</h4>
                        <p className="text-[12px] text-os-muted mt-0.5 line-clamp-1">{b.tagline}</p>
                        <div className="mt-1.5 flex items-center gap-2">
                          <span className="font-serif-display text-[18px] font-semibold text-os-ink">¥{b.priceYuan}</span>
                          <span className="text-[11px] text-os-spark">{t({ zh: '含终身会员', en: 'Lifetime member' })}</span>
                        </div>
                      </div>
                      <span className="shrink-0 inline-flex items-center gap-0.5 text-[13px] font-semibold text-os-navy group-hover:text-os-blue transition">{t({ zh: '去了解', en: 'View' })}<ChevronRight className="w-4 h-4" /></span>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* ===== 大额资助洽谈 ===== */}
            {view === 'contact' && (
              <div className="px-7 pb-7">
                {backBtn}
                <div className="space-y-4">
                  <div>
                    <label className="block text-[12px] font-semibold text-os-navy mb-1.5">{t({ zh: '你是谁？简单介绍一下', en: 'Who are you? A short intro' })}</label>
                    <textarea value={intro} onChange={(e) => { setIntro(e.target.value); setErr(null); }} rows={3} placeholder={t({ zh: '基金会 / 企业 / 机构 / 个人，你关注什么、为什么想资助。', en: 'Foundation / company / org / individual — what you care about and why you’d fund us.' })} className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-[12px] font-semibold text-os-navy mb-1.5">{t({ zh: '资助意向（选填）', en: 'Funding intent (optional)' })}</label>
                    <textarea value={intent} onChange={(e) => setIntent(e.target.value)} rows={2} placeholder={t({ zh: '想资助的方向 / 规模 / 期望的共赢方式。', en: 'Direction / scale / the win-win you hope for.' })} className={inputCls} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <input value={who} onChange={(e) => { setWho(e.target.value); setErr(null); }} placeholder={t({ zh: '称呼 / 机构', en: 'Name / org' })} className={inputCls} />
                    <input value={contact} onChange={(e) => { setContact(e.target.value); setErr(null); }} placeholder={t({ zh: '联系方式', en: 'Contact' })} className={inputCls} />
                  </div>
                  {err && <p className="text-[12.5px] text-rose-600">{err}</p>}
                  <button onClick={submitContact} className="group w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-os-navy to-os-indigo px-5 py-3 text-[14px] font-semibold text-white shadow-os hover:brightness-110 transition">
                    {t({ zh: '发起洽谈', en: 'Start the Conversation' })}<ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5" />
                  </button>
                  <p className="text-[11px] leading-5 text-os-muted/70 text-center">{t({ zh: '提交后会用你的邮件客户端发给我们；我们会尽快和你深聊。', en: 'Submitting opens your email client; we’ll reach out soon.' })}</p>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function ChooserRow({ icon, title, desc, onClick }: { icon: React.ReactNode; title: string; desc: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="group w-full flex items-center gap-4 rounded-2xl ring-1 ring-os-line bg-os-canvas/60 p-4 text-left hover:ring-os-navy/25 hover:bg-os-canvas transition">
      <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-os-mist text-os-blue ring-1 ring-os-blue/15 shrink-0 transition group-hover:-translate-y-0.5">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-semibold text-os-ink">{title}</span>
        <span className="block text-[12.5px] text-os-muted mt-0.5">{desc}</span>
      </span>
      <ChevronRight className="w-5 h-5 text-os-muted/60 group-hover:text-os-navy group-hover:translate-x-0.5 transition shrink-0" />
    </button>
  );
}
