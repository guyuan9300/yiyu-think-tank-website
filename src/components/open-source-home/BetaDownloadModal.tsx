import { useEffect, useState } from 'react';
import { X, Laptop, KeyRound, CheckCircle2, ArrowRight, Github, Heart } from 'lucide-react';
import { useLang } from '../../lib/i18n';
import { isValidBetaCode, MAC_DMG_URL } from './betaDownload';
import { submitBetaApplication, isApprovedBetaCode, BETA_USER_TYPE_LABEL, type BetaUserType } from '../../lib/betaApplications';

// 益语智库 AI · 内测下载弹窗 (第一期)
//   主视图: ① 输入内测码下载  ② 申请内测(须登录)
//   申请视图: 用户类型下拉(优先公益) + 条件字段(企业/公益填机构名 / 个人填用途)
function getCurrentUser(): { email: string; name: string } | null {
  try {
    const raw = localStorage.getItem('yiyu_current_user') || sessionStorage.getItem('yiyu_current_user');
    if (!raw) return null;
    const u = JSON.parse(raw);
    return { email: u.email || '', name: u.nickname || u.name || u.email || '用户' };
  } catch { return null; }
}

export function BetaDownloadModal({ open, onClose, onNavigate }: {
  open: boolean;
  onClose: () => void;
  onNavigate?: (page: string) => void;
}) {
  const { t } = useLang();
  const [view, setView] = useState<'main' | 'apply' | 'applied'>('main');
  const [code, setCode] = useState('');
  const [codeState, setCodeState] = useState<'idle' | 'error' | 'ok'>('idle');
  // 申请表单
  const [userType, setUserType] = useState<BetaUserType>('nonprofit');
  const [orgName, setOrgName] = useState('');
  const [purpose, setPurpose] = useState('');
  const [formErr, setFormErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open) { setView('main'); setCode(''); setCodeState('idle'); setOrgName(''); setPurpose(''); setFormErr(null); setUserType('nonprofit'); return; }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [open, onClose]);

  if (!open) return null;

  const user = getCurrentUser();
  const isOrg = userType === 'nonprofit' || userType === 'enterprise';

  const submitCode = () => {
    if (!isValidBetaCode(code) && !isApprovedBetaCode(code)) { setCodeState('error'); return; }
    setCodeState('ok');
    if (MAC_DMG_URL) {
      const a = document.createElement('a'); a.href = MAC_DMG_URL; a.download = ''; document.body.appendChild(a); a.click(); a.remove();
    }
  };

  const submitForm = () => {
    if (!user) return;
    if (isOrg && !orgName.trim()) { setFormErr('请填写机构名称'); return; }
    if (!isOrg && !purpose.trim()) { setFormErr('请填写使用用途'); return; }
    submitBetaApplication({
      userName: user.name,
      userEmail: user.email,
      userType,
      orgName: isOrg ? orgName.trim() : undefined,
      purpose: !isOrg ? purpose.trim() : undefined,
    });
    setView('applied');
  };

  const inputCls = 'w-full rounded-xl ring-1 ring-os-line bg-os-canvas px-3 py-2.5 text-[14px] text-os-ink focus:outline-none focus:ring-2 focus:ring-os-navy/30';

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-os-navy/45 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-[24px] bg-os-paper ring-1 ring-os-line shadow-2xl overflow-hidden max-h-[92vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 z-10 p-1.5 rounded-lg text-os-muted hover:bg-os-mist hover:text-os-navy transition"><X className="w-4 h-4" /></button>

        {/* 头部 */}
        <div className="px-7 pt-7 pb-5">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-os-navy to-os-indigo text-white mb-4"><Laptop className="h-5 w-5" /></div>
          <h3 className="font-serif-display text-[21px] font-semibold tracking-tight text-os-ink">{t({ zh: '益语智库 AI · 内测申请', en: 'Yiyu AI · Beta Access' })}</h3>
          <p className="mt-2 text-[13.5px] leading-[1.8] text-os-muted">
            {t({ zh: '产品正在内测中、仍在打磨；要真正用起来还需配置模型与云服务，对刚上手的用户有门槛。所以先以邀请制开放，确保每位内测用户都能被陪着用起来。', en: 'The product is in active beta; using it well also needs model and cloud setup. Downloads are invite-only for now so every beta user gets hands-on guidance.' })}
          </p>
        </div>

        {/* ===== 验证通过 ===== */}
        {codeState === 'ok' ? (
          <div className="px-7 pb-7">
            <div className="rounded-2xl bg-emerald-50 ring-1 ring-emerald-200/60 p-5 text-center">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
              <div className="text-[15px] font-semibold text-os-ink">{t({ zh: '内测码验证通过', en: 'Invite code verified' })}</div>
              <p className="mt-1.5 text-[12.5px] leading-6 text-os-muted">
                {MAC_DMG_URL
                  ? t({ zh: '安装包下载已开始。', en: 'Your download has started.' })
                  : t({ zh: 'macOS 安装包正在内测发放准备中，我们会通过邮件 / 内测社群发给你安装包和配置指引。', en: 'The macOS build is being prepared; we will send you the installer and setup guide.' })}
              </p>
              <div className="mt-4 flex items-center justify-center gap-2">
                {MAC_DMG_URL && <a href={MAC_DMG_URL} className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-os-navy to-os-indigo px-5 py-2.5 text-[13px] font-semibold text-white shadow-os hover:brightness-110"><Laptop className="w-4 h-4" />{t({ zh: '下载 macOS 版', en: 'Download' })}</a>}
                <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-full bg-os-paper px-5 py-2.5 text-[13px] font-semibold text-os-navy ring-1 ring-os-line hover:ring-os-navy/40"><Github className="w-4 h-4" />{t({ zh: '查看源码', en: 'Source' })}</a>
              </div>
            </div>
          </div>
        ) : view === 'applied' ? (
          /* ===== 申请已提交 ===== */
          <div className="px-7 pb-7">
            <div className="rounded-2xl bg-emerald-50 ring-1 ring-emerald-200/60 p-5 text-center">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
              <div className="text-[15px] font-semibold text-os-ink">{t({ zh: '内测申请已提交', en: 'Application submitted' })}</div>
              <p className="mt-1.5 text-[12.5px] leading-6 text-os-muted">{t({ zh: '我们会优先审核公益慈善组织的申请，通过后通过邮件 / 站内发放内测码。感谢你的耐心。', en: 'We prioritize nonprofit applications and will send your invite code by email after review. Thank you.' })}</p>
              <button onClick={onClose} className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-os-navy to-os-indigo px-6 py-2.5 text-[13px] font-semibold text-white shadow-os hover:brightness-110">{t({ zh: '我知道了', en: 'Got it' })}</button>
            </div>
          </div>
        ) : view === 'apply' ? (
          /* ===== 申请表单(须登录) ===== */
          <div className="px-7 pb-7">
            {!user ? (
              <div className="rounded-2xl bg-os-mist/50 ring-1 ring-os-line p-5 text-center">
                <p className="text-[13.5px] leading-7 text-os-ink">{t({ zh: '申请内测需先登录/注册，便于我们审核并向你发放内测码。', en: 'Please log in or sign up to apply, so we can review and send your code.' })}</p>
                <button onClick={() => { onClose(); onNavigate?.('login'); }} className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-os-navy to-os-indigo px-6 py-2.5 text-[13px] font-semibold text-white shadow-os hover:brightness-110">{t({ zh: '去登录 / 注册', en: 'Log in / Sign up' })}</button>
              </div>
            ) : (
              <div className="space-y-3.5">
                {/* 公益优先提示 */}
                <div className="flex items-start gap-2 rounded-xl bg-emerald-50 ring-1 ring-emerald-200/50 px-3.5 py-2.5 text-[12.5px] leading-6 text-emerald-800">
                  <Heart className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{t({ zh: '目前申请内测的人较多，我们优先向中国境内的公益慈善组织开放试用权限。', en: 'Demand is high — we currently prioritize registered nonprofits in mainland China.' })}</span>
                </div>

                <div>
                  <label className="block text-[12px] font-semibold text-os-navy mb-1.5">{t({ zh: '你是', en: 'You are' })}</label>
                  <select value={userType} onChange={(e) => { setUserType(e.target.value as BetaUserType); setFormErr(null); }} className={inputCls}>
                    <option value="nonprofit">{t({ zh: '公益慈善组织用户（优先）', en: 'Nonprofit (priority)' })}</option>
                    <option value="enterprise">{t({ zh: '企业用户', en: 'Enterprise' })}</option>
                    <option value="individual">{t({ zh: '个人用户', en: 'Individual' })}</option>
                  </select>
                </div>

                {isOrg ? (
                  <div>
                    <label className="block text-[12px] font-semibold text-os-navy mb-1.5">{t({ zh: '机构名称', en: 'Organization name' })}</label>
                    <input value={orgName} onChange={(e) => { setOrgName(e.target.value); setFormErr(null); }} placeholder={t({ zh: userType === 'nonprofit' ? '如 XX 公益基金会' : '如 XX 科技有限公司', en: 'Organization name' })} className={inputCls} />
                  </div>
                ) : (
                  <div>
                    <label className="block text-[12px] font-semibold text-os-navy mb-1.5">{t({ zh: '使用用途', en: 'Intended use' })}</label>
                    <textarea value={purpose} onChange={(e) => { setPurpose(e.target.value); setFormErr(null); }} rows={3} placeholder={t({ zh: '随便写写你想用它做什么', en: 'Tell us what you want to use it for' })} className={inputCls} />
                  </div>
                )}

                {formErr && <p className="text-[12.5px] text-rose-600">{formErr}</p>}

                <div className="flex items-center gap-2 pt-1">
                  <button onClick={submitForm} className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-os-navy to-os-indigo px-5 py-2.5 text-[14px] font-semibold text-white shadow-os hover:brightness-110">{t({ zh: '提交申请', en: 'Submit' })}<ArrowRight className="w-4 h-4" /></button>
                  <button onClick={() => setView('main')} className="px-4 py-2.5 rounded-xl text-[13px] font-medium text-os-navy ring-1 ring-os-line hover:bg-os-mist/50">{t({ zh: '返回', en: 'Back' })}</button>
                </div>
                <p className="text-[11px] text-os-muted/70">{t({ zh: '当前登录：', en: 'Logged in as: ' })}{user.name}{user.email ? `（${user.email}）` : ''}</p>
              </div>
            )}
          </div>
        ) : (
          /* ===== 主视图 ===== */
          <>
            <div className="px-7 pb-2">
              <label className="block text-[12px] font-semibold text-os-navy mb-2">{t({ zh: '输入内测码下载', en: 'Enter invite code to download' })}</label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-os-muted" />
                  <input value={code} onChange={(e) => { setCode(e.target.value); if (codeState === 'error') setCodeState('idle'); }} onKeyDown={(e) => { if (e.key === 'Enter') submitCode(); }} placeholder={t({ zh: '请输入内测邀请码', en: 'Beta invite code' })} className="w-full rounded-xl ring-1 ring-os-line bg-os-canvas pl-9 pr-3 py-2.5 text-[14px] text-os-ink focus:outline-none focus:ring-2 focus:ring-os-navy/30" />
                </div>
                <button onClick={submitCode} className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-os-navy to-os-indigo px-5 py-2.5 text-[14px] font-semibold text-white shadow-os hover:brightness-110 shrink-0">{t({ zh: '下载', en: 'Download' })}</button>
              </div>
              {codeState === 'error' && <p className="mt-2 text-[12.5px] text-rose-600">{t({ zh: '内测码无效，请确认后重试，或申请内测。', en: 'Invalid code. Retry or apply for beta.' })}</p>}
            </div>

            <div className="px-7 py-4 flex items-center gap-3 text-[12px] text-os-muted">
              <span className="h-px flex-1 bg-os-line" />{t({ zh: '还没有内测码？', en: 'No code yet?' })}<span className="h-px flex-1 bg-os-line" />
            </div>

            <div className="px-7 pb-7">
              <button onClick={() => setView('apply')} className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-os-paper px-5 py-3 text-[14px] font-semibold text-os-navy ring-1 ring-os-line hover:ring-os-navy/40 hover:bg-os-mist/50 transition">{t({ zh: '申请内测资格', en: 'Apply for beta' })}<ArrowRight className="w-4 h-4" /></button>
              <p className="mt-2.5 text-[11.5px] leading-6 text-os-muted/80 text-center">{t({ zh: '提交申请后，我们优先评估公益组织，通过后发放内测码与配置陪伴。', en: 'We prioritize nonprofits; after review we send a code with setup guidance.' })}</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
