import { useState } from 'react';
import { Header } from './Header';
import { BookOpen, Star, Eye, User, ChevronRight } from 'lucide-react';

interface Book {
  id: string;
  title: string;
  author: string;
  description: string;
  abstract: string;
  category: string;
  tags: string[];
  valuePoints: string[];
  pages: number;
  duration: string;
  rating: number;
  views: number;
  reviewCount: number;
  date: string;
  coverColor?: string;
}

interface LibraryPageProps {
  onNavigate?: (
    page:
      | 'home'
      | 'insights'
      | 'learning'
      | 'strategy'
      | 'about'
      | 'book-reader'
      | 'login'
      | 'register'
      | 'case'
      | 'admin'
      | 'user-center'
      | 'test'
      | 'strategy-companion'
      | 'report-library'
      | 'article-center',
    bookId?: string,
    caseId?: string
  ) => void;
}

export function LibraryPage({ onNavigate }: LibraryPageProps) {
  const [activeCategory, setActiveCategory] = useState('all');

  const categories = [
    { id: 'all', label: '全部' },
    { id: 'ai', label: '人工智能' },
    { id: 'business', label: '商业思维' },
    { id: 'management', label: '管理实战' },
    { id: 'strategy', label: '战略' },
    { id: 'data', label: '数据分析' },
    { id: 'organization', label: '组织发展' },
  ];

  const books: Book[] = [
    {
      id: '1',
      title: '《什么是权力》',
      author: '弗朗西斯·福山',
      description: '深入探讨权力的本质、来源与运作机制',
      abstract: '本书系统性地探讨了权力的本质与来源。福山从人类本性的角度出发，分析了权力的三大来源：暴力、财富与意识形态，并深入探讨了这三种权力在不同历史时期和社会形态中的表现形式。',
      category: '战略',
      tags: ['政治哲学', '权力理论', '社会学经典'],
      valuePoints: [
        '理解权力的三大来源：暴力、财富与意识形态',
        '掌握政治秩序的三大要素',
        '分析不同政治体制的权力运作模式'
      ],
      pages: 328,
      duration: '约6小时',
      rating: 4.8,
      views: 15680,
      reviewCount: 1234,
      date: '2026/01/29',
      coverColor: 'from-blue-600 to-indigo-800'
    },
    {
      id: '3',
      title: '《精益数据分析》PPT笔记',
      author: '益语智库团队',
      description: '精益创业方法论的数据驱动决策框架',
      abstract: '本书深入解析精益数据分析的核心方法论，帮助你快速掌握数据驱动决策的关键技巧。',
      category: '数据分析',
      tags: ['数据分析', '精益', '创业'],
      valuePoints: [
        '掌握精益数据分析的核心方法',
        '学会用数据驱动业务决策',
        '建立数据驱动的增长体系'
      ],
      pages: 52,
      duration: '1h 20min',
      rating: 4.7,
      views: 9870,
      reviewCount: 567,
      date: '2026/01/27',
      coverColor: 'from-green-500 to-emerald-600'
    },
    {
      id: '4',
      title: '《组织学习手册》提炼',
      author: '益语智库团队',
      description: '彼得·圣吉学习型组织理论的实践提炼',
      abstract: '系统性梳理组织学习的理论基础与实践方法，涵盖知识管理、团队学习与组织变革的核心议题。',
      category: '组织发展',
      tags: ['组织学习', '知识管理'],
      valuePoints: [
        '理解彼得·圣吉的学习型组织理论',
        '掌握知识管理的实践方法',
        '学会构建学习型组织'
      ],
      pages: 48,
      duration: '1h',
      rating: 4.5,
      views: 7650,
      reviewCount: 432,
      date: '2026/01/26',
      coverColor: 'from-purple-500 to-violet-600'
    },
    {
      id: '5',
      title: '《麦肯锡方法论》精要提炼',
      author: '益语智库团队',
      description: '麦肯锡咨询顾问的思考方法与工作法则',
      abstract: '浓缩麦肯锡咨询顾问的思考方法与工作法则，提供可直接使用的分析框架。',
      category: '商业思维',
      tags: ['麦肯锡', '方法论', '咨询'],
      valuePoints: [
        '掌握麦肯锡的分析框架',
        '学会结构化思考问题',
        '提升商业洞察力'
      ],
      pages: 36,
      duration: '50min',
      rating: 4.7,
      views: 11200,
      reviewCount: 890,
      date: '2026/01/25',
      coverColor: 'from-orange-500 to-amber-600'
    },
    {
      id: '7',
      title: '《竞争战略》核心框架',
      author: '益语智库团队',
      description: '波特竞争战略理论的核心观点与实践应用',
      abstract: '波特竞争战略理论的核心观点与实践应用，解析五种竞争力量。',
      category: '战略',
      tags: ['竞争', '战略', '波特'],
      valuePoints: [
        '理解波特五力分析模型',
        '掌握三种基本战略',
        '学会制定竞争战略'
      ],
      pages: 28,
      duration: '35min',
      rating: 4.4,
      views: 6540,
      reviewCount: 345,
      date: '2026/01/23',
      coverColor: 'from-red-500 to-rose-600'
    },
    {
      id: '8',
      title: '《从优秀到卓越》要点',
      author: '益语智库团队',
      description: '深度解读吉姆·柯林斯的研究发现与实践路径',
      abstract: '深度解读吉姆·柯林斯的研究发现，提炼企业实现跨越的关键因素。',
      category: '商业思维',
      tags: ['领导力', '企业管理'],
      valuePoints: [
        '理解从优秀到卓越的转变路径',
        '掌握刺猬概念的应用',
        '学会构建卓越企业文化'
      ],
      pages: 42,
      duration: '55min',
      rating: 4.9,
      views: 9870,
      reviewCount: 678,
      date: '2026/01/22',
      coverColor: 'from-yellow-500 to-orange-600'
    },
    {
      id: '9',
      title: '《增长黑客》笔记',
      author: '益语智库团队',
      description: '增长黑客的核心方法与实战技巧',
      abstract: '提炼增长黑客的核心方法与实战技巧，涵盖用户增长、产品优化与数据驱动的增长策略。',
      category: '管理实战',
      tags: ['增长', '用户增长'],
      valuePoints: [
        '掌握增长黑客的核心方法论',
        '学会A/B测试与数据分析',
        '构建增长模型与体系'
      ],
      pages: 38,
      duration: '48min',
      rating: 4.7,
      views: 5430,
      reviewCount: 234,
      date: '2026/01/21',
      coverColor: 'from-pink-500 to-rose-600'
    },
    {
      id: '10',
      title: '《思考，快与慢》摘要',
      author: '益语智库团队',
      description: '丹尼尔·卡尼曼的行为经济学研究成果',
      abstract: '解析丹尼尔·卡尼曼的行为经济学研究成果，帮助理解人类决策中的认知偏差。',
      category: '商业思维',
      tags: ['决策', '心理学'],
      valuePoints: [
        '理解系统1与系统2的思维模式',
        '掌握认知偏差的类型与影响',
        '学会做出更好的决策'
      ],
      pages: 45,
      duration: '1h',
      rating: 4.8,
      views: 7890,
      reviewCount: 567,
      date: '2026/01/20',
      coverColor: 'from-indigo-500 to-blue-600'
    },
    {
      id: '12',
      title: '《波士顿矩阵》使用指南',
      author: '益语智库团队',
      description: '波士顿矩阵的实际应用与案例分析',
      abstract: '波士顿矩阵的实际应用与案例分析，帮助企业进行产品组合管理。',
      category: '战略',
      tags: ['波士顿矩阵', '战略分析'],
      valuePoints: [
        '掌握波士顿矩阵的四种业务类型',
        '学会制定产品组合策略',
        '理解市场增长率与市场份额'
      ],
      pages: 22,
      duration: '28min',
      rating: 4.6,
      views: 4560,
      reviewCount: 189,
      date: '2026/01/18',
      coverColor: 'from-cyan-500 to-teal-600'
    },
    {
      id: '13',
      title: 'AI落地能力成熟度模型',
      author: '益语智库团队',
      description: '企业AI转型成熟度评估工具与实施路径',
      abstract: '企业AI转型成熟度评估工具，包含详细诊断指标和实施路径。',
      category: '人工智能',
      tags: ['AI', '评估', '工具'],
      valuePoints: [
        '掌握AI成熟度评估方法',
        '学会制定AI转型路线图',
        '理解AI应用的最佳实践'
      ],
      pages: 56,
      duration: '1h 10min',
      rating: 4.8,
      views: 12340,
      reviewCount: 789,
      date: '2026/01/17',
      coverColor: 'from-violet-500 to-purple-600'
    },
    {
      id: '14',
      title: '供应链韧性评估框架',
      author: '益语智库团队',
      description: '供应链风险识别与应对指南',
      abstract: '从单一效率优化到韧性与效率的动态平衡，供应链风险识别与应对指南。',
      category: '管理实战',
      tags: ['供应链', '风险管理'],
      valuePoints: [
        '掌握供应链风险评估方法',
        '学会构建韧性供应链',
        '理解供应链优化策略'
      ],
      pages: 38,
      duration: '45min',
      rating: 4.5,
      views: 3450,
      reviewCount: 123,
      date: '2026/01/16',
      coverColor: 'from-teal-500 to-cyan-600'
    },
    {
      id: '15',
      title: '《数字化转型》指南',
      author: '益语智库团队',
      description: '数字化转型的战略规划与组织变革',
      abstract: '全面解析数字化转型的战略规划、技术选型与组织变革，提供丰富的案例分析。',
      category: '人工智能',
      tags: ['数字化', '转型'],
      valuePoints: [
        '掌握数字化转型的核心要素',
        '学会制定数字化战略',
        '理解组织变革的管理方法'
      ],
      pages: 65,
      duration: '1h 30min',
      rating: 4.8,
      views: 11200,
      reviewCount: 654,
      date: '2026/01/15',
      coverColor: 'from-blue-500 to-indigo-600'
    },
  ];

  const filteredBooks = books.filter(book => {
    if (activeCategory === 'all') return true;
    const categoryMap: Record<string, string[]> = {
      'ai': ['人工智能'],
      'business': ['商业思维'],
      'management': ['管理实战'],
      'strategy': ['战略'],
      'data': ['数据分析'],
      'organization': ['组织发展']
    };
    return categoryMap[activeCategory]?.includes(book.category);
  });

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      '战略': 'bg-blue-100 text-blue-700',
      '人工智能': 'bg-purple-100 text-purple-700',
      '商业思维': 'bg-orange-100 text-orange-700',
      '管理实战': 'bg-green-100 text-green-700',
      '数据分析': 'bg-cyan-100 text-cyan-700',
      '组织发展': 'bg-pink-100 text-pink-700',
    };
    return colors[category] || 'bg-gray-100 text-gray-700';
  };

  const handleBookClick = (bookId: string) => {
    if (onNavigate) {
      onNavigate('book-reader', bookId);
    } else {
      window.location.href = `?page=book-reader&bookId=${bookId}`;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header isLoggedIn={false} userType="visitor" onNavigate={(p) => onNavigate?.(p as any)} />

      {/* Hero Section */}
      <section className="pt-32 pb-12 px-4 sm:px-6 lg:px-8 border-b border-border/40">
        <div className="max-w-[1200px] mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-10">
            <div>
              <h1 className="text-[32px] font-semibold tracking-tight text-foreground mb-2">
                书库
              </h1>
              <p className="text-[15px] text-muted-foreground/70">
                精选书籍提炼 · 知识精华萃取
              </p>
            </div>
            <button className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white border border-border/60 hover:border-primary/40 transition-all shadow-sm text-[14px]">
              <User className="w-4 h-4 text-muted-foreground/70" />
              <span className="font-medium text-muted-foreground/70">我的学习</span>
            </button>
          </div>

          {/* Category Tags */}
          <div className="flex items-center gap-2 flex-wrap">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setActiveCategory(category.id)}
                className={`px-5 py-2.5 rounded-full text-[14px] font-medium transition-all duration-300 ${
                  activeCategory === category.id
                    ? 'bg-foreground text-white shadow-lg'
                    : 'bg-white border border-border/60 hover:border-primary/40 text-muted-foreground/70 hover:text-foreground'
                }`}
              >
                {category.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Content */}
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {filteredBooks.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredBooks.map((book) => (
              <BookCard
                key={book.id}
                book={book}
                onClick={() => handleBookClick(book.id)}
                getCategoryColor={getCategoryColor}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-24">
            <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-6">
              <BookOpen className="w-8 h-8 text-muted-foreground/50" />
            </div>
            <h3 className="text-[18px] font-medium mb-2">未找到相关书籍</h3>
            <p className="text-muted-foreground/70 text-[14px]">尝试其他分类</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="py-12 px-4 sm:px-6 lg:px-8 border-t border-border/40 bg-muted/5">
        <div className="max-w-[1200px] mx-auto text-center">
          <p className="text-[13px] text-muted-foreground/60 mb-4">书库 · 精选书籍提炼 · 知识精华萃取</p>
          <p className="text-[11px] text-muted-foreground/50">© 2026 益语智库 Yiyu Think Tank. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

function BookCard({ book, onClick, getCategoryColor }: { book: Book; onClick: () => void; getCategoryColor: (category: string) => string }) {
  return (
    <div
      onClick={onClick}
      className="relative bg-white/80 backdrop-blur-sm rounded-[20px] border border-border/40 overflow-hidden cursor-pointer group hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-1 transition-all duration-300"
    >
      {/* Cover */}
      <div className={`h-36 bg-gradient-to-br ${book.coverColor || 'from-muted/50 to-muted/30'} flex items-center justify-center relative p-4`}>
        {/* Rating */}
        <div className="absolute top-3 right-3 flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/90 backdrop-blur-sm shadow-sm">
          <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
          <span className="text-[12px] font-medium text-foreground">{book.rating}</span>
        </div>

        {/* Icon */}
        <div className="w-14 h-14 rounded-[16px] bg-white/90 backdrop-blur-sm shadow-md flex items-center justify-center transform group-hover:scale-110 transition-transform duration-300">
          <BookOpen className="w-7 h-7 text-white" />
        </div>
      </div>

      {/* Content */}
      <div className="p-5">
        {/* Category */}
        <div className="flex items-center gap-2 mb-3">
          <span className={`px-2.5 py-1 rounded-full text-[11px] font-medium border ${getCategoryColor(book.category)}`}>
            {book.category}
          </span>
        </div>

        {/* Title */}
        <h3 className="font-medium text-[16px] text-foreground mb-2 group-hover:text-primary transition-colors line-clamp-1">
          {book.title}
        </h3>

        {/* Description */}
        <p className="text-[13px] text-muted-foreground/70 mb-4 line-clamp-2 leading-relaxed">
          {book.description}
        </p>

        {/* Value Points Preview */}
        <div className="flex items-center gap-1.5 mb-4 flex-wrap">
          {book.valuePoints.slice(0, 2).map((point, index) => (
            <span key={index} className="px-2 py-0.5 rounded bg-success/10 text-success/80 text-[11px]">
              {point.substring(0, 12)}...
            </span>
          ))}
        </div>

        {/* Meta */}
        <div className="flex items-center justify-between text-[12px] text-muted-foreground/50 pt-4 border-t border-border/40">
          <div className="flex items-center gap-4">
            <span>{book.pages}页</span>
            <span>{book.duration}</span>
            <span>{book.views.toLocaleString()}</span>
          </div>
          <span>{book.date}</span>
        </div>
      </div>

      {/* Hover Overlay */}
      <div className="absolute inset-0 bg-foreground/90 backdrop-blur-sm flex items-center justify-center transition-all duration-300 opacity-0 group-hover:opacity-100">
        <button className="inline-flex items-center gap-2 px-6 py-3 bg-white rounded-full text-[14px] font-medium shadow-lg transform transition-all hover:scale-105">
          <Eye className="w-4 h-4" />
          <span>开始阅读</span>
        </button>
      </div>
    </div>
  );
}

export default LibraryPage;
