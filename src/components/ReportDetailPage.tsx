import { useState, useEffect } from 'react';
import { Header } from './Header';
import {
  ArrowLeft,
  Clock,
  Eye,
  ChevronRight,
  Download,
  Bookmark,
  Share2,
  TrendingUp,
  FileText,
  Calendar,
  Tag
} from 'lucide-react';
import { getReports, type Report } from '../lib/dataService';

interface ReportDetailPageProps {
  reportId: string;
  onNavigate: (page: string, id?: string) => void;
}

export function ReportDetailPage({ reportId, onNavigate }: ReportDetailPageProps) {
  const [report, setReport] = useState<Report | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isBookmarked, setIsBookmarked] = useState(false);

  // 加载报告数据
  useEffect(() => {
    const loadReport = () => {
      const reports = getReports();
      const found = reports.find(r => r.id === reportId);
      if (found) {
        setReport(found);
      }
      setIsLoading(false);
    };

    loadReport();

    const handleStorageChange = () => {
      loadReport();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('yiyu_data_change', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('yiyu_data_change', handleStorageChange);
    };
  }, [reportId]);

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

  if (!report) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
            <p className="text-muted-foreground/70 text-lg">报告不存在</p>
            <button
              onClick={() => onNavigate('report-library')}
              className="mt-4 px-6 py-2.5 rounded-full bg-primary text-primary-foreground text-[15px] hover:bg-primary/90 transition-colors"
            >
              返回报告库
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* 头部 */}
      <Header />

      {/* Hero 区域 - 左图右文布局 */}
      <section className="relative pt-32 pb-20 px-6 overflow-hidden">
        {/* 微妙背景渐变 */}
        <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.02] to-transparent" />

        <div className="relative max-w-7xl mx-auto">
          {/* 面包屑导航 */}
          <div className="flex items-center gap-2 mb-8 text-[13px] text-muted-foreground/60">
            <button
              onClick={() => onNavigate('report-library')}
              className="hover:text-foreground transition-colors flex items-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>报告库</span>
            </button>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-foreground">{report.category}</span>
          </div>

          {/* 左图右文布局 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            {/* 左侧图片区域 */}
            <div className="order-2 lg:order-1">
              <div className="relative aspect-[4/3] rounded-3xl overflow-hidden bg-gradient-to-br from-success/[0.05] to-accent/[0.05] border border-border/40">
                {/* 图片占位 */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <TrendingUp className="w-32 h-32 text-success/10" />
                </div>

                {/* 热门标签 */}
                {report.isHot && (
                  <div className="absolute top-6 left-6 px-4 py-2 rounded-full bg-gradient-to-r from-red-500 to-pink-500 text-white text-[12px] font-medium shadow-lg">
                    热门报告
                  </div>
                )}
              </div>
            </div>

            {/* 右侧内容区域 */}
            <div className="order-1 lg:order-2">
              {/* 分类标签 */}
              <div className="flex items-center gap-3 mb-6">
                <span className="px-4 py-1.5 rounded-full bg-success/10 text-success text-[12px] font-medium">
                  {report.category}
                </span>
                <span className="text-[12px] text-muted-foreground/50">
                  v{report.version}
                </span>
              </div>

              {/* 主标题 */}
              <h1 className="text-[40px] sm:text-[48px] font-semibold leading-[1.1] tracking-[-0.02em] mb-6">
                {report.title}
              </h1>

              {/* 摘要描述 */}
              <p className="text-[18px] text-muted-foreground/70 leading-[1.6] mb-8 font-light">
                {report.summary}
              </p>

              {/* 元数据信息 */}
              <div className="flex flex-wrap items-center gap-6 text-[14px] text-muted-foreground/60 mb-8">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>{report.publishDate}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4" />
                  <span>{report.views.toLocaleString()} 次浏览</span>
                </div>
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  <span>PDF 格式</span>
                </div>
              </div>

              {/* 标签 */}
              <div className="flex flex-wrap gap-2 mb-8">
                {report.tags.map((tag: string, index: number) => (
                  <span
                    key={index}
                    className="px-3 py-1.5 rounded-full bg-muted/40 text-muted-foreground/70 text-[12px]"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              {/* 操作按钮 */}
              <div className="flex flex-wrap items-center gap-4">
                <button className="group flex items-center gap-2.5 px-6 py-3 rounded-2xl bg-primary text-primary-foreground text-[15px] font-medium hover:bg-primary/90 transition-all hover:scale-[1.02] shadow-lg shadow-primary/20">
                  <Download className="w-4 h-4" />
                  <span>下载报告</span>
                </button>
                <button
                  onClick={() => setIsBookmarked(!isBookmarked)}
                  className={`flex items-center gap-2.5 px-6 py-3 rounded-2xl text-[15px] font-medium transition-all hover:scale-[1.02] ${
                    isBookmarked
                      ? 'bg-primary/20 text-primary shadow-lg'
                      : 'bg-muted/40 text-muted-foreground/70 hover:bg-muted/60'
                  }`}
                >
                  <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-current' : ''}`} />
                  <span>{isBookmarked ? '已收藏' : '收藏'}</span>
                </button>
                <button className="flex items-center gap-2.5 px-6 py-3 rounded-2xl bg-muted/40 text-muted-foreground/70 text-[15px] font-medium hover:bg-muted/60 transition-all hover:scale-[1.02]">
                  <Share2 className="w-4 h-4" />
                  <span>分享</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 内容区域 - 报告亮点 */}
      <section className="py-20 px-6">
        <div className="relative max-w-7xl mx-auto">
          {/* 亮点卡片 */}
          <div className="bg-white/60 backdrop-blur-sm rounded-3xl border border-border/40 p-10">
            <h2 className="text-[28px] font-semibold tracking-[-0.02em] mb-8">
              报告亮点
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 亮点1 */}
              <div className="flex items-start gap-4 p-6 rounded-2xl bg-gradient-to-br from-success/[0.03] to-accent/[0.03] border border-success/10">
                <div className="w-12 h-12 rounded-2xl bg-success/10 flex items-center justify-center flex-shrink-0">
                  <TrendingUp className="w-6 h-6 text-success" />
                </div>
                <div>
                  <h3 className="text-[16px] font-semibold mb-2">行业趋势洞察</h3>
                  <p className="text-[14px] text-muted-foreground/70 leading-relaxed">
                    基于深度调研数据，揭示行业发展方向和潜在机遇
                  </p>
                </div>
              </div>

              {/* 亮点2 */}
              <div className="flex items-start gap-4 p-6 rounded-2xl bg-gradient-to-br from-primary/[0.03] to-accent/[0.03] border border-primary/10">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-[16px] font-semibold mb-2">专业内容解析</h3>
                  <p className="text-[14px] text-muted-foreground/70 leading-relaxed">
                    深入分析政策、市场、技术等多维度内容
                  </p>
                </div>
              </div>

              {/* 亮点3 */}
              <div className="flex items-start gap-4 p-6 rounded-2xl bg-gradient-to-br from-amber/[0.03] to-orange/[0.03] border border-amber/10">
                <div className="w-12 h-12 rounded-2xl bg-amber/10 flex items-center justify-center flex-shrink-0">
                  <Tag className="w-6 h-6 text-amber" />
                </div>
                <div>
                  <h3 className="text-[16px] font-semibold mb-2">实用工具方法</h3>
                  <p className="text-[14px] text-muted-foreground/70 leading-relaxed">
                    提供可操作的框架和工具，助力实际工作
                  </p>
                </div>
              </div>

              {/* 亮点4 */}
              <div className="flex items-start gap-4 p-6 rounded-2xl bg-gradient-to-br from-pink/[0.03] to-rose/[0.03] border border-pink/10">
                <div className="w-12 h-12 rounded-2xl bg-pink/10 flex items-center justify-center flex-shrink-0">
                  <Clock className="w-6 h-6 text-pink" />
                </div>
                <div>
                  <h3 className="text-[16px] font-semibold mb-2">持续更新支持</h3>
                  <p className="text-[14px] text-muted-foreground/70 leading-relaxed">
                    定期更新内容，保持信息的时效性和前沿性
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
