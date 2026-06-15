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
  Heart,
  Sparkles
} from 'lucide-react';
import { Header } from './Header';
import { OpenSourceFooter } from './open-source-home/OpenSourceFooter';
import { CommentSection } from './CommentSection';
import { getInsights, type InsightArticle } from '../lib/dataService';
import { aiArticleDir } from '../lib/aiAssets';
import { generateHTML } from '@tiptap/html';
import DOMPurify from 'dompurify';
import { getArticleTiptapExtensions } from '../lib/tiptapSchema';
import { useContentEngagement } from '../hooks/useContentEngagement';
import { buildShareLandingUrl } from '../lib/shareLinks';
import { normalizeRichContentHtml } from '../lib/richContent';
import { getYiyuPageAttrs } from '../lib/yiyuTongSiteMap';
import { useLang } from '../lib/i18n';
import { Lock, Crown } from 'lucide-react';
import {
  getCurrentAccessUser,
  resolveArticleAccess,
  LIFETIME_MEMBER_TAGLINE,
  type ArticleAccess,
} from '../lib/accessControl';

interface ArticleDetailPageProps {
  articleId: string;
  onNavigate: (page: string, id?: string) => void;
}

interface AiManifestEntry {
  cover?: { filename: string; prompt: string };
  illustrations?: { filename: string; prompt: string; title: string }[];
}

export function ArticleDetailPage({ articleId, onNavigate }: ArticleDetailPageProps) {
  const { t } = useLang();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [article, setArticle] = useState<InsightArticle | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [aiEntry, setAiEntry] = useState<AiManifestEntry | null>(null);
  const [access, setAccess] = useState<ArticleAccess | null>(null);
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
    ? `${aiArticleDir(articleId)}/cover.jpg`
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

  // 计算付费档位 (会消费当日免费额度, 故每篇/每登录态变化只算一次)
  useEffect(() => {
    if (isLoading || !article) return;
    setAccess(resolveArticleAccess(articleId, getCurrentAccessUser()));
  }, [articleId, isLoggedIn, isLoading, article]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-os-canvas flex items-center justify-center">
        <div className="animate-pulse text-os-muted">{t({ zh: '加载中...', en: 'Loading...' })}</div>
      </div>
    );
  }

  if (!article) {
    return (
      <div {...getYiyuPageAttrs('article')} className="min-h-screen bg-os-canvas flex flex-col">
        <Header
          isLoggedIn={isLoggedIn}
          userType={isLoggedIn ? 'member' : 'visitor'}
          onNavigate={(page) => onNavigate(page as any)}
        />
        <main className="flex-1 flex items-center justify-center px-6 py-24">
          <div className="max-w-md text-center">
            <BookOpen className="w-12 h-12 text-os-muted/30 mx-auto mb-4" />
            <h1 className="text-[24px] font-semibold text-os-navy mb-3">{t({ zh: '内容不存在', en: 'Content not found' })}</h1>
            <p className="text-[14px] text-os-muted/70 leading-relaxed mb-6">
              {t({ zh: '这篇文章可能已下线、被删除，或链接地址已经失效。', en: 'This article may have been taken down, deleted, or the link is no longer valid.' })}
            </p>
            <button
              onClick={() => onNavigate('article-center')}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-os-navy text-white hover:bg-os-navy/90 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{t({ zh: '返回文章中心', en: 'Back to Articles' })}</span>
            </button>
          </div>
        </main>
        <OpenSourceFooter />
      </div>
    );
  }

  const displayArticle = article;

  return (
    <div {...getYiyuPageAttrs('article')} className="min-h-screen bg-os-canvas flex flex-col">
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
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-os-blue/[0.035] via-os-canvas to-os-canvas" />
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
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-os-canvas/55 via-os-canvas/85 to-os-canvas" />

        <div className="relative max-w-4xl mx-auto">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 mb-7 text-[13px] text-os-muted/60">
            <button
              onClick={() => onNavigate('articles')}
              className="flex items-center gap-1 hover:text-os-navy transition-colors duration-200"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>{t({ zh: '文章', en: 'Articles' })}</span>
            </button>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-os-navy">{t({ zh: '详情', en: 'Detail' })}</span>
          </div>

          {/* Cover */}
          <div className="relative rounded-[28px] overflow-hidden border border-os-line/40 bg-os-paper/40 backdrop-blur-xl shadow-2xl shadow-black/[0.05]">
            <div className="relative aspect-[21/9] sm:aspect-[24/9] bg-gradient-to-br from-os-blue/[0.06] to-os-violet/[0.06]">
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
                  <BookOpen className="w-14 h-14 text-os-blue/15" />
                </div>
              )}

              {/* readability overlays */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/18 via-black/6 to-transparent" />
              <div className="absolute inset-0 bg-[radial-gradient(1000px_circle_at_18%_12%,rgba(255,255,255,0.35),transparent_55%)]" />
            </div>

            <div className="px-6 sm:px-8 py-7 sm:py-8 bg-os-paper/70 backdrop-blur-xl border-t border-os-line/30">
              <h1 className="font-serif-display text-[30px] sm:text-[40px] font-semibold leading-[1.12] tracking-tight text-os-navy">
                {displayArticle.title}
              </h1>
              <p className="mt-4 text-[15px] sm:text-[17px] text-os-muted/80 leading-[1.75] max-w-3xl">
                {displayArticle.excerpt}
              </p>
            </div>

            {/* Meta + actions row */}
            <div className="px-6 sm:px-8 py-5 sm:py-6 bg-os-paper/45 backdrop-blur-xl border-t border-os-line/30">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] text-os-muted/70">
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
                        className="px-3 py-1.5 rounded-full bg-os-paper/60 text-os-muted/80 text-[12px] border border-os-line/40 hover:bg-os-paper/80 transition-colors"
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
          {/* AI 综述 + 核心观点 + 结构目录 (导读卡) */}
          {(() => {
            const a: any = displayArticle as any;
            const overview: string = a?.aiOverview || '';
            const points: string[] = a?.aiSummary?.points || [];
            const outline: { title: string; desc?: string }[] = a?.aiSummary?.outline || [];
            if (!overview && points.length === 0 && outline.length === 0) return null;
            return (
              <div className="mb-12 rounded-[24px] bg-os-paper ring-1 ring-os-line shadow-os overflow-hidden">
                {overview && (
                  <div className="px-6 sm:px-8 pt-7 pb-6 bg-gradient-to-br from-[#EFEFFA] via-os-paper to-os-paper">
                    <div className="flex items-center gap-2 mb-3 text-[11px] tracking-[0.16em] font-semibold text-os-violet uppercase">
                      <Sparkles className="w-3.5 h-3.5" /> {t({ zh: 'AI 综述', en: 'AI Overview' })}
                    </div>
                    <p className="text-[15px] leading-[1.9] text-os-navy/85">{overview}</p>
                  </div>
                )}
                {(points.length > 0 || outline.length > 0) && (
                  <div className="px-6 sm:px-8 py-7 grid sm:grid-cols-2 gap-7 border-t border-os-line">
                    {points.length > 0 && (
                      <div>
                        <div className="text-[11px] tracking-[0.16em] font-semibold text-os-indigo/75 uppercase mb-3.5">{t({ zh: '核心观点', en: 'Key Points' })}</div>
                        <ul className="space-y-2.5">
                          {points.map((p, i) => (
                            <li key={i} className="flex items-start gap-3 text-[14px] leading-[1.7] text-os-navy/80">
                              <span className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-os-spark" />{p}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {outline.length > 0 && (
                      <div>
                        <div className="text-[11px] tracking-[0.16em] font-semibold text-os-indigo/75 uppercase mb-3.5">{t({ zh: '结构目录', en: 'Outline' })}</div>
                        <ol className="space-y-3">
                          {outline.map((o, i) => (
                            <li key={i} className="flex gap-3">
                              <span className="font-serif-display text-[15px] font-bold text-os-indigo/70 leading-snug shrink-0">{String(i + 1).padStart(2, '0')}</span>
                              <div>
                                <div className="text-[14px] font-semibold text-os-navy leading-snug">{o.title}</div>
                                {o.desc && <div className="text-[12.5px] text-os-muted leading-relaxed mt-0.5">{o.desc}</div>}
                              </div>
                            </li>
                          ))}
                        </ol>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })()}

          {/* AI 章节配图带 (如果 manifest 有) */}
          {aiIllustrations.length > 0 && (
            <div className="mb-12">
              <div className="flex items-center gap-2 mb-5 text-[12px] tracking-[0.16em] font-semibold text-os-blue uppercase">
                <span className="h-px flex-1 bg-os-line" />
                {t({ zh: `AI 章节配图 · ${aiIllustrations.length} 张`, en: `AI Section Illustrations · ${aiIllustrations.length}` })}
                <span className="h-px flex-1 bg-os-line" />
              </div>
              <div className="space-y-6">
                {aiIllustrations.map((ill, i) => {
                  return (
                    <figure key={i} className="rounded-[20px] overflow-hidden ring-1 ring-os-line shadow-os relative">
                      <img
                        src={`${aiArticleDir(articleId)}/${ill.filename}`}
                        alt={ill.title}
                        className="w-full h-auto block"
                        style={{ aspectRatio: '1792 / 1024' }}
                        loading="lazy"
                      />
                      <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-full bg-black/55 text-white text-[10px] font-semibold tracking-[0.06em] backdrop-blur-sm">
                        {t({ zh: 'AI 配图', en: 'AI Image' })} · {i + 1}/{aiIllustrations.length}
                      </div>
                      <figcaption className="px-5 py-3 bg-os-paper/95 text-[12.5px] text-os-muted/85 italic border-t border-os-line">
                        {t({ zh: '图', en: 'Fig.' })} {i + 1} · {ill.title}
                      </figcaption>
                    </figure>
                  );
                })}
              </div>
            </div>
          )}

          {/* Article Content (付费墙: preview 档限高 + 渐隐) */}
          <div className="relative">
          <article
            className="prose prose-lg max-w-none prose-headings:font-semibold prose-headings:tracking-tight prose-p:text-os-muted/80 prose-p:leading-relaxed prose-a:text-os-blue hover:prose-a:text-os-blue/80"
            style={access?.tier === 'preview' ? { maxHeight: `${Math.round(access.ratio * 100)}vh`, overflow: 'hidden' } : undefined}
          >
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
                <h2 className="text-2xl font-semibold mb-4 text-os-navy">{t({ zh: '摘要', en: 'Summary' })}</h2>
                <p className="mb-8 text-[17px] leading-[1.8] font-light">
                  {displayArticle.excerpt}
                </p>

                <h2 className="text-2xl font-semibold mb-4 text-os-navy">{t({ zh: '引言', en: 'Introduction' })}</h2>
                <p className="mb-6 text-[17px] leading-[1.8] font-light">
                  {t({ zh: '在数字化浪潮席卷全球的今天，公益行业正面临着前所未有的转型机遇与挑战。本报告基于对200余家公益组织的深度调研，系统分析了数字化转型的现状、痛点与发展路径，为行业从业者提供决策参考。', en: 'As the wave of digitalization sweeps the globe, the nonprofit sector faces unprecedented opportunities and challenges. Based on in-depth research across more than 200 nonprofit organizations, this report systematically analyzes the current state, pain points, and development paths of digital transformation, offering practitioners a reference for decision-making.' })}
                </p>

                <h2 className="text-2xl font-semibold mb-4 text-os-navy">{t({ zh: '核心发现', en: 'Key Findings' })}</h2>
            <p className="mb-6 text-[17px] leading-[1.8] font-light">
              {t({ zh: '调研显示，超过70%的公益组织已经启动或计划启动数字化转型项目，但在实际推进过程中普遍面临资金有限、技术人才匮乏、数字化认知不足等核心挑战。', en: 'The research shows that over 70% of nonprofits have launched or plan to launch digital transformation initiatives, yet most face core challenges such as limited funding, a shortage of technical talent, and insufficient digital awareness.' })}
            </p>

            <ul className="mb-8 space-y-3">
              <li className="text-[17px] leading-[1.8] font-light text-os-muted/80">
                <strong className="font-medium text-os-navy">{t({ zh: '资金约束：', en: 'Funding constraints: ' })}</strong>
                {t({ zh: '超过65%的组织表示数字化投入预算不足', en: 'Over 65% of organizations report insufficient budget for digital investment' })}
              </li>
              <li className="text-[17px] leading-[1.8] font-light text-os-muted/80">
                <strong className="font-medium text-os-navy">{t({ zh: '人才短缺：', en: 'Talent shortage: ' })}</strong>
                {t({ zh: '技术团队建设困难是普遍痛点', en: 'Building a technical team is a widespread pain point' })}
              </li>
              <li className="text-[17px] leading-[1.8] font-light text-os-muted/80">
                <strong className="font-medium text-os-navy">{t({ zh: '认知不足：', en: 'Limited awareness: ' })}</strong>
                {t({ zh: '对数字化价值的理解有待深化', en: 'Understanding of the value of digitalization needs to deepen' })}
              </li>
            </ul>

            <h2 className="text-2xl font-semibold mb-4 text-os-navy">{t({ zh: '建议与展望', en: 'Recommendations & Outlook' })}</h2>
            <p className="mb-6 text-[17px] leading-[1.8] font-light">
              {t({ zh: '针对上述挑战，我们建议公益组织采取分步推进策略：首先明确数字化目标与优先级，其次建立内部数字化能力，最后通过合作与资源共享降低转型成本。', en: 'To address these challenges, we recommend nonprofits take a phased approach: first clarify digital goals and priorities, then build internal digital capabilities, and finally lower transformation costs through partnerships and shared resources.' })}
            </p>

            <div className="p-8 rounded-3xl bg-gradient-to-br from-os-blue/5 to-os-violet/5 border border-os-line/40 my-10">
              <h3 className="text-lg font-semibold mb-4 text-os-navy">{t({ zh: '关键结论', en: 'Key Takeaway' })}</h3>
              <p className="text-[17px] leading-[1.8] font-light text-os-muted/80">
                {t({ zh: '数字化转型不是可选项，而是公益组织提升效率、扩大影响力的必由之路。通过科学的规划与执行，公益组织可以在有限资源条件下实现数字化升级，更好地服务于社会使命。', en: 'Digital transformation is not optional—it is the path nonprofits must take to improve efficiency and expand impact. With sound planning and execution, nonprofits can upgrade digitally even under limited resources and better serve their social mission.' })}
              </p>
            </div>
              </>
            )}
          </article>

          {/* 付费墙: preview 档底部渐隐 + 行动卡 */}
          {access?.tier === 'preview' && (
            <div className="relative -mt-32 pt-32 bg-gradient-to-b from-transparent via-os-canvas/80 to-os-canvas">
              <div className="mx-auto max-w-xl rounded-[24px] border border-os-line bg-os-paper p-7 text-center shadow-[0_20px_60px_-30px_rgba(22,38,94,0.3)]">
                <div className="mx-auto mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-os-navy to-os-indigo text-white">
                  {access.reason === 'guest' ? <Lock className="h-5 w-5" /> : <Crown className="h-5 w-5" />}
                </div>
                <h3 className="font-serif-display text-[22px] font-semibold tracking-tight text-os-ink">
                  {access.reason === 'guest' ? t({ zh: '登录后免费阅读全文', en: 'Log in to read the full article free' }) : t({ zh: '今天的免费份额用完了', en: "You've used today's free quota" })}
                </h3>
                <p className="mt-2 text-[14px] leading-7 text-os-muted">
                  {access.reason === 'guest'
                    ? t({ zh: '登录会员每天可免费读 1 篇文章；成为一年会员则不限篇数。', en: 'Logged-in members can read 1 free article per day; one-year members read without limit.' })
                    : t({ zh: '你今天的免费文章已读完。成为一年会员，不限篇数畅读全部文章与报告。', en: "You've read your free article for today. Become a one-year member for unlimited access to all articles and reports." })}
                </p>
                <p className="mt-3 text-[13px] font-medium text-os-violet">{LIFETIME_MEMBER_TAGLINE}</p>
                <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
                  {access.reason === 'guest' ? (
                    <>
                      <button
                        onClick={() => onNavigate('login')}
                        className="inline-flex items-center justify-center rounded-xl bg-os-navy px-6 py-3 text-[14px] font-medium text-white shadow-[0_10px_30px_-10px_rgba(22,38,94,0.6)] transition hover:bg-os-navy-700"
                      >
                        {t({ zh: '登录 / 注册', en: 'Log in / Sign up' })}
                      </button>
                      <button
                        onClick={() => onNavigate('membership')}
                        className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-os-line bg-os-paper px-6 py-3 text-[14px] font-medium text-os-navy transition hover:border-os-navy/30"
                      >
                        <Crown className="h-4 w-4" />{t({ zh: '成为一年会员', en: 'Become a one-year member' })}
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => onNavigate('membership')}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-os-navy to-os-indigo px-7 py-3 text-[14px] font-medium text-white shadow-[0_10px_30px_-10px_rgba(22,38,94,0.6)] transition hover:brightness-110"
                    >
                      <Crown className="h-4 w-4" />{t({ zh: '成为一年会员 · 畅读全部', en: 'Become a one-year member · Read everything' })}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
          </div>

          {/* Action Bar */}
          <div className="mt-12 pt-8 border-t border-os-line/40">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={async () => {
                    const result = await toggleLike();
                    if (!result.ok) {
                      alert(result.error || t({ zh: '请先登录后再点赞', en: 'Please log in before liking' }));
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
                      alert(result.error || t({ zh: '请先登录后再收藏', en: 'Please log in before bookmarking' }));
                    }
                  }}
                  className={`flex items-center gap-2.5 px-5 py-2.5 rounded-2xl transition-all duration-300 hover:scale-[1.02] ${
                    engagement.favorited
                      ? 'bg-os-navy text-white shadow-lg shadow-primary/20'
                      : 'bg-muted/30 hover:bg-muted/50'
                  }`}
                >
                  <Bookmark className={`w-5 h-5 ${engagement.favorited ? 'fill-current' : ''}`} />
                  <span className="font-medium">
                    {engagement.favorited ? t({ zh: `已收藏 ${engagement.favoritesCount}`, en: `Saved ${engagement.favoritesCount}` }) : t({ zh: `收藏 ${engagement.favoritesCount}`, en: `Save ${engagement.favoritesCount}` })}
                  </span>
                </button>
                <button
                  onClick={async () => {
                    const slug = (displayArticle as any)?.shareSlug || displayArticle.id;
                    const shareUrl = buildShareLandingUrl('article', displayArticle.id, slug);
                    try {
                      await navigator.clipboard.writeText(shareUrl);
                      alert(t({ zh: '已复制分享链接，可直接粘贴到微信/朋友圈', en: 'Share link copied. Paste it into WeChat or Moments.' }));
                    } catch {
                      window.prompt(t({ zh: '复制下面链接分享到微信/朋友圈：', en: 'Copy the link below to share on WeChat / Moments:' }), shareUrl);
                    }
                  }}
                  className="flex items-center gap-2.5 px-5 py-2.5 rounded-2xl bg-muted/30 hover:bg-muted/50 transition-all duration-300 hover:scale-[1.02]"
                >
                  <Share2 className="w-5 h-5" />
                  <span className="font-medium">{t({ zh: '分享到朋友圈', en: 'Share to Moments' })}</span>
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
              userName={isLoggedIn ? t({ zh: '张三', en: 'User' }) : t({ zh: '访客', en: 'Guest' })}
            />
          </div>

          {/* Related Articles removed */}
          {/* 相关文章推荐：按需求移除 */}
        </div>
      </section>

      <OpenSourceFooter />
    </div>
  );
}
