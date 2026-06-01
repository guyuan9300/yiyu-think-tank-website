import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowLeft, Check, Crown, ShoppingBag } from 'lucide-react';
import { Header } from './Header';
import { OpenSourceFooter } from './open-source-home/OpenSourceFooter';
import { Reveal } from './open-source-home/ui';
import { getYiyuPageAttrs } from '../lib/yiyuTongSiteMap';
import { BOOK_51, BOOK_ORG, BUNDLE_PRICE, LIFETIME_TAGLINE, getBookByPlanId } from '../lib/books';

// ============================================================
// 书籍详情页
//   - book_51 → 严格按《创业51问详情页策划》落地的 10 屏长卷版 (含 9 张策划商业插图)
//   - book_org / book_bundle → 原 grid 简版兜底
// ============================================================

const IMG = '/images/books/book51'; // 策划插图: s1..s9 (来自《创业51问详情页策划.docx》)

interface BookDetailPageProps {
  planId: string;
  onNavigate: (page: string, id?: string) => void;
}

export function BookDetailPage({ planId, onNavigate }: BookDetailPageProps) {
  if (planId === 'book_51') {
    return <BookDetail51Long onNavigate={onNavigate} />;
  }
  if (planId === 'book_org') {
    return <BookDetailOrgLong onNavigate={onNavigate} />;
  }
  return <BookDetailSimple planId={planId} onNavigate={onNavigate} />;
}

const IMG_ORG = '/images/books/org'; // 学习型组织策划插图 o1..o8

// ============================================================
// 长卷版 (book_51) · 严格对齐策划 10 屏
//   Hero(总主张+01首屏) / 02痛点 / 03反鸡血 / 04核心结构[s1]
//   05看机会[s2,s3] / 06找对人[s4,s5] / 07通模式[s6,s7] / 08能增长[s8,s9]
//   09适合谁读 / 10购买收束
// ============================================================

// 05–08 四大板块屏数据 (代表问题 + 上/下两张策划插图 + 一句话)
const SECTIONS = [
  {
    letter: 'A', label: '看机会',
    title: '先别急着做，先判断这是不是一个真机会。',
    imgTop: `${IMG}/s2.png`, imgBottom: `${IMG}/s3.png`,
    questions: ['你的创业方向是什么？', '你的细分定位是什么？', '这个需求是真的吗？', '你的产品内核是什么？'],
    line: '好机会不是你喜欢什么，而是用户真的需要什么。',
    tone: 'canvas' as const,
  },
  {
    letter: 'B', label: '找对人',
    title: '创业不是一个人的英雄主义。',
    imgTop: `${IMG}/s4.png`, imgBottom: `${IMG}/s5.png`,
    questions: ['你是哪种创业者？', '你有战略思维吗？', '你的团队平衡吗？', '你的二把手是什么样的人？'],
    line: '一个人可以开始，一群合适的人才能走远。',
    tone: 'mist' as const,
  },
  {
    letter: 'C', label: '通模式',
    title: '模式不是写得顺，而是能在真实市场里跑起来。',
    imgTop: `${IMG}/s6.png`, imgBottom: `${IMG}/s7.png`,
    questions: ['品牌清晰吗？', 'MVP 怎么做？', '如何低成本启动？', '有没有业务测算模型？'],
    line: '不是把商业模式讲圆，而是让用户愿意持续买单。',
    tone: 'canvas' as const,
  },
  {
    letter: 'D', label: '能增长',
    title: '启动靠热情，增长靠系统。',
    imgTop: `${IMG}/s8.png`, imgBottom: `${IMG}/s9.png`,
    questions: ['你有增长飞轮吗？', '你的壁垒是什么？', '你怎么做销售？', '市场规模有多大？'],
    line: '真正的事业，不只是能开始，而是能持续变大。',
    tone: 'mist' as const,
  },
];

function BookDetail51Long({ onNavigate }: { onNavigate: (page: string, id?: string) => void }) {
  const heroRef = useRef<HTMLDivElement>(null);
  const closingRef = useRef<HTMLDivElement>(null);
  const [heroVisible, setHeroVisible] = useState<boolean>(true);
  const [closingVisible, setClosingVisible] = useState<boolean>(false);

  useEffect(() => {
    const hero = heroRef.current;
    if (!hero) return;
    const ob = new IntersectionObserver(([e]) => setHeroVisible(e.isIntersecting), { threshold: 0.15 });
    ob.observe(hero);
    return () => ob.disconnect();
  }, []);
  useEffect(() => {
    const closing = closingRef.current;
    if (!closing) return;
    const ob = new IntersectionObserver(([e]) => setClosingVisible(e.isIntersecting), { threshold: 0.3 });
    ob.observe(closing);
    return () => ob.disconnect();
  }, []);

  const showStickyBar = !heroVisible && !closingVisible;
  const handleBuy = (): void => onNavigate('payment-checkout', 'book_51');

  return (
    <div {...getYiyuPageAttrs('book-detail')} className="min-h-screen bg-os-canvas text-os-ink antialiased font-sans selection:bg-os-navy selection:text-white">
      <Header onNavigate={(p) => onNavigate(p)} />

      <main className="pt-[68px]">
        {/* Hero · 总主张 + 01 首屏 */}
        <div ref={heroRef}>
          <HeroScreen onBack={() => onNavigate('home')} onBuy={handleBuy} />
        </div>

        {/* 02 痛点屏 */}
        <ScreenWrap tone="canvas">
          <div className="max-w-3xl mx-auto text-center">
            <Reveal><Eyebrow>你不是没有想法</Eyebrow></Reveal>
            <Reveal delay={80}>
              <h2 className="font-serif-display text-[26px] sm:text-[34px] lg:text-[38px] font-semibold leading-[1.32] tracking-tight text-os-navy">
                很多创业，不是败在不努力，<br className="hidden sm:block" />而是关键问题一开始就没想清楚。
              </h2>
            </Reveal>
          </div>
          <Reveal delay={140}>
            <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-3.5 max-w-[900px] mx-auto">
              {['需求是真的吗？', '用户为什么需要你？', '团队对吗？', '模式跑得通吗？', '增长从哪里来？', '卡点在哪里？'].map((q) => (
                <div key={q} className="rounded-[16px] bg-os-paper ring-1 ring-os-line shadow-os px-5 py-4 text-[15px] font-medium text-os-ink">
                  {q}
                </div>
              ))}
            </div>
          </Reveal>
          <Reveal delay={220}>
            <p className="mt-12 text-center text-[15px] sm:text-[16px] leading-[1.9] text-os-muted max-w-2xl mx-auto">
              如果问题没问对，努力可能只是在错误方向上加速。
            </p>
          </Reveal>
        </ScreenWrap>

        {/* 03 反鸡血屏 */}
        <ScreenWrap tone="navy">
          <div className="max-w-2xl mx-auto text-center">
            <Reveal>
              <h2 className="font-serif-display text-[26px] sm:text-[34px] lg:text-[38px] font-semibold leading-[1.32] tracking-tight text-white">
                这不是一本告诉你“坚持就会成功”的书。
              </h2>
            </Reveal>
            <Reveal delay={120}>
              <div className="mt-10 space-y-3.5 text-left max-w-md mx-auto">
                {['不贩卖成功幻觉。', '不给标准答案。', '只帮你把关键问题摆到桌面上。'].map((t) => (
                  <div key={t} className="flex items-center gap-3 text-[16px] sm:text-[17px] font-medium text-white/90">
                    <Check className="h-5 w-5 shrink-0 text-os-blue" />{t}
                  </div>
                ))}
              </div>
            </Reveal>
            <Reveal delay={220}>
              <p className="mt-10 text-[14.5px] sm:text-[15px] leading-[1.9] text-white/60">
                每个创业者的答案不同，但必须先问对问题。
              </p>
            </Reveal>
          </div>
        </ScreenWrap>

        {/* 04 核心结构屏 (s1) */}
        <ScreenWrap tone="canvas">
          <div className="max-w-3xl mx-auto text-center">
            <Reveal><Eyebrow>核心结构</Eyebrow></Reveal>
            <Reveal delay={80}>
              <h2 className="font-serif-display text-[28px] sm:text-[38px] lg:text-[42px] font-semibold leading-[1.25] tracking-tight text-os-navy">
                51 个问题，4 条创业主线。
              </h2>
            </Reveal>
          </div>
          <Reveal delay={140}>
            <div className="mt-10"><PlanImage src={`${IMG}/s1.png`} alt="51 个问题的四大板块结构：看机会 · 找对人 · 通模式 · 能增长" /></div>
          </Reveal>
          <Reveal delay={200}>
            <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-[980px] mx-auto">
              {[
                { l: 'A', t: '看机会', d: '判断这件事值不值得做。' },
                { l: 'B', t: '找对人', d: '判断你该和谁一起做。' },
                { l: 'C', t: '通模式', d: '判断业务能不能跑起来。' },
                { l: 'D', t: '能增长', d: '判断事业能不能持续变大。' },
              ].map((b) => (
                <div key={b.l} className="rounded-[18px] bg-os-paper ring-1 ring-os-line shadow-os p-5">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-os-navy text-white font-serif-display text-[15px] font-semibold">{b.l}</span>
                    <span className="font-serif-display text-[18px] font-semibold text-os-navy">{b.t}</span>
                  </div>
                  <p className="mt-3 text-[13.5px] leading-7 text-os-muted">{b.d}</p>
                </div>
              ))}
            </div>
          </Reveal>
          <Reveal delay={280}>
            <p className="mt-12 text-center text-[15px] sm:text-[16px] leading-[1.9] text-os-muted max-w-2xl mx-auto">
              从想法到事业，不是一步跳过去，而是一步步问清楚。
            </p>
          </Reveal>
        </ScreenWrap>

        {/* 05–08 四大板块屏 */}
        {SECTIONS.map((s) => (
          <SectionScreen key={s.letter} {...s} />
        ))}

        {/* 09 适合谁读 */}
        <ScreenWrap tone="mist">
          <div className="max-w-3xl mx-auto text-center">
            <Reveal><Eyebrow>适合谁读</Eyebrow></Reveal>
            <Reveal delay={80}>
              <h2 className="font-serif-display text-[26px] sm:text-[34px] lg:text-[38px] font-semibold leading-[1.3] tracking-tight text-os-navy">
                这本书适合正在认真做事的人。
              </h2>
            </Reveal>
          </div>
          <Reveal delay={140}>
            <div className="mt-12 grid sm:grid-cols-2 gap-4 max-w-[900px] mx-auto">
              {[
                { t: '准创业者', d: '有想法，但不知道值不值得开始。' },
                { t: '早期创业者', d: '已经在做，但产品、团队、模式还没跑顺。' },
                { t: '小团队负责人', d: '需要重新梳理业务、用户、团队和增长。' },
                { t: '青年行动者 / 项目发起人', d: '想做一件事，但不知道怎么拆成计划。' },
              ].map((p) => (
                <div key={p.t} className="rounded-[18px] bg-os-paper ring-1 ring-os-line shadow-os p-6 text-left">
                  <div className="font-serif-display text-[18px] font-semibold text-os-navy">{p.t}</div>
                  <p className="mt-2 text-[14px] leading-7 text-os-muted">{p.d}</p>
                </div>
              ))}
            </div>
          </Reveal>
        </ScreenWrap>

        {/* 10 购买收束屏 */}
        <div ref={closingRef}>
          <ClosingScreen onBuy={handleBuy} onBundle={() => onNavigate('book-detail', 'book_bundle')} />
        </div>
      </main>

      <OpenSourceFooter />
      <StickyBuyBar visible={showStickyBar} onBuy={handleBuy} book={BOOK_51} />
    </div>
  );
}

// ============================================================
// Hero · 总主张 + 01 首屏
// ============================================================
function HeroScreen({ onBack, onBuy }: { onBack: () => void; onBuy: () => void }) {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-[#EAEBF9] via-[#EFF0FC] to-[#F6F7FD]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 right-[-10%] w-[46%] h-[60%] rounded-full bg-os-blue/[0.06] blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-8%] w-[36%] h-[50%] rounded-full bg-os-spark/[0.06] blur-[120px]" />
      </div>

      <div className="relative mx-auto w-full max-w-[1200px] px-5 sm:px-6 lg:px-8 pt-10 pb-24 lg:pt-14 lg:pb-32">
        <button onClick={onBack} className="mb-10 inline-flex items-center gap-1.5 text-[13px] font-medium text-os-muted hover:text-os-navy transition-colors">
          <ArrowLeft className="h-4 w-4" />返回首页
        </button>

        <div className="grid lg:grid-cols-[1fr_360px] gap-12 lg:gap-16 items-center">
          <div className="min-w-0">
            <Reveal>
              <div className="inline-flex items-center gap-2 rounded-full bg-os-paper ring-1 ring-os-line px-3.5 py-1.5 text-[12.5px] font-semibold text-os-muted shadow-os">
                <Crown className="w-3.5 h-3.5 text-os-blue" />创业者应该回答的 51 个问题
              </div>
            </Reveal>

            <Reveal delay={80}>
              <h1 className="font-serif-display mt-7 text-[34px] sm:text-[48px] lg:text-[56px] font-semibold leading-[1.18] tracking-tight text-os-navy">
                创业不是先找答案，<br /><span className="text-os-blue">而是先知道哪些问题必须被回答。</span>
              </h1>
            </Reveal>

            <Reveal delay={160}>
              <div className="mt-7 flex flex-wrap gap-2.5">
                {['看机会', '找对人', '通模式', '能增长'].map((k) => (
                  <span key={k} className="inline-flex items-center rounded-full bg-os-paper px-3.5 py-1.5 text-[13px] font-semibold text-os-navy ring-1 ring-os-line shadow-os">{k}</span>
                ))}
              </div>
            </Reveal>

            <Reveal delay={240}>
              <p className="mt-8 text-[17px] sm:text-[18px] font-semibold leading-[1.75] text-os-ink">
                好点子已经不稀缺，真正稀缺的是把想法变成现实的判断力。
              </p>
              <p className="mt-3 max-w-[560px] text-[15px] sm:text-[16px] leading-[1.85] text-os-muted">
                这不是一本创业鸡血书。它更像一份创业前、中、后的自测清单，帮你判断：这件事值不值得做，应该和谁做，模式能不能跑通，增长能不能持续。
              </p>
            </Reveal>

            <Reveal delay={320}>
              <div className="mt-9 flex flex-wrap items-center gap-4">
                <button onClick={onBuy} className="inline-flex items-center justify-center gap-2 rounded-xl bg-os-navy px-7 py-3.5 text-[15px] font-medium text-white shadow-[0_10px_30px_-10px_rgba(22,38,94,0.6)] transition hover:bg-os-navy-700">
                  <Crown className="h-4 w-4" />¥{BOOK_51.priceYuan} · 立即购买
                </button>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-os-mist px-3 py-1.5 text-[12px] font-medium text-os-blue ring-1 ring-os-blue/20">含益语智库终身会员</span>
              </div>
              <p className="mt-3 text-[12px] text-os-muted/70">{LIFETIME_TAGLINE}</p>
            </Reveal>
          </div>

          <Reveal delay={200}><BookCover3D src={BOOK_51.cover} alt={BOOK_51.title} /></Reveal>
        </div>
      </div>
    </section>
  );
}

function BookCover3D({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="relative mx-auto w-[200px] sm:w-[240px] aspect-[3/4.1] overflow-hidden rounded-r-[10px] rounded-l-[3px] bg-os-paper ring-1 ring-os-line shadow-[0_44px_84px_-30px_rgba(22,38,94,0.55)]">
      <img src={src} alt={alt} className="h-full w-full object-cover object-top" />
      <div className="pointer-events-none absolute inset-y-0 left-0 w-[10px] bg-gradient-to-r from-black/25 via-black/8 to-transparent" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-transparent via-transparent to-white/8" />
    </div>
  );
}

// ============================================================
// 05–08 通用板块屏 (标题 → 顶部插图 → 代表问题 → 大插图 → 一句话)
// ============================================================
function SectionScreen({ letter, label, title, imgTop, imgBottom, questions, line, tone }: typeof SECTIONS[number]) {
  return (
    <ScreenWrap tone={tone}>
      <div className="max-w-[1000px] mx-auto">
        <Reveal>
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-os-navy text-white font-serif-display text-[20px] font-semibold">{letter}</span>
            <span className="text-[12px] font-semibold tracking-[0.2em] text-os-blue uppercase">{label}</span>
          </div>
        </Reveal>
        <Reveal delay={80}>
          <h2 className="mt-5 font-serif-display text-[26px] sm:text-[34px] lg:text-[38px] font-semibold leading-[1.3] tracking-tight text-os-navy">{title}</h2>
        </Reveal>

        <Reveal delay={140}>
          <div className="mt-8"><PlanImage src={imgTop} alt={`${label} · 配图`} /></div>
        </Reveal>

        <Reveal delay={200}>
          <div className="mt-8">
            <div className="text-[12px] font-semibold tracking-[0.16em] text-os-muted uppercase mb-3">代表问题</div>
            <div className="grid sm:grid-cols-2 gap-3">
              {questions.map((q, i) => (
                <div key={q} className="flex items-start gap-3 rounded-[14px] bg-os-paper ring-1 ring-os-line px-4 py-3.5 text-[14.5px] font-medium text-os-ink">
                  <span className="font-serif-display text-[14px] font-semibold text-os-blue/70 leading-6">{String(i + 1).padStart(2, '0')}</span>
                  <span>{q}</span>
                </div>
              ))}
            </div>
          </div>
        </Reveal>

        <Reveal delay={260}>
          <div className="mt-8"><PlanImage src={imgBottom} alt={`${label} · 插图`} /></div>
        </Reveal>

        <Reveal delay={320}>
          <p className="mt-9 text-center font-serif-display text-[19px] sm:text-[22px] leading-[1.7] text-os-navy">{line}</p>
        </Reveal>
      </div>
    </ScreenWrap>
  );
}

// ============================================================
// 10 购买收束屏
// ============================================================
function ClosingScreen({ onBuy, onBundle }: { onBuy: () => void; onBundle: () => void }) {
  return (
    <section className="relative bg-gradient-to-br from-[#F7F8FC] via-[#EFF0FC] to-[#EAEBF9] overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-[10%] left-[40%] w-[40%] h-[60%] rounded-full bg-os-blue/[0.05] blur-[120px]" />
      </div>

      <div className="relative mx-auto w-full max-w-[1100px] px-5 sm:px-6 lg:px-8 py-24 sm:py-32">
        <div className="text-center max-w-3xl mx-auto">
          <Reveal>
            <h2 className="font-serif-display text-[30px] sm:text-[40px] lg:text-[46px] font-semibold leading-[1.25] tracking-tight text-os-navy">
              真正能走远的事业，<br className="hidden sm:block" /><span className="text-os-blue">从一组诚实的问题开始。</span>
            </h2>
          </Reveal>
          <Reveal delay={120}>
            <p className="mt-7 text-[15.5px] sm:text-[17px] leading-[1.9] text-os-muted">
              你不需要一开始就有完整答案。但你需要知道，哪些问题必须被回答。
            </p>
          </Reveal>
        </div>

        <Reveal delay={220}>
          <div className="mt-14 mx-auto max-w-[760px] rounded-[24px] bg-os-paper ring-1 ring-os-line shadow-os-lg p-8 sm:p-10">
            <div className="grid sm:grid-cols-2 gap-x-6 gap-y-3.5">
              {['51 个创业关键问题', '4 条判断主线', '适合反复翻、反复写、反复对照', '可作为创业自测、团队共读、项目复盘工具'].map((r) => (
                <div key={r} className="flex items-start gap-2.5 text-[14.5px] leading-7 text-os-ink/85">
                  <Check className="mt-1 h-4 w-4 shrink-0 text-os-blue" /><span>{r}</span>
                </div>
              ))}
            </div>
            <div className="mt-8 pt-7 border-t border-os-line/80 flex flex-wrap items-end justify-between gap-5">
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="font-serif-display text-[44px] font-semibold leading-none text-os-ink">¥{BOOK_51.priceYuan}</span>
                  <span className="inline-flex items-center rounded-full bg-os-mist px-3 py-1 text-[12px] font-medium text-os-blue ring-1 ring-os-blue/20">含终身会员</span>
                </div>
                <div className="mt-2 text-[12.5px] text-os-muted/80">{LIFETIME_TAGLINE}</div>
              </div>
              <button onClick={onBuy} className="inline-flex items-center justify-center gap-2 rounded-xl bg-os-navy px-8 py-3.5 text-[15px] font-medium text-white shadow-[0_10px_30px_-10px_rgba(22,38,94,0.6)] transition hover:bg-os-navy-700">
                <Crown className="h-4 w-4" />立即购买
              </button>
            </div>
          </div>
        </Reveal>

        <Reveal delay={320}>
          <p className="mt-10 text-center font-serif-display text-[18px] sm:text-[20px] leading-[1.7] italic text-os-navy/85">
            先看机会，再找对人；先通模式，再谈增长。
          </p>
        </Reveal>

        <Reveal delay={420}>
          <div className="mt-12 mx-auto max-w-[760px] flex flex-wrap items-center justify-between gap-4 rounded-[18px] border border-os-line bg-os-mist/40 px-6 py-5">
            <div>
              <div className="font-serif-display text-[16px] font-semibold text-os-ink">想两本一起带走？</div>
              <div className="mt-1 text-[13px] text-os-muted">合购《51 个问题》+《学习型组织笔记》仅 ¥{BUNDLE_PRICE}，立省 50</div>
            </div>
            <button onClick={onBundle} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-os-navy to-os-indigo px-6 py-3 text-[14px] font-medium text-white shadow-[0_10px_30px_-10px_rgba(22,38,94,0.6)] transition hover:brightness-110">
              <Crown className="h-4 w-4" />看合购套装
            </button>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

// ============================================================
// 通用件
// ============================================================
function ScreenWrap({ children, tone = 'canvas' }: { children: ReactNode; tone?: 'canvas' | 'mist' | 'navy' }) {
  const bg = tone === 'navy' ? 'bg-os-navy' : tone === 'mist' ? 'bg-os-mist/30' : 'bg-os-canvas';
  return (
    <section className={`${bg} relative overflow-hidden`}>
      {tone === 'navy' && (
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute top-[-30%] left-1/2 -translate-x-1/2 w-[55%] h-[120%] rounded-full bg-os-indigo/25 blur-[130px]" />
        </div>
      )}
      <div className="relative mx-auto w-full max-w-[1100px] px-5 sm:px-6 lg:px-8 py-20 sm:py-24 lg:py-28">{children}</div>
    </section>
  );
}

function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <div className="inline-flex items-center justify-center gap-2.5 mb-5">
      <span className="h-px w-7 bg-os-blue/50" />
      <span className="text-[12px] font-semibold tracking-[0.2em] text-os-blue uppercase">{children}</span>
      <span className="h-px w-7 bg-os-blue/50" />
    </div>
  );
}

function PlanImage({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="overflow-hidden rounded-[20px] ring-1 ring-os-line bg-os-paper shadow-os">
      <img src={src} alt={alt} loading="lazy" className="w-full h-auto block" />
    </div>
  );
}

function StickyBuyBar({ visible, onBuy, book }: { visible: boolean; onBuy: () => void; book: { title: string; priceYuan: number } }) {
  return (
    <div
      className="fixed inset-x-0 bottom-0 z-[80] pointer-events-none"
      style={{ opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(20px)', transition: 'opacity 0.35s ease, transform 0.35s cubic-bezier(0.16, 1, 0.3, 1)' }}
      aria-hidden={!visible}
    >
      <div className="mx-auto max-w-[900px] m-3 sm:m-4">
        <div className="pointer-events-auto flex items-center justify-between gap-3 sm:gap-5 rounded-2xl bg-os-paper/95 backdrop-blur-md ring-1 ring-os-line shadow-[0_20px_50px_-15px_rgba(22,38,94,0.35)] px-4 sm:px-6 py-3 sm:py-3.5">
          <div className="min-w-0 flex-1">
            <div className="text-[13px] sm:text-[14px] font-semibold text-os-navy truncate">{book.title}</div>
            <div className="mt-0.5 flex items-baseline gap-2">
              <span className="font-serif-display text-[20px] sm:text-[22px] font-semibold text-os-ink leading-none">¥{book.priceYuan}</span>
              <span className="text-[11.5px] text-os-blue">含终身会员</span>
            </div>
          </div>
          <button onClick={onBuy} className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-os-navy px-5 sm:px-6 py-2.5 sm:py-3 text-[13.5px] sm:text-[14px] font-medium text-white shadow-[0_10px_24px_-10px_rgba(22,38,94,0.6)] transition hover:bg-os-navy-700">
            <ShoppingBag className="h-4 w-4" />立即购买
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// 长卷版 (book_org) ·《学习型组织笔记》· 严格对齐策划
//   Hero / 02痛点 / 03反鸡血 / 04核心结构(五关键)[o3,o4]
//   05改变心智[o5] / 06共同愿景[o6] / 07系统思考[o7] / 09自我超越[o8]
//   10适合谁读 / 11读完得到 / 12实物展示[o2] / 13购买理由 / 14收束
// ============================================================
const ORG_DEEP = [
  {
    no: '01', label: '改变心智模式', tone: 'canvas' as const, img: `${IMG_ORG}/o5.png`,
    title: '是什么阻止了你的成功？很多时候，是你看问题的方式。',
    body: '很多管理问题，看起来是执行问题，背后其实是认知问题。如果团队仍然用旧经验、旧假设、旧判断面对新环境，再努力也只是在重复旧结果。',
    questions: ['为什么同样的问题反复发生？', '为什么团队总是陷入指责？', '为什么新方法推不动？', '为什么大家都很努力，却没有改变结果？'],
    line: '真正难改的不是流程，而是心智模式。',
  },
  {
    no: '02', label: '建立共同愿景', tone: 'mist' as const, img: `${IMG_ORG}/o6.png`,
    title: '团队力量的来源，不是命令，而是共同愿景。',
    body: '没有共同愿景的团队，只是在分工。有共同愿景的团队，才会主动协作、主动判断、主动承担。愿景不是一句漂亮口号，而是所有人都知道：我们为什么做这件事，最终想抵达哪里。',
    line: '任务让人行动，愿景让人愿意长期行动。',
  },
  {
    no: '03', label: '采用系统思考', tone: 'canvas' as const, img: `${IMG_ORG}/o7.png`,
    title: '短视的组织，只看事件；成熟的组织，看见系统。',
    body: '今天的问题，往往不是今天才发生的。一个客户流失、一次项目延期、一场团队冲突，背后可能是目标、流程、激励、沟通和资源长期错位的结果。系统思考，就是让管理者不只救火，而是看见火从哪里来。',
    line: '高手不是解决更多问题，而是减少问题反复出现。',
  },
  {
    no: '05', label: '追求自我超越', tone: 'mist' as const, img: `${IMG_ORG}/o8.png`,
    title: '自我超越，是这个时代最重要的精神。',
    body: '在变化很快的时代，一个人最大的危险不是能力不够，而是不再成长。一个组织最大的危险不是资源不足，而是失去更新自己的意愿。自我超越不是鸡血，而是持续问自己：',
    questions: ['我还能看见什么？', '我还能改进什么？', '我还能承担什么？', '我还能成为什么样的人？'],
    line: '组织的天花板，常常就是领导者成长的天花板。',
  },
];

function BookDetailOrgLong({ onNavigate }: { onNavigate: (page: string, id?: string) => void }) {
  const heroRef = useRef<HTMLDivElement>(null);
  const closingRef = useRef<HTMLDivElement>(null);
  const [heroVisible, setHeroVisible] = useState<boolean>(true);
  const [closingVisible, setClosingVisible] = useState<boolean>(false);

  useEffect(() => {
    const el = heroRef.current; if (!el) return;
    const ob = new IntersectionObserver(([e]) => setHeroVisible(e.isIntersecting), { threshold: 0.15 });
    ob.observe(el); return () => ob.disconnect();
  }, []);
  useEffect(() => {
    const el = closingRef.current; if (!el) return;
    const ob = new IntersectionObserver(([e]) => setClosingVisible(e.isIntersecting), { threshold: 0.3 });
    ob.observe(el); return () => ob.disconnect();
  }, []);

  const showStickyBar = !heroVisible && !closingVisible;
  const handleBuy = (): void => onNavigate('payment-checkout', 'book_org');

  return (
    <div {...getYiyuPageAttrs('book-detail')} className="min-h-screen bg-os-canvas text-os-ink antialiased font-sans selection:bg-os-navy selection:text-white">
      <Header onNavigate={(p) => onNavigate(p)} />

      <main className="pt-[68px]">
        {/* Hero · 总定位 + 01 首屏 */}
        <div ref={heroRef}>
          <section className="relative overflow-hidden bg-gradient-to-br from-[#EAEBF9] via-[#EFF0FC] to-[#F6F7FD]">
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute -top-24 right-[-10%] w-[46%] h-[60%] rounded-full bg-os-blue/[0.06] blur-[120px]" />
              <div className="absolute bottom-[-10%] left-[-8%] w-[36%] h-[50%] rounded-full bg-os-spark/[0.06] blur-[120px]" />
            </div>
            <div className="relative mx-auto w-full max-w-[1200px] px-5 sm:px-6 lg:px-8 pt-10 pb-24 lg:pt-14 lg:pb-32">
              <button onClick={() => onNavigate('home')} className="mb-10 inline-flex items-center gap-1.5 text-[13px] font-medium text-os-muted hover:text-os-navy transition-colors">
                <ArrowLeft className="h-4 w-4" />返回首页
              </button>
              <div className="grid lg:grid-cols-[1fr_360px] gap-12 lg:gap-16 items-center">
                <div className="min-w-0">
                  <Reveal>
                    <div className="inline-flex items-center gap-2 rounded-full bg-os-paper ring-1 ring-os-line px-3.5 py-1.5 text-[12.5px] font-semibold text-os-muted shadow-os">
                      <Crown className="w-3.5 h-3.5 text-os-blue" />学习型组织笔记
                    </div>
                  </Reveal>
                  <Reveal delay={80}>
                    <h1 className="font-serif-display mt-7 text-[34px] sm:text-[48px] lg:text-[56px] font-semibold leading-[1.18] tracking-tight text-os-navy">
                      让组织持续学习，<br /><span className="text-os-blue">让战略自驱生长。</span>
                    </h1>
                  </Reveal>
                  <Reveal delay={160}>
                    <div className="mt-7 flex flex-wrap gap-2.5">
                      {['心智模式', '共同愿景', '系统思考', '团队学习', '自我超越'].map((k) => (
                        <span key={k} className="inline-flex items-center rounded-full bg-os-paper px-3.5 py-1.5 text-[13px] font-semibold text-os-navy ring-1 ring-os-line shadow-os">{k}</span>
                      ))}
                    </div>
                  </Reveal>
                  <Reveal delay={240}>
                    <p className="mt-8 text-[17px] sm:text-[18px] font-semibold leading-[1.75] text-os-ink">
                      真正厉害的组织，不是每个人都很聪明，而是整个组织会持续学习。
                    </p>
                    <p className="mt-3 max-w-[560px] text-[15px] sm:text-[16px] leading-[1.85] text-os-muted">
                      不是一本空谈管理理念的书，而是一份帮助组织看清问题、形成共识、持续进化的管理笔记。
                    </p>
                  </Reveal>
                  <Reveal delay={320}>
                    <div className="mt-9 flex flex-wrap items-center gap-4">
                      <button onClick={handleBuy} className="inline-flex items-center justify-center gap-2 rounded-xl bg-os-navy px-7 py-3.5 text-[15px] font-medium text-white shadow-[0_10px_30px_-10px_rgba(22,38,94,0.6)] transition hover:bg-os-navy-700">
                        <Crown className="h-4 w-4" />¥{BOOK_ORG.priceYuan} · 立即购买
                      </button>
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-os-mist px-3 py-1.5 text-[12px] font-medium text-os-blue ring-1 ring-os-blue/20">含益语智库终身会员</span>
                    </div>
                    <p className="mt-3 text-[12px] text-os-muted/70">{LIFETIME_TAGLINE}</p>
                  </Reveal>
                </div>
                <Reveal delay={200}><BookCover3D src={`${IMG_ORG}/o1.png`} alt={BOOK_ORG.title} /></Reveal>
              </div>
              <Reveal delay={120}>
                <p className="mt-14 text-center font-serif-display text-[18px] sm:text-[22px] leading-[1.7] italic text-os-navy/85">
                  一个组织真正的护城河，是它比问题成长得更快。
                </p>
              </Reveal>
            </div>
          </section>
        </div>

        {/* 02 痛点屏 */}
        <ScreenWrap tone="canvas">
          <div className="max-w-3xl mx-auto text-center">
            <Reveal><Eyebrow>为什么组织总是卡住</Eyebrow></Reveal>
            <Reveal delay={80}>
              <h2 className="font-serif-display text-[26px] sm:text-[34px] lg:text-[38px] font-semibold leading-[1.32] tracking-tight text-os-navy">
                很多组织不是不努力，<br className="hidden sm:block" />而是在用旧的方式解决新的问题。
              </h2>
            </Reveal>
          </div>
          <Reveal delay={140}>
            <div className="mt-12 max-w-[760px] mx-auto space-y-3">
              {['战略开会很清楚，落地就变形；', '团队天天很忙，却没有真正进步；', '问题反复出现，却没人总结规律；', '负责人越来越累，组织却越来越依赖个人；', '每个人都有经验，但经验没有变成组织能力。'].map((q) => (
                <div key={q} className="rounded-[14px] bg-os-paper ring-1 ring-os-line shadow-os px-5 py-4 text-[15px] leading-7 text-os-ink">{q}</div>
              ))}
            </div>
          </Reveal>
          <Reveal delay={220}>
            <p className="mt-12 text-center text-[15px] sm:text-[16px] leading-[1.9] text-os-muted">组织不会学习，创始人就会越来越累。</p>
          </Reveal>
        </ScreenWrap>

        {/* 03 反鸡血屏 */}
        <ScreenWrap tone="navy">
          <div className="max-w-2xl mx-auto text-center">
            <Reveal>
              <h2 className="font-serif-display text-[26px] sm:text-[34px] lg:text-[38px] font-semibold leading-[1.32] tracking-tight text-white">
                学习型组织，不是大家一起学习。
              </h2>
            </Reveal>
            <Reveal delay={100}>
              <p className="mt-7 text-[15px] sm:text-[16px] leading-[1.95] text-white/70 max-w-xl mx-auto">
                它不是每周读一本书，也不是墙上贴几句价值观。真正的学习型组织，是一个团队能从行动中复盘，从错误中提炼，从经验中沉淀，从变化中调整。
              </p>
            </Reveal>
            <Reveal delay={180}>
              <div className="mt-10 space-y-3 text-left max-w-md mx-auto">
                {[['不是培训更多人', '而是让经验能被组织吸收。'], ['不是会议更多', '而是让共识能变成行动。'], ['不是口号更响', '而是让战略能自己生长。']].map(([a, b]) => (
                  <div key={a} className="flex items-start gap-3 text-[15px] text-white/90">
                    <Check className="mt-1 h-5 w-5 shrink-0 text-os-blue" /><span><span className="font-semibold">{a}</span> —— {b}</span>
                  </div>
                ))}
              </div>
            </Reveal>
            <Reveal delay={260}>
              <p className="mt-10 text-[14.5px] leading-[1.9] text-white/60">学习不是动作，学习是组织修正自己的能力。</p>
            </Reveal>
          </div>
        </ScreenWrap>

        {/* 04 核心结构屏 (o3, o4) */}
        <ScreenWrap tone="canvas">
          <div className="max-w-3xl mx-auto text-center">
            <Reveal><Eyebrow>核心结构</Eyebrow></Reveal>
            <Reveal delay={80}>
              <h2 className="font-serif-display text-[26px] sm:text-[36px] lg:text-[40px] font-semibold leading-[1.28] tracking-tight text-os-navy">
                这本书关注的，是组织持续成长的五个底层能力。
              </h2>
            </Reveal>
          </div>
          <Reveal delay={140}>
            <div className="mt-10 grid sm:grid-cols-2 gap-5 max-w-[860px] mx-auto">
              <PlanImage src={`${IMG_ORG}/o3.png`} alt="组织成长五个关键能力 · 结构图一" />
              <PlanImage src={`${IMG_ORG}/o4.png`} alt="组织成长五个关键能力 · 结构图二" />
            </div>
          </Reveal>
          <Reveal delay={200}>
            <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-[980px] mx-auto">
              {[
                ['01', '改变心智模式', '看见自己如何理解问题，才有可能换一种方式解决问题。'],
                ['02', '建立共同愿景', '团队不是被任务拉在一起，而是被共同方向组织起来。'],
                ['03', '采用系统思考', '不只看眼前事件，而是看见背后的结构和循环。'],
                ['04', '促进团队学习', '让个人经验变成团队能力，让团队能力变成组织资产。'],
                ['05', '追求自我超越', '真正的成长，是持续突破旧的自己。'],
              ].map(([n, t, d]) => (
                <div key={n} className="rounded-[18px] bg-os-paper ring-1 ring-os-line shadow-os p-5">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-os-navy text-white font-serif-display text-[14px] font-semibold">{n}</span>
                    <span className="font-serif-display text-[16px] font-semibold text-os-navy">{t}</span>
                  </div>
                  <p className="mt-3 text-[13.5px] leading-7 text-os-muted">{d}</p>
                </div>
              ))}
            </div>
          </Reveal>
          <Reveal delay={280}>
            <p className="mt-12 text-center text-[15px] sm:text-[16px] leading-[1.9] text-os-muted max-w-2xl mx-auto">组织成长的本质，是不断升级看待问题的方式。</p>
          </Reveal>
        </ScreenWrap>

        {/* 05–07 / 09 深度屏 */}
        {ORG_DEEP.map((s) => (
          <OrgDeepScreen key={s.no} {...s} />
        ))}

        {/* 10 适合谁读 */}
        <ScreenWrap tone="mist">
          <div className="max-w-3xl mx-auto text-center">
            <Reveal><Eyebrow>适合谁读</Eyebrow></Reveal>
            <Reveal delay={80}>
              <h2 className="font-serif-display text-[26px] sm:text-[34px] lg:text-[38px] font-semibold leading-[1.3] tracking-tight text-os-navy">这本书适合所有想把组织带得更好的人。</h2>
            </Reveal>
          </div>
          <Reveal delay={140}>
            <div className="mt-12 grid sm:grid-cols-2 gap-4 max-w-[900px] mx-auto">
              {[
                ['创业者', '你不只需要增长，还需要一个能持续学习的组织。'],
                ['管理者', '你不只要管任务，还要让团队形成共同判断。'],
                ['团队负责人', '你不只要解决眼前问题，还要沉淀可复用的方法。'],
                ['组织咨询 / 公益机构负责人', '你不只要做项目，还要建设长期能力。'],
              ].map(([t, d]) => (
                <div key={t} className="rounded-[18px] bg-os-paper ring-1 ring-os-line shadow-os p-6 text-left">
                  <div className="font-serif-display text-[18px] font-semibold text-os-navy">{t}</div>
                  <p className="mt-2 text-[14px] leading-7 text-os-muted">{d}</p>
                </div>
              ))}
            </div>
          </Reveal>
          <Reveal delay={220}>
            <p className="mt-12 text-center text-[15px] leading-[1.9] text-os-muted">管理不是让人听话，而是让组织越来越会做正确的事。</p>
          </Reveal>
        </ScreenWrap>

        {/* 11 读完得到什么 */}
        <ScreenWrap tone="canvas">
          <div className="max-w-3xl mx-auto text-center">
            <Reveal><Eyebrow>读完得到</Eyebrow></Reveal>
            <Reveal delay={80}>
              <h2 className="font-serif-display text-[26px] sm:text-[34px] lg:text-[38px] font-semibold leading-[1.3] tracking-tight text-os-navy">
                读完这本书，你得到的不是一套口号，<br className="hidden sm:block" />而是一组看组织的方法。
              </h2>
            </Reveal>
          </div>
          <Reveal delay={140}>
            <div className="mt-12 grid sm:grid-cols-2 gap-4 max-w-[900px] mx-auto">
              {[
                ['看清问题', '知道问题背后是个人能力、组织结构，还是系统循环。'],
                ['建立共识', '让团队不只讨论任务，也讨论方向和判断。'],
                ['沉淀经验', '把做过的事变成下次能用的方法。'],
                ['持续进化', '让组织不依赖某一个强人，而是拥有自我更新的能力。'],
              ].map(([t, d]) => (
                <div key={t} className="rounded-[18px] bg-os-paper ring-1 ring-os-line shadow-os p-6 text-left">
                  <div className="flex items-center gap-2.5"><Check className="h-4 w-4 text-os-blue" /><span className="font-serif-display text-[17px] font-semibold text-os-navy">{t}</span></div>
                  <p className="mt-2 text-[14px] leading-7 text-os-muted">{d}</p>
                </div>
              ))}
            </div>
          </Reveal>
          <Reveal delay={220}>
            <p className="mt-12 text-center text-[15px] leading-[1.9] text-os-muted">好的组织，不是没有问题，而是能从每个问题中长出能力。</p>
          </Reveal>
        </ScreenWrap>

        {/* 12 实物展示屏 (o2) */}
        <ScreenWrap tone="mist">
          <div className="max-w-[1000px] mx-auto grid lg:grid-cols-[1fr_380px] gap-10 lg:gap-14 items-center">
            <div>
              <Reveal><Eyebrow>实物展示</Eyebrow></Reveal>
              <Reveal delay={80}>
                <h2 className="font-serif-display text-[26px] sm:text-[32px] lg:text-[36px] font-semibold leading-[1.3] tracking-tight text-os-navy">
                  一本可以反复翻、反复划、反复对照的组织成长笔记。
                </h2>
              </Reveal>
              <Reveal delay={140}>
                <div className="mt-7 flex flex-wrap gap-2.5">
                  {['封面', '内页', '目录', '重点金句页', '结构图页', '读书笔记页'].map((t) => (
                    <span key={t} className="inline-flex items-center rounded-full bg-os-paper px-3.5 py-1.5 text-[13px] font-medium text-os-navy ring-1 ring-os-line">{t}</span>
                  ))}
                </div>
              </Reveal>
              <Reveal delay={200}>
                <p className="mt-7 text-[15px] leading-[1.9] text-os-muted">它适合一个人读，也适合团队共读；适合管理者自省，也适合组织复盘时一起讨论。</p>
              </Reveal>
              <Reveal delay={260}>
                <p className="mt-6 font-serif-display text-[18px] sm:text-[20px] leading-[1.7] italic text-os-navy/85">真正有价值的管理书，不是读完，而是被反复拿出来对照现实。</p>
              </Reveal>
            </div>
            <Reveal delay={160}><BookCover3D src={`${IMG_ORG}/o2.png`} alt={`${BOOK_ORG.title} · 实物展示`} /></Reveal>
          </div>
        </ScreenWrap>

        {/* 13 购买理由屏 */}
        <ScreenWrap tone="canvas">
          <div className="max-w-3xl mx-auto text-center">
            <Reveal><Eyebrow>购买理由</Eyebrow></Reveal>
            <Reveal delay={80}>
              <h2 className="font-serif-display text-[28px] sm:text-[38px] lg:text-[42px] font-semibold leading-[1.25] tracking-tight text-os-navy">为什么值得买？</h2>
            </Reveal>
          </div>
          <Reveal delay={140}>
            <div className="mt-12 grid sm:grid-cols-3 gap-5 max-w-[980px] mx-auto">
              {[
                ['它帮你看清组织问题', '不是停留在“人不行”“执行差”，而是看到背后的心智、结构和系统。'],
                ['它帮你建立团队语言', '当团队有共同语言，讨论问题才不会只剩情绪和指责。'],
                ['它帮你沉淀管理方法', '把一次次项目经验、协作经验、复盘经验，变成可复用的组织能力。'],
              ].map(([t, d], i) => (
                <div key={t} className="rounded-[18px] bg-os-paper ring-1 ring-os-line shadow-os p-6 text-left">
                  <div className="font-serif-display text-[22px] font-semibold text-os-blue/80">{i + 1}</div>
                  <div className="mt-2 font-serif-display text-[17px] font-semibold text-os-navy">{t}</div>
                  <p className="mt-2 text-[13.5px] leading-7 text-os-muted">{d}</p>
                </div>
              ))}
            </div>
          </Reveal>
          <Reveal delay={220}>
            <p className="mt-12 text-center text-[15px] leading-[1.9] text-os-muted">组织最大的浪费，是每一次犯错都像第一次发生。</p>
          </Reveal>
        </ScreenWrap>

        {/* 14 最后收束屏 */}
        <div ref={closingRef}>
          <section className="relative bg-gradient-to-br from-[#F7F8FC] via-[#EFF0FC] to-[#EAEBF9] overflow-hidden">
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute top-[10%] left-[40%] w-[40%] h-[60%] rounded-full bg-os-blue/[0.05] blur-[120px]" />
            </div>
            <div className="relative mx-auto w-full max-w-[1100px] px-5 sm:px-6 lg:px-8 py-24 sm:py-32">
              <div className="text-center max-w-3xl mx-auto">
                <Reveal>
                  <h2 className="font-serif-display text-[30px] sm:text-[40px] lg:text-[46px] font-semibold leading-[1.25] tracking-tight text-os-navy">
                    让组织持续学习，<br className="hidden sm:block" /><span className="text-os-blue">让战略自驱生长。</span>
                  </h2>
                </Reveal>
                <Reveal delay={120}>
                  <p className="mt-7 text-[15.5px] sm:text-[17px] leading-[1.9] text-os-muted">这个时代，真正能走远的组织，不只是跑得快，而是能不断看见自己、修正自己、更新自己。</p>
                </Reveal>
              </div>
              <Reveal delay={220}>
                <div className="mt-14 mx-auto max-w-[760px] rounded-[24px] bg-os-paper ring-1 ring-os-line shadow-os-lg p-8 sm:p-10">
                  <div className="grid sm:grid-cols-2 gap-x-6 gap-y-3.5">
                    {['帮你看清组织问题', '帮你建立团队语言', '帮你沉淀管理方法', '附赠益语智库终身会员'].map((r) => (
                      <div key={r} className="flex items-start gap-2.5 text-[14.5px] leading-7 text-os-ink/85"><Check className="mt-1 h-4 w-4 shrink-0 text-os-blue" /><span>{r}</span></div>
                    ))}
                  </div>
                  <div className="mt-8 pt-7 border-t border-os-line/80 flex flex-wrap items-end justify-between gap-5">
                    <div>
                      <div className="flex items-baseline gap-2">
                        <span className="font-serif-display text-[44px] font-semibold leading-none text-os-ink">¥{BOOK_ORG.priceYuan}</span>
                        <span className="inline-flex items-center rounded-full bg-os-mist px-3 py-1 text-[12px] font-medium text-os-blue ring-1 ring-os-blue/20">含终身会员</span>
                      </div>
                      <div className="mt-2 text-[12.5px] text-os-muted/80">{LIFETIME_TAGLINE}</div>
                    </div>
                    <button onClick={handleBuy} className="inline-flex items-center justify-center gap-2 rounded-xl bg-os-navy px-8 py-3.5 text-[15px] font-medium text-white shadow-[0_10px_30px_-10px_rgba(22,38,94,0.6)] transition hover:bg-os-navy-700">
                      <Crown className="h-4 w-4" />立即购买
                    </button>
                  </div>
                </div>
              </Reveal>
              <Reveal delay={320}>
                <p className="mt-10 text-center font-serif-display text-[18px] sm:text-[20px] leading-[1.7] italic text-os-navy/85">
                  学习型组织的意义，不是让组织更会学习，而是让组织更有能力面对未来。
                </p>
              </Reveal>
              <Reveal delay={420}>
                <div className="mt-12 mx-auto max-w-[760px] flex flex-wrap items-center justify-between gap-4 rounded-[18px] border border-os-line bg-os-mist/40 px-6 py-5">
                  <div>
                    <div className="font-serif-display text-[16px] font-semibold text-os-ink">想两本一起带走？</div>
                    <div className="mt-1 text-[13px] text-os-muted">合购《51 个问题》+《学习型组织笔记》仅 ¥{BUNDLE_PRICE}，立省 50</div>
                  </div>
                  <button onClick={() => onNavigate('book-detail', 'book_bundle')} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-os-navy to-os-indigo px-6 py-3 text-[14px] font-medium text-white shadow-[0_10px_30px_-10px_rgba(22,38,94,0.6)] transition hover:brightness-110">
                    <Crown className="h-4 w-4" />看合购套装
                  </button>
                </div>
              </Reveal>
            </div>
          </section>
        </div>
      </main>

      <OpenSourceFooter />
      <StickyBuyBar visible={showStickyBar} onBuy={handleBuy} book={BOOK_ORG} />
    </div>
  );
}

function OrgDeepScreen({ no, label, title, img, body, questions, line, tone }: {
  no: string; label: string; title: string; img: string; body: string; questions?: string[]; line: string; tone?: 'canvas' | 'mist';
}) {
  return (
    <ScreenWrap tone={tone}>
      <div className="max-w-[1000px] mx-auto">
        <Reveal>
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-os-navy text-white font-serif-display text-[18px] font-semibold">{no}</span>
            <span className="text-[12px] font-semibold tracking-[0.2em] text-os-blue uppercase">{label}</span>
          </div>
        </Reveal>
        <Reveal delay={80}>
          <h2 className="mt-5 font-serif-display text-[26px] sm:text-[34px] lg:text-[38px] font-semibold leading-[1.3] tracking-tight text-os-navy">{title}</h2>
        </Reveal>
        <Reveal delay={140}>
          <div className="mt-8"><PlanImage src={img} alt={`${label} · 配图`} /></div>
        </Reveal>
        <Reveal delay={200}>
          <p className="mt-8 max-w-3xl text-[15px] sm:text-[16px] leading-[1.95] text-os-muted">{body}</p>
        </Reveal>
        {questions && (
          <Reveal delay={260}>
            <div className="mt-7 grid sm:grid-cols-2 gap-3">
              {questions.map((q, i) => (
                <div key={q} className="flex items-start gap-3 rounded-[14px] bg-os-paper ring-1 ring-os-line px-4 py-3.5 text-[14.5px] font-medium text-os-ink">
                  <span className="font-serif-display text-[14px] font-semibold text-os-blue/70 leading-6">{String(i + 1).padStart(2, '0')}</span><span>{q}</span>
                </div>
              ))}
            </div>
          </Reveal>
        )}
        <Reveal delay={320}>
          <p className="mt-9 font-serif-display text-[19px] sm:text-[22px] leading-[1.7] text-os-navy">{line}</p>
        </Reveal>
      </div>
    </ScreenWrap>
  );
}

// ============================================================
// 简版兜底 (book_org / book_bundle)
// ============================================================
function BookDetailSimple({ planId, onNavigate }: { planId: string; onNavigate: (page: string, id?: string) => void }) {
  const isBundle = planId === 'book_bundle';
  const book = getBookByPlanId(planId);

  const covers = isBundle ? [BOOK_51, BOOK_ORG] : book ? [book] : [BOOK_51];
  const title = isBundle ? '两本合购套装' : book?.title || '书籍';
  const enTitle = isBundle ? 'THE COMPLETE SET · 51 QUESTIONS + LEARNING ORGANIZATIONS' : book?.enTitle || '';
  const price = isBundle ? BUNDLE_PRICE : book?.priceYuan ?? 0;
  const tagline = isBundle ? '两本一起带走，再省 50 元 · 同样含终身会员' : book?.tagline || '';
  const intro = isBundle
    ? '一次拥有益语智库的两本核心著作——《创业者应该回答的51个问题》与《学习型组织笔记》。从找对问题到组织进化，覆盖创业者与管理者最需要的两套底层能力。合购立省 50 元，并附赠终身会员。'
    : book?.intro || '';
  const points = isBundle
    ? ['《创业者应该回答的51个问题》完整收录', '《学习型组织笔记》完整收录', `合购立省 50 元 (¥198 + ¥138 → ¥${BUNDLE_PRICE})`, '附赠益语智库终身会员，畅读全部文章与报告']
    : book?.points || [];

  return (
    <div {...getYiyuPageAttrs('book-detail')} className="min-h-screen bg-os-canvas flex flex-col">
      <Header onNavigate={(p) => onNavigate(p)} />

      <main className="flex-1 pt-24 pb-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <button
            onClick={() => onNavigate('home')}
            className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-os-muted hover:text-os-navy transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />返回首页
          </button>

          <div className="grid lg:grid-cols-[420px_1fr] gap-10 lg:gap-14 items-start">
            <div className="flex justify-center gap-5">
              {covers.map((b) => (
                <div
                  key={b.planId}
                  className="relative w-[200px] aspect-[3/4.1] overflow-hidden rounded-r-[10px] rounded-l-[3px] bg-os-paper ring-1 ring-os-line shadow-[0_36px_70px_-28px_rgba(22,38,94,0.5)]"
                >
                  <img src={b.cover} alt={b.title} className="h-full w-full object-cover object-top" />
                  <div className="pointer-events-none absolute inset-y-0 left-0 w-[10px] bg-gradient-to-r from-black/25 via-black/8 to-transparent" />
                </div>
              ))}
            </div>

            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-os-line bg-os-mist/60 px-3 py-1 text-[11px] font-semibold tracking-[0.16em] text-os-blue uppercase">
                <Crown className="h-3.5 w-3.5" /> 益语智库出品
              </div>
              <div className="mt-4 text-[11px] font-semibold tracking-[0.14em] text-os-blue/80 uppercase leading-relaxed">{enTitle}</div>
              <h1 className="mt-2 font-serif-display text-[30px] sm:text-[38px] font-semibold leading-tight tracking-tight text-os-ink">{title}</h1>
              <p className="mt-2 text-[14px] text-os-muted">{tagline}</p>
              <p className="mt-6 text-[15px] leading-[1.85] text-os-muted">{intro}</p>

              <ul className="mt-6 space-y-2.5">
                {points.map((p) => (
                  <li key={p} className="flex items-start gap-2.5 text-[14px] leading-7 text-os-ink/85">
                    <Check className="mt-1 h-4 w-4 shrink-0 text-os-blue" />{p}
                  </li>
                ))}
              </ul>

              <div className="mt-8 flex flex-wrap items-center gap-4 rounded-[20px] border border-os-line bg-os-paper p-6">
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="font-serif-display text-[40px] font-semibold text-os-ink">¥{price}</span>
                    <span className="rounded-full bg-os-mist px-3 py-1 text-[12px] font-medium text-os-blue ring-1 ring-os-blue/20">含终身会员</span>
                  </div>
                  <div className="mt-1 text-[12px] text-os-muted/70">{LIFETIME_TAGLINE}</div>
                </div>
                <button
                  onClick={() => onNavigate('payment-checkout', planId)}
                  className="ml-auto inline-flex items-center justify-center gap-2 rounded-xl bg-os-navy px-8 py-3.5 text-[15px] font-medium text-white shadow-[0_10px_30px_-10px_rgba(22,38,94,0.6)] transition hover:bg-os-navy-700"
                >
                  <Crown className="h-4 w-4" />立即购买
                </button>
              </div>

              {!isBundle && (
                <div className="mt-4 text-[13px] text-os-muted">
                  想两本一起？
                  <button onClick={() => onNavigate('book-detail', 'book_bundle')} className="ml-1 font-medium text-os-blue hover:text-os-navy underline decoration-os-line">
                    合购套装 ¥{BUNDLE_PRICE}（省 50）
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <OpenSourceFooter />
    </div>
  );
}
