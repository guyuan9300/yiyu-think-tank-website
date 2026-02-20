import { useMemo, useState } from 'react';
import { ArrowLeft, CheckCircle2, ChevronRight, ExternalLink, FileText, Lock, Sparkles } from 'lucide-react';
import { Header } from './Header';
import { saveConsultRequest, type ConsultRequest } from '../lib/dataService';

interface ConsultApplyPageProps {
  onBack?: () => void;
}

type StepId = 'intro' | 'contact' | 'problem' | 'context' | 'commitment' | 'submit' | 'done';

export function ConsultApplyPage({ onBack }: ConsultApplyPageProps) {
  const [step, setStep] = useState<StepId>('intro');
  const [submitting, setSubmitting] = useState(false);
  const [submittedId, setSubmittedId] = useState<string | null>(null);

  // Preferred: Feishu form (configured via Vite env). Keep in-app form as fallback.
  const feishuFormUrl = (import.meta as any).env?.VITE_FEISHU_FORM_URL as string | undefined;

  // mailto href is derived from current form + submitted id (computed after form state init)

  const [form, setForm] = useState({
    name: '',
    organization: '',
    role: '',
    email: '',
    wechat: '',
    phone: '',
    topic: '',
    background: '',
    goals: '',
    constraints: '',
    commitment: '',
    notes: '',
  });

  const mailtoHref = useMemo(() => {
    const to = 'hello@yiyu.ink';
    const subject = `【战略咨询申请】${form.name || '未署名'}${submittedId ? ` (${submittedId})` : ''}`;
    const lines = [
      `申请编号：${submittedId || '（未生成）'}`,
      `称呼：${form.name || '—'}`,
      `机构：${form.organization || '—'}`,
      `角色：${form.role || '—'}`,
      `邮箱：${form.email || '—'}`,
      `微信：${form.wechat || '—'}`,
      `手机：${form.phone || '—'}`,
      '',
      '核心问题：',
      form.topic || '—',
      '',
      '背景：',
      form.background || '—',
      '',
      '目标：',
      form.goals || '—',
      '',
      '约束：',
      form.constraints || '—',
      '',
      '投入/匹配：',
      form.commitment || '—',
      '',
      '补充：',
      form.notes || '—',
    ];
    const body = lines.join('\n');
    return `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }, [form, submittedId]);

  const steps = useMemo(() => ([
    { id: 'intro' as const, title: '申请说明' },
    { id: 'contact' as const, title: '联系方式' },
    { id: 'problem' as const, title: '核心问题' },
    { id: 'context' as const, title: '背景与目标' },
    { id: 'commitment' as const, title: '投入与匹配' },
    { id: 'submit' as const, title: '提交确认' },
  ]), []);

  const currentIndex = steps.findIndex(s => s.id === step);

  const goNext = () => {
    const idx = steps.findIndex(s => s.id === step);
    const next = steps[idx + 1]?.id;
    if (next) setStep(next);
  };

  const goPrev = () => {
    const idx = steps.findIndex(s => s.id === step);
    const prev = steps[idx - 1]?.id;
    if (prev) setStep(prev);
    else setStep('intro');
  };

  const validate = (): { ok: boolean; message?: string } => {
    if (!form.name.trim()) return { ok: false, message: '请填写姓名/称呼' };
    if (!form.topic.trim() || form.topic.trim().length < 15) return { ok: false, message: '“核心问题”请至少填写 15 个字，用于我们判断是否适配' };
    // Email or WeChat or Phone at least one
    const hasContact = Boolean(form.email.trim() || form.wechat.trim() || form.phone.trim());
    if (!hasContact) return { ok: false, message: '请至少填写一种联系方式（邮箱/微信/手机号）' };
    return { ok: true };
  };

  const submit = async () => {
    const v = validate();
    if (!v.ok) {
      alert(v.message);
      return;
    }

    setSubmitting(true);
    try {
      const payload: Omit<ConsultRequest, 'id' | 'createdAt'> = {
        name: form.name.trim(),
        organization: form.organization.trim() || undefined,
        role: form.role.trim() || undefined,
        email: form.email.trim() || undefined,
        wechat: form.wechat.trim() || undefined,
        phone: form.phone.trim() || undefined,
        topic: form.topic.trim(),
        background: form.background.trim() || undefined,
        goals: form.goals.trim() || undefined,
        constraints: form.constraints.trim() || undefined,
        commitment: form.commitment.trim() || undefined,
        notes: form.notes.trim() || undefined,
        status: 'new',
      };

      const saved = saveConsultRequest(payload);
      setSubmittedId(saved.id);

      // Add a lightweight, user-visible landing marker in URL so users can
      // bookmark/share a “submitted” state, and so E2E can assert the closed loop.
      try {
        const url = new URL(window.location.href);
        url.searchParams.set('submitted', '1');
        url.searchParams.set('rid', saved.id);
        window.history.replaceState({}, '', url.toString());
      } catch {
        // ignore
      }

      setStep('done');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header
        isLoggedIn={false}
        userType="visitor"
        onNavigate={(page) => {
          if (page === 'home') onBack?.();
        }}
      />

      <main className="pt-20 pb-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <button
            onClick={() => (step === 'intro' ? onBack?.() : goPrev())}
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm font-medium">返回</span>
          </button>

          <div className="p-6 sm:p-8 rounded-3xl border border-border/40 bg-white/80 backdrop-blur-sm shadow-sm">
            <div className="flex items-start justify-between gap-6 mb-6">
              <div>
                <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">申请战略咨询</h1>
                <p className="text-sm text-muted-foreground/70 mt-2">
                  这是一个“申请制”入口：表单会稍微复杂一些，用来确保我们双方都不浪费时间。
                </p>
              </div>
              <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground/70">
                <Lock className="w-4 h-4" />
                <span>信息仅用于评估与联系</span>
              </div>
            </div>

            {/* Progress */}
            {step !== 'done' && (
              <div className="mb-8">
                <div className="flex items-center gap-3 overflow-x-auto pb-2">
                  {steps.map((s, idx) => {
                    const active = s.id === step;
                    const done = currentIndex > idx;
                    return (
                      <div key={s.id} className="flex items-center gap-3 flex-shrink-0">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold border ${done ? 'bg-primary text-primary-foreground border-primary' : active ? 'border-primary text-primary' : 'border-border/60 text-muted-foreground/60'}`}>
                          {done ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                        </div>
                        <div className={`text-xs ${active ? 'text-foreground' : 'text-muted-foreground/70'}`}>{s.title}</div>
                        {idx < steps.length - 1 && <ChevronRight className="w-4 h-4 text-muted-foreground/30" />}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Step content */}
            {step === 'intro' && (
              <div className="space-y-4">
                <div className="p-5 rounded-2xl bg-primary/5 border border-primary/15">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                      <ExternalLink className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium mb-1">推荐：通过飞书表单提交（更快）</h3>
                      <p className="text-sm text-muted-foreground/80 leading-relaxed">
                        为了让申请“有落点、可追踪”，我们优先使用飞书表单收集信息。提交后会提示你下一步。
                      </p>
                      <div className="mt-3 flex flex-col sm:flex-row gap-3">
                        {feishuFormUrl ? (
                          <a
                            href={feishuFormUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition"
                          >
                            打开飞书表单
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        ) : (
                          <div className="p-3 rounded-2xl bg-muted/20 border border-border/30 text-sm text-muted-foreground/80">
                            飞书表单链接尚未配置。你仍可先使用本页的备用表单提交（或稍后补链接）。
                          </div>
                        )}
                        <button
                          onClick={goNext}
                          className="px-5 py-3 rounded-2xl border border-border/60 hover:border-primary/40 hover:bg-primary/5 transition text-sm font-medium"
                        >
                          使用备用表单
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-muted/20 border border-border/30">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-medium mb-1">我们会如何处理你的申请？</h3>
                      <ul className="text-sm text-muted-foreground/80 leading-relaxed list-disc pl-5 space-y-1">
                        <li>阅读你的“核心问题”与背景信息，判断是否适配</li>
                        <li>如适配，我们会在约定时间内联系你进行初次沟通</li>
                        <li>如暂不适配，也会给到简要建议/推荐内容（视情况）</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-blue-50/70 border border-blue-100">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-medium mb-1">填写提示</h3>
                      <p className="text-sm text-blue-900/80 leading-relaxed">
                        表单的关键不是“填得多”，而是“讲清楚”：你要解决什么问题、为什么现在必须解决、你愿意投入什么。
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {step === 'contact' && (
              <div className="space-y-5">
                <div className="grid sm:grid-cols-2 gap-4">
                  <Field label="姓名/称呼" required>
                    <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="怎么称呼你" />
                  </Field>
                  <Field label="机构/组织">
                    <input className="input" value={form.organization} onChange={(e) => setForm({ ...form, organization: e.target.value })} placeholder="可选" />
                  </Field>
                  <Field label="你的角色">
                    <input className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} placeholder="例如：创始人/COO/项目负责人" />
                  </Field>
                  <Field label="邮箱">
                    <input className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="用于接收后续材料/开票（如后续购买）" />
                  </Field>
                  <Field label="微信">
                    <input className="input" value={form.wechat} onChange={(e) => setForm({ ...form, wechat: e.target.value })} placeholder="可选" />
                  </Field>
                  <Field label="手机号">
                    <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="可选" />
                  </Field>
                </div>

                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground/70">至少填写一种联系方式（邮箱/微信/手机号）。</p>
                  <button onClick={goNext} className="px-6 py-3 rounded-2xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition">
                    下一步
                  </button>
                </div>
              </div>
            )}

            {step === 'problem' && (
              <div className="space-y-5">
                <Field label="你希望我们帮助解决的“核心问题”是什么？" required hint="建议写清楚：发生了什么、影响是什么、你最想改变的结果。">
                  <textarea className="input min-h-[120px]" value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} placeholder="至少 15 个字" />
                </Field>

                <div className="flex justify-end">
                  <button onClick={goNext} className="px-6 py-3 rounded-2xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition">
                    下一步
                  </button>
                </div>
              </div>
            )}

            {step === 'context' && (
              <div className="space-y-5">
                <Field label="背景补充" hint="可选：关键时间线/组织现状/已有尝试">
                  <textarea className="input min-h-[100px]" value={form.background} onChange={(e) => setForm({ ...form, background: e.target.value })} placeholder="可选" />
                </Field>
                <Field label="未来 3 个月最想实现的目标" hint="越具体越好（可量化最好）">
                  <textarea className="input min-h-[90px]" value={form.goals} onChange={(e) => setForm({ ...form, goals: e.target.value })} placeholder="可选" />
                </Field>
                <Field label="最大的阻力/约束是什么？" hint="例如：资源、组织结构、共识、能力、现金流等">
                  <textarea className="input min-h-[90px]" value={form.constraints} onChange={(e) => setForm({ ...form, constraints: e.target.value })} placeholder="可选" />
                </Field>

                <div className="flex justify-end">
                  <button onClick={goNext} className="px-6 py-3 rounded-2xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition">
                    下一步
                  </button>
                </div>
              </div>
            )}

            {step === 'commitment' && (
              <div className="space-y-5">
                <Field label="你愿意投入什么？" hint="例如：每周可投入时长、参与人、预算区间等（越明确越好）">
                  <textarea className="input min-h-[100px]" value={form.commitment} onChange={(e) => setForm({ ...form, commitment: e.target.value })} placeholder="可选" />
                </Field>
                <Field label="其他补充（可选）">
                  <textarea className="input min-h-[90px]" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="可选" />
                </Field>

                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground/70">下一步我们会让你确认后提交。</p>
                  <button onClick={goNext} className="px-6 py-3 rounded-2xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition">
                    下一步
                  </button>
                </div>
              </div>
            )}

            {step === 'submit' && (
              <div className="space-y-6">
                <div className="p-5 rounded-2xl bg-muted/20 border border-border/30 text-sm text-muted-foreground/80">
                  <div className="font-medium text-foreground mb-2">提交前确认</div>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>我们会按“适配度与投入意愿”优先处理申请</li>
                    <li>你的信息仅用于评估与联系，不会对外公开</li>
                  </ul>
                </div>

                <div className="grid sm:grid-cols-2 gap-4 text-sm">
                  <Preview label="称呼" value={form.name || '—'} />
                  <Preview label="机构" value={form.organization || '—'} />
                  <Preview label="角色" value={form.role || '—'} />
                  <Preview label="联系方式" value={(form.email || form.wechat || form.phone) ? [form.email && `邮箱：${form.email}`, form.wechat && `微信：${form.wechat}`, form.phone && `手机：${form.phone}`].filter(Boolean).join(' / ') : '—'} />
                </div>

                <Preview label="核心问题" value={form.topic || '—'} multiline />

                <div className="flex justify-end gap-3">
                  <button onClick={goPrev} className="px-6 py-3 rounded-2xl border border-border/60 hover:bg-muted/20 transition">
                    返回修改
                  </button>
                  <button
                    onClick={submit}
                    disabled={submitting}
                    className="px-6 py-3 rounded-2xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition disabled:opacity-60"
                  >
                    {submitting ? '提交中…' : '确认提交'}
                  </button>
                </div>
              </div>
            )}

            {step === 'done' && (
              <div className="text-center py-10">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-green-100 text-green-700 flex items-center justify-center mb-4">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <h2 className="text-xl font-semibold mb-2">已提交，我们会尽快处理</h2>
                <p className="text-sm text-muted-foreground/70 mb-4">
                  {submittedId ? `你的申请编号：${submittedId}` : '你的申请已记录。'}
                </p>

                <div className="max-w-xl mx-auto text-left p-5 rounded-2xl bg-muted/20 border border-border/30 mb-6">
                  <div className="text-sm font-medium mb-2">下一步（确保有落点）</div>
                  <ul className="text-sm text-muted-foreground/80 leading-relaxed list-disc pl-5 space-y-1">
                    <li>我们会在 1 个工作日内通过你提供的联系方式联系你</li>
                    <li>
                      如果你希望“提交后立刻可追踪”：
                      {feishuFormUrl ? (
                        <a href={feishuFormUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline ml-1">
                          打开飞书表单
                        </a>
                      ) : (
                        <a href={mailtoHref} className="text-primary hover:underline ml-1">
                          发送邮件给我们
                        </a>
                      )}
                    </li>
                    <li className="text-xs text-muted-foreground/60">提示：当前“备用表单”会在本地设备保存一份记录（用于演示/联调）。</li>
                  </ul>
                </div>

                <div className="flex flex-col sm:flex-row justify-center gap-3">
                  <a
                    href={mailtoHref}
                    className="px-6 py-3 rounded-2xl border border-border/60 hover:border-primary/40 hover:bg-primary/5 transition text-sm font-medium"
                  >
                    发送邮件（备选落点）
                  </a>
                  <button onClick={onBack} className="px-6 py-3 rounded-2xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition">
                    返回首页
                  </button>
                </div>
              </div>
            )}

            {/* Footer nav */}
            {step !== 'intro' && step !== 'done' && step !== 'submit' && (
              <div className="mt-8 flex items-center justify-between">
                <button onClick={goPrev} className="text-sm text-muted-foreground hover:text-foreground transition">
                  上一步
                </button>
                <button onClick={goNext} className="text-sm text-primary hover:text-primary/80 transition">
                  下一步
                </button>
              </div>
            )}
          </div>
        </div>
      </main>

      <style>{`
        .input{width:100%;border-radius:16px;border:1px solid rgba(0,0,0,0.08);background:rgba(255,255,255,0.9);padding:12px 14px;font-size:14px;outline:none;transition:box-shadow .15s,border-color .15s;}
        .input:focus{border-color:rgba(124,58,237,0.45);box-shadow:0 0 0 4px rgba(124,58,237,0.12)}
      `}</style>
    </div>
  );
}

function Field({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="text-sm font-medium text-foreground">
          {label} {required && <span className="text-red-500">*</span>}
        </div>
      </div>
      {hint && <div className="text-xs text-muted-foreground/70">{hint}</div>}
      {children}
    </div>
  );
}

function Preview({ label, value, multiline }: { label: string; value: string; multiline?: boolean }) {
  return (
    <div className="p-4 rounded-2xl bg-white/70 border border-border/40">
      <div className="text-xs text-muted-foreground/60 mb-1">{label}</div>
      <div className={`text-sm text-foreground ${multiline ? 'whitespace-pre-wrap leading-relaxed' : ''}`}>{value}</div>
    </div>
  );
}
