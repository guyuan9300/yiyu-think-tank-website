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
  const [selectedTopic, setSelectedTopic] = useState<'all' | '战略' | '业务设计' | '组织' | 'AI 技术'>('all');
  const [books, setBooks] = useState<Book[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const topicOptions: Array<{ id: 'all' | '战略' | '业务设计' | '组织' | 'AI 技术'; label: string }> = [
    { id: 'all', label: '全部' },
    { id: '战略', label: '战略' },
    { id: '业务设计', label: '业务设计' },
    { id: '组织', label: '组织' },
    { id: 'AI 技术', label: 'AI 技术' },
  ];

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

  const filteredBooks = useMemo(() => {
    return books.filter(book => {
      const matchesSearch = !searchQuery ||
        book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        book.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        book.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (book.topics || []).some((t: string) => t.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesTopic = selectedTopic === 'all' || (book.topics || []).includes(selectedTopic);
      return matchesSearch && matchesTopic;
    });
  }, [books, searchQuery, selectedTopic]);

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
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
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
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
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
                value={selectedTopic}
                onChange={(e) => setSelectedTopic(e.target.value as any)}
                className="px-4 py-2.5 bg-muted/50 border border-border/60 rounded-full text-[14px] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all cursor-pointer"
              >
                {topicOptions.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.id === 'all' ? '全部话题' : opt.label}
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
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1">
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
                className="bg-white/80 backdrop-blur-sm rounded-[20px] border border-border/40 overflow-hidden cursor-pointer group hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-1 transition-all duration-300"
                onClick={() => {
                  if (onNavigate) onNavigate('book-reader', book.id);
                  else window.location.assign(`${window.location.pathname}?page=book-reader&bookId=${encodeURIComponent(book.id)}`);
                }}
              >
                <div className={`aspect-[3/4] bg-gradient-to-br ${book.coverColor || 'from-primary/20 to-accent/10'} relative overflow-hidden`}>
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
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  
                  {/* Hover Button */}
                  <div className="absolute bottom-4 left-4 right-4 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onNavigate) onNavigate('book-reader', book.id);
                        else window.location.assign(`${window.location.pathname}?page=book-reader&bookId=${encodeURIComponent(book.id)}`);
                      }}
                      className="w-full py-2.5 bg-white/90 backdrop-blur-sm rounded-[12px] text-[13px] font-medium text-foreground hover:bg-white transition-colors flex items-center justify-center gap-2"
                    >
                      <Eye className="w-4 h-4" />
                      <span>详情</span>
                    </button>
                  </div>
                </div>

                <div className="p-5">
                  <h3 className="font-medium text-[15px] text-foreground mb-1.5 line-clamp-1 group-hover:text-primary transition-colors">
                    {book.title}
                  </h3>
                  <p className="text-[13px] text-muted-foreground/70 mb-3">{book.author}</p>

                  {/* Meta */}
                  <div className="flex items-center gap-4 text-[12px] text-muted-foreground/50">
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
              </article>
            ))}
          </div>
        ) : (
          /* List View */
          <div className="space-y-4">
            {filteredBooks.map((book) => (
              <article
                key={book.id}
                className="bg-white/80 backdrop-blur-sm rounded-[20px] border border-border/40 p-6 flex gap-6 cursor-pointer group hover:shadow-lg hover:shadow-primary/5 transition-all duration-300"
                onClick={() => {
                  if (onNavigate) onNavigate('book-reader', book.id);
                  else window.location.assign(`${window.location.pathname}?page=book-reader&bookId=${encodeURIComponent(book.id)}`);
                }}
              >
                {/* Cover */}
                <div className={`w-32 h-44 flex-shrink-0 rounded-[14px] bg-gradient-to-br ${book.coverColor || 'from-primary/20 to-accent/10'} flex items-center justify-center text-white text-4xl font-bold shadow-lg overflow-hidden relative`}>
                  {book.coverImage ? (
                    <img
                      src={book.coverImage}
                      alt={book.title}
                      className="absolute inset-0 w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    book.title.charAt(0)
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-[18px] font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
                    {book.title}
                  </h3>
                  <p className="text-[14px] text-muted-foreground/70 mb-3">{book.author}</p>
                  <p className="text-[14px] text-muted-foreground/80 mb-4 line-clamp-2 leading-relaxed">
                    {book.description}
                  </p>

                  {/* Meta */}
                  <div className="flex items-center gap-6 text-[13px] text-muted-foreground/50">
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4" />
                      {book.duration}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <BookOpen className="w-4 h-4" />
                      {book.pages}页
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                      {book.rating}
                    </span>
                  </div>
                </div>

                {/* Action */}
                <div className="flex-shrink-0 flex flex-col justify-center gap-3">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onNavigate) onNavigate('book-reader', book.id);
                      else window.location.assign(`${window.location.pathname}?page=book-reader&bookId=${encodeURIComponent(book.id)}`);
                    }}
                    className="px-5 py-2.5 rounded-full bg-primary/10 text-primary text-[14px] font-medium hover:bg-primary/20 transition-colors flex items-center gap-2"
                  >
                    <Eye className="w-4 h-4" />
                    <span>查看详情</span>
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      <Footer onNavigate={(p) => onNavigate?.(p)} />
    </div>
  );
}

export default BookLibraryPage;
