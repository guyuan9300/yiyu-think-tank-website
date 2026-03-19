import { useState, useEffect, useMemo } from 'react';
import { Header } from './Header';
import { Footer } from './Footer';
import {
  FileText,
  Search,
  Filter,
  Grid3X3,
  List,
  ChevronRight,
  ArrowRight
} from 'lucide-react';
import { getReports as getReportsLocal, type Report } from '../lib/dataService';
import { PdfCoverImage } from './PdfCoverImage';
import { ContentResourceCard } from './ContentResourceCard';
import { PaginationControls } from './PaginationControls';

const PAGE_SIZE = 10;

export function ReportLibraryPage({
  onNavigate,
  onNavigateToDetail,
}: {
  onNavigate?: (page: string) => void;
  onNavigateToDetail?: (type: 'report', id: string) => void;
}) {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTopic, setSelectedTopic] = useState<'all' | '战略' | '业务设计' | '组织' | 'AI 技术'>('all');
  const [selectedYear, setSelectedYear] = useState('all');
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  const topicOptions: Array<{ id: 'all' | '战略' | '业务设计' | '组织' | 'AI 技术'; label: string }> = [
    { id: 'all', label: '全部' },
    { id: '战略', label: '战略' },
    { id: '业务设计', label: '业务设计' },
    { id: '组织', label: '组织' },
    { id: 'AI 技术', label: 'AI 技术' },
  ];

  // 加载数据（建造期：以本地数据为准；旧字段迁移也在 dataService 内部完成）
  useEffect(() => {
    const loadData = () => {
      const reportsData = getReportsLocal();
      setReports(reportsData.filter((r: any) => r.status === 'published'));
      setIsLoading(false);
    };

    loadData();

    const handleStorageChange = () => loadData();
    const pollInterval = setInterval(() => loadData(), 1000);

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('yiyu_data_change', handleStorageChange);

    return () => {
      clearInterval(pollInterval);
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('yiyu_data_change', handleStorageChange);
    };
  }, []);

  // 计算年份选项
  const years = useMemo(() => {
    const yearSet = new Set<string>();
    reports.forEach(report => {
      const year = report.publishDate.split('-')[0];
      yearSet.add(year);
    });
    return Array.from(yearSet).sort().reverse();
  }, [reports]);

  // 筛选报告
  const filteredReports = useMemo(() => {
    return reports.filter(report => {
      const matchesSearch = !searchQuery ||
        report.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        report.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (report.publisher || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (report.topics || []).some((t: string) => t.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesTopic = selectedTopic === 'all' || (report.topics || []).includes(selectedTopic);
      const matchesYear = selectedYear === 'all' || report.publishDate.startsWith(selectedYear);

      return matchesSearch && matchesTopic && matchesYear;
    });
  }, [reports, searchQuery, selectedTopic, selectedYear]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedTopic, selectedYear]);

  const totalPages = Math.max(1, Math.ceil(filteredReports.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedReports = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filteredReports.slice(start, start + PAGE_SIZE);
  }, [filteredReports, safePage]);

  // 刷新数据
  const handleRefresh = async () => {
    setIsLoading(true);
    try {
      const reportsData = getReportsLocal();
      setReports(reportsData.filter((r: any) => r.status === 'published'));
    } finally {
      setIsLoading(false);
    }
  };

  // 加载状态
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

      {/* Hero 区域 */}
      <section className="relative pt-24 sm:pt-32 pb-8 px-4 sm:px-6 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.02] to-transparent" />

        <div className="relative max-w-4xl mx-auto">
          {/* 面包屑导航 */}
          <div className="flex items-center gap-2 mb-6 text-[13px] text-muted-foreground/60">
            <button
              onClick={() => onNavigate?.('insights')}
              className="hover:text-foreground transition-colors"
            >
              前沿洞察
            </button>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-foreground">报告库</span>
          </div>

          {/* 主标题 */}
          <div className="mb-4">
            <h1 className="text-[56px] sm:text-[64px] lg:text-[72px] font-semibold leading-[1.05] tracking-[-0.025em] mb-3">
              报告库
            </h1>
            <p className="text-[13px] text-muted-foreground/50 tracking-[0.15em] uppercase font-medium">
              Report Library
            </p>
          </div>

          {/* 副标题 */}
          <p className="text-[21px] text-muted-foreground/70 leading-[1.5] max-w-3xl font-light">
            汇集行业研究报告、市场分析和政策解读，助力科学决策
          </p>

        </div>
      </section>

      {/* 筛选栏 - 固定定位 */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-border/40 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex flex-wrap items-center gap-4">
            {/* 搜索框 */}
            <div className="flex-1 min-w-64 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
              <input
                type="text"
                placeholder="搜索报告、标签、机构..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-muted/30 border border-border/40 rounded-full text-[14px] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all"
              />
            </div>

            {/* 筛选器 */}
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground/50" />
              <select
                value={selectedTopic}
                onChange={(e) => setSelectedTopic(e.target.value as any)}
                className="px-4 py-2.5 bg-muted/30 border border-border/40 rounded-full text-[14px] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all cursor-pointer"
              >
                {topicOptions.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.id === 'all' ? '全部标签' : opt.label}
                  </option>
                ))}
              </select>

              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="px-4 py-2.5 bg-muted/30 border border-border/40 rounded-full text-[14px] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all cursor-pointer"
              >
                <option value="all">全部年份</option>
                {years.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>

            {/* 视图切换 */}
            <div className="flex items-center gap-1 p-1 bg-muted/30 rounded-full">
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

      {/* 内容区域 */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* 结果统计 */}
        <div className="flex items-center justify-between mb-8">
          <p className="text-[14px] text-muted-foreground/70">
            共找到 <span className="text-foreground font-medium">{filteredReports.length}</span> 份报告
          </p>
          {/* 刷新按钮已移除 */}
        </div>

        {/* 空状态 */}
        {filteredReports.length === 0 ? (
          <div className="bg-white/60 backdrop-blur-sm rounded-[20px] border border-border/40 p-16 text-center">
            <FileText className="w-14 h-14 mx-auto mb-4 text-muted-foreground/30" />
            <p className="text-muted-foreground/70 text-[15px] mb-2">暂无报告</p>
            <p className="text-muted-foreground/50 text-[13px]">尝试调整搜索条件或筛选条件</p>
          </div>
        ) : viewMode === 'grid' ? (
          /* 网格视图 */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginatedReports.map((report) => (
              <ContentResourceCard
                key={report.id}
                cover={
                  <>
                    {report.coverImage ? (
                      <img
                        src={report.coverImage}
                        alt={report.title}
                        className="absolute inset-0 w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : report.fileUrl ? (
                      <PdfCoverImage
                        pdfUrl={report.fileUrl}
                        alt={report.title}
                        className="absolute inset-0"
                        width={520}
                      />
                    ) : null}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <FileText className="w-16 h-16 text-success/10" />
                    </div>
                  </>
                }
                tags={report.topics || []}
                title={report.title}
                author={report.publisher}
                excerpt={report.summary}
                views={report.views}
                likes={report.likes}
                favorites={report.favoritesCount}
                publishDate={report.publishDate}
                onClick={() => onNavigateToDetail?.('report', report.id)}
              />
            ))}
          </div>
        ) : (
          /* 列表视图 */
          <div className="space-y-3">
            {paginatedReports.map((report) => (
              <ContentResourceCard
                  key={report.id}
                  variant="list"
                  cover={
                    <>
                      {report.coverImage ? (
                        <img
                          src={report.coverImage}
                          alt={report.title}
                          className="absolute inset-0 w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : report.fileUrl ? (
                        <PdfCoverImage
                          pdfUrl={report.fileUrl}
                          alt={report.title}
                          className="absolute inset-0"
                          width={320}
                        />
                      ) : null}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <FileText className="w-8 h-8 text-success/20" />
                      </div>
                    </>
                  }
                  tags={report.topics || []}
                  title={report.title}
                  author={report.publisher}
                  excerpt={report.summary}
                  views={report.views}
                  likes={report.likes}
                  favorites={report.favoritesCount}
                  publishDate={report.publishDate}
                  onClick={() => onNavigateToDetail?.('report', report.id)}
                />
            ))}
          </div>
        )}

        <div className="mt-8">
          <PaginationControls
            currentPage={safePage}
            totalItems={filteredReports.length}
            pageSize={PAGE_SIZE}
            onPageChange={setCurrentPage}
          />
        </div>
      </div>

      <Footer onNavigate={(p) => onNavigate?.(p)} />
    </div>
  );
}
