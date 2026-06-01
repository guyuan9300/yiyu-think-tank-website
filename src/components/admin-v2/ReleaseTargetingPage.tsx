// 定向推送页:把某个版本定向推给指定组织的已安装用户(或全部)。
// 真接 cloud_backend:listReleases / listOrganizations / listAssignments / createAssignment / patchAssignment。
import { useCallback, useEffect, useState } from 'react';
import { Send, Loader2, RefreshCw, Building2, Globe2 } from 'lucide-react';
import {
  listReleases,
  listOrganizations,
  listAssignments,
  createAssignment,
  patchAssignment,
  type ReleaseRecord,
  type OrgSummaryRecord,
  type AssignmentRecord,
} from '../../lib/releaseConsoleApi';

export function ReleaseTargeting() {
  const [releases, setReleases] = useState<ReleaseRecord[]>([]);
  const [orgs, setOrgs] = useState<OrgSummaryRecord[]>([]);
  const [assignments, setAssignments] = useState<AssignmentRecord[]>([]);
  const [releaseId, setReleaseId] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');

  const loadBase = useCallback(async () => {
    setLoading(true);
    const [relRes, orgRes] = await Promise.all([listReleases(), listOrganizations()]);
    if (relRes.ok) {
      const rels = relRes.data ?? [];
      setReleases(rels);
      setReleaseId((cur) => cur || rels.find((r) => r.status === 'published')?.id || rels[0]?.id || '');
    } else setError(relRes.error || '加载版本失败');
    if (orgRes.ok) setOrgs(orgRes.data ?? []);
    else setError((e) => e || orgRes.error || '加载组织失败');
    setLoading(false);
  }, []);

  const loadAssignments = useCallback(async (rid: string) => {
    if (!rid) {
      setAssignments([]);
      return;
    }
    const res = await listAssignments(rid);
    if (res.ok) setAssignments(res.data ?? []);
    else setError(res.error || '加载指派失败');
  }, []);

  useEffect(() => {
    void loadBase();
  }, [loadBase]);
  useEffect(() => {
    void loadAssignments(releaseId);
  }, [releaseId, loadAssignments]);

  const selectedRelease = releases.find((r) => r.id === releaseId) || null;
  const allAssignment = assignments.find((a) => a.targetType === 'all' && a.status === 'active') || null;
  const orgAssignment = (code: string) =>
    assignments.find((a) => a.targetType === 'org' && a.orgCode === code) || null;

  const refreshAll = async () => {
    await loadBase();
    await loadAssignments(releaseId);
  };

  const pushAll = async () => {
    if (!releaseId || allAssignment) return; // 已有 active 的全量指派则不再重复插入
    setBusy('all');
    const res = await createAssignment(releaseId, { targetType: 'all' });
    setBusy(null);
    if (res.ok) void loadAssignments(releaseId);
    else setError(res.error || '推送失败');
  };

  const assignOrg = async (code: string) => {
    if (!releaseId) return;
    setBusy(code);
    // 已有该组织的指派(如之前回滚过)→ 复活它,而不是再插一条,避免重复 active 行。
    const existing = assignments.find((a) => a.targetType === 'org' && a.orgCode === code);
    const res = existing
      ? await patchAssignment(releaseId, existing.id, { status: 'active' })
      : await createAssignment(releaseId, { targetType: 'org', orgCode: code });
    setBusy(null);
    if (res.ok) void loadAssignments(releaseId);
    else setError(res.error || '指派失败');
  };

  const setAssignmentStatus = async (a: AssignmentRecord, status: 'paused' | 'rolled_back' | 'active') => {
    setBusy(a.orgCode || a.id);
    const res = await patchAssignment(a.releaseId, a.id, { status });
    setBusy(null);
    if (res.ok) void loadAssignments(releaseId);
    else setError(res.error || '操作失败');
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Send className="w-6 h-6 text-[#5B7BFE]" />
        <div>
          <h2 className="text-lg font-bold text-slate-900">定向推送</h2>
          <p className="text-[13px] text-slate-500">选一个版本,推给指定组织(或全部)已安装的用户。</p>
        </div>
        <button
          type="button"
          onClick={() => void refreshAll()}
          className="ml-auto inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-[13px] text-slate-600 hover:bg-slate-50"
        >
          <RefreshCw className="w-3.5 h-3.5" /> 刷新
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[13px] text-rose-700">{error}</div>
      )}

      {/* 选版本 + 推全部 */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-blue-100 bg-blue-50/40 px-4 py-3">
        <label className="text-[13px] font-bold text-slate-700">推送版本</label>
        <select
          value={releaseId}
          onChange={(e) => setReleaseId(e.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[13px] outline-none focus:border-[#5B7BFE]"
        >
          {releases.length === 0 && <option value="">（暂无版本）</option>}
          {releases.map((r) => (
            <option key={r.id} value={r.id}>
              V{r.version} · {r.status}
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={!releaseId || busy === 'all' || !!allAssignment}
          onClick={() => void pushAll()}
          className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-[13px] font-bold text-white disabled:opacity-50 ${
            allAssignment ? 'bg-emerald-600' : 'bg-[#5B7BFE] hover:bg-[#4A6AED]'
          }`}
        >
          {busy === 'all' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Globe2 className="w-3.5 h-3.5" />}
          {allAssignment ? '已全量推送' : '推送给全部组织'}
        </button>
        {selectedRelease && selectedRelease.status !== 'published' && (
          <span className="text-[12px] text-amber-600">注意:该版本尚未发布,建议先在「版本发布」发布后再推送。</span>
        )}
      </div>

      {/* 组织表 */}
      <div className="rounded-2xl border border-slate-100 overflow-hidden">
        <div className="grid grid-cols-[1fr_120px_70px_70px_1fr] gap-2 bg-slate-50 px-4 py-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">
          <span>组织</span>
          <span>组织代码</span>
          <span>成员</span>
          <span>安装数</span>
          <span className="text-right">定向</span>
        </div>
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-[13px] text-slate-400">
            <Loader2 className="w-4 h-4 animate-spin" /> 加载中…
          </div>
        ) : orgs.length === 0 ? (
          <div className="py-10 text-center text-[13px] text-slate-400">暂无组织。</div>
        ) : (
          orgs.map((org) => {
            const a = orgAssignment(org.code);
            const isBusy = busy === org.code;
            return (
              <div
                key={org.id}
                className="grid grid-cols-[1fr_120px_70px_70px_1fr] items-center gap-2 border-t border-slate-100 px-4 py-2.5 text-[13px]"
              >
                <span className="flex items-center gap-1.5 font-medium text-slate-800">
                  <Building2 className="w-3.5 h-3.5 text-slate-400" /> {org.name}
                </span>
                <span className="font-mono text-[12px] text-slate-500">{org.code}</span>
                <span className="text-[12px] text-slate-500">{org.memberCount}</span>
                <span className="text-[12px] text-slate-400" title="待客户端安装上报接通后显示真值">
                  {org.installCount}
                </span>
                <div className="flex items-center justify-end gap-1.5">
                  {a && a.status === 'active' && (
                    <>
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-700">已指派</span>
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => void setAssignmentStatus(a, 'paused')}
                        className="rounded-lg border border-slate-200 px-2 py-0.5 text-[12px] text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                      >
                        暂停
                      </button>
                    </>
                  )}
                  {a && a.status === 'paused' && (
                    <>
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-700">已暂停</span>
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => void setAssignmentStatus(a, 'active')}
                        className="rounded-lg border border-slate-200 px-2 py-0.5 text-[12px] text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                      >
                        恢复
                      </button>
                    </>
                  )}
                  {(!a || a.status === 'rolled_back') && (
                    <button
                      type="button"
                      disabled={isBusy || !releaseId}
                      onClick={() => void assignOrg(org.code)}
                      className="inline-flex items-center gap-1 rounded-lg bg-[#5B7BFE] px-2.5 py-0.5 text-[12px] font-bold text-white hover:bg-[#4A6AED] disabled:opacity-50"
                    >
                      {isBusy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                      指派
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
      <p className="text-[12px] text-slate-400">
        客户端凭「组织代码」向云端解析该装哪一版:有专属指派走专属,否则走全量。安装数需客户端安装上报接通后才显真值。
      </p>
    </div>
  );
}
