import { useState, useRef, useEffect } from 'react';
import { Header } from './Header';
import { Footer } from './Footer';
import {
  BookOpen,
  MessageSquare,
  Bookmark,
  Star,
  Clock,
  Eye,
  Users,
  Send,
  Plus,
  Minus,
  ChevronLeft,
  ChevronRight,
  ThumbsUp,
  MessageCircle,
  Sparkles,
  Target,
  CheckCircle,
  FileText,
  Copy,
  Share2,
  Play,
  Pause,
  Volume2,
  VolumeX,
  BarChart3,
  TrendingUp,
  Award,
  Zap,
  Lightbulb,
  ArrowRight
} from 'lucide-react';

// 书籍详情接口
interface BookDetail {
  id: string;
  title: string;
  author: string;
  description: string;
  abstract: string;
  tags: string[];
  valuePoints: string[];
  readerCount: number;
  rating: number;
  reviewCount: number;
  pdfPages: number;
  duration: string;
  publishDate: string;
  pdfUrl?: string;
  coverColor?: string;
  stats?: {
    completedToday: number;
    totalReaders: number;
    avgReadTime: number;
    comprehensionRate: number;
  };
}

// AI对话消息接口
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  isBookmarked?: boolean;
}

// 评价接口
interface Review {
  id: string;
  user: string;
  avatar: string;
  rating: number;
  content: string;
  date: string;
  likes: number;
}

export function SplitReaderPage() {
  // 从URL参数或全局状态获取书籍信息
  const bookDetail: BookDetail = {
    id: '1',
    title: '《什么是权力》',
    author: '弗朗西斯·福山',
    description: '深入探讨权力的本质、来源与运作机制，解析个人、组织与社会中权力的表现形式与影响。',
    abstract: '本书是著名政治学家弗朗西斯·福山的代表作之一，系统性地探讨了权力的本质与来源。福山从人类本性的角度出发，分析了权力的三大来源：暴力、财富与意识形态，并深入探讨了这三种权力在不同历史时期和社会形态中的表现形式。书中提出了"政治秩序"的理论框架，讨论了国家建设、法治与民主问责之间的平衡关系。通过丰富的历史案例和理论分析，福山揭示了权力运作的深层逻辑，对理解现代政治与社会具有重要启示意义。',
    tags: ['政治哲学', '权力理论', '社会学经典'],
    valuePoints: [
      '理解权力的三大来源：暴力、财富与意识形态',
      '掌握政治秩序的三大要素：国家、法治与民主问责',
      '分析不同政治体制的权力运作模式',
      '培养批判性思考政治问题的能力',
      '了解现代国家建设的挑战与路径'
    ],
    readerCount: 15680,
    rating: 4.8,
    reviewCount: 1234,
    pdfPages: 328,
    duration: '约6小时',
    publishDate: '2018-05',
    pdfUrl: '/what-is-power.pdf',
    coverColor: 'from-blue-600 to-indigo-800',
    stats: {
      completedToday: 128,
      totalReaders: 15680,
      avgReadTime: 45,
      comprehensionRate: 92
    }
  };

  const reviews: Review[] = [
    {
      id: '1',
      user: '张明',
      avatar: '张',
      rating: 5,
      content: '福山的这本书对权力的分析非常深刻，尤其是对政治秩序的三大要素的解释，让我对现代政治有了全新的认识。',
      date: '2026/01/25',
      likes: 156
    },
    {
      id: '2',
      user: '李华',
      avatar: '李',
      rating: 5,
      content: '作为政治学入门的必读书籍，这本《什么是权力》比想象中更容易理解，结合了很多历史案例来分析。',
      date: '2026/01/23',
      likes: 98
    },
    {
      id: '3',
      user: '王强',
      avatar: '王',
      rating: 4,
      content: '理论框架很清晰，但部分章节稍微有些枯燥。总体来说是一本值得反复阅读的好书。',
      date: '2026/01/20',
      likes: 67
    }
  ];

  const [activeTab, setActiveTab] = useState<'chat' | 'reviews' | 'bookmark' | 'notes'>('chat');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content: `您好！我是《什么是权力》这本书的AI阅读助手。基于这本书的内容，我可以帮您：\n\n📖 **内容解读** - 解答书中的核心概念和理论\n💡 **深度讨论** - 探讨权力、政治秩序等话题\n🎯 **实践应用** - 将理论联系实际案例\n📝 **知识总结** - 提炼关键观点和洞察\n\n请随时向我提问，我会结合书中的内容为您解答。`,
      timestamp: '10:30',
      isBookmarked: false
    }
  ]);
  const [newMessage, setNewMessage] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pdfScale, setPdfScale] = useState(50); // PDF缩放比例，默认50%
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // 模拟发送消息
  const handleSendMessage = () => {
    if (!newMessage.trim()) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: newMessage,
      timestamp: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
      isBookmarked: false
    };

    setChatMessages(prev => [...prev, userMsg]);
    setNewMessage('');

    // 模拟AI回复
    setTimeout(() => {
      const aiResponses = [
        `根据《什么是权力》这本书的内容，我来为您分析这个问题：\n\n福山在书中指出，权力的来源主要有三个：暴力、财富和意识形态。在现代民主社会中，意识形态往往是最重要的权力来源，因为它能够获得民众的认同和支持。\n\n您对这个分析有什么想法，或者想进一步探讨某个方面吗？`,
        `这是一个很有深度的问题。结合书中的理论，我认为：\n\n权力本质上是一种社会关系，它不仅体现在强制力上，更体现在影响力和说服力上。现代组织的权力结构正在经历深刻变革，从传统的科层制向网络化、扁平化方向演进。\n\n您是否想了解更多关于权力运作的具体案例？`,
        `非常好问题！福山在书中特别强调了政治秩序的三大支柱：\n\n1. **强大的国家** - 提供基本公共服务的行政能力\n2. **法治** - 约束权力运行的规则体系\n3. **民主问责** - 确保政府对民众负责的机制\n\n这三者之间的平衡是现代政治稳定的关键。`
      ];

      const randomResponse = aiResponses[Math.floor(Math.random() * aiResponses.length)];

      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: randomResponse,
        timestamp: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
        isBookmarked: false
      };

      setChatMessages(prev => [...prev, aiMsg]);

      setTimeout(() => {
        chatContainerRef.current?.scrollTo({
          top: chatContainerRef.current.scrollHeight,
          behavior: 'smooth'
        });
      }, 100);
    }, 1500);
  };

  // 收藏消息
  const handleBookmark = (messageId: string) => {
    setChatMessages(prev =>
      prev.map(msg =>
        msg.id === messageId
          ? { ...msg, isBookmarked: !msg.isBookmarked }
          : msg
      )
    );
  };

  // 复制消息内容
  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content);
  };

  // 翻页控制
  const handlePageChange = (direction: 'prev' | 'next') => {
    if (direction === 'prev' && currentPage > 1) {
      setCurrentPage(prev => prev - 1);
    } else if (direction === 'next' && currentPage < bookDetail.pdfPages) {
      setCurrentPage(prev => prev + 1);
    }
  };

  // PDF缩放控制
  const handleScaleChange = (action: 'decrease' | 'increase') => {
    const scales = [25, 50, 75, 100];
    const currentIndex = scales.indexOf(pdfScale);
    
    if (action === 'decrease' && currentIndex > 0) {
      setPdfScale(scales[currentIndex - 1]);
    } else if (action === 'increase' && currentIndex < scales.length - 1) {
      setPdfScale(scales[currentIndex + 1]);
    }
  };

  // 滚动到底部
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages]);

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      <Header isLoggedIn={true} userType="member" />

      {/* 主容器：PDF占3/4(75%)，AI占1/4(25%)，左右并列 */}
      <div className="flex flex-row h-[calc(100dvh-64px)] min-h-[1040px] overflow-hidden">
        {/* 左边3列：PDF阅读区域 - 占75% */}
        <div className="flex-[3] flex flex-col bg-slate-800 h-full overflow-hidden border-r border-slate-700">
          {/* PDF工具栏 - 在PDF区域内 */}
          <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-700 flex-shrink-0">
            <div className="flex items-center gap-3">
              {/* 翻页控制 */}
              <button
                onClick={() => handlePageChange('prev')}
                disabled={currentPage === 1}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
              >
                <ChevronLeft className="w-4 h-4" />
                上一页
              </button>
              <span className="text-sm text-slate-400">
                {currentPage} / {bookDetail.pdfPages}
              </span>
              <button
                onClick={() => handlePageChange('next')}
                disabled={currentPage === bookDetail.pdfPages}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
              >
                下一页
                <ChevronRight className="w-4 h-4" />
              </button>

              {/* 分隔线 */}
              <div className="w-px h-6 bg-slate-700 mx-2"></div>

              {/* 缩放控制 */}
              <button
                onClick={() => handleScaleChange('decrease')}
                disabled={pdfScale === 25}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="text-sm font-medium text-slate-300 min-w-[3rem] text-center">
                {pdfScale}%
              </span>
              <button
                onClick={() => handleScaleChange('increase')}
                disabled={pdfScale === 100}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* 右侧工具按钮 */}
            <div className="flex items-center gap-2">
              <button
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors text-sm"
              >
                <BookOpen className="w-4 h-4" />
                目录
              </button>
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors text-sm"
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                {isPlaying ? '暂停朗读' : '开始朗读'}
              </button>
              <button
                onClick={() => setIsMuted(!isMuted)}
                className="p-1.5 rounded-lg hover:bg-slate-700 transition-colors text-slate-400"
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* PDF内容区域 - 铺满整个区域 */}
          <div className="flex-1 overflow-hidden bg-slate-950 p-4">
            {bookDetail.pdfUrl ? (
              <div className="w-full h-full flex items-center justify-center">
                <embed
                  src={bookDetail.pdfUrl}
                  type="application/pdf"
                  className="w-full h-full rounded-lg shadow-xl"
                  style={{
                    width: '100%',
                    height: '100%',
                    maxWidth: '100%',
                    maxHeight: '100%'
                  }}
                />
              </div>
            ) : (
              /* 没有PDF时的模拟内容 */
              <div className="w-full h-full flex flex-col items-center justify-center text-center p-8">
                <div className={`w-24 h-32 rounded-lg bg-gradient-to-br ${bookDetail.coverColor} flex items-center justify-center mb-6 shadow-xl`}>
                  <BookOpen className="w-12 h-12 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">{bookDetail.title}</h2>
                <p className="text-slate-400 mb-4">{bookDetail.author}</p>
                <p className="text-sm text-slate-500">第 {currentPage} 页 / 共 {bookDetail.pdfPages} 页</p>
              </div>
            )}
          </div>
        </div>

        {/* 分隔线 */}
        <div className="w-1 bg-gradient-to-b from-transparent via-indigo-500/50 to-transparent"></div>

        {/* 右边1列：AI助手区域 - 占25% */}
        <div className="flex-[1] flex flex-col bg-slate-900 h-full overflow-hidden border-l border-slate-700">
          {/* AI助手标题栏 */}
          <div className="px-4 py-3 bg-gradient-to-r from-indigo-600/20 to-purple-600/20 border-b border-indigo-500/30 flex-shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">AI 助手</h3>
                <p className="text-xs text-indigo-300">基于《什么是权力》内容</p>
              </div>
            </div>
          </div>
          {/* 标签页 */}
          <div className="flex border-b border-gray-200 flex-shrink-0">
            <button
              onClick={() => setActiveTab('chat')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === 'chat'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <MessageSquare className="w-4 h-4 inline mr-1.5" />
              AI对话
            </button>
            <button
              onClick={() => setActiveTab('reviews')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === 'reviews'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <MessageCircle className="w-4 h-4 inline mr-1.5" />
              评价
            </button>
            <button
              onClick={() => setActiveTab('bookmark')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === 'bookmark'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Bookmark className="w-4 h-4 inline mr-1.5" />
              我的收藏
            </button>
          </div>

          {/* Tab 切换 */}
          <div className="flex border-b border-slate-700 flex-shrink-0">
            <button
              onClick={() => setActiveTab('chat')}
              className={`flex-1 px-3 py-2.5 text-xs font-medium transition-colors border-b-2 ${
                activeTab === 'chat'
                  ? 'text-indigo-400 border-indigo-500 bg-indigo-500/10'
                  : 'text-slate-400 border-transparent hover:text-slate-300'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5 inline mr-1" />
              对话
            </button>
            <button
              onClick={() => setActiveTab('bookmark')}
              className={`flex-1 px-3 py-2.5 text-xs font-medium transition-colors border-b-2 ${
                activeTab === 'bookmark'
                  ? 'text-indigo-400 border-indigo-500 bg-indigo-500/10'
                  : 'text-slate-400 border-transparent hover:text-slate-300'
              }`}
            >
              <Bookmark className="w-3.5 h-3.5 inline mr-1" />
              我的收藏
            </button>
            <button
              onClick={() => setActiveTab('notes')}
              className={`flex-1 px-3 py-2.5 text-xs font-medium transition-colors border-b-2 ${
                activeTab === 'notes'
                  ? 'text-indigo-400 border-indigo-500 bg-indigo-500/10'
                  : 'text-slate-400 border-transparent hover:text-slate-300'
              }`}
            >
              <FileText className="w-3.5 h-3.5 inline mr-1" />
              我的笔记
            </button>
          </div>

          {/* 对话内容区域 - 可滚动 */}
          {activeTab === 'chat' && (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div
                ref={chatContainerRef}
                className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth"
              >
                {chatMessages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
                  >
                    {/* 头像 */}
                    {message.role === 'assistant' ? (
                      <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                        <Sparkles className="w-3.5 h-3.5 text-white" />
                      </div>
                    ) : (
                      <div className="w-7 h-7 rounded-lg bg-slate-700 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-medium text-slate-300">我</span>
                      </div>
                    )}

                    {/* 消息内容 */}
                    <div className={`max-w-[85%] ${message.role === 'user' ? 'text-right' : ''}`}>
                      <div
                        className={`inline-block px-3 py-2 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap ${
                          message.role === 'user'
                            ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-tr-sm'
                            : 'bg-slate-800 text-slate-200 rounded-tl-sm border border-slate-700'
                        }`}
                      >
                        {message.content}
                      </div>

                      {/* 操作按钮 - 仅AI消息显示 */}
                      {message.role === 'assistant' && (
                        <div className="flex items-center gap-1 mt-1.5 justify-start">
                          <span className="text-[10px] text-slate-500">{message.timestamp}</span>
                          <div className="w-px h-3 bg-slate-700 mx-1"></div>
                          <button
                            onClick={() => handleBookmark(message.id)}
                            className={`p-1 rounded transition-colors ${
                              message.isBookmarked
                                ? 'text-amber-500 bg-amber-500/10'
                                : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
                            }`}
                            title={message.isBookmarked ? '取消收藏' : '收藏到阅读文件夹'}
                          >
                            <Bookmark
                              className="w-3 h-3"
                              fill={message.isBookmarked ? 'currentColor' : 'none'}
                            />
                          </button>
                          <button
                            onClick={() => handleCopy(message.content)}
                            className="p-1 rounded text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors"
                            title="转为笔记"
                          >
                            <FileText className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleCopy(message.content)}
                            className="p-1 rounded text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors"
                            title="复制内容"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* 输入框 - 固定在底部 */}
              <div className="p-3 bg-slate-900 border-t border-slate-700 flex-shrink-0">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="输入问题，与AI讨论这本书..."
                    className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim()}
                    className="px-3 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-500 hover:to-purple-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-[10px] text-slate-500 mt-1.5 text-center">
                  基于飞书扣子智能体 · AI对话内容可一键收藏到阅读文件夹
                </p>
              </div>
            </div>
          )}

          {/* 收藏列表 */}
          {activeTab === 'bookmark' && (
            <div className="flex-1 overflow-y-auto p-4">
              <div className="text-center py-12">
                <Bookmark className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                <p className="text-sm text-slate-500">还没有收藏内容</p>
                <p className="text-xs text-slate-600 mt-1">
                  在AI对话中点击收藏按钮即可保存
                </p>
              </div>
            </div>
          )}

          {/* 笔记列表 */}
          {activeTab === 'notes' && (
            <div className="flex-1 overflow-y-auto p-4">
              <div className="text-center py-12">
                <FileText className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                <p className="text-sm text-slate-500">还没有笔记</p>
                <p className="text-xs text-slate-600 mt-1">
                  在AI对话中点击转为笔记即可创建
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Reader End Bar + Unified Footer */}
      <div className="h-10 bg-black border-t border-white/10 flex items-center justify-center text-[12px] text-white/60">
        — 阅读结束 —
      </div>
      <Footer />
    </div>
  );
}
