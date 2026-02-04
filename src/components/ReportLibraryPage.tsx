import { useState, useEffect, useMemo } from 'react';
import { Header } from './Header';
import {
  FileText,
  Search,
  Filter,
  Grid3X3,
  List,
  Eye,
  ChevronRight,
  RefreshCw,
  ArrowRight
} from 'lucide-react';
import { getReports, getCategories, type Report } from '../lib/dataService';

// 报告卡片组件 - 网格视图
function ReportCardGrid({ report }: { report: Report }) {
  return (
    <article
      className="group cursor-pointer"
    >
      <div className="relative bg-white/60 backdrop-blur-sm border border-border/40 rounded-3xl overflow-hidden transition-all duration-500 hover:bg-white/80 hover:border-border/60 hover:shadow-2xl hover:shadow-black/[0.04] hover:-translate-y-1">
        {/* 封面区域 */}
        <div className="relative aspect-[16/10] bg-gradient-to-br from-success/[0.03] to-accent/[0.03] overflow-hidden">
          <div className="absolute inset-0 flex items-center justify-center">
            <FileText className="w-16 h-16 text-success/10" />
          </div>
          {report.isHot && (
            <div className="absolute top-4 left-4 px-3 py-1.5 rounded-full bg-gradient-to-r from-red-500 to-pink-500 text-white text-[11px] font-medium shadow-lg">
              热门
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
            <span className="text-white text-[14px] font-medium">查看详情</span>
          </div>
        </div>

        {/* 内容区域 */}
        <div className="p-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="px-3 py-1 rounded-full bg-success/8 text-success text-[11px] font-medium">
              {report.category}
            </span>
            <span className="text-[12px] text-muted-foreground/40">
              v{report.version}
            </span>
          </div>

          <h3 className="text-[18px] font-semibold mb-2 line-clamp-2 group-hover:text-primary transition-colors leading-[1.4]">
            {report.title}
          </h3>

          <p className="text-[14px] text-muted-foreground/70 line-clamp-2 leading-[1.6] mb-4">
            {report.summary}
          </p>

          <div className="flex flex-wrap gap-1.5 mb-4">
            {report.tags.slice(0, 3).map((tag: string, index: number) => (
              <span
                key={index}
                className="px-2.5 py-1 rounded-full bg-muted/40 text-muted-foreground/60 text-[11px]"
              >
                {tag}
              </span>
            ))}
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-border/30 text-[12px] text-muted-foreground/50">
            <div className="flex items-center gap-1">
              <Eye className="w-3.5 h-3.5" />
              <span>{report.views.toLocaleString()}</span>
            </div>
            <span>{report.publishDate}</span>
          </div>
        </div>
      </div>
    </article>
  );
}

// 报告列表项组件 - 列表视图
function ReportListItem({ report }: { report: Report }) {
  return (
    <div className="group flex items-center gap-6 p-5 hover:bg-muted/20 transition-colors cursor-pointer rounded-2xl">
      {/* 封面 */}
      <div className="w-32 h-20 rounded-[12px] overflow-hidden flex-shrink-0 bg-gradient-to-br from-success/[0.03] to-accent/[0.03]">
        <div className="w-full h-full flex items-center justify-center">
          <FileText className="w-8 h-8 text-success/20" />
        </div>
      </div>

      {/* 内容 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-2">
          {report.isHot && (
            <span className="px-2.5 py-1 bg-gradient-to-r from-red-500 to-pink-500 text-white text-[11px] font-medium rounded-full">
              热门
            </span>
          )}
          <span className="px-2.5 py-1 bg-success/8 text-success text-[11px] font-medium rounded-full">
            {report.category}
          </span>
        </div>
        <h3 className="font-medium text-[15px] text-foreground mb-1 truncate group-hover:text-primary transition-colors">
          {report.title}
        </h3>
        <p className="text-[13px] text-muted-foreground/70 line-clamp-1">
          {report.summary}
        </p>
      </div>

      {/* 标签 */}
      <div className="flex flex-wrap gap-1.5 w-40">
        {report.tags.slice(0, 2).map((tag: string, index: number) => (
          <span
            key={index}
            className="px-2 py-0.5 bg-muted/40 text-muted-foreground/60 text-[11px] rounded-full truncate"
          >
            {tag}
          </span>
        ))}
      </div>

      {/* 元数据 */}
      <div className="flex flex-col items-end gap-1.5 text-[12px] text-muted-foreground/50 w-32">
        <span>{report.publishDate}</span>
        <span>v{report.version}</span>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <Eye className="w-3 h-3" />
            {report.views.toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
}

export function ReportLibraryPage() {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedYear, setSelectedYear] = useState('all');
  const [reports, setReports] = useState<Report[]>([]);
  const [categories, setCategories] = useState<{id: string, name: string, type: string}[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 加载数据
  useEffect(() => {
    const loadData = () => {
      const reportsData = getReports();
      const categoriesData = getCategories();

      setReports(reportsData.filter(r => r.status === 'published'));
      setCategories(categoriesData.filter(c => c.type === 'report'));
      setIsLoading(false);
    };

    loadData();

    const handleStorageChange = () => {
      loadData();
    };

    const pollInterval = setInterval(() => {
      const newReports = getReports();
      const publishedReports = newReports.filter(r => r.status === 'published');

      if (publishedReports.length !== reports.length ||
          (publishedReports.length > 0 && publishedReports[0].id !== (reports[0]?.id))) {
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
        report.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCategory = selectedCategory === 'all' || report.category === selectedCategory;
      const matchesYear = selectedYear === 'all' || report.publishDate.startsWith(selectedYear);

      return matchesSearch && matchesCategory && matchesYear;
    });
  }, [reports, searchQuery, selectedCategory, selectedYear]);

  // 刷新数据
  const handleRefresh = () => {
    setIsLoading(true);
    const reportsData = getReports();
    setReports(reportsData.filter(r => r.status === 'published'));
    setIsLoading(false);
  };

  // 加载状态
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
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
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero 区域 */}
      <section className="relative pt-32 pb-8 px-6 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.02] to-transparent" />

        <div className="relative max-w-7xl mx-auto">
          {/* 面包屑导航 */}
          <div className="flex items-center gap-2 mb-6 text-[13px] text-muted-foreground/60">
            <button className="hover:text-foreground transition-colors">首页</button>
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
        <div className="max-w-7xl mx-auto px-6 py-4">
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
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-4 py-2.5 bg-muted/30 border border-border/40 rounded-full text-[14px] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all cursor-pointer"
              >
                <option value="all">全部分类</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.name}>{cat.name}</option>
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
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* 结果统计 */}
        <div className="flex items-center justify-between mb-8">
          <p className="text-[14px] text-muted-foreground/70">
            共找到 <span className="text-foreground font-medium">{filteredReports.length}</span> 份报告
          </p>
          <button
            onClick={handleRefresh}
            className="group flex items-center gap-2 text-[13px] text-muted-foreground/70 hover:text-primary transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5 transition-transform group-hover:rotate-180" />
            <span>刷新</span>
          </button>
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
            {filteredReports.map((report) => (
              <ReportCardGrid key={report.id} report={report} />
            ))}
          </div>
        ) : (
          /* 列表视图 */
          <div className="bg-white/60 backdrop-blur-sm rounded-[20px] border border-border/40 overflow-hidden">
            <div className="divide-y divide-border/30">
              {filteredReports.map((report) => (
                <ReportListItem key={report.id} report={report} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
