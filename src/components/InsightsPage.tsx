import { useState, useEffect, useMemo } from 'react';
import { Header } from './Header';
import {
  TrendingUp,
  FileText,
  Eye,
  ChevronRight,
  Sparkles,
  ArrowRight,
  Clock
} from 'lucide-react';
import { getReports, getCategories, getInsights, type Report, type InsightArticle } from '../lib/dataService';

// 报告卡片组件
function ReportCard({ report, onClick }: { report: Report; onClick?: () => void }) {
  return (
    <article
      className="group cursor-pointer"
      onClick={onClick}
    >
      <div className="relative bg-white/60 backdrop-blur-sm border border-border/40 rounded-3xl overflow-hidden transition-all duration-500 hover:bg-white/80 hover:border-border/60 hover:shadow-2xl hover:shadow-black/[0.04] hover:-translate-y-1">
        {/* 封面区域 */}
        <div className="relative aspect-[16/10] bg-gradient-to-br from-success/[0.03] to-accent/[0.03] overflow-hidden">
          {/* 封面图片占位 */}
          <div className="absolute inset-0 flex items-center justify-center">
            <TrendingUp className="w-16 h-16 text-success/10" />
          </div>

          {/* 热门标签 */}
          {report.isHot && (
            <div className="absolute top-4 left-4 px-3 py-1.5 rounded-full bg-gradient-to-r from-red-500 to-pink-500 text-white text-[11px] font-medium shadow-lg">
              热门
            </div>
          )}
        </div>

        {/* 内容区域 */}
        <div className="p-6">
          {/* 分类与版本 */}
          <div className="flex items-center gap-2 mb-3">
            <span className="px-3 py-1 rounded-full bg-success/8 text-success text-[11px] font-medium">
              {report.category}
            </span>
            <span className="text-[12px] text-muted-foreground/40">
              v{report.version}
            </span>
          </div>

          {/* 标题 */}
          <h3 className="text-[18px] font-semibold mb-2 line-clamp-2 group-hover:text-primary transition-colors leading-[1.4]">
            {report.title}
          </h3>

          {/* 摘要 */}
          <p className="text-[14px] text-muted-foreground/70 line-clamp-2 leading-[1.6] mb-4">
            {report.summary}
          </p>

          {/* 标签 */}
          <div className="flex flex-wrap gap-1.5 mb-4">
            {report.tags.slice(0, 3).map((tag: string, index: number) => (
              <span
                key={index}
                className="px-2.5 py-1 rounded-full bg-muted/40 text-muted-foreground/60 text-[11px]"
              >
                {tag}
              </span>
            ))}
          </div>

          {/* 底部元数据 */}
          <div className="flex items-center justify-between pt-4 border-t border-border/30 text-[12px] text-muted-foreground/50">
            <div className="flex items-center gap-1">
              <Eye className="w-3.5 h-3.5" />
              <span>{report.views.toLocaleString()}</span>
            </div>
            <span>{report.publishDate}</span>
          </div>
        </div>
      </div>
    </article>
  );
}

// 文章卡片组件
function ArticleCard({ article, onClick }: { article: InsightArticle; onClick?: () => void }) {
  return (
    <article
      className="group cursor-pointer"
      onClick={onClick}
    >
      <div className="relative bg-white/60 backdrop-blur-sm border border-border/40 rounded-3xl overflow-hidden transition-all duration-500 hover:bg-white/80 hover:border-border/60 hover:shadow-2xl hover:shadow-black/[0.04] hover:-translate-y-1">
        {/* 封面区域 */}
        <div className="relative aspect-[16/10] bg-gradient-to-br from-primary/[0.03] to-accent/[0.03] overflow-hidden">
          {/* 封面图片占位 */}
          <div className="absolute inset-0 flex items-center justify-center">
            <FileText className="w-16 h-16 text-primary/10" />
          </div>

          {/* 推荐标签 */}
          {article.featured && (
            <div className="absolute top-4 left-4 px-3 py-1.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[11px] font-medium shadow-lg flex items-center gap-1.5">
              <Sparkles className="w-3 h-3" />
              <span>推荐</span>
            </div>
          )}
        </div>

        {/* 内容区域 */}
        <div className="p-6">
          {/* 分类 */}
          <div className="flex items-center gap-2 mb-3">
            <span className="px-3 py-1 rounded-full bg-primary/8 text-primary text-[11px] font-medium">
              {article.category}
            </span>
          </div>

          {/* 标题 */}
          <h3 className="text-[18px] font-semibold mb-2 line-clamp-2 group-hover:text-primary transition-colors leading-[1.4]">
            {article.title}
          </h3>

          {/* 摘要 */}
          <p className="text-[14px] text-muted-foreground/70 line-clamp-2 leading-[1.6] mb-4">
            {article.excerpt}
          </p>

          {/* 标签 */}
          <div className="flex flex-wrap gap-1.5 mb-4">
            {article.tags.slice(0, 3).map((tag: string, index: number) => (
              <span
                key={index}
                className="px-2.5 py-1 rounded-full bg-muted/40 text-muted-foreground/60 text-[11px]"
              >
                {tag}
              </span>
            ))}
          </div>

          {/* 底部元数据 */}
          <div className="flex items-center justify-between pt-4 border-t border-border/30 text-[12px] text-muted-foreground/50">
            <span>{article.author}</span>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <Eye className="w-3.5 h-3.5" />
                <span>{article.views}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>{article.readTime}分钟</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

interface InsightsPageProps {
  onNavigate?: (page: string, id?: string) => void;
}

export function InsightsPage({ onNavigate }: InsightsPageProps) {
  const [reports, setReports] = useState<Report[]>([]);
  const [articles, setArticles] = useState<InsightArticle[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 加载数据
  useEffect(() => {
    const loadData = () => {
      const reportsData = getReports();
      const articlesData = getInsights();

      setReports(reportsData.filter(r => r.status === 'published'));
      setArticles(articlesData.filter(a => a.status === 'published'));
      setIsLoading(false);
    };

    loadData();

    const handleStorageChange = () => {
      loadData();
    };

    const pollInterval = setInterval(() => {
      const newReports = getReports();
      const newArticles = getInsights();
      const publishedReports = newReports.filter(r => r.status === 'published');
      const publishedArticles = newArticles.filter(a => a.status === 'published');

      if (publishedReports.length !== reports.length || publishedArticles.length !== articles.length) {
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

  // 获取最新的报告和文章
  const latestReports = useMemo(() => {
    return reports.slice(0, 6);
  }, [reports]);

  const latestArticles = useMemo(() => {
    return articles.slice(0, 6);
  }, [articles]);

  // 跳转到报告库
  const navigateToReportLibrary = () => {
    if (onNavigate) {
      onNavigate('report-library');
    } else {
      const params = new URLSearchParams(window.location.search);
      params.set('page', 'report-library');
      window.history.replaceState({}, '', `?${params.toString()}`);
      window.location.reload();
    }
  };

  // 跳转到文章中心
  const navigateToArticleCenter = () => {
    if (onNavigate) {
      onNavigate('article-center');
    } else {
      const params = new URLSearchParams(window.location.search);
      params.set('page', 'article-center');
      window.history.replaceState({}, '', `?${params.toString()}`);
      window.location.reload();
    }
  };

  // 加载状态
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
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
    <div className="min-h-screen bg-background">
      {/* 头部 */}
      <Header />

      {/* Hero 区域 - Apple 风格设计 */}
      <section className="relative pt-32 pb-20 px-6 overflow-hidden">
        {/* 微妙背景渐变 */}
        <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.02] to-transparent" />

        <div className="relative max-w-7xl mx-auto">
          {/* 面包屑导航 */}
          <div className="flex items-center gap-2 mb-6 text-[13px] text-muted-foreground/60">
            <button
              onClick={() => onNavigate?.('home')}
              className="hover:text-foreground transition-colors"
            >
              首页
            </button>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-foreground">前沿洞察</span>
          </div>

          {/* 主标题 - 大胆醒目 */}
          <div className="mb-4">
            <h1 className="text-[56px] sm:text-[64px] lg:text-[72px] font-semibold leading-[1.05] tracking-[-0.025em] mb-3">
              前沿洞察
            </h1>
            <p className="text-[13px] text-muted-foreground/50 tracking-[0.15em] uppercase font-medium">
              Insights & Research
            </p>
          </div>

          {/* 副标题 */}
          <p className="text-[21px] text-muted-foreground/70 leading-[1.5] max-w-3xl font-light">
            深度数据趋势追踪，分享前沿洞察与实践经验
          </p>
        </div>
      </section>

      {/* 内容区域 */}
      <div className="max-w-7xl mx-auto px-6 pb-32">
        {/* 报告库板块 */}
        <section className="mb-32">
          {/* 板块标题 */}
          <div className="flex items-end justify-between mb-12">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-success/10 to-accent/10 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-success" />
              </div>
              <div>
                <h2 className="text-[32px] font-semibold tracking-[-0.02em] mb-1">
                  报告库
                </h2>
                <p className="text-[15px] text-muted-foreground/60">
                  汇集行业研究报告，市场分析和数据洞察
                </p>
              </div>
            </div>
            <button
              onClick={navigateToReportLibrary}
              className="group flex items-center gap-2 px-5 py-2.5 rounded-full hover:bg-muted/40 transition-all text-[15px] text-muted-foreground/70 hover:text-foreground"
            >
<span>查看更多</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            </button>
          </div>

          {/* 报告网格 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {latestReports.map((report) => (
              <ReportCard
                key={report.id}
                report={report}
                onClick={() => onNavigate?.('report', report.id)}
              />
            ))}
          </div>
        </section>

        {/* 文章中心板块 */}
        <section>
          {/* 板块标题 */}
          <div className="flex items-end justify-between mb-12">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center">
                <FileText className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h2 className="text-[32px] font-semibold tracking-[-0.02em] mb-1">
                  文章中心
                </h2>
                <p className="text-[15px] text-muted-foreground/60">
                  深度解析领域趋势与实践经验
                </p>
              </div>
            </div>
            <button
              onClick={navigateToArticleCenter}
              className="group flex items-center gap-2 px-5 py-2.5 rounded-full hover:bg-muted/40 transition-all text-[15px] text-muted-foreground/70 hover:text-foreground"
            >
              <span>查看更多</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            </button>
          </div>

          {/* 文章网格 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {latestArticles.map((article) => (
              <ArticleCard
                key={article.id}
                article={article}
                onClick={() => onNavigate?.('article', article.id)}
              />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
