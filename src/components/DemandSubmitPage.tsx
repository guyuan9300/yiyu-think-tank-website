import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowLeft, CheckCircle2, Loader2, Send } from 'lucide-react';
import { Footer } from './Footer';
import { Header } from './Header';
import {
  CURRENT_SOLUTION_OPTIONS,
  DEMAND_SCENARIO_OPTIONS,
  INDUSTRY_OPTIONS,
  INVOLVED_ROLE_OPTIONS,
  ORGANIZATION_TYPE_OPTIONS,
  ORG_SIZE_OPTIONS,
  clearOrganizationDemandDraft,
  loadOrganizationDemandDraft,
  saveOrganizationDemandDraft,
  submitOrganizationDemand,
  type OrganizationDemandForm,
} from '../lib/coBuild';

interface DemandSubmitPageProps {
  onNavigate?: (page: string, id?: string) => void;
}

const STEP_DRAFT_KEY = 'yiyu_open_source_demand_step_v2';
const STEPS = ['你的组织', '哪件事最消耗你们', '你希望留下什么', '谁会因此被解放'] as const;

const SCENE_WORK_TYPES = ['服务', '项目', '客户', '志愿者', '物资', '合同', '伙伴', '数据报告', '其他'] as const;

const EMPTY_FORM: OrganizationDemandForm = {
  organizationName: '',
  organizationType: '',
  city: '',
  industries: [],
  organizationSize: '',
  contactName: '',
  contactInfo: '',
  demandTitle: '',
  currentProblem: '',
  currentSolutions: [],
  currentSolutionsNote: '',
  expectedOutcome: '',
  involvedRoles: [],
  useFrequency: '',
  urgency: '',
  scenarioTags: [],
  publicDisplayMode: '',
  interviewWillingness: '',
  trialFeedbackWillingness: '',
  privacyConfirmed: false,
  sceneWorkType: '',
  dataCurrentState: '',
  dataUpdateCadence: '',
  dataLossPoints: '',
  repeatedDataWork: '',
  expectedMetrics: '',
  expectedAlerts: '',
  expectedReports: '',
  workbenchUsers: '',
  workbenchFirstLook: '',
  workbenchActions: '',
  actionFeedbackData: '',
};

function getPrefillFromQuery(): Partial<OrganizationDemandForm> {
  if (typeof window === 'undefined') return {};
  const params = new URLSearchParams(window.location.search);
  const role = params.get('role') || '';
  const scene = params.get('scene') || '';
  const pain = params.get('pain') || '';
  const goal = params.get('goal') || '';

  const roleToOrgType: Record<string, string> = {
    nonprofit: '公益组织',
    social_enterprise: '社会企业',
    sme: '中小企业',
    funder: '社区组织',
  };

  return {
    organizationType: roleToOrgType[role] || '',
    sceneWorkType: scene || '',
    demandTitle: scene ? `${scene}场景优化` : '',
    currentProblem: pain ? `当前最主要的消耗是：${pain}` : '',
    dataCurrentState: pain ? `当前最主要的消耗是：${pain}` : '',
    expectedOutcome: goal ? `希望最终形成：${goal}` : '',
    scenarioTags: scene ? [scene] : [],
  };
}

function mergeFormWithDraft(draft: OrganizationDemandForm | null): OrganizationDemandForm {
  if (!draft) return EMPTY_FORM;
  return {
    ...EMPTY_FORM,
    ...draft,
    industries: Array.isArray(draft.industries) ? draft.industries : [],
    currentSolutions: Array.isArray(draft.currentSolutions) ? draft.currentSolutions : [],
    involvedRoles: Array.isArray(draft.involvedRoles) ? draft.involvedRoles : [],
    scenarioTags: Array.isArray(draft.scenarioTags) ? draft.scenarioTags : [],
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
    if (!Number.isFinite(value) || value < 0 || value > 3) return 0;
    return value;
  } catch {
    return 0;
  }
}

function saveStepDraft(step: number) {
  try {
    localStorage.setItem(STEP_DRAFT_KEY, String(step));
  } catch {
    // ignore write failure
  }
}

function clearStepDraft() {
  try {
    localStorage.removeItem(STEP_DRAFT_KEY);
  } catch {
    // ignore clear failure
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

function getStepMissing(step: number, form: OrganizationDemandForm) {
  const checks: Record<number, Array<[boolean, string]>> = {
    0: [
      [!form.organizationName.trim(), '组织名称'],
      [!form.organizationType.trim(), '组织类型'],
      [form.industries.length === 0, '所属领域'],
      [!form.contactName.trim(), '联系人'],
      [!form.contactInfo.trim(), '联系方式'],
      [!form.sceneWorkType?.trim(), '场景工作类型'],
    ],
    1: [
      [!form.demandTitle.trim(), '场景标题'],
      [!form.currentProblem.trim(), '数据现状描述'],
      [form.currentSolutions.length === 0, '当前记录方式'],
      [!form.dataLossPoints?.trim(), '经常丢失的数据'],
    ],
    2: [
      [!form.expectedOutcome.trim(), '希望系统完成什么'],
      [!form.expectedMetrics?.trim(), '希望系统计算什么'],
      [!form.expectedReports?.trim(), '希望输出哪些报告'],
      [form.involvedRoles.length === 0, '哪些角色需要看结果'],
    ],
    3: [
      [!form.workbenchUsers?.trim(), '工作台使用者'],
      [!form.workbenchFirstLook?.trim(), '工作台首屏信息'],
      [!form.workbenchActions?.trim(), '关键动作'],
      [form.scenarioTags.length === 0, '场景标签'],
      [!form.publicDisplayMode.trim(), '公开展示设置'],
      [!form.interviewWillingness.trim(), '是否愿意访谈'],
      [!form.trialFeedbackWillingness.trim(), '是否愿意试用反馈'],
      [!form.privacyConfirmed, '隐私确认'],
    ],
  };

  return (checks[step] || []).filter(([missing]) => missing).map(([, label]) => label);
}

export function DemandSubmitPage({ onNavigate }: DemandSubmitPageProps) {
  const [form, setForm] = useState<OrganizationDemandForm>(() => {
    const draft = mergeFormWithDraft(loadOrganizationDemandDraft());
    const prefill = getPrefillFromQuery();
    return {
      ...draft,
      organizationType: prefill.organizationType || draft.organizationType,
      sceneWorkType: prefill.sceneWorkType || draft.sceneWorkType,
      demandTitle: prefill.demandTitle || draft.demandTitle,
      currentProblem: prefill.currentProblem || draft.currentProblem,
      dataCurrentState: prefill.dataCurrentState || draft.dataCurrentState,
      expectedOutcome: prefill.expectedOutcome || draft.expectedOutcome,
      scenarioTags: prefill.scenarioTags && prefill.scenarioTags.length > 0 ? prefill.scenarioTags : draft.scenarioTags,
    };
  });
  const [step, setStep] = useState(() => loadStepDraft());
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  useEffect(() => {
    saveOrganizationDemandDraft(form);
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

  const onFieldChange = <K extends keyof OrganizationDemandForm>(key: K, value: OrganizationDemandForm[K]) => {
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

    if (step === 0 && form.contactInfo.trim().length < 5) {
      setMessage({ type: 'error', text: '请填写有效联系方式（邮箱、微信或电话）。' });
      return;
    }

    setMessage(null);
    setStep((prev) => Math.min(STEPS.length - 1, prev + 1));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;

    const fullMissing = [0, 1, 2, 3].flatMap((index) => getStepMissing(index, form));
    if (fullMissing.length > 0) {
      setMessage({ type: 'error', text: `请先补充：${Array.from(new Set(fullMissing)).join('、')}` });
      return;
    }

    if (form.contactInfo.trim().length < 5) {
      setMessage({ type: 'error', text: '请填写有效联系方式（邮箱、微信或电话）。' });
      return;
    }

    setSubmitting(true);
    setMessage(null);

    const result = await submitOrganizationDemand(form);

    setSubmitting(false);
    if (!result.ok) {
      setMessage({ type: 'error', text: result.error || '提交失败，请稍后重试。草稿已为你保留。' });
      return;
    }

    clearOrganizationDemandDraft();
    clearStepDraft();
    setSubmitted(true);
    setHasUnsavedChanges(false);
    setMessage({ type: 'success', text: '组织场景提交成功，社区已进入整理流程。' });
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
            返回开源软件介绍页
          </button>

          <div className="mt-5 rounded-[28px] border border-border/40 bg-white/90 p-6 shadow-sm sm:p-8">
            <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">提交一个真实组织场景</h1>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              你不需要懂技术。请告诉我们：哪件事最消耗你们，哪些过程需要留下，哪些资料每次都要重新整理，希望 AI 帮你总结什么，最后谁可以少做重复劳动。
              社区会把它整理成可共建的流程、工作台、报表或 AI 总结能力。
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
                <h2 className="text-base font-semibold text-foreground">1. 你的组织</h2>
                <div className="mt-4 space-y-5">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <FieldLabel label="组织名称" required />
                      <TextInput
                        value={form.organizationName}
                        onChange={(value) => onFieldChange('organizationName', value)}
                        placeholder="例如：XX 社区服务中心（可匿名展示）"
                      />
                    </div>
                    <div>
                      <FieldLabel label="组织类型" required />
                      <div className="flex flex-wrap gap-2">
                        {ORGANIZATION_TYPE_OPTIONS.map((option) => (
                          <ChoiceChip
                            key={option}
                            label={option}
                            selected={form.organizationType === option}
                            onClick={() => onFieldChange('organizationType', option)}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <FieldLabel label="所在城市" />
                      <TextInput value={form.city} onChange={(value) => onFieldChange('city', value)} placeholder="例如：上海" />
                    </div>
                    <div>
                      <FieldLabel label="组织规模" />
                      <div className="flex flex-wrap gap-2">
                        {ORG_SIZE_OPTIONS.map((option) => (
                          <ChoiceChip
                            key={option}
                            label={option}
                            selected={form.organizationSize === option}
                            onClick={() => onFieldChange('organizationSize', option)}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  <div>
                    <FieldLabel label="所属领域" required />
                    <div className="flex flex-wrap gap-2">
                      {INDUSTRY_OPTIONS.map((option) => (
                        <ChoiceChip
                          key={option}
                          label={option}
                          selected={form.industries.includes(option)}
                          onClick={() => onFieldChange('industries', toggleValue(form.industries, option))}
                        />
                      ))}
                    </div>
                  </div>

                  <div>
                    <FieldLabel label="这个场景属于哪类工作" required />
                    <div className="flex flex-wrap gap-2">
                      {SCENE_WORK_TYPES.map((option) => (
                        <ChoiceChip
                          key={option}
                          label={option}
                          selected={form.sceneWorkType === option}
                          onClick={() => onFieldChange('sceneWorkType', option)}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <FieldLabel label="联系人" required />
                      <TextInput
                        value={form.contactName}
                        onChange={(value) => onFieldChange('contactName', value)}
                        placeholder="可填姓名或昵称"
                      />
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
                </div>
              </section>
            ) : null}

            {step === 1 ? (
              <section className="rounded-[24px] border border-border/40 bg-white/90 p-5 sm:p-6">
                <h2 className="text-base font-semibold text-foreground">2. 哪件事最消耗你们</h2>
                <div className="mt-4 space-y-5">
                  <div>
                    <FieldLabel label="场景标题" required />
                    <TextInput
                      value={form.demandTitle}
                      onChange={(value) => onFieldChange('demandTitle', value)}
                      placeholder="例如：志愿者服务时长记录"
                    />
                  </div>

                  <div>
                    <FieldLabel label="当前最耗时的情况" required />
                    <TextArea
                      value={form.currentProblem}
                      onChange={(value) => {
                        onFieldChange('currentProblem', value);
                        onFieldChange('dataCurrentState', value);
                      }}
                      placeholder="这件事现在谁在做？每次要花多久？为什么总要反复沟通？"
                      rows={4}
                    />
                  </div>

                  <div>
                    <FieldLabel label="现在怎么记录" required />
                    <div className="flex flex-wrap gap-2">
                      {CURRENT_SOLUTION_OPTIONS.map((option) => (
                        <ChoiceChip
                          key={option}
                          label={option}
                          selected={form.currentSolutions.includes(option)}
                          onClick={() => onFieldChange('currentSolutions', toggleValue(form.currentSolutions, option))}
                        />
                      ))}
                    </div>
                    <div className="mt-3">
                      <TextInput
                        value={form.currentSolutionsNote}
                        onChange={(value) => onFieldChange('currentSolutionsNote', value)}
                        placeholder="例如：报名在微信群，签到在纸上，时长在 Excel"
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <FieldLabel label="多久更新一次" />
                      <TextInput
                        value={form.dataUpdateCadence || ''}
                        onChange={(value) => onFieldChange('dataUpdateCadence', value)}
                        placeholder="例如：每天 / 每周 / 每月"
                      />
                    </div>
                    <div>
                      <FieldLabel label="哪些数据经常丢失" required />
                      <TextInput
                        value={form.dataLossPoints || ''}
                        onChange={(value) => onFieldChange('dataLossPoints', value)}
                        placeholder="例如：签到记录、回访记录、附件依据"
                      />
                    </div>
                  </div>

                  <div>
                    <FieldLabel label="哪些资料或信息每次都要重复整理" />
                    <TextArea
                      value={form.repeatedDataWork || ''}
                      onChange={(value) => onFieldChange('repeatedDataWork', value)}
                      placeholder="例如：月底周报要从多个表复制粘贴。"
                      rows={3}
                    />
                  </div>
                </div>
              </section>
            ) : null}

            {step === 2 ? (
              <section className="rounded-[24px] border border-border/40 bg-white/90 p-5 sm:p-6">
                <h2 className="text-base font-semibold text-foreground">3. 你希望留下什么</h2>
                <div className="mt-4 space-y-5">
                  <div>
                    <FieldLabel label="希望系统帮你完成什么" required />
                    <TextArea
                      value={form.expectedOutcome}
                      onChange={(value) => onFieldChange('expectedOutcome', value)}
                      placeholder="例如：少做手工汇总，自动形成状态、提醒和下一步动作。"
                      rows={4}
                    />
                  </div>

                  <div>
                    <FieldLabel label="希望留下哪些指标或判断依据" required />
                    <TextArea
                      value={form.expectedMetrics || ''}
                      onChange={(value) => onFieldChange('expectedMetrics', value)}
                      placeholder="例如：累计服务时长、活动参与率、延期风险。"
                      rows={3}
                    />
                  </div>

                  <div>
                    <FieldLabel label="希望有哪些关键提醒" />
                    <TextArea
                      value={form.expectedAlerts || ''}
                      onChange={(value) => onFieldChange('expectedAlerts', value)}
                      placeholder="例如：逾期提醒、回访提醒、待确认动作提醒。"
                      rows={3}
                    />
                  </div>

                  <div>
                    <FieldLabel label="希望自动生成哪些报告或输出" required />
                    <TextArea
                      value={form.expectedReports || ''}
                      onChange={(value) => onFieldChange('expectedReports', value)}
                      placeholder="例如：月度服务报表、项目周报、捐赠回访报表。"
                      rows={3}
                    />
                  </div>

                  <div>
                    <FieldLabel label="哪些角色需要看到这些结果" required />
                    <div className="flex flex-wrap gap-2">
                      {INVOLVED_ROLE_OPTIONS.map((option) => (
                        <ChoiceChip
                          key={option}
                          label={option}
                          selected={form.involvedRoles.includes(option)}
                          onClick={() => onFieldChange('involvedRoles', toggleValue(form.involvedRoles, option))}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </section>
            ) : null}

            {step === 3 ? (
              <section className="rounded-[24px] border border-border/40 bg-white/90 p-5 sm:p-6">
                <h2 className="text-base font-semibold text-foreground">4. 谁会因此被解放</h2>
                <div className="mt-4 space-y-5">
                  <div>
                    <FieldLabel label="谁会因此省下重复劳动" required />
                    <TextInput
                      value={form.workbenchUsers || ''}
                      onChange={(value) => onFieldChange('workbenchUsers', value)}
                      placeholder="例如：项目负责人、运营同事、志愿者管理员"
                    />
                  </div>

                  <div>
                    <FieldLabel label="他们最希望第一眼看到什么" required />
                    <TextArea
                      value={form.workbenchFirstLook || ''}
                      onChange={(value) => onFieldChange('workbenchFirstLook', value)}
                      placeholder="例如：本周重点任务、逾期项、待确认动作、风险提醒。"
                      rows={3}
                    />
                  </div>

                  <div>
                    <FieldLabel label="他们要完成什么关键动作" required />
                    <TextArea
                      value={form.workbenchActions || ''}
                      onChange={(value) => onFieldChange('workbenchActions', value)}
                      placeholder="例如：确认待办、分配责任人、更新状态、提交反馈。"
                      rows={3}
                    />
                  </div>

                  <div>
                    <FieldLabel label="这些动作完成后会留下什么新数据" />
                    <TextArea
                      value={form.actionFeedbackData || ''}
                      onChange={(value) => onFieldChange('actionFeedbackData', value)}
                      placeholder="例如：新的跟进记录、状态变更、复盘依据。"
                      rows={3}
                    />
                  </div>

                  <div>
                    <FieldLabel label="组织场景所属方向" required />
                    <div className="flex flex-wrap gap-2">
                      {DEMAND_SCENARIO_OPTIONS.map((option) => (
                        <ChoiceChip
                          key={option}
                          label={option}
                          selected={form.scenarioTags.includes(option)}
                          onClick={() => onFieldChange('scenarioTags', toggleValue(form.scenarioTags, option))}
                        />
                      ))}
                    </div>
                  </div>

                  <div>
                    <FieldLabel label="是否允许公开展示这个场景" required />
                    <div className="flex flex-wrap gap-2">
                      {['允许公开组织名称', '匿名公开', '暂不公开'].map((option) => (
                        <ChoiceChip
                          key={option}
                          label={option}
                          selected={form.publicDisplayMode === option}
                          onClick={() => onFieldChange('publicDisplayMode', option)}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <FieldLabel label="是否愿意参与访谈" required />
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
                      <FieldLabel label="是否愿意参与试用反馈" required />
                      <div className="flex flex-wrap gap-2">
                        {['愿意', '暂时不方便'].map((option) => (
                          <ChoiceChip
                            key={option}
                            label={option}
                            selected={form.trialFeedbackWillingness === option}
                            onClick={() => onFieldChange('trialFeedbackWillingness', option)}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-7 text-amber-900">
                    请不要提交身份证号、手机号清单、儿童信息、病患信息、受助人名单、捐赠人明细等敏感数据。
                    这里只需要描述组织场景，不需要上传真实业务数据。
                  </div>

                  <label className="flex items-start gap-3 rounded-2xl border border-border/50 bg-white px-4 py-3 text-sm text-foreground">
                    <input
                      type="checkbox"
                      checked={form.privacyConfirmed}
                      onChange={(event) => onFieldChange('privacyConfirmed', event.target.checked)}
                      className="mt-1 h-4 w-4 rounded border-border text-primary focus:ring-primary"
                    />
                    <span>我确认没有提交敏感个人信息。</span>
                  </label>
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

              {step < 3 ? (
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
                  {submitting ? '正在提交...' : '提交组织场景'}
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
                感谢你提交真实组织场景。社区会先判断它正在消耗什么、可以留下哪些过程和素材，以及能否变成可复用的流程、工作台、报表或 AI 总结能力。
                如果适合，我们会整理成共建议题并邀请志愿者参与；若需补充信息，会通过你的联系方式回访。
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => onNavigate?.('demand-pool')}
                  className="rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
                >
                  查看共建议题池
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate?.('demand-submit')}
                  className="rounded-2xl border border-emerald-300 px-4 py-2 text-sm font-medium text-emerald-900 hover:bg-emerald-100"
                >
                  继续补充组织场景
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate?.('demand-submit')}
                  className="rounded-2xl border border-emerald-300 px-4 py-2 text-sm font-medium text-emerald-900 hover:bg-emerald-100"
                >
                  成为试用组织
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate?.('volunteer-apply')}
                  className="rounded-2xl border border-emerald-300 px-4 py-2 text-sm font-medium text-emerald-900 hover:bg-emerald-100"
                >
                  邀请志愿者参与
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
