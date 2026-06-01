import { useState, useEffect, useMemo } from 'react';
import { Header } from './Header';
import { OpenSourceFooter } from './open-source-home/OpenSourceFooter';
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
import { getYiyuPageAttrs, getYiyuSectionAttrs } from '../lib/yiyuTongSiteMap';
import { useLang, type Bilingual } from '../lib/i18n';

const PAGE_SIZE = 6;

export function ReportLibraryPage({
  onNavigate,
  onNavigateToDetail,
}: {
  onNavigate?: (page: string) => void;
  onNavigateToDetail?: (type: 'report', id: string) => void;
}) {
  const { t } = useLang();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTopic, setSelectedTopic] = useState<'all' | '战略' | '业务设计' | '组织' | 'AI 技术'>('all');
  const [selectedYear, setSelectedYear] = useState('all');
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  const topicOptions: Array<{ id: 'all' | '战略' | '业务设计' | '组织' | 'AI 技术'; label: Bilingual }> = [
    { id: 'all', label: { zh: '全部', en: 'All' } },
    { id: '战略', label: { zh: '战略', en: 'Strategy' } },
    { id: '业务设计', label: { zh: '业务设计', en: 'Business Design' } },
    { id: '组织', label: { zh: '组织', en: 'Organization' } },
    { id: 'AI 技术', label: { zh: 'AI 技术', en: 'AI Technology' } },
  ];

  // 加载数据（建造期：以本地数据为准；旧字段迁移也在 dataService 内部完成）
  useEffect(() => {
    const loadData = () => {
      const reportsData = getReportsLocal();
      setReports(reportsData.filter((r: any) => r.status === 'published' || r.status === 'parsed'));
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
      setReports(reportsData.filter((r: any) => r.status === 'published' || r.status === 'parsed'));
    } finally {
      setIsLoading(false);
    }
  };

  // 加载状态
  if (isLoading) {
    return (
      <div className="min-h-screen bg-os-canvas">
        <Header onNavigate={onNavigate} />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="w-10 h-10 border-2 border-os-navy/20 border-t-os-navy rounded-full animate-spin mx-auto mb-4" />
            <p className="text-os-muted">{t({ zh: '加载中...', en: 'Loading...' })}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div {...getYiyuPageAttrs('report-library')} className="min-h-screen bg-os-canvas flex flex-col">
      <Header onNavigate={onNavigate} />

      {/* Hero 区域 — 已升级到 open-source-home 设计语言 */}
      <section
        {...getYiyuSectionAttrs('report-library', 'report-library-hero')}
        className="relative pt-24 sm:pt-32 pb-12 px-4 sm:px-6 overflow-hidden bg-os-canvas"
      >
        {/* 极淡光晕 */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[-20%] left-[12%] w-[40%] h-[60%] rounded-full bg-os-navy/[0.05] blur-[120px]" />
          <div className="absolute top-[-10%] right-[10%] w-[30%] h-[50%] rounded-full bg-os-blue/[0.04] blur-[120px]" />
        </div>

        <div className="relative max-w-[1200px] mx-auto">
          {/* eyebrow */}
          <div className="flex items-center gap-2.5 mb-6">
            <span className="h-px w-7 bg-os-navy/60" />
            <span className="text-[12px] font-semibold tracking-[0.18em] text-os-navy">{t({ zh: '益语智库 · 报告', en: 'Yiyu Institute · Reports' })}</span>
          </div>

          {/* 衬线大标题 */}
          <h1 className="font-serif-display text-[40px] sm:text-[56px] lg:text-[64px] font-semibold leading-[1.12] tracking-tight text-os-ink mb-5">
            {t({ zh: '前沿分析、行业研究、', en: 'Frontier analysis, industry research,' })}
            <br className="hidden sm:block" />
            <span className="text-ink-accent">{t({ zh: '值得读的深度报告', en: 'in-depth reports worth reading' })}</span>
          </h1>

          {/* 副标题 */}
          <p className="text-[16px] sm:text-[18px] text-os-muted leading-[1.85] max-w-3xl">
            {t({ zh: '汇集益语智库自研的分析报告，以及我们持续推荐的行业研究、市场分析、政策解读。', en: "A collection of Yiyu Institute's own analysis reports, alongside the industry research, market analysis, and policy interpretations we recommend." })}
            <span className="text-os-muted/70 text-[14px] mt-2 block">
              {t({ zh: '* 自研与推荐的分类显示功能正在准备中', en: '* Separate views for in-house and recommended reports are coming soon' })}
            </span>
          </p>
        </div>
      </section>

      {/* 筛选栏 - 固定定位 */}
      <div
        {...getYiyuSectionAttrs('report-library', 'report-library-filters')}
        data-yiyu-results-total={String(filteredReports.length)}
        data-yiyu-active-topic={selectedTopic}
        data-yiyu-active-year={selectedYear}
        data-yiyu-search-query={searchQuery}
        data-yiyu-current-page={String(safePage)}
        data-yiyu-total-pages={String(totalPages)}
        data-yiyu-sort="latest"
        className="bg-white/80 backdrop-blur-sm border-b border-border/40 sticky top-0 z-10"
      >
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex flex-wrap items-center gap-4">
            {/* 搜索框 */}
            <div className="flex-1 min-w-64 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
              <input
                data-yiyu-search="content"
                type="text"
                placeholder={t({ zh: '搜索报告、标签、机构...', en: 'Search reports, tags, publishers...' })}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-muted/30 border border-border/40 rounded-full text-[14px] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all"
              />
            </div>

            {/* 筛选器 */}
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground/50" />
              <select
                data-yiyu-filter-topic="content"
                value={selectedTopic}
                onChange={(e) => setSelectedTopic(e.target.value as any)}
                className="px-4 py-2.5 bg-muted/30 border border-border/40 rounded-full text-[14px] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all cursor-pointer"
              >
                {topicOptions.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.id === 'all' ? t({ zh: '全部标签', en: 'All tags' }) : t(opt.label)}
                  </option>
                ))}
              </select>

              <select
                data-yiyu-filter-year="content"
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="px-4 py-2.5 bg-muted/30 border border-border/40 rounded-full text-[14px] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all cursor-pointer"
              >
                <option value="all">{t({ zh: '全部年份', en: 'All years' })}</option>
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
      <div
        {...getYiyuSectionAttrs('report-library', 'report-library-results')}
        data-yiyu-results-total={String(filteredReports.length)}
        data-yiyu-current-page={String(safePage)}
        data-yiyu-total-pages={String(totalPages)}
        data-yiyu-sort="latest"
        className="max-w-4xl mx-auto px-6 py-8"
      >
        {/* 结果统计 */}
        <div className="flex items-center justify-between mb-8">
          <p className="text-[14px] text-muted-foreground/70">
            {t({ zh: '共找到', en: 'Found' })} <span className="text-foreground font-medium">{filteredReports.length}</span> {t({ zh: '份报告', en: 'reports' })}
          </p>
          {/* 刷新按钮已移除 */}
        </div>

        {/* 空状态 */}
        {filteredReports.length === 0 ? (
          <div className="bg-white/60 backdrop-blur-sm rounded-[20px] border border-border/40 p-16 text-center">
            <FileText className="w-14 h-14 mx-auto mb-4 text-muted-foreground/30" />
            <p className="text-muted-foreground/70 text-[15px] mb-2">{t({ zh: '暂无报告', en: 'No reports yet' })}</p>
            <p className="text-muted-foreground/50 text-[13px]">{t({ zh: '尝试调整搜索条件或筛选条件', en: 'Try adjusting your search or filters' })}</p>
          </div>
        ) : viewMode === 'grid' ? (
          /* 网格视图 */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginatedReports.map((report) => (
              <ContentResourceCard
                key={report.id}
                contentId={report.id}
                contentType="report"
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
                contentId={report.id}
                contentType="report"
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

      <OpenSourceFooter />
    </div>
  );
}
