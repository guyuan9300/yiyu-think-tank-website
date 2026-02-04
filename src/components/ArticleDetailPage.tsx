import { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Calendar,
  Clock,
  Eye,
  ThumbsUp,
  Share2,
  Bookmark,
  MessageCircle,
  ChevronRight,
  BookOpen,
  Heart
} from 'lucide-react';
import { Header } from './Header';
import { CommentSection } from './CommentSection';
import { getInsights, type InsightArticle } from '../lib/dataService';

interface ArticleDetailPageProps {
  articleId: string;
  onNavigate: (page: string, id?: string) => void;
}

export function ArticleDetailPage({ articleId, onNavigate }: ArticleDetailPageProps) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [article, setArticle] = useState<InsightArticle | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load article data from localStorage
    const data = getInsights();
    const found = data.find((a: InsightArticle) => a.id === articleId);
    setArticle(found || null);
    setIsLoading(false);
  }, [articleId]);

  // Fallback mock data for preview
  const mockArticle: InsightArticle = {
    id: articleId,
    title: '2026年公益行业数字化转型白皮书',
    excerpt: '基于200+公益组织调研，深度解析数字化转型的挑战与机遇',
    content: '',
    category: '行业洞察',
    tags: ['公益', '数字化'],
    author: '益语智库',
    readTime: 25,
    publishDate: '2026-01-25',
    status: 'published',
    featured: true,
    showOnHome: true,
    views: 1234,
    likes: 89,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const displayArticle = article || mockArticle;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">加载中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header
        isLoggedIn={isLoggedIn}
        userType={isLoggedIn ? 'member' : 'visitor'}
        onNavigate={(page) => {
          if (page === 'article') {
            onNavigate('home');
          } else if (page === 'login' || page === 'register') {
            onNavigate(page as 'login' | 'register');
          } else {
            onNavigate(page as any);
          }
        }}
      />

      {/* Hero Section with Left-Image-Right-Text Layout */}
      <section className="relative pt-32 pb-20 px-6 overflow-hidden">
        {/* Background Gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-success/[0.03] via-background to-accent/[0.03] pointer-events-none" />

        <div className="relative max-w-7xl mx-auto">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 mb-8 text-[13px] text-muted-foreground/60">
            <button
              onClick={() => onNavigate('article-center')}
              className="flex items-center gap-1 hover:text-foreground transition-colors duration-200"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>文章中心</span>
            </button>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-foreground">{displayArticle.category}</span>
          </div>

          {/* Left-Image Right-Text Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            {/* Left: Image */}
            <div className="order-2 lg:order-1">
              <div className="relative aspect-[4/3] rounded-3xl overflow-hidden bg-gradient-to-br from-success/[0.08] to-accent/[0.08] border border-border/40 shadow-xl">
                {/* Placeholder for article cover image */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <BookOpen className="w-32 h-32 text-success/20" />
                  <span className="mt-4 text-sm text-muted-foreground/40 font-light">封面图片</span>
                </div>

                {/* Featured Badge */}
                {displayArticle.featured && (
                  <div className="absolute top-6 left-6 px-4 py-2 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[12px] font-medium shadow-lg flex items-center gap-2">
                    <Heart className="w-3.5 h-3.5 fill-current" />
                    <span>精选文章</span>
                  </div>
                )}
              </div>
            </div>

            {/* Right: Content */}
            <div className="order-1 lg:order-2">
              {/* Category & Featured */}
              <div className="flex items-center gap-3 mb-6">
                <span className="px-4 py-1.5 rounded-full bg-success/10 text-success text-[12px] font-medium">
                  {displayArticle.category}
                </span>
                {displayArticle.featured && (
                  <span className="px-3 py-1 rounded-full bg-gradient-to-r from-amber-500/10 to-orange-500/10 text-amber-600 text-[11px] font-medium">
                    精选
                  </span>
                )}
              </div>

              {/* Title */}
              <h1 className="text-[40px] sm:text-[48px] font-semibold leading-[1.1] tracking-[-0.02em] mb-6 text-foreground">
                {displayArticle.title}
              </h1>

              {/* Excerpt */}
              <p className="text-[18px] text-muted-foreground/70 leading-[1.6] mb-8 font-light">
                {displayArticle.excerpt}
              </p>

              {/* Meta Info */}
              <div className="flex flex-wrap items-center gap-6 text-[14px] text-muted-foreground/60 mb-8">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>{displayArticle.publishDate}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>{displayArticle.readTime}分钟阅读</span>
                </div>
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4" />
                  <span>{displayArticle.views.toLocaleString()} 次浏览</span>
                </div>
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-2 mb-8">
                {displayArticle.tags.map((tag: string, index: number) => (
                  <span
                    key={index}
                    className="px-3 py-1.5 rounded-full bg-muted/40 text-muted-foreground/70 text-[12px] font-light hover:bg-muted/60 transition-colors duration-200"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-4">
                <button className="group flex items-center gap-2.5 px-6 py-3 rounded-2xl bg-primary text-primary-foreground text-[15px] font-medium hover:bg-primary/90 transition-all hover:scale-[1.02] shadow-lg shadow-primary/20">
                  <BookOpen className="w-4 h-4" />
                  <span>开始阅读</span>
                </button>
                <button
                  onClick={() => setIsBookmarked(!isBookmarked)}
                  className={`flex items-center gap-2.5 px-6 py-3 rounded-2xl text-[15px] font-medium transition-all hover:scale-[1.02] ${
                    isBookmarked
                      ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                      : 'bg-muted/40 text-muted-foreground/70 hover:bg-muted/60'
                  }`}
                >
                  <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-current' : ''}`} />
                  <span>{isBookmarked ? '已收藏' : '收藏'}</span>
                </button>
                <button className="flex items-center gap-2.5 px-6 py-3 rounded-2xl bg-muted/40 text-muted-foreground/70 text-[15px] font-medium hover:bg-muted/60 transition-all hover:scale-[1.02]">
                  <Share2 className="w-4 h-4" />
                  <span>分享</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Content Section */}
      <section className="relative py-16 px-6">
        <div className="relative max-w-3xl mx-auto">
          {/* Article Content */}
          <article className="prose prose-lg max-w-none prose-headings:font-semibold prose-headings:tracking-tight prose-p:text-muted-foreground/80 prose-p:leading-relaxed prose-a:text-primary hover:prose-a:text-primary/80">
            <h2 className="text-2xl font-semibold mb-4 text-foreground">摘要</h2>
            <p className="mb-8 text-[17px] leading-[1.8] font-light">
              {displayArticle.excerpt}
            </p>

            <h2 className="text-2xl font-semibold mb-4 text-foreground">引言</h2>
            <p className="mb-6 text-[17px] leading-[1.8] font-light">
              在数字化浪潮席卷全球的今天，公益行业正面临着前所未有的转型机遇与挑战。
              本报告基于对200余家公益组织的深度调研，系统分析了数字化转型的现状、
              痛点与发展路径，为行业从业者提供决策参考。
            </p>

            <h2 className="text-2xl font-semibold mb-4 text-foreground">核心发现</h2>
            <p className="mb-6 text-[17px] leading-[1.8] font-light">
              调研显示，超过70%的公益组织已经启动或计划启动数字化转型项目，
              但在实际推进过程中普遍面临资金有限、技术人才匮乏、数字化认知不足等核心挑战。
            </p>

            <ul className="mb-8 space-y-3">
              <li className="text-[17px] leading-[1.8] font-light text-muted-foreground/80">
                <strong className="font-medium text-foreground">资金约束：</strong>
                超过65%的组织表示数字化投入预算不足
              </li>
              <li className="text-[17px] leading-[1.8] font-light text-muted-foreground/80">
                <strong className="font-medium text-foreground">人才短缺：</strong>
                技术团队建设困难是普遍痛点
              </li>
              <li className="text-[17px] leading-[1.8] font-light text-muted-foreground/80">
                <strong className="font-medium text-foreground">认知不足：</strong>
                对数字化价值的理解有待深化
              </li>
            </ul>

            <h2 className="text-2xl font-semibold mb-4 text-foreground">建议与展望</h2>
            <p className="mb-6 text-[17px] leading-[1.8] font-light">
              针对上述挑战，我们建议公益组织采取分步推进策略：首先明确数字化目标与优先级，
              其次建立内部数字化能力，最后通过合作与资源共享降低转型成本。
            </p>

            <div className="p-8 rounded-3xl bg-gradient-to-br from-success/5 to-accent/5 border border-border/40 my-10">
              <h3 className="text-lg font-semibold mb-4 text-foreground">关键结论</h3>
              <p className="text-[17px] leading-[1.8] font-light text-muted-foreground/80">
                数字化转型不是可选项，而是公益组织提升效率、扩大影响力的必由之路。
                通过科学的规划与执行，公益组织可以在有限资源条件下实现数字化升级，
                更好地服务于社会使命。
              </p>
            </div>
          </article>

          {/* Action Bar */}
          <div className="mt-12 pt-8 border-t border-border/40">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsBookmarked(!isBookmarked)}
                  className="flex items-center gap-2.5 px-5 py-2.5 rounded-2xl bg-muted/30 hover:bg-muted/50 transition-all duration-300 hover:scale-[1.02] group"
                >
                  <ThumbsUp className="w-5 h-5 group-hover:scale-110 transition-transform duration-200" />
                  <span className="font-medium">{displayArticle.likes}</span>
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
                <button className="flex items-center gap-2.5 px-5 py-2.5 rounded-2xl bg-muted/30 hover:bg-muted/50 transition-all duration-300 hover:scale-[1.02]">
                  <Share2 className="w-5 h-5" />
                  <span className="font-medium">分享</span>
                </button>
              </div>
            </div>
          </div>

          {/* Comment Section */}
          <div className="mt-12">
            <CommentSection
              contentId={articleId}
              contentType="insight"
              contentTitle={displayArticle.title}
              isLoggedIn={isLoggedIn}
              userName={isLoggedIn ? '张三' : '访客'}
            />
          </div>

          {/* Related Articles */}
          <div className="mt-16 pt-8 border-t border-border/40">
            <h3 className="text-xl font-semibold mb-8 text-foreground">相关文章推荐</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                { id: 'related-1', title: '企业社会责任数字化实践报告', date: '2026-01-20', readTime: '12分钟' },
                { id: 'related-2', title: '非营利组织数据驱动决策指南', date: '2026-01-18', readTime: '18分钟' },
              ].map((item, index) => (
                <button
                  key={item.id}
                  onClick={() => onNavigate('article', item.id)}
                  className="p-6 rounded-2xl bg-muted/20 border border-border/40 hover:border-primary/50 hover:bg-muted/30 transition-all duration-300 cursor-pointer group text-left hover:scale-[1.02]"
                >
                  <h4 className="font-medium mb-2 group-hover:text-primary transition-colors duration-200 text-foreground">
                    {item.title}
                  </h4>
                  <p className="text-sm text-muted-foreground/60">
                    {item.date} • {item.readTime}阅读
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
