import { useState } from 'react';
import { ArrowRight, Crown, Check } from 'lucide-react';
import { Section, Container, Reveal } from '../ui';
import { useLang, type Bilingual } from '../../../lib/i18n';

// ============================================================
// 书籍展示 · 两本立着的实体书 + 鼠标悬停切换右侧介绍
//   鼠标移到左侧书 → 右侧介绍《创业者应该回答的51个问题》
//   鼠标移到右侧书 → 右侧介绍《学习型组织笔记》
//   封面已含书名, 介绍面板不重复书名(只放英文副标 + 卖点 + 价格)。
//   定价均含一年会员; 两本合购再省 50。
// ============================================================

type Side = 'left' | 'right';

interface BookDef {
  side: Side;
  cover: string;
  title: Bilingual;
  enTitle: string;
  priceYuan: number;
  tagline: Bilingual;
  intro: Bilingual;
  points: Bilingual[];
  planId: string;
}

const BOOKS: BookDef[] = [
  {
    side: 'left',
    cover: '/images/books/book-51-questions-cover.png',
    title: { zh: '创业者应该回答的51个问题', en: 'The 51 Questions Every Founder Should Answer' },
    enTitle: 'THE 51 QUESTIONS THAT ENTREPRENEURS SHOULD ANSWER',
    priceYuan: 198,
    tagline: { zh: '看机会 · 找对人 · 通模式 · 能增长', en: 'Spot the opportunity · Find the right people · Crack the model · Drive growth' },
    intro: {
      zh: '把创业路上必须想清楚的 51 个关键问题，按「看机会、找对人、通模式、能增长」四个阶段系统梳理。不是灵感清单，而是一套可复制、可积累的底层判断框架。',
      en: 'A systematic walk through the 51 questions every founder must answer, organized into four stages: spotting the opportunity, finding the right people, cracking the model, and driving growth. Not a list of inspiration, but a repeatable, compounding framework for judgment.',
    },
    points: [
      { zh: '51 个必答问题，覆盖从 0 到 1 全流程', en: '51 must-answer questions across the full 0-to-1 journey' },
      { zh: '四大能力模块逐一拆解', en: 'Four capability modules, broken down one by one' },
      { zh: '边读边答，沉淀你自己的创业答卷', en: 'Answer as you read, and build your own founder’s playbook' },
    ],
    planId: 'book_51',
  },
  {
    side: 'right',
    cover: '/images/books/book-learning-org.png',
    title: { zh: '学习型组织笔记', en: 'Notes on Learning Organizations' },
    enTitle: 'NOTES ON LEARNING ORGANIZATIONS',
    priceYuan: 138,
    tagline: { zh: '让组织持续学习 · 让战略自驱生长', en: 'Keep the organization learning · Let strategy grow on its own' },
    intro: {
      zh: '一本写给管理者的学习型组织实践笔记。从改变心智模式、建立共同愿景，到系统思考与自我超越——让组织真正具备持续进化的能力。',
      en: 'A practitioner’s notebook on learning organizations, written for managers. From shifting mental models and building shared vision to systems thinking and personal mastery — giving an organization the real capacity to keep evolving.',
    },
    points: [
      { zh: '改变心智模式，培养创新文化', en: 'Shift mental models, grow a culture of innovation' },
      { zh: '共同愿景：团队力量的来源', en: 'Shared vision: the source of a team’s strength' },
      { zh: '系统思考，避免短视行为', en: 'Systems thinking that avoids short-sighted moves' },
    ],
    planId: 'book_org',
  },
];

const BUNDLE_PRICE = BOOKS[0].priceYuan + BOOKS[1].priceYuan - 50; // 286

interface BooksShowcaseProps {
  onNavigate?: (page: string, id?: string) => void;
}

export function BooksShowcase({ onNavigate }: BooksShowcaseProps) {
  const { t } = useLang();
  const [active, setActive] = useState<Side>('left');
  const book = BOOKS.find((b) => b.side === active) || BOOKS[0];

  return (
    <Section id="books" tone="paper">
      <Container>
        <Reveal>
          <div className="mx-auto max-w-3xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-os-line bg-os-mist/60 px-3 py-1 text-[11px] font-semibold tracking-[0.16em] text-os-blue uppercase">
              <Crown className="h-3.5 w-3.5" /> {t({ zh: '益语智库出品 · 两本好书', en: 'From Yiyu Institute · Two Books Worth Reading' })}
            </div>
            <h2 className="mt-5 font-serif-display text-[30px] sm:text-[40px] font-semibold leading-[1.2] tracking-tight text-os-ink">
              {t({ zh: '从想法到现实，', en: 'From idea to reality,' })}
              <br className="hidden sm:block" />
              {t({ zh: '中间隔着一套可复制的能力', en: 'a repeatable set of capabilities stands in between' })}
            </h2>
            <p className="mt-4 text-[15px] leading-7 text-os-muted">
              {t({ zh: '我们把陪伴众多创业者沉淀下来的方法，写成两本书。', en: 'We turned the methods distilled from working with many founders into two books.' })}
              <span className="font-medium text-os-ink">{t({ zh: '购买任意一本，即成为益语智库一年会员', en: 'Buy either one to become a one-year member of Yiyu Institute' })}</span>{t({ zh: '，畅读全部文章与报告。', en: ', with full access to all articles and reports.' })}
            </p>
          </div>
        </Reveal>

        {/* 左: 两本立着的实体书 (悬停切换)  右: 介绍面板 */}
        <div className="mt-14 grid lg:grid-cols-[440px_1fr] gap-10 lg:gap-16 items-center">
          {/* 书架 */}
          <Reveal>
            <div className="flex items-end justify-center gap-7 sm:gap-9">
              {BOOKS.map((b) => {
                const isActive = active === b.side;
                return (
                  <button
                    key={b.side}
                    type="button"
                    onMouseEnter={() => setActive(b.side)}
                    onFocus={() => setActive(b.side)}
                    onClick={() => onNavigate?.('book-detail', b.planId)}
                    aria-label={`${t({ zh: '了解', en: 'Learn about' })} ${t(b.title)}`}
                    className="group relative shrink-0 outline-none"
                  >
                    {/* 实体书: 封面 + 书脊 + 立体投影 + 悬停上抬 */}
                    <div
                      className={`relative w-[156px] sm:w-[188px] aspect-[3/4.1] overflow-hidden rounded-r-[10px] rounded-l-[3px] bg-os-paper
                        ring-1 ring-os-line transition-all duration-500 ease-out
                        ${isActive
                          ? '-translate-y-2.5 shadow-[0_40px_72px_-26px_rgba(22,38,94,0.55)] ring-os-navy/25'
                          : 'shadow-[0_20px_46px_-26px_rgba(22,38,94,0.42)] group-hover:-translate-y-1'}
                      `}
                    >
                      <img src={b.cover} alt={t(b.title)} className="h-full w-full object-cover object-top" />
                      {/* 书脊渐变(左缘) + 顶光, 让平面图有"书"的体积感 */}
                      <div className="pointer-events-none absolute inset-y-0 left-0 w-[10px] bg-gradient-to-r from-black/25 via-black/8 to-transparent" />
                      <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-transparent via-transparent to-white/10" />
                      {/* 非激活压暗, 聚焦激活那本 */}
                      <div className={`pointer-events-none absolute inset-0 bg-os-navy/18 transition-opacity duration-500 ${isActive ? 'opacity-0' : 'opacity-100'}`} />
                    </div>
                    {/* 书名 + 价格 (封面下方, 不叠字) */}
                    <div className="mt-3.5 w-[156px] sm:w-[188px] text-center">
                      <div className={`text-[13px] font-semibold leading-snug transition-colors ${isActive ? 'text-os-navy' : 'text-os-muted'}`}>
                        {t(b.title)}
                      </div>
                      <div className="mt-0.5 text-[12px] text-os-muted/70">¥{b.priceYuan} · {t({ zh: '含一年会员', en: 'One-Year Membership Incl.' })}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </Reveal>

          {/* 介绍面板 (随悬停切换, key 触发淡入) */}
          <Reveal delay={120}>
            <div key={book.side} className="animate-fade-in rounded-[24px] border border-os-line bg-os-canvas/60 p-7 sm:p-9">
              <div className="text-[11px] font-semibold tracking-[0.16em] text-os-blue uppercase leading-relaxed">{book.enTitle}</div>
              <h3 className="mt-2 font-serif-display text-[26px] sm:text-[30px] font-semibold leading-tight tracking-tight text-os-ink">
                {t(book.title)}
              </h3>
              <p className="mt-1.5 text-[13px] text-os-muted">{t(book.tagline)}</p>
              <p className="mt-5 text-[15px] leading-7 text-os-muted">{t(book.intro)}</p>
              <ul className="mt-5 space-y-2">
                {book.points.map((p) => (
                  <li key={p.zh} className="flex items-start gap-2.5 text-[14px] leading-6 text-os-ink/80">
                    <Check className="mt-1 h-4 w-4 shrink-0 text-os-blue" />{t(p)}
                  </li>
                ))}
              </ul>
              <div className="mt-7 flex flex-wrap items-center gap-4">
                <span className="font-serif-display text-[30px] font-semibold text-os-ink">¥{book.priceYuan}</span>
                <span className="rounded-full bg-os-mist px-3 py-1 text-[12px] font-medium text-os-blue ring-1 ring-os-blue/20">{t({ zh: '含一年会员', en: 'One-Year Membership Incl.' })}</span>
                <button
                  type="button"
                  onClick={() => onNavigate?.('book-detail', book.planId)}
                  className="ml-auto inline-flex items-center justify-center gap-2 rounded-xl bg-os-navy px-6 py-3 text-[14px] font-medium text-white shadow-[0_10px_30px_-10px_rgba(22,38,94,0.6)] transition hover:bg-os-navy-700"
                >
                  {t({ zh: '了解并购买', en: 'Learn More & Buy' })} <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </Reveal>
        </div>

        {/* 合购优惠条 */}
        <Reveal delay={160}>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 rounded-[20px] border border-os-line bg-os-mist/40 px-6 py-5">
            <div>
              <div className="font-serif-display text-[18px] font-semibold text-os-ink">{t({ zh: '两本一起带走，再省 50 元', en: 'Take both and save another ¥50' })}</div>
              <div className="mt-1 text-[13px] text-os-muted">
                {t({ zh: '单买', en: 'Bought separately' })} ¥{BOOKS[0].priceYuan} + ¥{BOOKS[1].priceYuan} = ¥{BOOKS[0].priceYuan + BOOKS[1].priceYuan}{t({ zh: '，合购仅', en: '; bundle for only' })}
                <span className="font-semibold text-os-ink"> ¥{BUNDLE_PRICE}</span> · {t({ zh: '同样含一年会员', en: 'one-year membership included' })}
              </div>
            </div>
            <button
              type="button"
              onClick={() => onNavigate?.('book-detail', 'book_bundle')}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-os-navy to-os-indigo px-7 py-3 text-[14px] font-medium text-white shadow-[0_10px_30px_-10px_rgba(22,38,94,0.6)] transition hover:brightness-110"
            >
              <Crown className="h-4 w-4" />{t({ zh: '两本合购', en: 'Bundle Both' })} ¥{BUNDLE_PRICE}
            </button>
          </div>
        </Reveal>

        <p className="mt-6 text-center text-[12px] text-os-muted/70">{t({ zh: '所有收入用于为行动者加电', en: 'All proceeds go to powering up actioners' })}</p>
      </Container>
    </Section>
  );
}
