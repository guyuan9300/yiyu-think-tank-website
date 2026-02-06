import { useState, useRef, useEffect } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Download,
  FileText,
  FileCheck,
  Calendar,
  CheckCircle,
  TrendingUp,
  Clock,
  Users,
  Target,
  Zap,
  Lightbulb,
  BookOpen,
  Search,
  X,
  Plus,
  Sparkles,
  Send,
  Copy,
  MessageSquare,
  Bookmark,
  Share2,
  MoreHorizontal,
  ExternalLink,
  RefreshCw,
  Filter,
  Grid,
  List,
  Eye,
  Edit3,
  Trash2,
  Save,
  Upload,
  Lock,
  Star,
  Heart,
  PlusCircle,
  MinusCircle,
  ArrowRight,
  ArrowUpRight,
  ArrowDownRight,
  Building2,
  Brain,
  BarChart3,
  Database,
  Network,
  Shield,
  Cpu,
  Layers,
  Map,
  Clipboard,
  Printer,
  Mail,
  Phone,
  MapPin,
  Globe,
  MessageCircle,
  HelpCircle,
  Info,
  AlertTriangle,
  Loader2,
  Building,
  Briefcase,
  User,
  Users2,
  GraduationCap,
  Wrench,
  FolderOpen,
  FolderPlus,
  Folder,
  Archive,
  Inbox,
  SendHorizontal,
  DownloadCloud,
  UploadCloud,
  RotateCcw,
  Activity,
  Rocket,
  File,
  FileImage,
  FileSpreadsheet,
  Presentation,
  Image,
  ChevronUp
} from 'lucide-react';
import { Header } from './Header';
import { 
  getClientProjects,
  getStrategyCompanionData,
  type ClientProject
} from '../lib/dataServiceLocal';

function withBase(path: string) {
  // Assets are served from Vite BASE_URL (important for GitHub Pages subpaths)
  const base = import.meta.env.BASE_URL || '/';
  return `${base}${path.replace(/^\//, '')}`;
}

function getClientCoverImage(client: { clientName?: string; logoUrl?: string } | null | undefined) {
  if (client?.logoUrl) return client.logoUrl;
  const name = (client?.clientName || '').trim();
  // Prefer existing case images if name matches.
  const map: Record<string, string> = {
    '蓝信封': 'images/cases/blue-letter.png',
    '中国乡村发展基金会': 'images/cases/china-rural-foundation.png',
    '愿景资本': 'images/cases/vision-capital.png',
    '日慈基金会': 'images/cases/rici-foundation.png',
    '贝石公益基金会': 'images/cases/beike-foundation.png',
    '贝壳公益基金会': 'images/cases/beike-foundation.png',
    '蔚来汽车': 'images/cases/nio.png'
  };
  return withBase(map[name] || 'images/placeholders/client-default.svg');
}

function getSectionThumb(kind: 'goal' | 'event' | 'document' | 'meeting' | 'course') {
  switch (kind) {
    case 'goal':
      return withBase('images/placeholders/goal.svg');
    case 'event':
      return withBase('images/placeholders/event.svg');
    case 'document':
      return withBase('images/placeholders/document.svg');
    case 'meeting':
      return withBase('images/placeholders/meeting.svg');
    case 'course':
      return withBase('images/placeholders/course.svg');
  }
}

// Types
interface Milestone {
  id: string;
  title: string;
  status: 'completed' | 'in-progress' | 'pending';
  date: string;
  coreGoal?: string;
  deliverable?: string;
  description?: string;
  participants?: string[];
  output?: string[];
}

interface Goal {
  id: string;
  title: string;
  description: string;
  progress: number;
  metrics: { label: string; value: string; target: string }[];
  attachmentUrl?: string;
}

interface EventItem {
  id: string;
  type: 'meeting' | 'deliverable' | 'milestone';
  title: string;
  date: string;
  description: string;
  participants?: number;
  details?: string;
}

interface Document {
  id: string;
  category: 'assessment' | 'strategy' | 'tools';
  title: string;
  date: string;
  meta: string;
  fileType?: 'pdf' | 'ppt' | 'xlsx' | 'doc';
  fileUrl?: string;
  documentLink?: string;
  passwordProtected?: boolean;
  password?: string;
}

interface Meeting {
  id: string;
  title: string;
  date: string;
  duration: string;
  participants: number;
  keyPoints: string[];
  attendees?: string[];
  decisions?: string[];
  actionItems?: string[];
  attachmentUrl?: string;
  meetingLink?: string;
  passwordProtected?: boolean;
  password?: string;
}

/*
// Mock data based on Figma design (DEPRECATED in Iteration 2)
// 数据已改为从 localStorage 按 projectId 加载，保留此段仅供历史参考。
const mockMilestones: Milestone[] = [
  { 
    id: 'm1', 
    title: '战略启动', 
    status: 'completed', 
    date: '2024年1月',
    coreGoal: '明确组织定位与战略方向',
    deliverable: '战略蓝图 1.0、组织画像报告',
    description: '完成组织使命、愿景的初步梳理，明确战略大方向。',
    participants: ['CEO', '核心团队', '益语智库顾问'],
    output: ['战略蓝图1.0.pdf', '组织画像报告.pdf']
  },
  { 
    id: 'm2', 
    title: '能力诊断', 
    status: 'completed', 
    date: '2024年3月',
    coreGoal: '全面评估组织能力现状',
    deliverable: '能力诊断报告、优先级矩阵',
    description: '通过访谈、问卷、资料分析等方式，全面评估组织能力。',
    participants: ['HR负责人', '各部门主管', '外部顾问'],
    output: ['能力诊断报告.pdf', '优先级矩阵.xlsx']
  },
  { 
    id: 'm3', 
    title: '战略共创', 
    status: 'in-progress', 
    date: '2024年6月',
    coreGoal: '共创年度战略与关键举措',
    deliverable: '年度战略地图、OKR体系',
    description: '与组织核心团队共创，制定年度战略目标和关键举措。',
    participants: ['全体管理层', '核心员工', '益语智库团队'],
    output: ['年度战略地图.ppt', 'OKR体系文档.pdf']
  },
  { 
    id: 'm4', 
    title: '执行赋能', 
    status: 'pending', 
    date: '2024年9月',
    coreGoal: '提供工具与方法论支持',
    deliverable: '执行手册、工具包、培训材料',
    description: '提供战略执行的工具、方法和培训支持。',
    participants: ['执行团队', '各模块负责人'],
    output: ['执行手册.pdf', '工具包.zip', '培训材料.ppt']
  },
  { 
    id: 'm5', 
    title: '复盘迭代', 
    status: 'pending', 
    date: '2024年12月',
    coreGoal: '评估成果并优化战略',
    deliverable: '年度复盘报告、战略蓝图 2.0',
    description: '对年度战略执行进行复盘，总结经验教训，优化战略。',
    participants: ['全体管理层', '董事会'],
    output: ['年度复盘报告.pdf', '战略蓝图2.0.pdf']
  }
];

const mockGoals: Goal[] = [
  {
    id: 'g1',
    title: '提升品牌影响力',
    description: '通过内容营销和公共传播，提高行业知名度',
    progress: 75,
    metrics: [
      { label: '媒体曝光', value: '15次', target: '20次' },
      { label: '社交媒体增长', value: '+2.3K', target: '+3K' }
    ]
  },
  {
    id: 'g2',
    title: '优化资源筹募能力',
    description: '建立多元化筹资渠道，确保财务可持续',
    progress: 60,
    metrics: [
      { label: '新捐赠人', value: '32位', target: '50位' },
      { label: '月均筹款额', value: '¥28万', target: '¥35万' }
    ]
  },
  {
    id: 'g3',
    title: '强化数字化运营',
    description: '搭建数据驱动的项目管理与决策体系',
    progress: 45,
    metrics: [
      { label: '系统上线', value: '2个', target: '3个' },
      { label: '数据覆盖率', value: '45%', target: '80%' }
    ]
  }
];

const mockEvents: EventItem[] = [
  { 
    id: 'e1', 
    type: 'meeting', 
    title: '第三次战略共创工作坊', 
    date: '2024-06-15', 
    description: '完成年度 OKR 设定，确认 Q3 关键举措',
    participants: 8,
    details: '本次工作坊重点讨论了：1) 年度OKR的设定和分解；2) Q3关键举措的优先级排序；3) 资源分配方案；4) 风险识别和应对策略。与会人员包括全体管理层和核心员工。'
  },
  { 
    id: 'e2', 
    type: 'deliverable', 
    title: '品牌传播策略报告', 
    date: '2024-06-10', 
    description: '包含媒体矩阵规划、内容日历、传播话术',
    details: '品牌传播策略报告已正式交付，包含以下内容：1) 媒体矩阵规划方案；2) 年度内容日历；3) 品牌传播话术库；4) 各渠道投放策略；5) 效果评估指标。'
  },
  { 
    id: 'e3', 
    type: 'milestone', 
    title: '能力诊断阶段完成', 
    date: '2024-05-30', 
    description: '组织能力评估报告已交付，进入战略共创阶段',
    details: '能力诊断阶段圆满完成，通过访谈、问卷、资料分析等方式，全面评估了组织在战略、组织、人才、文化等维度的能力现状，并形成了详细的诊断报告和优先级矩阵。'
  },
  { 
    id: 'e4', 
    type: 'meeting', 
    title: '战略中期回顾会', 
    date: '2024-05-20', 
    description: '回顾 Q1-Q2 进展，调整下半年战略重点',
    participants: 7,
    details: '战略中期回顾会重点回顾了Q1-Q2的战略执行情况，讨论了：1) 已完成工作的复盘；2) 遇到的主要挑战；3) 下半年战略重点调整；4) 资源配置优化方案。'
  }
];

const mockDocuments: Document[] = [
  { id: 'd1', category: 'assessment', title: '组织能力诊断报告 v2.1', date: '2024-05-28', meta: '42页', fileType: 'pdf' },
  { id: 'd2', category: 'assessment', title: '竞争格局分析', date: '2024-04-15', meta: '28页', fileType: 'pdf' },
  { id: 'd3', category: 'strategy', title: '2024年度战略地图', date: '2024-06-12', meta: '35页 PPT', fileType: 'ppt' },
  { id: 'd4', category: 'strategy', title: 'Q3关键举措工作坊', date: '2024-06-05', meta: '28页 PPT', fileType: 'ppt' },
  { id: 'd5', category: 'tools', title: '战略执行仪表盘模板', date: '2024-05-15', meta: 'Excel', fileType: 'xlsx' },
  { id: 'd6', category: 'tools', title: 'OKR设定工作手册', date: '2024-04-20', meta: 'PDF', fileType: 'pdf' }
];

const mockMeetings: Meeting[] = [
  { 
    id: 'me1', 
    title: '第三次战略共创工作坊', 
    date: '2024-06-15', 
    duration: '3小时', 
    participants: 8, 
    keyPoints: ['OKR确认', 'Q3举措优先级', '资源分配'],
    attendees: ['CEO', 'CTO', 'HRD', '财务总监', '运营总监', '市场总监', '产品总监', '技术总监'],
    decisions: ['确定年度OKR框架', 'Q3优先完成3个关键项目', '增加市场部资源配置'],
    actionItems: ['各部门分解OKR到个人', 'Q3项目启动会安排', '资源分配方案细化']
  },
  { 
    id: 'me2', 
    title: '品牌传播策略研讨', 
    date: '2024-06-10', 
    duration: '2小时', 
    participants: 6, 
    keyPoints: ['媒体矩阵规划', '内容日历', '传播话术'],
    attendees: ['市场总监', '品牌经理', '内容主管', '新媒体运营', '益语智库顾问'],
    decisions: ['确定4个核心传播渠道', '建立月度内容日历机制', '统一品牌传播话术'],
    actionItems: ['各渠道负责人指定', '内容日历模板制作', '话术库整理和培训']
  },
  { 
    id: 'me3', 
    title: '战略中期回顾会', 
    date: '2024-05-20', 
    duration: '2.5小时', 
    participants: 7, 
    keyPoints: ['H1进展回顾', 'H2战略调整', '风险识别'],
    attendees: ['全体管理层'],
    decisions: ['保持战略大方向不变', '调整数字化转型时间表', '加强人才招聘力度'],
    actionItems: ['H2详细执行计划', '风险监控机制完善', '招聘计划调整']
  },
  { 
    id: 'me4', 
    title: '组织能力诊断结果发布', 
    date: '2024-04-28', 
    duration: '2小时', 
    participants: 10, 
    keyPoints: ['能力评估结果', '优先级矩阵', '改进路径'],
    attendees: ['全体管理层', '核心员工', '外部顾问'],
    decisions: ['确认诊断结果', '确定优先改进领域', '制定能力提升计划'],
    actionItems: ['诊断报告定稿', '改进路径细化', '后续工作安排']
  }
];

*/

// Learning Resource Interface
interface LearningResource {
  id: string;
  type: 'insight' | 'article' | 'book' | 'report';
  title: string;
  description: string;
  date: string;
  category: string;
  url?: string;
}

/*
// Mock Learning Resources for Empowerment Academy (DEPRECATED in Iteration 2)
const mockLearningResources: LearningResource[] = [
  {
    id: 'lr1',
    type: 'insight',
    title: '2024公益行业数字化转型趋势报告',
    description: '深度解析公益组织数字化转型的关键路径与实践案例',
    date: '2024-05-15',
    category: '前沿洞察'
  },
  {
    id: 'lr2',
    type: 'article',
    title: '如何构建高效的战略规划体系',
    description: '系统性战略规划方法论，助力组织找准发展方向',
    date: '2024-06-10',
    category: '学习中心'
  },
  {
    id: 'lr3',
    type: 'book',
    title: '《社会创新的力量》',
    description: '探索社会创新的本质与实践，启发公益组织创新思维',
    date: '2024-04-20',
    category: '推荐书籍'
  },
  {
    id: 'lr4',
    type: 'report',
    title: '组织能力建设实战手册',
    description: '从战略到执行，全面提升组织核心能力的工具与方法',
    date: '2024-05-28',
    category: '实践指南'
  }
];
*/

// Helper functions
const getStatusColor = (status: string): string => {
  if (status === 'completed') return 'text-green-600';
  if (status === 'in-progress') return 'text-blue-600';
  return 'text-gray-400';
};

const getEventIcon = (type: string) => {
  if (type === 'meeting') return Calendar;
  if (type === 'deliverable') return FileText;
  return CheckCircle;
};

const getFileIcon = (fileType?: string) => {
  switch (fileType) {
    case 'pdf': return FileText;
    case 'ppt': return Presentation;
    case 'xlsx': return FileSpreadsheet;
    default: return File;
  }
};

// Modal Component
function Modal({ 
  isOpen, 
  onClose, 
  title, 
  children 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  title: string;
  children: React.ReactNode;
}) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div 
        ref={modalRef}
        className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden animate-modalIn"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <h2 className="text-xl font-semibold text-slate-800">{title}</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>
        
        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(80vh-80px)]">
          {children}
        </div>
      </div>
    </div>
  );
}

// Milestone Timeline Component
function MilestoneTimeline({ 
  milestones, 
  onMilestoneClick 
}: { 
  milestones: Milestone[];
  onMilestoneClick?: (milestone: Milestone) => void;
}) {
  const [hoveredMilestone, setHoveredMilestone] = useState<string | null>(null);

  return (
    <div className="w-full">
      <div className="relative flex items-start justify-between gap-4 py-4">
        {/* Track line */}
        <div className="absolute top-[20px] left-[40px] right-[40px] h-px bg-[rgba(15,23,42,0.08)]" />

        {milestones.map((milestone, idx) => {
          const isCompleted = milestone.status === 'completed';
          const isCurrent = milestone.status === 'in-progress';
          const isHovered = hoveredMilestone === milestone.id;

          return (
            <div
              key={milestone.id}
              className="relative flex flex-col items-center flex-1 group cursor-pointer z-10"
              onMouseEnter={() => setHoveredMilestone(milestone.id)}
              onMouseLeave={() => setHoveredMilestone(null)}
              onClick={() => onMilestoneClick?.(milestone)}
            >
              {/* Milestone node */}
              <div className={`
                relative flex items-center justify-center transition-all duration-300
                ${isCurrent ? 'scale-110' : 'scale-100'}
              `}>
                {/* Glow effect for current stage */}
                {isCurrent && (
                  <div 
                    className="absolute inset-0 rounded-full opacity-20"
                    style={{ boxShadow: '0 0 0 8px rgba(99,102,241,0.1)' }} 
                  />
                )}
                
                <div className={`
                  rounded-full flex items-center justify-center cursor-pointer
                  ${isCurrent 
                    ? 'w-5 h-5 border-2 border-blue-500 bg-white' 
                    : isCompleted 
                      ? 'w-3.5 h-3.5 bg-blue-500' 
                      : 'w-3 h-3 bg-gray-300'
                  }
                `}>
                  {isCompleted && (
                    <CheckCircle className="w-3.5 h-3.5 text-white" />
                  )}
                </div>
              </div>

              {/* Labels */}
              <div className="mt-4 text-center whitespace-nowrap">
                <p className={`
                  text-[13px] font-medium transition-colors duration-200 cursor-pointer
                  ${isCurrent ? 'text-blue-600' : isCompleted ? 'text-slate-800' : 'text-slate-400'}
                `}>
                  {milestone.title}
                </p>
                <p className="text-[12px] text-slate-400 mt-1cursor-pointer">
                  {milestone.date}
                </p>
              </div>

              {/* Tooltip */}
              {isHovered && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-4 w-56 bg-white rounded-xl shadow-[0_8px_30px_-12px_rgba(15,23,42,0.15)] border border-slate-100 p-4 z-50">
                  <div className="space-y-3">
                    <div>
                      <p className="text-[11px] text-slate-500 uppercase tracking-wider mb-1">本阶段目标</p>
                      <p className="text-[13px] font-medium text-slate-800">{milestone.coreGoal}</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-slate-500 uppercase tracking-wider mb-1">主要产出</p>
                      <p className="text-[13px] text-blue-600">{milestone.deliverable}</p>
                    </div>
                  </div>
                  {/* Tooltip arrow */}
                  <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-t border-l border-slate-100 transform rotate-45" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Goal Card Component
function GoalCard({ goal, onDownload }: { goal: Goal; onDownload?: (goal: Goal) => void }) {
  const hasAttachment = !!goal.attachmentUrl;
  
  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (hasAttachment) {
      onDownload?.(goal);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden hover:shadow-lg hover:shadow-slate-100/50 transition-all duration-300">
      {/* Thumb */}
      <div className="h-20 bg-slate-50 relative">
        <img
          src={getSectionThumb('goal')}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-white/30 via-white/10 to-white/30" />
      </div>

      <div className="p-6">
        <div className="flex items-start justify-between mb-2">
          <h3 className="text-[15px] font-semibold text-slate-800 leading-tight flex-1">
            {goal.title}
          </h3>
          <button
            onClick={handleDownload}
            disabled={!hasAttachment}
            className={`shrink-0 ml-3 w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-200 ${
              hasAttachment 
                ? 'bg-slate-900 text-white hover:bg-slate-800 hover:scale-105 cursor-pointer' 
                : 'bg-slate-100 text-slate-300 cursor-not-allowed'
            }`}
            title={hasAttachment ? '下载目标方法文档' : '暂无附件'}
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
        <p className="text-[13px] text-slate-500 mb-5 leading-relaxed">
          {goal.description}
        </p>
      {/* Progress bar */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] text-slate-500 uppercase tracking-wider">进度</span>
          <span className="text-[14px] font-semibold text-slate-800">{goal.progress}%</span>
        </div>
        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-500"
            style={{ width: `${goal.progress}%` }}
          />
        </div>
      </div>
      {/* Metrics */}
      <div className="space-y-2 pt-4 border-t border-slate-50">
        {goal.metrics.map((metric, idx) => (
          <div key={idx} className="flex items-center justify-between text-xs">
            <span className="text-slate-500">{metric.label}</span>
            <span className="font-medium text-slate-700">
              {metric.value} <span className="text-slate-400">/ {metric.target}</span>
            </span>
          </div>
        ))}
      </div>
      </div>
    </div>
  );
}

// Learning Resource Card Component
function LearningResourceCard({ resource }: { resource: LearningResource }) {
  const getTypeIcon = () => {
    switch (resource.type) {
      case 'insight':
        return <Lightbulb className="w-5 h-5" />;
      case 'article':
        return <FileText className="w-5 h-5" />;
      case 'book':
        return <BookOpen className="w-5 h-5" />;
      case 'report':
        return <FileCheck className="w-5 h-5" />;
      default:
        return <FileText className="w-5 h-5" />;
    }
  };

  const getTypeColor = () => {
    switch (resource.type) {
      case 'insight':
        return 'text-purple-500 bg-purple-50';
      case 'article':
        return 'text-blue-500 bg-blue-50';
      case 'book':
        return 'text-amber-500 bg-amber-50';
      case 'report':
        return 'text-green-500 bg-green-50';
      default:
        return 'text-slate-500 bg-slate-50';
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-6 hover:shadow-lg hover:shadow-slate-100/50 transition-all duration-300 cursor-pointer group">
      <div className="flex items-start gap-4 mb-4">
        <div className={`w-12 h-12 rounded-xl ${getTypeColor()} flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300`}>
          {getTypeIcon()}
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-[11px] text-slate-400 uppercase tracking-wider">
            {resource.category}
          </span>
          <h3 className="text-[15px] font-semibold text-slate-800 mt-1 leading-tight group-hover:text-blue-600 transition-colors">
            {resource.title}
          </h3>
        </div>
      </div>
      <p className="text-[13px] text-slate-500 leading-relaxed mb-4">
        {resource.description}
      </p>
      <div className="flex items-center justify-between pt-4 border-t border-slate-50">
        <span className="text-[12px] text-slate-400">{resource.date}</span>
        <button className="text-[13px] text-blue-500 font-medium hover:text-blue-600 flex items-center gap-1 group-hover:gap-2 transition-all">
          查看详情
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// Event Item Component
function EventItem({ 
  event, 
  onClick 
}: { 
  event: EventItem;
  onClick?: (event: EventItem) => void;
}) {
  const Icon = getEventIcon(event.type);
  
  return (
    <div 
      className="p-4 hover:bg-slate-50 transition-colors cursor-pointer group"
      onClick={() => onClick?.(event)}
    >
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center shrink-0 group-hover:bg-blue-50 transition-colors">
          <Icon className="w-5 h-5 text-slate-400 group-hover:text-blue-500 transition-colors" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4 mb-1">
            <h4 className="font-semibold text-slate-800 group-hover:text-blue-600 transition-colors">
              {event.title}
            </h4>
            <span className="text-[12px] text-slate-400 whitespace-nowrap">
              {event.date}
            </span>
          </div>
          <p className="text-[13px] text-slate-500 mb-2 leading-relaxed">
            {event.description}
          </p>
          {event.type === 'meeting' && event.participants && (
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Users className="w-3.5 h-3.5" />
              <span>{event.participants} 位参与者</span>
            </div>
          )}
        </div>
        <ChevronRight className="w-5 h-5 text-slate-300 shrink-0 group-hover:text-blue-400 transition-colors" />
      </div>
    </div>
  );
}

// Document Item Component
function DocumentItem({ 
  document, 
  onDownload 
}: { 
  document: Document;
  onDownload?: (doc: Document) => void;
}) {
  const FileIcon = getFileIcon(document.fileType);
  
  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDownload?.(document);
  };
  
  const handleLinkClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (document.documentLink) {
      window.open(document.documentLink, '_blank');
    }
  };

  return (
    <div className="p-4 hover:bg-slate-50 transition-colors cursor-pointer group">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* thumb */}
          <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-50 border border-slate-100 shrink-0">
            <img src={getSectionThumb('document')} alt="" className="w-full h-full object-cover" loading="lazy" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[14px] font-medium text-slate-800 truncate group-hover:text-blue-600 transition-colors">
              {document.title}
            </p>
            <p className="text-[12px] text-slate-400">
              {document.date} · {document.meta}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {document.documentLink && (
            <button
              onClick={handleLinkClick}
              className="group-hover:text-blue-500 transition-colors"
              title="访问外部链接"
            >
              <ExternalLink className="w-4 h-4 text-slate-300 group-hover:text-blue-500" />
            </button>
          )}
          {document.fileUrl && (
            <button
              onClick={handleDownload}
              className="group-hover:text-blue-500 transition-colors"
              title="下载文档"
            >
              <Download className="w-4 h-4 text-slate-300 group-hover:text-blue-500" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Meeting Card Component
function MeetingCard({ 
  meeting, 
  onClick 
}: { 
  meeting: Meeting;
  onClick?: (meeting: Meeting) => void;
}) {
  const handleAttachmentDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (meeting.attachmentUrl) {
      alert(`正在下载会议附件\n\n会议: ${meeting.title}\n\n这是该会议的相关附件文档。`);
    }
  };
  
  const handleMeetingLink = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (meeting.meetingLink) {
      window.open(meeting.meetingLink, '_blank');
    }
  };
  
  return (
    <div 
      className="bg-white rounded-xl border border-slate-100 overflow-hidden hover:shadow-lg hover:shadow-slate-100/50 transition-all duration-300 cursor-pointer group"
      onClick={() => onClick?.(meeting)}
    >
      {/* thumb */}
      <div className="h-20 bg-slate-50 relative">
        <img
          src={getSectionThumb('meeting')}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-white/25 via-white/10 to-white/25" />
      </div>

      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
        <h4 className="font-semibold text-slate-800 group-hover:text-blue-600 transition-colors leading-tight flex-1">
          {meeting.title}
        </h4>
        <div className="flex items-center gap-2 ml-3">
          {meeting.meetingLink && (
            <button
              onClick={handleMeetingLink}
              className="text-slate-300 hover:text-blue-500 transition-colors"
              title="加入会议"
            >
              <ExternalLink className="w-4 h-4" />
            </button>
          )}
          {meeting.attachmentUrl && (
            <button
              onClick={handleAttachmentDownload}
              className="text-slate-300 hover:text-blue-500 transition-colors"
              title="下载附件"
            >
              <Download className="w-4 h-4" />
            </button>
          )}
          <span className="text-[12px] text-slate-400 whitespace-nowrap ml-1">
            {meeting.date}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-4 text-xs text-slate-400 mb-4">
        <div className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5" />
          <span>{meeting.duration}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5" />
          <span>{meeting.participants} 人</span>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {meeting.keyPoints.map((point, idx) => (
          <span 
            key={idx} 
            className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-50 text-slate-600 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors"
          >
            {point}
          </span>
        ))}
      </div>
      </div>
    </div>
  );
}

export function StrategyCompanionPage({ onNavigate }: { onNavigate?: (page: string) => void }) {
  const [aiDrawerOpen, setAiDrawerOpen] = useState(false);
  const [clients, setClients] = useState<ClientProject[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const selectedClient = clients.find(c => c.id === selectedClientId) || null;
  const [selectedMilestone, setSelectedMilestone] = useState<Milestone | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [downloadingDoc, setDownloadingDoc] = useState<string | null>(null);
  
  // 从后台加载（按 projectId=当前客户 隔离）
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [courseRecommendations, setCourseRecommendations] = useState<LearningResource[]>([]);
  const [isLoadingProjectData, setIsLoadingProjectData] = useState(true);
  
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'assistant'; content: string; time: string }[]>([
    { 
      role: 'assistant', 
      content: '您好！我是您的AI战略助手。\n\n我可以帮您：\n• 分析战略目标进度\n• 生成会议准备材料\n• 解答战略相关问题\n• 提供决策建议', 
      time: '10:30' 
    }
  ]);
  const [assistantMessage, setAssistantMessage] = useState('');
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages]);

  // Load clients for selector (from localStorage)
  useEffect(() => {
    const load = async () => {
      const list = await getClientProjects();
      setClients(list);

      // If URL provides clientId, select it; otherwise keep existing or default to first.
      const params = new URLSearchParams(window.location.search);
      const clientIdFromUrl = params.get('clientId');

      if (clientIdFromUrl && list.some(c => c.id === clientIdFromUrl)) {
        setSelectedClientId(clientIdFromUrl);
        return;
      }

      if (!selectedClientId && list.length > 0) {
        setSelectedClientId(list[0].id);
      }
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

  // 从后台加载战略陪伴数据（按 selectedClientId 过滤）
  useEffect(() => {
    if (!selectedClientId) return;

    let canceled = false;

    const loadProjectData = async () => {
      try {
        setIsLoadingProjectData(true);
        const data = await getStrategyCompanionData(selectedClientId);
        if (canceled) return;

        setMilestones(
          (data.milestones || []).map((m: any) => ({
            id: m.id,
            title: m.title,
            status: m.status,
            date: m.milestoneDate || '',
            coreGoal: m.coreGoal,
            deliverable: m.deliverable,
            description: m.description,
            participants: m.participants,
            output: m.outputs,
          }))
        );

        setGoals(
          (data.goals || []).map((g: any) => ({
            id: g.id,
            title: g.title,
            description: g.description || '',
            attachmentUrl: g.attachmentUrl,
            progress: g.progress || 0,
            metrics: (g.metrics || []).map((met: any) => ({
              label: met.label,
              value: met.value == null ? '0' : `${met.value}${met.unit || ''}`,
              target: met.target == null ? '0' : `${met.target}${met.unit || ''}`,
            })),
          }))
        );

        setEvents(
          (data.events || []).map((e: any) => ({
            id: e.id,
            type: e.type,
            title: e.title,
            date: e.eventDate,
            description: e.description || '',
            participants: e.participants,
            details: e.details,
          }))
        );

        setDocuments(
          (data.documents || []).map((d: any) => ({
            id: d.id,
            category: d.category,
            title: d.title,
            date: d.docDate || '',
            meta: d.meta || '',
            fileType: d.fileType,
            fileUrl: d.fileUrl,
            documentLink: d.documentLink,
            passwordProtected: d.passwordProtected,
            password: d.password,
          }))
        );

        setMeetings(
          (data.meetings || []).map((m: any) => ({
            id: m.id,
            title: m.title,
            date: m.meetingDate,
            duration: m.duration || '',
            participants: m.participantsCount || 0,
            keyPoints: m.keyPoints || [],
            attendees: m.attendees,
            decisions: m.decisions,
            actionItems: m.actionItems,
            attachmentUrl: m.attachmentUrl,
            meetingLink: m.meetingLink,
            passwordProtected: m.passwordProtected,
            password: m.password,
          }))
        );

        setCourseRecommendations(
          (data.courseRecommendations || []).map((r: any) => ({
            id: r.id,
            type: r.type === 'internal' ? (r.internalType === 'report' ? 'report' : r.internalType === 'book' ? 'book' : 'article') : 'article',
            title: r.title,
            description: r.description || '',
            date: (r.createdAt || '').slice(0, 10),
            category: r.sourceName || (r.type === 'internal' ? '站内' : '外部'),
            url: r.url,
          }))
        );

        setIsLoadingProjectData(false);
      } catch (error) {
        console.error('加载战略陪伴数据失败:', error);
        if (canceled) return;
        setIsLoadingProjectData(false);
      }
    };

    loadProjectData();

    const onChange = () => loadProjectData();
    window.addEventListener('yiyu_data_change', onChange);
    window.addEventListener('storage', onChange);

    return () => {
      canceled = true;
      window.removeEventListener('yiyu_data_change', onChange);
      window.removeEventListener('storage', onChange);
    };
  }, [selectedClientId]);

  // Handle document download
  const handleDocumentDownload = (doc: Document) => {
    // 检查是否需要密码
    if (doc.passwordProtected && doc.password) {
      const userPassword = prompt(`文档「${doc.title}」已设置密码保护\n\n请输入6位数字下载密码：`);

      if (!userPassword) return;

      if (userPassword !== doc.password) {
        alert('❌ 密码错误，无法下载\n\n请联系管理员获取正确的下载密码');
        return;
      }

      alert('✅ 密码验证成功');
    }

    // Prefer real link/file
    const url = doc.documentLink || doc.fileUrl;
    if (url) {
      window.open(url, '_blank');
      return;
    }

    // Fallback
    setDownloadingDoc(doc.id);
    setTimeout(() => {
      setDownloadingDoc(null);
      alert(`暂无可下载链接：${doc.title}\n\n请在后台为该文档填写 fileUrl 或 documentLink。`);
    }, 400);
  };


  // Handle meeting download
  const handleMeetingDownload = (meeting: Meeting) => {
    // 检查是否需要密码
    if (meeting.passwordProtected && meeting.password) {
      const userPassword = prompt(`会议记录「${meeting.title}」已设置密码保护\n\n请输入6位数字下载密码：`);
      
      if (!userPassword) {
        // 用户取消输入
        return;
      }
      
      if (userPassword !== meeting.password) {
        alert('❌ 密码错误，无法下载\n\n请联系管理员获取正确的下载密码');
        return;
      }
      
      // 密码正确，继续下载
      alert('✅ 密码验证成功');
    }
    
    // Simulate download
    alert(`正在下载会议记录: ${meeting.title}\n\n日期: ${meeting.date}\n时长: ${meeting.duration}`);
  };

  // Handle AI quick actions
  const handleQuickAction = (action: string) => {
    const newMessage = `请帮我${action}`;
    setAssistantMessage(newMessage);
    
    const newMessages = [
      ...chatMessages,
      { 
        role: 'user' as const, 
        content: newMessage, 
        time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) 
      }
    ];
    setChatMessages(newMessages);

    // Simulate AI response
    setTimeout(() => {
      let response = '';
      switch (action) {
        case '生成会前包':
          response = '好的，我来帮您生成会前包。\n\n请提供以下信息：\n1) 会议主题和目的\n2) 参会人员名单\n3) 需要讨论的议题\n\n我会为您生成：\n• 会议议程安排\n• 背景资料整理\n• 关键问题清单\n• 预期产出模板';
          break;
        case '生成简报':
          response = '好的，我来帮您生成战略简报。\n\n请选择：\n1) 整体战略概览\n2) 特定模块进展报告\n3) 目标达成情况分析\n4) 风险和挑战概述\n\n我会为您生成一份简洁有力的战略简报，包含关键数据和洞察。';
          break;
        case '解释指标':
          response = '好的，我来解释这些战略指标的含义：\n\n1) 媒体曝光：指组织在各类媒体上的报道次数，反映品牌影响力\n2) 社交媒体增长：指官方账号的粉丝增长数量\n3) 新捐赠人：指新增加的捐款人数\n4) 月均筹款额：指每月的平均筹款金额\n5) 系统上线：指数字化平台的功能模块上线数量\n6) 数据覆盖率：指数据驱动决策的应用范围';
          break;
        case '解答问题':
          response: '好的，我很乐意为您解答战略相关问题。\n\n请描述您的问题，例如：\n• 战略方向选择\n• 目标设定方法\n• 执行路径规划\n• 风险应对策略\n• 组织能力建设\n\n我会基于我的知识库和您的组织情况，给出专业建议。';
          break;
        default:
          response = '收到！我来帮您处理这个需求。\n\n请问您希望：\n1. 生成相关的简报材料\n2. 查找相关的参考资料\n3. 将此议题加入下次复盘讨论';
      }
      
      setChatMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: response,
          time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    }, 1500);
  };

  const handleSendMessage = () => {
    if (!assistantMessage.trim()) return;

    const newMessages = [
      ...chatMessages,
      { 
        role: 'user' as const, 
        content: assistantMessage, 
        time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) 
      }
    ];

    setChatMessages(newMessages);
    setAssistantMessage('');

    // Simulate AI response
    setTimeout(() => {
      setChatMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: '收到！我来帮您处理这个需求。\n\n请问您希望：\n1. 生成相关的简报材料\n2. 查找相关的参考资料\n3. 将此议题加入下次复盘讨论',
          time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-[#FAFAFC]">
      <Header
        isLoggedIn={true}
        userType="member"
        onNavigate={onNavigate}
      />

      <main className="max-w-6xl mx-auto px-8 py-12 pt-24">
        {/* Page Header */}
        <div className="mb-10">
          <div className="flex items-center justify-between gap-6 flex-wrap">
            <div>
              <div className="flex items-center gap-3 mb-3">
                {/* client cover */}
                <div className="w-12 h-12 rounded-2xl overflow-hidden border border-slate-100 bg-white shadow-sm shrink-0">
                  <img
                    src={getClientCoverImage(selectedClient)}
                    alt=""
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
                <div className="w-1 h-8 bg-blue-500 rounded-full" />
                <h1 className="text-[32px] font-semibold text-slate-900 tracking-tight">
                  {selectedClient?.clientName || '战略客户'}
                </h1>
              </div>
              <div className="flex items-center gap-3 ml-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                  <span className="text-[13px] text-slate-500">战略陪伴进行中</span>
                </div>
                <span className="text-slate-300">·</span>
                <span className="text-[13px] text-slate-500">第 3 阶段 / 共 5 阶段</span>
              </div>
            </div>

            {/* Client selector (Apple-ish, minimal) */}
            <div className="min-w-[260px]">
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                当前客户
              </label>
              <div className="relative">
                <select
                  value={selectedClientId}
                  onChange={(e) => setSelectedClientId(e.target.value)}
                  className="w-full appearance-none px-4 py-3 pr-10 rounded-2xl bg-white border border-slate-100 text-[14px] font-medium text-slate-800 hover:shadow-md hover:shadow-slate-100/50 transition-all"
                >
                  {clients.length === 0 ? (
                    <option value="">暂无客户（请先在后台添加）</option>
                  ) : (
                    clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.clientName}
                      </option>
                    ))
                  )}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>

        {/* Mission & Vision & Values */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 mb-12">
          {/* Left: Mission & Vision */}
          <div className="lg:col-span-8 space-y-8">
            {/* Mission */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-blue-500" />
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Mission</span>
              </div>
              <p className="text-[20px] font-medium text-slate-800 leading-relaxed max-w-[52ch]">
                {selectedClient?.mission || '（请在后台为该客户填写 Mission）'}
              </p>
            </div>

            {/* Vision */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Rocket className="w-4 h-4 text-indigo-500" />
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Vision</span>
              </div>
              <p className="text-[20px] font-medium text-slate-800 leading-relaxed max-w-[52ch]">
                {selectedClient?.vision || '（请在后台为该客户填写 Vision）'}
              </p>
            </div>
          </div>

          {/* Right: Values */}
          <div className="lg:col-span-4">
            <div className="flex items-center gap-2 mb-4">
              <Star className="w-4 h-4 text-amber-500" />
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Values</span>
            </div>
            <div className="flex flex-wrap gap-2.5">
              {(selectedClient?.values && selectedClient.values.length > 0 ? selectedClient.values : ['深度陪伴', '系统思维', '价值共创', '长期主义']).map((value, idx) => (
                <div 
                  key={idx}
                  className="px-4 py-2 rounded-full bg-white border border-slate-100 text-[14px] font-medium text-slate-700 hover:shadow-md hover:shadow-slate-100/50 transition-all duration-200 cursor-default"
                >
                  {value}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Milestones Timeline */}
        <div className="mb-12">
          <h2 className="text-[18px] font-semibold text-slate-800 mb-6">战略里程碑</h2>
          <div className="bg-white rounded-2xl border border-slate-100 p-6 sm:p-8 overflow-x-auto">
            <MilestoneTimeline 
              milestones={milestones}
              onMilestoneClick={setSelectedMilestone}
            />
          </div>
        </div>

        {/* Strategic Goals */}
        <div className="mb-12">
          <h2 className="text-[18px] font-semibold text-slate-800 mb-6">本季度重点目标</h2>
          {isLoadingProjectData ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-slate-400">加载中...</div>
            </div>
          ) : goals.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {goals.map((goal) => (
                <GoalCard key={goal.id} goal={goal} onDownload={(goal) => { alert(`正在下载目标方法文档\n\n目标: ${goal.title}\n\n这是一份帮助您达成本季度重点目标的方法论文档。`); }} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-slate-400">
              暂无本季度重点目标数据
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="mb-12">
          <h2 className="text-[18px] font-semibold text-slate-800 mb-6">最近动态</h2>
          <div className="bg-white rounded-2xl border border-slate-100 divide-y divide-slate-50">
            {events.map((event) => (
              <EventItem 
                key={event.id} 
                event={event}
                onClick={setSelectedEvent}
              />
            ))}
          </div>
        </div>

        {/* Documents & Meetings - Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
          {/* Documents */}
          <div>
            <h2 className="text-[18px] font-semibold text-slate-800 mb-6">文档资源</h2>
            <div className="bg-white rounded-2xl border border-slate-100 divide-y divide-slate-50">
              {documents.map((doc) => (
                <DocumentItem 
                  key={doc.id} 
                  document={doc}
                  onDownload={handleDocumentDownload}
                />
              ))}
            </div>
          </div>

          {/* Meetings */}
          <div>
            <h2 className="text-[18px] font-semibold text-slate-800 mb-6">会议记录</h2>
            <div className="space-y-4">
              {meetings.map((meeting) => (
                <MeetingCard 
                  key={meeting.id} 
                  meeting={meeting}
                  onClick={setSelectedMeeting}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Empowerment Academy */}
        <div className="mt-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-[18px] font-semibold text-slate-800">赋能学院</h2>
            <span className="text-[13px] text-slate-500">为您精选的学习资源</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
            {courseRecommendations.map((resource) => (
              <LearningResourceCard key={resource.id} resource={resource} />
            ))}
          </div>
        </div>
      </main>

      {/* Milestone Detail Modal */}
      <Modal
        isOpen={!!selectedMilestone}
        onClose={() => setSelectedMilestone(null)}
        title={selectedMilestone?.title || '里程碑详情'}
      >
        {selectedMilestone && (
          <div className="space-y-6">
            {/* Status */}
            <div className="flex items-center gap-3">
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                selectedMilestone.status === 'completed' 
                  ? 'bg-green-100 text-green-700'
                  : selectedMilestone.status === 'in-progress'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-600'
              }`}>
                {selectedMilestone.status === 'completed' ? '已完成' 
                  : selectedMilestone.status === 'in-progress' ? '进行中' : '待开始'}
              </span>
              <span className="text-sm text-slate-500">{selectedMilestone.date}</span>
            </div>

            {/* Description */}
            {selectedMilestone.description && (
              <div>
                <p className="text-sm text-slate-600">{selectedMilestone.description}</p>
              </div>
            )}

            {/* Core Goal */}
            <div className="bg-slate-50 rounded-xl p-5">
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">本阶段目标</p>
              <p className="font-medium text-slate-800">{selectedMilestone.coreGoal}</p>
            </div>

            {/* Deliverable */}
            <div className="bg-blue-50 rounded-xl p-5">
              <p className="text-xs text-blue-600 uppercase tracking-wider mb-2">主要产出</p>
              <p className="font-medium text-blue-800">{selectedMilestone.deliverable}</p>
            </div>

            {/* Participants */}
            {selectedMilestone.participants && (
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-3">参与人员</p>
                <div className="flex flex-wrap gap-2">
                  {selectedMilestone.participants.map((person, idx) => (
                    <span key={idx} className="px-3 py-1 bg-slate-100 rounded-lg text-sm text-slate-700">
                      {person}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Outputs */}
            {selectedMilestone.output && (
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-3">产出文件</p>
                <div className="space-y-2">
                  {selectedMilestone.output.map((file, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-slate-400" />
                        <span className="text-sm text-slate-700">{file}</span>
                      </div>
                      <button 
                        className="text-blue-500 hover:text-blue-600 text-sm font-medium"
                        onClick={() => handleDocumentDownload({ id: `out-${idx}`, title: file, date: '', meta: '' } as Document)}
                      >
                        下载
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Event Detail Modal */}
      <Modal
        isOpen={!!selectedEvent}
        onClose={() => setSelectedEvent(null)}
        title={selectedEvent?.title || '事件详情'}
      >
        {selectedEvent && (
          <div className="space-y-6">
            {/* Meta */}
            <div className="flex items-center gap-3">
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                selectedEvent.type === 'meeting' 
                  ? 'bg-blue-100 text-blue-700'
                  : selectedEvent.type === 'deliverable'
                    ? 'bg-purple-100 text-purple-700'
                    : 'bg-green-100 text-green-700'
              }`}>
                {selectedEvent.type === 'meeting' ? '会议' 
                  : selectedEvent.type === 'deliverable' ? '交付物' : '里程碑'}
              </span>
              <span className="text-sm text-slate-500">{selectedEvent.date}</span>
              {selectedEvent.participants && (
                <span className="text-sm text-slate-500">
                  · {selectedEvent.participants} 位参与者
                </span>
              )}
            </div>

            {/* Description */}
            <div>
              <p className="text-sm text-slate-600 leading-relaxed">{selectedEvent.description}</p>
            </div>

            {/* Details */}
            {selectedEvent.details && (
              <div className="bg-slate-50 rounded-xl p-5">
                <p className="text-sm text-slate-700 leading-relaxed">{selectedEvent.details}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <button className="flex-1 py-3 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 transition-colors">
                查看详情
              </button>
              <button className="flex-1 py-3 border border-slate-200 text-slate-700 rounded-xl font-medium hover:bg-slate-50 transition-colors">
                下载资料
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Meeting Detail Modal */}
      <Modal
        isOpen={!!selectedMeeting}
        onClose={() => setSelectedMeeting(null)}
        title={selectedMeeting?.title || '会议详情'}
      >
        {selectedMeeting && (
          <div className="space-y-6">
            {/* Meta */}
            <div className="flex items-center gap-4">
              <span className="text-sm text-slate-500">{selectedMeeting.date}</span>
              <span className="flex items-center gap-1 text-sm text-slate-500">
                <Clock className="w-4 h-4" />
                {selectedMeeting.duration}
              </span>
              <span className="flex items-center gap-1 text-sm text-slate-500">
                <Users className="w-4 h-4" />
                {selectedMeeting.participants} 人
              </span>
            </div>

            {/* Key Points */}
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-3">核心要点</p>
              <div className="flex flex-wrap gap-2">
                {selectedMeeting.keyPoints.map((point, idx) => (
                  <span key={idx} className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-sm">
                    {point}
                  </span>
                ))}
              </div>
            </div>

            {/* Attendees */}
            {selectedMeeting.attendees && (
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-3">参会人员</p>
                <div className="flex flex-wrap gap-2">
                  {selectedMeeting.attendees.map((person, idx) => (
                    <span key={idx} className="px-3 py-1.5 bg-slate-100 rounded-lg text-sm text-slate-700">
                      {person}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Decisions */}
            {selectedMeeting.decisions && (
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-3">决议事项</p>
                <div className="space-y-2">
                  {selectedMeeting.decisions.map((decision, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                      <CheckCircle className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                      <span className="text-sm text-green-800">{decision}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Items */}
            {selectedMeeting.actionItems && (
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-3">待办事项</p>
                <div className="space-y-2">
                  {selectedMeeting.actionItems.map((item, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-3 bg-amber-50 rounded-lg">
                      <div className="w-5 h-5 rounded-full border-2 border-amber-400 shrink-0 mt-0.5" />
                      <span className="text-sm text-amber-800">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <button onClick={() => selectedMeeting && handleMeetingDownload(selectedMeeting)} className="flex-1 py-3 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 transition-colors flex items-center justify-center gap-2">
                <Download className="w-5 h-5" />
                下载会议纪要
              </button>
              <button className="flex-1 py-3 border border-slate-200 text-slate-700 rounded-xl font-medium hover:bg-slate-50 transition-colors">
                编辑纪要
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* AI Assistant Button - Fixed position */}
      <button
        onClick={() => setAiDrawerOpen(true)}
        className="fixed bottom-8 left-8 z-50 w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/30 flex items-center justify-center hover:scale-105 transition-all duration-300"
      >
        <Sparkles className="w-6 h-6 text-white" />
      </button>

      {/* AI Assistant Drawer */}
      {aiDrawerOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-start pointer-events-none">
          <div className="pointer-events-auto w-[400px] h-[600px] ml-8 mb-8 rounded-2xl bg-white shadow-2xl border border-slate-100 overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-6 border-b border-slate-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-800">AI 战略助手</h3>
                    <p className="text-xs text-slate-400">随时为您提供支持</p>
                  </div>
                </div>
                <button
                  onClick={() => setAiDrawerOpen(false)}
                  className="w-8 h-8 rounded-lg hover:bg-slate-50 flex items-center justify-center transition-colors"
                >
                  <X className="w-4 h-4 text-slate-400" />
                </button>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="p-5 bg-slate-50 border-b border-slate-50">
              <p className="text-[11px] font-semibold text-slate-400 mb-3 uppercase tracking-wider">快速指令</p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { icon: FileText, label: '生成会前包', color: 'blue' },
                  { icon: BarChart3, label: '生成简报', color: 'blue' },
                  { icon: Lightbulb, label: '解释指标', color: 'amber' },
                  { icon: MessageSquare, label: '解答问题', color: 'green' }
                ].map((item, index) => (
                  <button
                    key={index}
                    onClick={() => handleQuickAction(item.label)}
                    className="flex items-center gap-2 p-3 rounded-xl bg-white border border-slate-100 hover:border-blue-200 hover:bg-blue-50/50 transition-all duration-200"
                  >
                    <item.icon className={`w-4 h-4 text-${item.color}-500`} />
                    <span className="text-xs font-medium text-slate-700">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Chat Area */}
            <div 
              ref={chatContainerRef}
              className="flex-1 overflow-y-auto p-5 space-y-4"
            >
              {chatMessages.map((message, index) => (
                <div key={index} className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    message.role === 'assistant'
                      ? 'bg-gradient-to-br from-blue-500 to-indigo-600'
                      : 'bg-slate-100'
                  }`}>
                    {message.role === 'assistant' ? (
                      <Sparkles className="w-4 h-4 text-white" />
                    ) : (
                      <span className="text-sm font-medium text-slate-500">我</span>
                    )}
                  </div>
                  <div className={`max-w-[80%] ${message.role === 'user' ? 'text-right' : ''}`}>
                    <div className={`px-4 py-3 rounded-2xl text-[14px] leading-relaxed ${
                      message.role === 'user'
                        ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-tr-sm'
                        : 'bg-slate-50 text-slate-700 rounded-tl-sm'
                    }`}>
                      {message.content.split('\n').map((line, i) => (
<p key={i} className={i > 0 ? 'mt-1' : ''}>{line}</p>
                      ))}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1.5">{message.time}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Input Area */}
            <div className="p-5 border-t border-slate-50">
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  value={assistantMessage}
                  onChange={(e) => setAssistantMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="输入您的问题..."
                  className="flex-1 px-4 py-3 rounded-xl bg-slate-50 border border-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300 text-sm transition-all duration-200"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!assistantMessage.trim()}
                  className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Download Toast */}
      {downloadingDoc && (
        <div className="fixed bottom-8 right-8 z-50 bg-slate-800 text-white px-6 py-4 rounded-xl shadow-lg flex items-center gap-3 animate-fadeIn">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>正在准备下载...</span>
        </div>
      )}
    </div>
  );
}

export default StrategyCompanionPage;
