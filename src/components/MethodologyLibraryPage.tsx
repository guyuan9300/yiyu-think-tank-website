import { useEffect, useMemo, useState } from 'react';
import { Header } from './Header';
import { Footer } from './Footer';
import { Search, Filter, Wrench, ChevronRight, X } from 'lucide-react';
import { getMethodologies, type Methodology } from '../lib/dataService';

type Topic = '战略' | '业务设计' | '组织' | 'AI 技术';

export function MethodologyLibraryPage({
  onNavigate,
}: {
  onNavigate?: (page: string) => void;
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTopic, setSelectedTopic] = useState<'all' | Topic>('all');
  const [items, setItems] = useState<Methodology[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [selected, setSelected] = useState<Methodology | null>(null);

  const topicOptions: Array<{ id: 'all' | Topic; label: string }> = [
    { id: 'all', label: '全部' },
    { id: '战略', label: '战略' },
    { id: '业务设计', label: '业务设计' },
    { id: '组织', label: '组织' },
    { id: 'AI 技术', label: 'AI 技术' },
  ];

  useEffect(() => {
    const load = () => {
      const data = getMethodologies();
      setItems(data.filter((m) => m.status === 'published'));
      setIsLoading(false);
    };

    load();
    const onChange = () => load();
    window.addEventListener('yiyu_data_change', onChange);
    window.addEventListener('storage', onChange);
    return () => {
      window.removeEventListener('yiyu_data_change', onChange);
      window.removeEventListener('storage', onChange);
    };
  }, []);

  const filtered = useMemo(() => {
    return items.filter((m) => {
      const matchesSearch =
        !searchQuery ||
        m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (m.excerpt || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (m.topics || []).some((t) => String(t).toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesTopic = selectedTopic === 'all' || (m.topics || []).includes(selectedTopic);
      return matchesSearch && matchesTopic;
    });
  }, [items, searchQuery, selectedTopic]);

  return (
    <div className="min-h-screen bg-background">
      <Header onNavigate={onNavigate} />

      {/* Hero */}
      <section className="relative pt-28 sm:pt-32 pb-10 sm:pb-12 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.02] to-transparent" />
        <div className="relative max-w-[1200px] mx-auto">
          <div className="flex items-center gap-2 mb-6 text-[13px] text-muted-foreground/60">
            <button
              onClick={() => onNavigate?.('learning')}
              className="hover:text-foreground transition-colors"
            >
              学习中心
            </button>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-foreground">工具/方法论</span>
          </div>

          <div className="mb-4">
            <h1 className="text-[48px] sm:text-[56px] lg:text-[64px] font-semibold leading-[1.05] tracking-[-0.025em] mb-3">
              工具/方法论
            </h1>
            <p className="text-[13px] text-muted-foreground/50 tracking-[0.15em] uppercase font-medium">
              Tools & Methodologies
            </p>
          </div>

          <p className="text-[21px] text-muted-foreground/70 leading-[1.5] max-w-3xl font-light">
            益语可复用的方法论框架与工具清单
          </p>
        </div>
      </section>

      {/* Filter bar */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-border/40 sticky top-0 z-10">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-64 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
              <input
                type="text"
                placeholder="搜索方法论、标签..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-muted/30 border border-border/40 rounded-full text-[14px] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground/50" />
              <select
                value={selectedTopic}
                onChange={(e) => setSelectedTopic(e.target.value as any)}
                className="px-4 py-2.5 bg-muted/30 border border-border/40 rounded-full text-[14px] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all cursor-pointer"
              >
                {topicOptions.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.id === 'all' ? '全部标签' : opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {isLoading ? (
          <div className="py-20 text-center text-muted-foreground/70">加载中...</div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center text-muted-foreground/70">暂无内容</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((m) => (
              <button
                key={m.id}
                onClick={() => setSelected(m)}
                className="text-left bg-white/80 backdrop-blur-sm rounded-[20px] border border-border/40 p-6 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5 transition-all duration-300"
              >
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center">
                    <Wrench className="w-4 h-4 text-primary" />
                  </div>
                  {(m.topics || []).slice(0, 2).map((t, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded-full bg-primary/8 text-primary text-[11px] font-medium border border-primary/15"
                    >
                      {t}
                    </span>
                  ))}
                </div>
                <h3 className="text-[16px] font-semibold mb-2 line-clamp-2">{m.title}</h3>
                <p className="text-[13px] text-muted-foreground/70 line-clamp-3 leading-relaxed">{m.excerpt}</p>
                <div className="mt-4 pt-4 border-t border-border/40 text-[12px] text-muted-foreground/50">
                  {m.publishDate}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Detail modal (simple) */}
      {selected && (
        <div className="fixed inset-0 bg-black/40 z-[70] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-border/40 flex items-center justify-between sticky top-0 bg-white z-10">
              <div>
                <div className="text-[12px] text-muted-foreground/60">工具/方法论</div>
                <h3 className="text-[18px] font-semibold">{selected.title}</h3>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="p-2 rounded-xl hover:bg-muted/30 transition-colors"
                aria-label="关闭"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                {(selected.topics || []).map((t, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 rounded-full bg-primary/8 text-primary text-[11px] font-medium border border-primary/15"
                  >
                    {t}
                  </span>
                ))}
              </div>
              <p className="text-[14px] text-muted-foreground/80 leading-relaxed whitespace-pre-wrap">{selected.content || selected.excerpt}</p>
            </div>
          </div>
        </div>
      )}

      <Footer onNavigate={(p) => onNavigate?.(p)} />
    </div>
  );
}

export default MethodologyLibraryPage;
