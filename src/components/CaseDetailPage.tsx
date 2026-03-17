import { useEffect, useState } from 'react';
import { ArrowLeft, Download, FileImage } from 'lucide-react';
import { Header } from './Header';
import { fetchCaseShowcaseDetail, fetchCaseShowcases, type CaseShowcase } from '../lib/caseShowcaseApi';

interface CaseDetailPageProps {
  caseId: string;
  onNavigate: (page: 'home' | 'strategy' | 'article' | 'report' | 'topic' | 'case', id?: string) => void;
}

export function CaseDetailPage({ caseId, onNavigate }: CaseDetailPageProps) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [caseData, setCaseData] = useState<CaseShowcase | null>(null);
  const [relatedCases, setRelatedCases] = useState<CaseShowcase[]>([]);

  useEffect(() => {
    const checkUserStatus = () => {
      const userStr = localStorage.getItem('yiyu_current_user') ?? sessionStorage.getItem('yiyu_current_user');
      setIsLoggedIn(Boolean(userStr));
    };

    checkUserStatus();
    window.addEventListener('yiyu_user_updated', checkUserStatus);
    window.addEventListener('storage', checkUserStatus);
    return () => {
      window.removeEventListener('yiyu_user_updated', checkUserStatus);
      window.removeEventListener('storage', checkUserStatus);
    };
  }, []);

  useEffect(() => {
    let canceled = false;
    const load = async () => {
      setLoading(true);
      const [detailResult, listResult] = await Promise.all([
        fetchCaseShowcaseDetail(caseId, 'published'),
        fetchCaseShowcases('published'),
      ]);
      if (canceled) return;
      setCaseData(detailResult.ok && detailResult.data ? detailResult.data : null);
      setRelatedCases(
        listResult.ok && listResult.data
          ? listResult.data.filter((item) => item.slug !== caseId).slice(0, 3)
          : []
      );
      setLoading(false);
    };
    void load();
    return () => {
      canceled = true;
    };
  }, [caseId]);

  return (
    <div className="min-h-screen bg-background">
      <Header
        isLoggedIn={isLoggedIn}
        userType={isLoggedIn ? 'member' : 'visitor'}
        onNavigate={(page) => {
          if (page === 'strategy' || page === 'home') {
            onNavigate(page as 'home' | 'strategy');
          } else {
            onNavigate('strategy');
          }
        }}
      />

      <main className="pt-20 pb-16">
        <div className="relative bg-gradient-to-br from-slate-50 via-white to-blue-50 border-b border-border/50">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <button
              onClick={() => onNavigate('strategy')}
              className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors duration-200 group"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform duration-200" />
              <span className="text-sm font-medium">返回战略陪伴</span>
            </button>

            {loading ? (
              <div className="rounded-2xl border border-border/60 bg-white/80 px-6 py-12 text-center text-muted-foreground">
                正在加载案例展示…
              </div>
            ) : !caseData ? (
              <div className="rounded-2xl border border-border/60 bg-white/80 px-6 py-12 text-center">
                <h1 className="text-2xl font-semibold text-foreground mb-3">案例不存在</h1>
                <p className="text-muted-foreground mb-6">当前案例已下线或尚未发布。</p>
                <button
                  onClick={() => onNavigate('strategy')}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
                >
                  返回战略陪伴
                </button>
              </div>
            ) : (
              <>
                <div className="flex flex-wrap gap-2 mb-5">
                  {caseData.industry ? (
                    <span className="px-4 py-1.5 rounded-full bg-slate-100 text-slate-700 text-sm font-medium">
                      {caseData.industry}
                    </span>
                  ) : null}
                  {caseData.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                  <div className="max-w-4xl">
                    <h1 className="text-3xl sm:text-4xl md:text-[44px] font-bold mb-4 leading-tight tracking-tight text-foreground">
                      {caseData.title}
                    </h1>
                    <div className="flex items-center gap-3 mb-4">
                      <span className="text-lg font-medium text-muted-foreground">客户：</span>
                      <span className="text-xl font-bold text-primary">{caseData.clientName}</span>
                    </div>
                    {caseData.subtitle ? (
                      <p className="text-lg text-muted-foreground leading-relaxed">
                        {caseData.subtitle}
                      </p>
                    ) : null}
                  </div>

                  {caseData.logoUrl ? (
                    <div className="w-24 h-24 lg:w-28 lg:h-28 rounded-3xl border border-slate-200 bg-white flex items-center justify-center p-4 shadow-sm">
                      <img src={caseData.logoUrl} alt={caseData.clientName} className="max-w-full max-h-full object-contain" />
                    </div>
                  ) : null}
                </div>
              </>
            )}
          </div>
        </div>

        {!loading && caseData ? (
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr),320px]">
              <div className="space-y-6">
                <div className="rounded-3xl border border-border/60 bg-white p-6 sm:p-7">
                  <div className="flex items-center justify-between gap-4 mb-5">
                    <div>
                      <h2 className="text-xl font-semibold text-foreground">客户介绍</h2>
                      <p className="text-sm text-muted-foreground">以下内容来自后台上传的客户介绍 PPT 图片。</p>
                    </div>
                    {caseData.pptFileUrl ? (
                      <a
                        href={caseData.pptFileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50"
                      >
                        <Download className="w-4 h-4" />
                        下载 PPT
                      </a>
                    ) : null}
                  </div>

                  {caseData.slideImages.length ? (
                    <div className="space-y-4">
                      {caseData.slideImages.map((slide, index) => (
                        <div key={slide} className="rounded-3xl border border-slate-200 bg-slate-50/50 p-3">
                          <img
                            src={slide}
                            alt={`${caseData.clientName} 客户介绍第 ${index + 1} 页`}
                            className="w-full rounded-2xl object-cover"
                            loading="lazy"
                          />
                          <p className="mt-3 text-xs text-slate-500">第 {index + 1} 页</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50/70 px-6 py-14 text-center text-slate-500">
                      <FileImage className="w-8 h-8 mx-auto mb-3" />
                      当前案例的客户介绍 PPT 图片尚未上传。
                    </div>
                  )}
                </div>
              </div>

              <aside className="space-y-5">
                <div className="rounded-3xl border border-border/60 bg-white p-6">
                  <h3 className="font-semibold text-foreground mb-4">案例信息</h3>
                  <dl className="space-y-4">
                    <div>
                      <dt className="text-xs tracking-[0.18em] uppercase text-muted-foreground mb-1">客户</dt>
                      <dd className="text-sm text-foreground">{caseData.clientName}</dd>
                    </div>
                    <div>
                      <dt className="text-xs tracking-[0.18em] uppercase text-muted-foreground mb-1">行业</dt>
                      <dd className="text-sm text-foreground">{caseData.industry || '待补充'}</dd>
                    </div>
                    <div>
                      <dt className="text-xs tracking-[0.18em] uppercase text-muted-foreground mb-1">PPT 图片</dt>
                      <dd className="text-sm text-foreground">{caseData.slideImages.length} 张</dd>
                    </div>
                  </dl>
                </div>

                {relatedCases.length ? (
                  <div className="rounded-3xl border border-border/60 bg-white p-6">
                    <h3 className="font-semibold text-foreground mb-4">更多案例</h3>
                    <div className="space-y-3">
                      {relatedCases.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => onNavigate('case', item.slug)}
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left hover:bg-slate-50"
                        >
                          <div className="text-sm font-medium text-slate-900">{item.clientName}</div>
                          <div className="text-xs text-slate-500 mt-1">{item.industry || '案例展示'}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className="rounded-3xl border border-border/60 bg-gradient-to-br from-primary/5 to-blue-50 p-6">
                  <p className="text-sm text-muted-foreground mb-3">
                    想进一步了解战略陪伴如何展开？
                  </p>
                  <button
                    onClick={() => onNavigate('strategy')}
                    className="w-full py-3 rounded-2xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
                  >
                    返回战略陪伴
                  </button>
                </div>
              </aside>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}
