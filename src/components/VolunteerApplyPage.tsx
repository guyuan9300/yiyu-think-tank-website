import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowLeft, CheckCircle2, Loader2, Send } from 'lucide-react';
import { Footer } from './Footer';
import { Header } from './Header';
import {
  VOLUNTEER_INTEREST_OPTIONS,
  VOLUNTEER_ROLE_OPTIONS,
  VOLUNTEER_SKILL_OPTIONS,
  clearVolunteerApplicationDraft,
  loadVolunteerApplicationDraft,
  saveVolunteerApplicationDraft,
  submitVolunteerApplication,
  type ContributionLayer,
  type VolunteerApplicationForm,
} from '../lib/coBuild';

interface VolunteerApplyPageProps {
  onNavigate?: (page: string, id?: string) => void;
}

const STEP_DRAFT_KEY = 'yiyu_open_source_volunteer_step_v2';
const STEPS = ['你想解放哪类工作', '你能贡献什么能力', '你想从多大任务开始'] as const;

const START_TASK_OPTIONS = [
  '1 小时小任务',
  '半天任务',
  '一周任务',
  '长期维护任务',
  '参与真实组织访谈',
  '帮组织做试用反馈',
] as const;

const EMPTY_FORM: VolunteerApplicationForm = {
  nickname: '',
  contactInfo: '',
  githubUrl: '',
  giteeUrl: '',
  city: '',
  volunteerRoles: [],
  skills: [],
  weeklyCommitment: '',
  interests: [],
  interviewWillingness: '',
  longTermWillingness: '',
  intro: '',
  contributionLayers: [],
  preferredTaskStart: '',
};

const WORK_TO_FREE_OPTIONS: Array<{ label: string; layers: ContributionLayer[] }> = [
  { label: '活动和志愿者管理', layers: ['scenario_application', 'testing_validation'] },
  { label: '项目复盘和月报', layers: ['metric_computation', 'documentation_training'] },
  { label: '素材整理和知识库', layers: ['data_ingestion', 'documentation_training'] },
  { label: '客户和伙伴关系', layers: ['data_modeling', 'scenario_application'] },
  { label: '流程模板和日历协作', layers: ['data_modeling', 'workbench_component'] },
  { label: '公益痕迹管理', layers: ['data_ingestion', 'metric_computation'] },
  { label: 'AI 总结和报告生成', layers: ['metric_computation', 'scenario_application'] },
  { label: '开源基础设施', layers: ['deployment_support', 'workbench_component'] },
];

function getVolunteerPrefillFromQuery(): Partial<VolunteerApplicationForm> {
  if (typeof window === 'undefined') return {};
  const params = new URLSearchParams(window.location.search);
  const role = params.get('role') || '';

  const rolePreset: Record<string, Partial<VolunteerApplicationForm>> = {
    developer: { volunteerRoles: ['前端', '后端'], contributionLayers: ['workbench_component', 'scenario_application'] },
    product_volunteer: { volunteerRoles: ['产品'], contributionLayers: ['data_modeling'] },
    designer: { volunteerRoles: ['设计'], contributionLayers: ['workbench_component'] },
    tester: { volunteerRoles: ['测试'], contributionLayers: ['testing_validation'] },
    writer: { volunteerRoles: ['文档'], contributionLayers: ['documentation_training'] },
    implementer: { volunteerRoles: ['部署', '实施'], contributionLayers: ['deployment_support'] },
    beginner_volunteer: { preferredTaskStart: '1 小时小任务', contributionLayers: ['documentation_training'] },
  };

  return rolePreset[role] || {};
}

function mergeFormWithDraft(draft: VolunteerApplicationForm | null): VolunteerApplicationForm {
  if (!draft) return EMPTY_FORM;
  return {
    ...EMPTY_FORM,
    ...draft,
    volunteerRoles: Array.isArray(draft.volunteerRoles) ? draft.volunteerRoles : [],
    skills: Array.isArray(draft.skills) ? draft.skills : [],
    interests: Array.isArray(draft.interests) ? draft.interests : [],
    contributionLayers: Array.isArray(draft.contributionLayers) ? draft.contributionLayers : [],
  };
}

function toggleValue(list: string[], value: string) {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

function loadStepDraft() {
  try {
    const raw = localStorage.getItem(STEP_DRAFT_KEY);
    if (!raw) return 0;
    const value = Number(raw);
    if (!Number.isFinite(value) || value < 0 || value > 2) return 0;
    return value;
  } catch {
    return 0;
  }
}

function saveStepDraft(step: number) {
  try {
    localStorage.setItem(STEP_DRAFT_KEY, String(step));
  } catch {
    // ignore
  }
}

function clearStepDraft() {
  try {
    localStorage.removeItem(STEP_DRAFT_KEY);
  } catch {
    // ignore
  }
}

function ChoiceChip({
  selected,
  label,
  onClick,
}: {
  selected: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
        selected
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-border bg-white text-muted-foreground hover:border-primary/40 hover:text-foreground'
      }`}
    >
      {label}
    </button>
  );
}

function FieldLabel({ label, required = false }: { label: string; required?: boolean }) {
  return (
    <label className="mb-2 block text-sm font-medium text-foreground">
      {required ? <span className="mr-1 text-primary">*</span> : null}
      {label}
    </label>
  );
}

function TextInput({
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className="w-full rounded-2xl border border-border/50 bg-white px-4 py-3 text-sm text-foreground shadow-sm outline-none transition focus:border-primary/50 focus:ring-4 focus:ring-primary/10"
    />
  );
}

function TextArea({
  value,
  onChange,
  placeholder,
  rows = 4,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  rows?: number;
}) {
  return (
    <textarea
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full rounded-2xl border border-border/50 bg-white px-4 py-3 text-sm text-foreground shadow-sm outline-none transition focus:border-primary/50 focus:ring-4 focus:ring-primary/10"
    />
  );
}

function getStepMissing(step: number, form: VolunteerApplicationForm) {
  const checks: Record<number, Array<[boolean, string]>> = {
    0: [[(form.contributionLayers || []).length === 0, '贡献层级']],
    1: [
      [form.volunteerRoles.length === 0, '可参与角色'],
      [form.skills.length === 0, '熟悉技能'],
      [form.interests.length === 0, '感兴趣方向'],
      [!form.weeklyCommitment.trim(), '每周可投入时间'],
    ],
    2: [
      [!form.preferredTaskStart?.trim(), '起步任务类型'],
      [!form.nickname.trim(), '姓名 / 昵称'],
      [!form.contactInfo.trim(), '联系方式'],
    ],
  };

  return (checks[step] || []).filter(([missing]) => missing).map(([, label]) => label);
}

export function VolunteerApplyPage({ onNavigate }: VolunteerApplyPageProps) {
  const [form, setForm] = useState<VolunteerApplicationForm>(() => {
    const draft = mergeFormWithDraft(loadVolunteerApplicationDraft());
    const prefill = getVolunteerPrefillFromQuery();
    return {
      ...draft,
      volunteerRoles: prefill.volunteerRoles && prefill.volunteerRoles.length > 0 ? prefill.volunteerRoles : draft.volunteerRoles,
      contributionLayers:
        prefill.contributionLayers && prefill.contributionLayers.length > 0 ? prefill.contributionLayers : draft.contributionLayers,
      preferredTaskStart: prefill.preferredTaskStart || draft.preferredTaskStart,
    };
  });
  const [step, setStep] = useState(() => loadStepDraft());
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  useEffect(() => {
    saveVolunteerApplicationDraft(form);
    saveStepDraft(step);
  }, [form, step]);

  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!hasUnsavedChanges || submitted) return;
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [hasUnsavedChanges, submitted]);

  const progress = ((step + 1) / STEPS.length) * 100;
  const missing = useMemo(() => getStepMissing(step, form), [form, step]);

  const onFieldChange = <K extends keyof VolunteerApplicationForm>(key: K, value: VolunteerApplicationForm[K]) => {
    setHasUnsavedChanges(true);
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const safeNavigate = (page: string) => {
    if (hasUnsavedChanges && !submitted) {
      const ok = window.confirm('你有未提交的内容，确定离开当前页面吗？');
      if (!ok) return;
    }
    onNavigate?.(page);
  };

  const handlePrev = () => {
    setMessage(null);
    setStep((prev) => Math.max(0, prev - 1));
  };

  const handleNext = () => {
    if (missing.length > 0) {
      setMessage({ type: 'error', text: `请先补充：${missing.join('、')}` });
      return;
    }
    setMessage(null);
    setStep((prev) => Math.min(STEPS.length - 1, prev + 1));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;

    const fullMissing = [0, 1, 2].flatMap((index) => getStepMissing(index, form));
    if (fullMissing.length > 0) {
      setMessage({ type: 'error', text: `请先补充：${Array.from(new Set(fullMissing)).join('、')}` });
      return;
    }

    if (form.contactInfo.trim().length < 5) {
      setMessage({ type: 'error', text: '请填写有效联系方式，方便社区与你对接。' });
      return;
    }

    setSubmitting(true);
    setMessage(null);

    const result = await submitVolunteerApplication(form);

    setSubmitting(false);
    if (!result.ok) {
      setMessage({ type: 'error', text: result.error || '提交失败，请稍后重试。草稿已为你保留。' });
      return;
    }

    clearVolunteerApplicationDraft();
    clearStepDraft();
    setSubmitted(true);
    setHasUnsavedChanges(false);
    setMessage({ type: 'success', text: '报名成功，你可以立即进入共建议题池认领任务。' });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header onNavigate={onNavigate as any} />

      <main className="pb-16 pt-24 sm:pt-28">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={() => safeNavigate('open-source-workbench')}
            className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            返回数据操作系统入口页
          </button>

          <div className="mt-5 rounded-[28px] border border-border/40 bg-white/90 p-6 shadow-sm sm:p-8">
            <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">用你的专业能力，帮真实组织少走一点弯路</h1>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              参与开源共建，不只是写代码。你可以帮助组织梳理场景、设计流程、开发工作台、测试工具、写文档、做部署和试用反馈。
            </p>

            <div className="mt-6">
              <div className="mb-3 flex flex-wrap gap-2 text-xs">
                {STEPS.map((item, index) => (
                  <span
                    key={item}
                    className={`rounded-full border px-3 py-1 ${
                      index <= step
                        ? 'border-primary/30 bg-primary/10 text-primary'
                        : 'border-border/50 bg-background text-muted-foreground'
                    }`}
                  >
                    {index + 1}. {item}
                  </span>
                ))}
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-background">
                <div className="h-full bg-primary transition-all duration-300" style={{ width: `${progress}%` }} />
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-6">
            {step === 0 ? (
              <section className="rounded-[24px] border border-border/40 bg-white/90 p-5 sm:p-6">
                <h2 className="text-base font-semibold text-foreground">1. 你想解放哪类工作？</h2>
                <div className="mt-4 space-y-4">
                  <div>
                    <FieldLabel label="优先想帮助的方向" required />
                    <div className="flex flex-wrap gap-2">
                      {WORK_TO_FREE_OPTIONS.map((option) => (
                        <ChoiceChip
                          key={option.label}
                          label={option.label}
                          selected={option.layers.every((layer) => (form.contributionLayers || []).includes(layer))}
                          onClick={() => {
                            const current = new Set(form.contributionLayers || []);
                            const isSelected = option.layers.every((layer) => current.has(layer));
                            if (isSelected) {
                              option.layers.forEach((layer) => current.delete(layer));
                            } else {
                              option.layers.forEach((layer) => current.add(layer));
                            }
                            onFieldChange('contributionLayers', Array.from(current) as ContributionLayer[]);
                          }}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-border/50 bg-background px-4 py-3 text-sm leading-7 text-muted-foreground">
                    你可以同时选择多个方向，例如“活动和志愿者管理 + 文档培训”，系统会在共建议题池给你优先匹配任务。
                  </div>
                </div>
              </section>
            ) : null}

            {step === 1 ? (
              <section className="rounded-[24px] border border-border/40 bg-white/90 p-5 sm:p-6">
                <h2 className="text-base font-semibold text-foreground">2. 你能贡献什么能力？</h2>
                <div className="mt-4 space-y-5">
                  <div>
                    <FieldLabel label="可参与角色" required />
                    <div className="flex flex-wrap gap-2">
                      {VOLUNTEER_ROLE_OPTIONS.map((option) => (
                        <ChoiceChip
                          key={option}
                          label={option}
                          selected={form.volunteerRoles.includes(option)}
                          onClick={() => onFieldChange('volunteerRoles', toggleValue(form.volunteerRoles, option))}
                        />
                      ))}
                    </div>
                  </div>

                  <div>
                    <FieldLabel label="熟悉技能" required />
                    <div className="flex flex-wrap gap-2">
                      {VOLUNTEER_SKILL_OPTIONS.map((option) => (
                        <ChoiceChip
                          key={option}
                          label={option}
                          selected={form.skills.includes(option)}
                          onClick={() => onFieldChange('skills', toggleValue(form.skills, option))}
                        />
                      ))}
                    </div>
                  </div>

                  <div>
                    <FieldLabel label="感兴趣方向" required />
                    <div className="flex flex-wrap gap-2">
                      {VOLUNTEER_INTEREST_OPTIONS.map((option) => (
                        <ChoiceChip
                          key={option}
                          label={option}
                          selected={form.interests.includes(option)}
                          onClick={() => onFieldChange('interests', toggleValue(form.interests, option))}
                        />
                      ))}
                    </div>
                  </div>

                  <div>
                    <FieldLabel label="每周可投入时间" required />
                    <div className="flex flex-wrap gap-2">
                      {['1-3 小时', '3-5 小时', '5-8 小时', '8 小时以上'].map((option) => (
                        <ChoiceChip
                          key={option}
                          label={option}
                          selected={form.weeklyCommitment === option}
                          onClick={() => onFieldChange('weeklyCommitment', option)}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </section>
            ) : null}

            {step === 2 ? (
              <section className="rounded-[24px] border border-border/40 bg-white/90 p-5 sm:p-6">
                <h2 className="text-base font-semibold text-foreground">3. 你想从多大任务开始？</h2>
                <div className="mt-4 space-y-5">
                  <div>
                    <FieldLabel label="起步任务类型" required />
                    <div className="flex flex-wrap gap-2">
                      {START_TASK_OPTIONS.map((option) => (
                        <ChoiceChip
                          key={option}
                          label={option}
                          selected={form.preferredTaskStart === option}
                          onClick={() => onFieldChange('preferredTaskStart', option)}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <FieldLabel label="姓名 / 昵称" required />
                      <TextInput value={form.nickname} onChange={(value) => onFieldChange('nickname', value)} placeholder="例如：阿青" />
                    </div>
                    <div>
                      <FieldLabel label="联系方式" required />
                      <TextInput
                        value={form.contactInfo}
                        onChange={(value) => onFieldChange('contactInfo', value)}
                        placeholder="邮箱 / 微信 / 电话"
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <FieldLabel label="GitHub 链接" />
                      <TextInput
                        value={form.githubUrl}
                        onChange={(value) => onFieldChange('githubUrl', value)}
                        placeholder="https://github.com/..."
                      />
                    </div>
                    <div>
                      <FieldLabel label="Gitee 链接" />
                      <TextInput
                        value={form.giteeUrl}
                        onChange={(value) => onFieldChange('giteeUrl', value)}
                        placeholder="https://gitee.com/..."
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <FieldLabel label="是否愿意参与需求访谈" />
                      <div className="flex flex-wrap gap-2">
                        {['愿意', '暂时不方便'].map((option) => (
                          <ChoiceChip
                            key={option}
                            label={option}
                            selected={form.interviewWillingness === option}
                            onClick={() => onFieldChange('interviewWillingness', option)}
                          />
                        ))}
                      </div>
                    </div>
                    <div>
                      <FieldLabel label="是否愿意参与长期维护" />
                      <div className="flex flex-wrap gap-2">
                        {['愿意', '暂时不方便'].map((option) => (
                          <ChoiceChip
                            key={option}
                            label={option}
                            selected={form.longTermWillingness === option}
                            onClick={() => onFieldChange('longTermWillingness', option)}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  <div>
                    <FieldLabel label="所在城市" />
                    <TextInput value={form.city} onChange={(value) => onFieldChange('city', value)} placeholder="例如：杭州" />
                  </div>

                  <div>
                    <FieldLabel label="自我介绍" />
                    <TextArea
                      value={form.intro}
                      onChange={(value) => onFieldChange('intro', value)}
                      placeholder="可选：介绍你的经验背景和想参与的方向。"
                      rows={4}
                    />
                  </div>
                </div>
              </section>
            ) : null}

            {message ? (
              <div
                className={`rounded-2xl border px-4 py-3 text-sm ${
                  message.type === 'success'
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                    : 'border-rose-200 bg-rose-50 text-rose-700'
                }`}
              >
                {message.type === 'success' ? (
                  <span className="inline-flex items-center gap-2 font-medium">
                    <CheckCircle2 className="h-4 w-4" />
                    {message.text}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    {message.text}
                  </span>
                )}
              </div>
            ) : null}

            <div className="flex flex-wrap gap-3">
              {step > 0 ? (
                <button
                  type="button"
                  onClick={handlePrev}
                  className="rounded-2xl border border-border px-5 py-3 text-sm font-medium text-foreground hover:bg-muted"
                >
                  上一步
                </button>
              ) : null}

              {step < 2 ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="rounded-2xl bg-primary px-5 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                >
                  下一步
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  {submitting ? '正在提交...' : '提交参与路径'}
                </button>
              )}

              <button
                type="button"
                onClick={() => safeNavigate('demand-pool')}
                className="rounded-2xl border border-border px-5 py-3 text-sm font-medium text-foreground hover:bg-muted"
              >
                查看共建议题池
              </button>
            </div>
          </form>

          {submitted ? (
            <section className="mt-6 rounded-[24px] border border-emerald-200 bg-emerald-50 p-6">
              <h3 className="text-lg font-semibold text-emerald-900">下一步流程</h3>
              <p className="mt-2 text-sm leading-7 text-emerald-800">
                感谢你愿意把专业能力变成公共价值。你可以马上进入共建议题池选任务，也可以从小任务开始熟悉协作流程。
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => {
                    const params = new URLSearchParams({ page: 'demand-pool', effort: '1_hour' });
                    window.history.pushState({}, '', `${window.location.pathname}?${params.toString()}`);
                    window.dispatchEvent(new PopStateEvent('popstate'));
                  }}
                  className="rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
                >
                  查看 1 小时小任务
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate?.('demand-pool')}
                  className="rounded-2xl border border-emerald-300 px-4 py-2 text-sm font-medium text-emerald-900 hover:bg-emerald-100"
                >
                  查看共建议题池
                </button>
                <button
                  type="button"
                  onClick={() => window.open('https://github.com/guyuan9300/yiyu-thinktank-workbench', '_blank')}
                  className="rounded-2xl border border-emerald-300 px-4 py-2 text-sm font-medium text-emerald-900 hover:bg-emerald-100"
                >
                  阅读贡献指南
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate?.('demand-submit')}
                  className="rounded-2xl border border-emerald-300 px-4 py-2 text-sm font-medium text-emerald-900 hover:bg-emerald-100"
                >
                  加入试用反馈
                </button>
              </div>
            </section>
          ) : null}
        </div>
      </main>

      <Footer onNavigate={onNavigate as any} />
    </div>
  );
}
