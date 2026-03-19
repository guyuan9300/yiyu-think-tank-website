import { useState, useEffect } from 'react';
import { Header } from './Header';
import { Footer } from './Footer';
import { fetchCaseShowcases, type CaseShowcase } from '../lib/caseShowcaseApi';
import {
  ArrowRight,
  ChevronRight,
  CheckCircle,
  BookOpen,
  FileText,
  Download,
  Search,
  ChevronDown,
  Minus,
  Plus,
  Bookmark,
  Share2,
  Sparkles,
  TrendingUp,
  Award,
  Lightbulb,
  BarChart3,
  Target,
  Users,
  Zap,
  ArrowUpRight,
  ChevronLeft,
  MoveRight
} from 'lucide-react';

// Strategy Page Props
interface StrategyPageProps {
  onNavigate?: (page: 'home' | 'insights' | 'learning' | 'strategy' | 'about' | 'login' | 'register' | 'case', id?: string) => void;
  isClientMode?: boolean;
  clientInfo?: {
    organizationName: string;
    startDate: string;
    endDate: string;
    nextMeeting: string;
    quarterlyFocus: string;
    currentActions: number;
    latestDeliverables: number;
  };
}

export function StrategyPage({ onNavigate, isClientMode = false, clientInfo }: StrategyPageProps) {
  // Insight filter state
  const [selectedInsightTag, setSelectedInsightTag] = useState('all');

  // Tool filter state
  const [toolCategory, setToolCategory] = useState('all');

  // FAQ expand state
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);
  
  const [caseShowcases, setCaseShowcases] = useState<CaseShowcase[]>([]);

  // Navigate to case detail
  const handleNavigateToCase = (caseSlug: string) => {
    if (onNavigate) {
      onNavigate('case', caseSlug);
    }
  };

  // Principles data
  const principles = [
    { title: '共创参与', desc: '一起动手共创，和你并肩把方案变成现实' },
    { title: '组织赋能', desc: '把组织打造成学习型组织' },
    { title: '效果导向', desc: '用目标与指标衡量成果' }
  ];

  const withBase = (p: string) => `${import.meta.env.BASE_URL}${String(p || '').replace(/^\//, '')}`;

  // Cases data fallback
  const fallbackCases: CaseShowcase[] = [
    {
      id: 'fallback-blue-letter',
      industry: '公益/教育',
      clientName: '蓝信封',
      title: '专注于乡村儿童心理健康服务的公益机构',
      subtitle: '通过书信交流建立长期陪伴关系',
      tags: ['公益', '教育'],
      logoUrl: withBase('/images/cases/blue-letter.png'),
      slug: 'blue-letter',
      pptFileUrl: '',
      pptFileName: '',
      slideImages: [],
      isPublished: true,
      sortOrder: 1,
    },
    {
      id: 'fallback-vision-capital',
      industry: '金融/投资',
      clientName: '愿景资本',
      title: '国家新兴产业创投基金管理公司',
      subtitle: '聚焦早中期投资，陪伴创业者成长',
      tags: ['投资', '创投'],
      logoUrl: withBase('/images/cases/vision-capital.png'),
      slug: 'vision-capital',
      pptFileUrl: '',
      pptFileName: '',
      slideImages: [],
      isPublished: true,
      sortOrder: 2,
    },
    {
      id: 'fallback-beike-foundation',
      industry: '公益/房地产',
      clientName: '贝壳公益基金会',
      title: '城市社区公益平台',
      subtitle: '打造互助互利的社区公益平台',
      tags: ['社区', '公益'],
      logoUrl: withBase('/images/cases/beike-foundation.png'),
      slug: 'beike-foundation',
      pptFileUrl: '',
      pptFileName: '',
      slideImages: [],
      isPublished: true,
      sortOrder: 3,
    },
    {
      id: 'fallback-rici-foundation',
      industry: '公益/教育',
      clientName: '日慈基金会',
      title: '青少年心智素养教育',
      subtitle: '专注心智素养教育项目设计与推广',
      tags: ['教育', '心理'],
      logoUrl: withBase('/images/cases/rici-foundation.png'),
      slug: 'rici-foundation',
      pptFileUrl: '',
      pptFileName: '',
      slideImages: [],
      isPublished: true,
      sortOrder: 4,
    },
    {
      id: 'fallback-tianzige',
      industry: '公益/教育',
      clientName: '田字格',
      title: '乡土人本教育探索',
      subtitle: '开展乡土人本教育模式探索',
      tags: ['乡村', '教育'],
      logoUrl: withBase('/images/cases/tianzige.png'),
      slug: 'tianzige',
      pptFileUrl: '',
      pptFileName: '',
      slideImages: [],
      isPublished: true,
      sortOrder: 5,
    },
    {
      id: 'fallback-abc-consulting',
      industry: '公益/咨询',
      clientName: 'ABC美好社会咨询社',
      title: '专业公益咨询服务',
      subtitle: '为 NGO 提供战略、运营等专业咨询',
      tags: ['咨询', 'NGO'],
      logoUrl: withBase('/images/cases/abc-consulting.png'),
      slug: 'abc-consulting',
      pptFileUrl: '',
      pptFileName: '',
      slideImages: [],
      isPublished: true,
      sortOrder: 6,
    },
    {
      id: 'fallback-lithium-sodium-krypton-strontium',
      industry: '教育/科技',
      clientName: '锂钠氪锶',
      title: '教育科技解决方案',
      subtitle: '通过 AI 和大数据提供个性化方案',
      tags: ['AI', '教育'],
      logoUrl: withBase('/images/cases/lithium-sodium-krypton-strontium.png'),
      slug: 'lithium-sodium-krypton-strontium',
      pptFileUrl: '',
      pptFileName: '',
      slideImages: [],
      isPublished: true,
      sortOrder: 7,
    },
    {
      id: 'fallback-china-rural-foundation',
      industry: '公益/乡村振兴',
      clientName: '中国乡村发展基金会',
      title: '乡村发展与扶贫事业',
      subtitle: '实施扶贫开发、乡村振兴项目',
      tags: ['乡村', '扶贫'],
      logoUrl: withBase('/images/cases/china-rural-foundation.png'),
      slug: 'china-rural-foundation',
      pptFileUrl: '',
      pptFileName: '',
      slideImages: [],
      isPublished: true,
      sortOrder: 8,
    },
    {
      id: 'fallback-nio',
      industry: '汽车/新能源',
      clientName: '蔚来汽车',
      title: '智能电动汽车与用户体验',
      subtitle: '创造愉悦的用户生活方式',
      tags: ['汽车', '新能源'],
      logoUrl: withBase('/images/cases/nio.png'),
      slug: 'nio',
      pptFileUrl: '',
      pptFileName: '',
      slideImages: [],
      isPublished: true,
      sortOrder: 9,
    }
  ];

  useEffect(() => {
    let canceled = false;
    const loadCases = async () => {
      const result = await fetchCaseShowcases('published');
      if (canceled) return;
      if (result.ok && result.data) {
        setCaseShowcases(result.data);
      }
    };
    void loadCases();
    return () => {
      canceled = true;
    };
  }, []);

  const cases = caseShowcases.length ? caseShowcases : fallbackCases;
  const caseRows = cases.reduce<Array<CaseShowcase[]>>((rows, item, index) => {
    const rowIndex = Math.floor(index / 3);
    if (!rows[rowIndex]) rows[rowIndex] = [];
    rows[rowIndex].push(item);
    return rows;
  }, []);

  // Insights data
  const insights = [
    {
      type: 'featured',
      title: 'AI时代，组织学习正在发生什么变化？',
      summary: '随着AI技术的快速发展，组织学习的方式和效率正在经历根本性变革',
      tags: ['AI与组织学习'],
      readTime: '8分钟'
    },
    {
      type: 'medium',
      title: '从项目制到产品制：咨询公司的转型思考',
      summary: '传统咨询公司面临交付效率和专业深度的双重挑战',
      tags: ['商业模式'],
      readTime: '12分钟'
    },
    {
      type: 'medium',
      title: '公益组织的战略聚焦：从做什么到不做什么',
      summary: '资源有限的公益组织如何在多重社会需求中找到自己的核心定位',
      tags: ['战略规划'],
      readTime: '6分钟'
    },
    {
      type: 'insight',
      title: '真正有效的组织变革，往往是安静的',
      summary: '为什么有些组织能够持续高效运转？机制设计是答案的关键'
    },
    {
      type: 'tool',
      title: '战略行动手册2.0',
      desc: '从战略到岗位KPI的系统化工具',
      tags: ['战略'],
      category: '工具'
    },
    {
      type: 'insight',
      title: '数字化转型的三个陷阱与应对策略',
      summary: '许多组织的数字化转型流于形式，真正的价值创造需要避开这些坑',
      tags: ['数字化落地'],
      readTime: '15分钟'
    },
    {
      type: 'article',
      title: '组织效能提升的底层逻辑：机制设计',
      summary: '为什么有些组织能够持续高效运转？机制设计是答案的关键',
      tags: ['组织效能'],
      readTime: '10分钟'
    },
    {
      type: 'tool',
      title: '数字化组织驾驶舱',
      desc: '可视化看板与仪表盘，实时监控组织协作效能',
      tags: ['数智化'],
      category: '工具'
    },
    {
      type: 'insight',
      title: '创业者51个问题：战略自检框架',
      summary: '覆盖战略、组织、运营全维度的系统化自检',
      tags: ['战略']
    }
  ];

  // Insight tags
  const insightTags = [
    { id: 'all', label: '全部' },
    { id: 'strategy', label: '战略' },
    { id: 'organization', label: '组织' },
    { id: 'digital', label: '数智化' },
    { id: 'ai', label: 'AI落地' }
  ];

  // Tools data
  const tools = [
    {
      name: '战略行动手册2.0',
      desc: '从战略到岗位KPI的系统化工具',
     适用人群: ['CEO', '战略负责人'],
      category: 'strategy'
    },
    {
      name: '数字化组织驾驶舱',
      desc: '可视化看板，实时监控组织协作效能',
     适用人群: ['COO', '运营负责人'],
      category: 'digital'
    },
    {
      name: '学习型组织笔记',
      desc: '基于彼得·圣吉五项修炼的评估工具',
     适用人群: ['HR负责人'],
      category: 'organization'
    },
    {
      name: 'AI前后测报告',
      desc: '数据化评估组织的AI学习能力',
     适用人群: ['数字化负责人'],
      category: 'ai'
    },
    {
      name: 'ORID复盘桌游',
      desc: '结构化复盘工具，游戏化提升质量',
     适用人群: ['团队负责人'],
      category: 'organization'
    },
    {
      name: '经营沙盘',
      desc: '模拟决策与系统性思考的训练工具',
     适用人群: ['中高层管理者'],
      category: 'strategy'
    }
  ];

  // Tool categories
  const toolCategories = [
    { id: 'all', label: '全部' },
    { id: 'strategy', label: '战略' },
    { id: 'organization', label: '组织' },
    { id: 'digital', label: '数智化' },
    { id: 'ai', label: 'AI落地' }
  ];

  // Cooperation steps
  const cooperationSteps = [
    {
      step: '01',
      title: '前期诊断',
      desc: '识别问题地图与优先级',
      outputs: ['问题地图', '优先级矩阵', '初步行动建议']
    },
    {
      step: '02',
      title: '方案共创',
      desc: '共创战略与执行模型',
      outputs: ['共创工作坊', '行动方案', '里程碑计划']
    },
    {
      step: '03',
      title: '落地陪伴',
      desc: '看板/OKR推动执行',
      outputs: ['周/月度协同', 'OKR/看板管理', '会议节奏落地']
    },
    {
      step: '04',
      title: '阶段复盘',
      desc: '效果评估与资产沉淀',
      outputs: ['效果评估', '方法论沉淀', '组织资产打包']
    }
  ];

  // FAQ data
  const faqs = [
    {
      question: '你们和传统咨询最大的不同？',
      answer: '我们不是交付PPT就结束，而是陪你把方案落地。强调共创参与、组织赋能、效果导向，用目标与指标衡量成果。'
    },
    {
      question: '一般需要多长时间见到变化？',
      answer: '轻量诊断1-2周可见问题地图；季度陪伴通常在第二个月开始看到明显变化；年度陪伴会有持续迭代的效果积累。'
    },
    {
      question: '如何保证落地效果？',
      answer: '我们通过周/月度协同、OKR看板、阶段复盘等机制确保方案落地，同时建立组织能力让效果可持续。'
    }
  ];

  // Handle navigation
  const handleNavigate = (page: string) => {
    if (onNavigate) {
      onNavigate(page as 'home' | 'insights' | 'learning' | 'strategy' | 'about' | 'login' | 'register');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header isLoggedIn={isClientMode} userType={isClientMode ? 'client' : 'visitor'} onNavigate={handleNavigate} />

      {/* Client Mode: Organization Status Bar */}
      {isClientMode && clientInfo && (
        <div className="fixed top-16 left-0 right-0 z-40 bg-gradient-to-r from-primary/5 to-accent/5 border-b border-border/40 py-3 px-4 sm:px-6 lg:px-8">
          <div className="max-w-[1200px] mx-auto flex items-center justify-between">
            <div className="flex items-center gap-6 text-[13px]">
              <span className="text-foreground font-medium">
                你已绑定：{clientInfo.organizationName}
              </span>
              <span className="text-muted-foreground/60">陪伴周期：{clientInfo.startDate}–{clientInfo.endDate}</span>
              <span className="text-muted-foreground/60">下一次例会：{clientInfo.nextMeeting}</span>
            </div>
            <button
              onClick={() => handleNavigate('strategy')}
              className="px-4 py-2 bg-primary/10 text-primary rounded-full text-[13px] font-medium hover:bg-primary/20 transition-all"
            >
              进入我的组织
            </button>
          </div>
        </div>
      )}

      {/* Results Section - Value Proposition - Apple Style */}
      <section id="results" className={`pt-32 pb-16 px-4 sm:px-6 lg:px-8 ${isClientMode ? 'pt-48' : ''}`}>
        <div className="max-w-[1200px] mx-auto">
          {/* Value Proposition Card - Apple Style */}
          <div className="bg-white rounded-[24px] border border-[rgba(15,23,42,0.06)] p-8 mb-12">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6 mb-8">
              <div className="flex-1">
                <h1 className="text-[28px] md:text-[36px] font-semibold tracking-tight text-[rgba(15,23,42,0.92)] leading-[1.15] mb-4">
                  企业真正需要的，<br />
                  <span className="text-[rgba(99,102,241,0.92)]">不是报告，而是结果</span>
                </h1>
                <div className="flex flex-wrap gap-x-6 gap-y-3 mt-6">
                  {principles.map((principle, index) => (
                    <span key={index} className="text-[14px] text-[rgba(15,23,42,0.60)] flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[rgba(99,102,241,0.50)]" />
                      {principle.title}
                    </span>
                  ))}
                </div>
              </div>

              {/* Trust Indicators - Apple Style */}
              <div className="flex flex-col lg:items-end gap-6">
                <div className="flex gap-8 lg:gap-10">
                  <div className="text-center">
                    <div className="text-[28px] font-semibold text-[rgba(15,23,42,0.92)] tracking-tight">50+</div>
                    <div className="text-[12px] text-[rgba(15,23,42,0.50)]">服务企业</div>
                  </div>
                  <div className="text-center">
                    <div className="text-[28px] font-semibold text-[rgba(15,23,42,0.92)] tracking-tight">200+</div>
                    <div className="text-[12px] text-[rgba(15,23,42,0.50)]">洞察报告</div>
                  </div>
                  <div className="text-center">
                    <div className="text-[28px] font-semibold text-[rgba(15,23,42,0.92)] tracking-tight">1000+</div>
                    <div className="text-[12px] text-[rgba(15,23,42,0.50)]">学习资源</div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    if (onNavigate) {
                      onNavigate('strategy-companion' as any);
                    } else {
                      const params = new URLSearchParams(window.location.search);
                      params.set('page', 'strategy-companion');
                      window.location.assign(`?${params.toString()}`);
                    }
                  }}
                  className="group inline-flex items-center gap-1.5 text-[14px] text-[rgba(99,102,241,0.85)] hover:text-[rgba(99,102,241,1)] transition-colors font-medium"
                >
                  <span>进入战略陪伴页面</span>
                  <ArrowUpRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </button>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Client Mode: Quarterly Overview Cards */}
      {isClientMode && clientInfo && (
        <section className="px-4 sm:px-6 lg:px-8 pb-12">
          <div className="max-w-[1200px] mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Card 1 */}
              <div className="bg-white rounded-[20px] border border-[rgba(15,23,42,0.06)] p-6 hover:shadow-lg hover:shadow-[rgba(99,102,241,0.08)] hover:-translate-y-0.5 transition-all duration-300">
                <p className="text-[13px] text-[rgba(15,23,42,0.50)] mb-2">本季度重点议题</p>
                <p className="text-[18px] font-medium text-[rgba(15,23,42,0.92)] leading-snug">{clientInfo.quarterlyFocus}</p>
              </div>
              {/* Card 2 */}
              <div className="bg-white rounded-[20px] border border-[rgba(15,23,42,0.06)] p-6 hover:shadow-lg hover:shadow-[rgba(99,102,241,0.08)] hover:-translate-y-0.5 transition-all duration-300">
                <p className="text-[13px] text-[rgba(15,23,42,0.50)] mb-2">当前推进中的动作</p>
                <p className="text-[18px] font-medium text-[rgba(15,23,42,0.92)]">{clientInfo.currentActions} 个议题进行中</p>
              </div>
              {/* Card 3 */}
              <div className="bg-white rounded-[20px] border border-[rgba(15,23,42,0.06)] p-6 hover:shadow-lg hover:shadow-[rgba(99,102,241,0.08)] hover:-translate-y-0.5 transition-all duration-300">
                <p className="text-[13px] text-[rgba(15,23,42,0.50)] mb-2">最新交付物</p>
                <p className="text-[18px] font-medium text-[rgba(15,23,42,0.92)]">{clientInfo.latestDeliverables} 份文档</p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Cases Section */}
      <section id="cases" className="pt-0 pb-14 px-4 sm:px-6 lg:px-8">
        <div className="max-w-[1200px] mx-auto">
          <div className="mb-8 text-center">
            <h2 className="text-[24px] sm:text-[28px] font-semibold tracking-tight text-[rgba(15,23,42,0.92)]">部分服务客户</h2>
            <p className="mt-2 text-[13px] text-[rgba(15,23,42,0.54)]">点击logo可查看客户介绍</p>
          </div>

          <div className="space-y-0.5">
            {caseRows.map((row, rowIndex) => (
              <div key={`case-row-${rowIndex}`} className="flex justify-center">
                <div className="flex w-full justify-center">
                  <div className="flex w-full flex-wrap justify-center md:flex-nowrap">
                    {row.map((caseItem, colIndex) => (
                      <button
                        key={caseItem.slug}
                        type="button"
                        onClick={() => handleNavigateToCase(caseItem.slug)}
                        className="group relative block w-1/2 border border-[rgba(15,23,42,0.12)] bg-white text-left md:w-1/3"
                        style={{
                          marginLeft: colIndex === 0 ? 0 : -1,
                          marginTop: rowIndex === 0 ? 0 : -1,
                        }}
                        aria-label={`查看 ${caseItem.clientName} 案例详情`}
                      >
                        <div className="relative aspect-[1.08/1] overflow-hidden">
                          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[rgba(15,23,42,0.06)] to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                          {caseItem.logoUrl ? (
                            <div className="relative z-10 flex h-full w-full items-center justify-center p-3 sm:p-4">
                              <img
                                src={caseItem.logoUrl}
                                alt={caseItem.clientName}
                                className="h-full w-full origin-center object-contain transition-transform duration-500 group-hover:scale-[1.12]"
                                loading="lazy"
                              />
                            </div>
                          ) : (
                            <div className="relative z-10 h-full w-full bg-gradient-to-br from-blue-500 to-indigo-600" />
                          )}
                          <span className="pointer-events-none absolute bottom-2 left-1/2 inline-flex h-8 w-8 -translate-x-1/2 translate-y-3 items-center justify-center rounded-full bg-white text-[rgba(37,99,235,0.88)] shadow-[0_8px_20px_rgba(15,23,42,0.12)] opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                            <MoveRight className="h-4 w-4" />
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Insights Section - 4 Column Horizontal Layout */}
      <section id="insights" className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-[1200px] mx-auto">
          {/* Section Header */}
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-10">
            <div className="space-y-2">
              <h2 className="text-[28px] font-semibold tracking-tight text-[rgba(15,23,42,0.92)]">战略洞察</h2>
              <p className="text-[14px] text-[rgba(15,23,42,0.50)]">持续研究与判断的能力</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {insightTags.map((tag) => (
                <button
                  key={tag.id}
                  onClick={() => setSelectedInsightTag(tag.id)}
                  className={`px-4 py-2 rounded-[12px] text-[13px] font-medium transition-all duration-200 ${
                    selectedInsightTag === tag.id
                      ? 'bg-[rgba(15,23,42,0.92)] text-white'
                      : 'bg-white border border-[rgba(15,23,42,0.08)] text-[rgba(15,23,42,0.55)] hover:text-[rgba(15,23,42,0.85)] hover:border-[rgba(99,102,241,0.30)]'
                  }`}
                >
                  {tag.label}
                </button>
              ))}
            </div>
          </div>

          {/* Responsive Grid (mobile: list, tablet: 2 cols, desktop: 4 cols) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            {insights.slice(0, 4).map((insight, index) => (
              <article
                key={index}
                className="group bg-white rounded-[20px] border border-[rgba(15,23,42,0.06)] p-6 hover:shadow-lg hover:shadow-[rgba(99,102,241,0.08)] hover:-translate-y-0.5 transition-all duration-300 cursor-pointer"
                onClick={() => onNavigate?.('insights')}
              >
                {/* Date Tag */}
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-[12px] font-medium text-[rgba(99,102,241,0.85)] px-2 py-0.5 rounded-full bg-[rgba(99,102,241,0.08)]">
                    {insight.readTime || '洞察'}
                  </span>
                  {insight.tags?.[0] && (
                    <span className="text-[11px] text-[rgba(15,23,42,0.45)]">{insight.tags[0]}</span>
                  )}
                </div>

                {/* Title */}
                <h3 className="text-[15px] font-medium text-[rgba(15,23,42,0.92)] leading-[1.5] mb-3 group-hover:text-[rgba(99,102,241,0.92)] transition-colors">
                  {insight.title}
                </h3>

                {/* Summary */}
                <p className="text-[13px] text-[rgba(15,23,42,0.55)] leading-[1.6] line-clamp-2 mb-4">
                  {insight.summary || insight.desc}
                </p>

                {/* Tags */}
                {insight.tags && insight.tags.length > 1 && (
                  <div className="flex flex-wrap gap-1">
                    {insight.tags.slice(0, 2).map((tag, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 bg-[rgba(15,23,42,0.04)] text-[rgba(15,23,42,0.55)] rounded text-[11px]"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Tools Section - 4 Column Grid */}
      <section id="tools" className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-[1200px] mx-auto">
          {/* Section Header */}
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-10">
            <div className="space-y-2">
              <h2 className="text-[28px] font-semibold tracking-tight text-[rgba(15,23,42,0.92)]">方法论与工具</h2>
              <p className="text-[14px] text-[rgba(15,23,42,0.50)]">精选工具与方法，让专业看得见</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {toolCategories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setToolCategory(category.id)}
                  className={`px-4 py-2 rounded-[12px] text-[13px] font-medium transition-all duration-200 ${
                    toolCategory === category.id
                      ? 'bg-[rgba(15,23,42,0.92)] text-white'
                      : 'bg-white border border-[rgba(15,23,42,0.08)] text-[rgba(15,23,42,0.55)] hover:text-[rgba(15,23,42,0.85)] hover:border-[rgba(99,102,241,0.30)]'
                  }`}
                >
                  {category.label}
                </button>
              ))}
            </div>
          </div>

          {/* Access rule card (always visible) */}
          <div className="mb-8">
          </div>

          {/* Responsive Grid (mobile: list, tablet: 2 cols, desktop: 4 cols) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            {tools
              .filter(tool => toolCategory === 'all' || tool.category === toolCategory)
              .slice(0, 4)
              .map((tool, index) => (
                <article
                  key={index}
                  className="group bg-white rounded-[20px] border border-[rgba(15,23,42,0.06)] p-6 hover:shadow-lg hover:shadow-[rgba(99,102,241,0.08)] hover:-translate-y-0.5 transition-all duration-300 cursor-pointer"
                  onClick={() => onNavigate?.('learning')}
                >
                  {/* Icon */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 rounded-[14px] bg-[rgba(99,102,241,0.08)] flex items-center justify-center">
                      <FileText className="w-6 h-6 text-[rgba(99,102,241,0.85)]" />
                    </div>
                    <span className="text-[11px] px-2 py-0.5 bg-[rgba(16,185,129,0.08)] text-[rgba(16,185,129,0.85)] rounded-full font-medium">
                      有模板
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="text-[16px] font-semibold text-[rgba(15,23,42,0.92)] mb-2 group-hover:text-[rgba(99,102,241,0.92)] transition-colors">
                    {tool.name}
                  </h3>

                  {/* Description */}
                  <p className="text-[13px] text-[rgba(15,23,42,0.55)] leading-relaxed mb-4">
                    {tool.desc}
                  </p>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1 mb-4">
                    {tool.适用人群.map((tag, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 bg-[rgba(15,23,42,0.04)] text-[rgba(15,23,42,0.55)] rounded text-[11px]"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  {/* Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onNavigate?.('learning');
                    }}
                    className="w-full py-2.5 rounded-[12px] border border-[rgba(15,23,42,0.08)] text-[rgba(15,23,42,0.75)] text-[13px] font-medium hover:border-[rgba(99,102,241,0.40)] hover:text-[rgba(99,102,241,0.85)] hover:bg-[rgba(99,102,241,0.04)] transition-all duration-200 flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    <span>查看样例</span>
                  </button>
                </article>
              ))}
          </div>
        </div>
      </section>

      {/* Cooperation Section - Process Flow */}
      <section id="cooperation" className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-[1200px] mx-auto">
          {/* Section Header */}
          <div className="text-center mb-12">
            <h2 className="text-[28px] font-semibold tracking-tight text-[rgba(15,23,42,0.92)] mb-3">合作方式</h2>
            <p className="text-[14px] text-[rgba(15,23,42,0.50)]">从诊断到复盘，陪伴你的每一步</p>
          </div>

          {/* Process Flow - 4 Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-12">
            {cooperationSteps.map((step, index) => (
              <div
                key={index}
                className="group relative bg-white rounded-[20px] border border-[rgba(15,23,42,0.06)] p-6 hover:shadow-lg hover:shadow-[rgba(99,102,241,0.08)] hover:-translate-y-0.5 transition-all duration-300"
              >
                {/* Step Number */}
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-[40px] font-semibold text-[rgba(99,102,241,0.15)] tracking-tight">{step.step}</span>
                  <div>
                    <h4 className="text-[18px] font-semibold text-[rgba(15,23,42,0.92)]">{step.title}</h4>
                    <p className="text-[13px] text-[rgba(99,102,241,0.75)]">{step.desc}</p>
                  </div>
                </div>

                {/* Outputs */}
                <div className="pt-4 border-t border-[rgba(15,23,42,0.06)]">
                  <p className="text-[11px] text-[rgba(15,23,42,0.40)] uppercase tracking-wide mb-3">输出物</p>
                  <ul className="space-y-2">
                    {step.outputs.map((output, i) => (
                      <li key={i} className="text-[13px] text-[rgba(15,23,42,0.70)] flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-[rgba(16,185,129,0.60)] flex-shrink-0" />
                        {output}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Arrow Connector */}
                {index < cooperationSteps.length - 1 && (
                  <div className="hidden lg:block absolute top-1/2 -right-3 transform -translate-y-1/2 text-[rgba(15,23,42,0.15)]">
                    <ChevronRight className="w-5 h-5" />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="group px-8 py-4 rounded-full bg-[rgba(15,23,42,0.92)] text-white text-[15px] font-medium hover:bg-[rgba(15,23,42,0.85)] transition-all duration-300 hover:scale-[1.02] hover:shadow-lg flex items-center justify-center gap-2">
              <span>了解如何合作</span>
              <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5" />
            </button>
            <button className="px-8 py-4 rounded-full bg-white border border-[rgba(15,23,42,0.08)] text-[rgba(15,23,42,0.92)] text-[15px] font-medium hover:border-[rgba(99,102,241,0.40)] hover:bg-[rgba(99,102,241,0.04)] transition-all duration-300">
              预约诊断对话
            </button>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      {/* FAQ Section - Apple Style */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-[800px] mx-auto">
          {/* Section Header */}
          <div className="text-center mb-12">
            <h2 className="text-[24px] font-semibold tracking-tight text-[rgba(15,23,42,0.92)] mb-2">常见问题</h2>
          </div>

          {/* FAQ List */}
          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div
                key={index}
                className="bg-white rounded-[16px] border border-[rgba(15,23,42,0.06)] overflow-hidden"
              >
                <button
                  onClick={() => setOpenFaqIndex(openFaqIndex === index ? null : index)}
                  className="w-full px-6 py-5 text-left flex items-center justify-between hover:bg-[rgba(15,23,42,0.02)] transition-all duration-200"
                >
                  <span className="font-medium text-[15px] text-[rgba(15,23,42,0.92)] pr-4">{faq.question}</span>
                  {openFaqIndex === index ? (
                    <Minus className="w-4 h-4 text-[rgba(15,23,42,0.45)] flex-shrink-0" />
                  ) : (
                    <Plus className="w-4 h-4 text-[rgba(15,23,42,0.45)] flex-shrink-0" />
                  )}
                </button>
                {openFaqIndex === index && (
                  <div className="px-6 pb-6 text-[rgba(15,23,42,0.70)] text-[14px] leading-relaxed border-t border-[rgba(15,23,42,0.06)] pt-4">
                    {faq.answer}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer onNavigate={handleNavigate} />


    </div>
  );
}

export default StrategyPage;
