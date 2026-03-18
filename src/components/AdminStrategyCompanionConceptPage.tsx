import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  AlertCircle,
  CalendarClock,
  CheckCircle,
  ClipboardList,
  Clock3,
  Files,
  Globe,
  GraduationCap,
  LayoutGrid,
  LogOut,
  MessageSquare,
  Plus,
  Sparkles,
  Upload,
} from 'lucide-react';
import { Header } from './Header';
import AdminCaseShowcaseManager from './AdminCaseShowcaseManager';
import {
  PUBLIC_STRATEGY_SHOWCASE,
  fetchStrategyProjectSnapshot,
  fetchStrategyProjects,
  publishStrategyProject,
  saveStrategyProjectSnapshot,
  type StrategyAccessMode,
  type StrategyDocumentItem,
  type StrategyGoalItem,
  type StrategyLearningResource,
  type StrategyMeetingItem,
  type StrategyProjectSnapshot,
  type StrategyProjectSummary,
  type StrategyRecentEvent,
  type StrategyTimelineItem,
} from '../lib/strategyCompanionApi';

type Mode = 'immersive' | 'work';
type AdminSurface = 'companion' | 'cases';

const card = 'bg-white/92 backdrop-blur-sm rounded-[22px] border border-slate-200/70 shadow-[0_8px_28px_rgba(15,23,42,0.045)]';

type Props = {
  onNavigate?: (page: string) => void;
  onNavigateHome?: () => void;
  onLogout?: () => void;
  showHeader?: boolean;
  viewMode?: 'admin' | 'frontend';
  accessMode?: StrategyAccessMode;
  initialProjectId?: string;
};

function cloneSnapshot(snapshot: StrategyProjectSnapshot): StrategyProjectSnapshot {
  return JSON.parse(JSON.stringify(snapshot)) as StrategyProjectSnapshot;
}

function isValidLink(link?: string) {
  const value = String(link || '').trim();
  return /^(https?:)?\/\//i.test(value) || value.startsWith('mailto:');
}

function patchArrayItem<T>(list: T[], index: number, patch: Partial<T>) {
  return list.map((item, currentIndex) => (currentIndex === index ? { ...item, ...patch } : item));
}

function emptyTimelineItem(): StrategyTimelineItem {
  return { stage: '新阶段', date: '待定', status: 'pending', detail: '请补充该阶段说明。' };
}

function emptyGoalItem(): StrategyGoalItem {
  return { title: '新目标', oneLiner: '请补充目标简述。', progress: 0, kpis: ['请补充分解目标'], risks: ['请补充风险'] };
}

function emptyRecentEvent(): StrategyRecentEvent {
  return {
    title: '近期事项',
    date: new Date().toISOString().slice(0, 10),
    duration: '90 分钟',
    people: '待补充',
    scope: '请补充近期事项简述。',
    doneItems: ['请补充本次事项目标'],
    valueItems: ['请补充本次事项价值'],
  };
}

function emptyDocument(): StrategyDocumentItem {
  return {
    title: '未命名文档',
    date: new Date().toISOString().slice(0, 10),
    desc: '请补充文档说明。',
    link: '',
  };
}

function emptyMeeting(): StrategyMeetingItem {
  return {
    title: '未命名会议',
    date: new Date().toISOString().slice(0, 10),
    duration: '90 分钟',
    attendees: '待补充',
    keyPeople: '待补充',
    topic: '待补充',
    link: '',
  };
}

function emptyLearningResource(): StrategyLearningResource {
  return {
    title: '未命名资源',
    summary: '请补充资源摘要。',
    relation: '关联目标：待补充',
    detail: ['请补充资源说明'],
    kind: '文章',
    link: '',
    sourceType: 'manual',
  };
}

function buildEmptyStrategySnapshot(projectId: string, clientName: string): StrategyProjectSnapshot {
  return {
    project: {
      id: projectId,
      clientName,
      projectName: `${clientName}战略陪伴`,
      description: '',
      slug: projectId,
      logoUrl: '',
      isPublished: false,
    },
    hero: {
      mission: `${clientName}的战略重点与陪伴节奏`,
      vision: '请补充该机构的愿景与长期方向。',
      values: ['请补充价值观'],
    },
    north: {
      northStar: '请补充年度北极星',
      northStarMetrics: ['请补充北极星指标'],
      annualDeliverables: ['请补充年度交付'],
      next14Days: ['请补充 14 天内动作'],
    },
    timeline: [emptyTimelineItem()],
    goals: [emptyGoalItem()],
    latest: [emptyRecentEvent()],
    docs: [emptyDocument()],
    meetings: [emptyMeeting()],
    learning: [emptyLearningResource()],
  };
}

function renderActionLink(item: { link?: string }, children: ReactNode) {
  if (!isValidLink(item.link)) {
    return (
      <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-3.5 opacity-70 cursor-not-allowed">
        {children}
      </div>
    );
  }
  return (
    <a
      href={item.link}
      target="_blank"
      rel="noreferrer"
      className="block rounded-2xl border border-slate-100 bg-slate-50/60 p-3.5 hover:border-blue-200 hover:bg-blue-50/40 transition-colors"
    >
      {children}
    </a>
  );
}

function SectionHeader({
  title,
  subtitle,
  icon,
  action,
}: {
  title: string;
  subtitle: string;
  icon: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="w-full flex items-center justify-between mb-5 text-left">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-600 grid place-items-center">{icon}</div>
        <div>
          <h2 className="text-[19px] font-semibold tracking-[-0.01em] text-slate-800">{title}</h2>
          {subtitle ? <p className="text-[13px] text-slate-500">{subtitle}</p> : null}
        </div>
      </div>
      {action}
    </div>
  );
}

export default function AdminStrategyCompanionConceptPage({
  onNavigate,
  onNavigateHome,
  onLogout,
  showHeader = true,
  viewMode = 'admin',
  accessMode = 'admin',
  initialProjectId = '',
}: Props) {
  const isFrontend = viewMode === 'frontend';
  const canEdit = !isFrontend;
  const canSelectPublishedOnly = isFrontend && accessMode === 'admin';
  const [adminSurface, setAdminSurface] = useState<AdminSurface>('companion');
  const [mode, setMode] = useState<Mode>('immersive');
  const [projectOptions, setProjectOptions] = useState<StrategyProjectSummary[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState(initialProjectId);
  const [snapshot, setSnapshot] = useState<StrategyProjectSnapshot | null>(isFrontend && accessMode === 'public' ? cloneSnapshot(PUBLIC_STRATEGY_SHOWCASE) : null);
  const [loading, setLoading] = useState(isFrontend && accessMode !== 'public');
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const adminHeaderDate = useMemo(
    () => new Intl.DateTimeFormat('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
    }).format(new Date()),
    []
  );

  useEffect(() => {
    if (isFrontend) {
      setMode('immersive');
    }
  }, [isFrontend]);

  useEffect(() => {
    let canceled = false;

    if (isFrontend && accessMode === 'public') {
      setProjectOptions([]);
      setSnapshot(cloneSnapshot(PUBLIC_STRATEGY_SHOWCASE));
      setSelectedProjectId('');
      setLoading(false);
      return () => {
        canceled = true;
      };
    }

    const loadProjects = async () => {
      setLoading(true);
      const scope = canEdit ? 'admin' : 'published';
      const result = await fetchStrategyProjects(scope);
      if (canceled) return;

      const list = result.ok && result.data ? result.data : [];
      setProjectOptions(list);
      const nextProjectId = initialProjectId && list.some((item) => item.id === initialProjectId)
        ? initialProjectId
        : list[0]?.id || '';
      setSelectedProjectId(nextProjectId);
      setLoading(false);
    };

    void loadProjects();
    return () => {
      canceled = true;
    };
  }, [accessMode, canEdit, initialProjectId, isFrontend]);

  useEffect(() => {
    let canceled = false;

    if (!selectedProjectId) {
      if (!isFrontend || accessMode !== 'public') {
        setSnapshot(null);
      }
      return () => {
        canceled = true;
      };
    }

    const loadSnapshot = async () => {
      setLoading(true);
      const result = await fetchStrategyProjectSnapshot(selectedProjectId, canEdit || accessMode !== 'public');
      if (canceled) return;

      if (!result.ok || !result.data) {
        setSnapshot(null);
        setMessage({ type: 'error', text: result.error || '机构战略陪伴内容加载失败。' });
        setLoading(false);
        return;
      }

      setSnapshot(cloneSnapshot(result.data));
      setLoading(false);
    };

    void loadSnapshot();
    return () => {
      canceled = true;
    };
  }, [accessMode, canEdit, isFrontend, selectedProjectId]);

  const currentProject = snapshot?.project;

  const saveAndPublishSnapshot = async () => {
    if (!snapshot?.project?.id) return;
    setSaving(true);
    setMessage(null);

    const saveResult = await saveStrategyProjectSnapshot(snapshot.project.id, snapshot);
    if (!saveResult.ok || !saveResult.data) {
      setSaving(false);
      setMessage({ type: 'error', text: saveResult.error || '战略陪伴内容保存失败。' });
      return;
    }

    let nextSnapshot = cloneSnapshot(saveResult.data);

    if (!nextSnapshot.project.isPublished) {
      const publishResult = await publishStrategyProject(snapshot.project.id, true);
      if (!publishResult.ok || !publishResult.data) {
        setSaving(false);
        setSnapshot(nextSnapshot);
        setProjectOptions((prev) => prev.map((item) => (item.id === nextSnapshot.project.id ? { ...item, ...nextSnapshot.project } : item)));
        setMessage({ type: 'error', text: publishResult.error || '已保存到腾讯云，但发布到前台失败。' });
        return;
      }
      nextSnapshot = {
        ...nextSnapshot,
        project: {
          ...nextSnapshot.project,
          ...publishResult.data,
        },
      };
    }

    setSaving(false);
    setSnapshot(nextSnapshot);
    setProjectOptions((prev) => prev.map((item) => (item.id === nextSnapshot.project.id ? { ...item, ...nextSnapshot.project } : item)));
    setMessage({
      type: 'success',
      text: nextSnapshot.project.isPublished ? '战略陪伴内容已保存并同步前台。' : '战略陪伴内容已保存。',
    });
  };

  const togglePublish = async () => {
    if (!snapshot?.project?.id) return;
    setPublishing(true);
    setMessage(null);
    const nextPublish = !snapshot.project.isPublished;
    const result = await publishStrategyProject(snapshot.project.id, nextPublish);
    setPublishing(false);
    if (!result.ok || !result.data) {
      setMessage({ type: 'error', text: result.error || '发布状态更新失败。' });
      return;
    }
    setSnapshot((prev) => prev ? { ...prev, project: { ...prev.project, ...result.data } } : prev);
    setProjectOptions((prev) => prev.map((item) => (item.id === result.data?.id ? { ...item, ...result.data } : item)));
    setMessage({ type: 'success', text: result.message || '发布状态已更新。' });
  };

  const handleCreateProject = async () => {
    const clientName = window.prompt('请输入新机构名称');
    if (!clientName || !clientName.trim()) return;

    const projectId = `project_${Date.now()}`;
    const draft = buildEmptyStrategySnapshot(projectId, clientName.trim());
    setSaving(true);
    setMessage(null);
    const result = await saveStrategyProjectSnapshot(projectId, draft);
    setSaving(false);
    if (!result.ok || !result.data) {
      setMessage({ type: 'error', text: result.error || '新机构页面创建失败。' });
      return;
    }

    setSnapshot(cloneSnapshot(result.data));
    setSelectedProjectId(projectId);
    setProjectOptions((prev) => [...prev, result.data!.project]);
    setMode('work');
    setMessage({ type: 'success', text: `已创建机构页面：${clientName.trim()}` });
  };

  const handleLogoUpload = (file?: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === 'string' ? reader.result : '';
      setSnapshot((prev) => prev ? { ...prev, project: { ...prev.project, logoUrl: dataUrl } } : prev);
    };
    reader.readAsDataURL(file);
  };

  const setHero = (patch: Partial<StrategyProjectSnapshot['hero']>) => {
    setSnapshot((prev) => {
      if (!prev) return prev;
      const hero = { ...prev.hero, ...patch };
      return {
        ...prev,
        hero,
        project: {
          ...prev.project,
          mission: hero.mission,
          vision: hero.vision,
          values: hero.values,
        },
      };
    });
  };

  const setNorth = (patch: Partial<StrategyProjectSnapshot['north']>) => {
    setSnapshot((prev) => {
      if (!prev) return prev;
      const north = { ...prev.north, ...patch };
      return {
        ...prev,
        north,
        project: {
          ...prev.project,
          northStar: north.northStar,
          northStarMetrics: north.northStarMetrics,
          annualDeliverables: north.annualDeliverables,
          next14Days: north.next14Days,
        },
      };
    });
  };

  const spacing = mode === 'immersive' ? 'space-y-12 lg:space-y-14' : 'space-y-8';

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F7F7F5]">
        {showHeader ? <Header isLoggedIn userType="client" onNavigate={onNavigate} /> : null}
        <main className={`max-w-6xl mx-auto px-6 sm:px-8 lg:px-10 ${showHeader ? 'pt-24' : 'pt-6'} pb-20`}>
          <div className={`${card} p-10 text-center text-slate-500`}>正在加载战略陪伴内容…</div>
        </main>
      </div>
    );
  }

  if (!snapshot) {
    return (
      <div className="min-h-screen bg-[#F7F7F5]">
        {showHeader ? <Header isLoggedIn userType="client" onNavigate={onNavigate} /> : null}
        <main className={`max-w-6xl mx-auto px-6 sm:px-8 lg:px-10 ${showHeader ? 'pt-24' : 'pt-6'} pb-20`}>
          <div className={`${card} p-10 text-center text-slate-500`}>当前没有可展示的机构战略陪伴页面。</div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F7F5]">
      {showHeader ? <Header isLoggedIn userType="client" onNavigate={onNavigate} /> : null}

      <main className={`max-w-6xl mx-auto px-6 sm:px-8 lg:px-10 ${showHeader ? 'pt-24' : 'pt-6'} pb-20 ${spacing}`}>
        {canEdit && (
          <section className={`${card} px-5 py-5 sm:px-6 sm:py-5`}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <h1 className="text-[28px] font-semibold tracking-[-0.02em] text-slate-900">战略陪伴</h1>
                <p className="text-[14px] text-slate-500">运营中枢 · 今天是 {adminHeaderDate}</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    if (onNavigateHome) {
                      onNavigateHome();
                      return;
                    }
                    onNavigate?.('home');
                  }}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                >
                  <Globe className="w-4 h-4" />
                  回到首页
                </button>
                <button
                  type="button"
                  onClick={onLogout}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#6F61FF] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#5c4df4]"
                >
                  <LogOut className="w-4 h-4" />
                  退出登录
                </button>
              </div>
            </div>
          </section>
        )}

        {canEdit && (
          <section className={`${card} p-3 sm:p-4`}>
            <div className="inline-flex rounded-2xl border border-slate-200 bg-white p-1">
              <button
                type="button"
                onClick={() => setAdminSurface('companion')}
                className={`px-4 py-2 rounded-xl text-[13px] font-medium ${adminSurface === 'companion' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
              >
                战略陪伴
              </button>
              <button
                type="button"
                onClick={() => setAdminSurface('cases')}
                className={`px-4 py-2 rounded-xl text-[13px] font-medium ${adminSurface === 'cases' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
              >
                案例展示
              </button>
            </div>
          </section>
        )}

        {canEdit && adminSurface === 'cases' ? (
          <AdminCaseShowcaseManager />
        ) : (
          <>
        {message && (
          <div className={`rounded-2xl border px-4 py-3 text-sm ${message.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-red-50 border-red-100 text-red-700'}`}>
            {message.text}
          </div>
        )}

        {(canEdit || canSelectPublishedOnly) && (
          <section className={`${card} p-5 sm:p-6`}>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap items-center gap-3">
                {projectOptions.length > 0 && (
                  <select
                    className="px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-[14px]"
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                  >
                    {projectOptions.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.clientName}{item.isPublished ? '' : '（未发布）'}
                      </option>
                    ))}
                  </select>
                )}
                {canEdit && (
                  <>
                    <button
                      onClick={handleCreateProject}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white text-[13px] font-medium text-slate-700 hover:bg-slate-50"
                    >
                      <Plus className="w-4 h-4" />
                      新建机构页面
                    </button>
                    <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1">
                      <button onClick={() => setMode('immersive')} className={`px-3 py-1.5 rounded-lg text-[13px] ${mode === 'immersive' ? 'bg-slate-900 text-white' : 'text-slate-600'}`}>沉浸模式</button>
                    <button onClick={() => setMode('work')} className={`px-3 py-1.5 rounded-lg text-[13px] ${mode === 'work' ? 'bg-slate-900 text-white' : 'text-slate-600'}`}>编辑模式</button>
                    </div>
                    <button onClick={saveAndPublishSnapshot} disabled={saving} className="px-4 py-2 rounded-xl bg-blue-600 text-white text-[13px] font-medium hover:bg-blue-700 disabled:opacity-60">
                      {saving ? '保存并发布中…' : snapshot.project.isPublished ? '保存并同步前台' : '保存并发布到前台'}
                    </button>
                    {snapshot.project.isPublished ? (
                      <button onClick={togglePublish} disabled={publishing} className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-[13px] font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60">
                        {publishing ? '处理中…' : '取消发布'}
                      </button>
                    ) : null}
                  </>
                )}
              </div>
              {canSelectPublishedOnly && (
                <div className="text-sm text-slate-500">管理员前台视角仅展示已发布机构。</div>
              )}
            </div>
          </section>
        )}

        <section className={`${card} p-10 sm:p-12 bg-gradient-to-b from-white to-slate-50/70 border-slate-200/80`}>
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between mb-10">
            <div className="flex items-start gap-4">
              {currentProject?.logoUrl ? (
                <img src={currentProject.logoUrl} alt={currentProject.clientName} className="w-14 h-14 rounded-2xl object-cover border border-slate-100" />
              ) : (
                <div className="w-14 h-14 rounded-2xl bg-slate-100" />
              )}
              <div className="space-y-2">
                {mode === 'work' && canEdit ? (
                  <div className="flex flex-col gap-2">
                    <input
                      value={snapshot.project.clientName}
                      onChange={(e) => setSnapshot((prev) => prev ? { ...prev, project: { ...prev.project, clientName: e.target.value, projectName: e.target.value || prev.project.projectName } } : prev)}
                      className="px-4 py-2 rounded-2xl border border-slate-200 text-[28px] sm:text-[32px] font-semibold tracking-[-0.02em] text-slate-900 bg-white"
                    />
                    <div className="flex flex-wrap items-center gap-3">
                      <input
                        ref={logoInputRef}
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleLogoUpload(e.target.files?.[0] || null)}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => logoInputRef.current?.click()}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 hover:bg-slate-50"
                      >
                        <Upload className="w-4 h-4" />
                        {snapshot.project.logoUrl ? '更换 Logo' : '上传 Logo'}
                      </button>
                      {snapshot.project.logoUrl ? (
                        <button
                          type="button"
                          onClick={() => setSnapshot((prev) => prev ? { ...prev, project: { ...prev.project, logoUrl: '' } } : prev)}
                          className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 hover:bg-slate-50"
                        >
                          移除 Logo
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={handleCreateProject}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 hover:bg-slate-50"
                      >
                        <Plus className="w-4 h-4" />
                        新建机构页面
                      </button>
                    </div>
                  </div>
                ) : (
                  <h2 className="text-[40px] sm:text-[44px] leading-none font-semibold tracking-[-0.02em] text-slate-900">{currentProject?.clientName}</h2>
                )}
                {currentProject?.description ? <p className="text-sm text-slate-500">{currentProject.description}</p> : null}
              </div>
            </div>
          </div>

          <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400 mb-4">Strategic Companion</p>
          {mode === 'work' && canEdit ? (
            <textarea
              value={snapshot.hero.mission}
              onChange={(e) => setHero({ mission: e.target.value })}
              className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-[46px] sm:text-[50px] leading-[1.16] tracking-[-0.028em] font-semibold text-slate-900 mb-10 bg-white"
            />
          ) : (
            <h2 className="text-[46px] sm:text-[50px] leading-[1.16] tracking-[-0.028em] font-semibold text-slate-900 mb-10">{snapshot.hero.mission}</h2>
          )}

          {mode === 'work' && canEdit ? (
            <textarea
              value={snapshot.hero.vision}
              onChange={(e) => setHero({ vision: e.target.value })}
              className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-[34px] sm:text-[36px] leading-[1.3] tracking-[-0.015em] font-medium text-slate-700 mb-10 bg-white"
            />
          ) : (
            <p className="text-[34px] sm:text-[36px] leading-[1.3] tracking-[-0.015em] font-medium text-slate-700 mb-10">{snapshot.hero.vision}</p>
          )}

          {mode === 'work' && canEdit ? (
            <textarea
              value={snapshot.hero.values.join('\n')}
              onChange={(e) => setHero({ values: e.target.value.split('\n').map((item) => item.trim()).filter(Boolean) })}
              className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-[14px] text-slate-700 min-h-[120px]"
              placeholder="每行一个价值观"
            />
          ) : (
            <div className="flex flex-wrap gap-3 mb-2">
              {snapshot.hero.values.map((value) => (
                <span key={value} className="px-5 py-2.5 rounded-full border border-blue-100 bg-white/90 text-[16px] text-slate-700 shadow-[0_1px_6px_rgba(15,23,42,0.04)]">{value}</span>
              ))}
            </div>
          )}
        </section>

        <section className={`${card} p-7 sm:p-8`}>
          <SectionHeader
            title="战略里程碑时间线（Strategic Timeline）"
            subtitle=""
            icon={<CalendarClock className="w-4 h-4" />}
            action={canEdit && mode === 'work' ? (
              <button
                onClick={() => setSnapshot((prev) => prev ? { ...prev, timeline: [...prev.timeline, emptyTimelineItem()] } : prev)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-[12px] text-slate-700 hover:bg-slate-50"
              >
                新增阶段
              </button>
            ) : undefined}
          />
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {snapshot.timeline.map((item, index) => (
              <div key={`${item.stage}-${index}`} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 relative">
                {canEdit && mode === 'work' && (
                  <button
                    onClick={() => setSnapshot((prev) => prev ? { ...prev, timeline: prev.timeline.filter((_, currentIndex) => currentIndex !== index) } : prev)}
                    className="absolute top-2 right-2 w-6 h-6 rounded-md border border-slate-200 text-slate-500 hover:bg-slate-100"
                  >
                    −
                  </button>
                )}

                {canEdit && mode === 'work' ? (
                  <div className="space-y-2">
                    <input value={item.stage} onChange={(e) => setSnapshot((prev) => prev ? { ...prev, timeline: patchArrayItem(prev.timeline, index, { stage: e.target.value }) } : prev)} className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-[13px] font-semibold" />
                    <div className="grid grid-cols-2 gap-2">
                      <input value={item.date} onChange={(e) => setSnapshot((prev) => prev ? { ...prev, timeline: patchArrayItem(prev.timeline, index, { date: e.target.value }) } : prev)} className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-[12px]" />
                      <select value={item.status} onChange={(e) => setSnapshot((prev) => prev ? { ...prev, timeline: patchArrayItem(prev.timeline, index, { status: e.target.value as StrategyTimelineItem['status'] }) } : prev)} className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-[12px] bg-white">
                        <option value="done">done</option>
                        <option value="current">current</option>
                        <option value="pending">pending</option>
                      </select>
                    </div>
                    <textarea value={item.detail} onChange={(e) => setSnapshot((prev) => prev ? { ...prev, timeline: patchArrayItem(prev.timeline, index, { detail: e.target.value }) } : prev)} className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-[13px] min-h-[90px]" />
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2 mb-2">
                      {item.status === 'done' && <CheckCircle className="w-4 h-4 text-blue-600" />}
                      {item.status === 'current' && <Clock3 className="w-4 h-4 text-amber-600" />}
                      {item.status === 'pending' && <AlertCircle className="w-4 h-4 text-slate-400" />}
                      <p className="text-[13px] font-semibold text-slate-800">{item.stage}</p>
                    </div>
                    <p className="text-[12px] text-slate-500 mb-2">{item.date}</p>
                    <p className="text-[13px] text-slate-700 leading-6">{item.detail}</p>
                  </>
                )}
              </div>
            ))}
          </div>
        </section>

        <section className={`${card} p-7 sm:p-8`}>
          <SectionHeader title="年度北极星与承诺（North Star & Commitments）" subtitle="年度北极星 + 年度交付 + 14天动作" icon={<LayoutGrid className="w-4 h-4" />} />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div className="lg:col-span-5 rounded-2xl bg-blue-50/60 border border-blue-100/80 p-5">
              <p className="text-[11px] uppercase tracking-[0.16em] text-blue-500 mb-2">North Star</p>
              {canEdit && mode === 'work' ? (
                <>
                  <textarea value={snapshot.north.northStar} onChange={(e) => setNorth({ northStar: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-[19px] leading-8 font-semibold text-slate-800 mb-3" />
                  <textarea value={snapshot.north.northStarMetrics.join('\n')} onChange={(e) => setNorth({ northStarMetrics: e.target.value.split('\n').map((item) => item.trim()).filter(Boolean) })} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-[13px] text-slate-700 min-h-[150px]" placeholder="每行一个北极星指标" />
                </>
              ) : (
                <>
                  <p className="text-[19px] leading-8 font-semibold text-slate-800 mb-4">{snapshot.north.northStar}</p>
                  <ul className="space-y-2 text-[13px] text-slate-700">{snapshot.north.northStarMetrics.map((metric) => <li key={metric}>• {metric}</li>)}</ul>
                </>
              )}
            </div>

            <div className="lg:col-span-3 rounded-2xl border border-slate-200 bg-white p-5">
              <p className="text-[12px] font-semibold text-slate-500 uppercase tracking-wider mb-3">年度关键动作</p>
              {canEdit && mode === 'work' ? (
                <textarea value={snapshot.north.next14Days.join('\n')} onChange={(e) => setNorth({ next14Days: e.target.value.split('\n').map((item) => item.trim()).filter(Boolean) })} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-[13px] text-slate-700 min-h-[240px]" />
              ) : (
                <ul className="space-y-2 text-[13px] text-slate-700 leading-6">{snapshot.north.next14Days.map((item) => <li key={item}>• {item}</li>)}</ul>
              )}
            </div>

            <div className="lg:col-span-4 rounded-2xl border border-slate-200 bg-white p-5">
              <p className="text-[12px] font-semibold text-slate-500 uppercase tracking-wider mb-3">年度关键交付物</p>
              {canEdit && mode === 'work' ? (
                <textarea value={snapshot.north.annualDeliverables.join('\n')} onChange={(e) => setNorth({ annualDeliverables: e.target.value.split('\n').map((item) => item.trim()).filter(Boolean) })} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-[13px] text-slate-700 min-h-[240px]" />
              ) : (
                <ul className="space-y-2 text-[13px] text-slate-700 leading-6">{snapshot.north.annualDeliverables.map((item) => <li key={item}>• {item}</li>)}</ul>
              )}
            </div>
          </div>
        </section>

        <section className={`${card} p-7 sm:p-8`}>
          <SectionHeader
            title="本季度重点目标（Quarter Focus Goals）"
            subtitle=""
            icon={<ClipboardList className="w-4 h-4" />}
            action={canEdit && mode === 'work' ? (
              <button
                onClick={() => setSnapshot((prev) => prev ? { ...prev, goals: [...prev.goals, emptyGoalItem()] } : prev)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-[12px] text-slate-700 hover:bg-slate-50"
              >
                新增目标
              </button>
            ) : undefined}
          />

          <div className={`grid grid-cols-1 ${mode === 'work' && canEdit ? 'lg:grid-cols-4' : 'lg:grid-cols-3'} gap-4`}>
            {snapshot.goals.map((goal, index) => (
              <div key={`${goal.title}-${index}`} className="rounded-2xl border border-slate-200 bg-white p-5">
                {canEdit && mode === 'work' ? (
                  <div className="space-y-3">
                    <input value={goal.title} onChange={(e) => setSnapshot((prev) => prev ? { ...prev, goals: patchArrayItem(prev.goals, index, { title: e.target.value }) } : prev)} className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-[14px] font-semibold" />
                    <textarea value={goal.oneLiner} onChange={(e) => setSnapshot((prev) => prev ? { ...prev, goals: patchArrayItem(prev.goals, index, { oneLiner: e.target.value }) } : prev)} className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-[13px] min-h-[74px]" />
                    <input type="range" min={0} max={100} step={1} value={goal.progress} onChange={(e) => setSnapshot((prev) => prev ? { ...prev, goals: patchArrayItem(prev.goals, index, { progress: Number(e.target.value) }) } : prev)} className="w-full accent-blue-600" />
                    <div className="text-xs text-slate-500">进度 {goal.progress}%</div>
                    <textarea value={goal.kpis.join('\n')} onChange={(e) => setSnapshot((prev) => prev ? { ...prev, goals: patchArrayItem(prev.goals, index, { kpis: e.target.value.split('\n').map((item) => item.trim()).filter(Boolean) }) } : prev)} className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-[13px] min-h-[96px]" />
                    <textarea value={goal.risks.join('\n')} onChange={(e) => setSnapshot((prev) => prev ? { ...prev, goals: patchArrayItem(prev.goals, index, { risks: e.target.value.split('\n').map((item) => item.trim()).filter(Boolean) }) } : prev)} className="w-full px-2.5 py-1.5 rounded-lg border border-amber-200 text-[12px] min-h-[84px]" />
                  </div>
                ) : (
                  <>
                    <p className="text-[15px] font-semibold text-slate-800 mb-2">{goal.title}</p>
                    <p className="text-[13px] text-slate-600 leading-6 mb-3">{goal.oneLiner}</p>
                    <div className="h-2 rounded-full bg-slate-200 mb-2"><div className="h-2 rounded-full bg-blue-500" style={{ width: `${goal.progress}%` }} /></div>
                    <p className="text-[12px] text-slate-500 mb-3">进度 {goal.progress}%</p>
                    <div className="space-y-1.5 text-[13px] text-slate-700 mb-3">{goal.kpis.map((item) => <p key={item}>• {item}</p>)}</div>
                    <div className="pt-3 border-t border-slate-100 text-[12px] text-amber-700 space-y-1.5">{goal.risks.map((item) => <p key={item}>⚠ 可能遇到的问题：{item}</p>)}</div>
                  </>
                )}
              </div>
            ))}
          </div>
        </section>

        <section className={`${card} p-7 sm:p-8`}>
          <SectionHeader
            title="近期事件（Recent Events）"
            subtitle="跨部门近期推进与战略陪伴价值呈现"
            icon={<MessageSquare className="w-4 h-4" />}
            action={canEdit && mode === 'work' ? (
              <button
                onClick={() => setSnapshot((prev) => prev ? { ...prev, latest: [...prev.latest, emptyRecentEvent()] } : prev)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-[12px] text-slate-700 hover:bg-slate-50"
              >
                新增事项
              </button>
            ) : undefined}
          />

          <div className="space-y-4">
            {snapshot.latest.map((event, index) => (
              <div key={`${event.title}-${index}`} className="rounded-2xl border border-slate-200 bg-white p-5">
                {canEdit && mode === 'work' ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 lg:grid-cols-[1fr,180px,160px] gap-3">
                      <input value={event.title} onChange={(e) => setSnapshot((prev) => prev ? { ...prev, latest: patchArrayItem(prev.latest, index, { title: e.target.value }) } : prev)} className="px-3 py-2 rounded-xl border border-slate-200 text-[14px] font-semibold" />
                      <input value={event.date} onChange={(e) => setSnapshot((prev) => prev ? { ...prev, latest: patchArrayItem(prev.latest, index, { date: e.target.value }) } : prev)} className="px-3 py-2 rounded-xl border border-slate-200 text-[13px]" />
                      <input value={event.duration} onChange={(e) => setSnapshot((prev) => prev ? { ...prev, latest: patchArrayItem(prev.latest, index, { duration: e.target.value }) } : prev)} className="px-3 py-2 rounded-xl border border-slate-200 text-[13px]" />
                    </div>
                    <input value={event.people} onChange={(e) => setSnapshot((prev) => prev ? { ...prev, latest: patchArrayItem(prev.latest, index, { people: e.target.value }) } : prev)} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-[13px]" />
                    <textarea value={event.scope} onChange={(e) => setSnapshot((prev) => prev ? { ...prev, latest: patchArrayItem(prev.latest, index, { scope: e.target.value }) } : prev)} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-[13px] min-h-[72px]" />
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                      <textarea value={event.doneItems.join('\n')} onChange={(e) => setSnapshot((prev) => prev ? { ...prev, latest: patchArrayItem(prev.latest, index, { doneItems: e.target.value.split('\n').map((item) => item.trim()).filter(Boolean) }) } : prev)} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-[13px] min-h-[110px]" />
                      <textarea value={event.valueItems.join('\n')} onChange={(e) => setSnapshot((prev) => prev ? { ...prev, latest: patchArrayItem(prev.latest, index, { valueItems: e.target.value.split('\n').map((item) => item.trim()).filter(Boolean) }) } : prev)} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-[13px] min-h-[110px]" />
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
                      <p className="text-[15px] font-semibold text-slate-800">{event.title}</p>
                      <p className="text-[12px] text-slate-500">{event.date}</p>
                    </div>
                    <p className="text-[13px] text-slate-700 leading-6 mb-4">{event.scope}</p>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <div>
                        <p className="text-[12px] font-semibold text-slate-500 uppercase tracking-wider mb-2">近期事件目标</p>
                        <ul className="space-y-1.5 text-[13px] text-slate-700 leading-6">{event.doneItems.map((item) => <li key={item}>• {item}</li>)}</ul>
                      </div>
                      <div>
                        <p className="text-[12px] font-semibold text-slate-500 uppercase tracking-wider mb-2">近期事件价值</p>
                        <ul className="space-y-1.5 text-[13px] text-slate-700 leading-6">{event.valueItems.map((item) => <li key={item}>• {item}</li>)}</ul>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </section>

        <section className={`${card} p-7 sm:p-8`}>
          <SectionHeader
            title="文档资源与会议记录（Resources & Records）"
            subtitle=""
            icon={<Files className="w-4 h-4" />}
            action={canEdit && mode === 'work' ? (
              <div className="flex gap-2">
                <button onClick={() => setSnapshot((prev) => prev ? { ...prev, docs: [...prev.docs, emptyDocument()] } : prev)} className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-[12px] text-slate-700 hover:bg-slate-50">新增文档</button>
                <button onClick={() => setSnapshot((prev) => prev ? { ...prev, meetings: [...prev.meetings, emptyMeeting()] } : prev)} className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-[12px] text-slate-700 hover:bg-slate-50">新增会议</button>
              </div>
            ) : undefined}
          />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <p className="text-[12px] font-semibold text-slate-500 uppercase tracking-wider mb-3">文档资源</p>
              <div className="space-y-3">
                {snapshot.docs.map((doc, index) => (
                  <div key={`${doc.title}-${index}`} className="relative">
                    {canEdit && mode === 'work' ? (
                      <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-3.5 space-y-2">
                        <input value={doc.title} onChange={(e) => setSnapshot((prev) => prev ? { ...prev, docs: patchArrayItem(prev.docs, index, { title: e.target.value }) } : prev)} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-[13px] font-medium" />
                        <input value={doc.date} onChange={(e) => setSnapshot((prev) => prev ? { ...prev, docs: patchArrayItem(prev.docs, index, { date: e.target.value }) } : prev)} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-[13px]" />
                        <textarea value={doc.desc} onChange={(e) => setSnapshot((prev) => prev ? { ...prev, docs: patchArrayItem(prev.docs, index, { desc: e.target.value }) } : prev)} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-[13px] min-h-[70px]" />
                        <input value={doc.link} onChange={(e) => setSnapshot((prev) => prev ? { ...prev, docs: patchArrayItem(prev.docs, index, { link: e.target.value }) } : prev)} placeholder="文档链接（留空则前台禁用）" className="w-full px-3 py-2 rounded-xl border border-slate-200 text-[13px]" />
                      </div>
                    ) : renderActionLink(doc, (
                      <>
                        <p className="text-[14px] font-medium text-slate-800 mb-1">{doc.title}（{doc.date}）</p>
                        <p className="text-[13px] text-slate-700 leading-6">{doc.desc || '暂无文档说明'}</p>
                        {!isValidLink(doc.link) ? <p className="text-[12px] text-slate-400 mt-2">暂未添加有效链接</p> : null}
                      </>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <p className="text-[12px] font-semibold text-slate-500 uppercase tracking-wider mb-3">会议记录</p>
              <div className="space-y-3">
                {snapshot.meetings.map((meeting, index) => (
                  <div key={`${meeting.title}-${index}`} className="relative">
                    {canEdit && mode === 'work' ? (
                      <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-3.5 space-y-2">
                        <input value={meeting.title} onChange={(e) => setSnapshot((prev) => prev ? { ...prev, meetings: patchArrayItem(prev.meetings, index, { title: e.target.value }) } : prev)} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-[13px] font-medium" />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          <input value={meeting.date} onChange={(e) => setSnapshot((prev) => prev ? { ...prev, meetings: patchArrayItem(prev.meetings, index, { date: e.target.value }) } : prev)} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-[13px]" />
                          <input value={meeting.duration} onChange={(e) => setSnapshot((prev) => prev ? { ...prev, meetings: patchArrayItem(prev.meetings, index, { duration: e.target.value }) } : prev)} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-[13px]" />
                        </div>
                        <input value={meeting.attendees} onChange={(e) => setSnapshot((prev) => prev ? { ...prev, meetings: patchArrayItem(prev.meetings, index, { attendees: e.target.value }) } : prev)} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-[13px]" />
                        <input value={meeting.keyPeople} onChange={(e) => setSnapshot((prev) => prev ? { ...prev, meetings: patchArrayItem(prev.meetings, index, { keyPeople: e.target.value }) } : prev)} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-[13px]" />
                        <textarea value={meeting.topic} onChange={(e) => setSnapshot((prev) => prev ? { ...prev, meetings: patchArrayItem(prev.meetings, index, { topic: e.target.value }) } : prev)} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-[13px] min-h-[70px]" />
                        <input value={meeting.link} onChange={(e) => setSnapshot((prev) => prev ? { ...prev, meetings: patchArrayItem(prev.meetings, index, { link: e.target.value }) } : prev)} placeholder="会议链接（留空则前台禁用）" className="w-full px-3 py-2 rounded-xl border border-slate-200 text-[13px]" />
                      </div>
                    ) : renderActionLink(meeting, (
                      <>
                        <p className="text-[14px] font-medium text-slate-800 mb-1">{meeting.title}</p>
                        <p className="text-[12px] text-slate-500 mb-1.5">{meeting.date} · {meeting.duration} · {meeting.attendees}</p>
                        <p className="text-[13px] text-slate-700 mb-1.5 leading-6">主要参会人：{meeting.keyPeople || '待补充'}</p>
                        <p className="text-[13px] text-slate-700 leading-6">核心议题：{meeting.topic || '待补充'}</p>
                        {!isValidLink(meeting.link) ? <p className="text-[12px] text-slate-400 mt-2">暂未添加有效链接</p> : null}
                      </>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className={`${card} p-7 sm:p-8`}>
          <SectionHeader
            title="赋能学习资源（Learning Academy）"
            subtitle=""
            icon={<GraduationCap className="w-4 h-4" />}
            action={canEdit && mode === 'work' ? (
              <button onClick={() => setSnapshot((prev) => prev ? { ...prev, learning: [...prev.learning, emptyLearningResource()] } : prev)} className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-[12px] text-slate-700 hover:bg-slate-50">
                新增资源
              </button>
            ) : undefined}
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {snapshot.learning.map((item, index) => (
              <div key={`${item.title}-${index}`}>
                {canEdit && mode === 'work' ? (
                  <div className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-5 space-y-2">
                    <input value={item.title} onChange={(e) => setSnapshot((prev) => prev ? { ...prev, learning: patchArrayItem(prev.learning, index, { title: e.target.value }) } : prev)} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-[13px] font-medium" />
                    <textarea value={item.summary} onChange={(e) => setSnapshot((prev) => prev ? { ...prev, learning: patchArrayItem(prev.learning, index, { summary: e.target.value }) } : prev)} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-[13px] min-h-[70px]" />
                    <input value={item.relation} onChange={(e) => setSnapshot((prev) => prev ? { ...prev, learning: patchArrayItem(prev.learning, index, { relation: e.target.value }) } : prev)} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-[13px]" />
                    <textarea value={item.detail.join('\n')} onChange={(e) => setSnapshot((prev) => prev ? { ...prev, learning: patchArrayItem(prev.learning, index, { detail: e.target.value.split('\n').map((line) => line.trim()).filter(Boolean) }) } : prev)} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-[13px] min-h-[90px]" />
                    <div className="grid grid-cols-2 gap-2">
                      <select value={item.kind} onChange={(e) => setSnapshot((prev) => prev ? { ...prev, learning: patchArrayItem(prev.learning, index, { kind: e.target.value as StrategyLearningResource['kind'] }) } : prev)} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-[13px] bg-white">
                        <option value="文章">文章</option>
                        <option value="报告">报告</option>
                        <option value="课程">课程</option>
                      </select>
                      <input value={item.link} onChange={(e) => setSnapshot((prev) => prev ? { ...prev, learning: patchArrayItem(prev.learning, index, { link: e.target.value }) } : prev)} placeholder="资源链接" className="w-full px-3 py-2 rounded-xl border border-slate-200 text-[13px]" />
                    </div>
                  </div>
                ) : renderActionLink(item, (
                  <>
                    <p className="text-[12px] text-indigo-700 mb-1">{item.kind || '文章'}</p>
                    <p className="text-[15px] font-semibold text-slate-800 mb-2">{item.title}</p>
                    <p className="text-[13px] text-slate-700 leading-6 mb-2">{item.summary}</p>
                    <p className="text-[12px] text-indigo-700 mb-2">{item.relation}</p>
                    <ul className="text-[12px] text-slate-600 space-y-1.5 leading-6">
                      {item.detail.map((detailItem) => <li key={detailItem}>• {detailItem}</li>)}
                    </ul>
                    {!isValidLink(item.link) ? <p className="text-[12px] text-slate-400 mt-2">暂未添加有效链接</p> : null}
                  </>
                ))}
              </div>
            ))}
          </div>
        </section>

        {accessMode === 'public' && isFrontend && (
          <section className={`${card} p-7 sm:p-8`}>
            <SectionHeader title="体验说明" subtitle="" icon={<Sparkles className="w-4 h-4" />} />
            <div className="text-[14px] text-slate-600 leading-7">
              当前为战略陪伴展示页。绑定机构后，你将直接看到对应机构的战略陪伴页面；管理员则可查看所有已发布机构页并切换筛选。
            </div>
          </section>
        )}
          </>
        )}
      </main>
    </div>
  );
}
