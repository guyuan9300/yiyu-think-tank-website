import { useState, useEffect, useMemo } from 'react';
import { Header } from './Header';
import { Footer } from './Footer';
import {
  FileText,
  Search,
  Filter,
  Grid3X3,
  List,
  Eye,
  Heart,
  Clock,
  ChevronRight,
  RefreshCw
} from 'lucide-react';
import { getInsights, type InsightArticle } from '../lib/dataService';

// 文章卡片组件 - 网格视图
function ArticleCardGrid({ article, onClick }: { article: InsightArticle; onClick?: () => void }) {
  return (
    <article className="group cursor-pointer" onClick={onClick}>
      <div className="relative bg-white/60 backdrop-blur-sm border border-border/40 rounded-3xl overflow-hidden transition-all duration-500 hover:bg-white/80 hover:border-border/60 hover:shadow-2xl hover:shadow-black/[0.04] hover:-translate-y-1">
        {/* 封面区域 */}
        <div className="relative aspect-[16/10] bg-gradient-to-br from-primary/[0.03] to-accent/[0.03] overflow-hidden">
          {article.coverImage ? (
            <img
              src={article.coverImage}
              alt={article.title}
              className="absolute inset-0 w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <FileText className="w-16 h-16 text-primary/10" />
            </div>
          )}
          {/* 推荐标签已废弃 */}
        </div>

        {/* 内容区域 */}
        <div className="p-6">
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            {(article.topics || []).slice(0, 2).map((t, idx) => (
              <span
                key={idx}
                className="px-3 py-1 rounded-full bg-primary/8 text-primary text-[11px] font-medium"
              >
                {t}
              </span>
            ))}
            <span className="flex items-center gap-1 text-[12px] text-muted-foreground/50">
              <Clock className="w-3 h-3" />
              {article.publishDate}
            </span>
          </div>

          <h3 className="text-[18px] font-semibold mb-2 line-clamp-2 group-hover:text-primary transition-colors leading-[1.4]">
            {article.title}
          </h3>

          <p className="text-[14px] text-muted-foreground/70 line-clamp-2 leading-[1.6] mb-4">
            {article.excerpt}
          </p>

          <div className="flex flex-wrap gap-1.5 mb-4">
            {(article.topics || []).slice(0, 3).map((tag: string, index: number) => (
              <span
                key={index}
                className="px-2.5 py-1 rounded-full bg-muted/40 text-muted-foreground/60 text-[11px]"
              >
                {tag}
              </span>
            ))}
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-border/30 text-[12px] text-muted-foreground/50">
            <span>{article.publishDate}</span>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <Eye className="w-3.5 h-3.5" />
                {article.views}
              </span>
              <span className="flex items-center gap-1">
                <Heart className="w-3.5 h-3.5" />
                {article.likes}
              </span>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

// 文章列表项组件 - 列表视图
function ArticleListItem({ article, onClick }: { article: InsightArticle; onClick?: () => void }) {
  return (
    <div className="group flex items-center gap-6 p-5 hover:bg-muted/20 transition-colors cursor-pointer rounded-2xl" onClick={onClick}>
      {/* 封面 */}
      <div className="w-32 h-20 rounded-[12px] overflow-hidden flex-shrink-0 bg-gradient-to-br from-primary/[0.03] to-accent/[0.03]">
        {article.coverImage ? (
          <img
            src={article.coverImage}
            alt={article.title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <FileText className="w-8 h-8 text-primary/20" />
          </div>
        )}
      </div>

      {/* 内容 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          {(article.topics || []).slice(0, 2).map((t, idx) => (
            <span
              key={idx}
              className="px-2.5 py-1 bg-primary/8 text-primary text-[11px] font-medium rounded-full"
            >
              {t}
            </span>
          ))}
        </div>
        <h3 className="font-medium text-[15px] text-foreground mb-1 truncate group-hover:text-primary transition-colors">
          {article.title}
        </h3>
        <p className="text-[13px] text-muted-foreground/70 line-clamp-1">
          {article.excerpt}
        </p>
      </div>

      {/* 元数据 */}
      <div className="flex flex-col items-end gap-1.5 text-[12px] text-muted-foreground/50 w-32">
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {article.publishDate}
        </span>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <Eye className="w-3 h-3" />
            {article.views}
          </span>
          <span className="flex items-center gap-1">
            <Heart className="w-3 h-3" />
            {article.likes}
          </span>
        </div>
      </div>
    </div>
  );
}

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
      <div className="min-h-screen bg-background">
        <Header onNavigate={onNavigate} />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="w-10 h-10 border-2 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground/70">加载中...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header onNavigate={onNavigate} />

      {/* Hero 区域 */}
      <section className="relative pt-32 pb-8 px-6 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.02] to-transparent" />

        <div className="relative max-w-7xl mx-auto">
          {/* 面包屑导航 */}
          <div className="flex items-center gap-2 mb-6 text-[13px] text-muted-foreground/60">
            <button
              onClick={() => onNavigate?.('insights')}
              className="hover:text-foreground transition-colors"
            >
              前沿洞察
            </button>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-foreground">文章中心</span>
          </div>

          {/* 主标题 */}
          <div className="mb-4">
            <h1 className="text-[56px] sm:text-[64px] lg:text-[72px] font-semibold leading-[1.05] tracking-[-0.025em] mb-3">
              文章中心
            </h1>
            <p className="text-[13px] text-muted-foreground/50 tracking-[0.15em] uppercase font-medium">
              Article Center
            </p>
          </div>

          {/* 副标题 */}
          <p className="text-[21px] text-muted-foreground/70 leading-[1.5] max-w-3xl font-light">
            分享专业观点、行业洞察和深度思考
          </p>
        </div>
      </section>

      {/* 筛选栏 - 固定定位 */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-border/40 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex flex-wrap items-center gap-4">
            {/* 搜索框 */}
            <div className="flex-1 min-w-64 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
              <input
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
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* 结果统计 */}
        <div className="flex items-center justify-between mb-8">
          <p className="text-[14px] text-muted-foreground/70">
            共找到 <span className="text-foreground font-medium">{filteredArticles.length}</span> 篇文章
          </p>
          <button
            onClick={handleRefresh}
            className="group flex items-center gap-2 text-[13px] text-muted-foreground/70 hover:text-primary transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5 transition-transform group-hover:rotate-180" />
            <span>刷新</span>
          </button>
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
            {filteredArticles.map((article: InsightArticle) => (
              <ArticleCardGrid
                key={article.id}
                article={article}
                onClick={() => onNavigateToDetail?.(article.id)}
              />
            ))}
          </div>
        ) : (
          /* 列表视图 */
          <div className="bg-white/60 backdrop-blur-sm rounded-[20px] border border-border/40 overflow-hidden">
            <div className="divide-y divide-border/30">
              {filteredArticles.map((article: InsightArticle) => (
                <ArticleListItem
                  key={article.id}
                  article={article}
                  onClick={() => onNavigateToDetail?.(article.id)}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <Footer onNavigate={(p) => onNavigate?.(p)} />
    </div>
  );
}
