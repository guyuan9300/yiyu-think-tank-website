import { useState, useEffect, useRef } from 'react';
import { Header } from './Header';
import { ArrowRight, Brain, Target, Users, TrendingUp, BookOpen, FileText, Lightbulb, ChevronRight, Star, Zap, ChevronDown } from 'lucide-react';
import { getInsights, getReports, type InsightArticle, type Report } from '../lib/dataService';
import { SubscriptionSheet } from './SubscriptionSheet';

// Quick Entry Card - Apple Style
function QuickEntryCard({ 
  icon, 
  title, 
  subtitle, 
  onClick, 
  gradient,
  borderColor = "hover:border-primary/30"
}: { 
  icon: React.ReactNode; 
  title: string; 
  subtitle: string; 
  onClick?: () => void; 
  gradient: string;
  borderColor?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`group w-full text-left p-6 rounded-[20px] bg-white/80 backdrop-blur-sm border border-border/40 ${borderColor} hover:border-primary/30 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5 active:translate-y-0`}
    >
      <div className={`w-11 h-11 rounded-[12px] bg-gradient-to-br ${gradient} flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-110 shadow-sm`}>
        {icon}
      </div>
      <h3 className="font-medium text-[15px] text-foreground mb-1 group-hover:text-primary transition-colors">{title}</h3>
      <p className="text-[12px] text-muted-foreground/60">{subtitle}</p>
    </button>
  );
}

// Trust Item
function TrustItem({ number, label }: { number: string; label: string }) {
  return (
    <div className="text-center">
      <div className="text-[28px] sm:text-[32px] font-semibold text-foreground mb-2 tracking-tight">{number}</div>
      <div className="text-[13px] text-muted-foreground/60">{label}</div>
    </div>
  );
}

// Topic Card - Apple Style
function TopicCard({ id, name, description, icon: Icon, color, updates, onClick }: {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  updates: number;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="min-w-[280px] p-6 rounded-[20px] bg-white/80 backdrop-blur-sm border border-border/40 hover:border-primary/30 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5 text-left"
    >
      <div className="flex items-start justify-between mb-4">
        <div className={`w-10 h-10 rounded-[12px] bg-gradient-to-br ${color} flex items-center justify-center shadow-sm transition-transform duration-300 group-hover:scale-110`}>
          <Icon className="w-5 h-5" />
        </div>
        <ArrowRight className="w-5 h-5 text-primary opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 flex-shrink-0" />
      </div>
      <h3 className="font-medium text-[16px] text-foreground mb-2 group-hover:text-primary transition-colors">{name}</h3>
      <p className="text-[13px] text-muted-foreground/70 mb-4 line-clamp-2 leading-relaxed">{description}</p>
      <div className="flex items-center gap-3 text-[12px] text-muted-foreground/50">
        <span>本月更新 {updates} 篇</span>
      </div>
    </button>
  );
}

// Insight Card - Editorial Style
function InsightCard({ id, title, excerpt, tags, readTime, publishDate, featured, onClick }: {
  id: string;
  title: string;
  excerpt: string;
  tags: string[];
  readTime: number;
  publishDate: string;
  featured?: boolean;
  onClick?: () => void;
}) {
  return (
    <article
      onClick={onClick}
      className={`group p-6 rounded-[20px] bg-white/80 backdrop-blur-sm border border-border/40 hover:border-primary/30 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5 cursor-pointer ${featured ? 'md:col-span-2' : ''}`}
    >
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {tags.slice(0, 2).map((tag) => (
          <span
            key={tag}
            className="px-2.5 py-1 rounded-full bg-primary/8 text-primary text-[11px] font-medium border border-primary/15"
          >
            {tag}
          </span>
        ))}
      </div>

      <h3 className={`font-medium mb-3 text-foreground group-hover:text-primary transition-colors ${featured ? 'text-[18px]' : 'text-[15px]'}`}>
        {title}
      </h3>

      <p className={`text-muted-foreground/70 mb-4 line-clamp-2 leading-relaxed ${featured ? 'text-[14px]' : 'text-[13px]'}`}>
        {excerpt}
      </p>

      <div className="flex items-center justify-between pt-4 border-t border-border/40">
        <div className="flex items-center gap-4 text-[12px] text-muted-foreground/50">
          <span>{readTime}分钟</span>
          <span>{publishDate}</span>
        </div>
        <div className="flex items-center gap-1">
          <button className="p-2 rounded-lg hover:bg-muted/30 transition-all" title="收藏">
            <Star className="w-4 h-4 text-muted-foreground/50" />
          </button>
          <button className="p-2 rounded-lg hover:bg-muted/30 transition-all" title="分享">
            <ChevronRight className="w-4 h-4 text-muted-foreground/50" />
          </button>
        </div>
      </div>
    </article>
  );
}

// Module Card
function ModuleCard({ icon, title, subtitle, description, gradient, onMouseEnter, onClick, hoverBorder }: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  description: string;
  gradient: string;
  onMouseEnter?: () => void;
  onClick?: () => void;
  hoverBorder?: string;
}) {
  return (
    <div
      onMouseEnter={onMouseEnter}
      onClick={onClick}
      className={`group p-8 rounded-[24px] bg-white/80 backdrop-blur-sm border border-border/40 ${hoverBorder} transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-1 cursor-pointer`}
    >
      <div className={`w-14 h-14 rounded-[16px] bg-gradient-to-br ${gradient} flex items-center justify-center mb-6 transition-transform duration-300 group-hover:scale-110 shadow-sm`}>
        {icon}
      </div>
      <h3 className="font-medium text-[18px] text-foreground mb-1 group-hover:text-primary transition-colors">{title}</h3>
      <p className="text-[13px] text-muted-foreground/60 mb-3">{subtitle}</p>
      <p className="text-[14px] text-muted-foreground/70 leading-relaxed">{description}</p>
    </div>
  );
}

interface HomePageProps {
  onNavigate?: (page: 'home' | 'insights' | 'learning' | 'strategy' | 'about' | 'login' | 'register') => void;
  onNavigateToDetail?: (type: 'article' | 'report' | 'topic', id: string) => void;
}

export function HomePage({ onNavigate, onNavigateToDetail }: HomePageProps) {
  const [hoveredModule, setHoveredModule] = useState<string | null>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);

  const [homeInsights, setHomeInsights] = useState<InsightArticle[]>([]);
  const [homeReports, setHomeReports] = useState<Report[]>([]);
  const [subscriptionOpen, setSubscriptionOpen] = useState(false);

  // Track scroll for parallax and header effects
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Load recommended content for Home (7:3 content:product)
  useEffect(() => {
    const load = () => {
      const insights = getInsights()
        .filter(i => i.status === 'published' && i.showOnHome)
        .sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0))
        .slice(0, 4);
      const reports = getReports()
        .filter(r => r.status === 'published' && r.showOnHome)
        .slice(0, 4);
      setHomeInsights(insights);
      setHomeReports(reports);
    };

    load();
    const onChange = () => load();
    window.addEventListener('yiyu_data_change', onChange);
    window.addEventListener('storage', onChange);
    return () => {
      window.removeEventListener('yiyu_data_change', onChange);
      window.removeEventListener('storage', onChange);
    };
  }, []);

  const hotTopics = [
    {
      id: 'ai-landing',
      name: 'AI落地与组织学习',
      description: '企业AI转型的核心不是技术，而是组织学习能力的升级',
      icon: Brain,
      color: 'from-primary/20 to-accent/20',
      updates: 15
    },
    {
      id: 'supply-chain',
      name: '供应链韧性重构',
      description: '从单一效率优化到韧性与效率的动态平衡',
      icon: Target,
      color: 'from-accent/20 to-success/20',
      updates: 12
    },
    {
      id: 'org-efficiency',
      name: '组织效能重构',
      description: '从组织诊断到效能提升，让组织成为战略落地的引擎',
      icon: Users,
      color: 'from-secondary/20 to-primary/20',
      updates: 8
    },
    {
      id: 'strategy-implementation',
      name: '战略规划落地',
      description: '从战略共识到行动清单，从年度计划到季度复盘',
      icon: Lightbulb,
      color: 'from-success/20 to-accent/20',
      updates: 10
    },
  ];

  const insights = homeInsights.map(i => ({
    id: i.id,
    title: i.title,
    excerpt: i.excerpt,
    tags: i.tags,
    readTime: i.readTime,
    publishDate: i.publishDate.split('-').join('/'),
    featured: i.featured,
  }));

  const reports = homeReports.map(r => ({
    id: r.id,
    title: r.title,
    tags: r.tags,
    updateDate: r.publishDate.split('-').join('/'),
    version: r.version,
    isPublic: true,
    isMemberOnly: false,
  }));

  const handleNavigate = (page: string) => {
    if (onNavigate) {
      onNavigate(page as 'home' | 'insights' | 'learning' | 'strategy' | 'about' | 'login' | 'register');
    }
  };

  const handleNavigateToDetail = (type: 'article' | 'report' | 'topic', id: string) => {
    if (onNavigateToDetail) {
      onNavigateToDetail(type, id);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <Header isLoggedIn={false} userType="visitor" onNavigate={handleNavigate} />

      <SubscriptionSheet
        open={subscriptionOpen}
        onClose={() => setSubscriptionOpen(false)}
        onGoUpgrade={() => handleNavigate('register')}
      />

      {/* Hero Section - Apple Style with Depth */}
      <section 
        ref={heroRef}
        className="relative pt-32 pb-28 px-4 sm:px-6 lg:px-8 overflow-hidden"
      >
        {/* Sophisticated Background Layers */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/4 via-transparent to-accent/4" />
        <div className="absolute top-0 right-0 w-[700px] h-[700px] bg-primary/6 rounded-full blur-3xl opacity-60" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-secondary/5 rounded-full blur-3xl opacity-60" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-accent/3 rounded-full blur-3xl" />

        <div className="max-w-[1200px] mx-auto relative z-10">
          {/* Hero Content - Refined Typography */}
          <div className="max-w-4xl mx-auto text-center">
            {/* Eyebrow Text - Apple Style */}
            <p className="text-[13px] font-medium text-muted-foreground/70 tracking-[0.15em] uppercase mb-6 opacity-0 animate-fade-in-up">
              From Ideation to Incarnation
            </p>

            {/* Main Title - Typography Hierarchy */}
            <h1 className="text-[44px] sm:text-[56px] md:text-[64px] lg:text-[72px] font-semibold leading-[1.05] tracking-tight mb-6 text-foreground">
              战略驱动业务增长
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-primary to-accent">
                科技赋能组织成长
              </span>
            </h1>

            {/* Subtitle - Value Proposition */}
            <p className="text-[17px] sm:text-[19px] text-muted-foreground/80 mb-10 max-w-2xl mx-auto leading-relaxed">
              用洞察、工具与长期陪伴，把蓝图变成行动
            </p>
            
            {/* English Tagline - Subtle */}
            <p className="text-[13px] text-muted-foreground/50 tracking-[0.08em] mb-12">
              Turning Strategy into Action, Fueling Sustainable Growth
            </p>

            {/* CTA Buttons - Apple Style */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={() => handleNavigate('strategy')}
                className="group px-8 py-4 rounded-full border border-border/60 hover:border-primary/40 hover:bg-primary/5 transition-all duration-300 ease-out hover:scale-[1.02] active:scale-[0.98]"
              >
                <span className="font-medium text-[15px]">预约诊断对话</span>
                <Target className="inline ml-2 w-4 h-4 transition-transform duration-300 group-hover:rotate-90" />
              </button>
            </div>
          </div>

          {/* Scroll Indicator */}
          <div className="absolute bottom-[-60px] left-1/2 -translate-x-1/2 animate-bounce opacity-50">
            <ChevronDown className="w-5 h-5 text-muted-foreground" />
          </div>
        </div>
      </section>

      {/* Quick Entry Cards - Refined Grid */}
      <section className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-[1200px] mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <QuickEntryCard
              icon={<TrendingUp className="w-6 h-6" />}
              title="我想看洞察与观点"
              subtitle="Industry Insights"
              onClick={() => handleNavigate('insights')}
              gradient="from-primary/15 to-primary/5"
              borderColor="hover:border-primary/30"
            />
            <QuickEntryCard
              icon={<BookOpen className="w-6 h-6" />}
              title="我来学习与下载资料"
              subtitle="Learning Center"
              onClick={() => handleNavigate('learning')}
              gradient="from-secondary/15 to-secondary/5"
              borderColor="hover:border-secondary/30"
            />
            <QuickEntryCard
              icon={<Users className="w-6 h-6" />}
              title="我是战略陪伴客户"
              subtitle="Client Portal"
              onClick={() => handleNavigate('strategy')}
              gradient="from-accent/15 to-accent/5"
              borderColor="hover:border-accent/30"
            />
          </div>
        </div>
      </section>

      {/* Hot Content Section - Refined Layout */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-[1200px] mx-auto">
          {/* Section Header */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-12">
            <div className="space-y-2">
              <h2 className="text-[28px] font-semibold tracking-tight text-foreground">
                热门内容
              </h2>
              <p className="text-[14px] text-muted-foreground/60">
                Featured Content · 精选报告 + 书籍 + 洞察
              </p>
            </div>
            <button
              onClick={() => handleNavigate('insights')}
              className="group inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-border/50 hover:border-primary/40 hover:bg-primary/5 transition-all duration-300 text-[14px]"
            >
              <span>查看全部</span>
              <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5" />
            </button>
          </div>

          {/* Topic Cards - Horizontal Scroll */}
          <div className="flex gap-5 overflow-x-auto pb-4 scrollbar-hide -mx-4 px-4">
            {hotTopics.map((topic, index) => (
              <TopicCard
                key={index}
                {...topic}
                onClick={() => handleNavigateToDetail('topic', topic.id)}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Strategy Frontier Reports - Editorial Design */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-transparent to-muted/8">
        <div className="max-w-[1200px] mx-auto">
          {/* Section Header */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-12">
            <div className="space-y-2">
              <h2 className="text-[28px] font-semibold tracking-tight text-foreground">
                战略前沿报告
              </h2>
              <p className="text-[14px] text-muted-foreground/60">
                Frontier Reports · 前沿洞察 / 行业研究 / 深度分析
              </p>
            </div>
            <button
              onClick={() => handleNavigate('insights')}
              className="group inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20 transition-all duration-300 text-[14px]"
            >
              <span>订阅前沿</span>
              <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5" />
            </button>
          </div>

          {/* Editorial Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {insights.map((insight, index) => (
              <InsightCard
                key={index}
                {...insight}
                onClick={() => handleNavigateToDetail('article', insight.id)}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Strategy Companion - Apple Liquid Glass */}
      <section 
        className="py-24 px-4 sm:px-6 lg:px-8"
        onMouseLeave={() => setHoveredModule(null)}
      >
        <div className="max-w-[1200px] mx-auto">
          {/* Section Header - Value Proposition */}
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-[32px] font-semibold tracking-tight mb-3 text-foreground">
              战略陪伴
            </h2>
            <p className="text-[15px] text-muted-foreground/60 mb-6">
              Strategy Companion
            </p>
            <div className="h-px w-20 bg-border/50 mx-auto mb-6" />
            <p className="text-[20px] text-foreground/90 font-medium leading-relaxed mb-4">
              企业真正需要的，不是报告，而是<span className="text-primary">结果</span>
            </p>
            <p className="text-[14px] text-muted-foreground/70">
              可落地的增长咨询 · 助力企业持续增长的战略陪伴者
            </p>
          </div>

          {/* Module Cards with Hover Details */}
          <div className="relative">
            {/* Hover Detail Panels - Liquid Glass */}
            {hoveredModule === 'strategy' && (
              <div className="absolute inset-0 z-20">
                <div className="w-full h-full bg-gradient-to-br from-primary/8 via-primary/5 to-accent/5 rounded-[24px] border border-primary/20 shadow-2xl shadow-primary/5 backdrop-blur-2xl backdrop-saturate-180">
<div className="p-10 h-full flex flex-col">
                    {/* Header */}
                    <div className="flex items-center gap-5 mb-8">
                      <div className="w-16 h-16 rounded-[20px] bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center shadow-lg shadow-primary/15">
                        <Target className="w-8 h-8 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-[26px] font-semibold text-foreground">战略路径清晰化</h3>
                        <p className="text-[14px] text-muted-foreground/60">Strategy Path Clarification</p>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 space-y-6">
                      <div className="bg-white/60 backdrop-blur-sm rounded-[20px] p-7 shadow-sm border border-white/50">
                        <h4 className="font-semibold mb-3 text-[16px] text-foreground">核心观点</h4>
                        <p className="text-muted-foreground/80 leading-relaxed text-[15px]">
                          战略不是写在纸上的宏大叙事，而是能够指导日常决策的行动指南。我们帮助企业将战略意图转化为清晰、可执行的行动路径，让每个团队成员都能理解自己的工作如何支撑整体目标的实现。
                        </p>
                      </div>

                      {/* Stats Grid */}
                      <div className="grid grid-cols-3 gap-4">
                        <div className="bg-white/60 backdrop-blur-sm rounded-[16px] p-5 shadow-sm border border-white/50 hover:shadow-md transition-all duration-300">
                          <div className="text-[32px] font-semibold text-primary mb-1">500+</div>
                          <div className="text-[12px] text-muted-foreground/60">战略规划项目</div>
                        </div>
                        <div className="bg-white/60 backdrop-blur-sm rounded-[16px] p-5 shadow-sm border border-white/50 hover:shadow-md transition-all duration-300">
                          <div className="text-[32px] font-semibold text-primary mb-1">92%</div>
                          <div className="text-[12px] text-muted-foreground/60">战略落地率</div>
                        </div>
                        <div className="bg-white/60 backdrop-blur-sm rounded-[16px] p-5 shadow-sm border border-white/50 hover:shadow-md transition-all duration-300">
                          <div className="text-[32px] font-semibold text-primary mb-1">3个月</div>
                          <div className="text-[12px] text-muted-foreground/60">完成周期</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {hoveredModule === 'organization' && (
              <div className="absolute inset-0 z-20">
                <div className="w-full h-full bg-gradient-to-br from-secondary/8 via-secondary/5 to-primary/5 rounded-[24px] border border-secondary/20 shadow-2xl shadow-secondary/5 backdrop-blur-2xl backdrop-saturate-180">
                  <div className="p-10 h-full flex flex-col">
                    <div className="flex items-center gap-5 mb-8">
                      <div className="w-16 h-16 rounded-[20px] bg-gradient-to-br from-secondary/20 to-secondary/10 flex items-center justify-center shadow-lg shadow-secondary/15">
                        <Users className="w-8 h-8 text-secondary" />
                      </div>
                      <div>
                        <h3 className="text-[26px] font-semibold text-foreground">组织效能重构</h3>
                        <p className="text-[14px] text-muted-foreground/60">Organization Effectiveness</p>
                      </div>
                    </div>

                    <div className="flex-1 space-y-6">
                      <div className="bg-white/60 backdrop-blur-sm rounded-[20px] p-7 shadow-sm border border-white/50">
                        <h4 className="font-semibold mb-3 text-[16px] text-foreground">核心理念</h4>
                        <p className="text-muted-foreground/80 leading-relaxed text-[15px]">
                          组织效能的提升不是简单的裁员或架构调整，而是要建立与战略对齐的组织能力。我们从组织诊断出发，帮助企业识别效能瓶颈，设计针对性的解决方案，让组织成为战略落地的强大引擎。
                        </p>
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div className="bg-white/60 backdrop-blur-sm rounded-[16px] p-5 shadow-sm border border-white/50 hover:shadow-md transition-all duration-300">
                          <div className="text-[32px] font-semibold text-secondary mb-1">300+</div>
                          <div className="text-[12px] text-muted-foreground/60">组织诊断项目</div>
                        </div>
                        <div className="bg-white/60 backdrop-blur-sm rounded-[16px] p-5 shadow-sm border border-white/50 hover:shadow-md transition-all duration-300">
                          <div className="text-[32px] font-semibold text-secondary mb-1">35%</div>
                          <div className="text-[12px] text-muted-foreground/60">效能提升均值</div>
                        </div>
                        <div className="bg-white/60 backdrop-blur-sm rounded-[16px] p-5 shadow-sm border border-white/50 hover:shadow-md transition-all duration-300">
                          <div className="text-[32px] font-semibold text-secondary mb-1">6个月</div>
                          <div className="text-[12px] text-muted-foreground/60">改善周期</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {hoveredModule === 'digital' && (
              <div className="absolute inset-0 z-20">
                <div className="w-full h-full bg-gradient-to-br from-accent/8 via-accent/5 to-primary/5 rounded-[24px] border border-accent/20 shadow-2xl shadow-accent/5 backdrop-blur-2xl backdrop-saturate-180">
                  <div className="p-10 h-full flex flex-col">
                    <div className="flex items-center gap-5 mb-8">
                      <div className="w-16 h-16 rounded-[20px] bg-gradient-to-br from-accent/20 to-accent/10 flex items-center justify-center shadow-lg shadow-accent/15">
                        <Zap className="w-8 h-8 text-accent" />
                      </div>
                      <div>
                        <h3 className="text-[26px] font-semibold text-foreground">数字化与AI落地赋能</h3>
                        <p className="text-[14px] text-muted-foreground/60">Digital & AI Implementation</p>
                      </div>
                    </div>

                    <div className="flex-1 space-y-6">
                      <div className="bg-white/60 backdrop-blur-sm rounded-[20px] p-7 shadow-sm border border-white/50">
                        <h4 className="font-semibold mb-3 text-[16px] text-foreground">核心价值</h4>
                        <p className="text-muted-foreground/80 leading-relaxed text-[15px]">
                          数字化转型的核心不是技术，而是组织学习能力的升级。我们帮助企业建立数据驱动的决策体系，落地AI工具到实际业务流程，让技术真正成为驱动业务增长的引擎，而不是成本中心。
                        </p>
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div className="bg-white/60 backdrop-blur-sm rounded-[16px] p-5 shadow-sm border border-white/50 hover:shadow-md transition-all duration-300">
                          <div className="text-[32px] font-semibold text-accent mb-1">200+</div>
                          <div className="text-[12px] text-muted-foreground/60">数字化项目</div>
                        </div>
                        <div className="bg-white/60 backdrop-blur-sm rounded-[16px] p-5 shadow-sm border border-white/50 hover:shadow-md transition-all duration-300">
                          <div className="text-[32px] font-semibold text-accent mb-1">50%</div>
                          <div className="text-[12px] text-muted-foreground/60">效率提升</div>
                        </div>
                        <div className="bg-white/60 backdrop-blur-sm rounded-[16px] p-5 shadow-sm border border-white/50 hover:shadow-md transition-all duration-300">
                          <div className="text-[32px] font-semibold text-accent mb-1">4个月</div>
                          <div className="text-[12px] text-muted-foreground/60">MVP周期</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Module Cards */}
            <div className={`grid grid-cols-1 md:grid-cols-3 gap-5 transition-all duration-500 ${hoveredModule ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'}`}>
              <ModuleCard
                icon={<Target className="w-6 h-6" />}
                title="战略路径清晰化"
                subtitle="从模糊方向到清晰路径"
                description="把战略变成可执行的行动地图"
                gradient="from-primary/15 to-primary/5"
                onMouseEnter={() => setHoveredModule('strategy')}
                onClick={() => handleNavigate('strategy')}
                hoverBorder="hover:border-primary/25"
              />
              <ModuleCard
                icon={<Users className="w-6 h-6" />}
                title="组织效能重构"
                subtitle="从组织诊断到效能提升"
                description="让组织成为战略落地的引擎"
                gradient="from-secondary/15 to-secondary/5"
                onMouseEnter={() => setHoveredModule('organization')}
                onClick={() => handleNavigate('strategy')}
                hoverBorder="hover:border-secondary/25"
              />
              <ModuleCard
                icon={<Zap className="w-6 h-6" />}
                title="数字化与AI落地赋能"
                subtitle="从技术引入到能力内化"
                description="让数字化真正驱动业务增长"
                gradient="from-accent/15 to-accent/5"
                onMouseEnter={() => setHoveredModule('digital')}
                onClick={() => handleNavigate('strategy')}
                hoverBorder="hover:border-accent/25"
              />
            </div>
          </div>

          {/* CTA */}
          <div className={`text-center mt-12 transition-all duration-500 ${hoveredModule ? 'opacity-0' : 'opacity-100'}`}>
            <button
              onClick={() => handleNavigate('strategy')}
              className="group inline-flex items-center gap-2 px-8 py-4 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-primary/25"
            >
              <span className="font-medium text-[15px]">了解更多</span>
              <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
            </button>
          </div>
        </div>
      </section>

      {/* Trust Indicators - Minimal */}
      <section className={`py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-transparent to-muted/8 transition-all duration-500 ${hoveredModule ? 'opacity-0 absolute w-full' : 'opacity-100'}`}>
        <div className="max-w-[1200px] mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <TrustItem number="200+" label="服务企业" />
            <TrustItem number="500+" label="深度报告" />
            <TrustItem number="50+" label="专家资源" />
            <TrustItem number="98%" label="客户满意度" />
          </div>
        </div>
      </section>

      {/* Footer - Clean */}
      <footer className="py-16 px-4 sm:px-6 lg:px-8 border-t border-border/40 bg-muted/5">
        <div className="max-w-[1200px] mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-12">
            {/* Brand */}
            <div className="col-span-2 md:col-span-1">
              <h4 className="font-semibold text-[15px] mb-4 text-foreground">益语智库</h4>
              <p className="text-[13px] text-muted-foreground/70 leading-relaxed">
                助力企业持续增长的战略陪伴者
              </p>
            </div>
            
            {/* Insights */}
            <div>
              <h4 className="font-medium text-[14px] mb-4 text-foreground">洞察</h4>
              <ul className="space-y-2.5 text-[13px] text-muted-foreground/70">
                <li><a href="#" className="hover:text-primary transition-colors">行业洞察</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">数据洞察</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">深度洞察</a></li>
              </ul>
            </div>
            
            {/* Learning */}
            <div>
              <h4 className="font-medium text-[14px] mb-4 text-foreground">学习中心</h4>
              <ul className="space-y-2.5 text-[13px] text-muted-foreground/70">
                <li><a href="#" className="hover:text-primary transition-colors">书库</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">报告库</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">工具与模板</a></li>
              </ul>
            </div>
            
            {/* Contact */}
            <div>
              <h4 className="font-medium text-[14px] mb-4 text-foreground">联系我们</h4>
              <ul className="space-y-2.5 text-[13px] text-muted-foreground/70">
                <li><a href="#" className="hover:text-primary transition-colors">关于我们</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">战略陪伴</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">预约对话</a></li>
              </ul>
            </div>
          </div>
          
          {/* Bottom */}
          <div className="pt-8 border-t border-border/40 flex flex-col md:flex-row items-center justify-between gap-4 text-[12px] text-muted-foreground/60">
            <p>© 2026 益语智库 Yiyu Think Tank. All rights reserved.</p>
            <p>ICP备案号：待提交</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
