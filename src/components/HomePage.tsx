import { useState, useEffect, useRef, useMemo } from 'react';
import { Header } from './Header';
import { Footer } from './Footer';
import { ArrowRight, Brain, Target, Users, TrendingUp, BookOpen, FileText, Lightbulb, ChevronRight, Star, Zap, ChevronDown, Wrench, Layers } from 'lucide-react';
import { getInsights, getReports, getBooks, getMethodologies, type InsightArticle, type Report, type Book, type Methodology } from '../lib/dataService';
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
function InsightCard({ id, title, excerpt, topics, publishDate, onClick }: {
  id: string;
  title: string;
  excerpt: string;
  topics: string[];
  publishDate: string;
  onClick?: () => void;
}) {
  return (
    <article
      onClick={onClick}
      className="group p-6 rounded-[20px] bg-white/80 backdrop-blur-sm border border-border/40 hover:border-primary/30 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5 cursor-pointer"
    >
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {(topics || []).slice(0, 2).map((topic) => (
          <span
            key={topic}
            className="px-2.5 py-1 rounded-full bg-primary/8 text-primary text-[11px] font-medium border border-primary/15"
          >
            {topic}
          </span>
        ))}
      </div>

      <h3 className="font-medium mb-3 text-foreground group-hover:text-primary transition-colors text-[16px]">
        {title}
      </h3>

      <p className="text-muted-foreground/70 mb-4 line-clamp-2 leading-relaxed text-[13px]">
        {excerpt}
      </p>

      <div className="flex items-center justify-between pt-4 border-t border-border/40">
        <div className="flex items-center gap-4 text-[12px] text-muted-foreground/50">
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
      className={`group p-8 rounded-[24px] bg-white/80 backdrop-blur-sm border border-border/40 ${hoverBorder} transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-1 cursor-pointer hover:bg-primary hover:border-primary/30`}
    >
      <div className={`w-14 h-14 rounded-[16px] bg-gradient-to-br ${gradient} flex items-center justify-center mb-6 transition-all duration-300 group-hover:scale-110 shadow-sm group-hover:bg-white/20 group-hover:backdrop-blur-sm`}
      >
        <div className="text-foreground group-hover:text-white transition-colors">
          {icon}
        </div>
      </div>
      <h3 className="font-medium text-[18px] text-foreground mb-1 transition-all duration-300 group-hover:text-white group-hover:text-[22px]">
        {title}
      </h3>
      {/* Hover on Home should become "blue-only" (no original copy) */}
      <p className="text-[13px] text-muted-foreground/60 mb-3 transition-all duration-300 group-hover:opacity-0 group-hover:translate-y-1">{subtitle}</p>
      <p className="text-[14px] text-muted-foreground/70 leading-relaxed transition-all duration-300 group-hover:opacity-0 group-hover:translate-y-1">{description}</p>
    </div>
  );
}

interface HomePageProps {
  onNavigate?: (page: 'home' | 'insights' | 'learning' | 'strategy' | 'about' | 'login' | 'register' | 'book-reader' | 'methodology-library' | 'strategy-path' | 'business-design' | 'org-effectiveness' | 'digital-ai', id?: string) => void;
  onNavigateToDetail?: (type: 'article' | 'report' | 'topic', id: string) => void;
}

export function HomePage({ onNavigate, onNavigateToDetail }: HomePageProps) {
  // NOTE: Legacy hover-detail behavior removed (cards now click to dedicated pages).
  const [isScrolled, setIsScrolled] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);

  const [homeInsights, setHomeInsights] = useState<InsightArticle[]>([]);
  const [homeReports, setHomeReports] = useState<Report[]>([]);
  const [subscriptionOpen, setSubscriptionOpen] = useState(false);

  const [latestTopic, setLatestTopic] = useState<'战略' | '业务设计' | '组织' | 'AI 技术'>('战略');

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
        // topics-only schema: no featured sorting
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

  const latestTopicCards: Array<{
    id: '战略' | '业务设计' | '组织' | 'AI 技术';
    title: string;
    desc: string;
    icon: React.ComponentType<{ className?: string }>;
    gradient: string;
    accent: string;
  }> = [
    { id: '战略', title: '战略', desc: '把方向讲清楚，把取舍做出来', icon: Target, gradient: 'from-primary/18 to-primary/6', accent: 'rgba(37, 99, 235, 0.95)' },
    { id: '业务设计', title: '业务设计', desc: '把想法变成可交付、可复用的方案', icon: Lightbulb, gradient: 'from-fuchsia-500/18 to-fuchsia-500/6', accent: 'rgba(192, 38, 211, 0.95)' },
    { id: '组织', title: '组织', desc: '让人和事跑起来：责任清楚、节奏稳定', icon: Users, gradient: 'from-emerald-500/18 to-emerald-500/6', accent: 'rgba(16, 185, 129, 0.95)' },
    { id: 'AI 技术', title: 'AI 技术', desc: '把 AI 变成省力的小工具和稳定的工作流', icon: Zap, gradient: 'from-orange-500/18 to-orange-500/6', accent: 'rgba(249, 115, 22, 0.95)' },
  ];

  type LatestResource = {
    kind: 'article' | 'report' | 'book' | 'methodology';
    id: string;
    title: string;
    excerpt: string;
    date: string;
    coverImage?: string;
    coverColor?: string;
  };

  const latestResources = useMemo(() => {
    const topic = latestTopic;

    const asDate = (s?: string) => {
      const t = s ? new Date(s).getTime() : 0;
      return Number.isFinite(t) ? t : 0;
    };

    const articles = getInsights()
      .filter((a) => a.status === 'published' && (a.topics || []).includes(topic))
      .map((a: InsightArticle): LatestResource => ({
        kind: 'article',
        id: a.id,
        title: a.title,
        excerpt: a.excerpt,
        date: a.publishDate,
        coverImage: a.coverImage,
      }));

    const reports = getReports()
      .filter((r) => r.status === 'published' && (r.topics || []).includes(topic))
      .map((r: Report): LatestResource => ({
        kind: 'report',
        id: r.id,
        title: r.title,
        excerpt: r.summary,
        date: r.publishDate,
        coverImage: r.coverImage,
      }));

    const books = getBooks()
      .filter((b) => b.status === 'published' && (b.topics || []).includes(topic))
      .map((b: Book): LatestResource => ({
        kind: 'book',
        id: b.id,
        title: b.title,
        excerpt: b.description,
        date: b.publishDate,
        coverImage: b.coverImage,
        coverColor: (b as any).coverColor,
      }));

    const methods = getMethodologies()
      .filter((m) => m.status === 'published' && (m.topics || []).includes(topic))
      .map((m: Methodology): LatestResource => ({
        kind: 'methodology',
        id: m.id,
        title: m.title,
        excerpt: m.excerpt,
        date: m.publishDate,
        coverImage: (m as any).coverImage,
      }));

    return [...articles, ...reports, ...books, ...methods]
      .sort((a, b) => asDate(b.date) - asDate(a.date))
      .slice(0, 6);
  }, [latestTopic]);

  const latestCounts = useMemo(() => {
    const by: Record<string, number> = { '战略': 0, '业务设计': 0, '组织': 0, 'AI 技术': 0 };

    const bump = (topics: any) => {
      (topics || []).forEach((t: string) => {
        if (t in by) by[t] += 1;
      });
    };

    getInsights().filter((a) => a.status === 'published').forEach((a) => bump((a as any).topics));
    getReports().filter((r) => r.status === 'published').forEach((r) => bump((r as any).topics));
    getBooks().filter((b) => b.status === 'published').forEach((b) => bump((b as any).topics));
    getMethodologies().filter((m) => m.status === 'published').forEach((m) => bump((m as any).topics));

    return by;
  }, []);

  const insights = homeInsights.map(i => ({
    id: i.id,
    title: i.title,
    excerpt: i.excerpt,
    topics: i.topics,
    publishDate: i.publishDate.split('-').join('/'),
  }));

  const reports = homeReports.map(r => ({
    id: r.id,
    title: r.title,
    topics: r.topics,
    updateDate: r.publishDate.split('-').join('/'),
    version: r.version,
    isPublic: true,
    isMemberOnly: false,
  }));

  const handleNavigate = (page: string) => {
    if (onNavigate) {
      onNavigate(page as any);
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
        className="relative pt-24 sm:pt-32 pb-20 sm:pb-28 px-4 sm:px-6 lg:px-8 overflow-hidden"
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
            <p className="text-[13px] font-medium text-muted-foreground/70 tracking-[0.18em] uppercase mb-6 opacity-0 animate-fade-in-up">
              益语智库 · 战略咨询 × 行业洞察 × 学习平台
            </p>

            {/* Main Title - Typography Hierarchy */}
            <h1 className="text-[34px] sm:text-[54px] md:text-[62px] lg:text-[70px] font-semibold leading-[1.06] tracking-tight mb-6 text-foreground">
              战略驱动业务增长
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-primary to-accent">
                科技赋能组织成长
              </span>
            </h1>

            {/* Subtitle - Value Proposition */}
            <p className="text-[16px] sm:text-[18px] text-muted-foreground/80 mb-8 max-w-3xl mx-auto leading-relaxed">
              益语智库服务于中小企业高管与创始人、公益组织从业者、终身学习者，用战略把增长变成可执行的路径，在 AI 时代持续升级认知与协作。
            </p>

            {/* CTA Button */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={() => window.open('https://hw7oabz548h.feishu.cn/share/base/form/shrcnOlk5n3pQdidooIVje76xUc', '_blank')}
                className="group inline-flex items-center gap-2 px-8 py-4 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-primary/25"
              >
                <span className="font-medium text-[15px]">免费预约组织诊断</span>
                <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
              </button>
            </div>
          </div>

          {/* Scroll Indicator */}
          <div className="absolute bottom-[-60px] left-1/2 -translate-x-1/2 animate-bounce opacity-50">
            <ChevronDown className="w-5 h-5 text-muted-foreground" />
          </div>
        </div>
      </section>

      {/* 首页：按需求隐藏「免费预约组织诊断」后到「战略陪伴」前的内容（3张跳转卡片 / 热门内容 / 战略前沿报告） */}

      {/* 最新内容 */}
      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-[1200px] mx-auto">
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-[32px] font-semibold tracking-tight mb-3 text-foreground">最新内容</h2>
            <p className="text-[15px] text-muted-foreground/60 mb-6">Latest Content</p>
            <div className="h-px w-20 bg-border/50 mx-auto mb-6" />
            <p className="text-[20px] text-foreground/90 font-medium leading-relaxed mb-2">我们不堆概念，只给你下一步</p>
            <p className="text-[14px] text-muted-foreground/70">从战略到 AI，把复杂问题拆成可执行方案</p>
          </div>

          {/* 标签卡片（像浏览器标签页）：强交互提示 */}
          <div className="mt-14">
            <div className="relative rounded-[26px] bg-white/55 backdrop-blur-xl border border-border/40 shadow-[0_30px_80px_-55px_rgba(0,0,0,0.35)] overflow-hidden">
              {/* subtle mesh */}
              <div className="absolute inset-0 pointer-events-none bg-gradient-to-br from-primary/[0.06] via-transparent to-accent/[0.05]" />
              <div className="relative p-2">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                  {latestTopicCards.map((c) => {
                    const Icon = c.icon;
                    const active = latestTopic === c.id;

                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setLatestTopic(c.id)}
                        className={`relative text-left rounded-[18px] px-4 py-3.5 transition-all duration-300 outline-none focus:ring-2 focus:ring-primary/20 will-change-transform ${
                          active
                            ? 'bg-white shadow-lg border border-border/70 scale-[1.04]'
                            : 'bg-[#E6E6E6] hover:bg-[#DCDCDC] border border-border/40 hover:border-border/60 hover:-translate-y-0.5 hover:shadow-sm'
                        }`}
                        style={
                          active
                            ? {
                                backgroundImage: `linear-gradient(180deg, rgba(0,0,0,0.02), rgba(0,0,0,0.00))`,
                              }
                            : undefined
                        }
                      >
                        {/* left accent bar */}
                        <div
                          className={`absolute left-0 top-3 bottom-3 w-[3px] rounded-r-full transition-all duration-300 ${
                            active ? 'opacity-100' : 'opacity-0'
                          }`}
                          style={{ background: c.accent }}
                        />

                        {/* badge */}
                        <div className="absolute right-3 top-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[11px] font-medium border transition-all duration-300 ${
                              active
                                ? 'bg-white text-foreground border-border/60'
                                : 'bg-white/60 text-muted-foreground/70 border-border/40'
                            }`}
                            style={active ? { boxShadow: `0 6px 22px -14px ${c.accent}` } : undefined}
                          >
                            {latestCounts[c.id] ?? 0}
                          </span>
                        </div>
                        {/* underline removed (keep clean) */}

                        <div className="flex items-start gap-3">
                          <div
                            className={`mt-0.5 w-10 h-10 rounded-[14px] flex items-center justify-center shadow-sm border transition-all duration-300 ${
                              active
                                ? 'bg-white border-border/60'
                                : 'bg-white/45 border-border/30'
                            }`}
                            style={active ? { boxShadow: `0 18px 40px -28px ${c.accent}` } : undefined}
                          >
                            <div className={`w-9 h-9 rounded-[13px] bg-gradient-to-br ${c.gradient} flex items-center justify-center`}>
                              <Icon className={`w-5 h-5 transition-all duration-300 ${active ? 'text-foreground' : 'text-foreground/75'}`} />
                            </div>
                          </div>

                          <div className="min-w-0">
                            <div
                              className={`tracking-tight transition-all duration-300 ${
                                active
                                  ? 'text-[18px] font-semibold text-foreground'
                                  : 'text-[16px] font-medium text-foreground/75'
                              }`}
                            >
                              {c.title}
                            </div>
                            <div
                              className={`mt-0.5 text-[12px] leading-relaxed transition-all duration-300 ${
                                active ? 'text-muted-foreground/75' : 'text-muted-foreground/60'
                              }`}
                            >
                              {c.desc}
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* 资源长条卡片（最多 6 条） */}
          <div key={latestTopic} className="mt-10 space-y-3 animate-fade-in-up">
            {latestResources.length === 0 ? (
              <div className="text-center text-[14px] text-muted-foreground/70 py-10">
                暂无内容
              </div>
            ) : (
              latestResources.map((r: any) => (
                <button
                  key={`${r.kind}-${r.id}`}
                  type="button"
                  onClick={() => {
                    if (r.kind === 'article') {
                      onNavigateToDetail?.('article', r.id);
                      return;
                    }
                    if (r.kind === 'report') {
                      onNavigateToDetail?.('report', r.id);
                      return;
                    }
                    if (r.kind === 'book') {
                      if (onNavigate) onNavigate('book-reader' as any, r.id);
                      else window.location.assign(`${window.location.pathname}?page=book-reader&bookId=${encodeURIComponent(r.id)}`);
                      return;
                    }
                    // methodology
                    if (onNavigate) onNavigate('methodology-library' as any, r.id);
                    else window.location.assign(`${window.location.pathname}?page=methodology-library&id=${encodeURIComponent(r.id)}`);
                  }}
                  className="w-full text-left bg-white/70 hover:bg-white/90 border border-border/40 hover:border-border/60 rounded-[22px] p-4 sm:p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_20px_60px_-45px_rgba(0,0,0,0.35)]"
                >
                  <div className="flex gap-4">
                    <div className="w-28 h-20 rounded-[14px] overflow-hidden flex-shrink-0 bg-gradient-to-br from-primary/10 to-accent/10 relative">
                      {r.coverImage ? (
                        <img src={r.coverImage} alt={r.title} className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          {r.kind === 'book' ? (
                            <BookOpen className="w-6 h-6 text-primary/25" />
                          ) : r.kind === 'report' ? (
                            <TrendingUp className="w-6 h-6 text-success/25" />
                          ) : r.kind === 'methodology' ? (
                            <Wrench className="w-6 h-6 text-primary/25" />
                          ) : (
                            <FileText className="w-6 h-6 text-primary/25" />
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div className="font-semibold text-[15px] text-foreground line-clamp-1">
                          {r.title}
                        </div>
                        <div className="text-[12px] text-muted-foreground/60 flex-shrink-0">{r.date}</div>
                      </div>
                      <div className="mt-1 text-[13px] text-muted-foreground/70 line-clamp-2 leading-relaxed">
                        {r.excerpt}
                      </div>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </section>

      {/* Strategy Companion - Apple Liquid Glass */}
      <section 
        className="py-24 px-4 sm:px-6 lg:px-8"
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

          {/* 4-up cards. Hover → blue, hide copy. Click → intro pages */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <ModuleCard
              icon={<Target className="w-6 h-6" />}
              title="战略路径清晰化"
              subtitle="从模糊方向到清晰路径"
              description="把战略变成可执行的行动地图"
              gradient="from-primary/15 to-primary/5"
              onClick={() => handleNavigate('strategy-path')}
              hoverBorder="hover:border-primary/25"
            />

            <ModuleCard
              icon={<Layers className="w-6 h-6" />}
              title="业务设计体系化"
              subtitle="从战略意图到业务模型"
              description="把战略变成可交付的产品与方案"
              gradient="from-primary/15 to-accent/5"
              onClick={() => handleNavigate('business-design')}
              hoverBorder="hover:border-primary/25"
            />

            <ModuleCard
              icon={<Users className="w-6 h-6" />}
              title="组织效能重构"
              subtitle="从组织诊断到效能提升"
              description="让组织成为战略落地的引擎"
              gradient="from-secondary/15 to-secondary/5"
              onClick={() => handleNavigate('org-effectiveness')}
              hoverBorder="hover:border-secondary/25"
            />

            <ModuleCard
              icon={<Zap className="w-6 h-6" />}
              title="数字化与AI落地赋能"
              subtitle="从技术引入到能力内化"
              description="让数字化真正驱动业务增长"
              gradient="from-accent/15 to-accent/5"
              onClick={() => handleNavigate('digital-ai')}
              hoverBorder="hover:border-accent/25"
            />
          </div>

          {/* CTA */}
          <div className="text-center mt-12">
            <button
              onClick={() => handleNavigate('strategy')}
              className="group inline-flex items-center gap-2 px-8 py-4 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-primary/25"
            >
              <span className="font-medium text-[15px]">查看成功案例</span>
              <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
            </button>
          </div>
        </div>
      </section>

      {/* Trust Indicators - Minimal */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-transparent to-muted/8">
        <div className="max-w-[1200px] mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <TrustItem number="200+" label="服务企业" />
            <TrustItem number="500+" label="深度报告" />
            <TrustItem number="50+" label="专家资源" />
            <TrustItem number="98%" label="客户满意度" />
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer onNavigate={handleNavigate} />


    </div>
  );
}
