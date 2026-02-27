import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Sparkles,
  Compass,
  Target,
  CalendarClock,
  TrendingUp,
  FileText,
  BookOpen,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Header } from './Header';
import { getClientProjects, getStrategyCompanionData } from '../lib/dataServiceLocal';

type SectionKey = 'timeline' | 'northstar' | 'quarterly' | 'kpi' | 'updates' | 'resources' | 'academy';

const fallbackTimeline = [
  { title: '战略启动', date: '2024年1月', done: true },
  { title: '能力诊断', date: '2024年3月', done: true },
  { title: '战略共创', date: '2024年6月', done: false, current: true },
  { title: '执行赋能', date: '2024年9月', done: false },
  { title: '复盘迭代', date: '2024年12月', done: false },
];

const cardBase = 'bg-white/88 backdrop-blur-sm rounded-[22px] border border-slate-200/70 shadow-[0_8px_28px_rgba(15,23,42,0.04)]';
const ADMIN_OVERRIDE_STORAGE_KEY = 'yiyu_strategy_companion_admin_overrides_v1';

function withBase(path: string) {
  const base = import.meta.env.BASE_URL || '/';
  return `${base}${path.replace(/^\//, '')}`;
}

function getClientCoverImage(client: { clientName?: string; logoUrl?: string } | null | undefined) {
  if (client?.logoUrl) return client.logoUrl;
  const name = (client?.clientName || '').trim();
  const map: Record<string, string> = {
    '蓝信封': 'images/cases/blue-letter.png',
    '中国乡村发展基金会': 'images/cases/china-rural-foundation.png',
    '愿景资本': 'images/cases/vision-capital.png',
    '日慈基金会': 'images/cases/rici-foundation.png',
    '贝石公益基金会': 'images/cases/beike-foundation.png',
    '贝壳公益基金会': 'images/cases/beike-foundation.png',
    '蔚来汽车': 'images/cases/nio.png'
  };
  return withBase(map[name] || 'images/placeholders/client-default.svg');
}

export function StrategyCompanionConceptPage({ onNavigate }: { onNavigate?: (page: string) => void }) {
  const [open, setOpen] = useState<Record<SectionKey, boolean>>({
    timeline: true,
    northstar: true,
    quarterly: true,
    kpi: true,
    updates: true,
    resources: true,
    academy: true,
  });
  const [clients, setClients] = useState<any[]>([]);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [strategyData, setStrategyData] = useState<any>(null);
  const [adminOverrides, setAdminOverrides] = useState<any>({});

  useEffect(() => {
    let mounted = true;
    (async () => {
      const list = await getClientProjects();
      if (!mounted) return;
      setClients(list || []);

      const params = new URLSearchParams(window.location.search);
      const fromUrl = params.get('clientId') || '';
      const defaultId = fromUrl || (list?.[0]?.id ?? '');
      setSelectedClientId(defaultId);
    })();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedClientId) return;
    let mounted = true;
    (async () => {
      const data = await getStrategyCompanionData(selectedClientId);
      if (!mounted) return;
      setStrategyData(data);

      const params = new URLSearchParams(window.location.search);
      params.set('page', 'strategy-companion');
      params.set('clientId', selectedClientId);
      window.history.replaceState({}, '', `?${params.toString()}`);
    })();

    return () => {
      mounted = false;
    };
  }, [selectedClientId]);

  useEffect(() => {
    const loadOverrides = () => {
      try {
        const raw = localStorage.getItem(ADMIN_OVERRIDE_STORAGE_KEY);
        setAdminOverrides(raw ? JSON.parse(raw) : {});
      } catch {
        setAdminOverrides({});
      }
    };

    const onStorage = (e: StorageEvent) => {
      if (!e.key || e.key === ADMIN_OVERRIDE_STORAGE_KEY) loadOverrides();
    };

    loadOverrides();
    window.addEventListener('yiyu_data_change', loadOverrides);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('yiyu_data_change', loadOverrides);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const selectedClient = useMemo(
    () => clients.find((c) => c.id === selectedClientId) || clients[0] || null,
    [clients, selectedClientId]
  );

  const clientName = (selectedClient?.clientName || '').trim();
  const heroOverride = adminOverrides?.overrideHero?.[clientName];
  const northOverride = adminOverrides?.overrideNorth?.[clientName];
  const timelineOverride = adminOverrides?.overrideTimeline?.[clientName];
  const goalsOverride = adminOverrides?.overrideGoals?.[clientName];
  const recentOverride = adminOverrides?.overrideRecent?.[clientName];
  const docsOverride = adminOverrides?.overrideDocs?.[clientName] || adminOverrides?.extraDocs?.[clientName];
  const meetingsOverride = adminOverrides?.overrideMeetings?.[clientName] || adminOverrides?.extraMeetings?.[clientName];
  const learningOverride = adminOverrides?.extraLearning?.[clientName];

  const milestones = (timelineOverride
    ? timelineOverride.map((x: any) => ({
        title: x.stage,
        date: x.date,
        done: x.status === 'done',
        current: x.status === 'current',
      }))
    : (strategyData?.milestones || fallbackTimeline)
  ).slice(0, 5);
  const quarterly = strategyData?.quarterlyPlan || { q1: [], q2: [], q3: [], q4: [] };
  const goals = ((goalsOverride || strategyData?.goals || []) as any[])
    .map((g: any) => ({ ...g, description: g.description || g.oneLiner || '' }))
    .slice(0, 3);
  const events = ((recentOverride || strategyData?.events || []) as any[])
    .map((e: any) => ({ ...e, description: e.description || e.scope || '', type: e.type || '更新' }))
    .slice(0, 4);
  const documents = (docsOverride || strategyData?.documents || []).slice(0, 3);
  const meetings = ((meetingsOverride || strategyData?.meetings || []) as any[])
    .map((m: any) => ({ ...m, participants: m.participants || m.people || m.attendees || '-' }))
    .slice(0, 1);
  const courses = ((learningOverride || strategyData?.courseRecommendations || []) as any[])
    .map((c: any) => ({ ...c, description: c.description || c.summary || '' }))
    .slice(0, 3);

  const values = heroOverride?.values?.length
    ? heroOverride.values
    : selectedClient?.values?.length
    ? selectedClient.values
    : ['深度陪伴', '系统思维', '价值共创', '长期主义'];

  const mission = heroOverride?.mission || selectedClient?.mission || '支持乡村儿童心理健康与成长';
  const vision = heroOverride?.vision || selectedClient?.vision || '让更多乡村儿童获得持续、温暖、可及的心理陪伴';

  const toggle = (k: SectionKey) => setOpen((s) => ({ ...s, [k]: !s[k] }));

  const SectionHeader = ({ icon, title, subtitle, section }: { icon: ReactNode; title: string; subtitle: string; section: SectionKey }) => (
    <button onClick={() => toggle(section)} className="w-full flex items-center justify-between mb-5 text-left">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-slate-100/80 text-slate-600 grid place-items-center">{icon}</div>
        <div>
          <h2 className="text-[19px] font-semibold tracking-[-0.01em] text-slate-800">{title}</h2>
          <p className="text-[13px] text-slate-500 mt-0.5">{subtitle}</p>
        </div>
      </div>
      {open[section] ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
    </button>
  );

  return (
    <div className="min-h-screen bg-[#F7F8FA]">
      <Header isLoggedIn userType="client" onNavigate={onNavigate} />

      <main className="max-w-6xl mx-auto px-6 sm:px-8 lg:px-10 pt-24 pb-20 space-y-12 lg:space-y-14">
        <section className={`${cardBase} p-8 sm:p-10 lg:p-12`}>
          <div className="flex flex-wrap items-center justify-between gap-4 mb-7">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl overflow-hidden border border-slate-200 bg-white">
                <img src={getClientCoverImage(selectedClient)} alt="" className="w-full h-full object-cover" />
              </div>
              <div className="w-1 h-8 bg-blue-500 rounded-full" />
              <h1 className="text-[28px] sm:text-[34px] tracking-[-0.02em] font-semibold text-slate-900">
                {selectedClient?.clientName || '战略客户'}
              </h1>
            </div>

            <div className="min-w-[220px]">
              <p className="text-[11px] uppercase tracking-[0.14em] text-slate-400 mb-2">当前客户</p>
              <select
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-[14px] text-slate-700"
              >
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.clientName}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="max-w-4xl">
            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400 mb-3">Strategic Companion</p>
            <p className="text-[17px] sm:text-[19px] italic text-slate-500 mb-1">「当你静下来，才能看见更远的路」</p>
            <p className="text-[14px] text-slate-400 mb-6">每当迷茫时，回到这里，思考你的使命、愿景、价值观</p>
            <h2 className="text-[34px] sm:text-[40px] leading-[1.25] tracking-[-0.02em] font-semibold text-slate-900 mb-7">{mission}</h2>
            <p className="text-[27px] sm:text-[31px] leading-[1.35] tracking-[-0.015em] font-medium text-slate-700 mb-7">{vision}</p>
            <div className="flex flex-wrap gap-2.5">
              {values.map((v: string) => (
                <span key={v} className="px-4 py-2 rounded-full text-[14px] text-slate-700 border border-slate-200 bg-slate-50/90">{v}</span>
              ))}
            </div>
          </div>
        </section>

        <section className={`${cardBase} p-7 sm:p-8`}>
          <SectionHeader icon={<Compass className="w-4 h-4" />} title="Strategic Timeline" subtitle="战略路径与当前阶段" section="timeline" />
          {open.timeline && (
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-5 sm:gap-3">
              {milestones.map((t: any, i: number) => {
                const current = t.status === 'in-progress' || t.current;
                const done = t.status === 'completed' || t.done;
                return (
                  <div key={t.id || t.title} className="relative pt-5 sm:pt-7">
                    {i < milestones.length - 1 && <div className="hidden sm:block absolute left-1/2 top-9 w-full h-px bg-slate-200" />}
                    <div className={`relative z-10 w-4 h-4 rounded-full border-2 ${current ? 'border-blue-500 shadow-[0_0_0_4px_rgba(59,130,246,.15)]' : done ? 'border-blue-500 bg-blue-500' : 'border-slate-300 bg-white'}`} />
                    <p className="mt-3 text-[14px] font-medium text-slate-800">{t.title}</p>
                    <p className="text-[12px] text-slate-500">{t.date}</p>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className={`${cardBase} p-7 sm:p-8`}>
          <SectionHeader icon={<Target className="w-4 h-4" />} title="North Star & Annual Objectives" subtitle="北极星目标与年度主线" section="northstar" />
          {open.northstar && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              <div className="lg:col-span-7 rounded-2xl bg-blue-50/60 border border-blue-100/70 p-6">
                <p className="text-[11px] uppercase tracking-[0.16em] text-blue-500 mb-2">North Star</p>
                <h3 className="text-[22px] leading-[1.35] font-semibold text-slate-800">{northOverride?.northStar || selectedClient?.northStarMetric || '把战略变成可持续执行的组织能力'}</h3>
              </div>
              <div className="lg:col-span-5 grid gap-3">
                {((northOverride?.annualDeliverables?.length ? northOverride.annualDeliverables : (selectedClient?.yearlyDeliverables?.length ? selectedClient.yearlyDeliverables : ['组织节奏重建', '战略项目打通', '数据化复盘机制']))).slice(0, 3).map((x: string) => (
                  <div key={x} className="rounded-2xl border border-slate-200/70 bg-white p-4 text-[14px] text-slate-700">{x}</div>
                ))}
              </div>
            </div>
          )}
        </section>

        <section className={`${cardBase} p-7 sm:p-8`}>
          <SectionHeader icon={<CalendarClock className="w-4 h-4" />} title="Quarterly Milestones & Deadlines" subtitle="季度节奏与交付进展" section="quarterly" />
          {open.quarterly && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {(['q1', 'q2', 'q3', 'q4'] as const).map((qKey, idx) => {
                const items = (quarterly?.[qKey] || []) as string[];
                const progress = Math.min(100, Math.max(8, Math.round((items.length / 4) * 100)));
                return (
                  <div key={qKey} className="rounded-2xl border border-slate-200/70 bg-slate-50/70 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-[13px] font-semibold text-slate-800">Q{idx + 1}</p>
                      <p className="text-[12px] text-slate-500">{progress}%</p>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-200 mb-3"><div className="h-1.5 rounded-full bg-blue-500" style={{ width: `${progress}%` }} /></div>
                    <ul className="space-y-1.5 text-[13px] text-slate-700">
                      {(items.length ? items : ['（待填写）']).slice(0, 3).map((it, i) => <li key={i}>• {it}</li>)}
                    </ul>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className={`${cardBase} p-7 sm:p-8`}>
          <SectionHeader icon={<TrendingUp className="w-4 h-4" />} title="Focus Goals & KPIs" subtitle="重点目标卡片" section="kpi" />
          {open.kpi && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {(goals.length ? goals : [{ title: '品牌影响力', progress: 65, description: '聚焦高质量触达与认知建设' }]).slice(0, 3).map((k: any, idx: number) => (
                <div key={k.id || idx} className="rounded-2xl border border-slate-200/70 bg-white p-5">
                  <p className="text-[15px] font-semibold text-slate-800 mb-3">{k.title}</p>
                  <div className="h-2 rounded-full bg-slate-200 mb-3"><div className="h-2 rounded-full bg-blue-500" style={{ width: `${k.progress || 40}%` }} /></div>
                  <p className="text-[12px] text-slate-500 mb-2">进度 {k.progress || 40}%</p>
                  <p className="text-[13px] text-slate-600">{k.description || '目标描述待完善'}</p>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className={`${cardBase} p-7 sm:p-8`}>
          <SectionHeader icon={<Sparkles className="w-4 h-4" />} title="Recent Updates & Activities" subtitle="最近动态，不离开主上下文" section="updates" />
          {open.updates && (
            <div className="space-y-3">
              {(events.length ? events : [{ title: '暂无动态', date: '-', type: '公告', description: '请在后台添加动态内容。' }]).map((u: any, idx: number) => (
                <div key={u.id || idx} className="rounded-2xl border border-slate-200/70 bg-white p-4">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[14px] font-medium text-slate-800">{u.title}</p>
                    <span className="text-[12px] text-slate-500">{u.date}</span>
                  </div>
                  <p className="text-[12px] text-blue-500 mb-1">{u.type || '更新'}</p>
                  <p className="text-[13px] text-slate-600">{u.description || '—'}</p>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className={`${cardBase} p-7 sm:p-8`}>
          <SectionHeader icon={<FileText className="w-4 h-4" />} title="Document Resources & Meeting Records" subtitle="文档与会议，轻量访问" section="resources" />
          {open.resources && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div className="space-y-3">
                {(documents.length ? documents : [{ title: '暂无文档资源' }]).slice(0, 3).map((f: any, idx: number) => (
                  <div key={f.id || idx} className="rounded-2xl border border-slate-200/70 bg-white p-4 text-[14px] text-slate-700">{f.title}</div>
                ))}
              </div>
              <div className="rounded-2xl border border-slate-200/70 bg-slate-50/70 p-5">
                <p className="text-[14px] font-medium text-slate-800 mb-2">会议记录</p>
                <p className="text-[13px] text-slate-600">{meetings[0] ? `${meetings[0].date} · ${meetings[0].duration} · ${meetings[0].participants}人参与 · ${meetings[0].title}` : '暂无会议记录'}</p>
              </div>
            </div>
          )}
        </section>

        <section className={`${cardBase} p-7 sm:p-8`}>
          <SectionHeader icon={<BookOpen className="w-4 h-4" />} title="Learning Academy" subtitle="从战略思考自然过渡到学习" section="academy" />
          {open.academy && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {(courses.length ? courses : [{ title: '组织系统设计' }, { title: 'AI 时代管理者学习路径' }, { title: '战略复盘方法论' }]).slice(0, 3).map((a: any, idx: number) => (
                <article key={a.id || idx} className="rounded-2xl border border-indigo-100/80 bg-indigo-50/40 p-5">
                  <p className="text-[15px] font-semibold text-slate-800 mb-2">{a.title}</p>
                  <p className="text-[13px] text-slate-600 mb-4">{a.description || '面向当前阶段的精选内容，帮助从思考走向行动。'}</p>
                  <button className="text-[13px] text-indigo-600 font-medium">Read More</button>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
