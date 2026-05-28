import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Sparkles, RefreshCw, Eye, Calendar, Image as ImageIcon, Check, AlertCircle,
  X, Loader2, Play, ExternalLink, ChevronRight,
} from 'lucide-react';

// ============================================================
// admin-v2 · 文章管理 (真功能版)
// 真连 vite-plugin-admin-ai 提供的端点:
//   GET  /api/admin-ai/list-articles
//   POST /api/admin-ai/regenerate { ids?: string[] }
//   GET  /api/admin-ai/task/:id
//   POST /api/admin-ai/cancel/:id
// ============================================================

interface ArticleRow {
  id: string;
  title: string;
  excerpt: string;
  topics: string[];
  publishDate: string;
  originalCoverImage: string | null;
  hasAiCover: boolean;
  aiIllustrationCount: number;
}

interface Task {
  id: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  total: number;
  done: number;
  errors: number;
  currentArticleId?: string;
  currentArticleTitle?: string;
  currentStep?: string;
  startedAt: number;
  finishedAt?: number;
  log: string[];
}

// 全局简易 toast (复用 ModelAccess 的实现风格)
function showToast(msg: string, tone: 'success' | 'error' | 'info' | 'warning' = 'info') {
  if (typeof document === 'undefined') return;
  const div = document.createElement('div');
  const bg = tone === 'success' ? '#10B981' : tone === 'error' ? '#EF4444' : tone === 'warning' ? '#D97706' : '#16265E';
  div.style.cssText = `position:fixed;top:80px;right:20px;z-index:9999;padding:12px 18px;border-radius:14px;background:${bg};color:white;font-size:13px;font-weight:600;box-shadow:0 12px 32px rgba(0,0,0,0.18);max-width:380px;line-height:1.55;transform:translateX(20px);opacity:0;transition:transform 0.3s, opacity 0.3s;`;
  div.textContent = msg;
  document.body.appendChild(div);
  requestAnimationFrame(() => { div.style.transform = 'translateX(0)'; div.style.opacity = '1'; });
  setTimeout(() => { div.style.transform = 'translateX(20px)'; div.style.opacity = '0'; setTimeout(() => div.remove(), 320); }, 3200);
}

export function ArticlesAiManagement() {
  const [articles, setArticles] = useState<ArticleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'has-ai' | 'missing'>('all');
  const [task, setTask] = useState<Task | null>(null);
  const taskRef = useRef<Task | null>(null);
  taskRef.current = task;

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/admin-ai/list-articles', { cache: 'no-store' });
      const data = await r.json();
      setArticles(data.articles || []);
    } catch (e) {
      showToast(`加载文章列表失败: ${(e as any)?.message || e}`, 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadList(); }, [loadList]);

  // 任务进度轮询
  useEffect(() => {
    if (!task?.id || task.status !== 'running') return;
    const interval = setInterval(async () => {
      try {
        const r = await fetch(`/api/admin-ai/task/${task.id}`);
        if (!r.ok) return;
        const data = await r.json();
        setTask(data);
        if (data.status !== 'running') {
          clearInterval(interval);
          showToast(
            data.status === 'completed' ? `✓ 完成 · ${data.done} 篇成功 / ${data.errors} 失败`
            : data.status === 'cancelled' ? '任务已取消'
            : `任务失败`,
            data.status === 'completed' ? 'success' : 'warning',
          );
          loadList(); // 刷新列表状态
        }
      } catch {}
    }, 2000);
    return () => clearInterval(interval);
  }, [task?.id, task?.status, loadList]);

  const startBatch = async (ids: string[] | null, confirmMsg?: string) => {
    if (confirmMsg && !window.confirm(confirmMsg)) return;
    try {
      const r = await fetch('/api/admin-ai/regenerate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ids ? { ids } : {}),
      });
      const data = await r.json();
      if (!r.ok) { showToast(`启动失败: ${data.error || r.status}`, 'error'); return; }
      setTask({ id: data.taskId, status: 'running', total: ids?.length || articles.length, done: 0, errors: 0, log: [], startedAt: Date.now() });
      showToast(`任务已启动 · ${data.taskId.slice(0, 18)}…`, 'success');
    } catch (e) {
      showToast(`启动异常: ${(e as any)?.message || e}`, 'error');
    }
  };

  const cancelTask = async () => {
    if (!task?.id) return;
    if (!window.confirm('确认取消正在进行的任务?')) return;
    try {
      await fetch(`/api/admin-ai/cancel/${task.id}`, { method: 'POST' });
    } catch {}
  };

  const startMissing = () => {
    const missing = articles.filter((a) => !a.hasAiCover).map((a) => a.id);
    if (missing.length === 0) { showToast('所有文章已有 AI 封面 ✓', 'info'); return; }
    startBatch(missing, `将为 ${missing.length} 篇缺失 AI 封面的文章生成. 预估 ${Math.ceil(missing.length * 1.5)} 分钟. 确认?`);
  };

  const startAll = () => {
    startBatch(null, `将为全部 ${articles.length} 篇文章 重新生成 AI 封面+章节配图.\n预估 ${Math.ceil(articles.length * 1.5)} 分钟. 已有的图会被跳过 (除非手动删除). 确认?`);
  };

  const startOne = (id: string, title: string) => {
    startBatch([id], `重新生成《${title.slice(0, 24)}》的 AI 套装?`);
  };

  // 筛选
  const filtered = articles.filter((a) => {
    if (search && !a.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (filter === 'has-ai' && !a.hasAiCover) return false;
    if (filter === 'missing' && a.hasAiCover) return false;
    return true;
  });

  const stats = {
    total: articles.length,
    hasAi: articles.filter((a) => a.hasAiCover).length,
    totalIllust: articles.reduce((s, a) => s + a.aiIllustrationCount, 0),
  };

  return (
    <div className="space-y-5 max-w-[1200px]">
      {/* 顶部说明 */}
      <div className="rounded-[14px] bg-os-mist/40 ring-1 ring-os-blue/15 px-4 py-3 flex items-start gap-3">
        <Sparkles className="w-4 h-4 text-os-blue mt-0.5 shrink-0" />
        <div className="flex-1 text-[12.5px] text-os-ink/85 leading-relaxed">
          <strong className="text-os-navy">文章 AI 套装生成</strong> · 本页连真实线上文章 (19 篇 published).
          点击 <strong>批量生成</strong> 后, vite admin-ai plugin 调豆包 chat + Seedream 4.0,
          为每篇生成封面 + N 张章节配图, 写入 <code className="font-mono px-1 rounded bg-os-paper">public/ai-generated/articles/{`{id}`}/</code>.
          生成后访问前台 <code className="font-mono px-1 rounded bg-os-paper">?page=articles</code> 看真实效果.
        </div>
      </div>

      {/* KPI + 批量按钮 */}
      <div className="flex flex-wrap items-center gap-4 justify-between">
        <div className="flex items-center gap-5 text-[13px]">
          <div>
            <div className="text-[11px] tracking-[0.14em] text-os-muted uppercase">总文章</div>
            <div className="mt-0.5 font-serif-display text-[24px] font-semibold text-os-navy">{stats.total}</div>
          </div>
          <div className="w-px h-10 bg-os-line" />
          <div>
            <div className="text-[11px] tracking-[0.14em] text-os-muted uppercase">已有 AI 封面</div>
            <div className="mt-0.5 font-serif-display text-[24px] font-semibold text-emerald-600">
              {stats.hasAi} <span className="text-[14px] text-os-muted/70">/{stats.total}</span>
            </div>
          </div>
          <div className="w-px h-10 bg-os-line" />
          <div>
            <div className="text-[11px] tracking-[0.14em] text-os-muted uppercase">AI 配图总数</div>
            <div className="mt-0.5 font-serif-display text-[24px] font-semibold text-os-spark">{stats.totalIllust}</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadList}
            disabled={loading}
            className="px-3 py-2 rounded-full text-[12px] font-medium text-os-muted hover:text-os-navy ring-1 ring-os-line bg-os-paper inline-flex items-center gap-1.5 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />刷新
          </button>
          <button
            onClick={startMissing}
            disabled={!!task && task.status === 'running'}
            className="px-4 py-2 rounded-full text-[13px] font-semibold text-os-navy bg-os-mist hover:bg-os-mist/80 ring-1 ring-os-blue/20 inline-flex items-center gap-1.5 disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5" />仅补缺失 ({stats.total - stats.hasAi})
          </button>
          <button
            onClick={startAll}
            disabled={!!task && task.status === 'running'}
            className="px-4 py-2 rounded-full text-[13px] font-semibold text-white bg-gradient-to-r from-os-navy to-os-indigo hover:brightness-110 shadow-os inline-flex items-center gap-1.5 disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5" />批量生成 AI 套装 ({stats.total} 篇)
          </button>
        </div>
      </div>

      {/* 搜索 + 筛选 */}
      <div className="rounded-[14px] bg-os-paper ring-1 ring-os-line p-3 flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="搜索标题..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-48 px-3 py-1.5 rounded-full bg-os-canvas ring-1 ring-os-line text-[13px] focus:outline-none focus:ring-2 focus:ring-os-navy/30"
        />
        <div className="flex items-center gap-1 rounded-full bg-os-canvas p-1 ring-1 ring-os-line">
          {(['all', 'has-ai', 'missing'] as const).map((k) => (
            <button
              key={k}
              onClick={() => setFilter(k)}
              className={`px-3 py-1 rounded-full text-[12px] font-semibold transition-colors ${
                filter === k ? 'bg-os-navy text-white shadow-os' : 'text-os-muted hover:text-os-navy'
              }`}
            >
              {{ all: '全部', 'has-ai': '已有 AI', missing: '缺失' }[k]}
            </button>
          ))}
        </div>
      </div>

      {/* 列表 */}
      <div className="rounded-[14px] bg-os-paper ring-1 ring-os-line overflow-hidden">
        <table className="w-full text-[13px]">
          <thead className="bg-os-canvas/70 border-b border-os-line">
            <tr className="text-left text-os-muted text-[11px] uppercase tracking-[0.14em]">
              <th className="px-4 py-3 font-semibold w-12">#</th>
              <th className="px-3 py-3 font-semibold">标题</th>
              <th className="px-3 py-3 font-semibold">标签</th>
              <th className="px-3 py-3 font-semibold">发布</th>
              <th className="px-3 py-3 font-semibold">AI 套装</th>
              <th className="px-4 py-3 font-semibold w-44">操作</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={6} className="px-4 py-12 text-center text-os-muted text-[13px]">
                <Loader2 className="w-5 h-5 inline-block mr-2 animate-spin" />加载中...
              </td></tr>
            )}
            {!loading && filtered.map((a, i) => (
              <tr key={a.id} className="border-b border-os-line/60 hover:bg-os-canvas/40 transition-colors">
                <td className="px-4 py-3 text-os-muted/70 font-mono text-[11px]">{i + 1}</td>
                <td className="px-3 py-3 max-w-md">
                  <div className="font-medium text-os-ink leading-snug line-clamp-2">{a.title}</div>
                  <div className="text-[11px] text-os-muted/80 mt-0.5 line-clamp-1">{a.excerpt}</div>
                </td>
                <td className="px-3 py-3 text-os-muted text-[12px] max-w-[120px]">{(a.topics || []).join(' / ')}</td>
                <td className="px-3 py-3 text-os-muted text-[12px] font-mono">{a.publishDate?.slice(0, 10) || '—'}</td>
                <td className="px-3 py-3">
                  {a.hasAiCover ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60">
                      <Check className="w-3 h-3" />封面 + {a.aiIllustrationCount} 配图
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 ring-1 ring-amber-200/60">
                      <AlertCircle className="w-3 h-3" />未生成
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => startOne(a.id, a.title)}
                      disabled={!!task && task.status === 'running'}
                      className="px-2.5 py-1 rounded-md text-[11px] font-semibold text-os-blue hover:bg-os-mist ring-1 ring-os-blue/20 disabled:opacity-40 inline-flex items-center gap-1"
                      title="重新生成此篇"
                    >
                      <RefreshCw className="w-3 h-3" />重生成
                    </button>
                    {a.hasAiCover && (
                      <a
                        href={`?page=article&id=${a.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1 rounded-md text-[11px] font-semibold text-os-muted hover:text-os-navy hover:bg-os-mist inline-flex items-center gap-1"
                        title="在前台预览"
                      >
                        <ExternalLink className="w-3 h-3" />预览
                      </a>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {!loading && filtered.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-12 text-center text-os-muted text-[13px]">
                没有匹配的文章
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 进度 Modal */}
      {task && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl rounded-[20px] bg-os-paper shadow-os-lg ring-1 ring-os-line max-h-[90vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-os-line bg-os-paper/95 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {task.status === 'running' && <Loader2 className="w-5 h-5 text-os-navy animate-spin" />}
                {task.status === 'completed' && <Check className="w-5 h-5 text-emerald-600" />}
                {(task.status === 'failed' || task.status === 'cancelled') && <AlertCircle className="w-5 h-5 text-rose-600" />}
                <h3 className="font-serif-display text-[18px] font-semibold text-os-navy tracking-tight">
                  AI 套装批量生成 · {{ running: '进行中', completed: '已完成', failed: '失败', cancelled: '已取消' }[task.status]}
                </h3>
              </div>
              {task.status !== 'running' && (
                <button onClick={() => setTask(null)} className="p-1.5 rounded-lg hover:bg-os-mist text-os-muted">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="px-6 py-5 space-y-4 overflow-y-auto">
              {/* 进度条 */}
              <div>
                <div className="flex items-center justify-between text-[12px] text-os-muted mb-1.5">
                  <span>进度</span>
                  <span className="font-mono">{task.done} / {task.total || '?'} 完成 · {task.errors} 失败</span>
                </div>
                <div className="h-2 rounded-full bg-os-line/60 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-os-navy to-os-indigo transition-all duration-300"
                    style={{ width: `${task.total > 0 ? ((task.done + task.errors) / task.total * 100) : 0}%` }}
                  />
                </div>
              </div>

              {/* 当前正在做什么 */}
              {task.status === 'running' && (
                <div className="rounded-[12px] bg-os-mist/40 ring-1 ring-os-blue/15 px-4 py-3 text-[12.5px]">
                  <div className="text-os-muted/80 text-[11px] uppercase tracking-[0.14em] font-semibold mb-1">当前处理</div>
                  <div className="text-os-ink font-medium line-clamp-1">{task.currentArticleTitle || '准备中...'}</div>
                  {task.currentStep && (
                    <div className="text-os-blue mt-1 inline-flex items-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin" />{task.currentStep}
                    </div>
                  )}
                </div>
              )}

              {/* Log */}
              <div>
                <div className="text-[11px] uppercase tracking-[0.14em] font-semibold text-os-muted mb-1.5">活动日志</div>
                <div className="rounded-[12px] bg-os-canvas ring-1 ring-os-line p-3 max-h-[260px] overflow-y-auto text-[12px] font-mono space-y-0.5">
                  {task.log.length === 0 && <div className="text-os-muted italic">尚无日志...</div>}
                  {task.log.slice(-50).map((line, i) => (
                    <div
                      key={i}
                      className={
                        line.startsWith('✓') ? 'text-emerald-700'
                        : line.startsWith('❌') ? 'text-rose-700'
                        : 'text-os-ink/85'
                      }
                    >
                      {line}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="px-6 py-3 border-t border-os-line bg-os-paper/95 flex items-center justify-end gap-2">
              {task.status === 'running' ? (
                <>
                  <button
                    onClick={() => setTask(null)}
                    className="px-4 py-2 rounded-full text-[12px] font-medium text-os-muted hover:text-os-navy"
                  >
                    后台运行 (关闭此弹窗)
                  </button>
                  <button
                    onClick={cancelTask}
                    className="px-4 py-2 rounded-full text-[12px] font-semibold text-rose-700 bg-rose-50 ring-1 ring-rose-200 hover:bg-rose-100"
                  >
                    取消任务
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setTask(null)}
                  className="px-5 py-2 rounded-full text-[13px] font-semibold text-white bg-gradient-to-r from-os-navy to-os-indigo shadow-os"
                >
                  关闭
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
