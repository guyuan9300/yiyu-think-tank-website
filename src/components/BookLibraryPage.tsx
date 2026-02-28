import { Header } from './Header';
import { Footer } from './Footer';
import { 
  BookOpen, Search, Filter, Grid3X3, List, Eye, Star, Clock, ChevronRight
} from 'lucide-react';
import { getBooks, type Book } from '../lib/dataService';
import { useState, useEffect, useMemo } from 'react';

export function BookLibraryPage({ onNavigate }: { onNavigate?: (page: string, id?: string) => void }) {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [books, setBooks] = useState<Book[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const tagOptions = useMemo(() => {
    const tags = Array.from(
      new Set(
        books
          .flatMap((b) => (b.topics || []) as any)
          .map((t) => String(t).trim())
          .filter(Boolean)
      )
    );
    tags.sort((a, b) => a.localeCompare(b, 'zh'));
    return [{ id: 'all', label: '全部标签' }, ...tags.map((t) => ({ id: t, label: t }))];
  }, [books]);

  useEffect(() => {
    const loadData = () => {
      const booksData = getBooks();
      setBooks(booksData.filter(b => b.status === 'published'));
      setIsLoading(false);
    };

    loadData();

    const handleStorageChange = () => {
      console.log('检测到数据变化，刷新书籍数据');
      loadData();
    };

    const pollInterval = setInterval(() => {
      const booksData = getBooks();
      const publishedBooks = booksData.filter(b => b.status === 'published');
      if (publishedBooks.length !== books.length ||
          (publishedBooks.length > 0 && publishedBooks[0].id !== (books[0]?.id))) {
        console.log('检测到书籍数据变化，刷新显示');
        loadData();
      }
    }, 1000);

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('yiyu_data_change', handleStorageChange);

    return () => {
      clearInterval(pollInterval);
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('yiyu_data_change', handleStorageChange);
    };
  }, []);

  
  const yearOptions = useMemo(() => {
    const years = Array.from(new Set(books.map((b) => String((b as any).publishDate || (b as any).updatedAt || '').slice(0, 4)).filter(Boolean)));
    years.sort((a, b) => (a < b ? 1 : -1));
    return ['all', ...years];
  }, [books]);

const filteredBooks = useMemo(() => {
    return books.filter(book => {
      const matchesSearch = !searchQuery ||
        book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        book.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        book.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (book.topics || []).some((t: string) => t.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesTag = selectedTag === 'all' || (book.topics || []).map(String).includes(String(selectedTag));
      const year = String(book.publishDate || book.updatedAt || "").slice(0, 4);
      const matchesYear = selectedYear === 'all' || (year && year === selectedYear);
      return matchesSearch && matchesTag && matchesYear;
    });
  }, [books, searchQuery, selectedTag, selectedYear]);

  const handleRefresh = () => {
    setIsLoading(true);
    const booksData = getBooks();
    setBooks(booksData.filter(b => b.status === 'published'));
    setIsLoading(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header onNavigate={onNavigate} />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="w-10 h-10 border-2 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground/70">加载中...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header onNavigate={onNavigate} />

      {/* Page Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-border/40">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex items-center gap-2 text-[13px] text-muted-foreground/60 mb-4">
            <button
              type="button"
              onClick={() => onNavigate?.('learning')}
              className="hover:text-foreground transition-colors"
            >
              学习中心
            </button>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-foreground">图书馆</span>
          </div>
          <h1 className="text-[32px] font-semibold tracking-tight text-foreground mb-2">
            图书馆
          </h1>
          <p className="text-[15px] text-muted-foreground/70">
            汇聚商业、管理、战略等领域经典著作与前沿著作
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-border/40 sticky top-0 z-10">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-wrap items-center gap-4">
            {/* Search */}
            <div className="flex-1 min-w-64 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
              <input
                type="text"
                placeholder="搜索书名、作者、标签..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-muted/50 border border-border/60 rounded-full text-[14px] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all"
              />
            </div>

            {/* topics Filter */}
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground/50" />
              <select
                value={selectedTag}
                onChange={(e) => setSelectedTag(e.target.value)}
                className="px-4 py-2.5 bg-muted/50 border border-border/60 rounded-full text-[14px] text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all cursor-pointer min-w-[120px]"
              >
                {tagOptions.map((opt) => (
                  <option key={String(opt.id)} value={String(opt.id)}>
                    {String(opt.id) === 'all' ? '全部标签' : String((opt as any).label ?? opt.id)}
                  </option>
                ))}
              </select>

              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="px-4 py-2.5 bg-muted/50 border border-border/60 rounded-full text-[14px] text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all cursor-pointer min-w-[120px]"
              >
                {yearOptions.map((y) => (
                  <option key={String(y)} value={String(y)}>
                    {String(y) === 'all' ? '全部年份' : String(y)}
                  </option>
                ))}
              </select>
            </div>

            {/* View Toggle */}
            <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-full">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-full transition-all duration-300 ${viewMode === 'grid' ? 'bg-white shadow-sm text-primary' : 'text-muted-foreground/60 hover:text-foreground'}`}
              >
                <Grid3X3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-full transition-all duration-300 ${viewMode === 'list' ? 'bg-white shadow-sm text-primary' : 'text-muted-foreground/60 hover:text-foreground'}`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1">
        {/* Results Info */}
        <div className="flex items-center justify-between mb-8">
          <p className="text-[14px] text-muted-foreground/70">
            共找到 <span className="text-foreground font-medium">{filteredBooks.length}</span> 本书籍
          </p>
          {/* 刷新按钮已移除 */}
        </div>

        {filteredBooks.length === 0 ? (
          <div className="text-center py-24">
            <BookOpen className="w-14 h-14 mx-auto text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground/70 text-[15px]">暂无书籍</p>
          </div>
        ) : viewMode === 'grid' ? (
          /* Grid View */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredBooks.map((book) => (
              <article 
                key={book.id} 
                className="group cursor-pointer"
                onClick={() => {
                  if (onNavigate) onNavigate('book-reader', book.id);
                  else window.location.assign(`${window.location.pathname}?page=book-reader&bookId=${encodeURIComponent(book.id)}`);
                }}
              >
                <div className="relative bg-white/60 backdrop-blur-sm border border-border/40 rounded-3xl overflow-hidden transition-all duration-500 hover:bg-white/80 hover:border-border/60 hover:shadow-2xl hover:shadow-black/[0.04] hover:-translate-y-1">
                  <div className={`relative aspect-[16/10] bg-gradient-to-br ${book.coverColor || 'from-primary/[0.03] to-accent/[0.03]'} overflow-hidden`}>
                  {book.coverImage ? (
                    <img
                      src={book.coverImage}
                      alt={book.title}
                      className="absolute inset-0 w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-white opacity-20 text-6xl font-bold">
                      {book.title.charAt(0)}
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                    <span className="text-white text-[14px] font-medium">查看详情</span>
                  </div>
                </div>

                <div className="p-6">
                  <h3 className="text-[18px] font-semibold mb-2 line-clamp-2 group-hover:text-primary transition-colors leading-[1.4]">
                    {book.title}
                  </h3>

                  <p className="text-[14px] text-muted-foreground/70 line-clamp-1 leading-[1.6] mb-4">{book.author}</p>

                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {(book.topics || []).slice(0, 3).map((tag: string, index: number) => (
                      <span
                        key={index}
                        className="px-2.5 py-1 rounded-full bg-muted/40 text-muted-foreground/60 text-[11px]"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  <p className="text-[14px] text-muted-foreground/70 line-clamp-2 leading-[1.6] mb-4">
                    {book.description}
                  </p>

                  <div className="flex items-center justify-between pt-4 border-t border-border/30 text-[12px] text-muted-foreground/50">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {book.duration}
                    </span>
                    <span className="flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                      {book.rating}
                    </span>
                  </div>
                </div>
              </div>
            </article>
            ))}
          </div>
        ) : (
          /* List View */
          <div className="space-y-2">
            {filteredBooks.map((book) => (
              <div
                key={book.id}
                className="w-full group flex items-center gap-6 p-6 bg-white/60 backdrop-blur-sm border border-border/40 rounded-3xl hover:bg-white/80 hover:border-border/60 hover:shadow-lg hover:shadow-black/[0.04] transition-all cursor-pointer"
                onClick={() => {
                  if (onNavigate) onNavigate('book-reader', book.id);
                  else window.location.assign(`${window.location.pathname}?page=book-reader&bookId=${encodeURIComponent(book.id)}`);
                }}
              >
                {/* 封面 */}
                <div className="w-32 h-20 rounded-[12px] overflow-hidden flex-shrink-0 bg-gradient-to-br from-primary/[0.03] to-accent/[0.03] relative">
                  {book.coverImage ? (
                    <img
                      src={book.coverImage}
                      alt={book.title}
                      className="absolute inset-0 w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <BookOpen className="w-8 h-8 text-primary/20" />
                    </div>
                  )}
                </div>

                {/* 内容 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    {(book.topics || []).slice(0, 2).map((t, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 bg-primary/8 text-primary text-[11px] font-medium rounded-full"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                  <h3 className="font-medium text-[15px] text-foreground mb-1 truncate group-hover:text-primary transition-colors">
                    {book.title}
                  </h3>
                  <p className="text-[13px] text-muted-foreground/70 line-clamp-1">
                    {book.description}
                  </p>
                </div>

                {/* 元数据 */}
                <div className="flex flex-col items-end gap-1.5 text-[12px] text-muted-foreground/50 w-32">
                  <span>{book.publishDate}</span>
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <Eye className="w-3 h-3" />
                      {book.views?.toLocaleString?.() ? book.views.toLocaleString() : book.views}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Footer onNavigate={(p) => onNavigate?.(p)} />
    </div>
  );
}

export default BookLibraryPage;
