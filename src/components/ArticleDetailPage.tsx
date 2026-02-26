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
import { Footer } from './Footer';
import { CommentSection } from './CommentSection';
import { getInsights, type InsightArticle } from '../lib/dataService';
import { generateHTML } from '@tiptap/html';
import DOMPurify from 'dompurify';
import { getArticleTiptapExtensions } from '../lib/tiptapSchema';

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
    topics: ['战略'],
    publishDate: '2026-01-25',
    status: 'published',
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
    <div className="min-h-screen bg-background flex flex-col">
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

      {/* Hero Section (Editorial cover + calm meta; no meaningless primary CTA) */}
      <section className="relative pt-28 pb-14 px-6 overflow-hidden">
        {/* Ambient background */}
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-primary/[0.035] via-background to-background" />
        {displayArticle.coverImage ? (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: `url(${displayArticle.coverImage})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              filter: 'blur(36px)',
              transform: 'scale(1.12)',
              opacity: 0.22,
            }}
          />
        ) : null}
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-background/55 via-background/85 to-background" />

        <div className="relative max-w-4xl mx-auto">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 mb-7 text-[13px] text-muted-foreground/60">
            <button
              onClick={() => onNavigate('article-center')}
              className="flex items-center gap-1 hover:text-foreground transition-colors duration-200"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>文章中心</span>
            </button>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-foreground">{displayArticle.topics?.[0] || '洞察'}</span>
          </div>

          {/* Cover */}
          <div className="relative rounded-[28px] overflow-hidden border border-border/40 bg-white/40 backdrop-blur-xl shadow-2xl shadow-black/[0.05]">
            <div className="relative aspect-[21/9] sm:aspect-[24/9] bg-gradient-to-br from-success/[0.06] to-accent/[0.06]">
              {displayArticle.coverImage ? (
                <img
                  src={displayArticle.coverImage}
                  alt={displayArticle.title}
                  className="absolute inset-0 w-full h-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <BookOpen className="w-14 h-14 text-success/15" />
                </div>
              )}

              {/* readability overlays */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-black/10 to-transparent" />
              <div className="absolute inset-0 bg-[radial-gradient(1000px_circle_at_18%_12%,rgba(255,255,255,0.35),transparent_55%)]" />

              {/* Badges */}
              <div className="absolute top-5 left-5 flex items-center gap-2">
                <span className="px-3 py-1.5 rounded-full bg-white/70 text-foreground text-[12px] font-medium border border-white/60 shadow-sm">
                  {displayArticle.topics?.[0] || '洞察'}
                </span>
                {/* featured removed (topics-only schema) */}
              </div>

              {/* Title on cover (mobile-first) */}
              <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8">
                <h1 className="text-white text-[30px] sm:text-[40px] font-semibold leading-[1.12] tracking-[-0.02em] drop-shadow-sm">
                  {displayArticle.title}
                </h1>
                <p className="mt-3 text-white/82 text-[15px] sm:text-[16px] leading-[1.65] max-w-3xl">
                  {displayArticle.excerpt}
                </p>
              </div>
            </div>

            {/* Meta + actions row */}
            <div className="px-6 sm:px-8 py-5 sm:py-6 bg-white/45 backdrop-blur-xl">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] text-muted-foreground/70">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span>{displayArticle.publishDate}</span>
                  </div>
                  {/* readTime removed (topics-only schema) */}
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4" />
                    <span>{displayArticle.views.toLocaleString()}</span>
                  </div>
                </div>

                {/* Actions: human-useful only */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsBookmarked(!isBookmarked)}
                    className={`px-3 py-2 rounded-full text-[13px] font-medium border transition ${
                      isBookmarked
                        ? 'bg-amber-500/10 text-amber-700 border-amber-500/20'
                        : 'bg-white/60 text-foreground/80 border-border/40 hover:bg-white/80'
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
                      const slug = (displayArticle as any)?.shareSlug || displayArticle.id;
                      const base = window.location.origin + import.meta.env.BASE_URL.replace(/\/$/, '');
                      const shareUrl = `${base}/share/article/${encodeURIComponent(slug)}/`;
                      try {
                        await navigator.clipboard.writeText(shareUrl);
                        alert('已复制分享链接');
                      } catch {
                        window.prompt('复制下面链接分享：', shareUrl);
                      }
                    }}
                    className="px-3 py-2 rounded-full bg-white/60 text-foreground/80 border border-border/40 hover:bg-white/80 transition text-[13px] font-medium"
                    title="复制分享链接"
                  >
                    <span className="inline-flex items-center gap-2">
                      <Share2 className="w-4 h-4" />
                      分享
                    </span>
                  </button>
                </div>
              </div>

              {/* Topics */}
              {displayArticle.topics?.length ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {displayArticle.topics.map((topic: string, index: number) => (
                    <span
                      key={index}
                      className="px-3 py-1.5 rounded-full bg-muted/40 text-muted-foreground/70 text-[12px] hover:bg-muted/60 transition-colors"
                    >
                      {topic}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      {/* Content Section */}
      <section id="article-content" className="relative py-16 px-6">
        <div className="relative max-w-4xl mx-auto">
          {/* Article Content */}
          <article className="prose prose-lg max-w-none prose-headings:font-semibold prose-headings:tracking-tight prose-p:text-muted-foreground/80 prose-p:leading-relaxed prose-a:text-primary hover:prose-a:text-primary/80">
            {(() => {
              const anyArticle: any = displayArticle as any;
              const hasJson = Boolean(anyArticle?.contentJson);
              const htmlFromSnapshot = (anyArticle?.contentHtml as string | undefined) || '';

              // Prefer saved HTML snapshot; else render from JSON; else fallback to legacy plain text.
              if (htmlFromSnapshot.trim()) {
                const safe = DOMPurify.sanitize(htmlFromSnapshot, { USE_PROFILES: { html: true } });
                return (
                  <div className="text-[17px] leading-[1.8] font-light" dangerouslySetInnerHTML={{ __html: safe }} />
                );
              }

              if (hasJson) {
                try {
                  const html = generateHTML(anyArticle.contentJson, getArticleTiptapExtensions() as any);
                  const safe = DOMPurify.sanitize(html, { USE_PROFILES: { html: true } });
                  return (
                    <div className="text-[17px] leading-[1.8] font-light" dangerouslySetInnerHTML={{ __html: safe }} />
                  );
                } catch {
                  // fall through to legacy
                }
              }

              const legacy = (displayArticle.content || '').trim();
              if (legacy) {
                // Render plain text as paragraphs so newlines don't collapse.
                const paras = legacy
                  .split(/\n\s*\n+/)
                  .map((p) => p.trim())
                  .filter(Boolean);
                return (
                  <div className="text-[17px] leading-[1.8] font-light">
                    {paras.map((p, idx) => (
                      <p key={idx}>{p}</p>
                    ))}
                  </div>
                );
              }

              return null;
            })() ?? (

              <>
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
              </>
            )}
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
                <button
                  onClick={async () => {
                    const slug = (displayArticle as any)?.shareSlug || displayArticle.id;
                    const base = window.location.origin + import.meta.env.BASE_URL.replace(/\/$/, '');
                    const shareUrl = `${base}/share/article/${encodeURIComponent(slug)}/`;
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

      <Footer onNavigate={(p) => onNavigate(p)} />
    </div>
  );
}
