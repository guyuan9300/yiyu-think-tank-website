import { useState, useRef, useEffect } from 'react';
import { Header } from './Header';
import { getClientProjects, type ClientProject } from '../lib/dataServiceLocal';
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
  ChevronLeft
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

// Case ID mapping
const caseIds = ['blue-letter', 'tianzi', 'dream'];

export function StrategyPage({ onNavigate, isClientMode = false, clientInfo }: StrategyPageProps) {
  // Scroll to anchor functionality
  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Anchor navigation state
  const [activeAnchor, setActiveAnchor] = useState('results');

  // Track scroll to update active anchor
  useEffect(() => {
    const handleScroll = () => {
      const sections = ['results', 'cases', 'insights', 'tools', 'cooperation'];
      for (const section of sections) {
        const element = document.getElementById(section);
        if (element) {
          const rect = element.getBoundingClientRect();
          if (rect.top <= 200 && rect.bottom >= 200) {
            setActiveAnchor(section);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Admin: load strategy clients for dropdown
  const [adminClients, setAdminClients] = useState<ClientProject[]>([]);

  useEffect(() => {
    const loadClients = async () => {
      try {
        const list = await getClientProjects();
        setAdminClients(list);
      } catch {
        setAdminClients([]);
      }
    };

    loadClients();
    const onChange = () => loadClients();
    window.addEventListener('yiyu_data_change', onChange);
    window.addEventListener('storage', onChange);
    return () => {
      window.removeEventListener('yiyu_data_change', onChange);
      window.removeEventListener('storage', onChange);
    };
  }, []);

  // Insight filter state
  const [selectedInsightTag, setSelectedInsightTag] = useState('all');

  // Tool filter state
  const [toolCategory, setToolCategory] = useState('all');

  // FAQ expand state
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);
  
  // Case images state
  const [caseImages, setCaseImages] = useState<(string | null)[]>(Array(9).fill(null));

  // Navigate to case detail
  const handleNavigateToCase = (caseIndex: number) => {
    if (onNavigate) {
      const caseId = caseIds[caseIndex] || caseIds[0];
      onNavigate('case', caseId);
    }
  };

  // Anchor configuration
  const anchors = [
    { id: 'cases', label: '案例' },
    { id: 'insights', label: '洞察' },
    { id: 'tools', label: '工具' },
    { id: 'cooperation', label: '合作' }
  ];

  // Principles data
  const principles = [
    { title: '共创参与', desc: '一起动手共创，和你并肩把方案变成现实' },
    { title: '组织赋能', desc: '把组织打造成学习型组织' },
    { title: '效果导向', desc: '用目标与指标衡量成果' }
  ];

  // Cases data - 9 grid
  const cases = [
    {
      industry: '公益/教育',
      project: '蓝信封',
      title: '专注于乡村儿童心理健康服务的公益机构',
      challenge: '留守儿童心理支持需求大',
      action: '通过书信交流建立长期陪伴关系',
      results: ['服务10万+留守儿童', '中国社会组织5A评级'],
      tags: ['公益', '教育'],
      coverImage: '/images/cases/blue-letter.png'
    },
    {
      industry: '金融/投资',
      project: '愿景资本',
      title: '国家新兴产业创投基金管理公司',
      challenge: '移动互联网及文化创意产业投资机会识别',
      action: '聚焦早中期投资，陪伴创业者成长',
      results: ['管理规模数十亿元', '投资多个明星项目'],
      tags: ['投资', '创投'],
      coverImage: '/images/cases/vision-capital.png'
    },
    {
      industry: '公益/房地产',
      project: '贝壳公益基金会',
      title: '城市社区公益平台',
challenge: '社区居民参与度低',
      action: '打造互助互利的社区公益平台',
      results: ['覆盖全国主要城市', '百万志愿者参与'],
      tags: ['社区', '公益'],
      coverImage: '/images/cases/beike-foundation.png'
    },
    {
      industry: '公益/教育',
      project: '日慈基金会',
      title: '青少年心智素养教育',
      challenge: '青少年心理健康问题日益突出',
      action: '专注心智素养教育项目设计与推广',
      results: ['覆盖20+省市', '受益学生50万+'],
      tags: ['教育', '心理'],
      coverImage: '/images/cases/rici-foundation.png'
    },
    {
      industry: '公益/教育',
      project: '田字格',
      title: '乡土人本教育探索',
      challenge: '贫困地区教育资源匮乏',
      action: '开展乡土人本教育模式探索',
      results: ['创办兴隆实验小学', '惠及上千名学生'],
      tags: ['乡村', '教育'],
      coverImage: '/images/cases/tianzige.png'
    },
    {
      industry: '公益/咨询',
      project: 'ABC美好社会咨询社',
      title: '专业公益咨询服务',
      challenge: '中小NGO缺乏专业管理能力',
      action: '为NGO提供战略、运营等专业咨询',
      results: ['服务110+公益组织', '志愿者17万+小时'],
      tags: ['咨询', 'NGO'],
      coverImage: '/images/cases/abc-consulting.png'
    },
    {
      industry: '教育/科技',
      project: '锂钠氪锶',
      title: '教育科技解决方案',
      challenge: '个性化学习需求难以满足',
      action: '通过AI和大数据提供个性化方案',
      results: ['服务百所院校', '提效显著'],
      tags: ['AI', '教育'],
      coverImage: '/images/cases/lithium-sodium-krypton-strontium.png'
    },
    {
      industry: '公益/乡村振兴',
      project: '中国乡村发展基金会',
      title: '乡村发展与扶贫事业',
      challenge: '农村地区发展滞后',
      action: '实施扶贫开发、乡村振兴项目',
      results: ['30+年公益经验', '惠及千万农户'],
      tags: ['乡村', '扶贫'],
      coverImage: '/images/cases/china-rural-foundation.png'
    },
    {
      industry: '汽车/新能源',
      project: '蔚来汽车',
      title: '智能电动汽车与用户体验',
      challenge: '新能源汽车市场竞争激烈',
      action: '创造愉悦的用户生活方式',
      results: ['全球用户社群', '换电网络覆盖全国'],
      tags: ['汽车', '新能源'],
      coverImage: '/images/cases/nio.png'
    }
  ];

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

                {/* Admin: client switcher (replaces "了解合作方式") */}
                {(() => {
                  let isAdmin = false;
                  try {
                    const u = localStorage.getItem('yiyu_current_user');
                    if (u) {
                      const user = JSON.parse(u);
                      const adminEmails = ['guyuan9300@gmail.com'];
                      isAdmin = adminEmails.includes(String(user?.email || '').toLowerCase());
                    }
                  } catch {}

                  if (!isAdmin) {
                    return (
                      <button
                        onClick={() => scrollToSection('cooperation')}
                        className="group inline-flex items-center gap-1.5 text-[14px] text-[rgba(99,102,241,0.85)] hover:text-[rgba(99,102,241,1)] transition-colors font-medium"
                      >
                        <span>了解合作方式</span>
                        <ArrowUpRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                      </button>
                    );
                  }

                  // Admin dropdown (simple native select)
                  return (
                    <div className="flex items-center gap-2">
                      <span className="text-[12px] text-[rgba(15,23,42,0.55)]">切换客户</span>
                      <select
                        className="px-3 py-2 rounded-xl border border-[rgba(15,23,42,0.10)] bg-white/80 text-[13px] text-[rgba(15,23,42,0.85)] focus:outline-none focus:ring-2 focus:ring-primary/20"
                        defaultValue=""
                        onChange={(e) => {
                          const clientId = e.target.value;
                          if (!clientId) return;
                          // Navigate to strategy companion page with clientId
                          const params = new URLSearchParams(window.location.search);
                          params.set('page', 'strategy-companion');
                          params.set('clientId', clientId);
                          window.history.replaceState({}, '', `?${params.toString()}`);
                          if (onNavigate) {
                            onNavigate('strategy-companion' as any);
                          } else {
                            window.location.reload();
                          }
                        }}
                      >
                        <option value="">选择战略陪伴客户…</option>
                        {adminClients.length === 0 ? (
                          <option value="" disabled>（暂无客户，请先去后台生成）</option>
                        ) : (
                          adminClients.map(c => (
                            <option key={c.id} value={c.id}>{c.clientName}</option>
                          ))
                        )}
                      </select>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Anchor Navigation - Apple Style */}
            <div className="flex items-center justify-center gap-2 pt-8 border-t border-[rgba(15,23,42,0.06)]">
              {anchors.map((anchor) => (
                <button
                  key={anchor.id}
                  onClick={() => scrollToSection(anchor.id)}
                  className={`px-4 py-2.5 rounded-[12px] text-[14px] font-medium transition-all duration-200 ${
                    activeAnchor === anchor.id
                      ? 'bg-[rgba(99,102,241,0.08)] text-[rgba(99,102,241,0.92)]'
                      : 'text-[rgba(15,23,42,0.55)] hover:text-[rgba(15,23,42,0.85)] hover:bg-[rgba(15,23,42,0.04)]'
                  }`}
                >
                  {anchor.label}
                </button>
              ))}
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

      {/* Cases Section - 16:9 Seamless Grid */}
      <section id="cases" className="py-0 px-0">
        {/* Cases Grid - 16:9 Seamless Grid */}
        <div 
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '0px',
            width: '100%',
          }}
        >
          {cases.map((caseItem, index) => (
            <div
              key={index}
              className="relative w-full aspect-[16/9] overflow-hidden group cursor-pointer"
              onClick={() => handleNavigateToCase(index)}
            >
              {/* Background Image */}
              {caseItem.coverImage ? (
                <img
                  src={caseItem.coverImage}
                  alt={caseItem.project}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-blue-500 to-indigo-600" />
              )}
            </div>
          ))}
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

          {/* 4 Column Grid */}
          <div className="grid grid-cols-4 gap-5">
            {insights.slice(0, 4).map((insight, index) => (
              <article
                key={index}
                className="group bg-white rounded-[20px] border border-[rgba(15,23,42,0.06)] p-6 hover:shadow-lg hover:shadow-[rgba(99,102,241,0.08)] hover:-translate-y-0.5 transition-all duration-300 cursor-pointer"
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

          {/* 4 Column Grid */}
          <div className="grid grid-cols-4 gap-5">
            {tools
              .filter(tool => toolCategory === 'all' || tool.category === toolCategory)
              .slice(0, 4)
              .map((tool, index) => (
                <article
                  key={index}
                  className="group bg-white rounded-[20px] border border-[rgba(15,23,42,0.06)] p-6 hover:shadow-lg hover:shadow-[rgba(99,102,241,0.08)] hover:-translate-y-0.5 transition-all duration-300 cursor-pointer"
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
                  <button className="w-full py-2.5 rounded-[12px] border border-[rgba(15,23,42,0.08)] text-[rgba(15,23,42,0.75)] text-[13px] font-medium hover:border-[rgba(99,102,241,0.40)] hover:text-[rgba(99,102,241,0.85)] hover:bg-[rgba(99,102,241,0.04)] transition-all duration-200 flex items-center justify-center gap-2">
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
      <footer className="py-16 px-4 sm:px-6 lg:px-8 border-t border-border/40 bg-muted/5">
        <div className="max-w-[1200px] mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-12">
            {/* Brand */}
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-[12px] bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                  <span className="text-white font-semibold text-lg">益</span>
                </div>
                <span className="font-semibold text-[15px]">益语智库</span>
              </div>
              <p className="text-[13px] text-muted-foreground/70 leading-relaxed">
                用洞察、工具与长期陪伴，把蓝图变成行动
              </p>
            </div>

            {/* Services */}
            <div>
              <h4 className="font-medium text-[14px] text-foreground mb-4">服务</h4>
              <ul className="space-y-2.5 text-[13px] text-muted-foreground/70">
                <li><a href="#" className="hover:text-primary transition-colors">战略规划</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">组织诊断</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">数字化转型</a></li>
              </ul>
            </div>

            {/* Resources */}
            <div>
              <h4 className="font-medium text-[14px] text-foreground mb-4">资源</h4>
              <ul className="space-y-2.5 text-[13px] text-muted-foreground/70">
                <li><a href="#" className="hover:text-primary transition-colors">案例库</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">方法论工具</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">前沿洞察</a></li>
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h4 className="font-medium text-[14px] text-foreground mb-4">联系我们</h4>
              <ul className="space-y-2.5 text-[13px] text-muted-foreground/70">
                <li>400-888-8888</li>
                <li>contact@yiyu.com</li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-border/40 flex flex-col md:flex-row items-center justify-between gap-4 text-[12px] text-muted-foreground/60">
            <p>© 2026 益语智库. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default StrategyPage;
