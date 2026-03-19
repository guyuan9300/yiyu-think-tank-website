import { useState, useEffect, useMemo } from 'react';
import { Header } from './Header';
import { Footer } from './Footer';
import {
  TrendingUp,
  FileText,
  ChevronRight,
  ArrowRight,
} from 'lucide-react';
import { getReports, getInsights, type Report, type InsightArticle } from '../lib/dataService';
import { PdfCoverImage } from './PdfCoverImage';
import { ContentResourceCard } from './ContentResourceCard';

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
    return reports.slice(0, 3);
  }, [reports]);

  const latestArticles = useMemo(() => {
    return articles.slice(0, 3);
  }, [articles]);

  // 跳转到报告库
  const navigateToReportLibrary = () => {
    if (onNavigate) {
      onNavigate('report-library');
      return;
    }
    // 兜底：直接跳转一次（不做 replaceState + reload）
    window.location.assign(`${window.location.pathname}?page=report-library`);
  };

  // 跳转到文章中心
  const navigateToArticleCenter = () => {
    if (onNavigate) {
      onNavigate('article-center');
      return;
    }
    window.location.assign(`${window.location.pathname}?page=article-center`);
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
    <div className="min-h-screen bg-background">
      {/* 头部 */}
      <Header onNavigate={onNavigate} />

      {/* Hero 区域 - Apple 风格设计 */}
      <section className="relative pt-28 sm:pt-32 pb-16 sm:pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
        {/* 微妙背景渐变 */}
        <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.02] to-transparent" />

        <div className="relative max-w-[1200px] mx-auto">
          {/* 面包屑已移除：首页与前沿洞察同级 */}

          {/* 主标题 */}
          <div className="mb-4">
            <div>
              <h1 className="text-[48px] sm:text-[56px] lg:text-[64px] font-semibold leading-[1.05] tracking-[-0.025em] mb-3">
                前沿洞察
              </h1>
              <p className="text-[13px] text-muted-foreground/50 tracking-[0.15em] uppercase font-medium">
                Insights & Research
              </p>
            </div>
          </div>

          {/* 副标题 */}
          <p className="text-[21px] text-muted-foreground/70 leading-[1.5] max-w-3xl font-light">
            深度数据趋势追踪，分享前沿洞察与实践经验
          </p>
        </div>
      </section>

      {/* 内容区域 */}
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 pb-24 sm:pb-32">
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
              <ContentResourceCard
                key={report.id}
                cover={
                  report.coverImage ? (
                    <img
                      src={report.coverImage}
                      alt={report.title}
                      className="absolute inset-0 w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : report.fileUrl ? (
                    <PdfCoverImage
                      pdfUrl={report.fileUrl}
                      alt={report.title}
                      className="absolute inset-0"
                      width={520}
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <TrendingUp className="w-16 h-16 text-success/10" />
                    </div>
                  )
                }
                tags={report.topics || []}
                title={report.title}
                author={report.publisher}
                excerpt={report.summary}
                views={report.views}
                likes={report.likes}
                favorites={report.favoritesCount}
                publishDate={report.publishDate}
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
              <ContentResourceCard
                key={article.id}
                cover={
                  article.coverImage ? (
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
                  )
                }
                tags={article.topics || []}
                title={article.title}
                excerpt={article.excerpt}
                views={article.views}
                likes={article.likes}
                favorites={article.favoritesCount}
                publishDate={article.publishDate}
                onClick={() => onNavigate?.('article', article.id)}
              />
            ))}
          </div>
        </section>
      </div>

      <Footer onNavigate={(p) => onNavigate?.(p)} />
    </div>
  );
}
