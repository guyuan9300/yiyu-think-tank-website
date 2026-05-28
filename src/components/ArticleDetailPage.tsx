import { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Calendar,
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
import { useContentEngagement } from '../hooks/useContentEngagement';
import { buildShareLandingUrl } from '../lib/shareLinks';
import { normalizeRichContentHtml } from '../lib/richContent';
import { getYiyuPageAttrs } from '../lib/yiyuTongSiteMap';

interface ArticleDetailPageProps {
  articleId: string;
  onNavigate: (page: string, id?: string) => void;
}

interface AiManifestEntry {
  cover?: { filename: string; prompt: string };
  illustrations?: { filename: string; prompt: string; title: string }[];
}

export function ArticleDetailPage({ articleId, onNavigate }: ArticleDetailPageProps) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [article, setArticle] = useState<InsightArticle | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [aiEntry, setAiEntry] = useState<AiManifestEntry | null>(null);
  const { engagement, toggleLike, toggleFavorite } = useContentEngagement('insight', articleId);

  useEffect(() => {
    // Load article data
    const data = getInsights();
    const found = data.find((a: InsightArticle) => a.id === articleId);
    setArticle(found || null);
    setIsLoading(false);
  }, [articleId]);

  // 加载 AI manifest, 命中此文章则取出对应 cover + illustrations
  useEffect(() => {
    let mounted = true;
    fetch('/api/admin-ai/manifest', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : {}))
      .then((m: Record<string, AiManifestEntry> | null) => {
        if (mounted && m && m[articleId]) setAiEntry(m[articleId]);
      })
      .catch(() => {});
    return () => { mounted = false; };
  }, [articleId]);

  // 把 article.coverImage patch 成 AI cover (如果有)
  const aiCoverUrl = aiEntry?.cover
    ? `/ai-generated/articles/${articleId.replace(/[^a-zA-Z0-9_-]/g, '_')}/cover.jpg`
    : null;
  const aiIllustrations = aiEntry?.illustrations || [];

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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">加载中...</div>
      </div>
    );
  }

  if (!article) {
    return (
      <div {...getYiyuPageAttrs('article')} className="min-h-screen bg-background flex flex-col">
        <Header
          isLoggedIn={isLoggedIn}
          userType={isLoggedIn ? 'member' : 'visitor'}
          onNavigate={(page) => onNavigate(page as any)}
        />
        <main className="flex-1 flex items-center justify-center px-6 py-24">
          <div className="max-w-md text-center">
            <BookOpen className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <h1 className="text-[24px] font-semibold text-foreground mb-3">内容不存在</h1>
            <p className="text-[14px] text-muted-foreground/70 leading-relaxed mb-6">
              这篇文章可能已下线、被删除，或链接地址已经失效。
            </p>
            <button
              onClick={() => onNavigate('article-center')}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>返回文章中心</span>
            </button>
          </div>
        </main>
        <Footer onNavigate={(page) => onNavigate(page as any)} />
      </div>
    );
  }

  const displayArticle = article;

  return (
    <div {...getYiyuPageAttrs('article')} className="min-h-screen bg-background flex flex-col">
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
      <section
        data-yiyu-section="article-detail-hero"
        data-yiyu-section-type="hero"
        data-yiyu-section-title="文章详情头图"
        data-yiyu-section-order="1"
        data-yiyu-section-enterable="false"
        className="relative pt-28 pb-14 px-6 overflow-hidden"
      >
        {/* Ambient background */}
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-primary/[0.035] via-background to-background" />
        {(aiCoverUrl || displayArticle.coverImage) ? (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: `url(${aiCoverUrl || displayArticle.coverImage})`,
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
              onClick={() => onNavigate('articles')}
              className="flex items-center gap-1 hover:text-foreground transition-colors duration-200"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>文章</span>
            </button>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-foreground">详情</span>
          </div>

          {/* Cover */}
          <div className="relative rounded-[28px] overflow-hidden border border-border/40 bg-white/40 backdrop-blur-xl shadow-2xl shadow-black/[0.05]">
            <div className="relative aspect-[21/9] sm:aspect-[24/9] bg-gradient-to-br from-success/[0.06] to-accent/[0.06]">
              {(aiCoverUrl || displayArticle.coverImage) ? (
                <>
                  <img
                    src={aiCoverUrl || displayArticle.coverImage}
                    alt={displayArticle.title}
                    className="absolute inset-0 w-full h-full object-cover"
                    loading="lazy"
                  />
                  {aiCoverUrl && (
                    <div className="absolute bottom-3 right-3 px-2.5 py-1 rounded-full bg-black/55 text-white text-[10px] font-semibold tracking-[0.08em] backdrop-blur-sm z-10">
                      AI · Doubao Seedream 4.0
                    </div>
                  )}
                </>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <BookOpen className="w-14 h-14 text-success/15" />
                </div>
              )}

              {/* readability overlays */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/18 via-black/6 to-transparent" />
              <div className="absolute inset-0 bg-[radial-gradient(1000px_circle_at_18%_12%,rgba(255,255,255,0.35),transparent_55%)]" />
            </div>

            <div className="px-6 sm:px-8 py-7 sm:py-8 bg-white/70 backdrop-blur-xl border-t border-border/30">
              <h1 className="font-serif-display text-[30px] sm:text-[40px] font-semibold leading-[1.12] tracking-tight text-foreground">
                {displayArticle.title}
              </h1>
              <p className="mt-4 text-[15px] sm:text-[17px] text-muted-foreground/80 leading-[1.75] max-w-3xl">
                {displayArticle.excerpt}
              </p>
            </div>

            {/* Meta + actions row */}
            <div className="px-6 sm:px-8 py-5 sm:py-6 bg-white/45 backdrop-blur-xl border-t border-border/30">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] text-muted-foreground/70">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span>{displayArticle.publishDate}</span>
                  </div>
                </div>

                {/* Topics (moved here) */}
                {displayArticle.topics?.length ? (
                  <div className="flex flex-wrap justify-end gap-2">
                    {displayArticle.topics.map((topic: string, index: number) => (
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

      {/* Content Section */}
      <section
        id="article-content"
        data-yiyu-section="article-detail-content"
        data-yiyu-section-type="detail"
        data-yiyu-section-title="文章正文"
        data-yiyu-section-order="2"
        data-yiyu-section-enterable="false"
        className="relative py-16 px-6"
      >
        <div className="relative max-w-4xl mx-auto">
          {/* AI 章节配图带 (如果 manifest 有) */}
          {aiIllustrations.length > 0 && (
            <div className="mb-12">
              <div className="flex items-center gap-2 mb-5 text-[12px] tracking-[0.16em] font-semibold text-os-blue uppercase">
                <span className="h-px flex-1 bg-os-line" />
                AI 章节配图 · {aiIllustrations.length} 张
                <span className="h-px flex-1 bg-os-line" />
              </div>
              <div className="space-y-6">
                {aiIllustrations.map((ill, i) => {
                  const safe = articleId.replace(/[^a-zA-Z0-9_-]/g, '_');
                  return (
                    <figure key={i} className="rounded-[20px] overflow-hidden ring-1 ring-os-line shadow-os relative">
                      <img
                        src={`/ai-generated/articles/${safe}/${ill.filename}`}
                        alt={ill.title}
                        className="w-full h-auto block"
                        style={{ aspectRatio: '1792 / 1024' }}
                        loading="lazy"
                      />
                      <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-full bg-black/55 text-white text-[10px] font-semibold tracking-[0.06em] backdrop-blur-sm">
                        AI 配图 · {i + 1}/{aiIllustrations.length}
                      </div>
                      <figcaption className="px-5 py-3 bg-os-paper/95 text-[12.5px] text-os-muted/85 italic border-t border-os-line">
                        图 {i + 1} · {ill.title}
                      </figcaption>
                    </figure>
                  );
                })}
              </div>
            </div>
          )}

          {/* Article Content */}
          <article className="prose prose-lg max-w-none prose-headings:font-semibold prose-headings:tracking-tight prose-p:text-muted-foreground/80 prose-p:leading-relaxed prose-a:text-primary hover:prose-a:text-primary/80">
            {(() => {
              const anyArticle: any = displayArticle as any;
              const hasJson = Boolean(anyArticle?.contentJson);
              const htmlFromSnapshot = (anyArticle?.contentHtml as string | undefined) || '';

              // Prefer saved HTML snapshot; else render from JSON; else fallback to legacy plain text.
              if (htmlFromSnapshot.trim()) {
                const safe = DOMPurify.sanitize(normalizeRichContentHtml(htmlFromSnapshot), { USE_PROFILES: { html: true } });
                return (
                  <div
                    className="text-[17px] leading-[1.8] font-light [&_ol]:list-decimal [&_ul]:list-disc [&_ol]:list-inside [&_ul]:list-inside [&_ol]:pl-2 [&_ul]:pl-2 [&_ol>li]:list-item [&_ul>li]:list-item [&_li]:my-2 [&_figure]:my-8 [&_figure]:text-center [&_figure_img]:mx-auto [&_figure_img]:block [&_img]:mx-auto [&_img]:block"
                    dangerouslySetInnerHTML={{ __html: safe }}
                  />
                );
              }

              if (hasJson) {
                try {
                  const html = generateHTML(anyArticle.contentJson, getArticleTiptapExtensions() as any);
                  const safe = DOMPurify.sanitize(normalizeRichContentHtml(html), { USE_PROFILES: { html: true } });
                  return (
                    <div
                      className="text-[17px] leading-[1.8] font-light [&_ol]:list-decimal [&_ul]:list-disc [&_ol]:list-inside [&_ul]:list-inside [&_ol]:pl-2 [&_ul]:pl-2 [&_ol>li]:list-item [&_ul>li]:list-item [&_li]:my-2 [&_figure]:my-8 [&_figure]:text-center [&_figure_img]:mx-auto [&_figure_img]:block [&_img]:mx-auto [&_img]:block"
                      dangerouslySetInnerHTML={{ __html: safe }}
                    />
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
                  onClick={async () => {
                    const result = await toggleLike();
                    if (!result.ok) {
                      alert(result.error || '请先登录后再点赞');
                    }
                  }}
                  className="flex items-center gap-2.5 px-5 py-2.5 rounded-2xl bg-muted/30 hover:bg-muted/50 transition-all duration-300 hover:scale-[1.02] group"
                >
                  <ThumbsUp className="w-5 h-5 group-hover:scale-110 transition-transform duration-200" />
                  <span className="font-medium">{engagement.likesCount || displayArticle.likes || 0}</span>
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
                    const slug = (displayArticle as any)?.shareSlug || displayArticle.id;
                    const shareUrl = buildShareLandingUrl('article', displayArticle.id, slug);
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
            data-yiyu-section="article-detail-comments"
            data-yiyu-section-type="comments"
            data-yiyu-section-title="文章评论区"
            data-yiyu-section-order="3"
            data-yiyu-section-enterable="true"
            className="mt-12"
          >
            <CommentSection
              contentId={articleId}
              contentType="insight"
              contentTitle={displayArticle.title}
              isLoggedIn={isLoggedIn}
              userName={isLoggedIn ? '张三' : '访客'}
            />
          </div>

          {/* Related Articles removed */}
          {/* 相关文章推荐：按需求移除 */}
        </div>
      </section>

      <Footer onNavigate={(p) => onNavigate(p)} />
    </div>
  );
}
