import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, CheckCircle2, Loader2, Send } from 'lucide-react';
import { Header } from './Header';
import { getYiyuPageAttrs, getYiyuSectionAttrs } from '../lib/yiyuTongSiteMap';
import { SITE_CONTACT_EMAIL, SITE_CONTACT_PHONE } from '../lib/siteMeta';
import { getSavedUserRaw } from '../lib/storage';
import { submitConsultRequest, type ConsultRequestInput } from '../lib/authApi';

interface ConsultApplyPageProps {
  onBack?: () => void;
}

type ConsultFormState = ConsultRequestInput;

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

const FIELD_META: Array<{
  key: keyof ConsultFormState;
  label: string;
  placeholder: string;
  required?: boolean;
  rows?: number;
  type?: 'text' | 'email' | 'tel';
  hint?: string;
}> = [
  { key: 'organization', label: '贵组织名称', placeholder: '请输入组织名称', required: true },
  { key: 'name', label: '您的姓名', placeholder: '请输入姓名', required: true },
  { key: 'role', label: '您在组织中的角色', placeholder: '例如：项目主管 / 负责人', required: true },
  { key: 'phone', label: '您的手机号码', placeholder: '请输入手机号', required: true, type: 'tel' },
  { key: 'email', label: '您的邮箱', placeholder: '请输入邮箱', required: true, type: 'email' },
  {
    key: 'topic',
    label: '您希望我们帮助解决的组织核心问题是什么？',
    placeholder: '建议写清楚：发生了什么、影响是什么、最想改变的结果',
    required: true,
    rows: 4,
  },
  {
    key: 'background',
    label: '对于这一核心问题，贵组织有哪些改变的尝试？',
    placeholder: '建议写清楚：关键时间线、推动人或部门',
    required: true,
    rows: 4,
  },
  {
    key: 'constraints',
    label: '您认为贵组织发展最大的阻力/约束是什么？',
    placeholder: '例如：资源、组织结构、共识、能力、现金流等，请具体描述',
    required: true,
    rows: 4,
  },
  {
    key: 'commitment',
    label: '贵组织可以投入什么？',
    placeholder: '例如：可投入时间、参与人、预算区间等',
    required: true,
    rows: 4,
  },
  {
    key: 'notes',
    label: '其他背景补充',
    placeholder: '补充任何你觉得有助于我们理解组织现状的信息',
    rows: 4,
  },
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

export function ConsultApplyPage({ onBack }: ConsultApplyPageProps) {
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
      FIELD_META.filter((field) => field.required && !String(form[field.key] || '').trim()).map((field) => field.label),
    [form]
  );

  const handleChange = (key: keyof ConsultFormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;

    if (missingRequired.length > 0) {
      setMessage({ type: 'error', text: `请先补充：${missingRequired.join('、')}` });
      return;
    }

    setSubmitting(true);
    setMessage(null);
    try {
      const result = await submitConsultRequest(form);
      if (!result.ok || !result.data) {
        setMessage({ type: 'error', text: result.error || '提交失败，请稍后重试。' });
        return;
      }
      setSubmittedId(result.data.id);
      setMessage({ type: 'success', text: '咨询申请已提交，我们会尽快与您联系。' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div {...getYiyuPageAttrs('consult-apply')} className="min-h-screen bg-background">
      <Header
        isLoggedIn={false}
        userType="visitor"
        onNavigate={(page) => {
          if (page === 'home') onBack?.();
        }}
      />

      <main className="pt-24 pb-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={() => onBack?.()}
            className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            返回首页
          </button>

          <section
            {...getYiyuSectionAttrs('consult-apply', 'consult-apply-hero')}
            className="rounded-[32px] border border-border/40 bg-[radial-gradient(circle_at_top,_rgba(78,99,220,0.10),_transparent_55%),linear-gradient(180deg,rgba(248,250,255,0.96),rgba(241,246,255,0.84))] p-6 shadow-sm backdrop-blur-sm sm:p-8"
          >
            <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">益语智库-组织诊断申请表</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground/80">
              我们主要关注贵组织想要解决什么问题、为什么现在必须解决、愿意投入什么，因此回答可以简洁但足够清晰。
              所有信息仅用于评估与联系，不会用于其他用途。
            </p>
            <p className="mt-3 text-xs leading-6 text-muted-foreground/65">
              如需直接联系，也可以拨打 {SITE_CONTACT_PHONE} 或发送邮件至 {SITE_CONTACT_EMAIL}。
            </p>
          </section>

          <section
            {...getYiyuSectionAttrs('consult-apply', 'consult-apply-form')}
            className="mt-6 rounded-[32px] border border-border/40 bg-white/90 p-6 shadow-sm backdrop-blur-sm sm:p-8"
          >
            <form onSubmit={handleSubmit} className="space-y-8" data-yiyu-local-form="consult-request">
              {FIELD_META.map((field, index) => {
                const value = form[field.key];
                const fieldId = `consult-${field.key}`;
                const commonProps = {
                  id: fieldId,
                  name: field.key,
                  value,
                  onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
                    handleChange(field.key, event.target.value),
                  placeholder: field.placeholder,
                  'data-yiyu-form-field': field.key,
                  'data-yiyu-form-required': field.required ? 'true' : 'false',
                  className:
                    'w-full rounded-2xl border border-border/60 bg-white px-4 py-3 text-sm text-foreground shadow-sm outline-none transition focus:border-primary/50 focus:ring-4 focus:ring-primary/10',
                } as const;

                return (
                  <div
                    key={field.key}
                    data-yiyu-field-wrapper={field.key}
                    className="space-y-3"
                  >
                    <label htmlFor={fieldId} className="block text-sm font-medium text-foreground">
                      <span className="mr-2 text-primary/90">{field.required ? `*${index + 1}` : `${index + 1}`}</span>
                      {field.label}
                    </label>
                    {field.rows ? (
                      <textarea
                        {...commonProps}
                        rows={field.rows}
                        className={`${commonProps.className} min-h-[112px] resize-y`}
                      />
                    ) : (
                      <input {...commonProps} type={field.type || 'text'} />
                    )}
                    {field.hint ? <p className="text-xs text-muted-foreground/60">{field.hint}</p> : null}
                  </div>
                );
              })}

              {message ? (
                <div
                  {...getYiyuSectionAttrs('consult-apply', submittedId ? 'consult-apply-success' : 'consult-apply-form')}
                  data-yiyu-form-status={submittedId ? 'submitted' : message.type}
                  className={`rounded-2xl px-4 py-3 text-sm ${
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
                  {submittedId ? <div className="mt-2 text-xs opacity-80">申请编号：{submittedId}</div> : null}
                </div>
              ) : null}

              <div
                {...getYiyuSectionAttrs('consult-apply', 'consult-apply-submit')}
                className="flex flex-col items-start gap-3"
              >
                <button
                  type="submit"
                  disabled={submitting}
                  data-yiyu-consult-submit="true"
                  className="inline-flex items-center gap-2 rounded-2xl bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  {submitting ? '正在提交...' : '提交申请'}
                </button>
                <p className="text-xs leading-6 text-muted-foreground/60">
                  当前表单已接入官网站内正式链路。提交后会进入后台「咨询申请」模块统一查看与跟进。
                </p>
              </div>
            </form>
          </section>
        </div>
      </main>
    </div>
  );
}
