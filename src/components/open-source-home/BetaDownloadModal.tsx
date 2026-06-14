import { useEffect, useState } from 'react';
import { X, Laptop, KeyRound, CheckCircle2, ArrowRight, Github, Heart, Users, Download } from 'lucide-react';
import { useLang } from '../../lib/i18n';
import {
  submitBetaApplication,
  fetchBetaStats,
  verifyBetaCode,
  BETA_HEADCOUNT_OPTIONS,
  BETA_CLOUD_CREDIT_LABEL,
  BETA_CLOUD_CREDIT_EXCLUSIVE,
  type BetaStats,
  type BetaUserType,
  type BetaHeadcount,
  type BetaCloudCredit,
} from '../../lib/betaApi';

// 益语智库 AI · 内测下载弹窗 (第二期: 接云后端)
//   主视图: ① 输入内测码下载(后端 verify-code 换限时 token, 计真实下载)  ② 申请内测(须登录)
//   申请视图: 用户类型下拉(优先公益) + 条件字段(企业/公益填机构名 / 个人填用途)
//   头部计数: 营销起始基数(顾 2026-06-13 拍板) + GET /api/v1/beta/stats 真实增量;
//   stats 取不到时只显示基数, 取到后随真实申请/下载继续累加。

// 营销起始基数(只改这里): 展示值 = 基数 + 后端真实统计。
const BETA_STATS_BASE = { applicationCount: 1200, downloadCount: 177 };

// 1200→"1.2K", 1250→"1.3K", 999 以下原样。保持 K 位一位小数, 整千去掉 ".0"。
function formatCount(n: number): string {
  if (n < 1000) return String(n);
  return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}K`;
}
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
  const [codeState, setCodeState] = useState<'idle' | 'verifying' | 'error' | 'ok'>('idle');
  const [codeErr, setCodeErr] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState('');
  const [stats, setStats] = useState<BetaStats | null>(null);
  // 申请表单
  const [userType, setUserType] = useState<BetaUserType>('nonprofit');
  const [orgName, setOrgName] = useState('');
  const [purpose, setPurpose] = useState('');
  const [email, setEmail] = useState('');
  const [emailTouched, setEmailTouched] = useState(false);
  const [headcount, setHeadcount] = useState<BetaHeadcount>(BETA_HEADCOUNT_OPTIONS[0]);
  const [focusIssue, setFocusIssue] = useState('');
  const [beneficiaryCount, setBeneficiaryCount] = useState('');
  const [cloudCredit, setCloudCredit] = useState<BetaCloudCredit[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [formErr, setFormErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setView('main'); setCode(''); setCodeState('idle'); setCodeErr(null); setDownloadUrl(''); setOrgName(''); setPurpose(''); setFormErr(null); setUserType('nonprofit');
      setEmail(''); setEmailTouched(false); setHeadcount(BETA_HEADCOUNT_OPTIONS[0]); setFocusIssue(''); setBeneficiaryCount(''); setCloudCredit([]); setSubmitting(false);
      return;
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [open, onClose]);

  // 进入申请视图时,默认预填登录邮箱(用户未手动改过才填)。
  useEffect(() => {
    if (view !== 'apply' || emailTouched) return;
    const u = getCurrentUser();
    if (u?.email) setEmail(u.email);
  }, [view, emailTouched]);

  // 打开时拉真实统计;失败静默(计数行隐藏),不挡申请/下载主流程。
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    fetchBetaStats()
      .then((s) => { if (!cancelled) setStats(s); })
      .catch(() => { if (!cancelled) setStats(null); });
    return () => { cancelled = true; };
  }, [open]);

  if (!open) return null;

  const user = getCurrentUser();
  const isOrg = userType === 'nonprofit' || userType === 'enterprise';

  // 换码下载: 后端校验内测码并签发限时下载 token(下载经 /api/v1/downloads/:token 落 used_at, 计入真实下载数)。
  const submitCode = async () => {
    if (codeState === 'verifying') return;
    const c = code.trim();
    if (!c) { setCodeState('error'); setCodeErr(t({ zh: '请输入内测邀请码', en: 'Please enter your invite code' })); return; }
    setCodeState('verifying');
    setCodeErr(null);
    try {
      const result = await verifyBetaCode(c, 'mac');
      setDownloadUrl(result.downloadUrl);
      setCodeState('ok');
      const a = document.createElement('a'); a.href = result.downloadUrl; a.download = ''; document.body.appendChild(a); a.click(); a.remove();
    } catch (err) {
      setCodeState('error');
      setCodeErr(err instanceof Error ? err.message : t({ zh: '验证失败，请稍后重试', en: 'Verification failed, please retry' }));
    }
  };

  // 云算力多选互斥:勾「已自有」或「暂无」(排他项)→ 仅留它自己;勾「腾讯/火山」→ 取消所有排他项。
  const toggleCloudCredit = (val: BetaCloudCredit) => {
    setFormErr(null);
    setCloudCredit((prev) => {
      const has = prev.includes(val);
      if (has) return prev.filter((v) => v !== val);
      if (BETA_CLOUD_CREDIT_EXCLUSIVE.includes(val)) return [val];
      return [...prev.filter((v) => !BETA_CLOUD_CREDIT_EXCLUSIVE.includes(v)), val];
    });
  };

  const submitForm = async () => {
    if (!user || submitting) return;
    const mail = email.trim();
    if (!mail) { setFormErr('请填写邮箱'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) { setFormErr('邮箱格式不正确'); return; }
    if (isOrg && !orgName.trim()) { setFormErr('请填写机构名称'); return; }
    if (!isOrg && !purpose.trim()) { setFormErr('请填写使用用途'); return; }
    setSubmitting(true);
    setFormErr(null);
    try {
      await submitBetaApplication({
        userName: user.name,
        userEmail: mail,
        userType,
        orgName: isOrg ? orgName.trim() : undefined,
        purpose: !isOrg ? purpose.trim() : undefined,
        headcount: isOrg ? headcount : undefined,
        focusIssue: focusIssue.trim() || undefined,
        beneficiaryCount: isOrg ? (beneficiaryCount.trim() || undefined) : undefined,
        cloudCredit,
      });
      setView('applied');
    } catch (err) {
      setFormErr(err instanceof Error ? err.message : '提交失败，请稍后重试');
    } finally {
      setSubmitting(false);
    }
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
          <h3 className="font-serif-display text-[21px] font-semibold tracking-tight text-os-ink">{t({ zh: '益语智库 AI · 内测预约', en: 'Yiyu AI · Beta Access' })}</h3>
          <p className="mt-2 text-[13.5px] leading-[1.8] text-os-muted">
            {t({ zh: '产品正在内测中、仍在打磨；要真正用起来还需配置模型与云服务，对刚上手的用户有门槛。所以先以邀请制开放，确保每位内测用户都能被陪着用起来。', en: 'The product is in active beta; using it well also needs model and cloud setup. Downloads are invite-only for now so every beta user gets hands-on guidance.' })}
          </p>
          <div className="mt-3 flex items-center gap-3 text-[12px] text-os-muted">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-os-mist/60 ring-1 ring-os-line px-3 py-1">
              <Users className="w-3.5 h-3.5 text-os-navy/70" />
              <span className="font-semibold text-os-navy tabular-nums">{formatCount(BETA_STATS_BASE.applicationCount + (stats?.applicationCount ?? 0))}</span>
              {t({ zh: '人已预约', en: 'reserved' })}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-os-mist/60 ring-1 ring-os-line px-3 py-1">
              <Download className="w-3.5 h-3.5 text-os-navy/70" />
              <span className="font-semibold text-os-navy tabular-nums">{formatCount(BETA_STATS_BASE.downloadCount + (stats?.downloadCount ?? 0))}</span>
              {t({ zh: '人已下载', en: 'downloaded' })}
            </span>
          </div>
        </div>

        {/* ===== 验证通过 ===== */}
        {codeState === 'ok' ? (
          <div className="px-7 pb-7">
            <div className="rounded-2xl bg-emerald-50 ring-1 ring-emerald-200/60 p-5 text-center">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
              <div className="text-[15px] font-semibold text-os-ink">{t({ zh: '内测码验证通过', en: 'Invite code verified' })}</div>
              <p className="mt-1.5 text-[12.5px] leading-6 text-os-muted">
                {t({ zh: '安装包下载已开始；若未自动开始，请点击下方按钮（下载链接限时有效）。', en: 'Your download has started. If not, use the button below (link is time-limited).' })}
              </p>
              <div className="mt-4 flex items-center justify-center gap-2">
                {downloadUrl && <a href={downloadUrl} className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-os-navy to-os-indigo px-5 py-2.5 text-[13px] font-semibold text-white shadow-os hover:brightness-110"><Laptop className="w-4 h-4" />{t({ zh: '下载 macOS 版', en: 'Download' })}</a>}
                <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-full bg-os-paper px-5 py-2.5 text-[13px] font-semibold text-os-navy ring-1 ring-os-line hover:ring-os-navy/40"><Github className="w-4 h-4" />{t({ zh: '查看源码', en: 'Source' })}</a>
              </div>
            </div>
          </div>
        ) : view === 'applied' ? (
          /* ===== 申请已提交 ===== */
          <div className="px-7 pb-7">
            <div className="rounded-2xl bg-emerald-50 ring-1 ring-emerald-200/60 p-5 text-center">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
              <div className="text-[15px] font-semibold text-os-ink">{t({ zh: '内测预约已提交', en: 'Reservation submitted' })}</div>
              <p className="mt-1.5 text-[12.5px] leading-6 text-os-muted">{t({ zh: '我们会优先审核公益慈善组织的预约，通过后通过邮件 / 站内发放内测码。感谢你的耐心。', en: 'We prioritize nonprofit reservations and will send your invite code by email after review. Thank you.' })}</p>
              <button onClick={onClose} className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-os-navy to-os-indigo px-6 py-2.5 text-[13px] font-semibold text-white shadow-os hover:brightness-110">{t({ zh: '我知道了', en: 'Got it' })}</button>
            </div>
          </div>
        ) : view === 'apply' ? (
          /* ===== 申请表单(须登录) ===== */
          <div className="px-7 pb-7">
            {!user ? (
              <div className="rounded-2xl bg-os-mist/50 ring-1 ring-os-line p-5 text-center">
                <p className="text-[13.5px] leading-7 text-os-ink">{t({ zh: '预约内测需先登录/注册，便于我们审核并向你发放内测码。', en: 'Please log in or sign up to reserve, so we can review and send your code.' })}</p>
                <button onClick={() => { onClose(); onNavigate?.('login'); }} className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-os-navy to-os-indigo px-6 py-2.5 text-[13px] font-semibold text-white shadow-os hover:brightness-110">{t({ zh: '去登录 / 注册', en: 'Log in / Sign up' })}</button>
              </div>
            ) : (
              <div className="space-y-3.5">
                {/* 公益优先提示 */}
                <div className="flex items-start gap-2 rounded-xl bg-emerald-50 ring-1 ring-emerald-200/50 px-3.5 py-2.5 text-[12.5px] leading-6 text-emerald-800">
                  <Heart className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{t({ zh: '目前预约内测的人较多，我们优先向中国境内的公益慈善组织开放试用权限。', en: 'Demand is high — we currently prioritize registered nonprofits in mainland China.' })}</span>
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
                  <>
                    <div>
                      <label className="block text-[12px] font-semibold text-os-navy mb-1.5">{userType === 'enterprise' ? t({ zh: '企业名称', en: 'Company name' }) : t({ zh: '机构名称', en: 'Organization name' })}</label>
                      <input value={orgName} onChange={(e) => { setOrgName(e.target.value); setFormErr(null); }} placeholder={t({ zh: userType === 'nonprofit' ? '如 XX 公益基金会' : '如 XX 科技有限公司', en: 'Organization name' })} className={inputCls} />
                    </div>
                    <div>
                      <label className="block text-[12px] font-semibold text-os-navy mb-1.5">{t({ zh: '全职人数', en: 'Full-time headcount' })}</label>
                      <select value={headcount} onChange={(e) => { setHeadcount(e.target.value as BetaHeadcount); setFormErr(null); }} className={inputCls}>
                        {BETA_HEADCOUNT_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[12px] font-semibold text-os-navy mb-1.5">{userType === 'enterprise' ? t({ zh: '业务覆盖用户 / 客户规模', en: 'Users / customers served' }) : t({ zh: '项目覆盖受益人数', en: 'Beneficiaries reached' })}</label>
                      <input value={beneficiaryCount} onChange={(e) => { setBeneficiaryCount(e.target.value); setFormErr(null); }} placeholder={t({ zh: userType === 'enterprise' ? '如 1 万活跃用户 / 暂无统计' : '如 500 人 / 暂无统计', en: 'e.g. 500 / not tracked yet' })} className={inputCls} />
                    </div>
                  </>
                ) : (
                  <div>
                    <label className="block text-[12px] font-semibold text-os-navy mb-1.5">{t({ zh: '使用用途', en: 'Intended use' })}</label>
                    <textarea value={purpose} onChange={(e) => { setPurpose(e.target.value); setFormErr(null); }} rows={3} placeholder={t({ zh: '随便写写你想用它做什么，比如想解决的问题、想用 AI 帮你做什么', en: 'Tell us what you want to use it for' })} className={inputCls} />
                  </div>
                )}

                {/* 邮箱(默认预填登录邮箱,可改) · 通用 */}
                <div>
                  <label className="block text-[12px] font-semibold text-os-navy mb-1.5">{t({ zh: '邮箱', en: 'Email' })}</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setEmailTouched(true); setFormErr(null); }}
                    placeholder={t({ zh: '用于接收内测邀请码', en: 'For receiving your invite code' })}
                    className={inputCls}
                  />
                </div>

                {/* 关注领域与议题 · 通用 */}
                <div>
                  <label className="block text-[12px] font-semibold text-os-navy mb-1.5">{t({ zh: '关注领域与议题', en: 'Focus areas & issues' })}</label>
                  <textarea value={focusIssue} onChange={(e) => { setFocusIssue(e.target.value); setFormErr(null); }} rows={2} placeholder={t({ zh: userType === 'individual' ? '如你关注的方向、想解决的问题' : '如乡村教育、环境保护、儿童福利等', en: 'e.g. rural education, environment, children…' })} className={inputCls} />
                </div>

                {/* 是否已申请免费云算力(多选) */}
                <div>
                  <label className="block text-[12px] font-semibold text-os-navy mb-1.5">{t({ zh: '是否已申请免费云算力', en: 'Applied for free cloud credits?' })}</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(Object.keys(BETA_CLOUD_CREDIT_LABEL) as BetaCloudCredit[]).map((val) => {
                      const checked = cloudCredit.includes(val);
                      return (
                        <label key={val} className={`flex items-center gap-2 rounded-xl px-3 py-2 text-[13px] cursor-pointer ring-1 transition ${checked ? 'bg-os-navy/5 ring-os-navy/40 text-os-ink' : 'bg-os-canvas ring-os-line text-os-muted hover:ring-os-navy/25'}`}>
                          <input type="checkbox" checked={checked} onChange={() => toggleCloudCredit(val)} className="w-4 h-4 rounded border-os-line accent-os-navy shrink-0" />
                          <span>{BETA_CLOUD_CREDIT_LABEL[val]}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {formErr && <p className="text-[12.5px] text-rose-600">{formErr}</p>}

                <div className="flex items-center gap-2 pt-1">
                  <button onClick={() => void submitForm()} disabled={submitting} className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-os-navy to-os-indigo px-5 py-2.5 text-[14px] font-semibold text-white shadow-os hover:brightness-110 disabled:opacity-60">{submitting ? t({ zh: '提交中…', en: 'Submitting…' }) : t({ zh: '提交预约', en: 'Submit' })}{!submitting && <ArrowRight className="w-4 h-4" />}</button>
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
                  <input value={code} onChange={(e) => { setCode(e.target.value); if (codeState === 'error') { setCodeState('idle'); setCodeErr(null); } }} onKeyDown={(e) => { if (e.key === 'Enter') void submitCode(); }} placeholder={t({ zh: '请输入内测邀请码', en: 'Beta invite code' })} className="w-full rounded-xl ring-1 ring-os-line bg-os-canvas pl-9 pr-3 py-2.5 text-[14px] text-os-ink focus:outline-none focus:ring-2 focus:ring-os-navy/30" />
                </div>
                <button onClick={() => void submitCode()} disabled={codeState === 'verifying'} className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-os-navy to-os-indigo px-5 py-2.5 text-[14px] font-semibold text-white shadow-os hover:brightness-110 disabled:opacity-60 shrink-0">{codeState === 'verifying' ? t({ zh: '验证中…', en: 'Verifying…' }) : t({ zh: '下载', en: 'Download' })}</button>
              </div>
              {codeState === 'error' && <p className="mt-2 text-[12.5px] text-rose-600">{codeErr || t({ zh: '内测码无效，请确认后重试，或预约内测。', en: 'Invalid code. Retry or reserve beta.' })}</p>}
            </div>

            <div className="px-7 py-4 flex items-center gap-3 text-[12px] text-os-muted">
              <span className="h-px flex-1 bg-os-line" />{t({ zh: '还没有内测码？', en: 'No code yet?' })}<span className="h-px flex-1 bg-os-line" />
            </div>

            <div className="px-7 pb-7">
              <button onClick={() => setView('apply')} className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-os-paper px-5 py-3 text-[14px] font-semibold text-os-navy ring-1 ring-os-line hover:ring-os-navy/40 hover:bg-os-mist/50 transition">{t({ zh: '预约内测资格', en: 'Reserve beta' })}<ArrowRight className="w-4 h-4" /></button>
              <p className="mt-2.5 text-[11.5px] leading-6 text-os-muted/80 text-center">{t({ zh: '提交预约后，我们优先评估公益组织，通过后发放内测码与配置陪伴。', en: 'We prioritize nonprofits; after review we send a code with setup guidance.' })}</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
