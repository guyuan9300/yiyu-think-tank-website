import { useEffect, useMemo, useState } from 'react';
import { Header } from './Header';
import { Footer } from './Footer';
import { PdfCoverImage } from './PdfCoverImage';
import { BookOpen, Star, Eye, User, ChevronRight, Wrench, ArrowRight } from 'lucide-react';
import { getBooks, getMethodologies, type Book as StoredBook, type Methodology as StoredMethodology } from '../lib/dataService';

interface Book {
  id: string;
  title: string;
  author: string;
  description: string;
  abstract: string;
  topics: string[];
  valuePoints?: string[];
  pages: number;
  duration: string;
  rating: number;
  views: number;
  reviewCount: number;
  date: string;
  coverColor?: string;
  /** Optional: manual/auto cover image (DataURL or URL). */
  coverImage?: string;
  /** Optional: if present, we can render a real PDF cover on the card. */
  pdfUrl?: string;
}

interface LibraryPageProps {
  onNavigate?: (
    page:
      | 'home'
      | 'insights'
      | 'learning'
      | 'strategy'
      | 'about'
      | 'book-reader'
      | 'login'
      | 'register'
      | 'case'
      | 'admin'
      | 'user-center'
      | 'test'
      | 'my-learning'
      | 'strategy-companion'
      | 'report-library'
      | 'article-center'
      | 'book-library'
      | 'methodology-library',
    bookId?: string,
    caseId?: string
  ) => void;
}

interface MethodologyCardData {
  id: string;
  title: string;
  excerpt: string;
  topics: string[];
  publishDate: string;
}

export function LibraryPage({ onNavigate }: LibraryPageProps) {
  // 图书馆：按需求隐藏标签筛选（topics 筛选后续如果需要再加回来）
  const [books, setBooks] = useState<Book[]>([]);
  const [methodologies, setMethodologies] = useState<MethodologyCardData[]>([]);
  const [showAllBooks, setShowAllBooks] = useState(false);
  const [showAllMethodologies, setShowAllMethodologies] = useState(false);

  useEffect(() => {
    const load = () => {
      // books
      const raw = getBooks();
      const published = raw.filter((b) => b.status === 'published');
      const mapped: Book[] = published.map((b: StoredBook) => ({
        id: b.id,
        title: b.title,
        author: b.author,
        description: b.description,
        abstract: b.abstract,
        topics: (b.topics || []) as any,
        pages: b.pages,
        duration: b.duration,
        rating: b.rating,
        views: b.views,
        reviewCount: b.reviews,
        date: b.publishDate,
        coverColor: b.coverColor,
        coverImage: b.coverImage,
        // Scheme1: published static URL (/yiyu-think-tank-website/docs/xxx.pdf)
        pdfUrl: b.fileUrl ? (b.fileUrl.startsWith('http') ? b.fileUrl : `${window.location.origin}${b.fileUrl}`) : undefined,
      }));
      setBooks(mapped);

      // methodologies
      const rawMethods = getMethodologies();
      const publishedMethods = rawMethods.filter((m: StoredMethodology) => m.status === 'published');
      const methodCards: MethodologyCardData[] = publishedMethods.map((m: StoredMethodology) => ({
        id: m.id,
        title: m.title,
        excerpt: m.excerpt,
        topics: (m.topics || []) as any,
        publishDate: m.publishDate,
      }));
      setMethodologies(methodCards);
    };

    load();
    const onChange = () => load();
    window.addEventListener('storage', onChange);
    window.addEventListener('yiyu_data_change', onChange);
    return () => {
      window.removeEventListener('storage', onChange);
      window.removeEventListener('yiyu_data_change', onChange);
    };
  }, []);

  const getCategoryColor = (topic: string) => {
    const colors: Record<string, string> = {
      '战略': 'bg-blue-100 text-blue-700',
      '业务设计': 'bg-orange-100 text-orange-700',
      '组织': 'bg-green-100 text-green-700',
      'AI 技术': 'bg-purple-100 text-purple-700',
    };
    return colors[topic] || 'bg-gray-100 text-gray-700';
  };

  const visibleBooks = useMemo(() => {
    const list = books;
    return showAllBooks ? list : list.slice(0, 6);
  }, [books, showAllBooks]);

  const visibleMethodologies = useMemo(() => {
    const list = methodologies;
    return showAllMethodologies ? list : list.slice(0, 6);
  }, [methodologies, showAllMethodologies]);

  const handleBookClick = (bookId: string) => {
    if (onNavigate) {
      onNavigate('book-reader', bookId);
    } else {
      window.location.href = `?page=book-reader&bookId=${bookId}`;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header isLoggedIn={false} userType="visitor" onNavigate={(p) => onNavigate?.(p as any)} />

      {/* Hero 区域：对齐「前沿洞察」样式 */}
      <section className="relative pt-28 sm:pt-32 pb-16 sm:pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.02] to-transparent" />
        <div className="relative max-w-[1200px] mx-auto">
          <div className="flex items-end justify-between gap-6">
            <div>
              <h1 className="text-[48px] sm:text-[56px] lg:text-[64px] font-semibold leading-[1.05] tracking-[-0.025em] mb-3">
                学习中心
              </h1>
              <p className="text-[13px] text-muted-foreground/50 tracking-[0.15em] uppercase font-medium">
                Learning Center
              </p>
              <p className="mt-4 text-[21px] text-muted-foreground/70 leading-[1.5] max-w-3xl font-light">
                书库 · 工具与方法论（持续沉淀与回顾）
              </p>
            </div>

            {/* 右上角：保留“我的学习”，移除“书库”图标按钮 */}
            <div className="hidden sm:flex items-center">
              <button
                type="button"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white border border-border/60 hover:border-primary/40 transition-all shadow-sm text-[14px]"
                onClick={() => {
                  if (onNavigate) onNavigate('my-learning');
                  else window.location.assign(`${window.location.pathname}?page=my-learning`);
                }}
              >
                <User className="w-4 h-4 text-muted-foreground/70" />
                <span className="font-medium text-muted-foreground/70">我的学习</span>
                <ChevronRight className="w-4 h-4 text-muted-foreground/60" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 内容区域 */}
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 pb-24 sm:pb-32">
        {/* 图书馆 */}
        <section className="mb-20">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-success/10 to-accent/10 flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-success" />
              </div>
              <div>
                <h2 className="text-[32px] font-semibold tracking-[-0.02em] mb-1">图书馆</h2>
                <p className="text-[15px] text-muted-foreground/60">精选书单与学习资料</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onNavigate?.('book-library')}
              className="inline-flex items-center gap-2 text-[14px] text-muted-foreground/70 hover:text-foreground transition-colors"
            >
              <span>查看更多</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {visibleBooks.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {visibleBooks.map((book) => (
                <BookCard
                  key={book.id}
                  book={book}
                  onClick={() => handleBookClick(book.id)}
                  getCategoryColor={getCategoryColor}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-20 text-muted-foreground/70">暂无书籍</div>
          )}
        </section>

        {/* 工具/方法论 */}
        <section>
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center">
                <Wrench className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h2 className="text-[32px] font-semibold tracking-[-0.02em] mb-1">工具/方法论</h2>
                <p className="text-[15px] text-muted-foreground/60">益语方法论与可复用工具</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onNavigate?.('methodology-library')}
              className="inline-flex items-center gap-2 text-[14px] text-muted-foreground/70 hover:text-foreground transition-colors"
            >
              <span>查看更多</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {visibleMethodologies.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {visibleMethodologies.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    // open reader view
                    window.location.assign(
                      `${window.location.pathname}?page=methodology-library&id=${encodeURIComponent(m.id)}`
                    );
                  }}
                  className="relative bg-white/80 backdrop-blur-sm rounded-[20px] border border-border/40 overflow-hidden text-left cursor-pointer group hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-1 transition-all duration-300"
                >
                  <div className="relative aspect-[16/10] bg-gradient-to-br from-primary/[0.03] to-accent/[0.03] overflow-hidden">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Wrench className="w-12 h-12 text-primary/10" />
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>

                  <div className="p-6">
                    <div className="flex items-center gap-2 mb-3 flex-wrap">
                      {(m.topics || []).slice(0, 2).map((t) => (
                        <span
                          key={t}
                          className="px-2.5 py-1 rounded-full bg-primary/8 text-primary text-[11px] font-medium border border-primary/15"
                        >
                          {t}
                        </span>
                      ))}
                      <span className="text-[12px] text-muted-foreground/50">{m.publishDate}</span>
                    </div>
                    <h3 className="text-[16px] font-semibold mb-2 line-clamp-2">{m.title}</h3>
                    <p className="text-[13px] text-muted-foreground/70 line-clamp-3 leading-relaxed">{m.excerpt}</p>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-20 text-muted-foreground/70">暂无方法论</div>
          )}
        </section>
      </div>

      {/* Footer */}
      <Footer onNavigate={(p) => onNavigate?.(p)} />


    </div>
  );
}

function BookCard({ book, onClick, getCategoryColor }: { book: Book; onClick: () => void; getCategoryColor: (category: string) => string }) {
  return (
    <div
      onClick={onClick}
      className="relative bg-white/80 backdrop-blur-sm rounded-[20px] border border-border/40 overflow-hidden cursor-pointer group hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-1 transition-all duration-300"
    >
      {/* Cover */}
      <div className={`h-36 bg-gradient-to-br ${book.coverColor || 'from-muted/50 to-muted/30'} flex items-center justify-center relative p-4 overflow-hidden`}>
        {book.coverImage ? (
          <img
            src={book.coverImage}
            alt={book.title}
            className="absolute inset-0 w-full h-full object-cover"
            loading="lazy"
          />
        ) : book.pdfUrl ? (
          <PdfCoverImage
            pdfUrl={book.pdfUrl}
            alt={book.title}
            className="absolute inset-0"
            width={520}
          />
        ) : null}
        {/* Rating */}
        <div className="absolute top-3 right-3 flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/90 backdrop-blur-sm shadow-sm">
          <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
          <span className="text-[12px] font-medium text-foreground">{book.rating}</span>
        </div>

        {/* Icon */}
        <div className={`w-14 h-14 rounded-[16px] bg-white/90 backdrop-blur-sm shadow-md flex items-center justify-center transform group-hover:scale-110 transition-transform duration-300 ${book.pdfUrl ? 'opacity-0' : ''}`}>
          <BookOpen className="w-7 h-7 text-white" />
        </div>
      </div>

      {/* Content */}
      <div className="p-5">
        {/* Category */}
        <div className="flex items-center gap-2 mb-3">
          <span className={`px-2.5 py-1 rounded-full text-[11px] font-medium border ${getCategoryColor((book.topics || [])[0] || '')}`}>
            {(book.topics || [])[0] || '—'}
          </span>
        </div>

        {/* Title */}
        <h3 className="font-medium text-[16px] text-foreground mb-2 group-hover:text-primary transition-colors line-clamp-1">
          {book.title}
        </h3>

        {/* Description */}
        <p className="text-[13px] text-muted-foreground/70 mb-4 line-clamp-2 leading-relaxed">
          {book.description}
        </p>

        {/* Value Points Preview */}
        <div className="flex items-center gap-1.5 mb-4 flex-wrap">
          {(book.valuePoints && book.valuePoints.length > 0 ? book.valuePoints : (book.topics || []))
            .slice(0, 2)
            .map((point, index) => (
              <span key={index} className="px-2 py-0.5 rounded bg-success/10 text-success/80 text-[11px]">
                {String(point).substring(0, 12)}...
              </span>
            ))}
        </div>

        {/* Meta */}
        <div className="flex items-center justify-between text-[12px] text-muted-foreground/50 pt-4 border-t border-border/40">
          <div className="flex items-center gap-4">
            <span>{book.pages}页</span>
            <span>{book.duration}</span>
            <span>{book.views.toLocaleString()}</span>
          </div>
          <span>{book.date}</span>
        </div>
      </div>

      {/* Hover Overlay */}
      <div className="absolute inset-0 bg-foreground/90 backdrop-blur-sm flex items-center justify-center transition-all duration-300 opacity-0 group-hover:opacity-100">
        <button className="inline-flex items-center gap-2 px-6 py-3 bg-white rounded-full text-[14px] font-medium shadow-lg transform transition-all hover:scale-105">
          <Eye className="w-4 h-4" />
          <span>开始阅读</span>
        </button>
      </div>
    </div>
  );
}

export default LibraryPage;
