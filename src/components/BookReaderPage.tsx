import { useState, useRef, useEffect } from 'react';
import { Header } from './Header';
import { CommentSection } from './CommentSection';
import {
  BookOpen,
  MessageSquare,
  Bookmark,
  Star,
  Clock,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize,
  Columns,
  Sparkles,
  Send,
  Copy,
  MessageCircle,
  Download,
  Lock,
  X,
  Crown,
  CheckCircle,
} from 'lucide-react';
import type { User } from '../lib/dataService';

// 书籍详情接口
interface BookDetail {
  id: string;
  title: string;
  author: string;
  subject: string;
  duration: string;
  guide: string;
  takeaways: string[];
  pdfUrl?: string;
  coverColor?: string;
}

// AI对话消息接口
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  isBookmarked?: boolean;
}

// 收藏内容接口
interface FavoriteItem {
  id: string;
  content: string;
  timestamp: string;
}

interface BookReaderPageProps {
  bookId?: string;
  onNavigate?: (page: string) => void;
}

export function BookReaderPage({ bookId: initialBookId = 'shimeshiquanli', onNavigate }: BookReaderPageProps) {
  // 从URL参数或全局状态获取书籍信息
  const [bookId, setBookId] = useState<string>(initialBookId);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(328);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [activeTab, setActiveTab] = useState<'chat' | 'favorites' | 'feedback' | 'comments'>('chat');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content: `您好！我是您的智能阅读助手。关于《什么是权力》，我可以帮您：

• 提炼核心观点与洞见
• 解答政治权力相关问题
• 梳理章节脉络与逻辑

请问有什么想了解的？`,
      timestamp: '10:30',
      isBookmarked: false
    }
  ]);
  const [newMessage, setNewMessage] = useState('');
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [feedback, setFeedback] = useState('');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const bookInfoRef = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState('calc(100vh - 280px)');
  const [isMobile, setIsMobile] = useState(false);

  // 监听用户登录状态
  useEffect(() => {
    const checkUserStatus = () => {
      const userStr = (localStorage.getItem('yiyu_current_user') ?? sessionStorage.getItem('yiyu_current_user'));
      if (userStr) {
        try {
          const user = JSON.parse(userStr);
          setCurrentUser(user);
          setIsLoggedIn(true);
        } catch (e) {
          setCurrentUser(null);
          setIsLoggedIn(false);
        }
      } else {
        setCurrentUser(null);
        setIsLoggedIn(false);
      }
    };

    checkUserStatus();
    window.addEventListener('yiyu_user_updated', checkUserStatus);
    window.addEventListener('storage', checkUserStatus);

    return () => {
      window.removeEventListener('yiyu_user_updated', checkUserStatus);
      window.removeEventListener('storage', checkUserStatus);
    };
  }, []);

  // Mobile layout: avoid embedding PDF <object> (often blocks touch scrolling in WebView)
  // and avoid fixed-height containers that can make the page feel "stuck".
  useEffect(() => {
    const apply = () => {
      const mobile = window.matchMedia('(max-width: 768px)').matches;
      setIsMobile(mobile);
      setContentHeight(mobile ? 'auto' : 'calc(100vh - 280px)');
    };
    apply();
    window.addEventListener('resize', apply);
    return () => window.removeEventListener('resize', apply);
  }, []);

  // 检查用户是否有付费会员资格
  const hasPaidMembership = () => {
    if (!currentUser) return false;
    return currentUser.memberType === 'gold' || currentUser.memberType === 'diamond';
  };

  // 处理下载点击
  const handleDownloadClick = () => {
    if (!isLoggedIn) {
      // 未登录用户
      setShowUpgradeModal(true);
    } else if (!hasPaidMembership()) {
      // 已登录但非付费会员
      setShowUpgradeModal(true);
    } else {
      // 付费会员，执行下载
      handleDownload();
    }
  };

  // 执行下载
  const handleDownload = () => {
    if (book.pdfUrl) {
      // 实际项目中，这里会调用真实的下载API
      alert(`开始下载《${book.title}》PDF文件...\n\n文件: ${book.pdfUrl}`);
      // 模拟下载完成
      console.log('PDF下载成功:', book.pdfUrl);
    } else {
      alert('PDF文件暂未上传，无法下载');
    }
  };

  // 书籍数据（后期从后台管理接入）
  const booksDatabase: Record<string, BookDetail> = {
    'shimeshiquanli': {
      id: 'shimeshiquanli',
      title: '什么是权力',
      author: '李筠',
      subject: '政治学通识',
      duration: '60 min',
      guide: '政治不是遥远的宏大叙事，而是发生在我们身边的真实关系。',
      takeaways: [
        '识别权力的三种来源',
        '理解权力如何运作',
        '形成现实判断框架'
      ],
      pdfUrl: `${import.meta.env.BASE_URL}what-is-power.pdf`,
      coverColor: 'from-blue-600 to-indigo-800'
    }
  };

  const book = booksDatabase[bookId] || booksDatabase['shimeshiquanli'];

  // 翻页控制
  const handlePageChange = (direction: 'prev' | 'next') => {
    if (direction === 'prev' && currentPage > 1) {
      setCurrentPage(prev => prev - 1);
    } else if (direction === 'next' && currentPage < totalPages) {
      setCurrentPage(prev => prev + 1);
    }
  };

  // 缩放控制
  const handleZoom = (action: 'in' | 'out' | 'fit') => {
    if (action === 'in' && zoomLevel < 200) {
      setZoomLevel(prev => prev + 25);
    } else if (action === 'out' && zoomLevel > 50) {
      setZoomLevel(prev => prev - 25);
    } else if (action === 'fit') {
      setZoomLevel(100);
    }
  };

  // 发送消息
  const handleSendMessage = () => {
    if (!newMessage.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: newMessage,
      timestamp: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
      isBookmarked: false
    };

    setChatMessages(prev => [...prev, userMessage]);
    setNewMessage('');

    // 模拟AI回复
    setTimeout(() => {
      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `这是一个模拟的AI回复。在实际应用中，这里会连接到飞书扣子智能体或其他AI服务来生成回答。

根据《${book.title}》的内容，我可以为您提供更深入的分析。`,
        timestamp: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
        isBookmarked: false
      };
      setChatMessages(prev => [...prev, aiMessage]);
    }, 1000);
  };

  // 收藏消息
  const handleBookmark = (messageId: string) => {
    const message = chatMessages.find(m => m.id === messageId);
    if (message && !message.isBookmarked) {
      const newFavorite: FavoriteItem = {
        id: messageId,
        content: message.content,
        timestamp: message.timestamp
      };
      setFavorites(prev => [...prev, newFavorite]);

      setChatMessages(prev =>
        prev.map(msg =>
          msg.id === messageId ? { ...msg, isBookmarked: true } : msg
        )
      );
    }
  };

  // 复制内容
  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content);
  };

  // 提交反馈
  const handleSubmitFeedback = () => {
    if (feedback.trim()) {
      alert('感谢您的反馈！');
      setFeedback('');
    }
  };

  // 动态计算内容区域高度
  useEffect(() => {
    const calculateContentHeight = () => {
      if (bookInfoRef.current) {
        const headerHeight = 64; // Header高度
        const bookInfoHeight = bookInfoRef.current.offsetHeight;
        const calculatedHeight = `calc(100vh - ${headerHeight + bookInfoHeight}px)`;
        setContentHeight(calculatedHeight);
        console.log('📐 动态计算高度:', calculatedHeight);
      }
    };
    
    calculateContentHeight();
    
    // 延迟计算确保DOM渲染完成
    const timer = setTimeout(calculateContentHeight, 100);
    
    window.addEventListener('resize', calculateContentHeight);
    window.addEventListener('load', calculateContentHeight);
    
    return () => {
      window.removeEventListener('resize', calculateContentHeight);
      window.removeEventListener('load', calculateContentHeight);
      clearTimeout(timer);
    };
  }, []);

  // 滚动到底部
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header isLoggedIn={true} userType="member" onNavigate={onNavigate} />

      {/* 书籍信息头部 - 优化为紧凑布局 */}
      <div ref={bookInfoRef} className="bg-white border-b border-gray-200 pt-16">
        <div className="max-w-[1600px] mx-auto px-6 py-4">
          {/* 第1行：书名、作者信息、下载按钮 */}
          <div className="flex items-center justify-between gap-6 mb-3">
            <div className="flex items-center gap-6 flex-1">
              <h1 className="text-2xl font-bold text-gray-900">
                {book.title}
              </h1>
              <div className="flex items-center gap-4 text-sm">
                <span className="text-gray-600">作者：{book.author}</span>
                <span className="text-gray-300">|</span>
                <span className="text-gray-600">主题：{book.subject}</span>
                <span className="text-gray-300">|</span>
                <span className="text-gray-600">时长：{book.duration}</span>
              </div>
            </div>
            
            {/* 下载按钮移到标题行 */}
            <button
              onClick={handleDownloadClick}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg hover:from-amber-600 hover:to-orange-600 transition-all shadow-sm flex-shrink-0"
            >
              <Download className="w-4 h-4" />
              <span className="text-sm font-medium">下载PDF</span>
            </button>
          </div>

          {/* 第2行：导读与收获 - 更紧凑 */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4">
            <p className="text-sm text-gray-700 italic mb-3">
              "{book.guide}"
            </p>
            <div className="flex flex-wrap gap-2">
              {book.takeaways.map((takeaway, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 bg-white rounded-full px-3 py-1 shadow-sm"
                >
                  <span className="text-xs font-medium text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">
                    带走
                  </span>
                  <span className="text-xs text-gray-700">{takeaway}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 内容区域 */}
      <div className={isMobile ? "flex flex-col" : "flex"} style={isMobile ? undefined : { height: contentHeight }}>
        {/* PDF阅读区域 */}
        <div className={isMobile ? "w-full flex flex-col bg-white" : "flex-1 flex flex-col border-r border-gray-200 bg-white min-w-0"}>
          {/* PDF工具条 - 精简版 */}
          <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-200">
            <div className="flex items-center gap-4">
              {/* 翻页控制 */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePageChange('prev')}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm text-gray-600 min-w-[80px] text-center">
                  {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => handlePageChange('next')}
                  disabled={currentPage === totalPages}
                  className="p-1.5 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <div className="w-px h-5 bg-gray-300"></div>

              {/* 适配控制 */}
              <button
                className="p-1.5 rounded-lg hover:bg-gray-200 transition-colors"
                title="页面适配"
                onClick={() => handleZoom('fit')}
              >
                <Maximize className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">
                滚动滑轮可翻页
              </span>
            </div>
          </div>

          {/* PDF查看器 */}
          <div className={isMobile ? "w-full bg-white" : "flex-1 min-h-0 w-full bg-white"}>
            {book.pdfUrl ? (
              isMobile ? (
                <div className="p-6">
                  <p className="text-sm text-gray-600 mb-4">
                    手机端为避免 PDF 预览组件拦截手势（导致无法下滑），这里改为使用系统自带的 PDF 查看器打开。
                  </p>
                  <a
                    href={book.pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    <span className="text-sm font-medium">打开 PDF 阅读/下载</span>
                  </a>
                </div>
              ) : (
                <object
                  data={`${book.pdfUrl}#view=FitH`}
                  type="application/pdf"
                  className="w-full h-full"
                  style={{ width: '100%', height: '100%', display: 'block' }}
                >
                  <div className="flex items-center justify-center h-full">
                    <p className="text-gray-500">PDF加载失败，请尝试使用其他浏览器</p>
                  </div>
                </object>
              )
            ) : (
              <div className="text-center py-12">
                <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">PDF文件暂未上传</p>
              </div>
            )}
          </div>
        </div>

        {/* AI助手区域 */}
        <div className={isMobile ? "w-full flex flex-col bg-white" : "w-[400px] flex flex-col bg-white flex-shrink-0"}>
          {/* AI顶部导航 */}
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('chat')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === 'chat'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              对话
            </button>
            <button
              onClick={() => setActiveTab('favorites')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === 'favorites'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Bookmark className="w-4 h-4" />
              收藏
            </button>
            <button
              onClick={() => setActiveTab('feedback')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === 'feedback'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <MessageCircle className="w-4 h-4" />
              留言
            </button>
            <button
              onClick={() => setActiveTab('comments')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === 'comments'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              评论
            </button>
          </div>

          {/* AI内容区域 */}
          <div className="flex-1 overflow-hidden">
            {/* 对话面板 */}
            {activeTab === 'chat' && (
              <div className="h-full flex flex-col">
                {/* AI简介 */}
                <div className="px-4 py-3 bg-blue-50 border-b border-blue-100 flex-shrink-0">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                      <Sparkles className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-blue-900">智能阅读助手</p>
                      <p className="text-xs text-blue-700">基于《{book.title}》内容训练</p>
                    </div>
                  </div>
                </div>

                {/* 消息列表 */}
                <div
                  ref={chatContainerRef}
                  className="flex-1 overflow-auto p-4 space-y-4"
                >
                  {chatMessages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
                    >
                      {message.role === 'assistant' && (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
                          <Sparkles className="w-4 h-4 text-white" />
                        </div>
                      )}
                      {message.role === 'user' && (
                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                          <span className="text-sm font-medium text-gray-600">我</span>
                        </div>
                      )}

                      <div className={`max-w-[75%] ${message.role === 'user' ? 'text-right' : ''}`}>
                        <div
                          className={`inline-block px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                            message.role === 'user'
                              ? 'bg-blue-600 text-white rounded-tr-md'
                              : 'bg-gray-100 text-gray-800 rounded-tl-md'
                          }`}
                        >
                          {message.content}
                        </div>

                        {/* 操作按钮 */}
                        {message.role === 'assistant' && (
                          <div className="flex items-center gap-2 mt-1.5 justify-start">
                            <span className="text-xs text-gray-400">{message.timestamp}</span>
                            <button
                              onClick={() => handleBookmark(message.id)}
                              className={`p-1 rounded hover:bg-gray-200 transition-colors ${
                                message.isBookmarked ? 'text-blue-600' : 'text-gray-400'
                              }`}
                              title={message.isBookmarked ? '已收藏' : '收藏'}
>
                              <Bookmark
                                className="w-3.5 h-3.5"
                                fill={message.isBookmarked ? 'currentColor' : 'none'}
                              />
                            </button>
                            <button
                              onClick={() => handleCopy(message.content)}
                              className="p-1 rounded hover:bg-gray-200 transition-colors text-gray-400"
                              title="复制"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* 输入框 */}
                <div className="p-4 border-t border-gray-200 flex-shrink-0">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                      placeholder="输入您的问题..."
                      className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    />
                    <button
                      onClick={handleSendMessage}
                      disabled={!newMessage.trim()}
                      className="px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-xs text-gray-400 mt-2 text-center">
                    基于飞书扣子智能体 · AI对话内容可一键收藏
                  </p>
                </div>
              </div>
            )}

            {/* 收藏面板 */}
            {activeTab === 'favorites' && (
              <div className="h-full overflow-auto p-4">
                {favorites.length === 0 ? (
                  <div className="text-center py-12">
                    <Bookmark className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">暂无收藏内容</p>
                    <p className="text-sm text-gray-400 mt-1">
                      对话中的重要信息可以收藏保存
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {favorites.map((item) => (
                      <div key={item.id} className="p-3 bg-gray-50 rounded-xl">
                        <p className="text-sm text-gray-700 mb-2">{item.content}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-400">{item.timestamp}</span>
                          <button
                            onClick={() => handleCopy(item.content)}
                            className="p-1 rounded hover:bg-gray-200 transition-colors text-gray-400"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 留言面板 */}
            {activeTab === 'feedback' && (
              <div className="h-full flex flex-col p-4">
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    您的反馈
                  </label>
                  <textarea
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    placeholder="请告诉我们您的建议或问题..."
                    className="w-full h-40 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm resize-none"
                  />
                </div>
                <button
                  onClick={handleSubmitFeedback}
                  disabled={!feedback.trim()}
                  className="w-full px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  提交反馈
                </button>
              </div>
            )}
            {/* 评论面板 */}
            {activeTab === 'comments' && (
              <div className="h-full overflow-auto">
                <CommentSection
                  contentId={bookId}
                  contentType="book"
                  contentTitle={book.title}
                  isLoggedIn={true}
                  userName="张三"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 升级会员弹窗 */}
      {showUpgradeModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
            {/* 弹窗头部 */}
            <div className="relative bg-gradient-to-r from-amber-500 to-orange-500 p-6 text-white">
              <button
                onClick={() => setShowUpgradeModal(false)}
                className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <Crown className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">
                    {isLoggedIn ? '升级为付费会员' : '登录后下载完整内容'}
                  </h3>
                  <p className="text-amber-100 text-sm">
                    {isLoggedIn ? '解锁所有PDF下载权限' : '注册登录即可享受会员权益'}
                  </p>
                </div>
              </div>
            </div>

            {/* 弹窗内容 */}
            <div className="p-6">
              {/* 会员权益 */}
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-700 mb-3">付费会员专享权益</h4>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-green-50 rounded-xl">
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                    <span className="text-sm text-gray-700">无限制下载所有PDF报告和书籍</span>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-green-50 rounded-xl">
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                    <span className="text-sm text-gray-700">享受黄金/钻石会员专属折扣</span>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-green-50 rounded-xl">
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                    <span className="text-sm text-gray-700">优先获取最新研究报告</span>
                  </div>
                </div>
              </div>

              {/* 按钮区域 */}
              <div className="space-y-3">
                {isLoggedIn ? (
                  <>
                    <button
                      className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-medium hover:from-amber-600 hover:to-orange-600 transition-all flex items-center justify-center gap-2"
                      onClick={() => {
                        setShowUpgradeModal(false);
                        // 跳转到会员升级页面
                        alert('跳转到会员升级页面...');
                      }}
                    >
                      <Crown className="w-5 h-5" />
                      立即升级会员
                    </button>
                    <button
                      onClick={() => setShowUpgradeModal(false)}
                      className="w-full py-3 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors text-sm"
                    >
                      暂时不用
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-medium hover:from-blue-700 hover:to-indigo-700 transition-all flex items-center justify-center gap-2"
                      onClick={() => {
                        setShowUpgradeModal(false);
                        // 跳转到注册页面
                        window.location.href = '?page=register';
                      }}
                    >
                      免费注册
                    </button>
                    <button
                      className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-medium hover:from-amber-600 hover:to-orange-600 transition-all flex items-center justify-center gap-2"
                      onClick={() => {
                        setShowUpgradeModal(false);
                        // 跳转到登录页面
                        window.location.href = '?page=login';
                      }}
                    >
                      已有账号，去登录
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
