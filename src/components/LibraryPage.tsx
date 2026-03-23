import { useEffect, useMemo, useState } from 'react';
import { Header } from './Header';
import { Footer } from './Footer';
import { PdfCoverImage } from './PdfCoverImage';
import { BookOpen, Wrench, ArrowRight } from 'lucide-react';
import { ContentResourceCard } from './ContentResourceCard';
import { getBooks, getMethodologies, type Book as StoredBook, type Methodology as StoredMethodology } from '../lib/dataService';

interface Book {
  id: string;
  title: string;
  author: string;
  description: string;
  topics: string[];
  views: number;
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
  coverImage?: string;
  views?: number;
  likes?: number;
  favoritesCount?: number;
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
        description: b.description || b.abstract || '',
        topics: (b.topics || []) as any,
        views: b.views,
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
        coverImage: m.coverImage,
        views: m.views,
        likes: m.likes,
        favoritesCount: m.favoritesCount,
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

  const visibleBooks = useMemo(() => {
    const list = books;
    return showAllBooks ? list : list.slice(0, 3);
  }, [books, showAllBooks]);

  const visibleMethodologies = useMemo(() => {
    const list = methodologies;
    return showAllMethodologies ? list : list.slice(0, 3);
  }, [methodologies, showAllMethodologies]);

  const handleBookClick = (bookId: string) => {
    if (onNavigate) {
      onNavigate('book-reader', bookId);
    } else {
      window.location.href = `?page=book-reader&bookId=${bookId}`;
    }
  };

  return (
    <div data-yiyu-page="learning" className="min-h-screen bg-background">
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
                <ContentResourceCard
                  key={book.id}
                  cover={
                    book.coverImage ? (
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
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <BookOpen className="w-16 h-16 text-success/10" />
                      </div>
                    )
                  }
                  tags={book.topics || []}
                  title={book.title}
                  author={book.author}
                  excerpt={book.description}
                  views={book.views}
                  likes={(book as any).likes}
                  favorites={(book as any).favoritesCount}
                  publishDate={book.date}
                  onClick={() => handleBookClick(book.id)}
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
                <ContentResourceCard
                  key={m.id}
                  cover={
                    m.coverImage ? (
                      <img
                        src={m.coverImage}
                        alt={m.title}
                        className="absolute inset-0 w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Wrench className="w-16 h-16 text-primary/10" />
                      </div>
                    )
                  }
                  tags={m.topics || []}
                  title={m.title}
                  excerpt={m.excerpt}
                  views={m.views}
                  likes={m.likes}
                  favorites={m.favoritesCount}
                  publishDate={m.publishDate}
                  onClick={() => {
                    // open reader view
                    if (onNavigate) onNavigate('methodology-library', m.id);
                    else
                      window.location.assign(
                        `${window.location.pathname}?page=methodology-library&id=${encodeURIComponent(m.id)}`
                      );
                  }}
                />
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

export default LibraryPage;
