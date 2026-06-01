import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, CheckCircle2, Clock, Loader2, Mail, Phone, Send, Target, Wallet } from 'lucide-react';
import { Header } from './Header';
import { getYiyuPageAttrs, getYiyuSectionAttrs } from '../lib/yiyuTongSiteMap';
import { SITE_CONTACT_EMAIL, SITE_CONTACT_PHONE } from '../lib/siteMeta';
import { getSavedUserRaw } from '../lib/storage';
import { submitConsultRequest, type ConsultRequestInput } from '../lib/authApi';
import { useLang, type Bilingual } from '../lib/i18n';

interface ConsultApplyPageProps {
  onBack?: () => void;
}

type ConsultFormState = ConsultRequestInput;
type FieldGroup = 'contact' | 'diagnosis';

const EMPTY_FORM: ConsultFormState = {
  organization: '',
  name: '',
  role: '',
  phone: '',
  email: '',
  topic: '',
  background: '',
  constraints: '',
  commitment: '',
  notes: '',
};

interface FieldDef {
  key: keyof ConsultFormState;
  label: Bilingual;
  placeholder: Bilingual;
  group: FieldGroup;
  required?: boolean;
  rows?: number;
  type?: 'text' | 'email' | 'tel';
  hint?: Bilingual;
  /** 在两列网格中是否独占整行 */
  full?: boolean;
}

// 顺序即页面显示编号 1–10，不要随意调换（站内 AI 助手按 label 文本定位字段）。
const FIELD_META: FieldDef[] = [
  { key: 'organization', label: { zh: '贵组织名称', en: 'Organization name' }, placeholder: { zh: '请输入组织名称', en: 'Enter the organization name' }, required: true, group: 'contact', full: true },
  { key: 'name', label: { zh: '您的姓名', en: 'Your name' }, placeholder: { zh: '请输入姓名', en: 'Enter your name' }, required: true, group: 'contact' },
  { key: 'role', label: { zh: '您在组织中的角色', en: 'Your role in the organization' }, placeholder: { zh: '例如：项目主管 / 负责人', en: 'e.g. project lead / head' }, required: true, group: 'contact' },
  { key: 'phone', label: { zh: '您的手机号码', en: 'Your phone number' }, placeholder: { zh: '请输入手机号', en: 'Enter your phone number' }, required: true, type: 'tel', group: 'contact' },
  { key: 'email', label: { zh: '您的邮箱', en: 'Your email' }, placeholder: { zh: '请输入邮箱', en: 'Enter your email' }, required: true, type: 'email', group: 'contact' },
  {
    key: 'topic',
    label: { zh: '您希望我们帮助解决的组织核心问题是什么？', en: 'What core organizational problem do you want us to help solve?' },
    placeholder: { zh: '建议写清楚：发生了什么、影响是什么、最想改变的结果', en: 'Be specific: what happened, the impact, and the outcome you most want to change' },
    required: true,
    rows: 4,
    group: 'diagnosis',
  },
  {
    key: 'background',
    label: { zh: '对于这一核心问题，贵组织有哪些改变的尝试？', en: 'What has your organization already tried to address this core problem?' },
    placeholder: { zh: '建议写清楚：关键时间线、推动人或部门', en: 'Be specific: key timeline, who or which department drove it' },
    required: true,
    rows: 4,
    group: 'diagnosis',
  },
  {
    key: 'constraints',
    label: { zh: '您认为贵组织发展最大的阻力/约束是什么？', en: 'What do you see as the biggest obstacle / constraint to your growth?' },
    placeholder: { zh: '例如：资源、组织结构、共识、能力、现金流等，请具体描述', en: 'e.g. resources, structure, alignment, capability, cash flow — please be specific' },
    required: true,
    rows: 4,
    group: 'diagnosis',
  },
  {
    key: 'commitment',
    label: { zh: '贵组织可以投入什么？', en: 'What can your organization commit?' },
    placeholder: { zh: '例如：可投入时间、参与人、预算区间等', en: 'e.g. available time, participants, budget range' },
    required: true,
    rows: 4,
    group: 'diagnosis',
  },
  {
    key: 'notes',
    label: { zh: '其他背景补充', en: 'Additional background' },
    placeholder: { zh: '补充任何你觉得有助于我们理解组织现状的信息', en: 'Add anything that helps us understand your current situation' },
    rows: 4,
    group: 'diagnosis',
  },
];

// 编号映射（贯穿全表，匹配旧版 *1 … 10）
const FIELD_NUMBER = new Map(FIELD_META.map((field, index) => [field.key, index + 1] as const));

const EXPECTATIONS: { icon: typeof Target; title: Bilingual; desc: Bilingual }[] = [
  { icon: Target, title: { zh: '核心问题是什么', en: 'What is the core problem' }, desc: { zh: '一句话说清最想改变的结果', en: 'One sentence on the outcome you most want to change' } },
  { icon: Clock, title: { zh: '为什么现在必须解决', en: 'Why it must be solved now' }, desc: { zh: '什么在逼着这件事发生', en: 'What is forcing this to happen' } },
  { icon: Wallet, title: { zh: '愿意投入什么', en: 'What you can commit' }, desc: { zh: '时间、人、预算的大致区间', en: 'Rough range of time, people, and budget' } },
];

function loadPrefill(): Partial<ConsultFormState> {
  try {
    const raw = getSavedUserRaw();
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return {
      name: String(parsed?.nickname || '').trim(),
      phone: String(parsed?.phone || '').trim(),
      email: String(parsed?.email || '').trim(),
    };
  } catch {
    return {};
  }
}

const INPUT_CLASS =
  'w-full rounded-xl border border-border/70 bg-white px-4 py-3 text-sm text-foreground shadow-[0_1px_2px_rgba(22,38,94,0.04)] outline-none transition placeholder:text-muted-foreground/45 hover:border-primary/30 focus:border-primary/60 focus:ring-4 focus:ring-primary/10';

export function ConsultApplyPage({ onBack }: ConsultApplyPageProps) {
  const { t } = useLang();
  const [form, setForm] = useState<ConsultFormState>(() => ({ ...EMPTY_FORM, ...loadPrefill() }));
  const [submitting, setSubmitting] = useState(false);
  const [submittedId, setSubmittedId] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    const handleUserUpdate = () => {
      setForm((prev) => ({ ...prev, ...loadPrefill() }));
    };
    window.addEventListener('yiyu_user_updated', handleUserUpdate);
    return () => window.removeEventListener('yiyu_user_updated', handleUserUpdate);
  }, []);

  const missingRequired = useMemo(
    () =>
      FIELD_META.filter((field) => field.required && !String(form[field.key] || '').trim()).map((field) => t(field.label)),
    [form, t]
  );

  const filledRequired = useMemo(
    () => FIELD_META.filter((field) => field.required).length - missingRequired.length,
    [missingRequired]
  );
  const totalRequired = useMemo(() => FIELD_META.filter((field) => field.required).length, []);

  const handleChange = (key: keyof ConsultFormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;

    if (missingRequired.length > 0) {
      setMessage({ type: 'error', text: t({ zh: `请先补充：${missingRequired.join('、')}`, en: `Please complete: ${missingRequired.join(', ')}` }) });
      return;
    }

    setSubmitting(true);
    setMessage(null);
    try {
      const result = await submitConsultRequest(form);
      if (!result.ok || !result.data) {
        setMessage({ type: 'error', text: result.error || t({ zh: '提交失败，请稍后重试。', en: 'Submission failed, please try again later.' }) });
        return;
      }
      setSubmittedId(result.data.id);
      setMessage({ type: 'success', text: t({ zh: '咨询申请已提交，我们会尽快与您联系。', en: 'Your request has been submitted. We will contact you soon.' }) });
    } finally {
      setSubmitting(false);
    }
  };

  const renderField = (field: FieldDef) => {
    const value = form[field.key];
    const fieldId = `consult-${field.key}`;
    const number = FIELD_NUMBER.get(field.key);
    const commonProps = {
      id: fieldId,
      name: field.key,
      value,
      onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        handleChange(field.key, event.target.value),
      placeholder: t(field.placeholder),
      'data-yiyu-form-field': field.key,
      'data-yiyu-form-required': field.required ? 'true' : 'false',
      className: INPUT_CLASS,
    } as const;

    return (
      <div
        key={field.key}
        data-yiyu-field-wrapper={field.key}
        className={`space-y-2.5 ${field.full ? 'sm:col-span-2' : ''}`}
      >
        <label htmlFor={fieldId} className="flex items-start gap-2.5 text-sm font-medium text-foreground">
          <span
            aria-hidden
            className="mt-0.5 inline-flex h-5 min-w-[20px] items-center justify-center rounded-md bg-muted px-1 text-[11px] font-semibold tabular-nums text-primary/80"
          >
            {number}
          </span>
          <span className="leading-6">
            {t(field.label)}
            {field.required ? <span className="ml-1 align-middle text-rose-500" aria-hidden>·</span> : null}
            {!field.required ? <span className="ml-1.5 text-xs font-normal text-muted-foreground/55">{t({ zh: '选填', en: 'Optional' })}</span> : null}
          </span>
        </label>
        {field.rows ? (
          <textarea {...commonProps} rows={field.rows} className={`${commonProps.className} min-h-[116px] resize-y leading-7`} />
        ) : (
          <input {...commonProps} type={field.type || 'text'} />
        )}
        {field.hint ? <p className="pl-[30px] text-xs text-muted-foreground/60">{t(field.hint)}</p> : null}
      </div>
    );
  };

  const contactFields = FIELD_META.filter((field) => field.group === 'contact');
  const diagnosisFields = FIELD_META.filter((field) => field.group === 'diagnosis');

  return (
    <div {...getYiyuPageAttrs('consult-apply')} className="min-h-screen bg-background">
      <Header
        isLoggedIn={false}
        userType="visitor"
        onNavigate={(page) => {
          if (page === 'home') onBack?.();
        }}
      />

      <main className="relative pt-24 pb-24">
        {/* 冷蓝光晕背景，与全站 os 设计一致 */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[420px] bg-[radial-gradient(60%_100%_at_50%_0%,rgba(44,111,208,0.10),transparent_70%)]"
        />
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={() => onBack?.()}
            className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            {t({ zh: '返回首页', en: 'Back to home' })}
          </button>

          {/* ── Hero ───────────────────────────────────────────── */}
          <section
            {...getYiyuSectionAttrs('consult-apply', 'consult-apply-hero')}
            className="animate-fade-in-up overflow-hidden rounded-[28px] border border-border/50 bg-white/80 p-7 shadow-[0_20px_60px_-32px_rgba(22,38,94,0.28)] backdrop-blur-sm sm:p-10"
          >
            <span className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-muted/60 px-3 py-1 text-[11px] font-medium tracking-wide text-primary/75">
              <span className="h-1.5 w-1.5 rounded-full bg-secondary" />
              {t({ zh: '益语智库 · 组织陪伴', en: 'Yiyu Institute · Organizational Companionship' })}
            </span>
            <h1 className="mt-5 font-serif-display text-[30px] font-semibold leading-[1.15] tracking-tight text-foreground sm:text-[40px]">
              {t({ zh: '组织', en: 'Organizational ' })}<span className="text-ink-accent">{t({ zh: '诊断申请', en: 'Diagnosis Application' })}</span>
            </h1>
            <p className="mt-4 max-w-2xl text-[15px] leading-7 text-muted-foreground">
              {t({ zh: '我们主要关注贵组织想要解决什么问题、为什么现在必须解决、愿意投入什么，因此回答可以简洁，但请足够清晰。所有信息仅用于评估与联系，不会用于其他用途。', en: 'We focus on what problem your organization wants to solve, why it must be solved now, and what you can commit. Answers can be concise but should be clear. All information is used only for assessment and contact, nothing else.' })}
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-2.5">
              <a
                href={`tel:${SITE_CONTACT_PHONE}`}
                className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-white px-3.5 py-1.5 text-xs font-medium text-foreground/80 shadow-sm transition hover:border-primary/30 hover:text-foreground"
              >
                <Phone className="h-3.5 w-3.5 text-primary/70" />
                {SITE_CONTACT_PHONE}
              </a>
              <a
                href={`mailto:${SITE_CONTACT_EMAIL}`}
                className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-white px-3.5 py-1.5 text-xs font-medium text-foreground/80 shadow-sm transition hover:border-primary/30 hover:text-foreground"
              >
                <Mail className="h-3.5 w-3.5 text-primary/70" />
                {SITE_CONTACT_EMAIL}
              </a>
            </div>
          </section>

          {/* ── 预期条：我们只看三件事 ──────────────────────────── */}
          <section
            {...getYiyuSectionAttrs('consult-apply', 'consult-apply-expectations')}
            className="mt-4 grid gap-3 sm:grid-cols-3"
          >
            {EXPECTATIONS.map(({ icon: Icon, title, desc }) => (
              <div
                key={title.zh}
                className="flex items-start gap-3 rounded-2xl border border-border/50 bg-white/70 px-4 py-3.5 backdrop-blur-sm"
              >
                <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-muted text-primary">
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-foreground">{t(title)}</p>
                  <p className="mt-0.5 text-xs leading-5 text-muted-foreground/75">{t(desc)}</p>
                </div>
              </div>
            ))}
          </section>

          {/* ── 表单 ───────────────────────────────────────────── */}
          <section
            {...getYiyuSectionAttrs('consult-apply', 'consult-apply-form')}
            className="mt-4 rounded-[28px] border border-border/50 bg-white p-6 shadow-[0_20px_60px_-36px_rgba(22,38,94,0.22)] sm:p-9"
          >
            <form onSubmit={handleSubmit} className="space-y-10" data-yiyu-local-form="consult-request">
              {/* 组 A：联系方式 */}
              <div className="space-y-5">
                <SectionHeading step="01" title={t({ zh: '联系方式', en: 'Contact information' })} desc={t({ zh: '便于我们评估后与您取得联系', en: 'So we can reach you after our review' })} />
                <div className="grid gap-x-5 gap-y-5 sm:grid-cols-2">{contactFields.map(renderField)}</div>
              </div>

              <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />

              {/* 组 B：组织诊断 */}
              <div className="space-y-5">
                <SectionHeading step="02" title={t({ zh: '组织诊断', en: 'Organizational diagnosis' })} desc={t({ zh: '我们最看重这几个问题的真实回答', en: 'We value honest answers to these questions most' })} />
                <div className="space-y-6">{diagnosisFields.map(renderField)}</div>
              </div>

              {message ? (
                <div
                  {...getYiyuSectionAttrs('consult-apply', submittedId ? 'consult-apply-success' : 'consult-apply-form')}
                  data-yiyu-form-status={submittedId ? 'submitted' : message.type}
                  className={`rounded-2xl px-4 py-3.5 text-sm ${
                    message.type === 'success'
                      ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
                      : 'border border-rose-200 bg-rose-50 text-rose-700'
                  }`}
                >
                  {message.type === 'success' ? (
                    <span className="inline-flex items-center gap-2 font-medium">
                      <CheckCircle2 className="h-4 w-4" />
                      {message.text}
                    </span>
                  ) : (
                    message.text
                  )}
                  {submittedId ? <div className="mt-2 text-xs opacity-80">{t({ zh: '申请编号：', en: 'Application ID: ' })}{submittedId}</div> : null}
                </div>
              ) : null}

              {/* 提交区 */}
              <div
                {...getYiyuSectionAttrs('consult-apply', 'consult-apply-submit')}
                className="flex flex-col gap-4 border-t border-border/50 pt-6 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="space-y-1.5">
                  <p className="text-xs leading-6 text-muted-foreground/70">
                    {t({ zh: '已填写必填项 ', en: 'Required fields completed ' })}<span className="font-semibold text-foreground">{filledRequired}</span> / {totalRequired}
                    {t({ zh: '　·　提交后会进入后台「咨询申请」模块统一查看与跟进', en: '　·　After submission, it enters the backend "Consult Requests" module for review and follow-up' })}
                  </p>
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  data-yiyu-consult-submit="true"
                  className="inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl bg-primary px-7 py-3 text-sm font-medium text-primary-foreground shadow-[0_10px_30px_-10px_rgba(22,38,94,0.6)] transition hover:bg-primary/90 hover:shadow-[0_14px_34px_-10px_rgba(22,38,94,0.7)] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  {submitting ? t({ zh: '正在提交...', en: 'Submitting...' }) : t({ zh: '提交申请', en: 'Submit application' })}
                </button>
              </div>
            </form>
          </section>
        </div>
      </main>
    </div>
  );
}

function SectionHeading({ step, title, desc }: { step: string; title: string; desc: string }) {
  return (
    <div className="flex items-baseline gap-3">
      <span className="font-serif-display text-lg font-semibold tabular-nums text-primary/30">{step}</span>
      <div>
        <h2 className="font-serif-display text-lg font-semibold tracking-tight text-foreground">{title}</h2>
        <p className="mt-0.5 text-xs text-muted-foreground/70">{desc}</p>
      </div>
    </div>
  );
}
