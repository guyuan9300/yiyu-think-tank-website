import { useState, useEffect, useMemo, useRef } from 'react';
import { Header } from './Header';
import { Footer } from './Footer';
import {
  FileText,
  Search,
  Filter,
  Grid3X3,
  List,
  ChevronRight,
} from 'lucide-react';
import { getInsights, type InsightArticle } from '../lib/dataService';
import { ContentResourceCard } from './ContentResourceCard';
import { PaginationControls } from './PaginationControls';
import { getYiyuPageAttrs, getYiyuSectionAttrs } from '../lib/yiyuTongSiteMap';

const PAGE_SIZE = 6;

export function ArticleCenterPage({
  onNavigate,
  onNavigateToDetail,
}: {
  onNavigate?: (page: string) => void;
  onNavigateToDetail?: (id: string) => void;
}) {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTopic, setSelectedTopic] = useState<'all' | '战略' | '业务设计' | '组织' | 'AI 技术'>('all');
  const [articles, setArticles] = useState<InsightArticle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  // AI 封面 manifest (从 vite plugin /api/admin-ai/manifest 拉, 命中的文章用 AI 封面替换原 coverImage)
  const aiManifestRef = useRef<Record<string, { cover?: any; illustrations?: any[] }>>({});

  // 拉 AI manifest (异步, 命中即覆盖)
  useEffect(() => {
    fetch('/api/admin-ai/manifest', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : {}))
      .then((m) => { aiManifestRef.current = m || {}; })
      .catch(() => {});
  }, []);

  // helper: 拿 AI 封面 URL (有就用 AI, 没有就用原 coverImage)
  const resolveCover = (article: InsightArticle): string | undefined => {
    const safe = article.id.replace(/[^a-zA-Z0-9_-]/g, '_');
    if (aiManifestRef.current[article.id]?.cover) {
      return `/ai-generated/articles/${safe}/cover.jpg`;
    }
    return article.coverImage;
  };

  const topicOptions: Array<{ id: 'all' | '战略' | '业务设计' | '组织' | 'AI 技术'; label: string }> = [
    { id: 'all', label: '全部' },
    { id: '战略', label: '战略' },
    { id: '业务设计', label: '业务设计' },
    { id: '组织', label: '组织' },
    { id: 'AI 技术', label: 'AI 技术' },
  ];

  // 加载数据
  useEffect(() => {
    const loadData = () => {
      const articlesData = getInsights();

      setArticles(articlesData.filter((a: InsightArticle) => a.status === 'published'));
      setIsLoading(false);
    };

    loadData();

    const handleStorageChange = () => {
      loadData();
    };

    const pollInterval = setInterval(() => {
      const newArticles = getInsights();
      const publishedArticles = newArticles.filter((a: InsightArticle) => a.status === 'published');

      if (publishedArticles.length !== articles.length ||
          (publishedArticles.length > 0 && publishedArticles[0].id !== (articles[0]?.id))) {
        loadData();
      }
    }, 1000);

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('yiyu_data_change', handleStorageChange);

    return () => {
      clearInterval(pollInterval);
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('yiyu_data_change', handleStorageChange);
    };
  }, []);

  // 筛选文章
  const filteredArticles = useMemo(() => {
    return articles.filter((article: InsightArticle) => {
      const matchesSearch = !searchQuery ||
        article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        article.excerpt.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (article.topics || []).some((t: string) => t.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesTopic = selectedTopic === 'all' || (article.topics || []).includes(selectedTopic);

      return matchesSearch && matchesTopic;
    });
  }, [articles, searchQuery, selectedTopic]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedTopic]);

  const totalPages = Math.max(1, Math.ceil(filteredArticles.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedArticles = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filteredArticles.slice(start, start + PAGE_SIZE);
  }, [filteredArticles, safePage]);

  // 刷新数据
  const handleRefresh = () => {
    setIsLoading(true);
    const data = getInsights();
    setArticles(data.filter((a: InsightArticle) => a.status === 'published'));
    setIsLoading(false);
  };

  // 加载状态
  if (isLoading) {
    return (
      <div className="min-h-screen bg-os-canvas">
        <Header onNavigate={onNavigate} />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="w-10 h-10 border-2 border-os-navy/20 border-t-os-navy rounded-full animate-spin mx-auto mb-4" />
            <p className="text-os-muted">加载中...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div {...getYiyuPageAttrs('article-center')} className="min-h-screen bg-os-canvas flex flex-col">
      <Header onNavigate={onNavigate} />

      {/* Hero 区域 — 已升级到 open-source-home 设计语言: 衬线大标题 + eyebrow + os 色板 */}
      <section
        {...getYiyuSectionAttrs('article-center', 'article-center-hero')}
        className="relative pt-24 sm:pt-32 pb-12 px-4 sm:px-6 overflow-hidden bg-os-canvas"
      >
        {/* 极淡光晕,纸面质感 */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[-20%] left-[10%] w-[40%] h-[60%] rounded-full bg-os-blue/[0.04] blur-[120px]" />
          <div className="absolute top-[-10%] right-[8%] w-[30%] h-[50%] rounded-full bg-os-spark/[0.04] blur-[120px]" />
        </div>

        <div className="relative max-w-[1200px] mx-auto">
          {/* eyebrow */}
          <div className="flex items-center gap-2.5 mb-6">
            <span className="h-px w-7 bg-os-blue/70" />
            <span className="text-[12px] font-semibold tracking-[0.18em] text-os-blue">益语智库 · 文章</span>
          </div>

          {/* 衬线大标题 */}
          <h1 className="font-serif-display text-[40px] sm:text-[56px] lg:text-[64px] font-semibold leading-[1.12] tracking-tight text-os-ink mb-5">
            观点、洞察、
            <br className="hidden sm:block" />
            <span className="text-ink-accent">深度思考</span>
          </h1>

          {/* 副标题 */}
          <p className="text-[16px] sm:text-[18px] text-os-muted leading-[1.85] max-w-3xl">
            益语智库分享对战略、业务设计、组织和 AI 技术的持续思考。一部分来自我们的咨询实践，一部分来自我们对前沿的观察。
          </p>
        </div>
      </section>

      {/* 筛选栏 - 固定定位 (升级 os 色板) */}
      <div
        {...getYiyuSectionAttrs('article-center', 'article-center-filters')}
        data-yiyu-results-total={String(filteredArticles.length)}
        data-yiyu-active-topic={selectedTopic}
        data-yiyu-search-query={searchQuery}
        data-yiyu-current-page={String(safePage)}
        data-yiyu-total-pages={String(totalPages)}
        data-yiyu-sort="latest"
        className="bg-os-paper/85 backdrop-blur-md border-b border-os-line sticky top-0 z-10"
      >
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex flex-wrap items-center gap-4">
            {/* 搜索框 */}
            <div className="flex-1 min-w-64 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
              <input
                data-yiyu-search="content"
                type="text"
                placeholder="搜索文章、标签..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-muted/30 border border-border/40 rounded-full text-[14px] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all"
              />
            </div>

            {/* topics 筛选 */}
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
            </div>

            {/* 视图切换 */}
            <div className="flex items-center gap-1 p-1 bg-muted/30 rounded-full">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-full transition-all duration-300 ${viewMode === 'grid' ? 'bg-white shadow-sm text-primary' : 'text-muted-foreground/60 hover:text-foreground'}`}
              >
                <Grid3X3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-full transition-all duration-300 ${viewMode === 'list' ? 'bg-white shadow-sm text-primary' : 'text-muted-foreground/60 hover:text-foreground'}`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 内容区域 */}
      <div
        {...getYiyuSectionAttrs('article-center', 'article-center-results')}
        data-yiyu-results-total={String(filteredArticles.length)}
        data-yiyu-current-page={String(safePage)}
        data-yiyu-total-pages={String(totalPages)}
        data-yiyu-sort="latest"
        className="max-w-4xl mx-auto px-6 py-8"
      >
        {/* 结果统计 */}
        <div className="flex items-center justify-between mb-8">
          <p className="text-[14px] text-muted-foreground/70">
            共找到 <span className="text-foreground font-medium">{filteredArticles.length}</span> 篇文章
          </p>
          {/* 刷新按钮已移除 */}
        </div>

        {/* 空状态 */}
        {filteredArticles.length === 0 ? (
          <div className="bg-white/60 backdrop-blur-sm rounded-[20px] border border-border/40 p-16 text-center">
            <FileText className="w-14 h-14 mx-auto mb-4 text-muted-foreground/30" />
            <p className="text-muted-foreground/70 text-[15px]">暂无文章</p>
          </div>
        ) : viewMode === 'grid' ? (
          /* 网格视图 */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginatedArticles.map((article: InsightArticle) => (
              <ContentResourceCard
                key={article.id}
                contentId={article.id}
                contentType="insight"
                cover={(() => {
                  const cover = resolveCover(article);
                  return cover ? (
                    <img
                      src={cover}
                      alt={article.title}
                      className="absolute inset-0 w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <FileText className="w-16 h-16 text-primary/10" />
                    </div>
                  );
                })()}
                tags={article.topics || []}
                title={article.title}
                excerpt={article.excerpt}
                views={article.views}
                likes={article.likes}
                favorites={article.favoritesCount}
                publishDate={article.publishDate}
                onClick={() => onNavigateToDetail?.(article.id)}
              />
            ))}
          </div>
        ) : (
          /* 列表视图 */
          <div className="bg-white/60 backdrop-blur-sm rounded-[20px] border border-border/40 overflow-hidden">
            <div className="space-y-3 p-3">
              {paginatedArticles.map((article: InsightArticle) => (
                <ContentResourceCard
                  key={article.id}
                  contentId={article.id}
                  contentType="insight"
                  variant="list"
                  cover={(() => {
                    const cover = resolveCover(article);
                    return cover ? (
                      <img
                        src={cover}
                        alt={article.title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <FileText className="w-8 h-8 text-primary/20" />
                      </div>
                    );
                  })()}
                  tags={article.topics || []}
                  title={article.title}
                  excerpt={article.excerpt}
                  views={article.views}
                  likes={article.likes}
                  favorites={article.favoritesCount}
                  publishDate={article.publishDate}
                  onClick={() => onNavigateToDetail?.(article.id)}
                />
              ))}
            </div>
          </div>
        )}

        <div className="mt-8">
          <PaginationControls
            currentPage={safePage}
            totalItems={filteredArticles.length}
            pageSize={PAGE_SIZE}
            onPageChange={setCurrentPage}
          />
        </div>
      </div>

      <Footer onNavigate={(p) => onNavigate?.(p)} />
    </div>
  );
}
