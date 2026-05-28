import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ChevronDown, RefreshCw } from 'lucide-react';
import { Footer } from './Footer';
import { Header } from './Header';
import {
  CONTRIBUTION_LAYER_OPTIONS,
  DEMAND_STATUS_META,
  fetchDemandPoolCards,
  type ContributionLayer,
  type DemandCard,
  type DemandDifficulty,
  type DemandParticipationEffort,
  type DemandParticipationValueType,
  type DemandStatus,
  type NeededRole,
  type ParticipationRole,
} from '../lib/coBuild';
import { ActionableIssueCard } from './open-source-workbench/ActionableIssueCard';

interface DemandPoolPageProps {
  onNavigate?: (page: string, id?: string) => void;
}

const ROLE_FILTERS: Array<{ id: 'all' | NeededRole; label: string }> = [
  { id: 'all', label: '全部角色' },
  { id: 'product', label: '产品' },
  { id: 'frontend', label: '前端' },
  { id: 'backend', label: '后端' },
  { id: 'testing', label: '测试' },
  { id: 'design', label: '设计' },
  { id: 'docs', label: '文档' },
  { id: 'deploy', label: '部署' },
];

const STATUS_FILTERS: Array<{ id: 'all' | DemandStatus; label: string }> = [
  { id: 'all', label: '全部状态' },
  ...Object.entries(DEMAND_STATUS_META).map(([id, meta]) => ({ id: id as DemandStatus, label: meta.label })),
];

const DIFFICULTY_FILTERS: Array<{ id: 'all' | DemandDifficulty; label: string }> = [
  { id: 'all', label: '全部难度' },
  { id: 'beginner', label: '新手友好' },
  { id: 'medium', label: '中等' },
  { id: 'complex', label: '较复杂' },
];

const CONTRIBUTION_FILTERS: Array<{ id: 'all' | ContributionLayer; label: string }> = [
  { id: 'all', label: '全部层级' },
  ...CONTRIBUTION_LAYER_OPTIONS.map((item) => ({ id: item.value, label: item.label })),
];

const AUDIENCE_FILTERS: Array<{ id: 'all' | ParticipationRole; label: string }> = [
  { id: 'all', label: '全部参与角色' },
  { id: 'nonprofit', label: '组织方' },
  { id: 'beginner_volunteer', label: '新手志愿者' },
  { id: 'developer', label: '开发者' },
  { id: 'product_volunteer', label: '产品志愿者' },
  { id: 'designer', label: '设计师' },
  { id: 'tester', label: '测试' },
  { id: 'writer', label: '文档' },
  { id: 'implementer', label: '实施' },
  { id: 'maintainer', label: '维护者' },
  { id: 'funder', label: '资助方/合作方' },
  { id: 'social_enterprise', label: '社会企业' },
  { id: 'sme', label: '中小企业' },
];

const EFFORT_FILTERS: Array<{ id: 'all' | DemandParticipationEffort; label: string }> = [
  { id: 'all', label: '全部投入成本' },
  { id: '1_hour', label: '1 小时' },
  { id: 'half_day', label: '半天' },
  { id: 'one_week', label: '1 周' },
  { id: 'long_term', label: '长期' },
];

const VALUE_TYPE_FILTERS: Array<{ id: 'all' | DemandParticipationValueType; label: string }> = [
  { id: 'all', label: '全部价值类型' },
  { id: 'cost_reduction', label: '降低管理成本' },
  { id: 'org_memory', label: '沉淀组织经验' },
  { id: 'free_repetition', label: '解放重复整理' },
  { id: 'traceability', label: '改善痕迹管理' },
  { id: 'workbench_form', label: '形成工作台' },
  { id: 'ai_summary', label: '支持 AI 总结' },
  { id: 'open_source', label: '开源共建' },
];

function FilterChip({
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

function SectionTitle({ title }: { title: string }) {
  return <div className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">{title}</div>;
}

function getQueryValue<T extends string>(params: URLSearchParams, key: string, values: readonly T[], fallback: T): T {
  const value = params.get(key);
  if (!value) return fallback;
  return values.includes(value as T) ? (value as T) : fallback;
}

export function DemandPoolPage({ onNavigate }: DemandPoolPageProps) {
  const params = useMemo(() => new URLSearchParams(window.location.search), []);

  const [cards, setCards] = useState<DemandCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  const [search, setSearch] = useState(() => params.get('keyword') || '');
  const [statusFilter, setStatusFilter] = useState<'all' | DemandStatus>(() =>
    getQueryValue(params, 'status', STATUS_FILTERS.map((item) => item.id), 'all'),
  );
  const [difficultyFilter, setDifficultyFilter] = useState<'all' | DemandDifficulty>(() =>
    getQueryValue(params, 'difficulty', DIFFICULTY_FILTERS.map((item) => item.id), 'all'),
  );
  const [roleFilter, setRoleFilter] = useState<'all' | NeededRole>(() =>
    getQueryValue(params, 'neededRole', ROLE_FILTERS.map((item) => item.id), 'all'),
  );
  const [contributionFilter, setContributionFilter] = useState<'all' | ContributionLayer>(() =>
    getQueryValue(params, 'layer', CONTRIBUTION_FILTERS.map((item) => item.id), 'all'),
  );
  const [audienceFilter, setAudienceFilter] = useState<'all' | ParticipationRole>(() =>
    getQueryValue(params, 'role', AUDIENCE_FILTERS.map((item) => item.id), 'all'),
  );
  const [effortFilter, setEffortFilter] = useState<'all' | DemandParticipationEffort>(() =>
    getQueryValue(params, 'effort', EFFORT_FILTERS.map((item) => item.id), 'all'),
  );
  const [valueTypeFilter, setValueTypeFilter] = useState<'all' | DemandParticipationValueType>(() =>
    getQueryValue(params, 'value', VALUE_TYPE_FILTERS.map((item) => item.id), 'all'),
  );
  const [targetWorkbenchFilter, setTargetWorkbenchFilter] = useState(() => params.get('workbench') || 'all');
  const [beginnerOnly, setBeginnerOnly] = useState(() => params.get('beginner') === '1');

  const loadCards = async () => {
    setLoading(true);
    setLoadError('');
    try {
      const list = await fetchDemandPoolCards();
      setCards(list);
    } catch {
      setLoadError('加载共建议题池失败，请稍后重试。');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadCards();
  }, []);

  const workbenchOptions = useMemo(() => {
    const set = new Set<string>();
    cards.forEach((card) => {
      const target = card.detail.dataCenterMapping.targetWorkbench || card.participation?.possibleWorkbench;
      if (target) set.add(target);
    });
    return ['all', ...Array.from(set)];
  }, [cards]);

  const filteredCards = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return cards.filter((card) => {
      if (statusFilter !== 'all' && card.status !== statusFilter) return false;
      if (difficultyFilter !== 'all' && card.difficulty !== difficultyFilter) return false;
      if (roleFilter !== 'all' && !card.neededRoles.includes(roleFilter)) return false;
      if (beginnerOnly && !card.isBeginnerFriendly) return false;

      const mapping = card.detail.dataCenterMapping;
      const participation = card.participation;

      if (contributionFilter !== 'all' && !mapping.contributionLayers.includes(contributionFilter)) return false;
      if (targetWorkbenchFilter !== 'all') {
        const target = mapping.targetWorkbench || participation?.possibleWorkbench || '';
        if (target !== targetWorkbenchFilter) return false;
      }

      if (audienceFilter !== 'all' && !participation?.recommendedFor?.includes(audienceFilter)) return false;
      if (effortFilter !== 'all' && participation?.estimatedEffort !== effortFilter) return false;
      if (valueTypeFilter !== 'all' && !participation?.valueTypes?.includes(valueTypeFilter)) return false;

      if (!keyword) return true;
      const haystack = [
        card.title,
        card.requesterType,
        card.orgType,
        card.scenario,
        card.summary,
        card.impactScope,
        mapping.targetWorkbench,
        participation?.realProblem,
        participation?.whatCanBePreserved,
        participation?.possibleWorkbench,
        ...(participation?.missingRoles || []),
        ...mapping.dataObjects,
        ...mapping.computedMetrics,
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(keyword);
    });
  }, [
    audienceFilter,
    beginnerOnly,
    cards,
    contributionFilter,
    difficultyFilter,
    effortFilter,
    roleFilter,
    search,
    statusFilter,
    targetWorkbenchFilter,
    valueTypeFilter,
  ]);

  const statusStats = useMemo(() => {
    return cards.reduce<Record<DemandStatus, number>>(
      (acc, item) => {
        acc[item.status] += 1;
        return acc;
      },
      {
        new: 0,
        confirming: 0,
        awaiting_split: 0,
        awaiting_claim: 0,
        developing: 0,
        testing: 0,
        merged: 0,
        adopted: 0,
      },
    );
  }, [cards]);

  return (
    <div className="min-h-screen bg-background">
      <Header onNavigate={onNavigate as any} />

      <main className="pb-16 pt-24 sm:pt-28">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={() => onNavigate?.('open-source-workbench')}
            className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            返回组织智慧入口页
          </button>

          <section className="mt-5 rounded-[28px] border border-border/40 bg-white/90 p-6 shadow-sm sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">共建议题池：从真实问题长出公共工具</h1>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">
                  这里的每一个议题，都来自真实组织的真实工作。它不是一个孤立功能愿望，而是一个组织场景如何被整理成流程、工作台、报表或 AI 总结能力的协作过程。
                </p>
              </div>
              <button
                type="button"
                onClick={() => void loadCards()}
                className="inline-flex items-center gap-2 rounded-2xl border border-border px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted"
              >
                <RefreshCw className="h-4 w-4" />
                刷新共建议题池
              </button>
            </div>

            <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label="总议题" value={String(cards.length)} />
              <StatCard label="等待志愿者认领" value={String(statusStats.awaiting_claim)} />
              <StatCard label="正在长成功能" value={String(statusStats.developing)} />
              <StatCard label="已进入底座/已被使用" value={String(statusStats.merged + statusStats.adopted)} />
            </div>
          </section>

          <section className="mt-6 grid gap-5 lg:grid-cols-[300px,1fr]">
            <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
              <div className="rounded-[24px] border border-border/40 bg-white/90 p-4 sm:p-5">
                <button
                  type="button"
                  className="flex w-full items-center justify-between text-left lg:hidden"
                  onClick={() => setShowMobileFilters((prev) => !prev)}
                >
                  <span className="text-sm font-semibold text-foreground">筛选条件</span>
                  <ChevronDown
                    className={`h-4 w-4 text-muted-foreground transition-transform ${showMobileFilters ? 'rotate-180' : 'rotate-0'}`}
                  />
                </button>

                <div className={`${showMobileFilters ? 'mt-4 block' : 'hidden'} space-y-4 lg:block`}>
                  <div>
                    <SectionTitle title="关键词" />
                    <input
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="标题、场景、工作台"
                      className="w-full rounded-xl border border-border/50 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-primary/50 focus:ring-4 focus:ring-primary/10"
                    />
                  </div>

                  <div>
                    <SectionTitle title="状态" />
                    <div className="flex flex-wrap gap-2">
                      {STATUS_FILTERS.map((option) => (
                        <FilterChip key={option.id} label={option.label} selected={statusFilter === option.id} onClick={() => setStatusFilter(option.id)} />
                      ))}
                    </div>
                  </div>

                  <div>
                    <SectionTitle title="难度" />
                    <div className="flex flex-wrap gap-2">
                      {DIFFICULTY_FILTERS.map((option) => (
                        <FilterChip key={option.id} label={option.label} selected={difficultyFilter === option.id} onClick={() => setDifficultyFilter(option.id)} />
                      ))}
                    </div>
                  </div>

                  <div>
                    <SectionTitle title="技术角色" />
                    <div className="flex flex-wrap gap-2">
                      {ROLE_FILTERS.map((option) => (
                        <FilterChip key={option.id} label={option.label} selected={roleFilter === option.id} onClick={() => setRoleFilter(option.id)} />
                      ))}
                    </div>
                  </div>

                  <div>
                    <SectionTitle title="参与角色" />
                    <div className="flex flex-wrap gap-2">
                      {AUDIENCE_FILTERS.map((option) => (
                        <FilterChip key={option.id} label={option.label} selected={audienceFilter === option.id} onClick={() => setAudienceFilter(option.id)} />
                      ))}
                    </div>
                  </div>

                  <div>
                    <SectionTitle title="参与成本" />
                    <div className="flex flex-wrap gap-2">
                      {EFFORT_FILTERS.map((option) => (
                        <FilterChip key={option.id} label={option.label} selected={effortFilter === option.id} onClick={() => setEffortFilter(option.id)} />
                      ))}
                    </div>
                  </div>

                  <div>
                    <SectionTitle title="价值类型" />
                    <div className="flex flex-wrap gap-2">
                      {VALUE_TYPE_FILTERS.map((option) => (
                        <FilterChip key={option.id} label={option.label} selected={valueTypeFilter === option.id} onClick={() => setValueTypeFilter(option.id)} />
                      ))}
                    </div>
                  </div>

                  <div>
                    <SectionTitle title="贡献层级" />
                    <div className="flex flex-wrap gap-2">
                      {CONTRIBUTION_FILTERS.map((option) => (
                        <FilterChip key={option.id} label={option.label} selected={contributionFilter === option.id} onClick={() => setContributionFilter(option.id)} />
                      ))}
                    </div>
                  </div>

                  <div>
                    <SectionTitle title="目标工作台" />
                    <div className="flex flex-wrap gap-2">
                      {workbenchOptions.map((option) => (
                        <FilterChip
                          key={option}
                          label={option === 'all' ? '全部工作台' : option}
                          selected={targetWorkbenchFilter === option}
                          onClick={() => setTargetWorkbenchFilter(option)}
                        />
                      ))}
                    </div>
                  </div>

                  <label className="inline-flex items-center gap-2 text-sm text-foreground">
                    <input
                      type="checkbox"
                      checked={beginnerOnly}
                      onChange={(event) => setBeginnerOnly(event.target.checked)}
                      className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                    />
                    仅看新手友好
                  </label>
                </div>
              </div>
            </aside>

            <div>
              {loading ? (
                <div className="rounded-[24px] border border-border/40 bg-white/90 px-6 py-8 text-sm text-muted-foreground">正在加载共建议题池...</div>
              ) : loadError ? (
                <div className="rounded-[24px] border border-rose-200 bg-rose-50 px-6 py-8 text-sm text-rose-700">{loadError}</div>
              ) : filteredCards.length === 0 ? (
                <div className="rounded-[24px] border border-border/40 bg-white/90 px-6 py-8 text-sm text-muted-foreground">
                  当前筛选条件下没有结果。你可以放宽筛选，或者提交一个新的组织场景。
                </div>
              ) : (
                <div className="grid gap-4">
                  {filteredCards.map((card, index) => (
                    <ActionableIssueCard
                      key={card.id}
                      card={card}
                      mode="full"
                      delay={index * 40}
                      onViewDetail={() => onNavigate?.('demand-detail', card.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      </main>

      <Footer onNavigate={onNavigate as any} />
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/40 bg-background px-4 py-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-xl font-semibold text-foreground">{value}</div>
    </div>
  );
}
