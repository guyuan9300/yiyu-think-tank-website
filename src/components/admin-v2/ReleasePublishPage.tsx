// 版本发布页(合并原 当前版本 / 版本管理 / 安装包 / 官网同步)
// 真接 cloud_backend:listReleases / createRelease / patchRelease。
import { useCallback, useEffect, useState } from 'react';
import { Rocket, Plus, Loader2, CheckCircle2, RefreshCw } from 'lucide-react';
import {
  listReleases,
  createRelease,
  patchRelease,
  type ReleaseRecord,
  type ReleaseStatus,
} from '../../lib/releaseConsoleApi';

const STATUS_LABEL: Record<ReleaseStatus, string> = {
  draft: '草稿',
  testing: '测试',
  published: '已发布',
  rolled_back: '已回滚',
};
const STATUS_TONE: Record<ReleaseStatus, string> = {
  draft: 'bg-slate-100 text-slate-600',
  testing: 'bg-amber-100 text-amber-700',
  published: 'bg-emerald-100 text-emerald-700',
  rolled_back: 'bg-rose-100 text-rose-600',
};
const NOTE_SECTIONS: { key: string; label: string }[] = [
  { key: '新增', label: '新增功能' },
  { key: '修复', label: '问题修复' },
  { key: '优化', label: '体验优化' },
];

function fmt(ts: string | null): string {
  if (!ts) return '—';
  return ts.replace('T', ' ').slice(0, 16);
}

export function ReleasePublish() {
  const [releases, setReleases] = useState<ReleaseRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // 新建表单
  const [version, setVersion] = useState('');
  const [notes, setNotes] = useState<Record<string, string>>({ 新增: '', 修复: '', 优化: '' });

  const load = useCallback(async () => {
    setLoading(true);
    const res = await listReleases();
    if (res.ok) {
      setReleases(res.data ?? []);
      setError('');
    } else {
      setError(res.error || '加载失败');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const published = releases.find((r) => r.status === 'published') ?? null;

  const handleCreate = async () => {
    if (!version.trim()) {
      setError('请填写版本号');
      return;
    }
    setCreating(true);
    const userNotes: Record<string, string[]> = {};
    for (const { key } of NOTE_SECTIONS) {
      const lines = (notes[key] || '')
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);
      if (lines.length) userNotes[key] = lines;
    }
    const res = await createRelease({ version: version.trim(), userNotes, platforms: ['mac'] });
    setCreating(false);
    if (res.ok) {
      setVersion('');
      setNotes({ 新增: '', 修复: '', 优化: '' });
      setShowForm(false);
      setError('');
      void load();
    } else {
      setError(res.error || '创建失败');
    }
  };

  const handlePublish = async (rel: ReleaseRecord) => {
    setBusyId(rel.id);
    const res = await patchRelease(rel.id, { status: 'published' });
    setBusyId(null);
    if (res.ok) void load();
    else setError(res.error || '发布失败');
  };

  const handleRollback = async (rel: ReleaseRecord) => {
    setBusyId(rel.id);
    const res = await patchRelease(rel.id, { status: 'rolled_back' });
    setBusyId(null);
    if (res.ok) void load();
    else setError(res.error || '回滚失败');
  };

  return (
    <div className="space-y-5">
      {/* 头部:当前已发布版本 + 操作 */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Rocket className="w-6 h-6 text-[#5B7BFE]" />
          <div>
            <h2 className="text-lg font-bold text-slate-900">版本发布</h2>
            <p className="text-[13px] text-slate-500">
              当前线上版本:
              {published ? (
                <span className="ml-1 font-bold text-emerald-700">
                  V{published.version} · {fmt(published.publishedAt)} 发布
                </span>
              ) : (
                <span className="ml-1 text-slate-400">暂无已发布版本</span>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-[13px] font-medium text-slate-600 hover:bg-slate-50"
          >
            <RefreshCw className="w-3.5 h-3.5" /> 刷新
          </button>
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className="inline-flex items-center gap-1 rounded-lg bg-[#5B7BFE] px-3 py-1.5 text-[13px] font-bold text-white hover:bg-[#4A6AED]"
          >
            <Plus className="w-3.5 h-3.5" /> 新建版本
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[13px] text-rose-700">{error}</div>
      )}

      {/* 新建版本表单 */}
      {showForm && (
        <div className="rounded-2xl border border-blue-100 bg-blue-50/40 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <label className="w-20 shrink-0 text-[13px] font-bold text-slate-700">版本号</label>
            <input
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              placeholder="如 0.3.1"
              className="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-[13px] outline-none focus:border-[#5B7BFE]"
            />
          </div>
          {NOTE_SECTIONS.map(({ key, label }) => (
            <div key={key} className="flex items-start gap-2">
              <label className="w-20 shrink-0 pt-1.5 text-[13px] font-bold text-slate-700">{label}</label>
              <textarea
                value={notes[key]}
                onChange={(e) => setNotes((prev) => ({ ...prev, [key]: e.target.value }))}
                placeholder="每行一条,给用户看的更新说明"
                rows={2}
                className="flex-1 resize-y rounded-lg border border-slate-200 px-3 py-1.5 text-[13px] outline-none focus:border-[#5B7BFE]"
              />
            </div>
          ))}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-[13px] text-slate-600 hover:bg-white"
            >
              取消
            </button>
            <button
              type="button"
              disabled={creating || !version.trim()}
              onClick={() => void handleCreate()}
              className="inline-flex items-center gap-1 rounded-lg bg-[#5B7BFE] px-4 py-1.5 text-[13px] font-bold text-white disabled:opacity-50"
            >
              {creating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              创建草稿
            </button>
          </div>
        </div>
      )}

      {/* 版本列表 */}
      <div className="rounded-2xl border border-slate-100 overflow-hidden">
        <div className="grid grid-cols-[1fr_80px_90px_1fr_120px] gap-2 bg-slate-50 px-4 py-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">
          <span>版本 / 更新说明</span>
          <span>状态</span>
          <span>平台</span>
          <span>发布时间</span>
          <span className="text-right">操作</span>
        </div>
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-[13px] text-slate-400">
            <Loader2 className="w-4 h-4 animate-spin" /> 加载中…
          </div>
        ) : releases.length === 0 ? (
          <div className="py-10 text-center text-[13px] text-slate-400">还没有版本,点「新建版本」创建第一个。</div>
        ) : (
          releases.map((rel) => {
            const noteCount = Object.values(rel.userNotes || {}).reduce((n, arr) => n + (arr?.length || 0), 0);
            return (
              <div
                key={rel.id}
                className="grid grid-cols-[1fr_80px_90px_1fr_120px] items-center gap-2 border-t border-slate-100 px-4 py-2.5 text-[13px]"
              >
                <div className="min-w-0">
                  <div className="font-bold text-slate-900">V{rel.version}</div>
                  <div className="truncate text-[11px] text-slate-400">
                    {noteCount > 0 ? `${noteCount} 条用户更新说明` : '无更新说明'}
                    {rel.mandatory ? ' · 强制更新' : ''}
                  </div>
                </div>
                <span className={`inline-flex w-fit rounded-full px-2 py-0.5 text-[11px] font-bold ${STATUS_TONE[rel.status]}`}>
                  {STATUS_LABEL[rel.status]}
                </span>
                <span className="text-[12px] text-slate-500">{(rel.platforms || []).join('/') || '—'}</span>
                <span className="text-[12px] text-slate-500">{fmt(rel.publishedAt)}</span>
                <div className="flex justify-end gap-1.5">
                  {rel.status !== 'published' && (
                    <button
                      type="button"
                      disabled={busyId === rel.id}
                      onClick={() => void handlePublish(rel)}
                      className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-[12px] font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {busyId === rel.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                      发布
                    </button>
                  )}
                  {rel.status === 'published' && (
                    <button
                      type="button"
                      disabled={busyId === rel.id}
                      onClick={() => void handleRollback(rel)}
                      className="rounded-lg border border-rose-200 px-2.5 py-1 text-[12px] font-medium text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                    >
                      回滚
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      <p className="text-[12px] text-slate-400">
        发布后,官网公开下载页会自动显示该版本(派生自这条记录)。安装包上传与 SHA 校验由发版脚本
        <code className="mx-1 rounded bg-slate-100 px-1">release:mac:tos</code>回写,无需在此手动操作。
      </p>
    </div>
  );
}
