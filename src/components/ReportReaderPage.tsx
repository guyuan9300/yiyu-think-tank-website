import { useState, useRef, useEffect, useMemo } from 'react';
import { Header } from './Header';
import { OpenSourceFooter } from './open-source-home/OpenSourceFooter';
import { SupportPoolDrawer } from './open-source-home/sections/SupportPoolProjects';
import { CommentSection } from './CommentSection';
import { getReports, saveReport, type Report } from '../lib/dataService';
import {
  FileText,
  Bookmark,
  ChevronRight,
  Sparkles,
  Send,
  Download,
  X,
  Crown,
  CheckCircle,
  ThumbsUp,
  Share2,
  Gift,
  Star,
  ChevronsRight,
} from 'lucide-react';
import type { User } from '../lib/dataService';

// 三种成为终身会员的途径(对齐 BooksShowcase)
type MemberPlanId = 'book_51' | 'book_org' | 'book_bundle';
const MEMBER_PLANS: { id: MemberPlanId; title: Bilingual; price: number; note?: Bilingual }[] = [
  { id: 'book_51', title: { zh: '创业者应该回答的 51 个问题', en: '51 Questions Every Founder Should Answer' }, price: 198 },
  { id: 'book_org', title: { zh: '学习型组织笔记', en: 'Notes on the Learning Organization' }, price: 138 },
  { id: 'book_bundle', title: { zh: '两本合购', en: 'Both Books Bundle' }, price: 286, note: { zh: '省 50 · 最划算', en: 'Save 50 · Best value' } },
];
import { extractToc, extractIntro, renderMarkdown, parseFrontmatter, markdownForAi } from '../lib/reportMarkdown';
import { askReportAI, type ChatMsg } from '../lib/reportChat';
import { getPdf, isIdbPdf, idbPdfId } from '../lib/reportPdfStore';
import { useContentEngagement } from '../hooks/useContentEngagement';
import { buildShareLandingUrl } from '../lib/shareLinks';
import { getYiyuPageAttrs } from '../lib/yiyuTongSiteMap';
import { getCurrentAccessUser, resolveReportAccess, isPaidMember, LIFETIME_MEMBER_TAGLINE } from '../lib/accessControl';
import { useLang, type Bilingual } from '../lib/i18n';

interface ReportReaderPageProps {
  reportId: string;
}

// 报告 AI 对话面板(可复用于右侧长驻栏 + 窄屏滑出抽屉)
interface ChatMessage { id: string; role: 'user' | 'assistant'; content: string; timestamp: string }
function ReportChat({ t, messages, newMessage, setNewMessage, onSend, loading, error, containerRef, locked, onUpgrade, onClose, onCollapse }: {
  t: (b: Bilingual) => string;
  messages: ChatMessage[];
  newMessage: string;
  setNewMessage: (v: string) => void;
  onSend: () => void;
  loading: boolean;
  error: string | null;
  containerRef: React.RefObject<HTMLDivElement>;
  locked: boolean;
  onUpgrade: () => void;
  onClose?: () => void;
  onCollapse?: () => void;
}): JSX.Element {
  const suggestions = [
    t({ zh: '这份报告的核心结论是什么？', en: 'What are the key conclusions?' }),
    t({ zh: '帮我总结最关键的几个数据', en: 'Summarize the most important figures' }),
    t({ zh: '报告指出哪些风险或局限？', en: 'What risks or limitations are noted?' }),
  ];
  return (
    <div className="flex h-full flex-col overflow-hidden bg-os-canvas">
      <div className="flex items-center justify-between gap-3 border-b border-os-line bg-os-paper px-4 py-3.5 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-os-violet to-os-indigo text-white shrink-0">
            <Sparkles className="h-[18px] w-[18px]" />
          </div>
          <div className="min-w-0">
            <div className="text-[14px] font-semibold text-os-navy truncate">{t({ zh: '跟 AI 聊聊这份报告', en: 'Chat with AI about this report' })}</div>
            <div className="text-[11.5px] text-os-muted truncate">{t({ zh: '基于报告内容回答 · 豆包大模型', en: 'Grounded on this report · Doubao' })}</div>
          </div>
        </div>
        {onCollapse && (
          <button onClick={onCollapse} title={t({ zh: '收起', en: 'Collapse' })} className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-[12px] text-os-muted hover:bg-os-mist hover:text-os-navy transition shrink-0">
            <ChevronsRight className="w-4 h-4" />{t({ zh: '收起', en: 'Hide' })}
          </button>
        )}
        {onClose && <button onClick={onClose} className="p-1.5 rounded-lg text-os-muted hover:bg-os-mist hover:text-os-navy transition shrink-0"><X className="w-4 h-4" /></button>}
      </div>

      {locked ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center px-6 gap-3.5">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-os-violet to-os-indigo text-white">
            <Crown className="h-5 w-5" />
          </div>
          <div className="font-serif-display text-[17px] font-semibold text-os-ink leading-snug">{t({ zh: '成为终身会员，与 AI 探讨这份报告', en: 'Become a member to chat with AI about this report' })}</div>
          <p className="text-[13px] text-os-muted leading-6">{t({ zh: '会员可就报告内容随时提问，AI 只依据报告内容作答。', en: 'Members can ask anything about the report; AI answers only from its content.' })}</p>
          <button onClick={onUpgrade} className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-os-navy to-os-indigo px-6 py-2.5 text-[13.5px] font-semibold text-white shadow-os hover:brightness-110 transition">
            <Crown className="w-4 h-4" />{t({ zh: '成为终身会员', en: 'Become a member' })}
          </button>
        </div>
      ) : (
        <>
          <div ref={containerRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {messages.length === 0 && (
              <div className="mt-1">
                <p className="text-[13px] text-os-muted leading-6 mb-3">{t({ zh: '问我关于这份报告的任何问题，我只依据报告内容回答。试试：', en: 'Ask me anything about this report. Try:' })}</p>
                <div className="space-y-2">
                  {suggestions.map((q) => (
                    <button key={q} onClick={() => setNewMessage(q)} className="block w-full text-left rounded-xl bg-os-paper ring-1 ring-os-line px-3.5 py-2.5 text-[13px] text-os-ink hover:ring-os-navy/40 hover:bg-os-mist/50 transition">{q}</button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m) => (
              <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {m.role === 'user' ? (
                  <div className="max-w-[88%] rounded-2xl px-3.5 py-2.5 text-[13.5px] leading-[1.7] whitespace-pre-wrap bg-os-navy text-white">{m.content}</div>
                ) : (
                  <div className="max-w-[92%] rounded-2xl px-3.5 py-2.5 bg-os-paper text-os-ink ring-1 ring-os-line">{renderMarkdown(m.content, { compact: true }).nodes}</div>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="rounded-2xl bg-os-paper ring-1 ring-os-line px-3.5 py-2.5 text-[13px] text-os-muted inline-flex items-center gap-2">
                  <span className="w-3.5 h-3.5 border-2 border-os-navy/20 border-t-os-navy rounded-full animate-spin" />
                  {t({ zh: '正在阅读报告并思考…', en: 'Reading the report…' })}
                </div>
              </div>
            )}
            {error && <div className="text-[12.5px] text-rose-600 px-1">{error}</div>}
          </div>
          <div className="border-t border-os-line bg-os-paper p-3 shrink-0">
            <div className="flex items-end gap-2">
              <textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend(); } }}
                rows={1}
                placeholder={t({ zh: '问问这份报告…（Enter 发送）', en: 'Ask about this report… (Enter)' })}
                className="flex-1 resize-none rounded-xl ring-1 ring-os-line bg-os-canvas px-3 py-2.5 text-[13.5px] text-os-ink focus:outline-none focus:ring-2 focus:ring-os-navy/30 max-h-32"
              />
              <button onClick={onSend} disabled={loading || !newMessage.trim()} className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-os-violet to-os-indigo text-white disabled:opacity-40 hover:brightness-110 transition">
                <Send className="w-[18px] h-[18px]" />
              </button>
            </div>
            <p className="mt-1.5 text-[11px] text-os-muted/70 px-1">{t({ zh: 'AI 仅依据本报告内容作答，可能有误，重要数据以原报告为准。', en: 'AI answers from this report only and may err.' })}</p>
          </div>
        </>
      )}
    </div>
  );
}

export function ReportReaderPage({ reportId }: ReportReaderPageProps) {
  const { t } = useLang();
  const [report, setReport] = useState<Report | null>(null);
  const [loadState, setLoadState] = useState<'loading' | 'loaded' | 'not_found'>('loading');
  // 「跟 AI 聊聊这份报告」对话记录
  const [chatMessages, setChatMessages] = useState<{ id: string; role: 'user' | 'assistant'; content: string; timestamp: string }[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const isVisitor = !isLoggedIn;
  const [showUpgradeModal, setShowUpgradeModal] = useState(false); // 由用户主动点「成为终身会员」触发, 不再自动盖屏
  const [showThanks, setShowThanks] = useState(false); // 彩蛋: "感谢你的喜欢, 送3篇文章" 小弹窗(UI占位, 后端额度待接)
  const [selectedPlan, setSelectedPlan] = useState<MemberPlanId>('book_bundle'); // 选中的购书途径(点击只选中, 不跳转)
  const [showSupportPool, setShowSupportPool] = useState(false); // "社会创新的支持者"就地盖一层(盖在支付弹窗上, 关掉即回支付)
  const [downloadFeedback, setDownloadFeedback] = useState<string | null>(null);
  // 报告解读 Markdown (来自 report.markdownContent 或 fetch report.markdownUrl)
  const [markdown, setMarkdown] = useState<string | null>(null);
  const [markdownState, setMarkdownState] = useState<'idle' | 'loading' | 'ready' | 'none'>('idle');
  const [showAiChat, setShowAiChat] = useState(false);
  // 右侧 AI 长驻栏 展开/收起 (记住偏好; 收起后正文变宽, 适合看宽表格)
  const [aiOpen, setAiOpen] = useState<boolean>(() => {
    try { return localStorage.getItem('yiyu_report_ai_open') !== 'false'; } catch { return true; }
  });
  const toggleAi = (v: boolean) => { setAiOpen(v); try { localStorage.setItem('yiyu_report_ai_open', String(v)); } catch { /* ignore */ } };
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const bookInfoRef = useRef<HTMLDivElement>(null);
  const { engagement, toggleLike, toggleFavorite } = useContentEngagement('report', reportId);

  // 加载报告数据
  useEffect(() => {
    const loadReport = () => {
      setLoadState('loading');
      const reports = getReports();
      const foundReport = reports.find(r => r.id === reportId);

      if (foundReport) {
        setReport(foundReport);
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

  // 加载报告解读 Markdown (content 优先, 否则 fetch markdownUrl)
  useEffect(() => {
    let cancelled = false;
    if (!report) { setMarkdown(null); setMarkdownState('idle'); return; }
    if (report.markdownContent && report.markdownContent.trim()) {
      setMarkdown(report.markdownContent);
      setMarkdownState('ready');
      return;
    }
    if (report.markdownUrl) {
      setMarkdownState('loading');
      fetch(report.markdownUrl)
        .then((r) => (r.ok ? r.text() : Promise.reject(new Error(`HTTP ${r.status}`))))
        .then((text) => { if (!cancelled) { setMarkdown(text); setMarkdownState('ready'); } })
        .catch(() => { if (!cancelled) { setMarkdown(null); setMarkdownState('none'); } });
      return () => { cancelled = true; };
    }
    setMarkdown(null);
    setMarkdownState('none');
  }, [report]);

  // 解析 Markdown → frontmatter / 简介 / 目录 / 正文
  const md = useMemo(() => {
    if (!markdown) return null;
    const { meta, body } = parseFrontmatter(markdown);
    return { meta, body, toc: extractToc(body), intro: extractIntro(meta, body) };
  }, [markdown]);

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

  // 付费档位 (统一口径: 未登录=locked / 登录未付费=preview 前20% / 付费=full)
  const reportAccess = resolveReportAccess(getCurrentAccessUser());
  const isPreview = reportAccess.tier === 'preview'; // 登录但未付费: 速览 + 目录 + 首节, 之后触发付费墙

  // 渲染正文 (memo: 避免 AI 聊天输入等无关 state 变化时重复解析大文档)
  // 试读档只渲染「开篇 + 第一个章节」(previewSections=1), 在章节边界整齐截断。
  const bodyNodes = useMemo(
    () => (md ? renderMarkdown(md.body, isPreview ? { previewSections: 1 } : {}).nodes : null),
    [md, isPreview],
  );

  // 检查用户是否有付费会员资格 (对齐 accessControl)
  const hasPaidMembership = () => isPaidMember(getCurrentAccessUser());

  const flashDownload = (msg: string) => {
    setDownloadFeedback(msg);
    window.setTimeout(() => setDownloadFeedback(null), 3500);
  };

  // 处理下载点击
  const handleDownloadClick = async () => {
    if (!report) return;

    // 仅付费会员可下载
    if (!hasPaidMembership()) {
      flashDownload(t({ zh: '需要开通会员后才可下载报告', en: 'Membership is required to download reports' }));
      return;
    }
    if (!report.fileUrl) {
      flashDownload(t({ zh: 'PDF 文件暂未上传，无法下载', en: 'The PDF has not been uploaded yet and cannot be downloaded' }));
      return;
    }

    // 下载计数 +1
    try {
      const next = (report.downloads ?? 0) + 1;
      setReport({ ...report, downloads: next });
      saveReport({ id: report.id, downloads: next });
    } catch (e) {
      console.warn('Failed to bump downloads counter', e);
    }

    // 情形 A: 本地 IndexedDB 附件 → 取 blob 生成对象 URL 下载
    if (isIdbPdf(report.fileUrl)) {
      try {
        const blob = await getPdf(idbPdfId(report.fileUrl));
        if (!blob) { flashDownload(t({ zh: 'PDF 附件未找到，请在后台重新上传', en: 'PDF attachment not found; please re-upload in admin' })); return; }
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${report.title || 'report'}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 10000);
        flashDownload(t({ zh: '已开始下载 PDF', en: 'PDF download started' }));
      } catch (e) {
        flashDownload(t({ zh: '下载失败：' + (e instanceof Error ? e.message : String(e)), en: 'Download failed' }));
      }
      return;
    }

    // 情形 B: 远程 URL/路径 → 经代理新标签页打开
    const url = new URL(report.fileUrl, window.location.origin).toString();
    const proxy = new URL('/download-proxy.html', window.location.origin);
    proxy.searchParams.set('src', url);
    const w = window.open(proxy.toString(), '_blank');
    if (!w) window.location.href = url;
    flashDownload(t({ zh: '已在新标签页打开 PDF', en: 'Opened the PDF in a new tab' }));
  };

  // 发送消息 → 调后台豆包大模型, 以报告 Markdown 为上下文
  const handleSendMessage = async () => {
    const question = newMessage.trim();
    if (!question || aiLoading) return;
    // 仅付费会员可与 AI 探讨; 非会员触发付费弹窗
    if (!hasPaidMembership()) {
      setShowUpgradeModal(true);
      return;
    }
    if (!markdown) {
      setAiError(t({ zh: '本报告暂无可供 AI 阅读的解读文档', en: 'No readable companion document for this report yet' }));
      return;
    }

    const ts = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    const history: ChatMsg[] = chatMessages.map((m) => ({ role: m.role, content: m.content }));
    setChatMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', content: question, timestamp: ts }]);
    setNewMessage('');
    setAiError(null);
    setAiLoading(true);

    try {
      const answer = await askReportAI({
        reportTitle: report?.title || '',
        context: markdownForAi(md?.body || markdown),
        history,
        question,
      });
      setChatMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: answer,
        timestamp: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
      }]);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setAiError(t({ zh: `AI 调用失败：${msg}`, en: `AI request failed: ${msg}` }));
    } finally {
      setAiLoading(false);
    }
  };

  // 滚动到底部
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages]);

  if (!report) {
    return (
      <div {...getYiyuPageAttrs('report')} className="min-h-screen bg-os-canvas">
        <Header isLoggedIn={isLoggedIn} userType={isLoggedIn ? 'member' : 'visitor'} />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center max-w-md px-6">
            <FileText className="w-12 h-12 text-os-line mx-auto mb-4" />
            {loadState === 'loading' && <p className="text-os-muted">{t({ zh: '报告加载中...', en: 'Loading report...' })}</p>}
            {loadState === 'not_found' && (
              <>
                <p className="text-os-ink font-medium mb-2">{t({ zh: '未找到该报告', en: 'Report not found' })}</p>
                <p className="text-os-muted text-sm mb-6 break-all">reportId: {reportId}</p>
                <button
                  className="px-5 py-2.5 rounded-full bg-gradient-to-r from-os-navy to-os-indigo text-white text-[14px] font-medium hover:brightness-110 transition shadow-os"
                  onClick={() => {
                    const params = new URLSearchParams(window.location.search);
                    params.set('page', 'report-library');
                    params.delete('id');
                    window.location.href = `${window.location.pathname}?${params.toString()}`;
                  }}
                >
                  {t({ zh: '返回报告库', en: 'Back to Report Library' })}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div {...getYiyuPageAttrs('report')} className="min-h-screen bg-os-canvas flex flex-col">
      <Header isLoggedIn={isLoggedIn} userType={isLoggedIn ? 'member' : 'visitor'} />

      {/* 报告信息头部 */}
      <div
        ref={bookInfoRef}
        data-yiyu-section="report-detail-hero"
        data-yiyu-section-type="hero"
        data-yiyu-section-title="报告详情头部"
        data-yiyu-section-order="1"
        data-yiyu-section-enterable="false"
        className={`bg-os-paper border-b border-os-line pt-16 ${isVisitor ? "blur-sm pointer-events-none select-none" : ""}`}
      >
        <div className="max-w-4xl mx-auto px-6 py-8">
          {/* 面包屑 */}
          <div className="flex items-center gap-2 mb-4 text-[13px] text-os-muted">
            <button
              type="button"
              onClick={() => {
                const params = new URLSearchParams(window.location.search);
                params.set('page', 'report-library');
                params.delete('id');
                window.location.href = `${window.location.pathname}?${params.toString()}`;
              }}
              className="hover:text-os-navy transition-colors"
            >
              {t({ zh: '报告库', en: 'Report Library' })}
            </button>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-os-navy">{t({ zh: '详情', en: 'Detail' })}</span>
          </div>
          <h1 className="font-serif-display text-[36px] sm:text-[44px] font-semibold tracking-tight text-os-ink mb-4">
            {report.title}
          </h1>

          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-6 text-[14px] text-os-muted">
            <span>{t({ zh: '发布时间：', en: 'Published: ' })}{report.publishDate}</span>
            {report.publisher ? (
              <>
                <span className="text-os-line">|</span>
                <span>{t({ zh: '发布机构：', en: 'Publisher: ' })}{report.publisher}</span>
              </>
            ) : null}
            {report.pages ? (
              <>
                <span className="text-os-line">|</span>
                <span>{report.pages} {t({ zh: '页', en: 'pages' })}</span>
              </>
            ) : null}
          </div>

          {/* 摘要 + 标签 */}
          <div className="rounded-2xl bg-os-mist/50 ring-1 ring-os-line p-6">
            <p className="relative pl-4 text-[16px] sm:text-[17px] leading-[1.85] text-os-ink before:absolute before:left-0 before:top-1 before:bottom-1 before:w-[3px] before:rounded-full before:bg-os-navy/30">
              {report.summary || md?.intro || t({ zh: '（暂无简介）', en: 'No summary yet' })}
            </p>
            {(report.topics || []).length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4">
                {(report.topics || []).map((topic: string, index: number) => (
                  <span
                    key={index}
                    className="px-3 py-1 rounded-full text-[13px] font-medium text-os-navy bg-os-paper ring-1 ring-os-line"
                  >
                    #{topic}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* 操作区: 收藏 + 下载 (图标) */}
          <div className="mt-6 flex items-center gap-2.5">
            <button
              type="button"
              onClick={async () => {
                const result = await toggleFavorite();
                if (!result.ok) alert(result.error || t({ zh: '请先登录后再收藏', en: 'Please log in before bookmarking' }));
              }}
              title={engagement.favorited ? t({ zh: '已收藏', en: 'Saved' }) : t({ zh: '收藏', en: 'Save' })}
              aria-label={t({ zh: '收藏', en: 'Save' })}
              className={`inline-flex h-10 w-10 items-center justify-center rounded-full ring-1 transition ${
                engagement.favorited ? 'bg-os-navy text-white ring-os-navy' : 'bg-os-paper text-os-navy ring-os-line hover:ring-os-navy/40 hover:bg-os-mist/50'
              }`}
            >
              <Star className={`w-[18px] h-[18px] ${engagement.favorited ? 'fill-current' : ''}`} />
            </button>
            <button
              type="button"
              onClick={handleDownloadClick}
              title={t({ zh: '下载 PDF', en: 'Download PDF' })}
              aria-label={t({ zh: '下载 PDF', en: 'Download PDF' })}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-os-paper text-os-navy ring-1 ring-os-line hover:ring-os-navy/40 hover:bg-os-mist/50 transition"
            >
              <Download className="w-[18px] h-[18px]" />
            </button>
            {downloadFeedback && (
              <span className="ml-1 text-[13px] text-os-muted">{downloadFeedback}</span>
            )}
          </div>
        </div>
      </div>

      {/* 内容区域 */}
      <div
        id="report-reader"
        data-yiyu-section="report-detail-reader"
        data-yiyu-section-type="detail"
        data-yiyu-section-title="报告阅读区"
        data-yiyu-section-order="2"
        data-yiyu-section-enterable="false"
        className={`scroll-mt-20 px-4 sm:px-6 lg:px-8 pb-10 pt-2 ${isVisitor ? "blur-sm pointer-events-none select-none" : ""}`}
      >
        {markdownState === 'loading' ? (
          <div className="max-w-4xl mx-auto w-full flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-os-navy/20 border-t-os-navy rounded-full animate-spin" />
          </div>
        ) : md ? (
          /* ===== Markdown 解读阅读区 (左目录 + 中正文 + 右 AI 长驻栏) ===== */
          <div className="max-w-[1320px] mx-auto w-full">
            <div className={`grid gap-8 lg:grid-cols-[200px_minmax(0,1fr)] ${aiOpen ? 'xl:grid-cols-[200px_minmax(0,1fr)_360px]' : 'xl:grid-cols-[200px_minmax(0,1fr)]'}`}>
              {/* 左：目录 (sticky) */}
              {md.toc.length > 0 && (
                <aside className="hidden lg:block">
                  <div className="sticky top-24">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-os-muted mb-3">{t({ zh: '目录', en: 'Contents' })}</div>
                    <nav className="space-y-1 max-h-[72vh] overflow-y-auto pr-2 border-l border-os-line">
                      {md.toc.map((item) => (
                        <a
                          key={item.id}
                          href={`#${item.id}`}
                          className={`block py-1 text-[13px] leading-snug text-os-muted hover:text-os-navy transition-colors border-l-2 border-transparent hover:border-os-navy/40 -ml-px ${item.level === 3 ? 'pl-5' : 'pl-3 font-medium text-os-ink/80'}`}
                        >
                          {item.text}
                        </a>
                      ))}
                    </nav>
                  </div>
                </aside>
              )}

              {/* 中：正文 (滚动) */}
              <article className={`min-w-0 bg-os-paper rounded-2xl ring-1 ring-os-line shadow-os px-6 sm:px-9 py-8 ${isPreview ? 'relative overflow-hidden' : ''}`}>
                {bodyNodes}
                {isPreview && (
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-os-paper" />
                )}
              </article>

              {/* 右：AI 长驻栏 (sticky, 不随正文滚动; 仅 xl+ 且展开时显示; 可收起让正文变宽看宽表格) */}
              {aiOpen && (
                <aside className="hidden xl:block">
                  <div className="sticky top-24 h-[calc(100vh-7rem)] rounded-2xl ring-1 ring-os-line shadow-os overflow-hidden">
                    <ReportChat
                      t={t}
                      messages={chatMessages}
                      newMessage={newMessage}
                      setNewMessage={setNewMessage}
                      onSend={() => void handleSendMessage()}
                      loading={aiLoading}
                      error={aiError}
                      containerRef={chatContainerRef}
                      locked={!hasPaidMembership()}
                      onUpgrade={() => setShowUpgradeModal(true)}
                      onCollapse={() => toggleAi(false)}
                    />
                  </div>
                </aside>
              )}
            </div>
          </div>
        ) : (
          /* ===== 无解读文档：干净占位 (PDF 仅供下载, 不在页面内嵌) ===== */
          <div className="max-w-3xl mx-auto w-full rounded-2xl bg-os-paper ring-1 ring-os-line shadow-os flex flex-col items-center justify-center text-center py-20 px-6">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-os-mist text-os-navy/60 mb-4"><FileText className="w-7 h-7" /></div>
            <p className="text-[15px] font-medium text-os-ink">{t({ zh: '报告解读内容即将上线', en: 'The report is coming soon' })}</p>
            <p className="text-[13px] text-os-muted mt-2 max-w-sm leading-6">{t({ zh: '本报告的解读正文正在整理中。如需查看原始报告，可点上方下载 PDF。', en: 'The report’s readable content is being prepared. To view the original, use the Download PDF button above.' })}</p>
            {report.fileUrl && (
              <button onClick={handleDownloadClick} className="mt-6 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-os-navy to-os-indigo px-6 py-2.5 text-[14px] font-semibold text-white shadow-os hover:brightness-110 transition">
                <Download className="w-4 h-4" />{t({ zh: '下载 PDF 原件', en: 'Download original PDF' })}
              </button>
            )}
          </div>
        )}

        {/* preview 档 (登录未付费): 前 20% 下方付费墙行动卡 */}
        {isPreview && (
          <div className="max-w-4xl mx-auto w-full -mt-px rounded-b-2xl border border-t-0 border-os-line bg-gradient-to-b from-transparent via-os-canvas/70 to-os-canvas px-6 pb-8 pt-16 text-center">
            <div className="mx-auto max-w-xl rounded-[24px] border border-os-line bg-os-paper p-7 shadow-[0_20px_60px_-30px_rgba(22,38,94,0.3)]">
              <div className="mx-auto mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-os-navy to-os-indigo text-white">
                <Crown className="h-5 w-5" />
              </div>
              <h3 className="font-serif-display text-[22px] font-semibold tracking-tight text-os-ink">{t({ zh: '成为终身会员，阅读报告全文', en: 'Become a lifetime member to read the full report' })}</h3>
              <p className="mt-2 text-[14px] leading-7 text-os-muted">
                {t({ zh: '你已看完目录与开篇，了解了这份报告在讲什么。成为终身会员，阅读全部章节，并下载 PDF 原件。', en: "You've seen the outline and opening — now you know what this report covers. Become a lifetime member to read every section and download the original PDF." })}
              </p>
              <p className="mt-3 text-[13px] font-medium text-os-violet">{LIFETIME_MEMBER_TAGLINE}</p>
              <button
                onClick={() => {
                  const params = new URLSearchParams(window.location.search);
                  params.set('page', 'membership');
                  params.delete('id');
                  window.location.href = `${window.location.pathname}?${params.toString()}`;
                }}
                className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-os-navy to-os-indigo px-7 py-3 text-[14px] font-medium text-white shadow-[0_10px_30px_-10px_rgba(22,38,94,0.6)] transition hover:brightness-110"
              >
                <Crown className="h-4 w-4" />{t({ zh: '成为终身会员', en: 'Become a lifetime member' })}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Action Bar + Comment Section (under reader) */}
      {report && (
        <div
          data-yiyu-section="report-detail-comments"
          data-yiyu-section-type="comments"
          data-yiyu-section-title="报告评论区"
          data-yiyu-section-order="3"
          data-yiyu-section-enterable="true"
          className="px-4 sm:px-6 lg:px-8 pb-16"
        >
          <div className="max-w-4xl mx-auto">
            <div className="mt-6 pt-6 border-t border-os-line">
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={async () => {
                    const result = await toggleLike();
                    if (!result.ok) {
                      alert(result.error || t({ zh: '请先登录后再点赞', en: 'Please log in before liking' }));
                    }
                  }}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-[14px] font-medium ring-1 transition-all duration-200 ${
                    engagement.liked ? 'bg-os-navy text-white ring-os-navy' : 'bg-os-paper text-os-navy ring-os-line hover:ring-os-navy/40 hover:bg-os-mist/50'
                  }`}
                >
                  <ThumbsUp className="w-[18px] h-[18px]" />
                  <span>{t({ zh: '点赞', en: 'Like' })} {engagement.likesCount || report.likes || 0}</span>
                </button>

                <button
                  onClick={async () => {
                    const result = await toggleFavorite();
                    if (!result.ok) {
                      alert(result.error || t({ zh: '请先登录后再收藏', en: 'Please log in before bookmarking' }));
                    }
                  }}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-[14px] font-medium ring-1 transition-all duration-200 ${
                    engagement.favorited ? 'bg-os-navy text-white ring-os-navy' : 'bg-os-paper text-os-navy ring-os-line hover:ring-os-navy/40 hover:bg-os-mist/50'
                  }`}
                >
                  <Bookmark className={`w-[18px] h-[18px] ${engagement.favorited ? 'fill-current' : ''}`} />
                  <span>{engagement.favorited ? t({ zh: `已收藏 ${engagement.favoritesCount}`, en: `Saved ${engagement.favoritesCount}` }) : t({ zh: `收藏 ${engagement.favoritesCount}`, en: `Save ${engagement.favoritesCount}` })}</span>
                </button>

                <button
                  onClick={async () => {
                    const shareUrl = buildShareLandingUrl('report', report.id);
                    try {
                      await navigator.clipboard.writeText(shareUrl);
                      alert(t({ zh: '已复制链接，可粘贴到微信/朋友圈', en: 'Link copied. Paste it into WeChat or Moments.' }));
                    } catch {
                      window.prompt(t({ zh: '复制下面链接分享到微信/朋友圈：', en: 'Copy the link below to share on WeChat / Moments:' }), shareUrl);
                    }
                  }}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-full text-[14px] font-medium bg-os-paper text-os-navy ring-1 ring-os-line hover:ring-os-navy/40 hover:bg-os-mist/50 transition-all duration-200"
                >
                  <Share2 className="w-[18px] h-[18px]" />
                  <span>{t({ zh: '分享到朋友圈', en: 'Share to Moments' })}</span>
                </button>
              </div>
            </div>

            <div className="mt-10">
              <CommentSection
                contentId={reportId}
                contentType="report"
                contentTitle={report.title}
                isLoggedIn={isLoggedIn}
                userName={currentUser?.nickname || t({ zh: '访客', en: 'Guest' })}
              />
            </div>
          </div>
        </div>
      )}



      {isVisitor && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative w-[92%] max-w-lg rounded-[28px] bg-os-paper ring-1 ring-os-line shadow-2xl p-7 sm:p-8">
            <div className="text-center">
              <div className="mx-auto mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-os-navy to-os-indigo text-white">
                <FileText className="h-5 w-5" />
              </div>
              <div className="font-serif-display text-[20px] sm:text-[22px] font-semibold text-os-ink mb-2">{t({ zh: '注册 / 登录，解锁益语前沿报告', en: "Sign up or log in to unlock Yiyu's frontier reports" })}</div>
              <div className="text-[14px] text-os-muted leading-relaxed mb-6">{t({ zh: '登录后即可查看报告详情与内容。', en: 'Log in to view the report details and content.' })}</div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={() => {
                  const params = new URLSearchParams(window.location.search);
                  params.set('page', 'login');
                  params.delete('id');
                  window.location.href = `${window.location.pathname}?${params.toString()}`;
                }}
                className="w-full px-4 py-3 rounded-full bg-gradient-to-r from-os-navy to-os-indigo text-white text-[15px] font-semibold hover:brightness-110 transition shadow-os"
              >
                {t({ zh: '去登录/注册', en: 'Log in / Sign up' })}
              </button>
              <button
                onClick={() => {
                  const params = new URLSearchParams(window.location.search);
                  params.set('page', 'report-library');
                  params.delete('id');
                  window.location.href = `${window.location.pathname}?${params.toString()}`;
                }}
                className="w-full px-4 py-3 rounded-full bg-os-paper text-os-navy text-[15px] font-medium ring-1 ring-os-line hover:ring-os-navy/40 hover:bg-os-mist/50 transition"
              >
                {t({ zh: '返回', en: 'Back' })}
              </button>
            </div>
          </div>
        </div>
      )}
      <OpenSourceFooter />

      {/* 成为终身会员弹窗 (左:三种购书途径 / 右:会员权益 / 底:彩蛋) */}
      {showUpgradeModal && (
        <div className="fixed inset-0 bg-os-navy/45 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-os-paper rounded-[24px] w-full max-w-3xl overflow-hidden shadow-2xl ring-1 ring-os-line">
            {/* 头部 */}
            <div className="relative bg-gradient-to-r from-os-blue to-os-indigo p-6 sm:p-7 text-white">
              <button
                onClick={() => setShowUpgradeModal(false)}
                className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/15 rounded-xl flex items-center justify-center">
                  <Crown className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-serif-display text-[22px] font-semibold leading-tight">{t({ zh: '成为益语智库终身会员', en: 'Become a Yiyu Institute lifetime member' })}</h3>
                  <p className="text-white/80 text-[13px] mt-0.5">{t({ zh: '一次购书，终身畅读', en: 'Buy a book once, read for life' })}</p>
                </div>
              </div>
            </div>

            {/* 主体: 左 三种途径 / 右 权益 */}
            <div className="grid md:grid-cols-2">
              {/* 左: 三种成为会员的途径 */}
              <div className="p-6 sm:p-7 border-b md:border-b-0 md:border-r border-os-line">
                <div className="text-[12px] font-semibold tracking-[0.08em] text-os-muted uppercase mb-4">{t({ zh: '选一种方式 · 都含终身会员', en: 'Choose any option · all include lifetime membership' })}</div>
                <div className="space-y-3">
                  {MEMBER_PLANS.map((plan) => {
                    const active = selectedPlan === plan.id;
                    return (
                      <button
                        key={plan.id}
                        type="button"
                        onClick={() => setSelectedPlan(plan.id)}
                        className={`relative w-full text-left rounded-[16px] transition p-4 flex items-center gap-3 ring-1 ${active ? 'ring-2 ring-os-navy bg-os-navy/[0.05]' : 'ring-os-line hover:ring-os-navy/40 hover:bg-os-mist/40'}`}
                      >
                        {plan.id === 'book_bundle' && (
                          <span className="absolute -top-2 left-4 rounded-full bg-os-navy px-2 py-0.5 text-[10px] font-semibold text-white">{t({ zh: '最划算', en: 'Best value' })}</span>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="text-[14px] font-semibold text-os-navy">{t(plan.title)}</div>
                          <div className="text-[12px] text-os-muted mt-0.5">¥{plan.price} · {plan.note ? `${t(plan.note)} · ` : ''}{t({ zh: '含终身会员', en: 'includes lifetime membership' })}</div>
                        </div>
                        {active
                          ? <CheckCircle className="w-5 h-5 text-os-navy flex-shrink-0" />
                          : <span className="w-5 h-5 rounded-full ring-1 ring-os-line flex-shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 右: 终身会员权益 */}
              <div className="p-6 sm:p-7 bg-os-canvas/40">
                <div className="text-[12px] font-semibold tracking-[0.08em] text-os-muted uppercase mb-4">{t({ zh: '终身会员权益', en: 'Lifetime member benefits' })}</div>
                <ul className="space-y-3">
                  {([
                    { t: { zh: '无限量阅读最新文章', en: 'Unlimited access to the latest articles' } as Bilingual },
                    { t: { zh: '无限量下载最新报告', en: 'Unlimited downloads of the latest reports' } as Bilingual },
                    { t: { zh: '无限量参与益语智库全国各地沙龙活动', en: 'Unlimited entry to Yiyu Institute salons nationwide' } as Bilingual },
                    { t: { zh: '获得对应实体书（包邮寄送）', en: 'Receive the physical book (free shipping)' } as Bilingual },
                    { t: { zh: '加入社会创新大社群', en: 'Join the social innovation community' } as Bilingual },
                    { t: { zh: '益语的朋友们 · 直播讨论', en: "Friends of Yiyu · Live discussions" } as Bilingual, act: () => { window.location.href = `${window.location.pathname}?page=friends-live`; } },
                    { t: { zh: '社会创新的支持者', en: 'Supporters of social innovation' } as Bilingual, act: () => setShowSupportPool(true) },
                  ]).map((b) => (
                    <li key={b.t.zh} className="flex items-start gap-2.5 text-[14px] leading-6 text-os-ink">
                      <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                      {b.act ? (
                        <button
                          type="button"
                          onClick={b.act}
                          className="inline-flex items-center gap-0.5 text-left font-medium text-os-blue hover:text-os-navy underline decoration-os-line decoration-1 underline-offset-2 transition-colors"
                        >
                          {t(b.t)}<ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <span>{t(b.t)}</span>
                      )}
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={() => { setShowUpgradeModal(false); window.location.href = `${window.location.pathname}?page=book-detail&id=${selectedPlan}`; }}
                  className="mt-5 inline-flex items-center gap-1 text-[13px] font-semibold text-os-blue hover:text-os-navy transition"
                >
                  {selectedPlan === 'book_bundle'
                    ? t({ zh: '了解这两本书', en: 'Learn about both books' })
                    : t({ zh: `了解《${t(MEMBER_PLANS.find((p) => p.id === selectedPlan)?.title ?? { zh: '' })}》`, en: `Learn about "${t(MEMBER_PLANS.find((p) => p.id === selectedPlan)?.title ?? { zh: '' })}"` })}
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* 购买行动条: 唯一跳转入口(点选项只选中对比, 这里才去购书页) */}
            <div className="px-6 sm:px-7 py-4 border-t border-os-line flex items-center justify-between gap-3 flex-wrap">
              <div className="text-[13px] text-os-muted">
                {t({ zh: '已选', en: 'Selected' })} <span className="font-semibold text-os-ink">{t(MEMBER_PLANS.find((p) => p.id === selectedPlan)?.title ?? { zh: '' })}</span>
                <span className="mx-1.5">·</span>
                <span className="font-semibold text-os-ink">¥{MEMBER_PLANS.find((p) => p.id === selectedPlan)?.price}</span>
                <span> {t({ zh: '含终身会员', en: 'includes lifetime membership' })}</span>
              </div>
              <button
                type="button"
                onClick={() => { setShowUpgradeModal(false); window.location.href = `${window.location.pathname}?page=payment-checkout&id=${selectedPlan}`; }}
                className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600 px-7 py-2.5 text-[13px] font-semibold text-white hover:brightness-110 transition shadow-[0_8px_24px_-8px_rgba(5,150,105,0.55)]"
              >
                {t({ zh: '立即购买', en: 'Buy now' })} <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* 底部彩蛋: 不显眼的小字入口 */}
            <div className="px-6 sm:px-7 py-3.5 border-t border-os-line text-center">
              <button
                onClick={() => { setShowUpgradeModal(false); setShowThanks(true); }}
                className="text-[12px] text-os-muted/55 hover:text-os-muted transition-colors"
              >
                {t({ zh: '我暂时不想付钱，但我喜欢益语智库的内容 ›', en: "I'm not ready to pay yet, but I love Yiyu Institute's content ›" })}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 彩蛋 · 感谢小礼物弹窗 (UI 占位; 后端"每天可领3篇文章额度"待接) */}
      {showThanks && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-os-navy/40 backdrop-blur-sm animate-fade-in"
          onClick={() => setShowThanks(false)}
        >
          <div
            className="relative w-full max-w-[380px] overflow-hidden rounded-[28px] bg-os-paper ring-1 ring-os-line shadow-[0_30px_80px_-20px_rgba(22,38,94,0.40)]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 顶部柔光 */}
            <div
              aria-hidden
              className="pointer-events-none absolute -top-16 left-1/2 -translate-x-1/2 h-40 w-40 rounded-full"
              style={{ background: 'radial-gradient(closest-side, rgba(44,111,208,0.18), transparent 70%)' }}
            />
            <button
              onClick={() => setShowThanks(false)}
              className="absolute top-4 right-4 z-10 p-1.5 rounded-full text-os-muted/55 hover:text-os-muted hover:bg-os-mist transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="relative px-8 pt-9 pb-8 text-center">
              {/* 礼物徽章 */}
              <div className="mx-auto mb-5 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-os-blue to-os-indigo text-white shadow-[0_14px_34px_-12px_rgba(44,111,208,0.7)]">
                <Gift className="h-7 w-7" />
              </div>

              <h4 className="font-serif-display text-[21px] font-semibold tracking-tight text-os-ink">{t({ zh: '感谢你对益语智库的喜欢', en: 'Thank you for loving Yiyu Institute' })}</h4>
              <p className="mt-2 text-[13px] leading-6 text-os-muted">{t({ zh: '你喜欢，我们就很开心 —— 这是给你的一份小礼物', en: 'Your love makes us happy — here is a little gift for you' })}</p>

              {/* 礼物高亮块 */}
              <div className="mt-5 rounded-[18px] bg-os-canvas/70 ring-1 ring-os-line px-5 py-4">
                <div className="flex items-baseline justify-center gap-1.5">
                  <span className="font-serif-display text-[34px] font-semibold leading-none text-os-blue">3</span>
                  <span className="text-[14px] font-medium text-os-ink">{t({ zh: '篇文章阅读权限', en: 'free article reads' })}</span>
                </div>
                <div className="mt-1.5 text-[12px] text-os-muted">{t({ zh: '已为你解锁 · 可立即阅读', en: 'Unlocked for you · read now' })}</div>
              </div>

              <button
                onClick={() => setShowThanks(false)}
                className="mt-6 w-full rounded-full bg-gradient-to-r from-os-blue to-os-indigo py-3 text-[14px] font-semibold text-white hover:brightness-110 transition shadow-[0_12px_28px_-10px_rgba(44,111,208,0.6)]"
              >
                {t({ zh: '开心收下', en: 'Happily accept' })}
              </button>
              <p className="mt-3 text-[12px] text-os-muted/70">{t({ zh: '明天再来，还能再领 3 篇 🙂', en: 'Come back tomorrow for 3 more 🙂' })}</p>
            </div>
          </div>
        </div>
      )}

      {/* "社会创新的支持者" 就地盖一层 (z-[100], 盖在支付弹窗 z-50 之上; 关掉即回到支付弹窗) */}
      <SupportPoolDrawer open={showSupportPool} onClose={() => setShowSupportPool(false)} />

      {/* 窄屏(< xl): 右下角浮动按钮唤出 AI 抽屉 */}
      {md && !isVisitor && (
        <button
          onClick={() => setShowAiChat(true)}
          className="xl:hidden fixed bottom-5 right-5 z-[70] inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-os-violet to-os-indigo px-5 py-3 text-[13.5px] font-semibold text-white shadow-[0_14px_34px_-12px_rgba(124,58,237,0.7)] hover:brightness-110 transition"
        >
          <Sparkles className="w-4 h-4" />{t({ zh: '跟 AI 聊', en: 'Ask AI' })}
        </button>
      )}

      {/* 宽屏(xl+) AI 栏收起后: 右边缘竖向标签条, 点击重新展开 */}
      {md && !isVisitor && !aiOpen && (
        <button
          onClick={() => toggleAi(true)}
          title={t({ zh: '展开 AI 对话', en: 'Open AI chat' })}
          className="hidden xl:flex fixed right-0 top-1/2 -translate-y-1/2 z-[70] flex-col items-center gap-2 rounded-l-2xl bg-gradient-to-b from-os-violet to-os-indigo py-4 pl-2.5 pr-2 text-white shadow-[0_14px_34px_-12px_rgba(124,58,237,0.7)] hover:pr-3 transition-all"
        >
          <Sparkles className="w-[18px] h-[18px]" />
          <span className="text-[12.5px] font-semibold tracking-wide [writing-mode:vertical-rl]">{t({ zh: '跟 AI 聊', en: 'Ask AI' })}</span>
        </button>
      )}

      {/* 跟 AI 聊聊这份报告 · 窄屏滑出抽屉 (xl+ 改用右侧长驻栏) */}
      {showAiChat && (
        <div className="fixed inset-0 z-[90] flex justify-end xl:hidden">
          <div className="absolute inset-0 bg-os-navy/30 backdrop-blur-sm" onClick={() => setShowAiChat(false)} />
          <div className="relative h-full w-full max-w-[440px] bg-os-canvas shadow-2xl ring-1 ring-os-line">
            <ReportChat
              t={t}
              messages={chatMessages}
              newMessage={newMessage}
              setNewMessage={setNewMessage}
              onSend={() => void handleSendMessage()}
              loading={aiLoading}
              error={aiError}
              containerRef={chatContainerRef}
              locked={!hasPaidMembership()}
              onUpgrade={() => { setShowAiChat(false); setShowUpgradeModal(true); }}
              onClose={() => setShowAiChat(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
