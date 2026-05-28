import { useEffect, useState } from 'react';
import { ArrowLeft, Calendar, ThumbsUp, Bookmark, Share2, Eye, Sparkles, ChevronRight } from 'lucide-react';
import { Header } from './Header';
import { Footer } from './Footer';

// ============================================================
// AI 生成文章 · 真实预览页 (?page=ai-preview)
//
// 用途: 让顾源源直接看 "AI 生成的封面 + AI 生成的正文" 渲染在
// 真实文章详情页 layout 里的效果, 验证视觉/排版/封面适配是否 OK.
//
// 数据来源: /ai-generated/article.json 是用豆包 doubao-seed-2-0-pro
//          生成的真实文章 (标题/摘要/topics/markdown 正文).
//          /ai-generated/article-cover.jpg 是用 doubao-seedream-4-0
//          生成的 1792×1024 封面图. 详见 commit 历史.
// ============================================================

interface AiIllustration {
  title: string;
  prompt: string;
  filename: string;
  sizeKb: number;
}

interface AiArticle {
  title: string;
  excerpt: string;
  topics: string[];
  body: string;
  illustrations?: AiIllustration[];
}

interface Chapter {
  title: string;
  paragraphs: string[];
  illustration?: AiIllustration;
}

interface AiPreviewPageProps {
  onNavigate?: (page: string) => void;
}

// 按 ## 二级标题切分章节, 每章节挂一张插图 (按 index 对应)
function parseChapters(article: AiArticle): Chapter[] {
  const lines = article.body.split('\n').map(l => l.trim()).filter(Boolean);
  const chapters: Chapter[] = [];
  let current: Chapter | null = null;
  for (const line of lines) {
    if (line.startsWith('## ')) {
      if (current) chapters.push(current);
      current = { title: line.slice(3).trim(), paragraphs: [] };
    } else if (line.startsWith('# ')) {
      if (current) chapters.push(current);
      current = { title: line.slice(2).trim(), paragraphs: [] };
    } else {
      if (!current) current = { title: '', paragraphs: [] };
      current.paragraphs.push(line);
    }
  }
  if (current) chapters.push(current);
  // 把插图按 index 绑到章节上
  chapters.forEach((ch, i) => {
    const ill = article.illustrations?.[i];
    if (ill) ch.illustration = ill;
  });
  return chapters;
}

export function AiPreviewPage({ onNavigate }: AiPreviewPageProps) {
  const [article, setArticle] = useState<AiArticle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/ai-generated/article.json')
      .then(r => r.ok ? r.json() : Promise.reject(`HTTP ${r.status}`))
      .then((data: AiArticle) => { setArticle(data); setLoading(false); })
      .catch(err => { setError(String(err)); setLoading(false); });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-os-canvas flex items-center justify-center">
        <div className="text-center">
          <span className="inline-block w-10 h-10 border-2 border-os-navy/20 border-t-os-navy rounded-full animate-spin mb-4" />
          <p className="text-os-muted text-[14px]">加载 AI 生成内容...</p>
        </div>
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className="min-h-screen bg-os-canvas flex items-center justify-center px-6">
        <div className="text-center text-rose-700">
          <p className="font-semibold mb-2">加载失败</p>
          <p className="text-[12px] text-rose-600">{error}</p>
        </div>
      </div>
    );
  }

  const chapters = parseChapters(article);
  const today = new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="min-h-screen bg-os-canvas flex flex-col">
      <Header onNavigate={(page) => onNavigate?.(page)} />

      {/* Hero · 封面图 + 标题 */}
      <section className="relative pt-24 pb-12 px-6 overflow-hidden bg-os-canvas">
        {/* 极淡光晕 */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[-10%] left-[8%] w-[40%] h-[60%] rounded-full bg-os-navy/[0.04] blur-[120px]" />
          <div className="absolute top-[-5%] right-[10%] w-[35%] h-[55%] rounded-full bg-os-spark/[0.04] blur-[120px]" />
        </div>

        <div className="relative max-w-4xl mx-auto">
          {/* 面包屑 */}
          <div className="flex items-center gap-2 mb-6 text-[13px] text-os-muted">
            <button onClick={() => onNavigate?.('articles')} className="flex items-center gap-1 hover:text-os-navy transition-colors">
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>文章</span>
            </button>
            <ChevronRight className="w-3 h-3" />
            <span className="text-os-navy/85">AI 生成预览</span>
          </div>

          {/* AI 生成提示 chip */}
          <div className="mb-5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-os-navy to-os-indigo text-white text-[12px] font-semibold shadow-os">
            <Sparkles className="w-3 h-3" />
            AI 生成 · 演示
          </div>

          {/* 封面图 + 标题卡 */}
          <article className="rounded-[28px] overflow-hidden ring-1 ring-os-line shadow-luxe-lg bg-os-paper">
            {/* 封面图 (1792×1024, AI 生成) */}
            <div className="relative bg-os-mist">
              <img
                src="/ai-generated/article-cover.jpg"
                alt={article.title}
                className="w-full h-auto block"
                style={{ aspectRatio: '1792 / 1024' }}
              />
              {/* 右下角 AI 角标 (纯文本 + 字间距, 避免 icon 渲染问题) */}
              <div className="absolute bottom-3 right-3 px-3 py-1 rounded-full bg-black/60 text-white text-[10px] font-semibold tracking-[0.08em] backdrop-blur-sm">
                AI · Doubao Seedream 4.0
              </div>
            </div>

            {/* 标题区 */}
            <div className="px-6 sm:px-10 py-8 sm:py-10 bg-os-paper">
              {/* topics */}
              <div className="mb-4 flex flex-wrap items-center gap-2">
                {article.topics.map(t => (
                  <span key={t} className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-os-mist text-os-blue text-[11px] font-semibold ring-1 ring-os-blue/15">
                    {t}
                  </span>
                ))}
              </div>

              {/* 标题 (font-serif-display 衬线) */}
              <h1 className="font-serif-display text-[32px] sm:text-[42px] lg:text-[48px] font-semibold leading-[1.18] tracking-tight text-os-ink">
                {article.title}
              </h1>

              {/* 摘要 */}
              <p className="mt-5 text-[15px] sm:text-[17px] text-os-muted leading-[1.85]">
                {article.excerpt}
              </p>
            </div>

            {/* 元信息条 */}
            <div className="px-6 sm:px-10 py-5 border-t border-os-line bg-os-canvas/40 flex flex-wrap items-center justify-between gap-4 text-[12.5px]">
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-os-muted">
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" />
                  {today}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Eye className="w-4 h-4" />0 阅读
                </span>
                <span className="inline-flex items-center gap-1.5 text-os-spark">
                  <Sparkles className="w-4 h-4" />豆包 doubao-seed-2-0-pro-260215 生成
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button className="p-2 rounded-full hover:bg-os-mist text-os-muted hover:text-os-navy transition-colors" title="点赞">
                  <ThumbsUp className="w-4 h-4" />
                </button>
                <button className="p-2 rounded-full hover:bg-os-mist text-os-muted hover:text-os-navy transition-colors" title="收藏">
                  <Bookmark className="w-4 h-4" />
                </button>
                <button className="p-2 rounded-full hover:bg-os-mist text-os-muted hover:text-os-navy transition-colors" title="分享">
                  <Share2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </article>
        </div>
      </section>

      {/* 正文 (AI 生成 markdown + 章节插图) */}
      <section className="px-6 pb-16">
        <div className="max-w-3xl mx-auto">
          <article className="prose-os">
            {chapters.map((ch, i) => (
              <div key={i}>
                {ch.title && (
                  <h2 className="font-serif-display text-[22px] sm:text-[26px] font-semibold leading-[1.4] tracking-tight text-os-navy mt-12 mb-4">
                    {ch.title}
                  </h2>
                )}
                {/* 章节第一段引入 */}
                {ch.paragraphs.slice(0, 1).map((p, j) => (
                  <p key={`p-intro-${i}-${j}`} className="text-[15.5px] sm:text-[16px] leading-[1.95] text-os-ink/85 my-5">
                    {p}
                  </p>
                ))}
                {/* 插图: 写实摄影风 · 承上启下 */}
                {ch.illustration && (
                  <figure className="my-8 -mx-2 sm:mx-0">
                    <div className="relative rounded-[20px] overflow-hidden ring-1 ring-os-line shadow-os">
                      <img
                        src={`/ai-generated/${ch.illustration.filename}`}
                        alt={ch.illustration.title}
                        className="w-full h-auto block"
                        style={{ aspectRatio: '1792 / 1024' }}
                      />
                      <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-full bg-black/55 text-white text-[10px] font-semibold tracking-[0.06em] backdrop-blur-sm">
                        AI 配图 · {i + 1}/{chapters.length}
                      </div>
                    </div>
                    <figcaption className="mt-2.5 text-center text-[11.5px] text-os-muted/75 leading-relaxed italic">
                      图 {i + 1} · {ch.title.length > 24 ? ch.title.slice(0, 24) + '…' : ch.title}
                    </figcaption>
                  </figure>
                )}
                {/* 剩余段落 */}
                {ch.paragraphs.slice(1).map((p, j) => (
                  <p key={`p-rest-${i}-${j}`} className="text-[15.5px] sm:text-[16px] leading-[1.95] text-os-ink/85 my-5">
                    {p}
                  </p>
                ))}
              </div>
            ))}
          </article>

          {/* AI 来源说明 */}
          <div className="mt-16 rounded-[16px] bg-os-mist/40 ring-1 ring-os-blue/15 px-5 py-4 text-[12.5px] text-os-ink/80 leading-relaxed">
            <div className="flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-os-blue mt-0.5 shrink-0" />
              <div>
                <strong className="text-os-navy">本文为 AI 生成演示</strong>
                <p className="mt-1 text-os-muted">
                  封面 + 章节配图 ({article.illustrations?.length || 0} 张) 由 <code className="font-mono px-1.5 py-0.5 rounded bg-os-paper text-os-blue">doubao-seedream-4-0-250828</code> 生成 (1792×1024, 写实摄影风) ·
                  正文由 <code className="font-mono px-1.5 py-0.5 rounded bg-os-paper text-os-blue">doubao-seed-2-0-pro-260215</code> 生成 ·
                  每张配图的 prompt 由 doubao 文本模型阅读对应章节内容后自动生成 ·
                  主题: "组织经营是一个整体, 但今天所有工具都把它切碎了"
                </p>
                <p className="mt-1.5 text-os-muted/85">
                  这是验收期演示, 没存入 dataService。接数据后, admin-v2 → 文章 → 新增 时点
                  <strong className="text-os-navy">「✨ AI 自动排版 + 生成封面」</strong>会复用同一套调用, 直接生成草稿存进文章库。
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer onNavigate={(page) => onNavigate?.(page as any)} />
    </div>
  );
}

export default AiPreviewPage;
