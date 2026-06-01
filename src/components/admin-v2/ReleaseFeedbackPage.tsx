// 用户反馈页:收件箱 + 筛选 + 详情 + 状态流转。
// 真接 cloud_backend:listFeedback / patchFeedback。
import { useCallback, useEffect, useState } from 'react';
import { Inbox, Loader2, RefreshCw, X } from 'lucide-react';
import {
  listFeedback,
  patchFeedback,
  type FeedbackRecord,
  type FeedbackStatus,
  type FeedbackSeverity,
  type FeedbackKind,
} from '../../lib/releaseConsoleApi';

const KIND_LABEL: Record<FeedbackKind, string> = {
  bug: '缺陷',
  lag: '卡顿',
  inaccurate: '不准确',
  feature: '功能建议',
  experience: '体验',
};
const SEVERITY_LABEL: Record<FeedbackSeverity, string> = { blocker: '阻塞', impaired: '受损', minor: '轻微' };
const SEVERITY_TONE: Record<FeedbackSeverity, string> = {
  blocker: 'bg-rose-100 text-rose-700',
  impaired: 'bg-amber-100 text-amber-700',
  minor: 'bg-slate-100 text-slate-600',
};
const STATUS_LABEL: Record<FeedbackStatus, string> = {
  open: '待处理',
  confirmed: '已确认',
  triaged: '已分类',
  in_progress: '处理中',
  resolved: '已解决',
  next_release: '下版修复',
  wontfix: '不修复',
  closed: '已关闭',
};
const STATUS_ORDER: FeedbackStatus[] = [
  'open', 'confirmed', 'triaged', 'in_progress', 'resolved', 'next_release', 'wontfix', 'closed',
];
const FILTER_TABS: { key: FeedbackStatus | 'all'; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'open', label: '待处理' },
  { key: 'in_progress', label: '处理中' },
  { key: 'resolved', label: '已解决' },
  { key: 'closed', label: '已关闭' },
];

function fmt(ts: string): string {
  return (ts || '').replace('T', ' ').slice(0, 16);
}

export function ReleaseFeedback() {
  const [items, setItems] = useState<FeedbackRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<FeedbackStatus | 'all'>('all');
  const [selected, setSelected] = useState<FeedbackRecord | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await listFeedback(filter === 'all' ? {} : { status: filter });
    if (res.ok) {
      setItems(res.data ?? []);
      setError('');
    } else setError(res.error || '加载失败');
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    void load();
  }, [load]);

  const updateStatus = async (item: FeedbackRecord, status: FeedbackStatus) => {
    setBusy(true);
    const res = await patchFeedback(item.id, { status });
    setBusy(false);
    if (res.ok) {
      // 仅在确有返回记录时更新选中项;否则保持抽屉打开,避免空体误关。
      if (res.data) setSelected(res.data);
      void load();
    } else setError(res.error || '更新失败');
  };

  const updateSeverity = async (item: FeedbackRecord, severity: FeedbackSeverity) => {
    setBusy(true);
    const res = await patchFeedback(item.id, { severity });
    setBusy(false);
    if (res.ok) {
      if (res.data) setSelected(res.data);
      void load();
    } else setError(res.error || '更新失败');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Inbox className="w-6 h-6 text-[#5B7BFE]" />
        <div>
          <h2 className="text-lg font-bold text-slate-900">用户反馈</h2>
          <p className="text-[13px] text-slate-500">软件用户提交的缺陷/建议,可流转状态、定严重度。</p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="ml-auto inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-[13px] text-slate-600 hover:bg-slate-50"
        >
          <RefreshCw className="w-3.5 h-3.5" /> 刷新
        </button>
      </div>

      {/* 筛选 */}
      <div className="flex flex-wrap gap-1.5">
        {FILTER_TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setFilter(t.key)}
            className={`rounded-full px-3 py-1 text-[12px] font-medium transition ${
              filter === t.key ? 'bg-[#5B7BFE] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[13px] text-rose-700">{error}</div>
      )}

      {/* 收件箱 */}
      <div className="rounded-2xl border border-slate-100 overflow-hidden">
        <div className="grid grid-cols-[70px_60px_1fr_110px_90px_80px] gap-2 bg-slate-50 px-4 py-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">
          <span>类型</span>
          <span>严重</span>
          <span>标题</span>
          <span>组织/版本</span>
          <span>时间</span>
          <span>状态</span>
        </div>
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-[13px] text-slate-400">
            <Loader2 className="w-4 h-4 animate-spin" /> 加载中…
          </div>
        ) : items.length === 0 ? (
          <div className="py-10 text-center text-[13px] text-slate-400">暂无反馈。</div>
        ) : (
          items.map((it) => (
            <button
              key={it.id}
              type="button"
              onClick={() => setSelected(it)}
              className="grid w-full grid-cols-[70px_60px_1fr_110px_90px_80px] items-center gap-2 border-t border-slate-100 px-4 py-2.5 text-left text-[13px] hover:bg-slate-50"
            >
              <span className="text-[12px] text-slate-600">{KIND_LABEL[it.kind]}</span>
              <span className={`inline-flex w-fit rounded-full px-1.5 py-0.5 text-[11px] font-bold ${SEVERITY_TONE[it.severity]}`}>
                {SEVERITY_LABEL[it.severity]}
              </span>
              <span className="min-w-0 truncate font-medium text-slate-800">{it.title}</span>
              <span className="truncate text-[12px] text-slate-500">
                {(it.orgCode || '—')} / {it.version || '—'}
              </span>
              <span className="text-[12px] text-slate-400">{fmt(it.createdAt)}</span>
              <span className="text-[12px] font-medium text-slate-600">{STATUS_LABEL[it.status]}</span>
            </button>
          ))
        )}
      </div>

      {/* 详情抽屉 */}
      {selected && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/20" onClick={() => setSelected(null)}>
          <div
            className="h-full w-[440px] max-w-[90vw] overflow-y-auto bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <h3 className="text-[15px] font-bold text-slate-900">{selected.title}</h3>
              <button type="button" onClick={() => setSelected(null)} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="mb-3 flex flex-wrap gap-1.5 text-[12px]">
              <span className="rounded-full bg-slate-100 px-2 py-0.5">{KIND_LABEL[selected.kind]}</span>
              <span className={`rounded-full px-2 py-0.5 font-bold ${SEVERITY_TONE[selected.severity]}`}>
                {SEVERITY_LABEL[selected.severity]}
              </span>
              <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[#4166F5]">{STATUS_LABEL[selected.status]}</span>
            </div>
            <p className="mb-3 whitespace-pre-wrap text-[13px] leading-6 text-slate-700">
              {selected.description || '（无描述）'}
            </p>
            <div className="mb-4 space-y-1 rounded-lg bg-slate-50 p-3 text-[12px] text-slate-500">
              <div>提交人:{selected.submitterName || '—'}</div>
              <div>组织代码:{selected.orgCode || '—'}</div>
              <div>版本:{selected.version || '—'} · 系统:{selected.os || '—'}</div>
              <div>页面:{selected.page || '—'}</div>
              {selected.logExcerpt && <div className="truncate" title={selected.logExcerpt}>日志:{selected.logExcerpt}</div>}
              <div>提交时间:{fmt(selected.createdAt)}</div>
            </div>

            {/* 严重度 */}
            <div className="mb-3">
              <div className="mb-1 text-[12px] font-bold text-slate-600">严重度</div>
              <div className="flex gap-1.5">
                {(['blocker', 'impaired', 'minor'] as FeedbackSeverity[]).map((s) => (
                  <button
                    key={s}
                    type="button"
                    disabled={busy}
                    onClick={() => void updateSeverity(selected, s)}
                    className={`rounded-lg px-2.5 py-1 text-[12px] font-medium disabled:opacity-50 ${
                      selected.severity === s ? SEVERITY_TONE[s] : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {SEVERITY_LABEL[s]}
                  </button>
                ))}
              </div>
            </div>

            {/* 状态流转 */}
            <div>
              <div className="mb-1 text-[12px] font-bold text-slate-600">状态流转</div>
              <div className="flex flex-wrap gap-1.5">
                {STATUS_ORDER.map((s) => (
                  <button
                    key={s}
                    type="button"
                    disabled={busy || selected.status === s}
                    onClick={() => void updateStatus(selected, s)}
                    className={`rounded-lg px-2.5 py-1 text-[12px] font-medium disabled:opacity-40 ${
                      selected.status === s
                        ? 'bg-[#5B7BFE] text-white'
                        : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {STATUS_LABEL[s]}
                  </button>
                ))}
              </div>
              {busy && <Loader2 className="mt-2 w-4 h-4 animate-spin text-slate-400" />}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
