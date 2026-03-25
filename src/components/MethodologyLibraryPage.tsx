import { useEffect, useMemo, useState } from 'react';
import {
  Calendar,
  ThumbsUp,
  Share2,
  Bookmark,
  ChevronRight,
  Search,
  Filter,
  FileText,
  Grid3X3,
  List,
} from 'lucide-react';
import { Header } from './Header';
import { Footer } from './Footer';
import { CommentSection } from './CommentSection';
import { getMethodologies, type Methodology } from '../lib/dataService';
import DOMPurify from 'dompurify';
import { generateHTML } from '@tiptap/html';
import { getArticleTiptapExtensions } from '../lib/tiptapSchema';
import { useContentEngagement } from '../hooks/useContentEngagement';
import { buildShareLandingUrl } from '../lib/shareLinks';
import { normalizeRichContentHtml } from '../lib/richContent';
import { ContentResourceCard } from './ContentResourceCard';
import { PaginationControls } from './PaginationControls';
import { getYiyuPageAttrs, getYiyuSectionAttrs } from '../lib/yiyuTongSiteMap';

type Topic = '战略' | '业务设计' | '组织' | 'AI 技术';
const PAGE_SIZE = 6;

export function MethodologyLibraryPage({
  onNavigate,
  methodologyId,
}: {
  onNavigate?: (page: string, id?: string) => void;
  methodologyId?: string;
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTopic, setSelectedTopic] = useState<'all' | Topic>('all');
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [items, setItems] = useState<Methodology[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  const [selected, setSelected] = useState<Methodology | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const { engagement, toggleLike, toggleFavorite } = useContentEngagement('methodology', selected?.id || '');

  // 监听用户登录状态（用于启用评论等功能）
  useEffect(() => {
    const checkUserStatus = () => {
      const userStr = (localStorage.getItem('yiyu_current_user') ?? sessionStorage.getItem('yiyu_current_user'));
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
      const published = data.filter((m) => m.status === 'published');
      setItems(published);

      // Deep-link: prefer App state (SPA), then fallback to URL param.
      const params = new URLSearchParams(window.location.search);
      const idFromUrl = params.get('id') || '';
      const id = (methodologyId || idFromUrl).trim();
      if (id) {
        const found = published.find((m) => m.id === id) || data.find((m) => m.id === id);
        if (found) setSelected(found);
      }

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
  }, [methodologyId]);

  const yearOptions = useMemo(() => {
    const years = Array.from(
      new Set(items.map((m) => String((m as any).publishDate || (m as any).updatedAt || '').slice(0, 4)).filter(Boolean))
    );
    years.sort((a, b) => (a < b ? 1 : -1));
    return ['all', ...years];
  }, [items]);

  const filtered = useMemo(() => {
    return items.filter((m) => {
      const matchesSearch =
        !searchQuery ||
        m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (m.excerpt || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (m.topics || []).some((t) => String(t).toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesTopic = selectedTopic === 'all' || (m.topics || []).includes(selectedTopic);
      const year = String((m as any).publishDate || (m as any).updatedAt || '').slice(0, 4);
      const matchesYear = selectedYear === 'all' || (year && year === selectedYear);
      return matchesSearch && matchesTopic && matchesYear;
    });
  }, [items, searchQuery, selectedTopic, selectedYear]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedTopic, selectedYear]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paginated = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, safePage]);

  // Methodology reader view (match ArticleDetailPage grain)
  if (selected) {
    const anySelected = selected as any;
    let html = '';

    if (String(anySelected.contentHtml || '').trim()) {
      html = DOMPurify.sanitize(normalizeRichContentHtml(String(anySelected.contentHtml)), { USE_PROFILES: { html: true } });
    } else if (anySelected.contentJson) {
      try {
        const generated = generateHTML(anySelected.contentJson, getArticleTiptapExtensions() as any);
        html = DOMPurify.sanitize(normalizeRichContentHtml(generated), { USE_PROFILES: { html: true } });
      } catch {
        html = '';
      }
    } else if (String(selected.content || '').trim()) {
      html = DOMPurify.sanitize(normalizeRichContentHtml(String(selected.content)), { USE_PROFILES: { html: true } });
    }

    return (
    <div {...getYiyuPageAttrs('methodology')} className="min-h-screen bg-background flex flex-col">
        <Header onNavigate={onNavigate} />

        <section
          {...getYiyuSectionAttrs('methodology', 'methodology-detail-hero')}
          className="relative pt-28 pb-14 px-6 overflow-hidden"
        >
          <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-primary/[0.035] via-background to-background" />
          <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-background/55 via-background/85 to-background" />

          <div className="relative max-w-4xl mx-auto">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 mb-7 text-[13px] text-muted-foreground/60">
              <button
                onClick={() => setSelected(null)}
                className="flex items-center gap-1 hover:text-foreground transition-colors duration-200"
              >
                <span>工具/方法论</span>
              </button>
              <ChevronRight className="w-3.5 h-3.5" />
              <span className="text-foreground">详情</span>
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
                <div className="absolute inset-0 bg-gradient-to-t from-black/18 via-black/6 to-transparent" />
              </div>

              <div className="px-6 sm:px-8 py-7 sm:py-8 bg-white/70 backdrop-blur-xl border-t border-border/30">
                <h1 className="text-[28px] sm:text-[38px] font-semibold leading-[1.18] tracking-tight text-foreground">
                  {selected.title}
                </h1>

                <p className="mt-4 text-[15px] sm:text-[16px] text-muted-foreground/80 leading-[1.75] max-w-3xl">
                  {selected.excerpt}
                </p>
              </div>

              {/* Meta row (match Article cover) */}
              <div className="px-6 sm:px-8 py-5 sm:py-6 bg-white/45 backdrop-blur-xl border-t border-border/30">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] text-muted-foreground/70">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span>{selected.publishDate}</span>
                    </div>
                  </div>

                  {selected.topics?.length ? (
                    <div className="flex flex-wrap justify-end gap-2">
                      {selected.topics.map((topic: string, index: number) => (
                        <span
                          key={index}
                          className="px-3 py-1.5 rounded-full bg-white/60 text-muted-foreground/80 text-[12px] border border-border/40 hover:bg-white/80 transition-colors"
                        >
                          {topic}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Body */}
        <section
          {...getYiyuSectionAttrs('methodology', 'methodology-detail-body')}
          className="px-6 pb-8"
        >
          <div className="max-w-4xl mx-auto">
            <article className="prose prose-lg max-w-none prose-headings:font-semibold prose-headings:tracking-tight prose-p:text-muted-foreground/80 prose-p:leading-relaxed prose-a:text-primary hover:prose-a:text-primary/80">
              {html ? (
                <div
                  className="text-[17px] leading-[1.8] font-light [&_ol]:list-decimal [&_ul]:list-disc [&_ol]:list-inside [&_ul]:list-inside [&_ol]:pl-2 [&_ul]:pl-2 [&_ol>li]:list-item [&_ul>li]:list-item [&_li]:my-2 [&_figure]:my-8 [&_figure]:text-center [&_figure_img]:mx-auto [&_figure_img]:block [&_img]:mx-auto [&_img]:block"
                  dangerouslySetInnerHTML={{ __html: html }}
                />
              ) : (
                <div className="text-[17px] leading-[1.8] font-light">
                  {selected.content || selected.excerpt}
                </div>
              )}
            </article>

            {/* Action Bar (match article) */}
              <div className="mt-12 pt-8 border-t border-border/40">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={async () => {
                        const result = await toggleLike();
                        if (!result.ok) {
                          alert(result.error || '请先登录后再点赞');
                        }
                      }}
                      className="flex items-center gap-2.5 px-5 py-2.5 rounded-2xl bg-muted/30 hover:bg-muted/50 transition-all duration-300 hover:scale-[1.02] group"
                    >
                      <ThumbsUp className="w-5 h-5 group-hover:scale-110 transition-transform duration-200" />
                      <span className="font-medium">{engagement.likesCount || selected.likes || 0}</span>
                    </button>
                    <button
                      onClick={async () => {
                        const result = await toggleFavorite();
                        if (!result.ok) {
                          alert(result.error || '请先登录后再收藏');
                        }
                      }}
                      className={`flex items-center gap-2.5 px-5 py-2.5 rounded-2xl transition-all duration-300 hover:scale-[1.02] ${
                        engagement.favorited
                          ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
                          : 'bg-muted/30 hover:bg-muted/50'
                      }`}
                    >
                      <Bookmark className={`w-5 h-5 ${engagement.favorited ? 'fill-current' : ''}`} />
                      <span className="font-medium">
                        {engagement.favorited ? `已收藏 ${engagement.favoritesCount}` : `收藏 ${engagement.favoritesCount}`}
                      </span>
                    </button>
                    <button
                      onClick={async () => {
                        const shareUrl = buildShareLandingUrl('methodology', selected.id);
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
            <div
              {...getYiyuSectionAttrs('methodology', 'methodology-detail-comments')}
              className="mt-12"
            >
              <CommentSection
                contentId={selected.id}
                contentType="methodology"
                contentTitle={selected.title}
                isLoggedIn={isLoggedIn}
                userName={isLoggedIn ? '张三' : '访客'}
              />
            </div>
          </div>
        </section>

        <Footer onNavigate={(p) => onNavigate?.(p)} />
      </div>
    );
  }

  return (
    <div {...getYiyuPageAttrs('methodology-library')} className="min-h-screen bg-background">
      <Header onNavigate={onNavigate} />

      {/* Hero */}
      <section
        {...getYiyuSectionAttrs('methodology-library', 'methodology-library-hero')}
        className="relative pt-28 sm:pt-32 pb-10 sm:pb-12 px-4 sm:px-6 lg:px-8 overflow-hidden"
      >
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
      <div
        {...getYiyuSectionAttrs('methodology-library', 'methodology-library-filters')}
        data-yiyu-results-total={String(filtered.length)}
        data-yiyu-active-topic={selectedTopic}
        data-yiyu-active-year={selectedYear}
        data-yiyu-search-query={searchQuery}
        data-yiyu-current-page={String(safePage)}
        data-yiyu-total-pages={String(totalPages)}
        data-yiyu-sort="latest"
        className="bg-white/80 backdrop-blur-sm border-b border-border/40 sticky top-0 z-10"
      >
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-64 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
              <input
                data-yiyu-search="content"
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
                data-yiyu-filter-topic="content"
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

              <select
                data-yiyu-filter-year="content"
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="px-4 py-2.5 bg-muted/30 border border-border/40 rounded-full text-[14px] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all cursor-pointer"
              >
                {yearOptions.map((y) => (
                  <option key={y} value={y}>
                    {y === 'all' ? '全部年份' : y}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1 p-1 bg-muted/30 rounded-full">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-full transition-all duration-300 ${viewMode === 'grid' ? 'bg-white shadow-sm text-primary' : 'text-muted-foreground/60 hover:text-foreground'}`}
              >
                <Grid3X3 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-full transition-all duration-300 ${viewMode === 'list' ? 'bg-white shadow-sm text-primary' : 'text-muted-foreground/60 hover:text-foreground'}`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div
        {...getYiyuSectionAttrs('methodology-library', 'methodology-library-results')}
        data-yiyu-results-total={String(filtered.length)}
        data-yiyu-current-page={String(safePage)}
        data-yiyu-total-pages={String(totalPages)}
        data-yiyu-sort="latest"
        className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-10"
      >
        {isLoading ? (
          <div className="py-20 text-center text-muted-foreground/70">加载中...</div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center text-muted-foreground/70">暂无内容</div>
        ) : (
          <>
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {paginated.map((m) => (
                  <ContentResourceCard
                    key={m.id}
                    contentId={m.id}
                    contentType="methodology"
                    cover={
                      m.coverImage ? (
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
                      )
                    }
                    tags={m.topics || []}
                    title={m.title}
                    excerpt={m.excerpt}
                    views={m.views}
                    likes={m.likes}
                    favorites={m.favoritesCount}
                    publishDate={m.publishDate}
                    onClick={() => setSelected(m)}
                  />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {paginated.map((m) => (
                  <ContentResourceCard
                    key={m.id}
                    contentId={m.id}
                    contentType="methodology"
                    variant="list"
                    cover={
                      m.coverImage ? (
                        <img
                          src={m.coverImage}
                          alt={m.title}
                          className="absolute inset-0 w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <FileText className="w-8 h-8 text-primary/20" />
                        </div>
                      )
                    }
                    tags={m.topics || []}
                    title={m.title}
                    excerpt={m.excerpt}
                    views={m.views}
                    likes={m.likes}
                    favorites={m.favoritesCount}
                    publishDate={m.publishDate}
                    onClick={() => setSelected(m)}
                  />
                ))}
              </div>
            )}
          </>
        )}

        <div className="mt-8">
          <PaginationControls
            currentPage={safePage}
            totalItems={filtered.length}
            pageSize={PAGE_SIZE}
            onPageChange={setCurrentPage}
          />
        </div>
      </div>

      <Footer onNavigate={(p) => onNavigate?.(p)} />
    </div>
  );
}

export default MethodologyLibraryPage;
