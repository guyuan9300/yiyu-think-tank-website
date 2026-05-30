import { useState } from 'react';
import {
  Rocket, Tag, Send, Inbox, Package, ListChecks, Globe,
  Plus, Search, Edit2, X, CheckCircle2, AlertTriangle, Clock,
  Apple, Monitor, Smartphone, Pause, RotateCcw, Image as ImageIcon,
  ShieldAlert, Users2, Link2, Copy, Check,
} from 'lucide-react';

// ============================================================
// admin-v2 · 发版与反馈控制台 (7 个模块, 纯前端 mock, 不接数据)
// 设计目的: 顾源源先验收页面/布局/操作流, 确定页面后再统一接 cloud_backend。
// 核心模型: 多租户「组织定向推送」+「动态定向 / 静态交付」。
// 所有 onClick 仅 console.log, 表单不真保存, 列表用 mock placeholder。
// ============================================================

// ============== shared atoms (自包含, 与 AdminV2Modules 同设计语言) ==============
function KpiCard({ label, value, hint, tone = 'navy' }: { label: string; value: string; hint?: string; tone?: 'navy' | 'blue' | 'spark' }) {
  const grad = tone === 'navy' ? 'from-os-navy/[0.08] to-os-navy/[0.02]'
            : tone === 'blue' ? 'from-os-blue/[0.10] to-os-blue/[0.02]'
            : 'from-os-spark/[0.10] to-os-spark/[0.02]';
  const text = tone === 'navy' ? 'text-os-navy' : tone === 'blue' ? 'text-os-blue' : 'text-os-spark';
  return (
    <div className={`relative rounded-[20px] ring-1 ring-os-line bg-gradient-to-br ${grad} p-5 overflow-hidden`}>
      <div className="text-[12px] tracking-[0.14em] font-semibold text-os-muted uppercase">{label}</div>
      <div className={`mt-2 font-serif-display text-[30px] font-semibold leading-none ${text}`}>{value}</div>
      {hint && <div className="mt-2 text-[12px] text-os-muted/80">{hint}</div>}
    </div>
  );
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-[20px] ring-1 ring-os-line bg-os-paper shadow-os p-5 sm:p-6 ${className}`}>{children}</div>;
}

function SectionTitle({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div className="mb-4">
      <h3 className="font-serif-display text-[18px] sm:text-[20px] font-semibold text-os-navy tracking-tight">{children}</h3>
      {hint && <p className="mt-1 text-[12px] text-os-muted leading-relaxed">{hint}</p>}
    </div>
  );
}

type BadgeTone = 'green' | 'blue' | 'amber' | 'rose' | 'muted' | 'indigo';
function Badge({ tone, children }: { tone: BadgeTone; children: React.ReactNode }) {
  const cls: Record<BadgeTone, string> = {
    green:  'bg-emerald-50 text-emerald-700 ring-emerald-200/60',
    blue:   'bg-os-mist text-os-blue ring-os-blue/20',
    amber:  'bg-amber-50 text-amber-700 ring-amber-200/60',
    rose:   'bg-rose-50 text-rose-700 ring-rose-200/60',
    muted:  'bg-os-canvas text-os-muted ring-os-line',
    indigo: 'bg-indigo-50 text-indigo-700 ring-indigo-200/60',
  };
  return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ring-1 ${cls[tone]}`}>{children}</span>;
}

function ToolbarButton({ onClick, children, variant = 'primary' }: { onClick?: () => void; children: React.ReactNode; variant?: 'primary' | 'ghost' | 'danger' }) {
  const cls = variant === 'primary'
    ? 'bg-gradient-to-r from-os-navy to-os-indigo text-white hover:brightness-110 shadow-os'
    : variant === 'danger'
    ? 'bg-rose-50 text-rose-700 ring-1 ring-rose-200/60 hover:bg-rose-100'
    : 'bg-os-paper text-os-navy ring-1 ring-os-line hover:ring-os-navy/30';
  return (
    <button onClick={onClick} className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-semibold transition-all ${cls}`}>
      {children}
    </button>
  );
}

function EmptyHint({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-[14px] border border-dashed border-os-line bg-os-canvas/50 px-4 py-3 text-[12px] text-os-muted leading-relaxed">
      {children}
    </div>
  );
}

function InfoBanner({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-[14px] bg-os-mist/60 ring-1 ring-os-blue/15 px-4 py-3 text-[12.5px] text-os-ink/80 leading-relaxed flex gap-2.5">
      <ShieldAlert className="w-4 h-4 text-os-blue shrink-0 mt-0.5" />
      <div>{children}</div>
    </div>
  );
}

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block">
      <div className="text-[12px] font-semibold text-os-navy mb-1.5">{label}</div>
      {children}
      {hint && <div className="mt-1 text-[11px] text-os-muted">{hint}</div>}
    </label>
  );
}

const inputCls = 'w-full rounded-[10px] ring-1 ring-os-line bg-os-paper px-3 py-2 text-[13px] text-os-ink focus:ring-os-navy/40 focus:outline-none';

function Toggle({ on, onClick, label }: { on: boolean; onClick?: () => void; label: string }) {
  return (
    <button onClick={onClick} className="inline-flex items-center gap-2 text-[13px] text-os-ink">
      <span className={`relative w-9 h-5 rounded-full transition-colors ${on ? 'bg-os-navy' : 'bg-os-line'}`}>
        <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${on ? 'translate-x-4' : 'translate-x-0.5'}`} />
      </span>
      {label}
    </button>
  );
}

function CheckBox({ checked, onChange, ariaLabel }: { checked: boolean; onChange: () => void; ariaLabel?: string }) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      aria-checked={checked}
      role="checkbox"
      onClick={(e) => { e.stopPropagation(); onChange(); }}
      className={`w-[18px] h-[18px] rounded-[5px] ring-1 flex items-center justify-center transition-colors shrink-0 ${checked ? 'bg-os-navy ring-os-navy text-white' : 'bg-os-paper ring-os-line hover:ring-os-navy/40'}`}
    >
      {checked && <Check className="w-3 h-3" strokeWidth={3} />}
    </button>
  );
}

const log = (msg: string) => () => console.log('[release-console]', msg);

// ============== platform helpers ==============
type PlatformKey = 'mac' | 'windows' | 'web' | 'mobile';
const PLATFORM_META: Record<PlatformKey, { label: string; icon: React.ReactNode }> = {
  mac:     { label: 'macOS',  icon: <Apple className="w-3.5 h-3.5" /> },
  windows: { label: 'Windows', icon: <Monitor className="w-3.5 h-3.5" /> },
  web:     { label: '网页',    icon: <Globe className="w-3.5 h-3.5" /> },
  mobile:  { label: '移动端',  icon: <Smartphone className="w-3.5 h-3.5" /> },
};

// ============== Mock 数据 (placeholder, 接数据时全部替换) ==============
type ReleaseStatus = 'draft' | 'testing' | 'published' | 'rolled_back';
const RELEASE_STATUS_BADGE: Record<ReleaseStatus, { tone: BadgeTone; text: string }> = {
  draft:       { tone: 'muted', text: '草稿' },
  testing:     { tone: 'amber', text: '测试中' },
  published:   { tone: 'green', text: '已发布' },
  rolled_back: { tone: 'rose',  text: '已回滚' },
};

interface ReleaseRow {
  id: string;
  version: string;
  status: ReleaseStatus;
  platforms: PlatformKey[];
  mandatory: boolean;
  publishedAt: string | null;
  summary: string;
}

const MOCK_RELEASES: ReleaseRow[] = [
  { id: 'rel_232', version: 'V2.3.2', status: 'testing',     platforms: ['mac'],          mandatory: false, publishedAt: null,         summary: '任务提醒字段全链路 + 迷你卡片改期' },
  { id: 'rel_231', version: 'V2.3.1', status: 'published',   platforms: ['mac', 'web'],   mandatory: false, publishedAt: '2026-05-27', summary: '战略陪伴本地优先 + 经验墙云同步' },
  { id: 'rel_230', version: 'V2.3.0', status: 'published',   platforms: ['mac', 'web'],   mandatory: true,  publishedAt: '2026-05-22', summary: '深读全栈接通 + ER 金标体系' },
  { id: 'rel_225', version: 'V2.2.5', status: 'rolled_back', platforms: ['mac'],          mandatory: false, publishedAt: '2026-05-18', summary: '（已回滚）TasksView 死循环' },
];

interface OrgRow {
  id: string;
  name: string;
  code: string;
  installs: number;
  currentVersion: string;
  assignedVersion: string | null;
  targetMode: 'all' | 'org' | 'group' | 'none';
  rolloutPct: number;
}

const MOCK_ORGS: OrgRow[] = [
  { id: 'org_yiyu',   name: '益语智库（内部）', code: 'YIYU-CORE', installs: 6,  currentVersion: 'V2.3.1', assignedVersion: 'V2.3.2', targetMode: 'org',   rolloutPct: 100 },
  { id: 'org_richi',  name: '日慈基金会',       code: 'RICI-2025', installs: 14, currentVersion: 'V2.3.0', assignedVersion: 'V2.3.1', targetMode: 'group', rolloutPct: 50 },
  { id: 'org_cffc',   name: 'CFFC 公益机构',    code: 'CFFC-0312', installs: 9,  currentVersion: 'V2.3.1', assignedVersion: 'V2.3.1', targetMode: 'all',   rolloutPct: 100 },
  { id: 'org_weai',   name: '为爱黔行',         code: 'WEAI-0820', installs: 5,  currentVersion: 'V2.3.0', assignedVersion: null,     targetMode: 'none',  rolloutPct: 0 },
  { id: 'org_shanjia',name: '善加基金会',       code: 'SHAN-1120', installs: 3,  currentVersion: 'V2.2.5', assignedVersion: 'V2.3.0', targetMode: 'org',   rolloutPct: 100 },
];

type FeedbackKind = 'bug' | 'lag' | 'inaccurate' | 'feature' | 'experience';
const FEEDBACK_KIND: Record<FeedbackKind, { tone: BadgeTone; text: string }> = {
  bug:        { tone: 'rose',   text: '报错' },
  lag:        { tone: 'amber',  text: '卡顿' },
  inaccurate: { tone: 'amber',  text: '内容不准' },
  feature:    { tone: 'blue',   text: '功能建议' },
  experience: { tone: 'indigo', text: '体验建议' },
};

type Severity = 'blocker' | 'impaired' | 'minor';
const SEVERITY: Record<Severity, { tone: BadgeTone; text: string }> = {
  blocker:  { tone: 'rose',  text: '阻塞' },
  impaired: { tone: 'amber', text: '影响使用' },
  minor:    { tone: 'muted', text: '一般建议' },
};

type FeedbackStatus = 'pending' | 'confirmed' | 'to_task' | 'fixing' | 'fixed' | 'next_release' | 'wontfix' | 'closed';
const FEEDBACK_STATUS: Record<FeedbackStatus, { tone: BadgeTone; text: string }> = {
  pending:      { tone: 'amber',  text: '待处理' },
  confirmed:    { tone: 'blue',   text: '已确认' },
  to_task:      { tone: 'indigo', text: '已转任务' },
  fixing:       { tone: 'blue',   text: '修复中' },
  fixed:        { tone: 'green',  text: '已修复' },
  next_release: { tone: 'indigo', text: '下版发布' },
  wontfix:      { tone: 'muted',  text: '暂不处理' },
  closed:       { tone: 'muted',  text: '已关闭' },
};

interface FeedbackRow {
  id: string;
  kind: FeedbackKind;
  severity: Severity;
  title: string;
  submitter: string;
  org: string;
  version: string;
  page: string;
  os: string;
  status: FeedbackStatus;
  createdAt: string;
}

const MOCK_FEEDBACK: FeedbackRow[] = [
  { id: 'fb_01', kind: 'bug',        severity: 'blocker',  title: '战略陪伴刷新后页面白屏', submitter: '张秘书长', org: '日慈基金会',   version: 'V2.3.0', page: '战略陪伴', os: 'macOS 15.4', status: 'confirmed', createdAt: '2026-05-29 14:02' },
  { id: 'fb_02', kind: 'inaccurate', severity: 'impaired', title: '工作台右侧资料数和文件页对不上', submitter: '王总干事', org: 'CFFC 公益机构', version: 'V2.3.1', page: '客户工作台', os: 'macOS 14.6', status: 'pending',   createdAt: '2026-05-29 10:18' },
  { id: 'fb_03', kind: 'bug',        severity: 'impaired', title: 'AI 报错弹出英文 RuntimeError', submitter: '李 CEO',  org: '为爱黔行',     version: 'V2.3.0', page: '工作台问答', os: 'macOS 15.1', status: 'to_task',   createdAt: '2026-05-28 19:33' },
  { id: 'fb_04', kind: 'feature',    severity: 'minor',    title: '希望日历能拖任务批量改期', submitter: '陈同学',  org: '善加基金会',   version: 'V2.2.5', page: '任务日程', os: 'macOS 13.6', status: 'next_release', createdAt: '2026-05-27 09:05' },
  { id: 'fb_05', kind: 'lag',        severity: 'impaired', title: '深读大文件时界面卡 5 秒', submitter: '向工',    org: '日慈基金会',   version: 'V2.3.1', page: '数据中心', os: 'macOS 15.4', status: 'pending',   createdAt: '2026-05-30 08:41' },
];

interface PackageRow {
  id: string;
  platform: PlatformKey;
  version: string;
  fileName: string;
  size: string;
  sha256: string;
  downloadable: boolean;
  publishedAt: string;
}

const MOCK_PACKAGES: PackageRow[] = [
  { id: 'pkg_1', platform: 'mac',     version: 'V2.3.2', fileName: 'YiyuWorkbench-2.3.2-arm64.dmg', size: '278.4 MB', sha256: 'a1b2c3…9f0e', downloadable: true,  publishedAt: '2026-05-29' },
  { id: 'pkg_2', platform: 'mac',     version: 'V2.3.1', fileName: 'YiyuWorkbench-2.3.1-arm64.dmg', size: '276.3 MB', sha256: '7d8e9f…112a', downloadable: true,  publishedAt: '2026-05-27' },
  { id: 'pkg_3', platform: 'windows', version: 'V2.3.1', fileName: '—', size: '—', sha256: '—', downloadable: false, publishedAt: '—' },
];

// ============================================================
// 模块 1 · 当前版本（发版概览）
// ============================================================
export function ReleaseOverview() {
  return (
    <div className="space-y-6 max-w-[1200px]">
      <SectionTitle hint="本页所有数字是占位 mock，确定页面后再接 cloud_backend 发布真相源。">发版概览</SectionTitle>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="当前正式版本" value="V2.3.1" hint="macOS · 全量" />
        <KpiCard label="测试中版本"   value="V2.3.2" hint="灰度 · 内部组织" tone="blue" />
        <KpiCard label="待处理反馈"   value="2"      hint="另有 1 条阻塞级" tone="spark" />
        <KpiCard label="覆盖组织"     value="5"      hint="共 37 个客户端安装" tone="navy" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card>
          <SectionTitle hint="每个平台当前对外的正式版本与状态">各平台当前版本</SectionTitle>
          <div className="space-y-2.5">
            {([
              { p: 'mac' as PlatformKey,     v: 'V2.3.1', tone: 'green' as BadgeTone, st: '已发布' },
              { p: 'web' as PlatformKey,     v: 'V2.3.1', tone: 'green' as BadgeTone, st: '已发布' },
              { p: 'windows' as PlatformKey, v: '—',      tone: 'muted' as BadgeTone, st: '未支持' },
              { p: 'mobile' as PlatformKey,  v: '—',      tone: 'muted' as BadgeTone, st: '规划中' },
            ]).map(row => (
              <div key={row.p} className="flex items-center justify-between rounded-[12px] ring-1 ring-os-line px-4 py-3">
                <div className="flex items-center gap-2.5 text-[13px] font-medium text-os-navy">
                  <span className="text-os-blue/80">{PLATFORM_META[row.p].icon}</span>
                  {PLATFORM_META[row.p].label}
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-serif-display text-[15px] text-os-ink">{row.v}</span>
                  <Badge tone={row.tone}>{row.st}</Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <SectionTitle hint="最近发版与定向动作（占位）">最近发版活动</SectionTitle>
          <div className="space-y-3">
            {[
              { t: '2026-05-29', d: 'V2.3.2 进入测试中，定向推送至「益语智库（内部）」', tone: 'amber' as BadgeTone, st: '测试' },
              { t: '2026-05-27', d: 'V2.3.1 全量发布（macOS / 网页）', tone: 'green' as BadgeTone, st: '发布' },
              { t: '2026-05-22', d: 'V2.3.0 强制更新全量发布', tone: 'green' as BadgeTone, st: '发布' },
              { t: '2026-05-18', d: 'V2.2.5 回滚至 V2.2.4', tone: 'rose' as BadgeTone, st: '回滚' },
            ].map((row, i) => (
              <div key={i} className="flex gap-3">
                <div className="text-[11px] text-os-muted w-[72px] shrink-0 pt-0.5">{row.t}</div>
                <Badge tone={row.tone}>{row.st}</Badge>
                <div className="text-[12.5px] text-os-ink/85 leading-relaxed">{row.d}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

// ============================================================
// 模块 2 · 版本管理（含更新内容编辑）
// ============================================================
export function ReleaseVersions() {
  const [editing, setEditing] = useState<ReleaseRow | null>(null);
  return (
    <div className="space-y-5 max-w-[1200px]">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <SectionTitle hint="管理每一次发版：版本号 / 状态 / 平台 / 强制更新 / 更新内容。">版本管理</SectionTitle>
        <ToolbarButton onClick={() => setEditing(MOCK_RELEASES[0])}><Plus className="w-4 h-4" />新建版本</ToolbarButton>
      </div>

      <Card className="p-0 overflow-hidden">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="text-left text-[11px] tracking-[0.1em] text-os-muted uppercase border-b border-os-line">
              <th className="px-5 py-3 font-semibold">版本号</th>
              <th className="px-3 py-3 font-semibold">状态</th>
              <th className="px-3 py-3 font-semibold">平台</th>
              <th className="px-3 py-3 font-semibold">强制</th>
              <th className="px-3 py-3 font-semibold">发布时间</th>
              <th className="px-3 py-3 font-semibold">更新摘要</th>
              <th className="px-3 py-3 font-semibold text-right">操作</th>
            </tr>
          </thead>
          <tbody>
            {MOCK_RELEASES.map(r => (
              <tr key={r.id} className="border-b border-os-line/60 hover:bg-os-mist/40">
                <td className="px-5 py-3 font-serif-display text-[15px] text-os-navy">{r.version}</td>
                <td className="px-3 py-3"><Badge tone={RELEASE_STATUS_BADGE[r.status].tone}>{RELEASE_STATUS_BADGE[r.status].text}</Badge></td>
                <td className="px-3 py-3">
                  <div className="flex gap-1 text-os-blue/70">{r.platforms.map(p => <span key={p} title={PLATFORM_META[p].label}>{PLATFORM_META[p].icon}</span>)}</div>
                </td>
                <td className="px-3 py-3">{r.mandatory ? <Badge tone="rose">强制</Badge> : <span className="text-os-muted">—</span>}</td>
                <td className="px-3 py-3 text-os-muted">{r.publishedAt ?? '—'}</td>
                <td className="px-3 py-3 text-os-ink/75 max-w-[240px] truncate">{r.summary}</td>
                <td className="px-3 py-3 text-right">
                  <button onClick={() => setEditing(r)} className="inline-flex items-center gap-1 text-os-blue hover:text-os-navy text-[12px] font-semibold"><Edit2 className="w-3.5 h-3.5" />编辑</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {editing && <ReleaseEditDrawer release={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

function ReleaseEditDrawer({ release, onClose }: { release: ReleaseRow; onClose: () => void }) {
  const [noteTab, setNoteTab] = useState<'user' | 'internal'>('user');
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-full max-w-[560px] h-full bg-os-canvas shadow-2xl overflow-y-auto">
        <div className="sticky top-0 bg-os-paper/90 backdrop-blur border-b border-os-line px-6 py-4 flex items-center justify-between z-10">
          <div className="font-serif-display text-[18px] font-semibold text-os-navy">编辑版本 · {release.version}</div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-os-mist text-os-muted"><X className="w-4 h-4" /></button>
        </div>

        <div className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <Field label="版本号"><input className={inputCls} defaultValue={release.version} /></Field>
            <Field label="发版状态">
              <select className={inputCls} defaultValue={release.status}>
                <option value="draft">草稿</option><option value="testing">测试中</option>
                <option value="published">已发布</option><option value="rolled_back">已回滚</option>
              </select>
            </Field>
          </div>

          <Field label="支持平台">
            <div className="flex flex-wrap gap-2">
              {(Object.keys(PLATFORM_META) as PlatformKey[]).map(p => (
                <span key={p} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] ring-1 ${release.platforms.includes(p) ? 'bg-os-navy text-white ring-os-navy' : 'bg-os-paper text-os-muted ring-os-line'}`}>
                  {PLATFORM_META[p].icon}{PLATFORM_META[p].label}
                </span>
              ))}
            </div>
          </Field>

          <div className="flex items-center gap-6">
            <Toggle on={release.mandatory} label="强制更新" />
            <Toggle on={release.status === 'testing'} label="灰度发布" />
          </div>

          {/* 更新内容 (用户说明 vs 内部说明) */}
          <div>
            <div className="flex items-center gap-1 mb-2">
              <button onClick={() => setNoteTab('user')} className={`px-3 py-1.5 rounded-full text-[12px] font-semibold ${noteTab === 'user' ? 'bg-os-navy text-white' : 'text-os-muted hover:bg-os-mist'}`}>用户说明</button>
              <button onClick={() => setNoteTab('internal')} className={`px-3 py-1.5 rounded-full text-[12px] font-semibold ${noteTab === 'internal' ? 'bg-os-navy text-white' : 'text-os-muted hover:bg-os-mist'}`}>内部说明</button>
            </div>
            {noteTab === 'user' ? (
              <div className="space-y-3">
                <Field label="新增功能"><textarea rows={2} className={inputCls} placeholder="本次新增了…" /></Field>
                <Field label="修复问题"><textarea rows={2} className={inputCls} defaultValue="修复了战略陪伴状态显示、文件数量不一致、AI 报错提示等问题。" /></Field>
                <Field label="优化体验"><textarea rows={2} className={inputCls} /></Field>
                <Field label="已知问题"><textarea rows={2} className={inputCls} /></Field>
                <Field label="下一步计划"><textarea rows={2} className={inputCls} /></Field>
              </div>
            ) : (
              <Field label="内部详细说明（仅团队可见）" hint="如：修复 AI Health Contract、source registry、next_step links 等。">
                <textarea rows={6} className={inputCls} defaultValue="修复 AI Health Contract / source registry / next_step links；job_stage_runs 收口。" />
              </Field>
            )}
          </div>

          <Field label="更新截图 / 动图">
            <div className="rounded-[14px] border border-dashed border-os-line bg-os-canvas/50 px-4 py-6 text-center text-[12px] text-os-muted">
              <ImageIcon className="w-5 h-5 mx-auto mb-1.5 text-os-muted/70" />点击上传截图（占位，接数据时传 TOS）
            </div>
          </Field>

          <div className="flex gap-2 pt-2">
            <ToolbarButton onClick={log('save-release')}><CheckCircle2 className="w-4 h-4" />保存</ToolbarButton>
            <ToolbarButton variant="ghost" onClick={onClose}>取消</ToolbarButton>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// 模块 3 · 定向推送 ★（核心：多租户组织定向）
// ============================================================
export function ReleaseTargeting() {
  const [selectedRelease, setSelectedRelease] = useState('rel_232');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const allSelected = MOCK_ORGS.length > 0 && MOCK_ORGS.every(o => selected.has(o.id));
  const someSelected = selected.size > 0;
  const toggleOne = (id: string) => setSelected(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(MOCK_ORGS.map(o => o.id)));
  const clearSelection = () => setSelected(new Set());

  return (
    <div className="space-y-5 max-w-[1200px]">
      <SectionTitle hint="按「组织代码」把指定版本定向推送给一个 / 一批 / 全部组织。动态定向 + 静态交付。">定向推送</SectionTitle>

      <InfoBanner>
        <b>定向模型：</b>每个组织有唯一<b>组织代码</b>，客户端凭组织代码解析"我该装哪个版本"。决策动态（改指派即时生效），二进制走静态 TOS（云端抖动也不影响下载）。「内部 / 灰度 / 全量」= 定向的三种范围。
      </InfoBanner>

      <Card>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="text-[12px] font-semibold text-os-navy">推送版本</div>
          <select value={selectedRelease} onChange={e => setSelectedRelease(e.target.value)} className={`${inputCls} w-auto`}>
            {MOCK_RELEASES.filter(r => r.status !== 'rolled_back').map(r => <option key={r.id} value={r.id}>{r.version} · {RELEASE_STATUS_BADGE[r.status].text}</option>)}
          </select>
          <div className="flex-1" />
          <ToolbarButton onClick={log('push-all')}><Send className="w-4 h-4" />推送给全部组织</ToolbarButton>
        </div>
      </Card>

      {/* 批量操作条: 仅在选中组织时出现 */}
      {someSelected && (
        <div className="rounded-[14px] bg-os-navy text-white shadow-os px-4 py-2.5 flex items-center gap-3 flex-wrap text-[13px]">
          <span className="font-semibold">已选 {selected.size} 个组织</span>
          <span className="opacity-70">将推送 {MOCK_RELEASES.find(r => r.id === selectedRelease)?.version}</span>
          <div className="flex-1" />
          <button onClick={log('assign-selected')} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/15 hover:bg-white/25 font-semibold"><Send className="w-3.5 h-3.5" />推送给所选</button>
          <button onClick={log('gray-selected')} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/15 hover:bg-white/25 font-semibold"><Users2 className="w-3.5 h-3.5" />设为灰度</button>
          <button onClick={clearSelection} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full hover:bg-white/15 opacity-80"><X className="w-3.5 h-3.5" />清空</button>
        </div>
      )}

      <Card className="p-0 overflow-hidden">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="text-left text-[11px] tracking-[0.1em] text-os-muted uppercase border-b border-os-line">
              <th className="pl-5 pr-2 py-3"><CheckBox checked={allSelected} onChange={toggleAll} ariaLabel="全选" /></th>
              <th className="px-3 py-3 font-semibold">组织</th>
              <th className="px-3 py-3 font-semibold">组织代码</th>
              <th className="px-3 py-3 font-semibold">安装数</th>
              <th className="px-3 py-3 font-semibold">当前版本</th>
              <th className="px-3 py-3 font-semibold">已指派</th>
              <th className="px-3 py-3 font-semibold">范围 / 灰度</th>
              <th className="px-3 py-3 font-semibold text-right">操作</th>
            </tr>
          </thead>
          <tbody>
            {MOCK_ORGS.map(o => {
              const mode = o.targetMode === 'all' ? { tone: 'green' as BadgeTone, text: '全量' }
                        : o.targetMode === 'group' ? { tone: 'amber' as BadgeTone, text: `灰度 ${o.rolloutPct}%` }
                        : o.targetMode === 'org' ? { tone: 'blue' as BadgeTone, text: '定向' }
                        : { tone: 'muted' as BadgeTone, text: '未指派' };
              const isChecked = selected.has(o.id);
              return (
                <tr key={o.id} onClick={() => toggleOne(o.id)} className={`border-b border-os-line/60 cursor-pointer ${isChecked ? 'bg-os-mist/60' : 'hover:bg-os-mist/40'}`}>
                  <td className="pl-5 pr-2 py-3"><CheckBox checked={isChecked} onChange={() => toggleOne(o.id)} ariaLabel={`选择 ${o.name}`} /></td>
                  <td className="px-3 py-3 font-medium text-os-navy">{o.name}</td>
                  <td className="px-3 py-3">
                    <span className="inline-flex items-center gap-1.5 font-mono text-[12px] text-os-ink bg-os-canvas ring-1 ring-os-line rounded-md px-2 py-0.5">
                      {o.code}
                      <button onClick={(e) => { e.stopPropagation(); log('copy-code')(); }} className="text-os-muted hover:text-os-navy"><Copy className="w-3 h-3" /></button>
                    </span>
                  </td>
                  <td className="px-3 py-3 text-os-ink/80">{o.installs}</td>
                  <td className="px-3 py-3 text-os-muted">{o.currentVersion}</td>
                  <td className="px-3 py-3 font-serif-display text-os-ink">{o.assignedVersion ?? <span className="text-os-muted font-sans">—</span>}</td>
                  <td className="px-3 py-3"><Badge tone={mode.tone}>{mode.text}</Badge></td>
                  <td className="px-3 py-3 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                    <button onClick={log('assign-' + o.id)} className="text-os-blue hover:text-os-navy text-[12px] font-semibold mr-3">指派</button>
                    <button onClick={log('pause-' + o.id)} className="text-os-muted hover:text-amber-600 mr-2" title="暂停"><Pause className="w-3.5 h-3.5 inline" /></button>
                    <button onClick={log('rollback-' + o.id)} className="text-os-muted hover:text-rose-600" title="回滚到上一版"><RotateCcw className="w-3.5 h-3.5 inline" /></button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      <EmptyHint>
        勾选一个/多个组织 → 顶部批量条「推送给所选 / 设为灰度」；或点单行「指派」打开抽屉（占位）：范围 全部 / 指定组织 / 一批(灰度) → 灰度百分比滑块 → 强制更新开关 → 确认。回滚 = 把该组织的指派指回上一个版本，旧包不删。
      </EmptyHint>
    </div>
  );
}

// ============================================================
// 模块 4 · 用户反馈（收件箱 + 状态机）
// ============================================================
export function ReleaseFeedback() {
  const [detail, setDetail] = useState<FeedbackRow | null>(null);
  return (
    <div className="space-y-5 max-w-[1200px]">
      <SectionTitle hint="软件内「报错 / 提建议」自动带上下文进入这里，按状态机流转，可关联版本 / 任务 / 发版。">用户反馈</SectionTitle>

      <Card className="p-4">
        <div className="flex items-center gap-2 flex-wrap text-[12px]">
          <div className="inline-flex items-center gap-1.5 text-os-muted"><Search className="w-3.5 h-3.5" /></div>
          {['全部状态', '待处理', '已确认', '修复中', '下版发布', '已关闭'].map((s, i) => (
            <button key={s} onClick={log('filter-' + s)} className={`px-3 py-1.5 rounded-full font-semibold ${i === 0 ? 'bg-os-navy text-white' : 'text-os-muted ring-1 ring-os-line hover:bg-os-mist'}`}>{s}</button>
          ))}
          <div className="flex-1" />
          {(['bug', 'feature', 'lag'] as FeedbackKind[]).map(k => <Badge key={k} tone={FEEDBACK_KIND[k].tone}>{FEEDBACK_KIND[k].text}</Badge>)}
        </div>
      </Card>

      <Card className="p-0 overflow-hidden">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="text-left text-[11px] tracking-[0.1em] text-os-muted uppercase border-b border-os-line">
              <th className="px-5 py-3 font-semibold">类型</th>
              <th className="px-3 py-3 font-semibold">严重</th>
              <th className="px-3 py-3 font-semibold">标题</th>
              <th className="px-3 py-3 font-semibold">组织 / 提交人</th>
              <th className="px-3 py-3 font-semibold">版本 / 页面</th>
              <th className="px-3 py-3 font-semibold">状态</th>
              <th className="px-3 py-3 font-semibold text-right">时间</th>
            </tr>
          </thead>
          <tbody>
            {MOCK_FEEDBACK.map(f => (
              <tr key={f.id} onClick={() => setDetail(f)} className="border-b border-os-line/60 hover:bg-os-mist/40 cursor-pointer">
                <td className="px-5 py-3"><Badge tone={FEEDBACK_KIND[f.kind].tone}>{FEEDBACK_KIND[f.kind].text}</Badge></td>
                <td className="px-3 py-3"><Badge tone={SEVERITY[f.severity].tone}>{SEVERITY[f.severity].text}</Badge></td>
                <td className="px-3 py-3 text-os-navy font-medium max-w-[220px] truncate">{f.title}</td>
                <td className="px-3 py-3 text-os-ink/75">{f.org}<span className="text-os-muted"> · {f.submitter}</span></td>
                <td className="px-3 py-3 text-os-muted">{f.version} · {f.page}</td>
                <td className="px-3 py-3"><Badge tone={FEEDBACK_STATUS[f.status].tone}>{FEEDBACK_STATUS[f.status].text}</Badge></td>
                <td className="px-3 py-3 text-right text-[11px] text-os-muted whitespace-nowrap">{f.createdAt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {detail && <FeedbackDetailDrawer item={detail} onClose={() => setDetail(null)} />}
    </div>
  );
}

function FeedbackDetailDrawer({ item, onClose }: { item: FeedbackRow; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-full max-w-[560px] h-full bg-os-canvas shadow-2xl overflow-y-auto">
        <div className="sticky top-0 bg-os-paper/90 backdrop-blur border-b border-os-line px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-2">
            <Badge tone={FEEDBACK_KIND[item.kind].tone}>{FEEDBACK_KIND[item.kind].text}</Badge>
            <Badge tone={SEVERITY[item.severity].tone}>{SEVERITY[item.severity].text}</Badge>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-os-mist text-os-muted"><X className="w-4 h-4" /></button>
        </div>

        <div className="p-6 space-y-5">
          <div className="font-serif-display text-[18px] font-semibold text-os-navy leading-snug">{item.title}</div>

          <Card>
            <div className="text-[11px] tracking-[0.12em] text-os-muted uppercase font-semibold mb-3">自动采集的上下文</div>
            <div className="grid grid-cols-2 gap-y-2.5 gap-x-4 text-[12.5px]">
              <div><span className="text-os-muted">组织</span><div className="text-os-ink font-medium">{item.org}</div></div>
              <div><span className="text-os-muted">提交人</span><div className="text-os-ink font-medium">{item.submitter}</div></div>
              <div><span className="text-os-muted">版本</span><div className="text-os-ink font-medium">{item.version}</div></div>
              <div><span className="text-os-muted">页面</span><div className="text-os-ink font-medium">{item.page}</div></div>
              <div><span className="text-os-muted">操作系统</span><div className="text-os-ink font-medium">{item.os}</div></div>
              <div><span className="text-os-muted">提交时间</span><div className="text-os-ink font-medium">{item.createdAt}</div></div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div className="rounded-[12px] border border-dashed border-os-line bg-os-canvas/50 px-3 py-4 text-center text-[11px] text-os-muted"><ImageIcon className="w-4 h-4 mx-auto mb-1" />错误截图（占位）</div>
              <div className="rounded-[12px] border border-dashed border-os-line bg-os-canvas/50 px-3 py-4 text-center text-[11px] text-os-muted"><Clock className="w-4 h-4 mx-auto mb-1" />最近日志（已脱敏，占位）</div>
            </div>
          </Card>

          <Field label="用户描述">
            <div className="rounded-[10px] ring-1 ring-os-line bg-os-paper px-3 py-2.5 text-[13px] text-os-ink/85 leading-relaxed">点开战略陪伴刷新就白屏，要重启软件才能恢复。（mock）</div>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <button onClick={log('link-task')} className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-[10px] ring-1 ring-os-line text-[12.5px] font-semibold text-os-navy hover:bg-os-mist"><Link2 className="w-3.5 h-3.5" />关联任务</button>
            <button onClick={log('link-release')} className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-[10px] ring-1 ring-os-line text-[12.5px] font-semibold text-os-navy hover:bg-os-mist"><Tag className="w-3.5 h-3.5" />并入发版问题池</button>
          </div>

          <Field label="状态流转">
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(FEEDBACK_STATUS) as FeedbackStatus[]).map(s => (
                <button key={s} onClick={log('status-' + s)} className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ring-1 ${item.status === s ? 'bg-os-navy text-white ring-os-navy' : 'text-os-muted ring-os-line hover:bg-os-mist'}`}>{FEEDBACK_STATUS[s].text}</button>
              ))}
            </div>
          </Field>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// 模块 5 · 安装包 / 下载管理
// ============================================================
export function ReleaseDownloads() {
  return (
    <div className="space-y-5 max-w-[1200px]">
      <SectionTitle hint="管理各平台安装包：下载地址 / 大小 / 校验 / 是否可下载 / 历史版本。二进制存火山云 TOS，这里只管元数据。">安装包 / 下载管理</SectionTitle>

      <Card className="p-0 overflow-hidden">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="text-left text-[11px] tracking-[0.1em] text-os-muted uppercase border-b border-os-line">
              <th className="px-5 py-3 font-semibold">平台</th>
              <th className="px-3 py-3 font-semibold">版本</th>
              <th className="px-3 py-3 font-semibold">文件名</th>
              <th className="px-3 py-3 font-semibold">大小</th>
              <th className="px-3 py-3 font-semibold">校验 (SHA256)</th>
              <th className="px-3 py-3 font-semibold">发布日期</th>
              <th className="px-3 py-3 font-semibold text-right">状态</th>
            </tr>
          </thead>
          <tbody>
            {MOCK_PACKAGES.map(p => (
              <tr key={p.id} className="border-b border-os-line/60 hover:bg-os-mist/40">
                <td className="px-5 py-3"><span className="inline-flex items-center gap-1.5 text-os-navy font-medium">{PLATFORM_META[p.platform].icon}{PLATFORM_META[p.platform].label}</span></td>
                <td className="px-3 py-3 font-serif-display text-os-ink">{p.version}</td>
                <td className="px-3 py-3 text-os-ink/80 font-mono text-[11.5px] max-w-[240px] truncate">{p.fileName}</td>
                <td className="px-3 py-3 text-os-muted">{p.size}</td>
                <td className="px-3 py-3 text-os-muted font-mono text-[11px]">{p.sha256}</td>
                <td className="px-3 py-3 text-os-muted">{p.publishedAt}</td>
                <td className="px-3 py-3 text-right">
                  {p.downloadable
                    ? <button onClick={log('delist-' + p.id)} className="inline-flex items-center gap-1"><Badge tone="green">可下载</Badge></button>
                    : <Badge tone="muted">未提供</Badge>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <EmptyHint>
        安装包由发布脚本 <span className="font-mono">publish-to-tos.mjs</span> 上传到 TOS 后自动回写这里（版本 / 大小 / sha512 / blockmap / 下载 URL）。后台只做「上架 / 下架 / 历史保留」开关。
      </EmptyHint>
    </div>
  );
}

// ============================================================
// 模块 6 · 发版检查清单
// ============================================================
const CHECKLIST_ITEMS = [
  { label: 'P0 问题为 0', done: false },
  { label: '软件能正常启动', done: true },
  { label: '工作台能问答', done: true },
  { label: '战略陪伴能打开', done: true },
  { label: '文件导入能跑', done: true },
  { label: 'AI 状态一致', done: false },
  { label: '版本号一致（客户端 / 后端 / 仓库）', done: false },
  { label: '更新内容已写（用户版 + 内部版）', done: true },
  { label: '安装包已上传并校验', done: true },
  { label: '回滚版本可用', done: true },
];

export function ReleaseChecklist() {
  const [items, setItems] = useState(CHECKLIST_ITEMS);
  const passed = items.filter(i => i.done).length;
  const allDone = passed === items.length;
  const toggle = (idx: number) => setItems(prev => prev.map((it, i) => i === idx ? { ...it, done: !it.done } : it));

  return (
    <div className="space-y-5 max-w-[820px]">
      <SectionTitle hint="发版前逐项打勾。任一未通过则不允许发版（Release Readiness Gate）。">发版检查清单</SectionTitle>

      <Card>
        <div className="flex items-center justify-between mb-4">
          <div className="text-[13px] text-os-ink/80">已通过 <b className="text-os-navy">{passed}</b> / {items.length}</div>
          {allDone
            ? <Badge tone="green"><CheckCircle2 className="w-3.5 h-3.5" />可以发版</Badge>
            : <Badge tone="rose"><AlertTriangle className="w-3.5 h-3.5" />未达发版门槛</Badge>}
        </div>

        <div className="space-y-1.5">
          {items.map((it, idx) => (
            <button key={it.label} onClick={() => toggle(idx)} className="w-full flex items-center gap-3 rounded-[12px] px-4 py-3 ring-1 ring-os-line hover:bg-os-mist/40 text-left">
              {it.done
                ? <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                : <span className="w-5 h-5 rounded-full ring-1 ring-os-line shrink-0" />}
              <span className={`text-[13.5px] ${it.done ? 'text-os-ink' : 'text-os-muted'}`}>{it.label}</span>
            </button>
          ))}
        </div>

        <div className="mt-5 flex gap-2">
          <button disabled={!allDone} onClick={log('confirm-release')} className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-semibold transition-all ${allDone ? 'bg-gradient-to-r from-os-navy to-os-indigo text-white shadow-os hover:brightness-110' : 'bg-os-line/60 text-os-muted cursor-not-allowed'}`}>
            <Rocket className="w-4 h-4" />确认允许发版
          </button>
        </div>
      </Card>
    </div>
  );
}

// ============================================================
// 模块 7 · 官网同步（公开下载页预览）
// ============================================================
export function ReleaseWebsiteSync() {
  return (
    <div className="space-y-5 max-w-[1100px]">
      <SectionTitle hint="发版后官网下载页 / 更新日志自动派生自同一条 release 记录，不手写第二遍。这里预览对外效果。">官网同步</SectionTitle>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card>
          <SectionTitle hint="公开下载页将展示的内容（占位预览）">下载页预览</SectionTitle>
          <div className="rounded-[16px] ring-1 ring-os-line overflow-hidden">
            <div className="bg-gradient-to-br from-os-navy to-os-indigo text-white px-5 py-6">
              <div className="text-[11px] tracking-[0.16em] uppercase opacity-80">最新版本</div>
              <div className="font-serif-display text-[28px] font-semibold mt-1">益语智库 V2.3.1</div>
              <div className="text-[12px] opacity-80 mt-1">2026-05-27 发布 · macOS / 网页</div>
            </div>
            <div className="p-5 space-y-2">
              <button onClick={log('download-mac')} className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-os-navy text-white text-[13px] font-semibold"><Apple className="w-4 h-4" />下载 macOS 版</button>
              <button onClick={log('download-win')} className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full ring-1 ring-os-line text-os-muted text-[13px] font-semibold"><Monitor className="w-4 h-4" />Windows（即将开放）</button>
            </div>
          </div>
        </Card>

        <Card>
          <SectionTitle hint="更新日志 / 已知问题（派生自用户说明）">更新日志预览</SectionTitle>
          <div className="space-y-3 text-[13px]">
            <div>
              <div className="font-semibold text-os-navy mb-1">V2.3.1 · 2026-05-27</div>
              <ul className="list-disc pl-5 text-os-ink/80 space-y-1">
                <li>修复战略陪伴状态显示、文件数量不一致、AI 报错提示等问题</li>
                <li>战略陪伴改本地优先，断网可读上次版本</li>
              </ul>
            </div>
            <div className="rounded-[12px] bg-amber-50/60 ring-1 ring-amber-200/50 px-3 py-2 text-[12px] text-amber-800">
              <b>已知问题：</b>大文件深读偶发界面卡顿，下版优化。
            </div>
          </div>
        </Card>
      </div>

      <Card className="flex items-center justify-between flex-wrap gap-3">
        <div className="text-[12.5px] text-os-muted">将选定 release 的版本号 / 下载链接 / 更新日志 / 已知问题同步到官网公开页。</div>
        <div className="flex gap-2">
          <ToolbarButton variant="ghost" onClick={log('sync-preview')}><Globe className="w-4 h-4" />刷新预览</ToolbarButton>
          <ToolbarButton onClick={log('sync-publish')}><Send className="w-4 h-4" />同步到官网</ToolbarButton>
        </div>
      </Card>
    </div>
  );
}
