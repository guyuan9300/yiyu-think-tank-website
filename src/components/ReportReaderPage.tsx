import { useState, useRef, useEffect } from 'react';
import { Header } from './Header';
import { Footer } from './Footer';
import { CommentSection } from './CommentSection';
import { getReports, saveReport, type Report } from '../lib/dataService';
import {
  FileText,
  MessageSquare,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Maximize,
  Sparkles,
  Send,
  Copy,
  MessageCircle,
  Download,
  X,
  Crown,
  CheckCircle,
  ThumbsUp,
  Share2,
} from 'lucide-react';
import type { User } from '../lib/dataService';

interface ReportReaderPageProps {
  reportId: string;
}

export function ReportReaderPage({ reportId }: ReportReaderPageProps) {
  const [report, setReport] = useState<Report | null>(null);
  const [loadState, setLoadState] = useState<'loading' | 'loaded' | 'not_found'>('loading');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(50);
  // NOTE: "智能助手"功能已移除（详情页仅保留阅读区）。
  const [activeTab, setActiveTab] = useState<'chat' | 'favorites' | 'feedback' | 'comments'>('chat');
  const [chatMessages, setChatMessages] = useState<{id: string; role: 'user' | 'assistant'; content: string; timestamp: string; isBookmarked?: boolean}[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [favorites, setFavorites] = useState<{id: string; content: string; timestamp: string}[]>([]);
  const [feedback, setFeedback] = useState('');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [downloadFeedback, setDownloadFeedback] = useState<string | null>(null);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const bookInfoRef = useRef<HTMLDivElement>(null);
  const [contentHeightPx, setContentHeightPx] = useState<number>(() => {
    // SSR-safe init (though this app is client-side) + clamp to avoid zoom collapsing the reader.
    const h = typeof window !== 'undefined' ? window.innerHeight : 900;
    return Math.max(1040, h - 280);
  });
  const [isMobile, setIsMobile] = useState(false);

  // 加载报告数据
  useEffect(() => {
    const loadReport = () => {
      setLoadState('loading');
      const reports = getReports();
      const foundReport = reports.find(r => r.id === reportId);

      if (foundReport) {
        setReport(foundReport);
        setTotalPages(foundReport.pages || 50);
        setLoadState('loaded');
      } else {
        setReport(null);
        setLoadState('not_found');
        console.warn('Report not found:', { reportId, available: reports.map(r => r.id) });
      }
    };

    loadReport();

    const handleDataChange = () => loadReport();
    window.addEventListener('yiyu_data_change', handleDataChange);
    window.addEventListener('storage', handleDataChange);

    return () => {
      window.removeEventListener('yiyu_data_change', handleDataChange);
      window.removeEventListener('storage', handleDataChange);
    };
  }, [reportId]);

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
      // On mobile we avoid fixed-height containers (let it flow).
      // On desktop clamp the reader area so zoom-in won't collapse it.
      setContentHeightPx(mobile ? -1 : Math.max(520, window.innerHeight - 280));
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

  // 处理下载点击（vBuild-1.0：先保证“下载报告”有真实落点 + 可验证闭环）
  const handleDownloadClick = () => {
    if (!report) return;

    // Guard: only paid members can download reports in vBuild-1.0.
    // This avoids "button does nothing" for non-members and prevents accidental download counter bumps.
    if (!hasPaidMembership()) {
      setDownloadFeedback('需要开通会员后才可下载报告');
      window.setTimeout(() => setDownloadFeedback(null), 3500);
      return;
    }

    if (!report.fileUrl) {
      setDownloadFeedback('PDF 文件暂未上传，无法下载');
      window.setTimeout(() => setDownloadFeedback(null), 3500);
      return;
    }

    // 1) backstage action: bump downloads counter (localStorage)
    try {
      const next = (report.downloads ?? 0) + 1;
      // optimistic UI update (Playwright will assert visible bump)
      setReport({ ...report, downloads: next });
      saveReport({ id: report.id, downloads: next });
    } catch (e) {
      console.warn('Failed to bump downloads counter', e);
    }

    // 2) front visible change: open PDF in a new tab
    const url = new URL(report.fileUrl, window.location.origin).toString();

    // Use a tiny proxy HTML to guarantee a real network request to the .pdf in the popup
    // (headless Chromium sometimes keeps the popup URL as ":"/about:blank when opening a PDF directly).
    const proxy = new URL('/download-proxy.html', window.location.origin);
    proxy.searchParams.set('src', url);

    const w = window.open(proxy.toString(), '_blank');
    if (!w) {
      // Fallback: navigate in current tab
      window.location.href = url;
    }

    setDownloadFeedback('已在新标签页打开 PDF');
    window.setTimeout(() => setDownloadFeedback(null), 3500);
  };

  // 翻页控制
  const handlePageChange = (direction: 'prev' | 'next') => {
    if (direction === 'prev' && currentPage > 1) {
      setCurrentPage(prev => prev - 1);
    } else if (direction === 'next' && currentPage < totalPages) {
      setCurrentPage(prev => prev + 1);
    }
  };

  // 发送消息
  const handleSendMessage = () => {
    if (!newMessage.trim()) return;

    const userMessage = {
      id: Date.now().toString(),
      role: 'user' as const,
      content: newMessage,
      timestamp: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
      isBookmarked: false
    };

    setChatMessages(prev => [...prev, userMessage]);
    setNewMessage('');

    setTimeout(() => {
      const aiMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant' as const,
        content: `这是一个模拟的AI回复。在实际应用中，这里会连接到飞书扣子智能体或其他AI服务来生成回答。

根据"${report?.title}"的内容，我可以为您提供更深入的分析。`,
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
      const newFavorite = {
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
        const headerHeight = 64;
        const bookInfoHeight = bookInfoRef.current.offsetHeight;
        const desired = window.innerHeight - (headerHeight + bookInfoHeight);
        setContentHeightPx(Math.max(1040, desired));
      }
    };

    calculateContentHeight();
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

  if (!report) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header isLoggedIn={isLoggedIn} userType={isLoggedIn ? 'member' : 'visitor'} />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center max-w-md px-6">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            {loadState === 'loading' && <p className="text-gray-500">报告加载中...</p>}
            {loadState === 'not_found' && (
              <>
                <p className="text-gray-700 font-medium mb-2">未找到该报告</p>
                <p className="text-gray-500 text-sm mb-6 break-all">reportId: {reportId}</p>
                <button
                  className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors"
                  onClick={() => {
                    const params = new URLSearchParams(window.location.search);
                    params.set('page', 'report-library');
                    params.delete('id');
                    window.location.href = `${window.location.pathname}?${params.toString()}`;
                  }}
                >
                  返回报告库
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header isLoggedIn={isLoggedIn} userType={isLoggedIn ? 'member' : 'visitor'} />

      {/* 报告信息头部 */}
      <div ref={bookInfoRef} className="bg-white border-b border-gray-200 pt-16">
        <div className="max-w-4xl mx-auto px-6 py-8">
          {/* 面包屑 */}
          <div className="flex items-center gap-2 mb-4 text-[13px] text-gray-500">
            <button
              type="button"
              onClick={() => {
                const params = new URLSearchParams(window.location.search);
                params.set('page', 'report-library');
                params.delete('id');
                window.location.href = `${window.location.pathname}?${params.toString()}`;
              }}
              className="hover:text-gray-900 transition-colors"
            >
              报告库
            </button>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-gray-900">详情</span>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            {report.title}
          </h1>

          <div className="flex flex-wrap items-center gap-6 mb-6">
            <span className="text-gray-600">机构：{report.publisher || '益语智库'}</span>
            <span className="text-gray-400">|</span>
            <span className="text-gray-600">主题：{(report.topics || []).join(' / ') || '—'}</span>
            <span className="text-gray-400">|</span>
            <span className="text-gray-600">页数：{report.pages || totalPages}页</span>
            <span className="text-gray-400">|</span>
            <span className="text-gray-600">下载：{(report.downloads ?? 0).toLocaleString()} 次下载</span>
            <span className="text-gray-400">|</span>
            <span className="text-gray-600">发布时间：{report.publishDate}</span>
          </div>

          <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-6">
            <p className="text-lg text-gray-700 italic mb-4">
              "{report.summary}"
            </p>
            <div className="flex flex-wrap gap-2">
              {(report.topics || []).map((topic: string, index: number) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-white rounded-full text-sm text-gray-600 shadow-sm"
                >
                  #{topic}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 内容区域 */}
      <div className="px-4 sm:px-6 lg:px-8 pb-10">
        {/* PDF阅读区域（四四方方的框，max-w-4xl） */}
        <div
          className="max-w-4xl mx-auto w-full bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col"
          style={isMobile ? undefined : { height: `${contentHeightPx}px`, minHeight: '720px' }}
        >
          {/* PDF工具条 */}
          <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePageChange('prev')}
                  disabled={currentPage === 1}
                  className="p-2 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="text-sm text-gray-600 min-w-[80px] text-center">
                  {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => handlePageChange('next')}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>

              <div className="w-px h-6 bg-gray-300"></div>

              <button
                className="p-2 rounded-lg hover:bg-gray-200 transition-colors"
                title="页面适配"
              >
                <Maximize className="w-5 h-5" />
              </button>

              <button
                onClick={handleDownloadClick}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg hover:from-amber-600 hover:to-orange-600 transition-all shadow-sm"
              >
                <Download className="w-4 h-4" />
                <span className="text-sm font-medium">下载报告</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">
                滚动滑轮可翻页
              </span>
            </div>
          </div>

          {/* PDF查看器 */}
          <div className={isMobile ? "w-full bg-white" : "flex-1 min-h-0 w-full bg-white"}>
            {report.fileUrl ? (
              isMobile ? (
                <div className="p-6">
                  <p className="text-sm text-gray-600 mb-4">
                    手机端为避免 PDF 预览组件拦截手势（导致无法下滑），这里改为使用系统自带的 PDF 查看器打开。
                  </p>
                  <a
                    href={report.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    <span className="text-sm font-medium">打开 PDF 阅读/下载</span>
                  </a>
                </div>
              ) : (
                <object
                  data={`${report.fileUrl}#view=FitH`}
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
                <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">PDF文件暂未上传</p>
                <p className="text-sm text-gray-400 mt-2">请在后台管理中上传PDF文件</p>
              </div>
            )}
          </div>

          {/* Reader bottom bar (inside frame) */}
          <div className="h-10 bg-gray-50 border-t border-gray-200 flex items-center justify-center text-[12px] text-gray-500">
            —
          </div>
        </div>
      </div>

      {/* Action Bar + Comment Section (under reader) */}
      {report && (
        <div className="px-4 sm:px-6 lg:px-8 pb-16">
          <div className="max-w-4xl mx-auto">
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={() => setIsLiked(!isLiked)}
                  className={`flex items-center gap-2.5 px-5 py-2.5 rounded-2xl transition-all duration-200 ${
                    isLiked ? 'bg-green-600 text-white' : 'bg-gray-100 hover:bg-gray-200'
                  }`}
                >
                  <ThumbsUp className="w-5 h-5" />
                  <span className="font-medium">点赞</span>
                </button>

                <button
                  onClick={() => setIsBookmarked(!isBookmarked)}
                  className={`flex items-center gap-2.5 px-5 py-2.5 rounded-2xl transition-all duration-200 ${
                    isBookmarked ? 'bg-green-600 text-white' : 'bg-gray-100 hover:bg-gray-200'
                  }`}
                >
                  <Bookmark className={`w-5 h-5 ${isBookmarked ? 'fill-current' : ''}`} />
                  <span className="font-medium">{isBookmarked ? '已收藏' : '收藏'}</span>
                </button>

                <button
                  onClick={async () => {
                    const shareUrl = window.location.href;
                    try {
                      await navigator.clipboard.writeText(shareUrl);
                      alert('已复制链接，可粘贴到微信/朋友圈');
                    } catch {
                      window.prompt('复制下面链接分享到微信/朋友圈：', shareUrl);
                    }
                  }}
                  className="flex items-center gap-2.5 px-5 py-2.5 rounded-2xl bg-gray-100 hover:bg-gray-200 transition-all duration-200"
                >
                  <Share2 className="w-5 h-5" />
                  <span className="font-medium">分享到朋友圈</span>
                </button>
              </div>
            </div>

            <div className="mt-10">
              <CommentSection
                contentId={reportId}
                contentType="report"
                contentTitle={report.title}
                isLoggedIn={isLoggedIn}
                userName={currentUser?.nickname || '访客'}
              />
            </div>
          </div>
        </div>
      )}

      <Footer />

      {/* 升级会员弹窗 */}
      {showUpgradeModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
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

            <div className="p-6">
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

              <div className="space-y-3">
                {isLoggedIn ? (
                  <>
                    <button
                      className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-medium hover:from-amber-600 hover:to-orange-600 transition-all flex items-center justify-center gap-2"
                      onClick={() => {
                        setShowUpgradeModal(false);
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
                        window.location.href = '?page=register';
                      }}
                    >
                      免费注册
                    </button>
                    <button
                      className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-medium hover:from-amber-600 hover:to-orange-600 transition-all flex items-center justify-center gap-2"
                      onClick={() => {
                        setShowUpgradeModal(false);
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
