import { useState } from 'react';
import {
  Eye, ThumbsUp, FileText, Folder, Plus, Search, Filter, Edit2, Trash2, X,
  TrendingUp, ShoppingCart, Users, MessageSquare,
  ChevronRight, Tag, Calendar, ExternalLink,
} from 'lucide-react';

// ============================================================
// admin-v2 · 10 个模块的占位 UI 实现 (纯前端, 不接 dataService).
// 设计目的: 让顾源源先验收功能/布局/操作流, 验收后再统一接数据.
// 所有 onClick 都只 console.log, 表单不真保存, 列表用 mock placeholder.
// ============================================================

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

function StatusBadge({ status }: { status: 'published' | 'draft' | 'archived' | 'paid' | 'pending' | 'refund' }) {
  const cls = {
    published: 'bg-emerald-50 text-emerald-700 ring-emerald-200/60',
    paid:      'bg-emerald-50 text-emerald-700 ring-emerald-200/60',
    draft:     'bg-os-mist text-os-blue ring-os-blue/20',
    pending:   'bg-amber-50 text-amber-700 ring-amber-200/60',
    archived:  'bg-os-canvas text-os-muted ring-os-line',
    refund:    'bg-rose-50 text-rose-700 ring-rose-200/60',
  }[status];
  const text = { published: '已发布', draft: '草稿', archived: '已归档', paid: '已支付', pending: '待处理', refund: '已退款' }[status];
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
    ? 'bg-gradient-to-r from-os-navy to-os-indigo text-white hover:brightness-110 shadow-os'
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

const MOCK_REPORTS = [
  { id: 'r1', title: '分工创造分工与包容性就业',     publisher: '益语智库',  topics: ['业务设计'],   source: 'self' as const,        publishDate: '2026-04-20', status: 'published' as const, downloads: 312 },
  { id: 'r2', title: '2026 公益组织数字化趋势报告',  publisher: '清华公管',  topics: ['组织', 'AI 技术'], source: 'recommended' as const, publishDate: '2026-04-10', status: 'published' as const, downloads: 198 },
  { id: 'r3', title: '战略陪伴方法论 v2.1',         publisher: '益语智库',  topics: ['战略'],       source: 'self' as const,        publishDate: '2026-03-28', status: 'draft' as const,      downloads: 0 },
];

const MOCK_MEMBERS = [
  { id: 'm1', email: 'wang@example.org',  nickname: '王女士',   tier: 'paid',    joinedAt: '2026-04-12', validUntil: '2027-04-12' },
  { id: 'm2', email: 'liu@example.com',   nickname: '刘先生',   tier: 'paid',    joinedAt: '2026-04-08', validUntil: '2027-04-08' },
  { id: 'm3', email: 'guest@example.cn',  nickname: '陈同学',   tier: 'free',    joinedAt: '2026-05-22', validUntil: null },
];

const MOCK_ORDERS = [
  { id: 'o1', orderNo: 'OD2026052801', user: '王女士', plan: '付费会员年卡', amount: 39800, status: 'paid' as const,    paidAt: '2026-05-28 10:23' },
  { id: 'o2', orderNo: 'OD2026052702', user: '刘先生', plan: '付费会员月卡', amount: 4800,  status: 'paid' as const,    paidAt: '2026-05-27 16:08' },
  { id: 'o3', orderNo: 'OD2026052501', user: '陈同学', plan: '付费会员年卡', amount: 39800, status: 'refund' as const,  paidAt: '2026-05-25 09:12' },
];

const MOCK_CONSULT_REQUESTS = [
  { id: 'c1', org: '某基金会',   contactName: '王理事长', contactPhone: '138****1234', stage: '初筛中', submittedAt: '2026-05-27' },
  { id: 'c2', org: '某创业公司', contactName: '李 CEO',  contactPhone: '139****5678', stage: '已邀约访谈', submittedAt: '2026-05-25' },
];

const MOCK_STRATEGY_CLIENTS = [
  { id: 's1', org: '日慈基金会',     leader: '张秘书长',     since: '2025-08-01', status: '陪伴中' },
  { id: 's2', org: 'CFFC 公益机构',  leader: '王总干事',     since: '2025-03-15', status: '陪伴中' },
  { id: 's3', org: '某社会创新组织', leader: '陈联合创始人', since: '2024-11-20', status: '复盘期' },
];

// ============== Module: Dashboard Overview ==============
export function DashboardOverview() {
  return (
    <div className="space-y-6 max-w-[1200px]">
      <SectionTitle hint="本页所有数字是占位 mock，等所有模块验收完后统一接 dataService / pg-auth-api。">
        数据概览
      </SectionTitle>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="文章总数"     value="19"    hint="较上周 +2" />
        <KpiCard label="报告总数"     value="57"    hint="自做 32 / 推荐 25" tone="blue" />
        <KpiCard label="付费会员"     value="128"   hint="本月新增 14" tone="spark" />
        <KpiCard label="本月营收"     value="¥38,420" hint="同比 +22%" tone="navy" />
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

// ============== Module: Reports Management ==============
export function ReportsManagement() {
  const [sourceTab, setSourceTab] = useState<'all' | 'self' | 'recommended'>('all');
  const [showCreate, setShowCreate] = useState(false);
  const list = MOCK_REPORTS.filter(r => sourceTab === 'all' || r.source === sourceTab);

  return (
    <div className="space-y-5 max-w-[1200px]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SectionTitle hint={`共 ${MOCK_REPORTS.length} 个 · 含自做 ${MOCK_REPORTS.filter(r=>r.source==='self').length} / 推荐 ${MOCK_REPORTS.filter(r=>r.source==='recommended').length}`}>报告管理</SectionTitle>
        <ToolbarButton onClick={() => setShowCreate(true)}><Plus className="w-3.5 h-3.5" />新增报告</ToolbarButton>
      </div>

      {/* source tab */}
      <div className="flex items-center gap-2 border-b border-os-line">
        {(['all', 'self', 'recommended'] as const).map(t => (
          <button
            key={t}
            onClick={() => setSourceTab(t)}
            className={`px-4 py-2.5 text-[13px] font-medium transition-colors border-b-2 ${
              sourceTab === t
                ? 'text-os-navy border-os-navy'
                : 'text-os-muted border-transparent hover:text-os-ink'
            }`}
          >
            {{ all: '全部', self: '我们做的', recommended: '我们推荐的' }[t]}
            <span className="ml-1.5 text-[11px] text-os-muted/70">
              ({t === 'all' ? MOCK_REPORTS.length : MOCK_REPORTS.filter(r => r.source === t).length})
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
              <th className="px-3 py-3 font-semibold">来源</th>
              <th className="px-3 py-3 font-semibold">标签</th>
              <th className="px-3 py-3 font-semibold">发布日期</th>
              <th className="px-3 py-3 font-semibold">状态</th>
              <th className="px-3 py-3 font-semibold text-right">下载</th>
              <th className="px-5 py-3 font-semibold w-28">操作</th>
            </tr>
          </thead>
          <tbody>
            {list.map(r => (
              <tr key={r.id} className="border-b border-os-line/60 hover:bg-os-canvas/40 transition-colors">
                <td className="px-5 py-3 font-medium text-os-ink">{r.title}</td>
                <td className="px-3 py-3 text-os-muted">{r.publisher}</td>
                <td className="px-3 py-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ring-1 ${
                    r.source === 'self'
                      ? 'bg-os-spark-soft text-os-spark ring-os-spark/20'
                      : 'bg-os-mist text-os-blue ring-os-blue/20'
                  }`}>
                    {r.source === 'self' ? '我们做的' : '我们推荐的'}
                  </span>
                </td>
                <td className="px-3 py-3 text-os-muted">{r.topics.join(' / ')}</td>
                <td className="px-3 py-3 text-os-muted">{r.publishDate}</td>
                <td className="px-3 py-3"><StatusBadge status={r.status} /></td>
                <td className="px-3 py-3 text-right text-os-muted">{r.downloads}</td>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-1">
                    <button onClick={() => console.log('编辑', r.id)} className="p-1.5 rounded-md hover:bg-os-mist text-os-blue"><Edit2 className="w-3.5 h-3.5" /></button>
                    <button onClick={() => console.log('删除', r.id)} className="p-1.5 rounded-md hover:bg-rose-50 text-rose-600"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <EmptyHint>★ 占位: 表格数据来自 MOCK_REPORTS。Report.source 字段还没在数据库里,接数据时需配套加上 self/recommended 字段并加数据迁移 (Task #15)。</EmptyHint>

      {showCreate && (
        <FormModal
          title="新增报告"
          onClose={() => setShowCreate(false)}
          fields={[
            { label: '标题', defaultValue: '' },
            { label: '出版方', defaultValue: '' },
            { label: '摘要', type: 'textarea', defaultValue: '' },
            { label: '来源',  type: 'select', defaultValue: 'self', options: ['self', 'recommended'] },
            { label: '标签 (多选)', defaultValue: '' },
            { label: 'PDF 文件',   defaultValue: '上传按钮占位' },
            { label: '页数',       defaultValue: '' },
            { label: '付费门控',   type: 'select', defaultValue: 'paid', options: ['free', 'paid'] },
            { label: '状态',       type: 'select', defaultValue: 'draft', options: ['draft', 'published', 'archived'] },
          ]}
        />
      )}
    </div>
  );
}

// ============== Module: Home Config ==============
export function HomeConfig() {
  return (
    <div className="space-y-6 max-w-[1100px]">
      <SectionTitle hint="编辑首页 9 个 sections 的文案/数据。接数据时这些字段写入后端 KV / config JSON 表。">首页配置</SectionTitle>

      {/* IntroduceYiyu 思想介绍 */}
      <Card>
        <h4 className="text-[13px] font-semibold text-os-navy mb-3">益语智库思想介绍 (Manifesto 后)</h4>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-[13px]">
          <Field label="eyebrow"        defaultValue="关于益语智库" />
          <Field label="大标题 (第 1 行)" defaultValue="组织经营是一个整体" />
          <Field label="大标题 (第 2 行)" defaultValue="但今天所有工具都把它切碎了" />
          <Field label="副标题" type="textarea" defaultValue="传统咨询给点子,传统 SaaS 切功能——没人在解决组织作为整体如何被 AI 理解、被持续陪伴这件事。益语智库做的,就是把多年战略咨询沉淀的组织思想,用 AI 和工具承载下来,作为持续陪伴客户的一种新方式。" rows={4} />
        </div>
        <div className="mt-5">
          <div className="text-[12px] font-semibold text-os-muted uppercase tracking-[0.14em] mb-2">3 柱 (视角 / 思想 / 工具)</div>
          {['我们的视角', '我们的思想', '我们的工具'].map(t => (
            <Card key={t} className="mt-3 !p-4 bg-os-canvas/50">
              <div className="grid grid-cols-1 sm:grid-cols-[160px,1fr] gap-2 text-[12px]">
                <Field compact label="标签" defaultValue={t} />
                <Field compact label="标题" defaultValue="占位 (接数据时从 config 拉)" />
                <Field compact label="正文" type="textarea" defaultValue="占位" />
              </div>
            </Card>
          ))}
        </div>
        <div className="mt-5">
          <div className="text-[12px] font-semibold text-os-muted uppercase tracking-[0.14em] mb-2">客户认知带 (5 个占位)</div>
          <EmptyHint>守 ANTI_FAKE 红线: 接数据时由 admin 上传真实客户 logo + 客户授权状态。当前为类型占位。</EmptyHint>
        </div>
      </Card>

      {/* 其他 sections 折叠展示 */}
      {[
        { title: 'Hero (首屏 + 4 平台下载)', items: ['副标题文案', '下载按钮状态 (申请内测/即将开放/内测中)'] },
        { title: 'Manifesto (行动者启示 4 卡)', items: ['卡 1 标题/正文/能力', '卡 2 / 卡 3 / 卡 4 同上'] },
        { title: 'QuoteBand (深蓝金句带)', items: ['金句正文', 'eyebrow 标签', '副段说明'] },
        { title: 'Features (6 卡能力)', items: ['卡 1-6 标题/段落/take 标语', 'Card 1 / 2 弹窗演示开关'] },
        { title: 'Ledger (平台总账)', items: ['收入数字', '支出数字', '结余数字', '更新日期', '现金流明细'] },
        { title: 'Stories (4 行动者故事)', items: ['故事 1 角色/标题/正文/3 步流程', '故事 2/3/4 同上'] },
        { title: 'Join (5 角色加入入口)', items: ['行动者 / 开发者 / 资助者 / 商家 / 基金会 配置'] },
        { title: 'FinalCta (深蓝下载 CTA)', items: ['主标题', '副标题', 'GitHub 链接', 'Roadmap 链接'] },
      ].map((sec, i) => (
        <Card key={i}>
          <h4 className="text-[13px] font-semibold text-os-navy">{sec.title}</h4>
          <ul className="mt-2 text-[12px] text-os-muted/85 space-y-1">
            {sec.items.map(it => <li key={it} className="flex items-center gap-1.5"><ChevronRight className="w-3 h-3 text-os-blue/60" />{it} <span className="text-os-muted/60">(占位 · 接数据时展开为真实表单)</span></li>)}
          </ul>
        </Card>
      ))}

      <div className="flex items-center justify-end gap-2 pt-4">
        <button onClick={() => console.log('取消')} className="px-5 py-2 rounded-full text-[13px] font-medium text-os-muted hover:text-os-navy">取消</button>
        <ToolbarButton onClick={() => console.log('保存首页配置')}>保存全部</ToolbarButton>
      </div>
    </div>
  );
}

// ============== Module: About Config ==============
export function AboutConfig() {
  return (
    <div className="space-y-6 max-w-[1100px]">
      <SectionTitle hint="编辑关于我们页的核心价值观/服务/里程碑/联系方式">关于我们配置</SectionTitle>

      <Card>
        <h4 className="text-[13px] font-semibold text-os-navy mb-3">Hero 段</h4>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Field label="eyebrow" defaultValue="关于益语智库" />
          <Field label="主标题"   defaultValue="让战略落到地上" />
          <Field label="副标题渐变行" defaultValue="让组织持续增长" />
          <Field label="主 CTA 按钮文案" defaultValue="免费预约组织诊断" />
        </div>
        <Field label="副标题正文" type="textarea" rows={3} defaultValue="益语智库是一家把战略思想做成 AI 工具的组织陪伴公司..." />
      </Card>

      <Card>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-[13px] font-semibold text-os-navy">核心价值观 (4 卡)</h4>
          <button className="text-[12px] text-os-blue hover:text-os-navy">+ 添加</button>
        </div>
        {['结果导向', '长期陪伴', '专业深度', '知识资产化'].map(v => (
          <div key={v} className="mt-2 p-3 rounded-[12px] bg-os-canvas/50 ring-1 ring-os-line">
            <div className="grid grid-cols-1 sm:grid-cols-[160px,1fr,auto] gap-2 items-center">
              <Field compact label="标题"  defaultValue={v} />
              <Field compact label="说明"  defaultValue="占位说明文案" />
              <button className="p-1.5 rounded-md hover:bg-rose-50 text-rose-600"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          </div>
        ))}
      </Card>

      <Card>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-[13px] font-semibold text-os-navy">服务内容 (3 卡)</h4>
          <button className="text-[12px] text-os-blue hover:text-os-navy">+ 添加</button>
        </div>
        {['战略路径清晰化', '组织效能重构', '数字化与 AI 落地赋能'].map(s => (
          <div key={s} className="mt-2 p-3 rounded-[12px] bg-os-canvas/50 ring-1 ring-os-line">
            <Field compact label="服务名" defaultValue={s} />
          </div>
        ))}
      </Card>

      <Card>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-[13px] font-semibold text-os-navy">发展历程 (里程碑)</h4>
          <button className="text-[12px] text-os-blue hover:text-os-navy">+ 添加</button>
        </div>
        {['2020 · 问题意识形成', '2021 · 方法论沉淀', '2023 · 知识产品化', '2025 · AI 协同升级'].map(m => (
          <div key={m} className="mt-2 p-3 rounded-[12px] bg-os-canvas/50 ring-1 ring-os-line text-[13px] text-os-ink/85">
            {m} <span className="text-os-muted/60 ml-2">(占位)</span>
          </div>
        ))}
      </Card>

      <div className="flex items-center justify-end gap-2 pt-4">
        <button className="px-5 py-2 rounded-full text-[13px] font-medium text-os-muted hover:text-os-navy">取消</button>
        <ToolbarButton onClick={() => console.log('保存关于我们')}>保存</ToolbarButton>
      </div>
    </div>
  );
}

// ============== Module: Site Settings ==============
export function SiteSettings() {
  return (
    <div className="space-y-6 max-w-[900px]">
      <SectionTitle hint="影响整站 meta / 底部 / ICP / 联系方式 / 公众号">整站设置</SectionTitle>

      <Card>
        <h4 className="text-[13px] font-semibold text-os-navy mb-3">SEO Meta</h4>
        <div className="space-y-3">
          <Field label="网站标题"       defaultValue="益语智库 Yiyu Think Tank · 把战略思想做成 AI 工具的组织陪伴公司" />
          <Field label="meta description" type="textarea" rows={2} defaultValue="益语智库 - 助力企业持续增长的战略陪伴者..." />
          <Field label="keywords"        defaultValue="战略陪伴, 组织咨询, AI 工作流, 益语智库" />
          <Field label="OG image"        defaultValue="/og-image.png" />
        </div>
      </Card>

      <Card>
        <h4 className="text-[13px] font-semibold text-os-navy mb-3">联系方式 / 底部</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="联系电话" defaultValue="占位" />
          <Field label="联系邮箱" defaultValue="占位" />
          <Field label="微信公众号"defaultValue="占位" />
          <Field label="ICP 备案号" defaultValue="占位" />
          <Field label="ICP 链接"   defaultValue="占位" />
          <Field label="底部 slogan" defaultValue="把战略思想做成 AI 工具的组织陪伴公司" />
        </div>
      </Card>

      <Card>
        <h4 className="text-[13px] font-semibold text-os-navy mb-3">GitHub / 开源</h4>
        <Field label="GitHub 仓库 URL" defaultValue="https://github.com/guyuan9300-max/yiyu-thinktank-workbench" />
      </Card>

      <div className="flex items-center justify-end gap-2 pt-4">
        <button className="px-5 py-2 rounded-full text-[13px] font-medium text-os-muted hover:text-os-navy">取消</button>
        <ToolbarButton onClick={() => console.log('保存站点设置')}>保存</ToolbarButton>
      </div>
    </div>
  );
}

// ============== Module: Members Management ==============
export function MembersManagement() {
  return (
    <div className="space-y-5 max-w-[1200px]">
      <SectionTitle hint={`共 ${MOCK_MEMBERS.length} 个 mock 会员 · 接数据时从 getUsers() 拉`}>会员管理</SectionTitle>

      <Card className="!p-0 overflow-hidden">
        <table className="w-full text-[13px]">
          <thead className="bg-os-canvas/70 border-b border-os-line">
            <tr className="text-left text-os-muted text-[11px] uppercase tracking-[0.14em]">
              <th className="px-5 py-3 font-semibold">用户</th>
              <th className="px-3 py-3 font-semibold">邮箱</th>
              <th className="px-3 py-3 font-semibold">会员等级</th>
              <th className="px-3 py-3 font-semibold">加入时间</th>
              <th className="px-3 py-3 font-semibold">会员有效期</th>
              <th className="px-5 py-3 font-semibold w-32">操作</th>
            </tr>
          </thead>
          <tbody>
            {MOCK_MEMBERS.map(m => (
              <tr key={m.id} className="border-b border-os-line/60 hover:bg-os-canvas/40">
                <td className="px-5 py-3 font-medium text-os-ink">{m.nickname}</td>
                <td className="px-3 py-3 text-os-muted">{m.email}</td>
                <td className="px-3 py-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ring-1 ${
                    m.tier === 'paid' ? 'bg-amber-50 text-amber-700 ring-amber-200/60' : 'bg-os-canvas text-os-muted ring-os-line'
                  }`}>
                    {m.tier === 'paid' ? '付费会员' : '普通会员'}
                  </span>
                </td>
                <td className="px-3 py-3 text-os-muted">{m.joinedAt}</td>
                <td className="px-3 py-3 text-os-muted">{m.validUntil || '—'}</td>
                <td className="px-5 py-3 text-[12px] text-os-blue hover:text-os-navy">
                  <button onClick={() => console.log('详情', m.id)}>查看详情</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

// ============== Module: Orders Management ==============
export function OrdersManagement() {
  return (
    <div className="space-y-5 max-w-[1200px]">
      <SectionTitle hint={`共 ${MOCK_ORDERS.length} 条 mock 订单 · 接数据时从 pg-auth-api 拉付费记录`}>订单管理</SectionTitle>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="本月订单"   value="14"      hint="较上月 +3" />
        <KpiCard label="本月营收"   value="¥38,420" tone="blue" />
        <KpiCard label="退款笔数"   value="1"       tone="spark" />
        <KpiCard label="累计会员数" value="128" />
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
              <th className="px-5 py-3 font-semibold w-28">操作</th>
            </tr>
          </thead>
          <tbody>
            {MOCK_ORDERS.map(o => (
              <tr key={o.id} className="border-b border-os-line/60 hover:bg-os-canvas/40">
                <td className="px-5 py-3 font-mono text-[12px] text-os-ink">{o.orderNo}</td>
                <td className="px-3 py-3 text-os-muted">{o.user}</td>
                <td className="px-3 py-3 text-os-muted">{o.plan}</td>
                <td className="px-3 py-3 text-right font-semibold text-os-navy">¥{(o.amount/100).toFixed(2)}</td>
                <td className="px-3 py-3"><StatusBadge status={o.status} /></td>
                <td className="px-3 py-3 text-os-muted">{o.paidAt}</td>
                <td className="px-5 py-3 text-[12px] text-os-blue hover:text-os-navy">
                  <button onClick={() => console.log('详情', o.id)}>查看</button>
                  {o.status === 'paid' && (
                    <button onClick={() => console.log('退款', o.id)} className="ml-2 text-rose-600 hover:text-rose-700">退款</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

// ============== Module: Consult Requests ==============
export function ConsultRequests() {
  return (
    <div className="space-y-5 max-w-[1200px]">
      <SectionTitle hint={`共 ${MOCK_CONSULT_REQUESTS.length} 条申请 · 接数据时从 getConsultRequests() 拉`}>申请咨询</SectionTitle>

      <Card className="!p-0 overflow-hidden">
        <table className="w-full text-[13px]">
          <thead className="bg-os-canvas/70 border-b border-os-line">
            <tr className="text-left text-os-muted text-[11px] uppercase tracking-[0.14em]">
              <th className="px-5 py-3 font-semibold">组织</th>
              <th className="px-3 py-3 font-semibold">联系人</th>
              <th className="px-3 py-3 font-semibold">电话</th>
              <th className="px-3 py-3 font-semibold">阶段</th>
              <th className="px-3 py-3 font-semibold">提交时间</th>
              <th className="px-5 py-3 font-semibold w-32">操作</th>
            </tr>
          </thead>
          <tbody>
            {MOCK_CONSULT_REQUESTS.map(c => (
              <tr key={c.id} className="border-b border-os-line/60 hover:bg-os-canvas/40">
                <td className="px-5 py-3 font-medium text-os-ink">{c.org}</td>
                <td className="px-3 py-3 text-os-muted">{c.contactName}</td>
                <td className="px-3 py-3 text-os-muted font-mono text-[12px]">{c.contactPhone}</td>
                <td className="px-3 py-3">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-os-mist text-os-blue ring-1 ring-os-blue/20">
                    {c.stage}
                  </span>
                </td>
                <td className="px-3 py-3 text-os-muted">{c.submittedAt}</td>
                <td className="px-5 py-3 text-[12px] text-os-blue hover:text-os-navy">
                  <button onClick={() => console.log('查看', c.id)}>查看详情</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
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
