import { useState, useEffect, useMemo } from 'react';
import { Header } from './Header';
import { Footer } from './Footer';
import { SubscriptionSheet } from './SubscriptionSheet';
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
import { PdfCoverImage } from './PdfCoverImage';

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
          {/* 1) 优先使用已抓取/上传的封面图（更快、更稳定） */}
          {report.coverImage ? (
            <img
              src={report.coverImage}
              alt={report.title}
              className="absolute inset-0 w-full h-full object-cover"
              loading="lazy"
            />
          ) : report.fileUrl ? (
            /* 2) 兜底：从 PDF 源文件渲染首页作为封面 */
            <PdfCoverImage
              pdfUrl={report.fileUrl}
              alt={report.title}
              className="absolute inset-0"
              width={520}
            />
          ) : (
            /* 3) 再兜底：占位 */
            <div className="absolute inset-0 flex items-center justify-center">
              <TrendingUp className="w-16 h-16 text-success/10" />
            </div>
          )}

          {/* 热门标签已废弃 */}
        </div>

        {/* 内容区域 */}
        <div className="p-6">
          {/* topics 与版本 */}
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            {(report.topics || []).slice(0, 2).map((t, idx) => (
              <span
                key={idx}
                className="px-3 py-1 rounded-full bg-success/8 text-success text-[11px] font-medium"
              >
                {t}
              </span>
            ))}
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

          {/* topics（标签） */}
          <div className="flex flex-wrap gap-1.5 mb-4">
            {(report.topics || []).slice(0, 3).map((tag: string, index: number) => (
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
        <div className="relative aspect-[16/10] bg-gradient-to-br from-primary/[0.06] to-accent/[0.06] overflow-hidden">
          {/* 默认封面（无封面图或加载失败时展示） */}
          <div className="absolute inset-0 p-6 flex flex-col justify-between">
            <div className="w-12 h-12 rounded-2xl bg-white/60 flex items-center justify-center">
              <FileText className="w-6 h-6 text-primary/40" />
            </div>
            <div>
              <div className="flex flex-wrap gap-2 mb-2">
                {(article.topics || []).slice(0, 2).map((t, idx) => (
                  <span
                    key={idx}
                    className="text-white/90 text-[11px] font-medium bg-black/35 inline-block px-2 py-1 rounded-full"
                  >
                    {t}
                  </span>
                ))}
              </div>
              <h4 className="text-[16px] font-semibold leading-snug text-foreground line-clamp-3">
                {article.title}
              </h4>
              {/* 作者已废弃 */}
            </div>
          </div>

          {article.coverImage && (
            <img
              src={article.coverImage}
              alt={article.title}
              className="absolute inset-0 w-full h-full object-cover"
              loading="lazy"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = 'none';
              }}
            />
          )}

          {/* 推荐标签已废弃 */}
        </div>

        {/* 内容区域 */}
        <div className="p-6">
          {/* topics */}
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            {(article.topics || []).slice(0, 2).map((t, idx) => (
              <span
                key={idx}
                className="px-3 py-1 rounded-full bg-primary/8 text-primary text-[11px] font-medium"
              >
                {t}
              </span>
            ))}
          </div>

          {/* 标题 */}
          <h3 className="text-[18px] font-semibold mb-2 line-clamp-2 group-hover:text-primary transition-colors leading-[1.4]">
            {article.title}
          </h3>

          {/* 摘要 */}
          <p className="text-[14px] text-muted-foreground/70 line-clamp-2 leading-[1.6] mb-4">
            {article.excerpt}
          </p>

          {/* 底部元数据 */}
          <div className="flex items-center justify-between pt-4 border-t border-border/30 text-[12px] text-muted-foreground/50">
            <div className="flex items-center gap-1">
              <Eye className="w-3.5 h-3.5" />
              <span>{article.views}</span>
            </div>
            <span>{article.publishDate}</span>
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
  const [subscriptionOpen, setSubscriptionOpen] = useState(false);

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

      <SubscriptionSheet
        open={subscriptionOpen}
        onClose={() => setSubscriptionOpen(false)}
        onGoUpgrade={() => onNavigate?.('register')}
      />

      {/* Hero 区域 - Apple 风格设计 */}
      <section className="relative pt-28 sm:pt-32 pb-16 sm:pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
        {/* 微妙背景渐变 */}
        <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.02] to-transparent" />

        <div className="relative max-w-[1200px] mx-auto">
          {/* 面包屑已移除：首页与前沿洞察同级 */}

          {/* 主标题 + 订阅按钮 */}
          <div className="mb-4 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <h1 className="text-[48px] sm:text-[56px] lg:text-[64px] font-semibold leading-[1.05] tracking-[-0.025em] mb-3">
                前沿洞察
              </h1>
              <p className="text-[13px] text-muted-foreground/50 tracking-[0.15em] uppercase font-medium">
                Insights & Research
              </p>
            </div>

            <button
              onClick={() => setSubscriptionOpen(true)}
              className="group inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20 transition-all duration-300 text-[14px] w-fit"
            >
              <span>订阅前沿</span>
              <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5" />
            </button>
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

      <Footer onNavigate={(p) => onNavigate?.(p)} />
    </div>
  );
}
