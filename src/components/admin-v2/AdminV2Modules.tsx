import { useState, useEffect, useCallback } from 'react';
import {
  Eye, ThumbsUp, FileText, Folder, Plus, Search, Filter, Edit2, Trash2, X,
  TrendingUp, ShoppingCart, Users, MessageSquare, CheckCircle,
  ChevronRight, Tag, Calendar, ExternalLink, Loader2, RefreshCw, AlertCircle,
  Mail,
} from 'lucide-react';
import { fetchAdminPaymentOrders, type PaymentOrder } from '../../lib/paymentApi';
import { fetchAdminUsers, type AdminManagedUser } from '../../lib/adminUserApi';
import { fetchAdminConsultRequests, type ConsultRequestRecord } from '../../lib/authApi';
import { fetchInviteCodes, createInviteCode, disableInviteCodeApi, deleteInviteCodeApi, type InviteCodeDto } from '../../lib/inviteCodeApi';
import { INVITE_CODE_TYPES } from '../../lib/inviteCodeTypes';
import { getReports, getInsights, deleteReport, saveReport, bootstrapFromPgApi, type Report, type ResourceTopic } from '../../lib/dataService';
import { parseFrontmatter } from '../../lib/reportMarkdown';
import { savePdf, deletePdf, isIdbPdf, IDB_PDF_PREFIX } from '../../lib/reportPdfStore';
import { clearPdfCoverCache } from '../PdfCoverImage';
import { useBetaApplications, deleteBetaApplication, getBetaApplicationByEmail, markBetaInviteSent, BETA_USER_TYPE_LABEL, type BetaApplication } from '../../lib/betaApplications';

// ============================================================
// admin-v2 · 后台模块实现.
// 内容/数据模块 (会员/订单/邀请码/咨询) 已接通 pg-auth-api 真实数据;
// 文章/报告/战略陪伴 仍为占位, 待后续接 dataService.
// ============================================================

// ============== 共用: 异步数据加载 hook + 状态壳 ==============
function useAsyncData<T>(loader: () => Promise<{ ok: boolean; data?: T; error?: string }>) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await loader();
      if (res.ok && res.data !== undefined) {
        setData(res.data);
      } else {
        setError(res.error || '加载失败，请稍后重试');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '网络异常，请稍后重试');
    } finally {
      setLoading(false);
    }
    // loader 由各模块用稳定引用传入
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { data, loading, error, reload };
}

function LoadingRow({ colSpan, label = '加载中…' }: { colSpan: number; label?: string }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-5 py-10 text-center text-os-muted text-[13px]">
        <span className="inline-flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />{label}</span>
      </td>
    </tr>
  );
}

function ErrorRow({ colSpan, message, onRetry }: { colSpan: number; message: string; onRetry: () => void }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-5 py-10 text-center text-[13px]">
        <span className="inline-flex items-center gap-2 text-rose-600"><AlertCircle className="w-4 h-4" />{message}</span>
        <button onClick={onRetry} className="ml-3 inline-flex items-center gap-1 text-os-blue hover:text-os-navy">
          <RefreshCw className="w-3.5 h-3.5" />重试
        </button>
      </td>
    </tr>
  );
}

function EmptyRow({ colSpan, label }: { colSpan: number; label: string }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-5 py-10 text-center text-os-muted text-[13px]">{label}</td>
    </tr>
  );
}

// ============== shared atoms ==============
function KpiCard({ label, value, hint, tone = 'navy' }: { label: string; value: string; hint?: string; tone?: 'navy' | 'blue' | 'spark' }) {
  const toneCls = tone === 'navy'  ? 'from-os-navy/[0.08] to-os-navy/[0.02] text-os-navy'
                : tone === 'blue'  ? 'from-os-blue/[0.10] to-os-blue/[0.02] text-os-blue'
                : 'from-os-spark/[0.10] to-os-spark/[0.02] text-os-spark';
  return (
    <div className={`relative rounded-[20px] ring-1 ring-os-line bg-gradient-to-br ${toneCls.split(' text-')[0]} p-5 overflow-hidden`}>
      <div className="text-[12px] tracking-[0.14em] font-semibold text-os-muted uppercase">{label}</div>
      <div className={`mt-2 font-serif-display text-[32px] font-semibold leading-none ${toneCls.split(' ').pop()}`}>{value}</div>
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
      {hint && <p className="mt-1 text-[12px] text-os-muted">{hint}</p>}
    </div>
  );
}

function StatusBadge({ status }: { status: 'published' | 'draft' | 'archived' | 'paid' | 'pending' | 'refund' | 'parsed' }) {
  const cls = {
    published: 'bg-emerald-50 text-emerald-700 ring-emerald-200/60',
    parsed:    'bg-os-blue/10 text-os-blue ring-os-blue/25',
    paid:      'bg-emerald-50 text-emerald-700 ring-emerald-200/60',
    draft:     'bg-os-mist text-os-blue ring-os-blue/20',
    pending:   'bg-amber-50 text-amber-700 ring-amber-200/60',
    archived:  'bg-os-canvas text-os-muted ring-os-line',
    refund:    'bg-rose-50 text-rose-700 ring-rose-200/60',
  }[status];
  const text = { published: '已发布', parsed: '已解析', draft: '草稿', archived: '已归档', paid: '已支付', pending: '待处理', refund: '已退款' }[status];
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ring-1 ${cls}`}>{text}</span>;
}

function EmptyHint({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-[14px] border border-dashed border-os-line bg-os-canvas/50 px-4 py-3 text-[12px] text-os-muted leading-relaxed">
      {children}
    </div>
  );
}

function ToolbarButton({ onClick, children, variant = 'primary' }: { onClick?: () => void; children: React.ReactNode; variant?: 'primary' | 'ghost' }) {
  const cls = variant === 'primary'
    ? 'bg-os-navy text-white hover:bg-os-navy/90 shadow-os'
    : 'bg-os-paper text-os-navy ring-1 ring-os-line hover:ring-os-navy/30';
  return (
    <button onClick={onClick} className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-semibold transition-all ${cls}`}>
      {children}
    </button>
  );
}

// ============== Mock 数据 (placeholder, 接数据时全部替换) ==============
const MOCK_ARTICLES = [
  { id: 'a1', title: '为什么组织经营不能切碎',     topics: ['战略', '组织'],       publishDate: '2026-05-20', status: 'published' as const, views: 1284, likes: 42 },
  { id: 'a2', title: 'AI 工作流的三层架构思考',     topics: ['AI 技术'],          publishDate: '2026-05-15', status: 'published' as const, views: 891,  likes: 28 },
  { id: 'a3', title: '从点子到工具:战略陪伴的演化',  topics: ['战略', '业务设计'],   publishDate: '2026-05-10', status: 'draft' as const,      views: 0,    likes: 0 },
];

// MOCK_MEMBERS / MOCK_ORDERS / MOCK_CONSULT_REQUESTS 已移除 — 会员/订单/咨询 三模块已接通 pg-auth-api 真实数据.

const MOCK_STRATEGY_CLIENTS = [
  { id: 's1', org: '日慈基金会',     leader: '张秘书长',     since: '2025-08-01', status: '陪伴中' },
  { id: 's2', org: 'CFFC 公益机构',  leader: '王总干事',     since: '2025-03-15', status: '陪伴中' },
  { id: 's3', org: '某社会创新组织', leader: '陈联合创始人', since: '2024-11-20', status: '复盘期' },
];

// ============== Module: Dashboard Overview ==============
export function DashboardOverview() {
  // 文章/报告: 同步读本地 (后端已 bootstrap); 付费会员/营收: 异步拉真实订单与用户.
  const articleCount = getInsights().length;
  const reportCount = getReports().length;

  const { data: kpi, loading: kpiLoading } = useAsyncData<{ paidMembers: number; monthRevenueFen: number }>(async () => {
    const [usersRes, ordersRes] = await Promise.all([fetchAdminUsers(), fetchAdminPaymentOrders(200)]);
    if (!usersRes.ok && !ordersRes.ok) {
      return { ok: false, error: usersRes.error || ordersRes.error || '加载失败' };
    }
    const users = usersRes.data || [];
    const orders = ordersRes.data || [];
    const now = new Date();
    const monthRevenueFen = orders
      .filter(o => o.status === 'paid' && o.paidAt && (() => {
        const d = new Date(o.paidAt!);
        return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
      })())
      .reduce((sum, o) => sum + (o.amountFen || 0), 0);
    return { ok: true, data: { paidMembers: users.filter(isPaidMember).length, monthRevenueFen } };
  });

  const kpiVal = (v: number | undefined, fmt: (n: number) => string) =>
    kpiLoading ? '…' : v === undefined ? '—' : fmt(v);

  return (
    <div className="space-y-6 max-w-[1200px]">
      <SectionTitle hint="KPI 已接通真实数据 (文章/报告/付费会员/本月营收)；下方趋势图与活动流仍为占位。">
        数据概览
      </SectionTitle>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="文章总数"     value={String(articleCount)} />
        <KpiCard label="报告总数"     value={String(reportCount)} tone="blue" />
        <KpiCard label="付费会员"     value={kpiVal(kpi?.paidMembers, n => String(n))} tone="spark" />
        <KpiCard label="本月营收"     value={kpiVal(kpi?.monthRevenueFen, n => `¥${(n / 100).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)} tone="navy" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card className="lg:col-span-2">
          <SectionTitle hint="近 7 天浏览/转化趋势 (占位)">访问与转化趋势</SectionTitle>
          <div className="h-[220px] rounded-[14px] bg-gradient-to-br from-os-mist/40 to-os-canvas border border-dashed border-os-line flex items-center justify-center text-os-muted text-[13px]">
            图表占位 · 接数据时用 ECharts / Recharts 绘制
          </div>
        </Card>

        <Card>
          <SectionTitle hint="最近 5 条系统活动">最近活动</SectionTitle>
          <ul className="space-y-3">
            {[
              '王女士 · 开通付费会员年卡',
              '刘先生 · 下载《分工创造分工》报告',
              '某基金会 · 提交组织诊断申请',
              '系统 · 新增文章《AI 工作流的三层架构》',
              '陈同学 · 注册账号',
            ].map((act, i) => (
              <li key={i} className="flex items-start gap-2 text-[13px] text-os-ink/85 leading-relaxed">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-os-blue/70 shrink-0" />
                {act}
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <EmptyHint>
        ★ 数据占位说明: 所有 KPI/图表/活动列表当前是 mock placeholder, 等 admin-v2 全部模块功能验收完, 统一接入 dataService.getInsights/getReports/getUsers/getOrders 和 pg-auth-api 真实数据。
      </EmptyHint>
    </div>
  );
}

// ============== Module: Articles Management ==============
export function ArticlesManagement() {
  const [editing, setEditing] = useState<typeof MOCK_ARTICLES[number] | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const article = editing;
  const open = showCreate || editing;

  return (
    <div className="space-y-5 max-w-[1200px]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SectionTitle hint={`共 ${MOCK_ARTICLES.length} 篇 · 数据占位, 接数据后从 getInsights() 拉`}>文章管理</SectionTitle>
        <ToolbarButton onClick={() => setShowCreate(true)}><Plus className="w-3.5 h-3.5" />新增文章</ToolbarButton>
      </div>

      {/* 搜索+筛选 */}
      <Card className="!p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-64 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-os-muted" />
            <input
              type="text"
              placeholder="搜索标题/标签..."
              className="w-full pl-10 pr-4 py-2 bg-os-canvas rounded-full ring-1 ring-os-line text-[13px] focus:outline-none focus:ring-2 focus:ring-os-navy/30"
            />
          </div>
          <select className="px-3 py-2 bg-os-canvas rounded-full ring-1 ring-os-line text-[13px] cursor-pointer focus:outline-none focus:ring-2 focus:ring-os-navy/30">
            <option>全部标签</option><option>战略</option><option>业务设计</option><option>组织</option><option>AI 技术</option>
          </select>
          <select className="px-3 py-2 bg-os-canvas rounded-full ring-1 ring-os-line text-[13px] cursor-pointer focus:outline-none focus:ring-2 focus:ring-os-navy/30">
            <option>全部状态</option><option>已发布</option><option>草稿</option><option>已归档</option>
          </select>
        </div>
      </Card>

      {/* 列表 */}
      <Card className="!p-0 overflow-hidden">
        <table className="w-full text-[13px]">
          <thead className="bg-os-canvas/70 border-b border-os-line">
            <tr className="text-left text-os-muted text-[11px] uppercase tracking-[0.14em]">
              <th className="px-5 py-3 font-semibold">标题</th>
              <th className="px-3 py-3 font-semibold">标签</th>
              <th className="px-3 py-3 font-semibold">发布日期</th>
              <th className="px-3 py-3 font-semibold">状态</th>
              <th className="px-3 py-3 font-semibold text-right">浏览/赞</th>
              <th className="px-5 py-3 font-semibold w-28">操作</th>
            </tr>
          </thead>
          <tbody>
            {MOCK_ARTICLES.map(a => (
              <tr key={a.id} className="border-b border-os-line/60 hover:bg-os-canvas/40 transition-colors">
                <td className="px-5 py-3">
                  <div className="font-medium text-os-ink">{a.title}</div>
                </td>
                <td className="px-3 py-3 text-os-muted">{a.topics.join(' / ')}</td>
                <td className="px-3 py-3 text-os-muted">{a.publishDate}</td>
                <td className="px-3 py-3"><StatusBadge status={a.status} /></td>
                <td className="px-3 py-3 text-right text-os-muted">
                  <span className="inline-flex items-center gap-1"><Eye className="w-3 h-3" />{a.views}</span>
                  <span className="ml-3 inline-flex items-center gap-1"><ThumbsUp className="w-3 h-3" />{a.likes}</span>
                </td>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-1">
                    <button onClick={() => setEditing(a)} className="p-1.5 rounded-md hover:bg-os-mist text-os-blue" title="编辑"><Edit2 className="w-3.5 h-3.5" /></button>
                    <button onClick={() => console.log('删除', a.id)} className="p-1.5 rounded-md hover:bg-rose-50 text-rose-600" title="删除"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <EmptyHint>★ 占位: 表格数据来自 MOCK_ARTICLES。接数据时换成 getInsights().filter(a =&gt; a.status === 'published') 并加分页。</EmptyHint>

      {open && (
        <FormModal
          title={article ? '编辑文章' : '新增文章'}
          onClose={() => { setEditing(null); setShowCreate(false); }}
          fields={[
            { label: '标题',     defaultValue: article?.title ?? '' },
            { label: '摘要',     type: 'textarea', defaultValue: '' },
            { label: '正文',     type: 'textarea', defaultValue: '富文本编辑器占位 · 接数据时挂 TipTap' },
            { label: '标签',     defaultValue: article?.topics.join(', ') ?? '' },
            { label: '封面图',   defaultValue: '' },
            { label: '状态',     type: 'select', defaultValue: article?.status ?? 'draft', options: ['draft', 'published', 'archived'] },
            { label: '付费门控', type: 'select', defaultValue: 'free', options: ['free', 'paid'] },
          ]}
        />
      )}
    </div>
  );
}

// ============== Module: Reports Management (真接 dataService.getReports) ==============
const REPORT_STATUS_FILTERS = [
  { key: 'all', label: '全部' },
  { key: 'parsed', label: '已解析' },
  { key: 'published', label: '已发布' },
  { key: 'draft', label: '草稿' },
  { key: 'archived', label: '已归档' },
] as const;

export function ReportsManagement() {
  const [statusTab, setStatusTab] = useState<'all' | 'published' | 'draft' | 'archived' | 'parsed'>('all');
  const [reports, setReports] = useState<Report[]>(() => getReports());
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [editing, setEditing] = useState<Report | null>(null);
  const [showBatch, setShowBatch] = useState(false);
  const [uploading, setUploading] = useState<{ id: string; pct: number } | null>(null);

  // 报告由 bootstrapFromPgApi 从后端同步进 localStorage, getReports() 同步读取.
  const reload = useCallback(async () => {
    setLoading(true);
    setMsg(null);
    try {
      await bootstrapFromPgApi();
      setReports(getReports());
    } catch (e) {
      setMsg({ type: 'error', text: e instanceof Error ? e.message : '刷新失败' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // 首次进入若本地为空, 触发一次后端同步
    if (getReports().length === 0) void reload();
  }, [reload]);

  const list = reports.filter(r => statusTab === 'all' || r.status === statusTab);

  const handleDelete = (r: Report) => {
    if (!window.confirm(`确定删除报告《${r.title}》？此操作不可恢复。`)) return;
    const ok = deleteReport(r.id);
    if (ok) {
      if (isIdbPdf(r.fileUrl)) void deletePdf(r.id);
      setReports(getReports());
      setMsg({ type: 'success', text: `已删除《${r.title}》` });
    } else {
      setMsg({ type: 'error', text: '删除失败' });
    }
  };

  // 列表内直接上传 PDF 附件 (存 IndexedDB, fileUrl 标记为 idb://<id>) + 进度条
  const handleUploadPdf = (r: Report, file: File) => {
    if (!file) return;
    if (!/pdf$/i.test(file.name) && file.type !== 'application/pdf') {
      setMsg({ type: 'error', text: '请选择 PDF 文件' });
      return;
    }
    setMsg(null);
    setUploading({ id: r.id, pct: 0 });
    const reader = new FileReader();
    reader.onprogress = (e) => {
      if (e.lengthComputable) setUploading({ id: r.id, pct: Math.round((e.loaded / e.total) * 90) });
    };
    reader.onerror = () => {
      setUploading(null);
      setMsg({ type: 'error', text: 'PDF 读取失败' });
    };
    reader.onload = async () => {
      try {
        setUploading({ id: r.id, pct: 95 });
        await savePdf(r.id, file);
        // 替换 PDF 后清掉旧封面缓存(新旧 fileUrl 都清), 让卡片重渲染新封面
        if (r.fileUrl) clearPdfCoverCache(r.fileUrl);
        clearPdfCoverCache(`${IDB_PDF_PREFIX}${r.id}`);
        saveReport({ id: r.id, fileUrl: `${IDB_PDF_PREFIX}${r.id}`, fileSize: file.size });
        setReports(getReports());
        setUploading({ id: r.id, pct: 100 });
        setMsg({ type: 'success', text: `已为《${r.title}》上传 PDF（${(file.size / 1024 / 1024).toFixed(1)} MB）` });
        window.setTimeout(() => setUploading((u) => (u && u.id === r.id ? null : u)), 700);
      } catch (e) {
        setUploading(null);
        setMsg({ type: 'error', text: 'PDF 上传失败：' + (e instanceof Error ? e.message : String(e)) });
      }
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <div className="space-y-5 max-w-[1200px]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SectionTitle hint={loading ? '正在从后端同步报告…' : `共 ${reports.length} 个报告 · 已发布 ${reports.filter(r => r.status === 'published').length}`}>报告管理</SectionTitle>
        <div className="flex items-center gap-2">
          <ToolbarButton variant="ghost" onClick={reload}><RefreshCw className="w-3.5 h-3.5" />刷新</ToolbarButton>
          <ToolbarButton onClick={() => setShowBatch(true)}><Plus className="w-3.5 h-3.5" />新增报告</ToolbarButton>
        </div>
      </div>

      {msg && (
        <div className={`rounded-[12px] px-4 py-2.5 text-[13px] ${msg.type === 'success' ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60' : 'bg-rose-50 text-rose-700 ring-1 ring-rose-200/60'}`}>
          {msg.text}
        </div>
      )}

      {/* 状态筛选 tab */}
      <div className="flex items-center gap-2 border-b border-os-line">
        {REPORT_STATUS_FILTERS.map(t => (
          <button
            key={t.key}
            onClick={() => setStatusTab(t.key)}
            className={`px-4 py-2.5 text-[13px] font-medium transition-colors border-b-2 ${
              statusTab === t.key
                ? 'text-os-navy border-os-navy'
                : 'text-os-muted border-transparent hover:text-os-ink'
            }`}
          >
            {t.label}
            <span className="ml-1.5 text-[11px] text-os-muted/70">
              ({t.key === 'all' ? reports.length : reports.filter(r => r.status === t.key).length})
            </span>
          </button>
        ))}
      </div>

      {/* 列表 */}
      <Card className="!p-0 overflow-hidden">
        <table className="w-full text-[13px]">
          <thead className="bg-os-canvas/70 border-b border-os-line">
            <tr className="text-left text-os-muted text-[11px] uppercase tracking-[0.14em]">
              <th className="px-5 py-3 font-semibold">标题</th>
              <th className="px-3 py-3 font-semibold">出版方</th>
              <th className="px-3 py-3 font-semibold">标签</th>
              <th className="px-3 py-3 font-semibold">发布日期</th>
              <th className="px-3 py-3 font-semibold">状态</th>
              <th className="px-3 py-3 font-semibold">PDF 附件</th>
              <th className="px-3 py-3 font-semibold text-right">浏览 / 下载</th>
              <th className="px-5 py-3 font-semibold w-20">操作</th>
            </tr>
          </thead>
          <tbody>
            {loading && reports.length === 0 ? (
              <LoadingRow colSpan={8} label="加载报告中…" />
            ) : list.length === 0 ? (
              <EmptyRow colSpan={8} label={reports.length === 0 ? '暂无报告' : '该状态下暂无报告'} />
            ) : (
              list.map(r => {
                const hasPdf = !!r.fileUrl;
                return (
                <tr key={r.id} className="border-b border-os-line/60 hover:bg-os-canvas/40 transition-colors">
                  <td className="px-5 py-3 font-medium text-os-ink">{r.title}</td>
                  <td className="px-3 py-3 text-os-muted">{r.publisher || '—'}</td>
                  <td className="px-3 py-3 text-os-muted">{(r.topics || []).join(' / ') || '—'}</td>
                  <td className="px-3 py-3 text-os-muted">{r.publishDate || '—'}</td>
                  <td className="px-3 py-3"><StatusBadge status={r.status} /></td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    {uploading && uploading.id === r.id ? (
                      <div className="w-[130px]">
                        <div className="h-1.5 rounded-full bg-os-mist overflow-hidden">
                          <div className="h-full rounded-full bg-os-blue transition-[width] duration-150" style={{ width: `${uploading.pct}%` }} />
                        </div>
                        <div className="mt-1 text-[11px] text-os-muted tabular-nums">{uploading.pct < 95 ? `上传中 ${uploading.pct}%` : uploading.pct < 100 ? '写入中…' : '完成 ✓'}</div>
                      </div>
                    ) : (
                      <label className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-medium cursor-pointer ring-1 transition ${hasPdf ? 'bg-emerald-50 text-emerald-700 ring-emerald-200/60 hover:ring-emerald-400' : 'bg-os-paper text-os-blue ring-os-line hover:ring-os-navy/40'}`}>
                        <input type="file" accept="application/pdf,.pdf" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUploadPdf(r, f); e.currentTarget.value = ''; }} />
                        {hasPdf
                          ? <><CheckCircle className="w-3.5 h-3.5" />已附 · 替换</>
                          : <><Plus className="w-3.5 h-3.5" />上传 PDF</>}
                      </label>
                    )}
                  </td>
                  <td className="px-3 py-3 text-right text-os-muted">
                    <span className="inline-flex items-center gap-1"><Eye className="w-3 h-3" />{r.views ?? 0}</span>
                    <span className="ml-3">↓ {r.downloads ?? 0}</span>
                  </td>
                  <td className="px-5 py-3 whitespace-nowrap">
                    <button onClick={() => setEditing(r)} className="p-1.5 rounded-md hover:bg-os-mist text-os-blue mr-1" title="编辑"><Edit2 className="w-3.5 h-3.5" /></button>
                    <button onClick={() => handleDelete(r)} className="p-1.5 rounded-md hover:bg-rose-50 text-rose-600" title="删除"><Trash2 className="w-3.5 h-3.5" /></button>
                  </td>
                </tr>
                );
              })
            )}
          </tbody>
        </table>
      </Card>

      {editing && (
        <ReportEditModal
          report={editing}
          onClose={() => setEditing(null)}
          onSaved={(saved) => {
            setReports(getReports());
            setEditing(null);
            setMsg({ type: 'success', text: `已保存《${saved.title}》` });
          }}
        />
      )}

      {showBatch && (
        <ReportBatchUploadModal
          existingIds={new Set(reports.map(r => r.id))}
          onClose={() => setShowBatch(false)}
          onDone={(n) => { setReports(getReports()); setMsg({ type: 'success', text: `批量导入完成 · 成功 ${n} 份` }); }}
        />
      )}
    </div>
  );
}

// ============== 新增报告 · 上传 Markdown(可批量, 队列排队) ==============
// 选 1–20 份 .md → 排队逐个解析: 按 frontmatter 建/更新报告(状态=已解析), 正文取自 MD。
// PDF 不在此阶段绑定; 建好结构后在报告管理列表逐行「上传 PDF」。
const MAX_BATCH = 20;
type QueueItem = { name: string; status: 'pending' | 'uploading' | 'done' | 'error'; action?: string; msg?: string };

function ReportBatchUploadModal({ existingIds, onClose, onDone }: { existingIds: Set<string>; onClose: () => void; onDone: (n: number) => void }) {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const allowed: ResourceTopic[] = ['战略', '业务设计', '组织', 'AI 技术'];

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    let files = Array.from(fileList);
    if (files.length > MAX_BATCH) {
      setNotice(`一次最多 ${MAX_BATCH} 份，已取前 ${MAX_BATCH} 份；其余请分批上传。`);
      files = files.slice(0, MAX_BATCH);
    } else {
      setNotice(null);
    }

    setBusy(true);
    // 初始化队列(全部排队中)
    const init: QueueItem[] = files.map((f) => ({ name: f.name, status: 'pending' }));
    setQueue(init);
    let okCount = 0;

    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      setQueue((q) => q.map((it, j) => (j === i ? { ...it, status: 'uploading' } : it)));
      try {
        const text = await f.text();
        const { meta } = parseFrontmatter(text);
        const base = f.name.replace(/\.(md|markdown|txt)$/i, '').trim();
        const id = base;
        const rawTopics = Array.isArray(meta.topics) ? meta.topics : [];
        const topics = rawTopics.filter((tp): tp is ResourceTopic => allowed.includes(tp as ResourceTopic));
        const existed = existingIds.has(id);
        saveReport({
          id,
          title: (meta.title || base).trim(),
          publisher: (meta.publisher || '').trim(),
          summary: (meta.summary || '').trim(),
          topics: topics.length ? topics : ['战略'],
          publishDate: (meta.date || new Date().toISOString().slice(0, 10)).trim(),
          status: 'parsed', // 已从 Markdown 解析出正文
          markdownContent: text,
          showOnHome: false,
        });
        const action = existed ? '更新' : '已解析';
        setQueue((q) => q.map((it, j) => (j === i ? { ...it, status: 'done', action } : it)));
        okCount++;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setQueue((q) => q.map((it, j) => (j === i ? { ...it, status: 'error', msg } : it)));
      }
    }
    setBusy(false);
    onDone(okCount);
  };

  return (
    <div className="fixed inset-0 z-[80] flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-full max-w-[560px] h-full bg-os-canvas shadow-2xl overflow-y-auto">
        <div className="sticky top-0 z-10 flex items-center justify-between bg-os-paper/90 backdrop-blur border-b border-os-line px-6 py-4">
          <div className="font-serif-display text-[18px] font-semibold text-os-navy">新增报告 · 上传 Markdown</div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-os-mist text-os-muted"><X className="w-4 h-4" /></button>
        </div>

        <div className="p-6 space-y-4">
          <label className={`block rounded-[16px] border-2 border-dashed px-6 py-10 text-center transition ${busy ? 'border-os-line bg-os-mist/40 cursor-default' : 'border-os-navy/30 bg-os-paper cursor-pointer hover:border-os-navy/60'}`}>
            <input type="file" accept=".md,.markdown,.txt,text/markdown" multiple className="hidden" disabled={busy} onChange={(e) => void handleFiles(e.target.files)} />
            <FileText className="w-8 h-8 text-os-navy/60 mx-auto mb-3" />
            <div className="text-[15px] font-semibold text-os-navy">{busy ? '正在解析…' : '点击选择 Markdown 文档'}</div>
            <div className="text-[12.5px] text-os-muted mt-1.5 leading-5">可一次选 1–{MAX_BATCH} 份 <code className="px-1 rounded bg-os-mist font-mono">.md</code>，自动排队解析建报告</div>
          </label>

          {notice && <div className="rounded-[10px] bg-amber-50 ring-1 ring-amber-200/60 px-3.5 py-2 text-[12.5px] text-amber-700">{notice}</div>}

          {queue.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-[12px] font-semibold text-os-navy">
                解析队列（{queue.filter(q => q.status === 'done').length}/{queue.length} 完成{busy ? ' · 进行中…' : ''}）
              </div>
              {queue.map((q, i) => (
                <div key={i} className={`flex items-center justify-between gap-3 rounded-[10px] px-3 py-2 text-[12.5px] ring-1 ${
                  q.status === 'done' ? 'bg-os-blue/[0.06] ring-os-blue/20 text-os-navy'
                  : q.status === 'error' ? 'bg-rose-50 ring-rose-200/60 text-rose-700'
                  : q.status === 'uploading' ? 'bg-os-mist ring-os-line text-os-navy'
                  : 'bg-os-paper ring-os-line text-os-muted'}`}>
                  <span className="truncate">{q.name}</span>
                  <span className="shrink-0 font-medium inline-flex items-center gap-1">
                    {q.status === 'pending' && '排队中'}
                    {q.status === 'uploading' && <><Loader2 className="w-3.5 h-3.5 animate-spin" />解析中</>}
                    {q.status === 'done' && <><CheckCircle className="w-3.5 h-3.5" />{q.action}</>}
                    {q.status === 'error' && `✗ ${q.msg}`}
                  </span>
                </div>
              ))}
            </div>
          )}

          <div className="rounded-[12px] bg-os-mist/40 ring-1 ring-os-line px-4 py-3 text-[12px] text-os-muted leading-6">
            • 每份 MD 顶部 frontmatter 提供 title/publisher/date/summary/topics(仅限 战略·业务设计·组织·AI 技术)，正文取自 MD，建好后状态为「已解析」。<br />
            • 文件名作报告 id（<code className="px-1 rounded bg-os-mist font-mono">xxx.md</code> → id <code className="px-1 rounded bg-os-mist font-mono">xxx</code>，同名重传=更新）。<br />
            • 之后在报告管理列表每行点「<b>上传 PDF</b>」补上 PDF 附件，用户即可下载。
          </div>

          <div className="flex justify-end pt-1">
            <button onClick={onClose} disabled={busy} className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full text-[13px] font-semibold bg-os-navy text-white hover:bg-os-navy/90 shadow-os disabled:opacity-50">{busy ? '解析中…' : '完成'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============== 报告 新增/编辑 弹窗 (含 PDF 路径 + Markdown 解读文档) ==============
const REPORT_TOPICS: ResourceTopic[] = ['战略', '业务设计', '组织', 'AI 技术'];

function ReportEditModal({ report, onClose, onSaved }: { report: Report | null; onClose: () => void; onSaved: (r: Report) => void }) {
  const [title, setTitle] = useState(report?.title ?? '');
  const [publisher, setPublisher] = useState(report?.publisher ?? '');
  const [summary, setSummary] = useState(report?.summary ?? '');
  const [publishDate, setPublishDate] = useState(report?.publishDate ?? new Date().toISOString().slice(0, 10));
  const [pages, setPages] = useState<string>(report?.pages ? String(report.pages) : '');
  const [status, setStatus] = useState<Report['status']>(report?.status ?? 'published');
  const [fileUrl, setFileUrl] = useState(report?.fileUrl ?? '');
  const [pdfFile, setPdfFile] = useState<File | null>(null); // 新选的 PDF (存 IndexedDB)
  const [markdownUrl, setMarkdownUrl] = useState(report?.markdownUrl ?? '');
  const [markdownContent, setMarkdownContent] = useState(report?.markdownContent ?? '');
  const [topics, setTopics] = useState<ResourceTopic[]>(report?.topics ?? ['战略']);
  const [showOnHome, setShowOnHome] = useState<boolean>(report?.showOnHome ?? false);
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const toggleTopic = (tpc: ResourceTopic) =>
    setTopics(prev => prev.includes(tpc) ? prev.filter(x => x !== tpc) : [...prev, tpc]);

  // 从 MD frontmatter 自动提炼元信息。overwrite=true(上传文件时)覆盖, false(手动粘贴时)只填空白。
  const applyMeta = (text: string, overwrite: boolean) => {
    const { meta } = parseFrontmatter(text);
    if (meta.title && (overwrite || !title.trim())) setTitle(meta.title);
    if (meta.publisher && (overwrite || !publisher.trim())) setPublisher(meta.publisher);
    if (meta.summary && (overwrite || !summary.trim())) setSummary(meta.summary);
    if (meta.date && (overwrite || !report?.publishDate)) setPublishDate(meta.date);
    if (Array.isArray(meta.topics)) {
      const tps = meta.topics.filter((tp): tp is ResourceTopic => REPORT_TOPICS.includes(tp as ResourceTopic));
      if (tps.length && (overwrite || !report?.topics?.length)) setTopics(tps);
    }
  };

  const onPickMd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => { const txt = String(reader.result || ''); setMarkdownContent(txt); applyMeta(txt, true); };
    reader.readAsText(f);
  };

  const onPickPdf = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!/pdf$/i.test(f.name) && f.type !== 'application/pdf') { setErr('请选择 PDF 文件'); return; }
    setPdfFile(f);
    setErr(null);
  };

  const handleSave = async () => {
    if (!title.trim()) { setErr('请填写报告标题'); return; }
    setSaving(true);
    try {
      // 先存一次拿到 id(新报告 id 由 saveReport 生成)
      const base = saveReport({
        ...(report?.id ? { id: report.id } : {}),
        title: title.trim(),
        publisher: publisher.trim(),
        summary: summary.trim(),
        topics,
        publishDate,
        pages: pages ? Number(pages) : undefined,
        status,
        markdownUrl: markdownUrl.trim() || undefined,
        markdownContent: markdownContent.trim() || undefined,
        showOnHome,
        ...(pdfFile ? {} : { fileUrl: fileUrl.trim() || undefined }),
      });
      let saved = base;
      if (pdfFile) {
        await savePdf(base.id, pdfFile);
        saved = saveReport({ id: base.id, fileUrl: `${IDB_PDF_PREFIX}${base.id}`, fileSize: pdfFile.size });
      }
      onSaved(saved);
    } catch (e) {
      setErr('保存失败：' + (e instanceof Error ? e.message : String(e)));
    } finally {
      setSaving(false);
    }
  };

  const inputCls = 'w-full rounded-[10px] ring-1 ring-os-line bg-os-paper px-3 py-2 text-[13px] text-os-ink focus:ring-os-navy/40 focus:outline-none';
  const labelCls = 'text-[12px] font-semibold text-os-navy mb-1.5 block';

  return (
    <div className="fixed inset-0 z-[80] flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-full max-w-[640px] h-full bg-os-canvas shadow-2xl overflow-y-auto">
        <div className="sticky top-0 z-10 flex items-center justify-between bg-os-paper/90 backdrop-blur border-b border-os-line px-6 py-4">
          <div className="font-serif-display text-[18px] font-semibold text-os-navy">{report ? '编辑报告' : '新增报告'}</div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-os-mist text-os-muted"><X className="w-4 h-4" /></button>
        </div>

        <div className="p-6 space-y-4">
          {err && <div className="rounded-[10px] bg-rose-50 ring-1 ring-rose-200/60 px-3.5 py-2 text-[12.5px] text-rose-700">{err}</div>}

          <div><label className={labelCls}>报告标题</label><input className={inputCls} value={title} onChange={e => setTitle(e.target.value)} placeholder="如 全球创新城市…SET 指数 2024" /></div>

          <div className="grid grid-cols-2 gap-4">
            <div><label className={labelCls}>发布机构</label><input className={inputCls} value={publisher} onChange={e => setPublisher(e.target.value)} placeholder="深圳国际科技信息中心…" /></div>
            <div><label className={labelCls}>发布日期</label><input type="date" className={inputCls} value={publishDate} onChange={e => setPublishDate(e.target.value)} /></div>
            <div><label className={labelCls}>页数(可空)</label><input type="number" className={inputCls} value={pages} onChange={e => setPages(e.target.value)} placeholder="80" /></div>
            <div>
              <label className={labelCls}>状态</label>
              <select className={inputCls} value={status} onChange={e => setStatus(e.target.value as Report['status'])}>
                <option value="parsed">已解析</option>
                <option value="published">已发布</option>
                <option value="draft">草稿</option>
                <option value="archived">已归档</option>
              </select>
            </div>
          </div>

          <div>
            <label className={labelCls}>标签</label>
            <div className="flex flex-wrap gap-2">
              {REPORT_TOPICS.map(tpc => (
                <button key={tpc} type="button" onClick={() => toggleTopic(tpc)}
                  className={`px-3 py-1 rounded-full text-[12.5px] font-medium ring-1 transition ${topics.includes(tpc) ? 'bg-os-navy text-white ring-os-navy' : 'bg-os-paper text-os-navy ring-os-line hover:ring-os-navy/40'}`}>
                  {tpc}
                </button>
              ))}
            </div>
          </div>

          <div><label className={labelCls}>简介(留空则前台自动从 Markdown 提炼)</label><textarea rows={3} className={inputCls} value={summary} onChange={e => setSummary(e.target.value)} placeholder="一到两句话核心简介" /></div>

          <div className="rounded-[14px] ring-1 ring-os-line bg-os-paper p-4 space-y-3">
            <div className="text-[12.5px] font-semibold text-os-navy">PDF 原件（附件，供用户下载）</div>
            <div className="flex items-center gap-3 flex-wrap">
              <label className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-semibold bg-os-paper text-os-blue ring-1 ring-os-line hover:ring-os-navy/40 cursor-pointer transition">
                <input type="file" accept="application/pdf,.pdf" className="hidden" onChange={onPickPdf} />
                <Plus className="w-3.5 h-3.5" />{pdfFile ? '重选 PDF' : '上传 PDF'}
              </label>
              {pdfFile
                ? <span className="text-[12.5px] text-emerald-700 inline-flex items-center gap-1"><CheckCircle className="w-4 h-4" />{pdfFile.name}（{(pdfFile.size / 1024 / 1024).toFixed(1)} MB，保存时写入）</span>
                : fileUrl
                  ? <span className="text-[12.5px] text-emerald-700 inline-flex items-center gap-1"><CheckCircle className="w-4 h-4" />{isIdbPdf(fileUrl) ? '已附 PDF（本地）' : fileUrl}</span>
                  : <span className="text-[12.5px] text-os-muted">未附 PDF（可稍后在列表里逐行上传）</span>}
            </div>
            {!pdfFile && (
              <div className="flex items-center gap-2">
                <span className="text-[11.5px] text-os-muted shrink-0">或填路径/URL：</span>
                <input className={`${inputCls} !py-1.5`} value={isIdbPdf(fileUrl) ? '' : fileUrl} onChange={e => setFileUrl(e.target.value)} placeholder="/reports/xxx.pdf 或完整 URL" />
              </div>
            )}
          </div>

          <div className="rounded-[14px] ring-1 ring-os-line bg-os-paper p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-[12.5px] font-semibold text-os-navy">报告解读 Markdown（前台据此渲染简介/目录/正文 + AI 问答）</div>
              <label className="inline-flex items-center gap-1.5 text-[12px] font-medium text-os-blue cursor-pointer hover:text-os-navy">
                <input type="file" accept=".md,.markdown,.txt,text/markdown" className="hidden" onChange={onPickMd} />
                <Plus className="w-3.5 h-3.5" />上传 .md（自动提炼上方信息）
              </label>
            </div>
            <textarea rows={8} className={`${inputCls} font-mono !text-[12px] leading-5`} value={markdownContent} onChange={e => { setMarkdownContent(e.target.value); applyMeta(e.target.value, false); }} placeholder="粘贴或上传 Markdown 解读全文（建议含 frontmatter，标题/机构/简介/标签会自动填上方）…" />
            <div className="text-[11.5px] text-os-muted">已填 {markdownContent.length.toLocaleString()} 字。</div>
            <div className="flex items-center gap-2">
              <span className="text-[11.5px] text-os-muted shrink-0">或用 URL：</span>
              <input className={`${inputCls} !py-1.5`} value={markdownUrl} onChange={e => setMarkdownUrl(e.target.value)} placeholder="/reports/xxx.md（content 优先）" />
            </div>
          </div>

          <label className="flex items-center gap-2 text-[13px] text-os-ink">
            <input type="checkbox" checked={showOnHome} onChange={e => setShowOnHome(e.target.checked)} className="rounded" />
            首页推荐展示
          </label>

          <div className="flex gap-2 pt-1">
            <button onClick={() => void handleSave()} disabled={saving} className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full text-[13px] font-semibold bg-gradient-to-r from-os-navy to-os-indigo text-white hover:brightness-110 shadow-os disabled:opacity-50">{saving ? '保存中…' : '保存'}</button>
            <button onClick={onClose} className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full text-[13px] font-semibold bg-os-paper text-os-navy ring-1 ring-os-line hover:ring-os-navy/30">取消</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============== Module: 软件申请 / 内测申请 (益语智库 AI) ==============
// 左侧导航「内测申请」与 会员管理→「软件申请」tab 共用此组件, 避免两套代码分叉。
// 能力: 全字段列表 + 行内勾选(批量) + 一键直接发送邀请码邮件(无弹窗) + 详情。
// ⚠️ 第一期"发送"=生成邀请码+标记已发送(本地); 第二期接 cloud_backend SMTP 后变真实投递。

export function BetaApplicationsPanel() {
  const apps = useBetaApplications();
  const [detail, setDetail] = useState<BetaApplication | null>(null);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const pending = apps.filter(a => a.status === 'pending').length;

  // 已选申请(仅保留仍存在的)
  const selectedApps = apps.filter(a => selected.has(a.id));
  const allChecked = apps.length > 0 && selected.size === apps.length;

  const toggleOne = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const toggleAll = () => {
    setSelected(allChecked ? new Set() : new Set(apps.map(a => a.id)));
  };

  // 单个: 一键直接发送邀请码邮件(无弹窗) — 生成码 + 标记已发送
  const sendOne = (a: BetaApplication) => {
    if (!a.userEmail) { setMsg({ type: 'error', text: `${a.userName} 没有邮箱，无法发送邮件` }); return; }
    const r = markBetaInviteSent(a.id);
    if (r) setMsg({ type: 'success', text: `已向 ${r.userName}（${r.userEmail}）发送邀请码邮件：${r.code}` });
  };

  // 批量: 所选全部一键直接发送(无弹窗)
  const sendBatch = () => {
    const targets = selectedApps.filter(a => a.userEmail);
    const skipped = selectedApps.length - targets.length;
    if (targets.length === 0) { setMsg({ type: 'error', text: '所选申请均无邮箱，无法发送' }); return; }
    targets.forEach(a => markBetaInviteSent(a.id));
    setSelected(new Set());
    setMsg({ type: 'success', text: `已向 ${targets.length} 位申请人发送邀请码邮件${skipped > 0 ? `（${skipped} 位无邮箱已跳过）` : ''}` });
  };

  const onDelete = (a: BetaApplication) => {
    if (!window.confirm(`删除 ${a.userName} 的软件申请？`)) return;
    deleteBetaApplication(a.id);
    if (detail?.id === a.id) setDetail(null);
    setSelected(prev => { const n = new Set(prev); n.delete(a.id); return n; });
    setMsg({ type: 'success', text: '已删除' });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <SectionTitle hint={`共 ${apps.length} 份软件申请 · 待审核 ${pending} · 优先公益慈善组织`}>软件申请 · 益语智库 AI</SectionTitle>
        <button
          onClick={sendBatch}
          disabled={selectedApps.length === 0}
          className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-semibold transition ${selectedApps.length === 0 ? 'bg-os-canvas text-os-muted/60 cursor-not-allowed ring-1 ring-os-line' : 'bg-gradient-to-r from-os-navy to-os-indigo text-white hover:brightness-110 shadow-os'}`}
        ><Mail className="w-3.5 h-3.5" />批量发送邀请码邮件{selectedApps.length > 0 ? `（${selectedApps.length}）` : ''}</button>
      </div>

      {msg && (
        <div className={`rounded-[12px] px-4 py-2.5 text-[13px] ${msg.type === 'success' ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60' : 'bg-rose-50 text-rose-700 ring-1 ring-rose-200/60'}`}>{msg.text}</div>
      )}

      <Card className="!p-0 overflow-hidden">
        <table className="w-full text-[13px]">
          <thead className="bg-os-canvas/70 border-b border-os-line">
            <tr className="text-left text-os-muted text-[11px] uppercase tracking-[0.14em]">
              <th className="px-4 py-3 w-10">
                <input type="checkbox" checked={allChecked} onChange={toggleAll} className="w-4 h-4 rounded border-os-line accent-os-navy cursor-pointer" title="全选" />
              </th>
              <th className="px-3 py-3 font-semibold">申请人</th>
              <th className="px-3 py-3 font-semibold">类型</th>
              <th className="px-3 py-3 font-semibold">机构 / 用途</th>
              <th className="px-3 py-3 font-semibold">邮箱</th>
              <th className="px-3 py-3 font-semibold">状态</th>
              <th className="px-3 py-3 font-semibold">邀请码</th>
              <th className="px-3 py-3 font-semibold">申请时间</th>
              <th className="px-5 py-3 font-semibold text-right">操作</th>
            </tr>
          </thead>
          <tbody>
            {apps.length === 0 ? (
              <EmptyRow colSpan={9} label="暂无软件申请" />
            ) : apps.map(a => {
              const checked = selected.has(a.id);
              return (
                <tr key={a.id} className={`border-b border-os-line/60 hover:bg-os-canvas/40 ${checked ? 'bg-os-blue/5' : a.userType === 'nonprofit' ? 'bg-emerald-50/30' : ''}`}>
                  <td className="px-4 py-3">
                    <input type="checkbox" checked={checked} onChange={() => toggleOne(a.id)} className="w-4 h-4 rounded border-os-line accent-os-navy cursor-pointer" />
                  </td>
                  <td className="px-3 py-3 font-medium text-os-ink">{a.userName}</td>
                  <td className="px-3 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ring-1 ${a.userType === 'nonprofit' ? 'bg-emerald-50 text-emerald-700 ring-emerald-200/60' : 'bg-os-mist text-os-navy ring-os-line'}`}>{BETA_USER_TYPE_LABEL[a.userType]}</span>
                  </td>
                  <td className="px-3 py-3 text-os-muted max-w-[220px] truncate" title={a.orgName || a.purpose || ''}>{a.orgName || a.purpose || '—'}</td>
                  <td className="px-3 py-3 text-os-muted">{a.userEmail || '—'}</td>
                  <td className="px-3 py-3"><StatusBadge status={a.status === 'approved' ? 'published' : 'pending'} /></td>
                  <td className="px-3 py-3 font-mono text-[12px] text-os-blue">{a.code || '—'}</td>
                  <td className="px-3 py-3 text-os-muted whitespace-nowrap">{a.createdAt.slice(0, 10)}</td>
                  <td className="px-5 py-3 text-right whitespace-nowrap">
                    <button onClick={() => sendOne(a)} disabled={!a.userEmail} className={`inline-flex items-center gap-1 text-[12px] font-semibold mr-3 ${!a.userEmail ? 'text-os-muted/50 cursor-not-allowed' : a.status === 'approved' ? 'text-emerald-700 hover:text-emerald-900' : 'text-os-blue hover:text-os-navy'}`} title={a.userEmail ? '直接发送邀请码邮件' : '无邮箱'}><Mail className="w-3.5 h-3.5" />{a.status === 'approved' ? '重发邮件' : '发送邀请码'}</button>
                    <button onClick={() => setDetail(a)} className="text-os-blue hover:text-os-navy text-[12px] font-semibold mr-3">详情</button>
                    <button onClick={() => onDelete(a)} className="text-os-muted hover:text-rose-600" title="删除"><Trash2 className="w-3.5 h-3.5 inline" /></button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      <p className="text-[12px] text-os-muted leading-6">
        点「发送邀请码」即一键直接发送（自动生成邀请码并标记已发送，无需再确认）；勾选多行后用右上角「批量发送」群发。
        <b className="text-os-navy">第二期</b>接入 cloud_backend 后由服务端 SMTP 真实投递。
      </p>

      {/* 申请详情弹窗 */}
      {detail && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30" onClick={() => setDetail(null)} />
          <div className="relative w-full max-w-md rounded-[20px] bg-os-paper ring-1 ring-os-line shadow-2xl p-6">
            <button onClick={() => setDetail(null)} className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-os-mist text-os-muted"><X className="w-4 h-4" /></button>
            <div className="font-serif-display text-[18px] font-semibold text-os-navy mb-4">软件申请详情</div>
            <dl className="space-y-2.5 text-[13.5px]">
              <div className="flex gap-3"><dt className="w-20 shrink-0 text-os-muted">申请人</dt><dd className="text-os-ink font-medium">{detail.userName}</dd></div>
              <div className="flex gap-3"><dt className="w-20 shrink-0 text-os-muted">邮箱</dt><dd className="text-os-ink">{detail.userEmail || '—'}</dd></div>
              <div className="flex gap-3"><dt className="w-20 shrink-0 text-os-muted">用户类型</dt><dd className="text-os-ink">{BETA_USER_TYPE_LABEL[detail.userType]}{detail.userType === 'nonprofit' ? '（优先）' : ''}</dd></div>
              {detail.orgName && <div className="flex gap-3"><dt className="w-20 shrink-0 text-os-muted">机构名称</dt><dd className="text-os-ink">{detail.orgName}</dd></div>}
              {detail.purpose && <div className="flex gap-3"><dt className="w-20 shrink-0 text-os-muted">使用用途</dt><dd className="text-os-ink leading-6">{detail.purpose}</dd></div>}
              <div className="flex gap-3"><dt className="w-20 shrink-0 text-os-muted">申请时间</dt><dd className="text-os-muted">{detail.createdAt.slice(0, 16).replace('T', ' ')}</dd></div>
              <div className="flex gap-3"><dt className="w-20 shrink-0 text-os-muted">状态</dt><dd><StatusBadge status={detail.status === 'approved' ? 'published' : 'pending'} /></dd></div>
              {detail.code && <div className="flex gap-3"><dt className="w-20 shrink-0 text-os-muted">邀请码</dt><dd className="font-mono text-os-blue font-semibold">{detail.code}</dd></div>}
            </dl>
            <div className="mt-5 flex gap-2">
              <button onClick={() => { sendOne(detail); setDetail(null); }} disabled={!detail.userEmail} className={`inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full text-[13px] font-semibold ${!detail.userEmail ? 'bg-os-canvas text-os-muted/60 cursor-not-allowed ring-1 ring-os-line' : detail.status === 'approved' ? 'bg-emerald-600 text-white hover:brightness-110 shadow-os' : 'bg-os-blue text-white hover:brightness-110 shadow-os'}`}><Mail className="w-3.5 h-3.5" />{detail.status === 'approved' ? '重发邀请码邮件' : '发送邀请码邮件'}</button>
              <button onClick={() => setDetail(null)} className="px-5 py-2.5 rounded-full text-[13px] font-semibold bg-os-paper text-os-navy ring-1 ring-os-line hover:ring-os-navy/30">关闭</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** 左侧导航「内测申请」入口 — 与 会员管理→软件申请 tab 共用同一面板 */
export function BetaApplicationsManagement() {
  return <div className="max-w-[1200px]"><BetaApplicationsPanel /></div>;
}

// ============== Module: Members Management ==============
const PAID_SOURCE_LABEL: Record<string, string> = {
  manual: '后台手动',
  invite_code: '邀请码',
  payment: '微信支付',
  strategy_client: '战略客户',
};

function isPaidMember(u: AdminManagedUser): boolean {
  if (u.memberType && u.memberType !== 'regular') return true;
  if (u.paidExpiresAt) return true;
  return false;
}

// 断网(yiyu.love 不可达)时的本地示例用户, 仅供查看 UI; 恢复网络后刷新即真实数据。
const DEMO_USERS = [
  { id: 'demo-u1', nickname: '李晓', email: 'lixiao@sunshine-foundation.org', phone: '', memberType: 'diamond', paidSource: 'invite_code', paidExpiresAt: '', createdAt: '2026-05-20T00:00:00Z', onlineDuration: '18.2 小时', totalSpent: 0 },
  { id: 'demo-u2', nickname: '王经理', email: 'wang@bluesea-tech.com', phone: '', memberType: 'regular', paidSource: '', paidExpiresAt: '', createdAt: '2026-05-22T00:00:00Z', onlineDuration: '2.6 小时', totalSpent: 0 },
  { id: 'demo-u3', nickname: '张明', email: 'zhangming@gmail.com', phone: '', memberType: 'gold', paidSource: 'payment', paidExpiresAt: '2027-05-29T00:00:00Z', createdAt: '2026-05-18T00:00:00Z', onlineDuration: '41.5 小时', totalSpent: 1280 },
  { id: 'demo-u4', nickname: '陈老师', email: '', phone: '13800001234', memberType: 'regular', paidSource: '', paidExpiresAt: '', createdAt: '2026-05-15T00:00:00Z', onlineDuration: '0.8 小时', totalSpent: 0 },
] as unknown as AdminManagedUser[];

/** 消费金额格式化: 0 / 未知 → —, 否则 ¥金额 */
function formatSpent(v: unknown): string {
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(n) || n <= 0) return '—';
  return `¥${n.toLocaleString('zh-CN')}`;
}

// 用户行的"软件试用申请"状态徽章(按 email 关联内测申请)
function BetaCell({ email }: { email?: string }) {
  const app = email ? getBetaApplicationByEmail(email) : null;
  if (!app) return <span className="text-os-muted">未申请</span>;
  if (app.status === 'approved') {
    return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ring-1 bg-emerald-50 text-emerald-700 ring-emerald-200/60">已发码 · {BETA_USER_TYPE_LABEL[app.userType]}</span>;
  }
  return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ring-1 bg-amber-50 text-amber-700 ring-amber-200/60">待审核 · {BETA_USER_TYPE_LABEL[app.userType]}</span>;
}

export function MembersManagement() {
  // 会员系列: 用户列表 + 邀请码 + 软件申请 (内测申请 = 益语智库 AI 试用, 审核后发邀请码邮件)
  const [tab, setTab] = useState<'users' | 'invites' | 'beta'>('users');
  const betaApps = useBetaApplications();
  const betaPending = betaApps.filter(a => a.status === 'pending').length;
  const { data, loading, error, reload } = useAsyncData<AdminManagedUser[]>(fetchAdminUsers);
  // 断网兜底: API 失败 → 显示示例用户(带横幅说明), 不再只给红色报错
  const usingDemo = !loading && !!error;
  const users = usingDemo ? DEMO_USERS : (data || []);
  const paidCount = users.filter(isPaidMember).length;

  return (
    <div className="space-y-5 max-w-[1200px]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex items-center gap-1 rounded-full bg-os-canvas ring-1 ring-os-line p-1">
          <button
            onClick={() => setTab('users')}
            className={`px-4 py-1.5 rounded-full text-[13px] font-semibold transition ${tab === 'users' ? 'bg-os-navy text-white shadow-os' : 'text-os-muted hover:text-os-navy'}`}
          >用户列表</button>
          <button
            onClick={() => setTab('invites')}
            className={`px-4 py-1.5 rounded-full text-[13px] font-semibold transition ${tab === 'invites' ? 'bg-os-navy text-white shadow-os' : 'text-os-muted hover:text-os-navy'}`}
          >邀请码</button>
          <button
            onClick={() => setTab('beta')}
            className={`px-4 py-1.5 rounded-full text-[13px] font-semibold transition inline-flex items-center gap-1.5 ${tab === 'beta' ? 'bg-os-navy text-white shadow-os' : 'text-os-muted hover:text-os-navy'}`}
          >软件申请{betaPending > 0 && (
            <span className={`inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold ${tab === 'beta' ? 'bg-white/25 text-white' : 'bg-amber-100 text-amber-700'}`}>{betaPending}</span>
          )}</button>
        </div>
        {tab === 'users' && (
          <ToolbarButton variant="ghost" onClick={reload}><RefreshCw className="w-3.5 h-3.5" />刷新</ToolbarButton>
        )}
      </div>

      {tab === 'beta' ? <BetaApplicationsPanel /> : tab === 'invites' ? <InviteCodesPanel /> : (
        <>
          <SectionTitle hint={loading ? '正在从 pg-auth-api 加载用户…' : `共 ${users.length} 位用户 · 付费会员 ${paidCount}`}>会员管理 · 用户列表</SectionTitle>

          {usingDemo && (
            <div className="rounded-[12px] bg-amber-50 ring-1 ring-amber-200/60 px-4 py-2.5 text-[12.5px] text-amber-800 flex items-center justify-between gap-3 flex-wrap">
              <span>网络不可达（yiyu.love），当前为<b>本地示例数据</b>，仅供查看界面。恢复网络后点「刷新」加载真实用户。</span>
              <button onClick={reload} className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-os-paper ring-1 ring-os-line text-[12px] font-semibold text-os-navy hover:ring-os-navy/40"><RefreshCw className="w-3 h-3" />刷新</button>
            </div>
          )}

          <Card className="!p-0 overflow-hidden">
            <table className="w-full text-[13px]">
              <thead className="bg-os-canvas/70 border-b border-os-line">
                <tr className="text-left text-os-muted text-[11px] uppercase tracking-[0.14em]">
                  <th className="px-5 py-3 font-semibold">用户</th>
                  <th className="px-3 py-3 font-semibold">邮箱 / 手机</th>
                  <th className="px-3 py-3 font-semibold">会员状态</th>
                  <th className="px-3 py-3 font-semibold">消费金额</th>
                  <th className="px-3 py-3 font-semibold">累计在线时长</th>
                  <th className="px-3 py-3 font-semibold">软件试用申请</th>
                  <th className="px-3 py-3 font-semibold">开通来源</th>
                  <th className="px-3 py-3 font-semibold">会员有效期</th>
                  <th className="px-3 py-3 font-semibold">注册时间</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <LoadingRow colSpan={9} label="加载用户中…" />
                ) : users.length === 0 ? (
                  <EmptyRow colSpan={9} label="暂无用户" />
                ) : (
                  users.map(u => {
                    const paid = isPaidMember(u);
                    return (
                      <tr key={u.id} className="border-b border-os-line/60 hover:bg-os-canvas/40">
                        <td className="px-5 py-3 font-medium text-os-ink">{u.nickname || '—'}</td>
                        <td className="px-3 py-3 text-os-muted">{u.email || u.phone || '—'}</td>
                        <td className="px-3 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ring-1 ${
                            paid ? 'bg-amber-50 text-amber-700 ring-amber-200/60' : 'bg-os-canvas text-os-muted ring-os-line'
                          }`}>
                            {paid ? '会员' : '用户'}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-os-ink tabular-nums">{formatSpent((u as any).totalSpent)}</td>
                        <td className="px-3 py-3 text-os-muted tabular-nums">{(u as any).onlineDuration || '—'}</td>
                        <td className="px-3 py-3"><BetaCell email={u.email} /></td>
                        <td className="px-3 py-3 text-os-muted">
                          {paid && u.paidSource ? (PAID_SOURCE_LABEL[u.paidSource] || u.paidSource) : '—'}
                        </td>
                        <td className="px-3 py-3 text-os-muted">
                          {u.paidExpiresAt ? new Date(u.paidExpiresAt).toLocaleDateString('zh-CN') : '—'}
                        </td>
                        <td className="px-3 py-3 text-os-muted">
                          {u.createdAt ? new Date(u.createdAt).toLocaleDateString('zh-CN') : '—'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </Card>
        </>
      )}
    </div>
  );
}

// ============== 会员系列 · 邀请码面板 (真接 /invite-codes) ==============
const INVITE_STATUS_LABEL: Record<string, string> = {
  valid: '有效',
  redeemed: '已兑换',
  disabled: '已禁用',
};

function InviteCodesPanel() {
  const { data, loading, error, reload } = useAsyncData<InviteCodeDto[]>(fetchInviteCodes);
  const codes = data || [];
  const [creating, setCreating] = useState(false);
  const [newType, setNewType] = useState<keyof typeof INVITE_CODE_TYPES>('30days');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleCreate = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const res = await createInviteCode({ type: newType });
      if (res.ok && res.data) {
        setMsg({ type: 'success', text: `已生成邀请码：${res.data.code}` });
        setCreating(false);
        await reload();
      } else {
        setMsg({ type: 'error', text: res.error || '生成失败' });
      }
    } finally {
      setBusy(false);
    }
  };

  const handleDisable = async (code: string) => {
    const res = await disableInviteCodeApi(code);
    if (res.ok) { setMsg({ type: 'success', text: `已禁用 ${code}` }); await reload(); }
    else setMsg({ type: 'error', text: res.error || '禁用失败' });
  };

  const handleDelete = async (code: string) => {
    if (!window.confirm(`确定删除邀请码 ${code}？此操作不可恢复。`)) return;
    const res = await deleteInviteCodeApi(code);
    if (res.ok) { setMsg({ type: 'success', text: `已删除 ${code}` }); await reload(); }
    else setMsg({ type: 'error', text: res.error || '删除失败' });
  };

  const copyCode = (code: string) => {
    navigator.clipboard?.writeText(code);
    setMsg({ type: 'success', text: `已复制 ${code}` });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SectionTitle hint={loading ? '正在加载邀请码…' : `共 ${codes.length} 个邀请码 · 邀请码 = 免费开通会员名额`}>会员管理 · 邀请码</SectionTitle>
        <div className="flex items-center gap-2">
          <ToolbarButton variant="ghost" onClick={reload}><RefreshCw className="w-3.5 h-3.5" />刷新</ToolbarButton>
          <ToolbarButton onClick={() => setCreating(v => !v)}><Plus className="w-3.5 h-3.5" />新建邀请码</ToolbarButton>
        </div>
      </div>

      {msg && (
        <div className={`rounded-[12px] px-4 py-2.5 text-[13px] ${msg.type === 'success' ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60' : 'bg-rose-50 text-rose-700 ring-1 ring-rose-200/60'}`}>
          {msg.text}
        </div>
      )}

      {creating && (
        <Card className="!p-4">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <div className="text-[11px] uppercase tracking-[0.14em] text-os-muted mb-1">邀请码类型</div>
              <select
                value={newType}
                onChange={e => setNewType(e.target.value as keyof typeof INVITE_CODE_TYPES)}
                className="px-3 py-2 bg-os-canvas rounded-full ring-1 ring-os-line text-[13px] cursor-pointer focus:outline-none focus:ring-2 focus:ring-os-navy/30"
              >
                {Object.entries(INVITE_CODE_TYPES).map(([key, meta]) => (
                  <option key={key} value={key}>{meta.label}（{meta.description}）</option>
                ))}
              </select>
            </div>
            <ToolbarButton onClick={handleCreate}>
              {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              {busy ? '生成中…' : '确认生成'}
            </ToolbarButton>
          </div>
        </Card>
      )}

      <Card className="!p-0 overflow-hidden">
        <table className="w-full text-[13px]">
          <thead className="bg-os-canvas/70 border-b border-os-line">
            <tr className="text-left text-os-muted text-[11px] uppercase tracking-[0.14em]">
              <th className="px-5 py-3 font-semibold">邀请码</th>
              <th className="px-3 py-3 font-semibold">类型</th>
              <th className="px-3 py-3 font-semibold">使用情况</th>
              <th className="px-3 py-3 font-semibold">状态</th>
              <th className="px-3 py-3 font-semibold">创建时间</th>
              <th className="px-5 py-3 font-semibold w-40">操作</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <LoadingRow colSpan={6} label="加载邀请码中…" />
            ) : error ? (
              <ErrorRow colSpan={6} message={error} onRetry={reload} />
            ) : codes.length === 0 ? (
              <EmptyRow colSpan={6} label="暂无邀请码，点击右上角新建" />
            ) : (
              codes.map(c => (
                <tr key={c.id} className="border-b border-os-line/60 hover:bg-os-canvas/40">
                  <td className="px-5 py-3 font-mono text-[12px] text-os-ink">{c.code}</td>
                  <td className="px-3 py-3 text-os-muted">{INVITE_CODE_TYPES[c.type]?.label || c.type}</td>
                  <td className="px-3 py-3 text-os-muted">{c.usedCount} / {c.maxUses}</td>
                  <td className="px-3 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ring-1 ${
                      c.status === 'valid' ? 'bg-emerald-50 text-emerald-700 ring-emerald-200/60'
                      : c.status === 'redeemed' ? 'bg-os-mist text-os-blue ring-os-blue/20'
                      : 'bg-os-canvas text-os-muted ring-os-line'
                    }`}>
                      {INVITE_STATUS_LABEL[c.status] || c.status}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-os-muted">{c.createdAt ? new Date(c.createdAt).toLocaleDateString('zh-CN') : '—'}</td>
                  <td className="px-5 py-3 text-[12px]">
                    <button onClick={() => copyCode(c.code)} className="text-os-blue hover:text-os-navy">复制</button>
                    {c.status === 'valid' && (
                      <button onClick={() => handleDisable(c.code)} className="ml-2 text-amber-600 hover:text-amber-700">禁用</button>
                    )}
                    <button onClick={() => handleDelete(c.code)} className="ml-2 text-rose-600 hover:text-rose-700">删除</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

// ============== Module: Orders Management (真接 /payment/orders) ==============
function orderStatusBadge(status: string): 'paid' | 'pending' | 'refund' {
  if (status === 'paid') return 'paid';
  if (status === 'closed' || status === 'expired' || status === 'failed') return 'refund';
  return 'pending';
}

export function OrdersManagement() {
  const { data, loading, error, reload } = useAsyncData<PaymentOrder[]>(() => fetchAdminPaymentOrders(100));
  const orders = data || [];

  // KPI 从真实订单实时汇总 (支付链路与订单同源)
  const paidOrders = orders.filter(o => o.status === 'paid');
  const refundOrders = orders.filter(o => ['closed', 'expired', 'failed'].includes(o.status));
  const totalRevenueFen = paidOrders.reduce((sum, o) => sum + (o.amountFen || 0), 0);

  return (
    <div className="space-y-5 max-w-[1200px]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SectionTitle hint={loading ? '正在从 pg-auth-api 加载付费记录…' : `共 ${orders.length} 条真实订单`}>订单管理</SectionTitle>
        <ToolbarButton variant="ghost" onClick={reload}><RefreshCw className="w-3.5 h-3.5" />刷新</ToolbarButton>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="订单总数"   value={loading ? '…' : String(orders.length)} />
        <KpiCard label="已支付营收" value={loading ? '…' : `¥${(totalRevenueFen / 100).toFixed(2)}`} tone="blue" />
        <KpiCard label="退款/关闭"  value={loading ? '…' : String(refundOrders.length)} tone="spark" />
        <KpiCard label="付费成功数" value={loading ? '…' : String(paidOrders.length)} tone="navy" />
      </div>

      <Card className="!p-0 overflow-hidden">
        <table className="w-full text-[13px]">
          <thead className="bg-os-canvas/70 border-b border-os-line">
            <tr className="text-left text-os-muted text-[11px] uppercase tracking-[0.14em]">
              <th className="px-5 py-3 font-semibold">订单号</th>
              <th className="px-3 py-3 font-semibold">用户</th>
              <th className="px-3 py-3 font-semibold">套餐</th>
              <th className="px-3 py-3 font-semibold text-right">金额</th>
              <th className="px-3 py-3 font-semibold">状态</th>
              <th className="px-3 py-3 font-semibold">支付时间</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <LoadingRow colSpan={6} label="加载订单中…" />
            ) : error ? (
              <ErrorRow colSpan={6} message={error} onRetry={reload} />
            ) : orders.length === 0 ? (
              <EmptyRow colSpan={6} label="暂无订单记录" />
            ) : (
              orders.map(o => (
                <tr key={o.id} className="border-b border-os-line/60 hover:bg-os-canvas/40">
                  <td className="px-5 py-3 font-mono text-[12px] text-os-ink">{o.orderNo}</td>
                  <td className="px-3 py-3 text-os-muted">{o.userNickname || o.buyerName || '—'}</td>
                  <td className="px-3 py-3 text-os-muted">{o.planName}</td>
                  <td className="px-3 py-3 text-right font-semibold text-os-navy">¥{((o.amountFen || 0) / 100).toFixed(2)}</td>
                  <td className="px-3 py-3"><StatusBadge status={orderStatusBadge(o.status)} /></td>
                  <td className="px-3 py-3 text-os-muted">{o.paidAt ? new Date(o.paidAt).toLocaleString('zh-CN') : '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

// ============== Module: Consult Requests (真接 /admin/consult-requests) ==============
const CONSULT_STATUS_LABEL: Record<string, string> = {
  new: '待初筛',
  reviewing: '初筛中',
  contacted: '已邀约',
  closed: '已关闭',
};

export function ConsultRequests() {
  const { data, loading, error, reload } = useAsyncData<ConsultRequestRecord[]>(fetchAdminConsultRequests);
  const requests = data || [];
  const [detail, setDetail] = useState<ConsultRequestRecord | null>(null);

  return (
    <div className="space-y-5 max-w-[1200px]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SectionTitle hint={loading ? '正在加载咨询申请…' : `共 ${requests.length} 条组织诊断申请`}>申请咨询</SectionTitle>
        <ToolbarButton variant="ghost" onClick={reload}><RefreshCw className="w-3.5 h-3.5" />刷新</ToolbarButton>
      </div>

      <Card className="!p-0 overflow-hidden">
        <table className="w-full text-[13px]">
          <thead className="bg-os-canvas/70 border-b border-os-line">
            <tr className="text-left text-os-muted text-[11px] uppercase tracking-[0.14em]">
              <th className="px-5 py-3 font-semibold">组织</th>
              <th className="px-3 py-3 font-semibold">联系人</th>
              <th className="px-3 py-3 font-semibold">电话</th>
              <th className="px-3 py-3 font-semibold">状态</th>
              <th className="px-3 py-3 font-semibold">提交时间</th>
              <th className="px-5 py-3 font-semibold w-24">操作</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <LoadingRow colSpan={6} label="加载咨询申请中…" />
            ) : error ? (
              <ErrorRow colSpan={6} message={error} onRetry={reload} />
            ) : requests.length === 0 ? (
              <EmptyRow colSpan={6} label="暂无咨询申请" />
            ) : (
              requests.map(c => (
                <tr key={c.id} className="border-b border-os-line/60 hover:bg-os-canvas/40">
                  <td className="px-5 py-3 font-medium text-os-ink">{c.organization || '—'}</td>
                  <td className="px-3 py-3 text-os-muted">{c.name}{c.role ? ` · ${c.role}` : ''}</td>
                  <td className="px-3 py-3 text-os-muted font-mono text-[12px]">{c.phone}</td>
                  <td className="px-3 py-3">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-os-mist text-os-blue ring-1 ring-os-blue/20">
                      {CONSULT_STATUS_LABEL[c.status] || c.status || '待初筛'}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-os-muted">{c.createdAt ? new Date(c.createdAt).toLocaleDateString('zh-CN') : '—'}</td>
                  <td className="px-5 py-3 text-[12px] text-os-blue hover:text-os-navy">
                    <button onClick={() => setDetail(c)}>查看详情</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>

      {detail && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 overflow-auto" onClick={() => setDetail(null)}>
          <div className="mt-12 w-full max-w-2xl rounded-[20px] bg-os-paper shadow-xl ring-1 ring-os-line" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-os-line px-6 py-4">
              <h3 className="font-serif-display text-[18px] font-semibold text-os-navy">{detail.organization} · 组织诊断申请</h3>
              <button onClick={() => setDetail(null)} className="text-os-muted hover:text-os-navy"><X className="w-5 h-5" /></button>
            </div>
            <div className="px-6 py-5 space-y-4 text-[13px]">
              <div className="grid grid-cols-2 gap-4">
                <DetailField label="联系人" value={`${detail.name}${detail.role ? ` · ${detail.role}` : ''}`} />
                <DetailField label="电话" value={detail.phone} />
                <DetailField label="邮箱" value={detail.email} />
                <DetailField label="提交时间" value={detail.createdAt ? new Date(detail.createdAt).toLocaleString('zh-CN') : '—'} />
              </div>
              <DetailBlock label="核心问题" value={detail.topic} />
              <DetailBlock label="已有尝试" value={detail.background} />
              <DetailBlock label="最大阻力 / 约束" value={detail.constraints} />
              <DetailBlock label="可投入资源" value={detail.commitment} />
              {detail.notes ? <DetailBlock label="其他补充" value={detail.notes} /> : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DetailField({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-[0.14em] text-os-muted">{label}</div>
      <div className="mt-1 text-os-ink">{value || '—'}</div>
    </div>
  );
}

function DetailBlock({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-[0.14em] text-os-muted">{label}</div>
      <div className="mt-1 whitespace-pre-wrap leading-relaxed text-os-ink">{value || '—'}</div>
    </div>
  );
}

// ============== Module: Strategy Clients ==============
export function StrategyClients() {
  return (
    <div className="space-y-5 max-w-[1200px]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SectionTitle hint={`已签约 ${MOCK_STRATEGY_CLIENTS.length} 家 · 接数据时从 strategy-companion 客户表拉`}>战略陪伴客户</SectionTitle>
        <ToolbarButton onClick={() => console.log('新增客户')}><Plus className="w-3.5 h-3.5" />新增客户</ToolbarButton>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {MOCK_STRATEGY_CLIENTS.map(c => (
          <Card key={c.id}>
            <div className="flex items-start justify-between gap-3 mb-3">
              <h4 className="font-serif-display text-[18px] font-semibold text-os-navy leading-tight">{c.org}</h4>
              <span className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ring-1 ${
                c.status === '陪伴中' ? 'bg-emerald-50 text-emerald-700 ring-emerald-200/60' : 'bg-os-mist text-os-blue ring-os-blue/20'
              }`}>{c.status}</span>
            </div>
            <div className="space-y-1.5 text-[12.5px] text-os-muted">
              <div className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5" />主要联络 · {c.leader}</div>
              <div className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" />合作起始 · {c.since}</div>
            </div>
            <div className="mt-4 pt-3 border-t border-os-line flex items-center gap-2">
              <button onClick={() => console.log('打开工作台', c.id)} className="text-[12px] text-os-blue hover:text-os-navy inline-flex items-center gap-1">
                打开陪伴工作台 <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ============== shared FormModal ==============
interface FormField {
  label: string;
  type?: 'text' | 'textarea' | 'select';
  defaultValue?: string;
  options?: string[];
  rows?: number;
}

function FormModal({ title, fields, onClose }: { title: string; fields: FormField[]; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-[20px] bg-os-paper shadow-os-lg ring-1 ring-os-line"
        onClick={e => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-os-paper/90 backdrop-blur border-b border-os-line px-6 py-4 flex items-center justify-between">
          <h3 className="font-serif-display text-[20px] font-semibold text-os-navy tracking-tight">{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-os-mist text-os-muted">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          {fields.map(f => <Field key={f.label} {...f} />)}
        </div>
        <div className="sticky bottom-0 bg-os-paper/90 backdrop-blur border-t border-os-line px-6 py-3 flex items-center justify-end gap-2">
          <button onClick={onClose} className="px-5 py-2 rounded-full text-[13px] font-medium text-os-muted hover:text-os-navy">取消</button>
          <ToolbarButton onClick={() => { console.log('保存表单'); onClose(); }}>保存</ToolbarButton>
        </div>
      </div>
    </div>
  );
}

function Field({ label, type = 'text', defaultValue, options, rows = 3, compact }: FormField & { compact?: boolean }) {
  const labelCls = compact ? 'text-[11px]' : 'text-[12px]';
  return (
    <div className={compact ? 'flex items-center gap-2' : 'space-y-1.5'}>
      <label className={`block ${labelCls} font-medium text-os-muted tracking-[0.06em]`}>{label}</label>
      {type === 'textarea' ? (
        <textarea
          defaultValue={defaultValue}
          rows={rows}
          className="w-full px-3 py-2 rounded-[10px] bg-os-canvas ring-1 ring-os-line text-[13px] focus:outline-none focus:ring-2 focus:ring-os-navy/30 resize-y"
        />
      ) : type === 'select' ? (
        <select defaultValue={defaultValue} className="w-full px-3 py-2 rounded-[10px] bg-os-canvas ring-1 ring-os-line text-[13px] focus:outline-none focus:ring-2 focus:ring-os-navy/30 cursor-pointer">
          {options?.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <input
          type="text"
          defaultValue={defaultValue}
          className="w-full px-3 py-2 rounded-[10px] bg-os-canvas ring-1 ring-os-line text-[13px] focus:outline-none focus:ring-2 focus:ring-os-navy/30"
        />
      )}
    </div>
  );
}
