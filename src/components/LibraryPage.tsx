import { useEffect, useMemo, useState } from 'react';
import { Header } from './Header';
import { Footer } from './Footer';
import { PdfCoverImage } from './PdfCoverImage';
import { BookOpen, Star, Eye, User, ChevronRight } from 'lucide-react';
import { getBooks, type Book as StoredBook } from '../lib/dataService';

interface Book {
  id: string;
  title: string;
  author: string;
  description: string;
  abstract: string;
  category: string;
  tags: string[];
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
      | 'article-center',
    bookId?: string,
    caseId?: string
  ) => void;
}

export function LibraryPage({ onNavigate }: LibraryPageProps) {
  const [activeCategory, setActiveCategory] = useState('all');

  const categories = [
    { id: 'all', label: '全部' },
    { id: 'ai', label: '人工智能' },
    { id: 'business', label: '商业思维' },
    { id: 'management', label: '管理实战' },
    { id: 'strategy', label: '战略' },
    { id: 'data', label: '数据分析' },
    { id: 'organization', label: '组织发展' },
  ];
  const [books, setBooks] = useState<Book[]>([]);

  useEffect(() => {
    const load = () => {
      const raw = getBooks();
      const published = raw.filter((b) => b.status === 'published');
      const mapped: Book[] = published.map((b: StoredBook) => ({
        id: b.id,
        title: b.title,
        author: b.author,
        description: b.description,
        abstract: b.abstract,
        category: b.category,
        tags: b.tags || [],
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

  const filteredBooks = books.filter(book => {
    if (activeCategory === 'all') return true;
    const categoryMap: Record<string, string[]> = {
      'ai': ['人工智能'],
      'business': ['商业思维'],
      'management': ['管理实战'],
      'strategy': ['战略'],
      'data': ['数据分析'],
      'organization': ['组织发展']
    };
    return categoryMap[activeCategory]?.includes(book.category);
  });

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      '战略': 'bg-blue-100 text-blue-700',
      '人工智能': 'bg-purple-100 text-purple-700',
      '商业思维': 'bg-orange-100 text-orange-700',
      '管理实战': 'bg-green-100 text-green-700',
      '数据分析': 'bg-cyan-100 text-cyan-700',
      '组织发展': 'bg-pink-100 text-pink-700',
    };
    return colors[category] || 'bg-gray-100 text-gray-700';
  };

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

      {/* Hero Section */}
      <section className="pt-32 pb-12 px-4 sm:px-6 lg:px-8 border-b border-border/40">
        <div className="max-w-[1200px] mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-10">
            <div>
              <h1 className="text-[32px] font-semibold tracking-tight text-foreground mb-2">
                学习中心
              </h1>
              <p className="text-[15px] text-muted-foreground/70">
                书库 · 我的学习（持续沉淀与回顾）
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white border border-border/60 hover:border-primary/40 transition-all shadow-sm text-[14px]"
                onClick={() => {
                  // 当前页就是“书库”视图：保持不跳转
                  window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
                }}
              >
                <BookOpen className="w-4 h-4 text-muted-foreground/70" />
                <span className="font-medium text-muted-foreground/70">书库</span>
              </button>
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

          {/* Category Tags */}
          <div className="flex items-center gap-2 flex-wrap">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setActiveCategory(category.id)}
                className={`px-5 py-2.5 rounded-full text-[14px] font-medium transition-all duration-300 ${
                  activeCategory === category.id
                    ? 'bg-foreground text-white shadow-lg'
                    : 'bg-white border border-border/60 hover:border-primary/40 text-muted-foreground/70 hover:text-foreground'
                }`}
              >
                {category.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Content */}
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {filteredBooks.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredBooks.map((book) => (
              <BookCard
                key={book.id}
                book={book}
                onClick={() => handleBookClick(book.id)}
                getCategoryColor={getCategoryColor}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-24">
            <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-6">
              <BookOpen className="w-8 h-8 text-muted-foreground/50" />
            </div>
            <h3 className="text-[18px] font-medium mb-2">未找到相关书籍</h3>
            <p className="text-muted-foreground/70 text-[14px]">尝试其他分类</p>
          </div>
        )}
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
          <span className={`px-2.5 py-1 rounded-full text-[11px] font-medium border ${getCategoryColor(book.category)}`}>
            {book.category}
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
          {(book.valuePoints && book.valuePoints.length > 0 ? book.valuePoints : book.tags)
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
