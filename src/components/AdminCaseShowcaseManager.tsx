import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Download, FileImage, FileText, Plus, Save, Trash2, Upload } from 'lucide-react';
import { deleteCaseShowcase, fetchCaseShowcaseDetail, fetchCaseShowcases, saveCaseShowcase, type CaseShowcase } from '../lib/caseShowcaseApi';
import { uploadAdminAsset } from '../lib/authApi';

function createDraftCase(order: number): CaseShowcase {
  const stamp = Date.now();
  return {
    id: `case_${stamp}`,
    slug: `case-${stamp}`,
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
  const [draft, setDraft] = useState<CaseShowcase | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingPpt, setUploadingPpt] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
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
      setSelectedId(result.data[0]?.id || '');
      setDraft(null);
      setEditorOpen(false);
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
    setSelectedId(id);
    setDraft(null);
    setEditorOpen(false);
    const result = await fetchCaseShowcaseDetail(id, 'admin');
    if (result.ok && result.data) {
      setDraft(result.data);
    }
  };

  const handleCreate = () => {
    const next = createDraftCase(cases.length + 1);
    setDraft(next);
    setSelectedId(next.id);
    setEditorOpen(true);
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
    setEditorOpen(false);
    setMessage({ type: 'success', text: '案例展示已保存到腾讯云。' });
  };

  const handleDelete = async () => {
    if (!selectedCase) return;
    if (!window.confirm(`确认删除案例“${selectedCase.clientName}”吗？`)) return;
    if (!cases.some((item) => item.id === selectedCase.id)) {
      setDraft(null);
      setSelectedId(cases[0]?.id || '');
      return;
    }
    const result = await deleteCaseShowcase(selectedCase.id);
    if (!result.ok) {
      setMessage({ type: 'error', text: result.error || '案例展示删除失败。' });
      return;
    }
    const remaining = cases.filter((item) => item.id !== selectedCase.id);
    setCases(remaining);
    const next = remaining[0];
    setSelectedId(next?.id || '');
    setDraft(next || null);
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

  return (
    <div className="space-y-5">
      {message ? (
        <div className={`rounded-2xl border px-4 py-3 text-sm ${message.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-red-50 border-red-100 text-red-700'}`}>
          {message.text}
        </div>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[300px,1fr]">
        <aside className="rounded-[22px] border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-[16px] font-semibold text-slate-900">案例展示</h3>
              <p className="text-[12px] text-slate-500">点开客户 Logo 后展示 PPT 图片。</p>
            </div>
            <button
              type="button"
              onClick={handleCreate}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 bg-white text-[13px] text-slate-700 hover:bg-slate-50"
            >
              <Plus className="w-4 h-4" />
              新建
            </button>
          </div>

          <div className="space-y-2">
            {cases.map((item) => {
              const active = item.id === selectedId;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => void handleSelect(item.id)}
                  className={`w-full text-left rounded-2xl border px-4 py-3 transition-colors ${active ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-800'}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[14px] font-medium">{item.clientName}</p>
                      <p className={`text-[12px] ${active ? 'text-white/70' : 'text-slate-500'}`}>
                        {item.slideImages.length ? `${item.slideImages.length} 张介绍图片` : '未上传客户介绍 PPT'}
                      </p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-[11px] ${item.isPublished ? (active ? 'bg-white/15 text-white' : 'bg-emerald-50 text-emerald-700') : (active ? 'bg-white/10 text-white/80' : 'bg-slate-100 text-slate-500')}`}>
                      {item.isPublished ? '已发布' : '草稿'}
                    </span>
                  </div>
                </button>
              );
            })}
            {!cases.length ? (
              <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">
                还没有案例展示，先新建一个。
              </div>
            ) : null}
          </div>
        </aside>

        <section className="rounded-[22px] border border-slate-200 bg-white p-6 sm:p-7">
          {selectedCase ? (
            <div className="space-y-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="text-[20px] font-semibold text-slate-900">案例资料</h3>
                  <p className="text-[13px] text-slate-500">只维护客户名称、Logo 与客户介绍 PPT，保存后即可用于前台案例展示。</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setEditorOpen((prev) => !prev)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white text-[13px] text-slate-700 hover:bg-slate-50"
                  >
                    <ChevronDown className={`w-4 h-4 transition-transform ${editorOpen ? 'rotate-180' : ''}`} />
                    {editorOpen ? '收起编辑' : '展开编辑'}
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white text-[13px] font-medium hover:bg-slate-800 disabled:opacity-60"
                  >
                    <Save className="w-4 h-4" />
                    {saving ? '保存中…' : '保存到腾讯云'}
                  </button>
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white text-[13px] text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                    删除
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-[12px] font-medium text-slate-500 mb-1">当前客户</p>
                    <p className="text-[22px] font-semibold text-slate-900">{selectedCase.clientName}</p>
                  </div>
                  <label className="inline-flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[14px] text-slate-700">
                    <input
                      type="checkbox"
                      checked={selectedCase.isPublished}
                      onChange={(e) => updateDraft({ isPublished: e.target.checked })}
                      className="w-4 h-4 rounded border-slate-300 text-slate-900"
                    />
                    发布到前台案例展示
                  </label>
                </div>
              </div>

              {editorOpen ? (
                <div className="space-y-4 rounded-[24px] border border-slate-200 bg-slate-50/60 p-4 sm:p-5">
                  <label className="space-y-2 block">
                    <span className="text-[12px] font-medium text-slate-500">客户名称</span>
                    <input
                      value={selectedCase.clientName}
                      onChange={(e) => updateDraft({ clientName: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[14px]"
                    />
                  </label>
                </div>
              ) : null}

              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div>
                      <h4 className="text-[15px] font-semibold text-slate-900">客户 Logo</h4>
                      <p className="text-[12px] text-slate-500">前台案例区点击入口。</p>
                    </div>
                    <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => void handleUploadLogo(e.target.files?.[0] || null)} />
                    <button type="button" onClick={() => logoInputRef.current?.click()} className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 bg-white text-[13px] text-slate-700 hover:bg-slate-50">
                      <Upload className="w-4 h-4" />
                      {uploadingLogo ? '上传中…' : selectedCase.logoUrl ? '更换 Logo' : '上传 Logo'}
                    </button>
                  </div>
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-4 min-h-[220px] grid place-items-center">
                    {selectedCase.logoUrl ? (
                      <img src={selectedCase.logoUrl} alt={selectedCase.clientName} className="max-h-[180px] max-w-full object-contain" />
                    ) : (
                      <div className="text-center text-slate-400">
                        <FileImage className="w-8 h-8 mx-auto mb-2" />
                        暂未上传 Logo
                      </div>
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div>
                      <h4 className="text-[15px] font-semibold text-slate-900">客户介绍 PPT</h4>
                      <p className="text-[12px] text-slate-500">上传后会自动转换为前台详情图片。</p>
                    </div>
                    <input ref={pptInputRef} type="file" accept=".ppt,.pptx" className="hidden" onChange={(e) => void handleUploadPpt(e.target.files?.[0] || null)} />
                    <button type="button" onClick={() => pptInputRef.current?.click()} className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 bg-white text-[13px] text-slate-700 hover:bg-slate-50">
                      <Upload className="w-4 h-4" />
                      {uploadingPpt ? '处理中…' : selectedCase.pptFileUrl ? '更换 PPT' : '上传 PPT'}
                    </button>
                  </div>
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-4 min-h-[220px]">
                    {selectedCase.pptFileUrl ? (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-3 rounded-2xl bg-white p-3">
                          <div className="min-w-0">
                            <p className="text-[14px] font-medium text-slate-900 truncate">{selectedCase.pptFileName || '已上传 PPT'}</p>
                            <p className="text-[12px] text-slate-500">已生成 {selectedCase.slideImages.length} 张图片</p>
                          </div>
                          <a href={selectedCase.pptFileUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 text-[13px] text-slate-700 hover:bg-slate-50">
                            <Download className="w-4 h-4" />
                            下载
                          </a>
                        </div>
                        <div className="grid grid-cols-2 gap-3 max-h-[300px] overflow-auto pr-1">
                          {selectedCase.slideImages.map((slide, index) => (
                            <div key={slide} className="rounded-2xl border border-slate-200 bg-white p-2">
                              <img src={slide} alt={`${selectedCase.clientName} 第 ${index + 1} 页`} className="w-full rounded-xl object-cover" />
                              <p className="mt-2 text-[12px] text-slate-500">第 {index + 1} 页</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="h-full min-h-[180px] grid place-items-center text-center text-slate-400">
                        <div>
                          <FileText className="w-8 h-8 mx-auto mb-2" />
                          暂未上传 PPT
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 px-6 py-16 text-center text-slate-500">
              先从左侧选择一个案例，或新建案例展示。
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default AdminCaseShowcaseManager;
