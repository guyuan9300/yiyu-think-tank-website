import { useState } from 'react';
import { Plus, Edit2, Trash2, X, HandHeart, CheckCircle2, RotateCcw, Check } from 'lucide-react';
import type { Bilingual } from '../../lib/i18n';
import {
  loadSupportPool,
  saveSupportPool,
  resetSupportPool,
  type Project,
  type ProjectStat,
  type SupportPoolData,
} from '../../lib/supportPoolData';

// ============================================================
// admin-v2 · 行动者支持池 (立项管理)
// 直接编辑共享数据层 src/lib/supportPoolData.ts。
// 「保存并应用到前台」→ 写 localStorage，首页 Ledger 卡 + 支持池抽屉实时读取。
// ⚠️ 现为 localStorage 本地桥(只在当前浏览器生效); 晚点接 cloud_backend
//    只需把 save/load 换成云端读写，此组件无需改动。
// ============================================================

const wan = (n: number): string =>
  n.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const emptyBi = (): Bilingual => ({ zh: '', en: '' });

const emptyProject = (): Project => ({
  title: emptyBi(),
  amount: 0,
  budgetLabel: emptyBi(),
  description: emptyBi(),
  problem: emptyBi(),
  stats: [],
  progress: 0,
  amountLabel: emptyBi(),
  unit: emptyBi(),
  href: '',
});

// 保存时把"空双语"的可选字段归一为 undefined(让前台回落到默认"已支持/万元")
function normalize(p: Project): Project {
  const blank = (b?: Bilingual): boolean => !b || (!b.zh.trim() && !(b.en ?? '').trim());
  return {
    ...p,
    amountLabel: blank(p.amountLabel) ? undefined : p.amountLabel,
    unit: blank(p.unit) ? undefined : p.unit,
    href: p.href?.trim() ? p.href.trim() : undefined,
    stats: p.stats.filter((s) => s.label.zh.trim() || (s.label.en ?? '').trim() || (s.primary ?? '').trim()),
  };
}

export function SupportPoolAdmin(): JSX.Element {
  const [data, setData] = useState<SupportPoolData>(loadSupportPool);
  const [draft, setDraft] = useState<Project | null>(null);
  const [draftIdx, setDraftIdx] = useState<number>(-1); // -1 = 新增

  const { projects, stats } = data;

  // 自动保存: 每次改动立即写入 localStorage 并通知前台, 无需手动点保存。
  const touch = (next: SupportPoolData): void => {
    setData(next);
    saveSupportPool(next);
  };

  const setStat = (k: keyof SupportPoolData['stats'], v: number): void =>
    touch({ ...data, stats: { ...data.stats, [k]: v } });

  const openNew = (): void => { setDraft(emptyProject()); setDraftIdx(-1); };
  const openEdit = (i: number): void => { setDraft(JSON.parse(JSON.stringify(projects[i]))); setDraftIdx(i); };
  const removeProject = (i: number): void => touch({ ...data, projects: projects.filter((_, j) => j !== i) });

  const saveDraft = (p: Project): void => {
    const np = normalize(p);
    const nextProjects = draftIdx < 0 ? [np, ...projects] : projects.map((x, j) => (j === draftIdx ? np : x));
    touch({ ...data, projects: nextProjects });
    setDraft(null);
  };

  const doReset = (): void => { resetSupportPool(); setData(loadSupportPool()); };

  return (
    <div className="space-y-5 max-w-[1100px]">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h3 className="font-serif-display text-[18px] sm:text-[20px] font-semibold text-os-navy tracking-tight">行动者支持池</h3>
          <p className="mt-1 max-w-[640px] text-[12px] text-os-muted leading-relaxed">
            这里管理前台「行动者支持池」展示的项目与池子数字。<b>改动会自动同步到前台</b>，首页卡片与支持池抽屉会立刻读到。
            <span className="text-amber-700">当前是本地 localStorage 桥，只在你这台浏览器生效；晚点接通云端后所有人可见。</span>
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={doReset} title="丢弃改动, 恢复出厂默认数据"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-[12.5px] font-semibold bg-os-paper text-os-muted ring-1 ring-os-line hover:text-os-navy hover:ring-os-navy/30">
            <RotateCcw className="w-3.5 h-3.5" />恢复默认
          </button>
          <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-semibold bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">
            <Check className="w-4 h-4" />改动自动同步到前台
          </span>
        </div>
      </div>

      {/* 池子汇总卡(均可手填) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <PoolCard label="累计支持" value={stats.cumulative} unit="万元" tone="spark" onChange={(v) => setStat('cumulative', v)} />
        <PoolCard label="本月已支持" value={stats.thisMonth} unit="万元" tone="blue" onChange={(v) => setStat('thisMonth', v)} />
        <PoolCard label="池子余额" value={stats.balance} unit="万元" tone="green" onChange={(v) => setStat('balance', v)} />
        <PoolCard label="剩余额度" value={stats.remainingPct} unit="%" tone="navy" onChange={(v) => setStat('remainingPct', v)} />
      </div>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="text-[13px] text-os-muted">正在支持的项目 · {projects.length} 个</div>
        <button onClick={openNew} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-semibold bg-gradient-to-r from-os-navy to-os-indigo text-white hover:brightness-110 shadow-os">
          <Plus className="w-4 h-4" />新增项目
        </button>
      </div>

      {/* 项目列表 */}
      <div className="rounded-[20px] ring-1 ring-os-line bg-os-paper shadow-os overflow-hidden">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="text-left text-[11px] tracking-[0.1em] text-os-muted uppercase border-b border-os-line">
              <th className="px-5 py-3 font-semibold">项目</th>
              <th className="px-3 py-3 font-semibold text-right">金额</th>
              <th className="px-3 py-3 font-semibold">预算说明</th>
              <th className="px-3 py-3 font-semibold">详情页</th>
              <th className="px-3 py-3 font-semibold text-right">进度</th>
              <th className="px-3 py-3 font-semibold text-right">操作</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((p, i) => (
              <tr key={i} className="border-b border-os-line/60 hover:bg-os-mist/40">
                <td className="px-5 py-3 font-medium text-os-navy max-w-[260px] truncate">{p.title.zh || <span className="text-os-muted">(未命名)</span>}</td>
                <td className="px-3 py-3 text-right tabular-nums text-os-ink whitespace-nowrap">
                  {p.amount}<span className="text-os-muted ml-0.5">{p.unit?.zh || '万元'}</span>
                </td>
                <td className="px-3 py-3 text-os-muted max-w-[180px] truncate">{p.budgetLabel.zh || '—'}</td>
                <td className="px-3 py-3 text-os-muted max-w-[150px] truncate">
                  {p.href ? <span className="text-os-blue">{p.href}</span> : <span className="text-os-line">—</span>}
                </td>
                <td className="px-3 py-3 text-right tabular-nums text-os-muted">{p.progress}%</td>
                <td className="px-3 py-3 text-right whitespace-nowrap">
                  <button onClick={() => openEdit(i)} className="text-os-blue hover:text-os-navy text-[12px] font-semibold mr-3"><Edit2 className="w-3.5 h-3.5 inline" /> 编辑</button>
                  <button onClick={() => removeProject(i)} className="text-os-muted hover:text-rose-600" title="删除"><Trash2 className="w-3.5 h-3.5 inline" /></button>
                </td>
              </tr>
            ))}
            {projects.length === 0 && (
              <tr><td colSpan={6} className="px-5 py-8 text-center text-os-muted text-[12px]">暂无项目，点「新增项目」添加。</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-1.5 text-[12px] text-os-muted">
        <HandHeart className="w-3.5 h-3.5 opacity-60" />
        说明：金额单位/小标(如「最高配比 50%」「为期 2 天」「已开通 68 家组织」)可在编辑里自定；留空则默认「已支持 · 万元」。带「详情页」的项目，前台卡片可点击进入对应介绍页。
      </div>

      {draft && (
        <ProjectEditDrawer
          project={draft}
          isNew={draftIdx < 0}
          onClose={() => setDraft(null)}
          onSave={saveDraft}
        />
      )}
    </div>
  );
}

interface PoolCardProps {
  label: string; value: number; unit: string;
  tone: 'navy' | 'spark' | 'blue' | 'green';
  onChange: (v: number) => void;
}
function PoolCard({ label, value, unit, tone, onChange }: PoolCardProps): JSX.Element {
  const grad = tone === 'navy' ? 'from-os-navy/[0.08] to-os-navy/[0.02]'
    : tone === 'spark' ? 'from-os-spark/[0.10] to-os-spark/[0.02]'
    : tone === 'blue' ? 'from-os-blue/[0.10] to-os-blue/[0.02]'
    : 'from-emerald-500/[0.10] to-emerald-500/[0.02]';
  const text = tone === 'navy' ? 'text-os-navy' : tone === 'spark' ? 'text-os-spark' : tone === 'blue' ? 'text-os-blue' : 'text-emerald-700';
  return (
    <div className={`relative rounded-[20px] ring-1 ring-os-line bg-gradient-to-br ${grad} p-5`}>
      <div className="text-[12px] tracking-[0.14em] font-semibold text-os-muted uppercase">{label}</div>
      <div className="mt-2 flex items-baseline gap-1">
        <input type="number" value={value} onChange={(e) => onChange(Number(e.target.value) || 0)}
          className={`w-[100px] bg-transparent font-serif-display text-[26px] font-semibold leading-none ${text} focus:outline-none border-b border-dashed border-os-line focus:border-os-navy/50 tabular-nums`} />
        <span className="text-[12px] text-os-muted font-medium">{unit}</span>
      </div>
    </div>
  );
}

const inputCls = 'w-full rounded-[10px] ring-1 ring-os-line bg-os-paper px-3 py-2 text-[13px] text-os-ink focus:ring-os-navy/40 focus:outline-none';

function ProjectEditDrawer({ project, isNew, onClose, onSave }: {
  project: Project; isNew: boolean; onClose: () => void; onSave: (p: Project) => void;
}): JSX.Element {
  const [p, setP] = useState<Project>(project);
  const set = <K extends keyof Project>(k: K, v: Project[K]): void => setP((prev) => ({ ...prev, [k]: v }));
  const setBi = (k: 'title' | 'budgetLabel' | 'description' | 'problem' | 'amountLabel' | 'unit', lang: 'zh' | 'en', v: string): void =>
    setP((prev) => ({ ...prev, [k]: { ...(prev[k] ?? { zh: '', en: '' }), [lang]: v } }));

  const setStatField = (i: number, patch: Partial<ProjectStat>): void =>
    setP((prev) => ({ ...prev, stats: prev.stats.map((s, j) => (j === i ? { ...s, ...patch } : s)) }));
  const setStatLabel = (i: number, lang: 'zh' | 'en', v: string): void =>
    setP((prev) => ({ ...prev, stats: prev.stats.map((s, j) => (j === i ? { ...s, label: { ...s.label, [lang]: v } } : s)) }));
  const addStat = (): void => setP((prev) => ({ ...prev, stats: [...prev.stats, { primary: '', label: { zh: '', en: '' } }] }));
  const removeStat = (i: number): void => setP((prev) => ({ ...prev, stats: prev.stats.filter((_, j) => j !== i) }));

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-full max-w-[600px] h-full bg-os-canvas shadow-2xl overflow-y-auto">
        <div className="sticky top-0 bg-os-paper/90 backdrop-blur border-b border-os-line px-6 py-4 flex items-center justify-between z-10">
          <div className="font-serif-display text-[18px] font-semibold text-os-navy">{isNew ? '新增项目' : '编辑项目'}</div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-os-mist text-os-muted"><X className="w-4 h-4" /></button>
        </div>

        <div className="p-6 space-y-4">
          <BiField label="项目名称" zh={p.title.zh} en={p.title.en} onZh={(v) => setBi('title', 'zh', v)} onEn={(v) => setBi('title', 'en', v)} phZh="如 独角兽战略陪伴项目" />

          <div className="grid grid-cols-3 gap-4">
            <Field label="金额数值"><input type="number" className={inputCls} value={p.amount} onChange={(e) => set('amount', Number(e.target.value) || 0)} /></Field>
            <Field label="单位(留空=万元)"><input className={inputCls} value={p.unit?.zh ?? ''} onChange={(e) => setBi('unit', 'zh', e.target.value)} placeholder="万元 / % / 天 / 家组织" /></Field>
            <Field label="进度 %"><input type="number" className={inputCls} value={p.progress} onChange={(e) => set('progress', Number(e.target.value) || 0)} /></Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="金额小标 中文(留空=已支持)"><input className={inputCls} value={p.amountLabel?.zh ?? ''} onChange={(e) => setBi('amountLabel', 'zh', e.target.value)} placeholder="最高配比 / 已开通 / 为期" /></Field>
            <Field label="金额小标 English"><input className={inputCls} value={p.amountLabel?.en ?? ''} onChange={(e) => setBi('amountLabel', 'en', e.target.value)} placeholder="Max match / Onboarded" /></Field>
            <Field label="单位 English"><input className={inputCls} value={p.unit?.en ?? ''} onChange={(e) => setBi('unit', 'en', e.target.value)} placeholder="k CNY / % / days / orgs" /></Field>
            <Field label="详情页链接(留空=不可点)"><input className={inputCls} value={p.href ?? ''} onChange={(e) => set('href', e.target.value)} placeholder="?page=unicorn-companion" /></Field>
          </div>

          <BiField label="预算/状态说明" zh={p.budgetLabel.zh} en={p.budgetLabel.en} onZh={(v) => setBi('budgetLabel', 'zh', v)} onEn={(v) => setBi('budgetLabel', 'en', v)} phZh="三年战略陪伴 · 首批招募中" />
          <BiField label="项目简介" textarea zh={p.description.zh} en={p.description.en} onZh={(v) => setBi('description', 'zh', v)} onEn={(v) => setBi('description', 'en', v)} />
          <BiField label="解决什么" textarea zh={p.problem.zh} en={p.problem.en} onZh={(v) => setBi('problem', 'zh', v)} onEn={(v) => setBi('problem', 'en', v)} />

          {/* 底部指标(0–3 组) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="text-[12px] font-semibold text-os-navy">底部指标（卡片底排，数值可留空只显示文字）</div>
              <button onClick={addStat} className="text-[12px] font-semibold text-os-blue hover:text-os-navy inline-flex items-center gap-1"><Plus className="w-3.5 h-3.5" />加一组</button>
            </div>
            <div className="space-y-2">
              {p.stats.map((s, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input className={`${inputCls} w-[80px]`} value={s.primary ?? ''} onChange={(e) => setStatField(i, { primary: e.target.value })} placeholder="数值" />
                  <input className={`${inputCls} flex-1`} value={s.label.zh} onChange={(e) => setStatLabel(i, 'zh', e.target.value)} placeholder="中文说明" />
                  <input className={`${inputCls} flex-1`} value={s.label.en} onChange={(e) => setStatLabel(i, 'en', e.target.value)} placeholder="English" />
                  <button onClick={() => removeStat(i)} className="text-os-muted hover:text-rose-600 p-1"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              ))}
              {p.stats.length === 0 && <div className="text-[12px] text-os-muted">暂无指标</div>}
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button onClick={() => onSave(p)} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-semibold bg-gradient-to-r from-os-navy to-os-indigo text-white hover:brightness-110 shadow-os"><CheckCircle2 className="w-4 h-4" />完成</button>
            <button onClick={onClose} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-semibold bg-os-paper text-os-navy ring-1 ring-os-line hover:ring-os-navy/30">取消</button>
          </div>
          <p className="text-[11.5px] text-os-muted leading-relaxed">点「完成」即回到列表并自动同步到前台；首页卡片与支持池抽屉会立即读到。</p>
        </div>
      </div>
    </div>
  );
}

function BiField({ label, zh, en, onZh, onEn, textarea, phZh }: {
  label: string; zh: string; en?: string; onZh: (v: string) => void; onEn: (v: string) => void; textarea?: boolean; phZh?: string;
}): JSX.Element {
  return (
    <label className="block">
      <div className="text-[12px] font-semibold text-os-navy mb-1.5">{label}</div>
      <div className="grid grid-cols-2 gap-3">
        {textarea
          ? <textarea rows={3} className={inputCls} value={zh} onChange={(e) => onZh(e.target.value)} placeholder={phZh ?? '中文'} />
          : <input className={inputCls} value={zh} onChange={(e) => onZh(e.target.value)} placeholder={phZh ?? '中文'} />}
        {textarea
          ? <textarea rows={3} className={inputCls} value={en ?? ''} onChange={(e) => onEn(e.target.value)} placeholder="English" />
          : <input className={inputCls} value={en ?? ''} onChange={(e) => onEn(e.target.value)} placeholder="English" />}
      </div>
    </label>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }): JSX.Element {
  return (
    <label className="block">
      <div className="text-[12px] font-semibold text-os-navy mb-1.5">{label}</div>
      {children}
    </label>
  );
}
