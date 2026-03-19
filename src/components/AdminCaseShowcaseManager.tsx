import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, FileImage, FileText, Save, Trash2, Upload } from 'lucide-react';
import { deleteCaseShowcase, fetchCaseShowcaseDetail, fetchCaseShowcases, saveCaseShowcase, type CaseShowcase } from '../lib/caseShowcaseApi';
import { uploadAdminAsset } from '../lib/authApi';

function createDraftCase(order: number): CaseShowcase {
  const stamp = Date.now();
  return {
    id: `case_${stamp}`,
    slug: `case-${order}`,
    clientName: '新机构案例',
    industry: '',
    title: '新机构案例',
    subtitle: '',
    tags: [],
    logoUrl: '',
    pptFileUrl: '',
    pptFileName: '',
    slideImages: [],
    isPublished: false,
    sortOrder: order,
  };
}

export function AdminCaseShowcaseManager() {
  const [cases, setCases] = useState<CaseShowcase[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [expandedId, setExpandedId] = useState('');
  const [draft, setDraft] = useState<CaseShowcase | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingPpt, setUploadingPpt] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const pptInputRef = useRef<HTMLInputElement>(null);

  const persistedSelectedCase = useMemo(
    () => cases.find((item) => item.id === selectedId) || null,
    [cases, selectedId]
  );

  const selectedCase = useMemo(() => {
    if (draft && draft.id === selectedId) {
      return draft;
    }
    return persistedSelectedCase;
  }, [draft, persistedSelectedCase, selectedId]);

  useEffect(() => {
    let canceled = false;
    const load = async () => {
      setLoading(true);
      const result = await fetchCaseShowcases('admin');
      if (canceled) return;
      if (!result.ok || !result.data) {
        setMessage({ type: 'error', text: result.error || '案例展示列表加载失败。' });
        setCases([]);
        setLoading(false);
        return;
      }
      setCases(result.data);
      setSelectedId('');
      setExpandedId('');
      setDraft(null);
      setLoading(false);
    };
    void load();
    return () => {
      canceled = true;
    };
  }, []);

  const updateDraft = (patch: Partial<CaseShowcase>) => {
    const base = (draft && draft.id === selectedId ? draft : persistedSelectedCase) || createDraftCase(cases.length + 1);
    const next = { ...base, ...patch };
    setDraft(next);
    setSelectedId(next.id);
  };

  const handleSelect = async (id: string) => {
    if (expandedId === id) {
      setExpandedId('');
      return;
    }
    setSelectedId(id);
    setExpandedId(id);
    setDraft(null);
    const result = await fetchCaseShowcaseDetail(id, 'admin');
    if (result.ok && result.data) {
      setDraft(result.data);
    }
  };

  const handleCreate = () => {
    const next = createDraftCase(cases.length + 1);
    setDraft(next);
    setSelectedId(next.id);
    setExpandedId(next.id);
    setMessage(null);
  };

  const handleSave = async () => {
    if (!selectedCase) return;
    setSaving(true);
    setMessage(null);
    const result = await saveCaseShowcase(selectedCase);
    setSaving(false);
    if (!result.ok || !result.data) {
      setMessage({ type: 'error', text: result.error || '案例展示保存失败。' });
      return;
    }
    setCases((prev) => {
      const hasExisting = prev.some((item) => item.id === result.data!.id);
      const merged = hasExisting
        ? prev.map((item) => (item.id === result.data!.id ? result.data! : item))
        : [...prev, result.data!];
      return merged.slice().sort((a, b) => a.sortOrder - b.sortOrder || a.clientName.localeCompare(b.clientName));
    });
    setSelectedId(result.data.id);
    setDraft(result.data);
    setExpandedId('');
    setMessage({ type: 'success', text: '案例展示已保存到腾讯云。' });
  };

  const handleDelete = async () => {
    if (!selectedCase) return;
    if (!window.confirm(`确认删除案例“${selectedCase.clientName}”吗？`)) return;
    if (!cases.some((item) => item.id === selectedCase.id)) {
      setDraft(null);
      setSelectedId('');
      setExpandedId('');
      return;
    }
    const result = await deleteCaseShowcase(selectedCase.id);
    if (!result.ok) {
      setMessage({ type: 'error', text: result.error || '案例展示删除失败。' });
      return;
    }
    setCases((prev) => prev.filter((item) => item.id !== selectedCase.id));
    setDraft(null);
    setSelectedId('');
    setExpandedId('');
    setMessage({ type: 'success', text: '案例展示已删除。' });
  };

  const handleUploadLogo = async (file?: File | null) => {
    if (!file) return;
    setUploadingLogo(true);
    const result = await uploadAdminAsset(file, 'case-logo');
    setUploadingLogo(false);
    if (!result.ok || !result.data) {
      setMessage({ type: 'error', text: result.error || 'Logo 上传失败。' });
      return;
    }
    updateDraft({ logoUrl: result.data.url });
    setMessage({ type: 'success', text: 'Logo 已上传，记得保存案例展示。' });
  };

  const handleUploadPpt = async (file?: File | null) => {
    if (!file) return;
    setUploadingPpt(true);
    const result = await uploadAdminAsset(file, 'case-ppt');
    setUploadingPpt(false);
    if (!result.ok || !result.data) {
      setMessage({ type: 'error', text: result.error || 'PPT 上传失败。' });
      return;
    }
    updateDraft({
      pptFileUrl: result.data.url,
      pptFileName: file.name,
      slideImages: result.data.slides || [],
    });
    setMessage({ type: 'success', text: `PPT 已上传并转换为 ${result.data.slides?.length || 0} 张图片，记得保存案例展示。` });
  };

  if (loading) {
    return <div className="rounded-[22px] border border-slate-200 bg-white p-10 text-center text-slate-500">正在加载案例展示…</div>;
  }

  const hasUnsavedDraft = Boolean(draft && !cases.some((item) => item.id === draft.id));
  const visibleCases = hasUnsavedDraft && draft ? [draft, ...cases] : cases;

  return (
    <div className="space-y-5">
      {message ? (
        <div className={`rounded-2xl border px-4 py-3 text-sm ${message.type === 'success' ? 'border-emerald-100 bg-emerald-50 text-emerald-700' : 'border-red-100 bg-red-50 text-red-700'}`}>
          {message.text}
        </div>
      ) : null}

      <div className="rounded-[22px] border border-slate-200 bg-white p-5 sm:p-6">
        <div className="mb-5">
          <div>
            <h3 className="text-[16px] font-semibold text-slate-900">案例展示</h3>
            <p className="text-[12px] text-slate-500">点击客户记录展开后，只维护客户名称、Logo 与客户介绍 PPT。</p>
          </div>
        </div>

        <div className="space-y-3">
          {visibleCases.map((item) => {
            const expanded = expandedId === item.id;
            const current = selectedId === item.id ? selectedCase || item : item;
            const isCurrent = selectedId === item.id;
            return (
              <div key={item.id} className="overflow-hidden rounded-[24px] border border-slate-200 bg-white">
                <button
                  type="button"
                  onClick={() => void handleSelect(item.id)}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left hover:bg-slate-50"
                >
                  <div className="min-w-0">
                    <p className="text-[16px] font-medium text-slate-900">{current.clientName}</p>
                    <p className="mt-1 text-[12px] text-slate-500">
                      {current.slideImages.length ? `${current.slideImages.length} 张介绍图片` : '未上传客户介绍 PPT'}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`rounded-full px-2 py-1 text-[11px] ${current.isPublished ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                      {current.isPublished ? '已发布' : '草稿'}
                    </span>
                    <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`} />
                  </div>
                </button>

                {expanded ? (
                  <div className="border-t border-slate-200 bg-slate-50/60 px-5 py-5">
                    <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <label className="block flex-1 space-y-2">
                        <span className="text-[12px] font-medium text-slate-500">客户名称</span>
                        <input
                          value={current.clientName}
                          onChange={(e) => updateDraft({ clientName: e.target.value })}
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[14px]"
                        />
                      </label>
                      <label className="inline-flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[14px] text-slate-700">
                        <input
                          type="checkbox"
                          checked={current.isPublished}
                          onChange={(e) => updateDraft({ isPublished: e.target.checked })}
                          className="h-4 w-4 rounded border-slate-300 text-slate-900"
                        />
                        发布到前台案例展示
                      </label>
                    </div>

                    <div className="grid gap-4 lg:grid-cols-2">
                      <div className="rounded-2xl border border-slate-200 bg-white p-4">
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <h4 className="text-[15px] font-semibold text-slate-900">客户 Logo</h4>
                          <input
                            ref={logoInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => void handleUploadLogo(e.target.files?.[0] || null)}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedId(item.id);
                              setDraft(current);
                              logoInputRef.current?.click();
                            }}
                            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[13px] text-slate-700 hover:bg-slate-50"
                          >
                            <Upload className="h-4 w-4" />
                            {uploadingLogo && isCurrent ? '上传中…' : current.logoUrl ? '更换 Logo' : '上传 Logo'}
                          </button>
                        </div>
                        <div className="grid min-h-[220px] place-items-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-4">
                          {current.logoUrl ? (
                            <img src={current.logoUrl} alt={current.clientName} className="max-h-[180px] max-w-full object-contain" />
                          ) : (
                            <div className="text-center text-slate-400">
                              <FileImage className="mx-auto mb-2 h-8 w-8" />
                              暂未上传 Logo
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-white p-4">
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <h4 className="text-[15px] font-semibold text-slate-900">客户介绍 PPT</h4>
                          <input
                            ref={pptInputRef}
                            type="file"
                            accept=".ppt,.pptx"
                            className="hidden"
                            onChange={(e) => void handleUploadPpt(e.target.files?.[0] || null)}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedId(item.id);
                              setDraft(current);
                              pptInputRef.current?.click();
                            }}
                            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[13px] text-slate-700 hover:bg-slate-50"
                          >
                            <Upload className="h-4 w-4" />
                            {uploadingPpt && isCurrent ? '处理中…' : current.pptFileUrl ? '更换 PPT' : '上传 PPT'}
                          </button>
                        </div>
                        <div className="min-h-[220px] rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-4">
                          {current.pptFileUrl ? (
                            <div className="space-y-3">
                              <div className="rounded-2xl bg-white p-3">
                                <div className="flex items-center gap-2 text-slate-800">
                                  <FileText className="h-4 w-4" />
                                  <span className="break-all text-[13px] font-medium">{current.pptFileName || '已上传客户介绍文件'}</span>
                                </div>
                                <p className="mt-1 text-[12px] text-slate-500">已生成 {current.slideImages.length} 张图片</p>
                              </div>
                              {current.slideImages.length ? (
                                <div className="grid grid-cols-2 gap-3">
                                  {current.slideImages.slice(0, 4).map((slide, index) => (
                                    <div key={slide} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                                      <img src={slide} alt={`第 ${index + 1} 张介绍图`} className="h-28 w-full object-cover" />
                                      <div className="px-2 py-1 text-[11px] text-slate-500">第 {index + 1} 页</div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">
                                  已上传文件，转换图片处理中或未生成。
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="grid h-full min-h-[180px] place-items-center text-center text-slate-400">
                              <div>
                                <FileText className="mx-auto mb-2 h-8 w-8" />
                                暂未上传客户介绍 PPT
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap justify-end gap-2">
                      <button
                        type="button"
                        onClick={handleDelete}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-[13px] text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                        删除
                      </button>
                      <button
                        type="button"
                        onClick={handleSave}
                        disabled={saving}
                        className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-[13px] font-medium text-white hover:bg-slate-800 disabled:opacity-60"
                      >
                        <Save className="h-4 w-4" />
                        {saving ? '保存中…' : '保存到腾讯云'}
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}

          {!visibleCases.length ? (
            <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">
              还没有案例展示，先新建一个。
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default AdminCaseShowcaseManager;
