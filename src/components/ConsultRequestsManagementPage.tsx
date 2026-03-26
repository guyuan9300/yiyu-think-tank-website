import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Briefcase, ChevronDown, ChevronUp, Loader2, User2 } from 'lucide-react';
import { fetchAdminConsultRequests, type ConsultRequestRecord } from '../lib/authApi';
import { PaginationControls } from './PaginationControls';

const PAGE_SIZE = 10;

function formatDateTime(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('zh-CN', { hour12: false });
}

export function ConsultRequestsManagementPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [items, setItems] = useState<ConsultRequestRecord[]>([]);
  const [expandedId, setExpandedId] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError('');
      const result = await fetchAdminConsultRequests();
      if (cancelled) return;
      if (!result.ok || !result.data) {
        setItems([]);
        setError(result.error || '加载咨询申请失败');
        setLoading(false);
        return;
      }
      setItems(result.data);
      setLoading(false);
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pagedItems = useMemo(
    () => items.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [currentPage, items]
  );

  if (loading) {
    return (
      <div className="rounded-2xl border border-gray-100 bg-white p-8 shadow-sm">
        <div className="flex items-center gap-3 text-sm text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          正在加载咨询申请...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
        <div className="flex items-center gap-2 font-medium">
          <AlertTriangle className="h-4 w-4" />
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">咨询申请</h2>
            <p className="mt-2 text-sm text-gray-500">这里会统一收集官网站内提交的组织诊断申请，便于后续评估和跟进。</p>
          </div>
          <div className="rounded-2xl bg-gray-50 px-4 py-3 text-right">
            <div className="text-xs text-gray-500">申请总数</div>
            <div className="text-2xl font-semibold text-gray-900">{items.length}</div>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="grid grid-cols-[1.4fr,1fr,0.9fr,0.9fr,0.8fr,0.7fr] gap-4 border-b border-gray-100 px-6 py-4 text-xs font-medium uppercase tracking-[0.18em] text-gray-400">
          <span>机构 / 联系人</span>
          <span>角色 / 手机</span>
          <span>邮箱</span>
          <span>核心问题</span>
          <span>提交时间</span>
          <span>状态</span>
        </div>

        {pagedItems.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-gray-500">暂时还没有咨询申请。</div>
        ) : (
          pagedItems.map((item) => {
            const expanded = expandedId === item.id;
            return (
              <div key={item.id} className="border-b border-gray-100 last:border-b-0">
                <button
                  type="button"
                  onClick={() => setExpandedId(expanded ? '' : item.id)}
                  className="grid w-full grid-cols-[1.4fr,1fr,0.9fr,0.9fr,0.8fr,0.7fr] gap-4 px-6 py-5 text-left transition hover:bg-gray-50"
                >
                  <div>
                    <div className="font-medium text-gray-900">{item.organization || '未填写机构'}</div>
                    <div className="mt-1 text-sm text-gray-500">{item.name || '未填写姓名'}</div>
                  </div>
                  <div className="text-sm text-gray-600">
                    <div>{item.role || '—'}</div>
                    <div className="mt-1 text-gray-500">{item.phone || '—'}</div>
                  </div>
                  <div className="truncate text-sm text-gray-600">{item.email || '—'}</div>
                  <div className="line-clamp-2 text-sm text-gray-600">{item.topic || '—'}</div>
                  <div className="text-sm text-gray-500">{formatDateTime(item.createdAt)}</div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
                      {item.status || 'new'}
                    </span>
                    {expanded ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                  </div>
                </button>

                {expanded ? (
                  <div className="grid gap-6 bg-gray-50 px-6 py-5 lg:grid-cols-2">
                    <div className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5">
                      <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
                        <User2 className="h-4 w-4 text-primary" />
                        基本信息
                      </div>
                      <dl className="space-y-3 text-sm">
                        <div>
                          <dt className="text-gray-400">机构</dt>
                          <dd className="mt-1 text-gray-700">{item.organization || '—'}</dd>
                        </div>
                        <div>
                          <dt className="text-gray-400">姓名 / 角色</dt>
                          <dd className="mt-1 text-gray-700">{item.name || '—'} / {item.role || '—'}</dd>
                        </div>
                        <div>
                          <dt className="text-gray-400">手机</dt>
                          <dd className="mt-1 text-gray-700">{item.phone || '—'}</dd>
                        </div>
                        <div>
                          <dt className="text-gray-400">邮箱</dt>
                          <dd className="mt-1 text-gray-700 break-all">{item.email || '—'}</dd>
                        </div>
                      </dl>
                    </div>

                    <div className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5">
                      <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
                        <Briefcase className="h-4 w-4 text-primary" />
                        诊断背景
                      </div>
                      <dl className="space-y-3 text-sm text-gray-700">
                        <div>
                          <dt className="text-gray-400">核心问题</dt>
                          <dd className="mt-1 whitespace-pre-wrap">{item.topic || '—'}</dd>
                        </div>
                        <div>
                          <dt className="text-gray-400">已有尝试</dt>
                          <dd className="mt-1 whitespace-pre-wrap">{item.background || '—'}</dd>
                        </div>
                        <div>
                          <dt className="text-gray-400">阻力 / 约束</dt>
                          <dd className="mt-1 whitespace-pre-wrap">{item.constraints || '—'}</dd>
                        </div>
                        <div>
                          <dt className="text-gray-400">可投入资源</dt>
                          <dd className="mt-1 whitespace-pre-wrap">{item.commitment || '—'}</dd>
                        </div>
                        <div>
                          <dt className="text-gray-400">其他补充</dt>
                          <dd className="mt-1 whitespace-pre-wrap">{item.notes || '—'}</dd>
                        </div>
                      </dl>
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })
        )}

        {items.length > PAGE_SIZE ? (
          <div className="border-t border-gray-100 px-6 py-4">
            <PaginationControls
              currentPage={currentPage}
              totalItems={items.length}
              pageSize={PAGE_SIZE}
              onPageChange={setPage}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
