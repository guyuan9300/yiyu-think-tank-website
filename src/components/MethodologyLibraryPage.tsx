import { useEffect, useMemo, useState } from 'react';
import {
  Calendar,
  Eye,
  ThumbsUp,
  Share2,
  Bookmark,
  ChevronRight,
  Search,
  Filter,
  FileText,
} from 'lucide-react';
import { Header } from './Header';
import { Footer } from './Footer';
import { CommentSection } from './CommentSection';
import { getMethodologies, type Methodology } from '../lib/dataService';
import DOMPurify from 'dompurify';

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
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);

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

  // Methodology reader view (match ArticleDetailPage grain)
  if (selected) {
    const html = DOMPurify.sanitize(String(selected.content || selected.excerpt || ''));

    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header onNavigate={onNavigate} />

        <section className="relative pt-28 pb-14 px-6 overflow-hidden">
          <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-primary/[0.035] via-background to-background" />
          <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-background/55 via-background/85 to-background" />

          <div className="relative max-w-5xl mx-auto">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 mb-7 text-[13px] text-muted-foreground/60">
              <button
                onClick={() => setSelected(null)}
                className="flex items-center gap-1 hover:text-foreground transition-colors duration-200"
              >
                <span>工具/方法论</span>
              </button>
              <ChevronRight className="w-3.5 h-3.5" />
              <span className="text-foreground">{selected.topics?.[0] || '方法论'}</span>
            </div>

            {/* Cover */}
            <div className="relative rounded-[28px] overflow-hidden border border-border/40 bg-white/40 backdrop-blur-xl shadow-2xl shadow-black/[0.05]">
              <div className="relative aspect-[21/9] sm:aspect-[24/9] bg-gradient-to-br from-primary/[0.06] to-accent/[0.06]">
                {selected.coverImage ? (
                  <img
                    src={selected.coverImage}
                    alt={selected.title}
                    className="absolute inset-0 w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <FileText className="w-16 h-16 text-primary/15" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/10 to-transparent" />

                <div className="absolute inset-x-0 bottom-0 p-6 sm:p-10">
                  <div className="flex items-center gap-2 mb-4 flex-wrap">
                    {(selected.topics || []).slice(0, 3).map((t, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1 rounded-full bg-white/75 text-foreground text-[12px] font-medium border border-white/50"
                      >
                        {t}
                      </span>
                    ))}
                  </div>

                  <h1 className="text-white text-[28px] sm:text-[38px] font-semibold leading-[1.2] tracking-tight">
                    {selected.title}
                  </h1>

                  <p className="mt-3 text-white/85 text-[14px] max-w-3xl line-clamp-2">
                    {selected.excerpt}
                  </p>

                  <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[12px] text-white/75">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span>{selected.publishDate}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Eye className="w-4 h-4" />
                        <span>{selected.views.toLocaleString?.() ? selected.views.toLocaleString() : selected.views}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setIsBookmarked(!isBookmarked)}
                        className={`px-3 py-2 rounded-full text-[13px] font-medium border transition ${
                          isBookmarked
                            ? 'bg-amber-500/10 text-amber-100 border-amber-200/40'
                            : 'bg-white/15 text-white border-white/30 hover:bg-white/20'
                        }`}
                        title="收藏"
                      >
                        <span className="inline-flex items-center gap-2">
                          <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-current' : ''}`} />
                          收藏
                        </span>
                      </button>

                      <button
                        onClick={async () => {
                          const base = window.location.origin + import.meta.env.BASE_URL.replace(/\/$/, '');
                          const shareUrl = `${base}/?page=methodology-library`;
                          try {
                            await navigator.clipboard.writeText(shareUrl);
                            alert('已复制分享链接');
                          } catch {
                            window.prompt('复制下面链接分享到微信/朋友圈：', shareUrl);
                          }
                        }}
                        className="px-3 py-2 rounded-full bg-white/15 text-white border border-white/30 hover:bg-white/20 transition text-[13px] font-medium"
                        title="分享到朋友圈"
                      >
                        <span className="inline-flex items-center gap-2">
                          <Share2 className="w-4 h-4" />
                          分享
                        </span>
                      </button>

                      <button
                        onClick={() => setSelected(null)}
                        className="px-3 py-2 rounded-full bg-white/15 text-white border border-white/30 hover:bg-white/20 transition text-[13px] font-medium"
                      >
                        ← 返回列表
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Body */}
        <section className="px-6 pb-8">
          <div className="max-w-5xl mx-auto">
            <div className="bg-white/70 backdrop-blur-sm border border-border/40 rounded-[24px] p-6 sm:p-10">
              {html.includes('<') ? (
                <div
                  className="prose prose-neutral max-w-none"
                  dangerouslySetInnerHTML={{ __html: html }}
                />
              ) : (
                <div className="text-[15px] sm:text-[16px] leading-[1.9] text-foreground/90 whitespace-pre-wrap">
                  {selected.content || selected.excerpt}
                </div>
              )}

              {/* Action Bar (match article) */}
              <div className="mt-12 pt-8 border-t border-border/40">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => {
                        // demo: purely UI (likes stored in item for now)
                        alert('已点赞');
                      }}
                      className="flex items-center gap-2.5 px-5 py-2.5 rounded-2xl bg-muted/30 hover:bg-muted/50 transition-all duration-300 hover:scale-[1.02] group"
                    >
                      <ThumbsUp className="w-5 h-5 group-hover:scale-110 transition-transform duration-200" />
                      <span className="font-medium">{selected.likes}</span>
                    </button>
                    <button
                      onClick={() => setIsBookmarked(!isBookmarked)}
                      className={`flex items-center gap-2.5 px-5 py-2.5 rounded-2xl transition-all duration-300 hover:scale-[1.02] ${
                        isBookmarked
                          ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
                          : 'bg-muted/30 hover:bg-muted/50'
                      }`}
                    >
                      <Bookmark className={`w-5 h-5 ${isBookmarked ? 'fill-current' : ''}`} />
                      <span className="font-medium">{isBookmarked ? '已收藏' : '收藏'}</span>
                    </button>
                    <button
                      onClick={async () => {
                        const base = window.location.origin + import.meta.env.BASE_URL.replace(/\/$/, '');
                        const shareUrl = `${base}/?page=methodology-library`;
                        try {
                          await navigator.clipboard.writeText(shareUrl);
                          alert('已复制分享链接，可直接粘贴到微信/朋友圈');
                        } catch {
                          window.prompt('复制下面链接分享到微信/朋友圈：', shareUrl);
                        }
                      }}
                      className="flex items-center gap-2.5 px-5 py-2.5 rounded-2xl bg-muted/30 hover:bg-muted/50 transition-all duration-300 hover:scale-[1.02]"
                    >
                      <Share2 className="w-5 h-5" />
                      <span className="font-medium">分享到朋友圈</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Comment Section */}
              <div className="mt-12">
                <CommentSection
                  contentId={selected.id}
                  contentType="methodology"
                  contentTitle={selected.title}
                  isLoggedIn={isLoggedIn}
                  userName={isLoggedIn ? '张三' : '访客'}
                />
              </div>
            </div>
          </div>
        </section>

        <Footer onNavigate={(p) => onNavigate?.(p)} />
      </div>
    );
  }

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
              <article
                key={m.id}
                onClick={() => setSelected(m)}
                className="group cursor-pointer"
              >
                <div className="relative bg-white/60 backdrop-blur-sm border border-border/40 rounded-3xl overflow-hidden transition-all duration-500 hover:bg-white/80 hover:border-border/60 hover:shadow-2xl hover:shadow-black/[0.04] hover:-translate-y-1">
                  {/* 封面区域 */}
                  <div className="relative aspect-[16/10] bg-gradient-to-br from-primary/[0.03] to-accent/[0.03] overflow-hidden">
                    {m.coverImage ? (
                      <img
                        src={m.coverImage}
                        alt={m.title}
                        className="absolute inset-0 w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <FileText className="w-16 h-16 text-primary/10" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                      <span className="text-white text-[14px] font-medium">查看详情</span>
                    </div>
                  </div>

                  {/* 内容区域 */}
                  <div className="p-6">
                    <div className="flex items-center gap-2 mb-3 flex-wrap">
                      {(m.topics || []).slice(0, 2).map((t, idx) => (
                        <span
                          key={idx}
                          className="px-3 py-1 rounded-full bg-primary/8 text-primary text-[11px] font-medium"
                        >
                          {t}
                        </span>
                      ))}
                      <span className="text-[12px] text-muted-foreground/50">{m.publishDate}</span>
                    </div>

                    <h3 className="text-[18px] font-semibold mb-2 line-clamp-2 group-hover:text-primary transition-colors leading-[1.4]">
                      {m.title}
                    </h3>

                    <p className="text-[14px] text-muted-foreground/70 line-clamp-2 leading-[1.6] mb-4">
                      {m.excerpt}
                    </p>

                    <div className="flex flex-wrap gap-1.5">
                      {(m.topics || []).slice(0, 3).map((tag: string, index: number) => (
                        <span
                          key={index}
                          className="px-2.5 py-1 rounded-full bg-muted/40 text-muted-foreground/60 text-[11px]"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      <Footer onNavigate={(p) => onNavigate?.(p)} />
    </div>
  );
}

export default MethodologyLibraryPage;
