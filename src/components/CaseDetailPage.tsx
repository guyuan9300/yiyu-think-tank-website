import { useEffect, useState } from 'react';
import { ArrowLeft, FileImage } from 'lucide-react';
import { Header } from './Header';
import { fetchCaseShowcaseDetail, fetchCaseShowcases, type CaseShowcase } from '../lib/caseShowcaseApi';

interface CaseDetailPageProps {
  caseId: string;
  onNavigate: (page: 'home' | 'strategy' | 'article' | 'report' | 'topic' | 'case' | 'admin' | 'user-center', id?: string) => void;
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
        onNavigate={(page) => onNavigate(page as any)}
      />

      <main className="pt-24 pb-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <button
            onClick={() => onNavigate('strategy')}
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 transition-colors duration-200 group"
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
            <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr),280px]">
              <div className="space-y-6">
                <div className="flex items-center gap-5 rounded-3xl border border-border/60 bg-white p-6 sm:p-7">
                  {caseData.logoUrl ? (
                    <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-3xl bg-slate-50 p-3 sm:h-24 sm:w-24">
                      <img src={caseData.logoUrl} alt={caseData.clientName} className="max-h-full max-w-full object-contain" />
                    </div>
                  ) : null}
                  <h1 className="text-3xl sm:text-4xl md:text-[44px] font-bold leading-tight tracking-tight text-foreground">
                    {caseData.clientName}
                  </h1>
                </div>

                {caseData.slideImages.length ? (
                  <div className="space-y-4">
                    {caseData.slideImages.map((slide, index) => (
                      <div key={slide} className="rounded-3xl border border-slate-200 bg-white p-3">
                        <img
                          src={slide}
                          alt={`${caseData.clientName} 客户介绍第 ${index + 1} 页`}
                          className="w-full rounded-2xl object-cover"
                          loading="lazy"
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50/70 px-6 py-14 text-center text-slate-500">
                    <FileImage className="w-8 h-8 mx-auto mb-3" />
                    暂无客户介绍图片
                  </div>
                )}
              </div>

              <aside>
                {relatedCases.length ? (
                  <div className="rounded-3xl border border-border/60 bg-white p-6">
                    <h3 className="font-semibold text-foreground mb-4">更多案例</h3>
                    <div className="space-y-3">
                      {relatedCases.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => onNavigate('case', item.slug)}
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-sm font-medium text-slate-900 hover:bg-slate-50"
                        >
                          {item.clientName}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
              </aside>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
