import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ExternalLink, Loader2 } from 'lucide-react';
import { Footer } from './Footer';
import { Header } from './Header';
import {
  fetchDemandPoolCards,
  getContributionLayerLabel,
  getDemandCardById,
  getDemandDifficultyLabel,
  getDemandParticipationEffortLabel,
  getDemandStatusMeta,
  getNeededRoleLabel,
  type DemandCard,
} from '../lib/coBuild';

interface DemandDetailPageProps {
  onNavigate?: (page: string, id?: string) => void;
  demandId: string;
}

const ROLE_TASK_HINTS: Record<string, string> = {
  产品志愿者: '梳理数据对象、补齐边界、拆分任务与验收标准。',
  前端开发: '实现工作台页面、交互与筛选面板。',
  后端开发: '实现数据接口、状态流转与指标计算。',
  设计师: '优化信息架构与页面可用性，降低组织上手成本。',
  测试志愿者: '按验收标准完成场景测试并提交反馈。',
  文档志愿者: '补齐使用说明、贡献指南与案例沉淀。',
  实施志愿者: '支持部署试用、配置与组织培训。',
  部署: '补齐部署说明并支持试用环境搭建。',
};

export function DemandDetailPage({ onNavigate, demandId }: DemandDetailPageProps) {
  const [cards, setCards] = useState<DemandCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState('');

  useEffect(() => {
    let canceled = false;

    const load = async () => {
      setLoading(true);
      setErrorText('');
      try {
        const list = await fetchDemandPoolCards();
        if (!canceled) setCards(list);
      } catch {
        if (!canceled) setErrorText('需求详情加载失败，请稍后重试。');
      } finally {
        if (!canceled) setLoading(false);
      }
    };

    void load();
    return () => {
      canceled = true;
    };
  }, []);

  const demand = useMemo(() => getDemandCardById(demandId, cards), [cards, demandId]);

  return (
    <div className="min-h-screen bg-background">
      <Header onNavigate={onNavigate as any} />

      <main className="pb-16 pt-24 sm:pt-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={() => onNavigate?.('demand-pool')}
            className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            返回共建议题池
          </button>

          {loading ? (
            <section className="mt-6 rounded-[24px] border border-border/40 bg-white/90 px-6 py-10 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                正在加载议题详情...
              </span>
            </section>
          ) : errorText ? (
            <section className="mt-6 rounded-[24px] border border-rose-200 bg-rose-50 px-6 py-8 text-sm text-rose-700">{errorText}</section>
          ) : !demand ? (
            <section className="mt-6 rounded-[24px] border border-border/40 bg-white/90 p-6">
              <h1 className="text-2xl font-semibold text-foreground">未找到该议题</h1>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">该议题可能已下线或 id 不存在。你可以返回共建议题池查看其他条目。</p>
              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => onNavigate?.('demand-pool')}
                  className="rounded-2xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                >
                  返回共建议题池
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate?.('demand-submit')}
                  className="rounded-2xl border border-border px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted"
                >
                  提交组织场景
                </button>
              </div>
            </section>
          ) : (
            <DemandDetailContent demand={demand} onNavigate={onNavigate} />
          )}
        </div>
      </main>

      <Footer onNavigate={onNavigate as any} />
    </div>
  );
}

function DemandDetailContent({
  demand,
  onNavigate,
}: {
  demand: DemandCard;
  onNavigate?: (page: string, id?: string) => void;
}) {
  const statusMeta = getDemandStatusMeta(demand.status);
  const mapping = demand.detail.dataCenterMapping;
  const participation = demand.participation;

  const impactedRoles =
    participation?.impactedRoles && participation.impactedRoles.length > 0
      ? participation.impactedRoles
      : demand.neededRoles.map((role) => getNeededRoleLabel(role));

  const missingRoles = participation?.missingRoles || demand.neededRoles.map((role) => getNeededRoleLabel(role));

  const consumptionItems = [
    `消耗的人力：${participation?.humanCost || participation?.whoIsConsumed || '主要依赖人工整理和重复沟通'}`,
    `消耗的社会资源：${participation?.socialResourceCost || demand.impactScope || '组织核心时间被低效占用'}`,
    `重复发生频率：${participation?.repeatFrequency || '在常规协作中持续发生'}`,
    `影响到的角色：${impactedRoles.join('、') || '待补充'}`,
    `如果不解决：${participation?.ifNotSolved || demand.detail.problems[0] || '会持续造成协作与判断成本上升'}`,
  ];

  const preserveItems = [
    `过程痕迹：${participation?.preserveProcess || mapping.dataInputs.join('、') || '待补充'}`,
    `可沉淀素材：${participation?.preserveAssets || mapping.dataOutputs.join('、') || '待补充'}`,
    `可形成模板：${participation?.preserveTemplates || demand.detail.expectedFeatures[0] || '待补充'}`,
    `可生成复盘/报告：${participation?.preserveReports || mapping.computedMetrics.join('、') || '待补充'}`,
    `可支持判断：${participation?.preserveJudgement || mapping.reusablePotential || '待补充'}`,
    `可帮助组织：${(participation?.beneficiaryOrganizations || []).join('、') || demand.orgType}`,
  ];

  return (
    <>
      <section className="mt-6 rounded-[28px] border border-border/40 bg-white/90 p-6 shadow-sm sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">{demand.title}</h1>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">{demand.summary}</p>
            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              <span className={`inline-flex rounded-full border px-3 py-1 font-semibold ${statusMeta.className}`}>{statusMeta.label}</span>
              <span className="rounded-full border border-border bg-background px-3 py-1 text-muted-foreground">
                难度：{getDemandDifficultyLabel(demand.difficulty)}
              </span>
              <span className="rounded-full border border-border bg-background px-3 py-1 text-muted-foreground">组织类型：{demand.orgType}</span>
              <span className="rounded-full border border-border bg-background px-3 py-1 text-muted-foreground">场景：{demand.scenario}</span>
            </div>
          </div>

          <div className="rounded-2xl border border-border/40 bg-background px-4 py-3 text-xs text-muted-foreground">
            <div>关注：{demand.watchersCount}</div>
            <div className="mt-1">认领：{demand.claimedCount}</div>
            <div className="mt-1">更新：{demand.updatedAtText}</div>
            {participation ? <div className="mt-1">预计投入：{getDemandParticipationEffortLabel(participation.estimatedEffort)}</div> : null}
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-primary/20 bg-primary/[0.06] p-4 text-sm leading-7 text-foreground/90">
          <p>
            <span className="font-semibold">当前阶段：</span>
            {statusMeta.label}
          </p>
          <p>
            <span className="font-semibold">下一步：</span>
            {participation?.nextAction || `需要 ${missingRoles.join('、')} 协同推进，先补齐关键任务再进入验证。`}
          </p>
          <p>
            <span className="font-semibold">参与方式：</span>
            Issue 讨论 / PR / 文档补充 / 试用反馈。
          </p>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => window.open(demand.issueUrl, '_blank')}
            className="inline-flex items-center gap-2 rounded-2xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            去 Issue 参与
            <ExternalLink className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onNavigate?.('volunteer-apply')}
            className="rounded-2xl border border-border px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted"
          >
            成为共建志愿者
          </button>
        </div>
      </section>

      <section className="mt-6 rounded-[24px] border border-border/40 bg-white/90 p-6">
        <h2 className="text-lg font-semibold text-foreground">我可以怎么参与？</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {missingRoles.map((role) => (
            <article key={role} className="rounded-2xl border border-border/40 bg-background p-4">
              <h3 className="text-sm font-semibold text-foreground">{role}</h3>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">{ROLE_TASK_HINTS[role] || '参与讨论、认领任务并补齐交付。'}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => window.open(demand.issueUrl, '_blank')}
                  className="rounded-xl bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
                >
                  认领这个任务
                </button>
                <button
                  type="button"
                  onClick={() => window.open(demand.issueUrl, '_blank')}
                  className="rounded-xl border border-border px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-white"
                >
                  加入讨论
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate?.('volunteer-apply')}
                  className="rounded-xl border border-border px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-white"
                >
                  提交反馈
                </button>
                <button
                  type="button"
                  onClick={() => window.open('https://github.com/guyuan9300/yiyu-thinktank-workbench', '_blank')}
                  className="rounded-xl border border-border px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-white"
                >
                  查看贡献指南
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-2">
        <DetailCard title="真实场景描述" content={demand.detail.sceneDescription} />
        <DetailCard title="当前做法" content={demand.detail.currentApproach} />
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-3">
        <ListCard title="当前问题清单" items={demand.detail.problems} emptyLabel="尚未补充问题清单" />
        <ListCard title="希望实现的功能" items={demand.detail.expectedFeatures} emptyLabel="尚未补充目标功能" />
        <ListCard title="验收标准" items={demand.detail.acceptanceCriteria} emptyLabel="尚未补充验收标准" />
      </section>

      <section className="mt-6 rounded-[24px] border border-border/40 bg-white/90 p-6">
        <h2 className="text-lg font-semibold text-foreground">这个议题如何接入组织记忆与工作台？</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <DataMapCard title="涉及数据对象" content={mapping.dataObjects} fallback="待补充" />
          <DataMapCard title="关键关系" content={mapping.relationships} fallback="待补充" />
          <DataMapCard title="需要计算" content={mapping.computedMetrics} fallback="待补充" />
          <DataMapCard title="目标工作台" content={mapping.targetWorkbench ? [mapping.targetWorkbench] : []} fallback="待补充" />
          <DataMapCard title="数据输入" content={mapping.dataInputs} fallback="待补充" />
          <DataMapCard title="数据输出" content={mapping.dataOutputs} fallback="待补充" />
          <DataMapCard title="数据回流" content={mapping.dataFeedbackLoop} fallback="待补充" />
          <DataMapCard title="可复用潜力" content={mapping.reusablePotential ? [mapping.reusablePotential] : []} fallback="待补充" />
        </div>
        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          <span className="rounded-full border border-border bg-background px-3 py-1 text-muted-foreground">隐私等级：{mapping.privacyLevel}</span>
          {mapping.contributionLayers.length > 0 ? (
            mapping.contributionLayers.map((layer) => (
              <span key={`layer-${layer}`} className="rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-primary">
                {getContributionLayerLabel(layer)}
              </span>
            ))
          ) : (
            <span className="rounded-full border border-border bg-background px-3 py-1 text-muted-foreground">贡献层级：待补充</span>
          )}
        </div>
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-2">
        <ListCard title="这个问题正在消耗什么？" items={consumptionItems} emptyLabel="待补充消耗说明" />
        <ListCard title="这个能力可以沉淀什么？" items={preserveItems} emptyLabel="待补充沉淀项" />
      </section>

      <section className="mt-6 rounded-[24px] border border-border/40 bg-white/90 p-6">
        <h2 className="text-lg font-semibold text-foreground">建议拆分任务</h2>
        <div className="mt-4 space-y-3">
          {demand.detail.tasks.length === 0 ? (
            <div className="rounded-2xl border border-border/40 bg-background px-4 py-3 text-sm text-muted-foreground">该需求还在整理阶段，暂未拆分子任务。</div>
          ) : (
            demand.detail.tasks.map((task) => (
              <article key={task.id} className="rounded-2xl border border-border/40 bg-background px-4 py-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-foreground">{task.title}</h3>
                  <span className="rounded-full border border-border bg-white px-3 py-1 text-xs text-muted-foreground">{task.status}</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full border border-border bg-white px-3 py-1 text-muted-foreground">
                    难度：{getDemandDifficultyLabel(task.difficulty)}
                  </span>
                  {task.roleNeeded.map((role) => (
                    <span key={`${task.id}-${role}`} className="rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-primary">
                      {getNeededRoleLabel(role)}
                    </span>
                  ))}
                  {task.assignee ? (
                    <span className="rounded-full border border-border bg-white px-3 py-1 text-muted-foreground">认领人：{task.assignee}</span>
                  ) : null}
                  {task.estimate ? (
                    <span className="rounded-full border border-border bg-white px-3 py-1 text-muted-foreground">预计：{task.estimate}</span>
                  ) : null}
                </div>
              </article>
            ))
          )}
        </div>
      </section>

      <section className="mt-6 rounded-[24px] border border-border/40 bg-white/90 p-6">
        <h2 className="text-lg font-semibold text-foreground">关联链接</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          {demand.detail.links.length === 0 ? (
            <span className="text-sm text-muted-foreground">暂未补充关联链接。</span>
          ) : (
            demand.detail.links.map((link) => (
              <button
                key={`${link.label}-${link.url}`}
                type="button"
                onClick={() => window.open(link.url, '_blank')}
                className="inline-flex items-center gap-2 rounded-2xl border border-border px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted"
              >
                {link.label}
                <ExternalLink className="h-4 w-4" />
              </button>
            ))
          )}
        </div>
      </section>
    </>
  );
}

function DetailCard({ title, content }: { title: string; content: string }) {
  return (
    <article className="rounded-[24px] border border-border/40 bg-white/90 p-6">
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      <p className="mt-3 text-sm leading-7 text-muted-foreground">{content}</p>
    </article>
  );
}

function ListCard({
  title,
  items,
  emptyLabel,
}: {
  title: string;
  items: string[];
  emptyLabel: string;
}) {
  return (
    <article className="rounded-[24px] border border-border/40 bg-white/90 p-6">
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      {items.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">{emptyLabel}</p>
      ) : (
        <ul className="mt-3 space-y-2 text-sm leading-7 text-foreground/85">
          {items.map((item) => (
            <li key={`${title}-${item}`} className="flex items-start gap-2">
              <span className="mt-2 h-1.5 w-1.5 rounded-full bg-primary" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}

function DataMapCard({ title, content, fallback }: { title: string; content: string[]; fallback: string }) {
  return (
    <div className="rounded-2xl border border-border/40 bg-background p-4">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {content.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">{fallback}</p>
      ) : (
        <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
          {content.map((item) => (
            <li key={`${title}-${item}`} className="flex items-start gap-2">
              <span className="mt-2 h-1.5 w-1.5 rounded-full bg-primary" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
