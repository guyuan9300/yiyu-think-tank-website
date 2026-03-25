import { Header } from './Header';
import { Footer } from './Footer';
import {
  BookOpen, Search, Filter, Grid3X3, List, ChevronRight
} from 'lucide-react';
import { getBooks, type Book } from '../lib/dataService';
import { useState, useEffect, useMemo } from 'react';
import { ContentResourceCard } from './ContentResourceCard';
import { PaginationControls } from './PaginationControls';
import { getYiyuPageAttrs, getYiyuSectionAttrs } from '../lib/yiyuTongSiteMap';
const PAGE_SIZE = 6;

export function BookLibraryPage({ onNavigate }: { onNavigate?: (page: string, id?: string) => void }) {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [tagOpen, setTagOpen] = useState(false);
  const [yearOpen, setYearOpen] = useState(false);
  const [books, setBooks] = useState<Book[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

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
    const onDoc = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (target.closest('[data-book-filter]')) return;
      setTagOpen(false);
      setYearOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

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

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedTag, selectedYear]);

  const totalPages = Math.max(1, Math.ceil(filteredBooks.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedBooks = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filteredBooks.slice(start, start + PAGE_SIZE);
  }, [filteredBooks, safePage]);

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
    <div {...getYiyuPageAttrs('book-library')} className="min-h-screen bg-background flex flex-col">
      <Header onNavigate={onNavigate} />

      {/* Page Header */}
      <div
        {...getYiyuSectionAttrs('book-library', 'book-library-hero')}
        className="bg-white/80 backdrop-blur-sm border-b border-border/40"
      >
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
      <div
        {...getYiyuSectionAttrs('book-library', 'book-library-filters')}
        data-yiyu-results-total={String(filteredBooks.length)}
        data-yiyu-active-topic={selectedTag}
        data-yiyu-active-year={selectedYear}
        data-yiyu-search-query={searchQuery}
        data-yiyu-current-page={String(safePage)}
        data-yiyu-total-pages={String(totalPages)}
        data-yiyu-sort="latest"
        className="bg-white/80 backdrop-blur-sm border-b border-border/40 sticky top-0 z-10"
      >
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-wrap items-center gap-4">
            {/* Search */}
            <div className="flex-1 min-w-64 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
              <input
                data-yiyu-search="content"
                type="text"
                placeholder="搜索书名、作者、标签..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-muted/50 border border-border/60 rounded-full text-[14px] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all"
              />
            </div>

            {/* Tag + Year Filters */}
            <div className="flex items-center gap-2" data-book-filter>
              <Filter className="w-4 h-4 text-muted-foreground/50" />

              {/* 标签 */}
              <div className="relative">
                <button
                  data-yiyu-filter-topic-trigger="content"
                  data-yiyu-filter-topic="content"
                  type="button"
                  onClick={() => {
                    setTagOpen((v) => !v);
                    setYearOpen(false);
                  }}
                  className="min-w-[128px] px-4 py-2.5 bg-muted/50 border border-border/60 rounded-full text-[14px] text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all cursor-pointer inline-flex items-center justify-between gap-2"
                >
                  <span className="truncate">
                    {selectedTag === 'all' ? '全部标签' : selectedTag}
                  </span>
                  <span className="text-muted-foreground/60">▾</span>
                </button>

                {tagOpen ? (
                  <div className="absolute right-0 mt-2 w-48 max-h-72 overflow-auto rounded-2xl border border-border/60 bg-white shadow-xl shadow-black/[0.06] p-1 z-20">
                    {tagOptions.map((opt) => (
                      <button
                        data-yiyu-filter-topic-option={String(opt.id)}
                        key={String(opt.id)}
                        type="button"
                        onClick={() => {
                          setSelectedTag(String(opt.id));
                          setTagOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-xl text-[14px] hover:bg-muted/40 transition-colors ${String(opt.id) === String(selectedTag) ? 'bg-muted/40 text-foreground' : 'text-foreground'}`}
                      >
                        {String(opt.id) === 'all' ? '全部标签' : String((opt as any).label ?? opt.id)}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>

              {/* 年份 */}
              <div className="relative">
                <button
                  data-yiyu-filter-year-trigger="content"
                  data-yiyu-filter-year="content"
                  type="button"
                  onClick={() => {
                    setYearOpen((v) => !v);
                    setTagOpen(false);
                  }}
                  className="min-w-[128px] px-4 py-2.5 bg-muted/50 border border-border/60 rounded-full text-[14px] text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all cursor-pointer inline-flex items-center justify-between gap-2"
                >
                  <span className="truncate">
                    {selectedYear === 'all' ? '全部年份' : selectedYear}
                  </span>
                  <span className="text-muted-foreground/60">▾</span>
                </button>

                {yearOpen ? (
                  <div className="absolute right-0 mt-2 w-40 max-h-72 overflow-auto rounded-2xl border border-border/60 bg-white shadow-xl shadow-black/[0.06] p-1 z-20">
                    {yearOptions.map((y) => (
                      <button
                        data-yiyu-filter-year-option={String(y)}
                        key={String(y)}
                        type="button"
                        onClick={() => {
                          setSelectedYear(String(y));
                          setYearOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-xl text-[14px] hover:bg-muted/40 transition-colors ${String(y) === String(selectedYear) ? 'bg-muted/40 text-foreground' : 'text-foreground'}`}
                      >
                        {String(y) === 'all' ? '全部年份' : String(y)}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
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
      <div
        {...getYiyuSectionAttrs('book-library', 'book-library-results')}
        data-yiyu-results-total={String(filteredBooks.length)}
        data-yiyu-current-page={String(safePage)}
        data-yiyu-total-pages={String(totalPages)}
        data-yiyu-sort="latest"
        className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1"
      >
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
            {paginatedBooks.map((book) => (
              <ContentResourceCard
                key={book.id} 
                contentId={book.id}
                contentType="book"
                cover={
                  book.coverImage ? (
                    <img
                      src={book.coverImage}
                      alt={book.title}
                      className="absolute inset-0 w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <BookOpen className="w-16 h-16 text-primary/10" />
                    </div>
                  )
                }
                tags={book.topics || []}
                title={book.title}
                author={book.author}
                excerpt={book.description}
                views={book.views}
                likes={book.likes}
                favorites={book.favoritesCount}
                publishDate={book.publishDate}
                onClick={() => {
                  if (onNavigate) onNavigate('book-reader', book.id);
                  else window.location.assign(`${window.location.pathname}?page=book-reader&id=${encodeURIComponent(book.id)}`);
                }}
              />
            ))}
          </div>
        ) : (
          /* List View */
          <div className="space-y-3">
            {paginatedBooks.map((book) => (
              <ContentResourceCard
                key={book.id}
                contentId={book.id}
                contentType="book"
                variant="list"
                cover={
                  book.coverImage ? (
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
                  )
                }
                tags={book.topics || []}
                title={book.title}
                author={book.author}
                excerpt={book.description}
                views={book.views}
                likes={book.likes}
                favorites={book.favoritesCount}
                publishDate={book.publishDate}
                onClick={() => {
                  if (onNavigate) onNavigate('book-reader', book.id);
                  else window.location.assign(`${window.location.pathname}?page=book-reader&id=${encodeURIComponent(book.id)}`);
                }}
              />
            ))}
          </div>
        )}

        <div className="mt-8">
          <PaginationControls
            currentPage={safePage}
            totalItems={filteredBooks.length}
            pageSize={PAGE_SIZE}
            onPageChange={setCurrentPage}
          />
        </div>
      </div>

      <Footer onNavigate={(p) => onNavigate?.(p)} />
    </div>
  );
}

export default BookLibraryPage;
