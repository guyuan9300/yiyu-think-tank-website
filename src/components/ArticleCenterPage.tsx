import { useState, useEffect, useMemo, useRef } from 'react';
import { Header } from './Header';
import { OpenSourceFooter } from './open-source-home/OpenSourceFooter';
import {
  FileText,
  Search,
  Filter,
  Grid3X3,
  List,
  ChevronRight,
} from 'lucide-react';
import { getInsights, getAiManifest, type InsightArticle } from '../lib/dataService';
import { aiArticleDir } from '../lib/aiAssets';
import { ContentResourceCard } from './ContentResourceCard';
import { getYiyuPageAttrs, getYiyuSectionAttrs } from '../lib/yiyuTongSiteMap';
import { useLang, type Bilingual } from '../lib/i18n';

const PAGE_SIZE = 6;

export function ArticleCenterPage({
  onNavigate,
  onNavigateToDetail,
}: {
  onNavigate?: (page: string) => void;
  onNavigateToDetail?: (id: string) => void;
}) {
  const { t } = useLang();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTopic, setSelectedTopic] = useState<'all' | '战略' | '业务设计' | '组织' | 'AI 技术'>('all');
  const [articles, setArticles] = useState<InsightArticle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const sentinelRef = useRef<HTMLDivElement>(null);
  // AI 封面 manifest: ref 初值直接取模块级同步缓存(bootstrap 已填), 首屏即命中 AI 封面、不跳;
  // 再异步 fetch 兜底刷新(冷加载/缓存未就绪时自愈)。不改文章 coverImage 字段(防后台回写污染)。
  const aiManifestRef = useRef<Record<string, { cover?: any; illustrations?: any[] }>>(
    getAiManifest() as Record<string, { cover?: any; illustrations?: any[] }>
  );

  useEffect(() => {
    fetch('/api/admin-ai/manifest', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : {}))
      .then((m) => { aiManifestRef.current = m || {}; })
      .catch(() => {});
  }, []);

  // helper: 拿 AI 封面 URL (有就用 AI, 没有就用原 coverImage)
  const resolveCover = (article: InsightArticle): string | undefined => {
    if (aiManifestRef.current[article.id]?.cover) {
      return `${aiArticleDir(article.id)}/cover.jpg`;
    }
    return article.coverImage;
  };

  const topicOptions: Array<{ id: 'all' | '战略' | '业务设计' | '组织' | 'AI 技术'; label: Bilingual }> = [
    { id: 'all', label: { zh: '全部', en: 'All' } },
    { id: '战略', label: { zh: '战略', en: 'Strategy' } },
    { id: '业务设计', label: { zh: '业务设计', en: 'Business Design' } },
    { id: '组织', label: { zh: '组织', en: 'Organization' } },
    { id: 'AI 技术', label: { zh: 'AI 技术', en: 'AI Technology' } },
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

  // 筛选/搜索变化时重置已显示数量
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [searchQuery, selectedTopic]);

  const visibleArticles = useMemo(
    () => filteredArticles.slice(0, visibleCount),
    [filteredArticles, visibleCount],
  );
  const hasMore = visibleCount < filteredArticles.length;

  // 无限滚动: 哨兵进入视口 → 加载更多 (不用翻页)
  useEffect(() => {
    if (!hasMore) return;
    const el = sentinelRef.current;
    if (!el) return;
    const ob = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setVisibleCount((c) => c + PAGE_SIZE); },
      { rootMargin: '500px 0px' },
    );
    ob.observe(el);
    return () => ob.disconnect();
  }, [hasMore, filteredArticles.length]);

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
            <p className="text-os-muted">{t({ zh: '加载中...', en: 'Loading...' })}</p>
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
            <span className="text-[12px] font-semibold tracking-[0.18em] text-os-blue">{t({ zh: '益语智库 · 文章', en: 'Yiyu Institute · Articles' })}</span>
          </div>

          {/* 衬线大标题 */}
          <h1 className="font-serif-display text-[40px] sm:text-[56px] lg:text-[64px] font-semibold leading-[1.12] tracking-tight text-os-ink mb-5">
            {t({ zh: '观点、洞察、', en: 'Perspectives, insights,' })}
            <br className="hidden sm:block" />
            <span className="text-ink-accent">{t({ zh: '深度思考', en: 'and deep thinking' })}</span>
          </h1>

          {/* 副标题 */}
          <p className="text-[16px] sm:text-[18px] text-os-muted leading-[1.85] max-w-3xl">
            {t({ zh: '益语智库分享对战略、业务设计、组织和 AI 技术的持续思考。一部分来自我们的咨询实践，一部分来自我们对前沿的观察。', en: 'Yiyu Institute shares its ongoing thinking on strategy, business design, organization, and AI. Some of it comes from our consulting practice, and some from our observation of the frontier.' })}
          </p>
        </div>
      </section>

      {/* 筛选栏 - 固定定位 (升级 os 色板) */}
      <div
        {...getYiyuSectionAttrs('article-center', 'article-center-filters')}
        data-yiyu-results-total={String(filteredArticles.length)}
        data-yiyu-active-topic={selectedTopic}
        data-yiyu-search-query={searchQuery}
        data-yiyu-current-page={'1'}
        data-yiyu-total-pages={'1'}
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
                placeholder={t({ zh: '搜索文章、标签...', en: 'Search articles, tags...' })}
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
                    {opt.id === 'all' ? t({ zh: '全部标签', en: 'All tags' }) : t(opt.label)}
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
        data-yiyu-current-page={'1'}
        data-yiyu-total-pages={'1'}
        data-yiyu-sort="latest"
        className="max-w-4xl mx-auto px-6 py-8"
      >
        {/* 结果统计 */}
        <div className="flex items-center justify-between mb-8">
          <p className="text-[14px] text-muted-foreground/70">
            {t({ zh: '共找到', en: 'Found' })} <span className="text-foreground font-medium">{filteredArticles.length}</span> {t({ zh: '篇文章', en: 'articles' })}
          </p>
          {/* 刷新按钮已移除 */}
        </div>

        {/* 空状态 */}
        {filteredArticles.length === 0 ? (
          <div className="bg-white/60 backdrop-blur-sm rounded-[20px] border border-border/40 p-16 text-center">
            <FileText className="w-14 h-14 mx-auto mb-4 text-muted-foreground/30" />
            <p className="text-muted-foreground/70 text-[15px]">{t({ zh: '暂无文章', en: 'No articles yet' })}</p>
          </div>
        ) : viewMode === 'grid' ? (
          /* 网格视图 */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {visibleArticles.map((article: InsightArticle) => (
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
              {visibleArticles.map((article: InsightArticle) => (
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

        {/* 无限滚动: 哨兵 + 状态提示 (替代翻页) */}
        {filteredArticles.length > 0 && (
          <div ref={sentinelRef} className="mt-10 flex items-center justify-center">
            {hasMore ? (
              <div className="flex items-center gap-2 text-[13px] text-os-muted/60">
                <span className="w-4 h-4 border-2 border-os-navy/20 border-t-os-navy rounded-full animate-spin" />
                {t({ zh: '加载更多…', en: 'Loading more…' })}
              </div>
            ) : (
              <div className="flex items-center gap-3 text-[12.5px] text-os-muted/55">
                <span className="h-px w-8 bg-os-line" />
                {t({ zh: `已显示全部 ${filteredArticles.length} 篇`, en: `All ${filteredArticles.length} articles shown` })}
                <span className="h-px w-8 bg-os-line" />
              </div>
            )}
          </div>
        )}
      </div>

      <OpenSourceFooter />
    </div>
  );
}
