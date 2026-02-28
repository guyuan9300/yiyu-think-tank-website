/**
 * 管理后台组件
 * 实现内容管理功能，支持真实数据持久化
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Users, Settings, BarChart3, MessageSquare, LogOut,
  Menu, X, ChevronRight, Database, Shield, Bell, Gift, Crown,
  Search, Filter, MoreVertical, Edit, Trash2, Copy, CheckCircle, 
  XCircle, Plus, Download, RefreshCw, AlertTriangle, Eye, EyeOff,
  BookOpen, Tag, Folder, Upload, Image, File, Send, Check, Calendar,
  User, Globe, TrendingUp, MoreHorizontal, Clock, FileText, Target, RotateCcw
} from 'lucide-react';
import {
  generateInvitationCode, getAllInviteCodes, disableInviteCode,
  deleteInviteCode, INVITE_CODE_TYPES, type InviteCode, type InviteCodeType
} from '../lib/auth';
import {
  getReports, saveReport, deleteReport as deleteReportFromService,
  getInsights, saveInsight, deleteInsight as deleteInsightFromService,
  getMethodologies, saveMethodology, deleteMethodology as deleteMethodologyFromService,
  getBooks, saveBook, deleteBook as deleteBookFromService,
  getCategories, calculateReadTime,
  getComments, updateCommentStatus, replyComment,
  type Report, type InsightArticle, type Methodology, type Book, type Category, type Comment,
  type ResourceTopic
} from '../lib/dataService';

const RESOURCE_TOPICS: ResourceTopic[] = ['战略', '业务设计', '组织', 'AI 技术'];

import { isValidPdfFile, formatFileSize } from '../lib/pdfUtils';
import { SettingsPage } from './SettingsPage';
import { generateCoverImage, getHfModel, getHfToken, setHfModel, setHfToken } from '../lib/hfImageGen';
import { UserManagementPage } from './UserManagementPage';
import AdminStrategyCompanionConceptPage from './AdminStrategyCompanionConceptPage';
import AdminOpsCenterDashboard from './adminOps/AdminOpsCenterDashboard';
import {
  getClientProjects as getStrategyClients,
  getCourseRecommendations,
  saveCourseRecommendation,
  deleteCourseRecommendation,
  type ClientProject,
  type CourseRecommendation,
} from '../lib/dataServiceLocal';

// Props
interface AdminDashboardProps {
  onLogout?: () => void;
  onNavigateHome?: () => void;
}

// 菜单项
interface MenuItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
}

export function AdminDashboard({ onLogout, onNavigateHome }: AdminDashboardProps) {
  const [activeMenu, setActiveMenu] = useState('dashboard');

  const isEmbedded = new URLSearchParams(window.location.search).get('embed') === '1';

  // 支持从 URL hash 或临时会话参数直达指定后台模块（用于新 dashboard 跳转旧后台页面）
  useEffect(() => {
    const allowedMenus = new Set([
      'dashboard', 'insights', 'reports', 'books', 'methodologies',
      'categories', 'strategy-companion', 'invite-codes', 'comments',
      'settings', 'user-management', 'membership'
    ]);

    const applyTargetMenu = () => {
      const fromHash = (window.location.hash || '').replace('#', '').trim();
      const fromSession = (sessionStorage.getItem('yiyu_admin_target_menu') || '').trim();
      const fromQuery = (new URLSearchParams(window.location.search).get('legacyTab') || '').trim();
      const target = fromQuery || fromSession || fromHash;
      if (allowedMenus.has(target)) {
        setActiveMenu(target);
      }
      if (fromSession) {
        sessionStorage.removeItem('yiyu_admin_target_menu');
      }
    };

    applyTargetMenu();
    window.addEventListener('hashchange', applyTargetMenu);
    return () => window.removeEventListener('hashchange', applyTargetMenu);
  }, []);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // 邀请码管理状态
  const [inviteCodes, setInviteCodes] = useState<InviteCode[]>([]);
  const [selectedInviteIds, setSelectedInviteIds] = useState<string[]>([]);
  const [selectedType, setSelectedType] = useState<InviteCodeType>('30days');
  const [maxUses, setMaxUses] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // 内容管理状态 - 使用dataService的真实数据
  const [insights, setInsights] = useState<InsightArticle[]>([]);
  const [methodologies, setMethodologies] = useState<Methodology[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  // usedTags removed: switched to topics-only schema
  
  // 战略陪伴客户同步（写入 dataServiceLocal.course_recommendations）
  const [strategyClients, setStrategyClients] = useState<ClientProject[]>([]);
  const [syncClientIds, setSyncClientIds] = useState<string[]>([]);

  // 评论管理状态
  const [comments, setComments] = useState<Comment[]>([]);
  const [showCommentReplyModal, setShowCommentReplyModal] = useState(false);
  const [replyingComment, setReplyingComment] = useState<Comment | null>(null);
  const [replyText, setReplyText] = useState('');
  
  // 表单状态
  const [showInsightForm, setShowInsightForm] = useState(false);
  const [showMethodologyForm, setShowMethodologyForm] = useState(false);
  const [showReportForm, setShowReportForm] = useState(false);
  const [showBookForm, setShowBookForm] = useState(false);
  const [editingItem, setEditingItem] = useState<Report | InsightArticle | Methodology | Book | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // 内容筛选：统一标签（四类，可多选）
  const [filterTopics, setFilterTopics] = useState<ResourceTopic[]>([]);
  const [topicFilterOpen, setTopicFilterOpen] = useState(false);

  // 评论筛选：状态
  const [commentStatusFilter, setCommentStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'has_reply'>('all');
  
  // 封面图状态
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [bookCoverImage, setBookCoverImage] = useState<string | null>(null);
  const [reportPages, setReportPages] = useState<number>(0);
  const [calculatedReadTime, setCalculatedReadTime] = useState<string>('');
  const [reportFile, setReportFile] = useState<File | null>(null);
  const [reportStatus, setReportStatus] = useState<'draft' | 'published'>('published');
  const coverInputRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const reportFileInputRef = useRef<HTMLInputElement>(null);
  const bookCoverFileInputRef = useRef<HTMLInputElement>(null);
  // tagInputRef removed (topics-only schema)

  // 初始化数据
  useEffect(() => {
    const loadData = () => {
      setReports(getReports());
      setInsights(getInsights());
      setMethodologies(getMethodologies());
      setBooks(getBooks());
      setCategories(getCategories());
      // usedTags removed (topics-only schema)
      setComments(getComments());
      loadInviteCodes();
    };
    
    loadData();

    // 监听粘贴事件 - 支持直接粘贴图片到报告封面
    const handlePaste = (e: ClipboardEvent) => {
      if (!showReportForm) return;
      
      const items = e.clipboardData?.items;
      if (!items) return;
      
      for (const item of items) {
        if (item.type.indexOf('image') !== -1) {
          const blob = item.getAsFile();
          if (blob) {
            const reader = new FileReader();
            reader.onload = (e) => {
              const base64 = e.target?.result as string;
              setCoverImage(base64);
            };
            reader.readAsDataURL(blob);
            e.preventDefault();
            break;
          }
        }
      }
    };

    document.addEventListener('paste', handlePaste);
    
    return () => {
      document.removeEventListener('paste', handlePaste);
    };
  }, [showReportForm]);

  // 加载战略陪伴客户列表（用于内容同步）
  useEffect(() => {
    let canceled = false;

    const load = async () => {
      try {
        const clients = await getStrategyClients();
        if (!canceled) setStrategyClients(clients);
      } catch (e) {
        console.warn('加载战略客户失败:', e);
      }
    };

    load();

    const onChange = () => load();
    window.addEventListener('yiyu_data_change', onChange);
    window.addEventListener('storage', onChange);

    return () => {
      canceled = true;
      window.removeEventListener('yiyu_data_change', onChange);
      window.removeEventListener('storage', onChange);
    };
  }, []);

  // 打开内容编辑表单时：自动读取已同步的客户勾选
  useEffect(() => {
    const internalType = showReportForm ? 'report' : showInsightForm ? 'article' : showBookForm ? 'book' : null;
    const internalId = editingItem?.id;

    if (!internalType) return;

    if (!internalId) {
      setSyncClientIds([]);
      return;
    }

    let canceled = false;
    (async () => {
      try {
        const all = await getCourseRecommendations();
        const ids = (all || [])
          .filter(r => r.type === 'internal' && r.internalType === internalType && r.internalId === internalId)
          .map(r => r.projectId);
        if (!canceled) setSyncClientIds(Array.from(new Set(ids)));
      } catch (e) {
        console.warn('读取同步信息失败:', e);
        setSyncClientIds([]);
      }
    })();

    return () => {
      canceled = true;
    };
  }, [showReportForm, showInsightForm, showBookForm, editingItem]);

  // 当页数变化时自动计算阅读时间
  useEffect(() => {
    if (reportPages > 0) {
      setCalculatedReadTime(calculateReadTime(reportPages));
    } else {
      setCalculatedReadTime('');
    }
  }, [reportPages]);

  // 加载邀请码
  const loadInviteCodes = async () => {
    const codes = await getAllInviteCodes();
    setInviteCodes(codes);
    setSelectedInviteIds([]);
  };

  const exportInviteCodesCsv = (rows: InviteCode[]) => {
    const header = ['邀请码', '类型', '最大使用次数', '已使用次数', '奖励时长(天)', '状态', '创建时间'];
    const lines = rows.map((c) => {
      const typeInfo = getTypeInfo(c.type as InviteCodeType);
      return [
        c.code,
        typeInfo.label,
        String(c.maxUses ?? ''),
        String(c.usedCount ?? ''),
        String(typeInfo.days ?? ''),
        c.status,
        new Date(c.createdAt).toLocaleString('zh-CN'),
      ]
        .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
        .join(',');
    });
    const csv = [header.join(','), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invite-codes-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  // 刷新所有数据
  const refreshAllData = useCallback(() => {
    setReports(getReports());
    setInsights(getInsights());
    setMethodologies(getMethodologies());
    setBooks(getBooks());
    setCategories(getCategories());
    // usedTags removed (topics-only schema)
    setComments(getComments());
  }, []);

  // 菜单配置
  const menuItems: MenuItem[] = [
    { id: 'dashboard', label: '数据概览', icon: <BarChart3 className="w-5 h-5" /> },
    { id: 'user-management', label: '用户管理', icon: <Users className="w-5 h-5" /> },
    { id: 'insights', label: '洞察文章', icon: <FileText className="w-5 h-5" /> },
    { id: 'reports', label: '报告管理', icon: <Folder className="w-5 h-5" /> },
    { id: 'books', label: '书籍管理', icon: <BookOpen className="w-5 h-5" /> },
    { id: 'methodologies', label: '益语方法论', icon: <Tag className="w-5 h-5" /> },
    { id: 'strategy-companion', label: '战略客户', icon: <Target className="w-5 h-5" /> },
    { id: 'invite-codes', label: '邀请码管理', icon: <Gift className="w-5 h-5" /> },
    // 会员管理与用户管理为同一页，按需求隐藏入口
    // { id: 'membership', label: '会员管理', icon: <Crown className="w-5 h-5" /> }, 
    { id: 'comments', label: '评论管理', icon: <MessageSquare className="w-5 h-5" /> },
    { id: 'settings', label: '系统设置', icon: <Settings className="w-5 h-5" /> },
  ];

  // 统计数据
  const stats = [
    { label: '用户总数', value: '1,284', change: '+12%', trend: 'up' },
    { label: '已发布报告', value: reports.filter(r => r.status === 'published').length.toString(), change: '+' + reports.length, trend: 'up' },
    { label: '已发布文章', value: insights.filter(i => i.status === 'published').length.toString(), change: '+' + insights.length, trend: 'up' },
    { label: '已上架书籍', value: books.filter(b => b.status === 'published').length.toString(), change: '+' + books.length, trend: 'up' },
  ];

  // 生成邀请码
  const handleGenerateCode = async () => {
    console.log('开始生成邀请码...');
    setIsGenerating(true);
    setMessage(null);
    
    try {
      console.log('调用generateInvitationCode，类型:', selectedType, '最大使用次数:', maxUses);
      const result = await generateInvitationCode(selectedType, maxUses);
      console.log('生成结果:', result);
      
      if (result.success && result.code) {
        setMessage({ 
          type: 'success', 
          text: `成功生成邀请码: ${result.code.code} (${INVITE_CODE_TYPES[selectedType].label})` 
        });
        await loadInviteCodes();
      } else {
        setMessage({ 
          type: 'error', 
          text: result.error || '生成邀请码失败' 
        });
      }
    } catch (error) {
      console.error('生成邀请码错误:', error);
      setMessage({ 
        type: 'error', 
        text: '生成邀请码时发生错误: ' + (error instanceof Error ? error.message : String(error))
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // 禁用邀请码
  const handleDisableCode = async (code: string) => {
    const result = await disableInviteCode(code);
    if (result.success) {
      setMessage({ type: 'success', text: '邀请码已禁用' });
      await loadInviteCodes();
    } else {
      setMessage({ type: 'error', text: result.message || '操作失败' });
    }
  };

  // 删除邀请码
  const handleDeleteCode = async (code: string) => {
    if (!window.confirm('确定要删除这个邀请码吗？此操作不可恢复。')) {
      return;
    }
    
    const result = await deleteInviteCode(code);
    if (result.success) {
      setMessage({ type: 'success', text: '邀请码已删除' });
      await loadInviteCodes();
    } else {
      setMessage({ type: 'error', text: result.message || '删除失败' });
    }
  };

  // 复制邀请码
  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setMessage({ type: 'success', text: '邀请码已复制到剪贴板' });
  };

  // 获取邀请码类型信息
  const getTypeInfo = (type: InviteCodeType) => {
    const config = INVITE_CODE_TYPES[type];
    return {
      label: config.label,
      days: config.bonusDays,
      color: type === '30days' ? 'bg-blue-100 text-blue-700' :
             type === '365days' ? 'bg-amber-100 text-amber-700' :
             'bg-purple-100 text-purple-700'
    };
  };

  // 获取状态信息
  const getStatusInfo = (status: string) => {
    return status === 'valid' ? { 
      label: '有效', 
      color: 'bg-green-100 text-green-700',
      icon: <CheckCircle className="w-3 h-3" />
    } : status === 'redeemed' ? { 
      label: '已兑换', 
      color: 'bg-gray-100 text-gray-600',
      icon: <XCircle className="w-3 h-3" />
    } : { 
      label: '已禁用', 
      color: 'bg-red-100 text-red-700',
      icon: <XCircle className="w-3 h-3" />
    };
  };

  // 格式化文件大小
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  // 获取当前分类列表
  const getCurrentCategories = () => {
    if (activeMenu === 'insights') {
      return categories.filter(c => c.type === 'insight');
    } else if (activeMenu === 'reports') {
      return categories.filter(c => c.type === 'report');
    } else if (activeMenu === 'books') {
      return categories.filter(c => c.type === 'book');
    }
    return [];
  };

  // 筛选内容（按搜索 + topics）
  const filterContent = (items: any[]) => {
    const q = searchQuery.trim().toLowerCase();
    const selected = (filterTopics || []).filter(Boolean);

    return items.filter((item) => {
      const title = (item.title || '').toString().toLowerCase();
      const excerpt = (item.excerpt || '').toString().toLowerCase();
      const summary = (item.summary || '').toString().toLowerCase();

      const matchesSearch = !q || title.includes(q) || excerpt.includes(q) || summary.includes(q);

      const itemTopics = (item.topics || []) as ResourceTopic[];
      const matchesTopics = selected.length === 0 || selected.some((t) => itemTopics.includes(t));

      return matchesSearch && matchesTopics;
    });
  };

  // 处理文件上传
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // 这里可以处理文件上传逻辑
      console.log('选择的文件:', file.name, '大小:', formatFileSize(file.size));
    }
  };

  // 处理点击上传封面图按钮
  const handleCoverButtonClick = () => {
    fileInputRef.current?.click();
  };

  // 处理点击选择报告文件按钮
  const handleReportFileButtonClick = () => {
    reportFileInputRef.current?.click();
  };

  // 处理报告文件选择
  const handleReportFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!isValidPdfFile(file)) {
        alert('请选择 PDF 格式的文件');
        return;
      }
      setReportFile(file);
    }
  };

  // 处理封面图片选择
  const handleCoverImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setCoverImage(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // 处理书籍封面图片选择
  const handleBookCoverImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setBookCoverImage(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // 处理点击选择书籍封面图片按钮
  const handleBookCoverButtonClick = () => {
    bookCoverFileInputRef.current?.click();
  };

  // tags/usedTags removed (topics-only schema)

  // 同步站内内容 → 战略陪伴客户的「课程推荐」（dataServiceLocal.course_recommendations）
  const syncInternalCourseRecommendations = useCallback(
    async (params: {
      internalType: 'article' | 'report' | 'book' | 'methodology';
      internalId: string;
      title: string;
      selectedProjectIds: string[];
    }) => {
      const { internalType, internalId, title, selectedProjectIds } = params;
      const selected = new Set((selectedProjectIds || []).filter(Boolean));

      const all = await getCourseRecommendations();
      const existing = (all || []).filter(
        (r) => r.type === 'internal' && r.internalType === internalType && r.internalId === internalId
      );

      const existingByProject = new Map<string, CourseRecommendation>();
      existing.forEach((r) => existingByProject.set(r.projectId, r));

      const tasks: Promise<any>[] = [];

      // create/update
      selected.forEach((projectId) => {
        const hit = existingByProject.get(projectId);
        if (hit) {
          if (hit.title !== title) {
            tasks.push(
              saveCourseRecommendation({
                id: hit.id,
                title,
                isActive: true,
              })
            );
          }
        } else {
          tasks.push(
            saveCourseRecommendation({
              projectId,
              title,
              type: 'internal',
              internalType: internalType as any,
              internalId,
              description: '',
              sortOrder: 0,
              isActive: true,
            })
          );
        }
      });

      // delete
      existing.forEach((r) => {
        if (!selected.has(r.projectId)) {
          tasks.push(deleteCourseRecommendation(r.id));
        }
      });

      await Promise.all(tasks);
    },
    []
  );

  // 保存报告
  const handleSaveReport = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const selectedTopics = (formData.getAll('topics') as string[])
      .map(s => s.trim())
      .filter(Boolean) as any;

    const current = editingItem as Report | null;

    const reportData: Partial<Report> = {
      id: current ? current.id : undefined,
      // 必填项缺失时先用“待补充”占位
      title: (formData.get('title') as string) || current?.title || '待补充',
      publisher: (formData.get('publisher') as string) || current?.publisher || '待补充',
      // 统一四类标签（必填）
      topics: selectedTopics.length > 0 ? (selectedTopics as any) : (current?.topics || ['战略']),
      summary: (formData.get('summary') as string) || current?.summary || '待补充',
      version: (formData.get('version') as string) || current?.version || 'v1.0',
      format: ['PDF'],
      // 必填项：封面缺失时用占位
      coverImage: coverImage || current?.coverImage || 'images/placeholders/document.svg',
      pages: reportPages || current?.pages,
      // 用 publishDate 作为“修改时间/展示时间”的可编辑入口
      publishDate: (formData.get('publishDate') as string) || current?.publishDate || new Date().toISOString().split('T')[0],
      status: reportStatus,
      showOnHome: formData.get('showOnHome') === 'on',
      // 报告文件信息
      fileUrl: reportFile ? reportFile.name : current?.fileUrl,
      fileSize: reportFile ? reportFile.size : current?.fileSize,
    };

    const saved = saveReport(reportData);
    // 同步到战略陪伴客户（多选）
    await syncInternalCourseRecommendations({
      internalType: 'report',
      internalId: saved.id,
      title: saved.title,
      selectedProjectIds: syncClientIds,
    });
    refreshAllData();
    setShowReportForm(false);
    setEditingItem(null);
    setCoverImage(null);
    setReportPages(0);
    setCalculatedReadTime('');
    setReportFile(null);
    setReportStatus('published');
    setMessage({ type: 'success', text: '报告已发布，前台报告库可见！' });
  };

  // 删除报告
  const handleDeleteReport = async (id: string) => {
    if (window.confirm('确定要删除这份报告吗？')) {
      deleteReportFromService(id);
      await syncInternalCourseRecommendations({ internalType: 'report', internalId: id, title: '', selectedProjectIds: [] });
      refreshAllData();
      setMessage({ type: 'success', text: '报告已删除' });
    }
  };

  // 删除洞察文章
  const handleDeleteInsight = async (id: string) => {
    if (window.confirm('确定要删除这篇文章吗？')) {
      deleteInsightFromService(id);
      await syncInternalCourseRecommendations({ internalType: 'article', internalId: id, title: '', selectedProjectIds: [] });
      refreshAllData();
      setMessage({ type: 'success', text: '文章已删除' });
    }
  };

  // 删除方法论
  const handleDeleteMethodology = async (id: string) => {
    if (window.confirm('确定要删除这条方法论吗？')) {
      deleteMethodologyFromService(id);
      await syncInternalCourseRecommendations({ internalType: 'methodology', internalId: id, title: '', selectedProjectIds: [] });
      refreshAllData();
      setMessage({ type: 'success', text: '方法论已删除' });
    }
  };

  // 删除书籍
  const handleDeleteBook = async (id: string) => {
    if (window.confirm('确定要删除这本书吗？')) {
      deleteBookFromService(id);
      await syncInternalCourseRecommendations({ internalType: 'book', internalId: id, title: '', selectedProjectIds: [] });
      refreshAllData();
      setMessage({ type: 'success', text: '书籍已删除' });
    }
  };

  // 评论可见性：显示
  const handleShowComment = (commentId: string) => {
    if (updateCommentStatus(commentId, 'approved')) {
      refreshAllData();
      setMessage({ type: 'success', text: '已设置为：显示' });
    }
  };

  // 评论可见性：不显示
  const handleHideComment = (commentId: string) => {
    if (updateCommentStatus(commentId, 'rejected')) {
      refreshAllData();
      setMessage({ type: 'success', text: '已设置为：不显示' });
    }
  };

  // 撤回管理员回复（清空 reply）
  const handleWithdrawReply = (commentId: string) => {
    if (replyComment(commentId, '')) {
      refreshAllData();
      setMessage({ type: 'success', text: '管理员回复已撤回' });
    }
  };

  // 打开回复评论对话框
  const handleOpenReplyModal = (comment: Comment) => {
    setReplyingComment(comment);
    setReplyText(comment.reply || '');
    setShowCommentReplyModal(true);
  };

  // 提交回复
  const handleSubmitReply = () => {
    if (!replyingComment) return;
    
    if (replyComment(replyingComment.id, replyText)) {
      refreshAllData();
      setMessage({ type: 'success', text: '回复已保存' });
      setShowCommentReplyModal(false);
      setReplyingComment(null);
      setReplyText('');
    }
  };

  return (
    <div className="h-screen bg-gray-50 flex overflow-hidden">
      {/* 移动端菜单遮罩 */}
      {!isEmbedded && isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* 侧边栏（嵌入模式下隐藏） */}
      {!isEmbedded && (
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50
        bg-gradient-to-b from-gray-900 to-gray-800
        text-white transition-all duration-300 ease-in-out
        ${sidebarOpen ? 'w-64' : 'w-20'}
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        flex flex-col
      `}>
        {/* Logo区域 */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-gray-700">
          {sidebarOpen && (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <span className="text-white font-bold text-lg">益</span>
              </div>
              <span className="font-semibold">益语智库管理后台</span>
            </div>
          )}
          <button 
            onClick={() => setIsMobileMenuOpen(false)}
            className="lg:hidden p-2 hover:bg-gray-700 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 菜单列表（可滚动） */}
        <nav className="p-4 space-y-2 flex-1 overflow-y-auto">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActiveMenu(item.id);
                setIsMobileMenuOpen(false);
              }}
              className={`
                w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all
                ${activeMenu === item.id 
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30' 
                  : 'text-gray-300 hover:bg-gray-700/50 hover:text-white'
                }
              `}
            >
              <span className="flex-shrink-0">{item.icon}</span>
              {sidebarOpen && (
                <>
                  <span className="flex-1 text-left">{item.label}</span>
                  {item.badge && (
                    <span className="px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
                      {item.badge}
                    </span>
                  )}
                  {activeMenu === item.id && (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </>
              )}
            </button>
          ))}
        </nav>

      </aside>
      )}


      {/* 主内容区 */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* 顶部栏 */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
          <div className="flex items-center gap-4">
            {!isEmbedded && (
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden p-2 hover:bg-gray-100 rounded-lg"
            >
              <Menu className="w-5 h-5" />
            </button>
            )}

            {!isEmbedded && (
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="hidden lg:flex p-2 hover:bg-gray-100 rounded-lg"
            >
              <Menu className="w-5 h-5" />
            </button>
            )}

            <h1 className="text-xl font-semibold text-gray-900">
              {menuItems.find(item => item.id === activeMenu)?.label || '管理后台'}
            </h1>
          </div>
          
          <div className="flex items-center gap-4">
            <button
              onClick={onLogout}
              className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-gray-200 text-gray-800 hover:bg-gray-50 transition-colors"
              title="退出登录"
            >
              <LogOut className="w-4 h-4" />
              <span className="text-sm font-medium">退出登录</span>
            </button>

            <button
              onClick={onNavigateHome}
              className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-900 text-white hover:bg-gray-800 transition-colors"
              title="回到首页"
            >
              <Globe className="w-4 h-4" />
              <span className="text-sm font-medium">回到首页</span>
            </button>

            <button 
              onClick={refreshAllData}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="刷新数据"
            >
              <RefreshCw className="w-5 h-5 text-gray-600" />
            </button>
            
            <button className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <Bell className="w-5 h-5 text-gray-600" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
            </button>
            
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-medium">
                管
              </div>
              <div className="hidden sm:block">
                <p className="text-sm font-medium text-gray-900">管理员</p>
                <p className="text-xs text-gray-500">超级管理员</p>
              </div>
            </div>
          </div>
        </header>

        {/* 页面内容（自适应全屏 + 可滚动） */}
        <main className="flex-1 min-h-0 p-6 overflow-auto">
          {activeMenu === 'dashboard' && (
            <div className="space-y-6">
              {/* 消息提示（保留） */}
              {message && (
                <div className={`p-4 rounded-xl flex items-center gap-2 ${
                  message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                }`}>
                  {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                  {message.text}
                </div>
              )}

              {/* 新静态运营中枢壳（不接数据） */}
              <AdminOpsCenterDashboard />
            </div>
          )}

          {/* 洞察文章管理 */}
          {activeMenu === 'insights' && (
            <div className="space-y-6">
              {message && (
                <div className={`p-4 rounded-xl flex items-center gap-2 ${
                  message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                }`}>
                  {message.text}
                </div>
              )}

              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <div className="flex flex-wrap gap-4 items-center justify-between">
                  <div className="flex flex-wrap gap-4 items-center flex-1">
                    <div className="relative flex-1 min-w-64">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        placeholder="搜索文章..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>

                    {/* 全部标签（四类，可多选） */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setTopicFilterOpen((v) => !v)}
                        className="px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                        title="全部标签（可多选）"
                      >
                        {filterTopics.length === 0 ? '全部标签' : `标签：${filterTopics.join('、')}`}
                      </button>

                      {topicFilterOpen && (
                        <div className="absolute z-20 mt-2 w-56 rounded-xl border border-gray-200 bg-white shadow-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <div className="text-sm font-medium text-gray-800">全部标签</div>
                            <button
                              type="button"
                              onClick={() => setFilterTopics([])}
                              className="text-xs text-gray-500 hover:text-gray-800"
                            >
                              清空
                            </button>
                          </div>
                          <div className="space-y-2">
                            {RESOURCE_TOPICS.map((t) => {
                              const checked = filterTopics.includes(t);
                              return (
                                <label key={t} className="flex items-center gap-2 text-sm text-gray-800 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={(e) => {
                                      const on = e.target.checked;
                                      setFilterTopics((prev) => (on ? Array.from(new Set([...prev, t])) : prev.filter((x) => x !== t)));
                                    }}
                                    className="w-4 h-4 text-purple-600 rounded"
                                  />
                                  <span>{t}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <button
                    onClick={() => {
                      setEditingItem(null);
                      setSyncClientIds([]);
                      setShowInsightForm(true);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors"
                  >
                    <Plus className="w-5 h-5" />
                    添加文章
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">标题</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">分类</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">作者</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">发布时间</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">状态</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">数据</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filterContent(insights).map((article) => (
                        <tr key={article.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              {/* featured removed (topics-only schema) */}
                              <div>
                                <p className="font-medium text-gray-900">{article.title}</p>
                                <p className="text-sm text-gray-500 truncate max-w-xs">{article.excerpt}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                              {(article.topics || []).join(' / ')}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            —
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {article.publishDate}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                              article.status === 'published' ? 'bg-green-100 text-green-700' :
                              article.status === 'draft' ? 'bg-amber-100 text-amber-700' :
                              'bg-gray-100 text-gray-600'
                            }`}>
                              {article.status === 'published' ? '已发布' : article.status === 'draft' ? '草稿' : '已归档'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-3 text-sm text-gray-500">
                              <span className="flex items-center gap-1">
                                <Eye className="w-4 h-4" /> {article.views}
                              </span>
                              <span className="flex items-center gap-1">
                                <User className="w-4 h-4" /> {article.likes}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-1">
                              <button 
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600"
                                onClick={() => {
                                  setEditingItem(article);
                                  setSyncClientIds([]);
                                  (async () => {
                                    try {
                                      const all = await getCourseRecommendations();
                                      const ids = (all || [])
                                        .filter(r => r.type === 'internal' && r.internalType === 'article' && r.internalId === article.id)
                                        .map(r => r.projectId);
                                      setSyncClientIds(ids);
                                    } catch {}
                                  })();
                                  setShowInsightForm(true);
                                }}
                                title="编辑"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button 
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600"
                                title="预览"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button 
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-red-500"
                                onClick={() => handleDeleteInsight(article.id)}
                                title="删除"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                {filterContent(insights).length === 0 && (
                  <div className="p-12 text-center text-gray-500">
                    <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>暂无文章</p>
                    <p className="text-sm mt-2">点击上方按钮添加新文章</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 益语方法论管理 */}
          {activeMenu === 'methodologies' && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <div className="flex flex-wrap gap-4 items-center justify-between">
                  <div className="flex flex-wrap gap-4 items-center flex-1">
                    <div className="relative flex-1 min-w-64">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        placeholder="搜索方法论..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>

                    {/* 全部标签（四类，可多选） */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setTopicFilterOpen((v) => !v)}
                        className="px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                        title="全部标签（可多选）"
                      >
                        {filterTopics.length === 0 ? '全部标签' : `标签：${filterTopics.join('、')}`}
                      </button>

                      {topicFilterOpen && (
                        <div className="absolute z-20 mt-2 w-56 rounded-xl border border-gray-200 bg-white shadow-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <div className="text-sm font-medium text-gray-800">全部标签</div>
                            <button
                              type="button"
                              onClick={() => setFilterTopics([])}
                              className="text-xs text-gray-500 hover:text-gray-800"
                            >
                              清空
                            </button>
                          </div>
                          <div className="space-y-2">
                            {RESOURCE_TOPICS.map((t) => {
                              const checked = filterTopics.includes(t);
                              return (
                                <label key={t} className="flex items-center gap-2 text-sm text-gray-800 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={(e) => {
                                      const on = e.target.checked;
                                      setFilterTopics((prev) => (on ? Array.from(new Set([...prev, t])) : prev.filter((x) => x !== t)));
                                    }}
                                    className="w-4 h-4 text-purple-600 rounded"
                                  />
                                  <span>{t}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setEditingItem(null);
                      setSyncClientIds([]);
                      setShowMethodologyForm(true);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors"
                  >
                    <Plus className="w-5 h-5" />
                    添加方法论
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">标题</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">修改时间</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">状态</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filterContent(methodologies).map((item) => (
                        <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4">
                            <div>
                              <p className="font-medium text-gray-900">{item.title}</p>
                              <p className="text-sm text-gray-500 truncate max-w-xs">{item.excerpt}</p>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{item.publishDate}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                              item.status === 'published' ? 'bg-green-100 text-green-700' :
                              item.status === 'draft' ? 'bg-amber-100 text-amber-700' :
                              'bg-gray-100 text-gray-600'
                            }`}>
                              {item.status === 'published' ? '已发布' : item.status === 'draft' ? '草稿' : '已归档'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <button
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-blue-600"
                                onClick={() => {
                                  setEditingItem(item as any);
                                  setShowMethodologyForm(true);
                                }}
                                title="编辑"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-red-500"
                                onClick={() => {
                                  if (window.confirm('确定要删除这条方法论吗？')) {
                                    deleteMethodologyFromService(item.id);
                                    refreshAllData();
                                    setMessage({ type: 'success', text: '方法论已删除' });
                                  }
                                }}
                                title="删除"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {filterContent(methodologies).length === 0 && (
                  <div className="p-12 text-center text-gray-500">
                    <Tag className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>暂无方法论</p>
                    <p className="text-sm mt-2">点击上方按钮添加新方法论</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 报告管理 */}
          {activeMenu === 'reports' && (
            <div className="space-y-6">
              {message && (
                <div className={`p-4 rounded-xl flex items-center gap-2 ${
                  message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                }`}>
                  {message.text}
                </div>
              )}

              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <div className="flex flex-wrap gap-4 items-center justify-between">
                  <div className="flex flex-wrap gap-4 items-center flex-1">
                    <div className="relative flex-1 min-w-64">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        placeholder="搜索报告..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>

                    {/* 全部标签（四类，可多选） */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setTopicFilterOpen((v) => !v)}
                        className="px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                        title="全部标签（可多选）"
                      >
                        {filterTopics.length === 0 ? '全部标签' : `标签：${filterTopics.join('、')}`}
                      </button>

                      {topicFilterOpen && (
                        <div className="absolute z-20 mt-2 w-56 rounded-xl border border-gray-200 bg-white shadow-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <div className="text-sm font-medium text-gray-800">全部标签</div>
                            <button
                              type="button"
                              onClick={() => setFilterTopics([])}
                              className="text-xs text-gray-500 hover:text-gray-800"
                            >
                              清空
                            </button>
                          </div>
                          <div className="space-y-2">
                            {RESOURCE_TOPICS.map((t) => {
                              const checked = filterTopics.includes(t);
                              return (
                                <label key={t} className="flex items-center gap-2 text-sm text-gray-800 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={(e) => {
                                      const on = e.target.checked;
                                      setFilterTopics((prev) => (on ? Array.from(new Set([...prev, t])) : prev.filter((x) => x !== t)));
                                    }}
                                    className="w-4 h-4 text-purple-600 rounded"
                                  />
                                  <span>{t}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <button
                    onClick={() => {
                      setEditingItem(null);
                      setCoverImage(null);
                      setReportPages(0);
                      setCalculatedReadTime('');
                      setReportStatus('published');
                      setSyncClientIds([]);
                      setShowReportForm(true);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors"
                  >
                    <Plus className="w-5 h-5" />
                    添加报告
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">报告信息</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">发布机构</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">分类</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">版本</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">页数</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">阅读时间</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">数据</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filterContent(reports).map((report) => (
                        <tr key={report.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              {/* isHot removed (topics-only schema) */}
                              <div>
                                <p className="font-medium text-gray-900">{report.title}</p>
                                <p className="text-sm text-gray-500 truncate max-w-xs">{report.summary}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {report.publisher}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="px-3 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                              {(report.topics || []).join(' / ')}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {report.version}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {report.pages || '-'} 页
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {report.pages ? calculateReadTime(report.pages) : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-3 text-sm text-gray-500">
                              <span className="flex items-center gap-1">
                                <Eye className="w-4 h-4" /> {report.views}
                              </span>
                              <span className="flex items-center gap-1">
                                <Download className="w-4 h-4" /> {report.downloads}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-1">
                              <button 
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600"
                                onClick={() => {
                                  setEditingItem(report);
                                  setCoverImage(report.coverImage);
                                  setReportPages(report.pages || 0);
                                  setCalculatedReadTime(report.pages ? calculateReadTime(report.pages) : '');
                                  setSyncClientIds([]);
                                  (async () => {
                                    try {
                                      const all = await getCourseRecommendations();
                                      const ids = (all || [])
                                        .filter(r => r.type === 'internal' && r.internalType === 'report' && r.internalId === report.id)
                                        .map(r => r.projectId);
                                      setSyncClientIds(ids);
                                    } catch {}
                                  })();
                                  setShowReportForm(true);
                                }}
                                title="编辑"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button 
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600"
                                title="下载文件"
                              >
                                <Download className="w-4 h-4" />
                              </button>
                              <button 
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-red-500"
                                onClick={() => handleDeleteReport(report.id)}
                                title="删除"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                {filterContent(reports).length === 0 && (
                  <div className="p-12 text-center text-gray-500">
                    <Folder className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>暂无报告</p>
                    <p className="text-sm mt-2">点击上方按钮添加新报告</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 书籍管理 */}
          {activeMenu === 'books' && (
            <div className="space-y-6">
              {message && (
                <div className={`p-4 rounded-xl flex items-center gap-2 ${
                  message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                }`}>
                  {message.text}
                </div>
              )}

              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <div className="flex flex-wrap gap-4 items-center justify-between">
                  <div className="flex flex-wrap gap-4 items-center flex-1">
                    <div className="relative flex-1 min-w-64">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        placeholder="搜索书籍..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>

                    {/* 全部标签（四类，可多选） */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setTopicFilterOpen((v) => !v)}
                        className="px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                        title="全部标签（可多选）"
                      >
                        {filterTopics.length === 0 ? '全部标签' : `标签：${filterTopics.join('、')}`}
                      </button>

                      {topicFilterOpen && (
                        <div className="absolute z-20 mt-2 w-56 rounded-xl border border-gray-200 bg-white shadow-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <div className="text-sm font-medium text-gray-800">全部标签</div>
                            <button
                              type="button"
                              onClick={() => setFilterTopics([])}
                              className="text-xs text-gray-500 hover:text-gray-800"
                            >
                              清空
                            </button>
                          </div>
                          <div className="space-y-2">
                            {RESOURCE_TOPICS.map((t) => {
                              const checked = filterTopics.includes(t);
                              return (
                                <label key={t} className="flex items-center gap-2 text-sm text-gray-800 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={(e) => {
                                      const on = e.target.checked;
                                      setFilterTopics((prev) => (on ? Array.from(new Set([...prev, t])) : prev.filter((x) => x !== t)));
                                    }}
                                    className="w-4 h-4 text-purple-600 rounded"
                                  />
                                  <span>{t}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <button
                    onClick={() => {
                      setEditingItem(null);
                      setBookCoverImage(null);
                      setSyncClientIds([]);
                      setShowBookForm(true);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors"
                  >
                    <Plus className="w-5 h-5" />
                    添加书籍
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">书籍信息</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">作者</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">分类</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">页数/时长</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">评分</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">数据</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filterContent(books).map((book) => (
                        <tr key={book.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-14 rounded-lg bg-gradient-to-br ${book.coverColor || 'from-blue-600 to-indigo-800'} flex items-center justify-center text-white font-bold text-lg`}>
                                {book.title.charAt(1)}
                              </div>
                              <div>
                                <p className="font-medium text-gray-900">{book.title}</p>
                                <p className="text-sm text-gray-500 truncate max-w-xs">{book.description}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {book.author}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="px-3 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">
                              {(book.topics || []).join(' / ')}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {book.pages}页 / {book.duration}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-1">
                              <span className="text-amber-500">★</span>
                              <span className="font-medium">{book.rating}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-3 text-sm text-gray-500">
                              <span className="flex items-center gap-1">
                                <Eye className="w-4 h-4" /> {book.views}
                              </span>
                              <span className="flex items-center gap-1">
                                <User className="w-4 h-4" /> {book.reviews}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-1">
                              <button 
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600"
                                onClick={() => {
                                  setEditingItem(book);
                                  setBookCoverImage(book.coverImage || null);
                                  setSyncClientIds([]);
                                  (async () => {
                                    try {
                                      const all = await getCourseRecommendations();
                                      const ids = (all || [])
                                        .filter(r => r.type === 'internal' && r.internalType === 'book' && r.internalId === book.id)
                                        .map(r => r.projectId);
                                      setSyncClientIds(ids);
                                    } catch {}
                                  })();
                                  setShowBookForm(true);
                                }}
                                title="编辑"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button 
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600"
                                title="上传文件"
                              >
                                <Upload className="w-4 h-4" />
                              </button>
                              <button 
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-red-500"
                                onClick={() => handleDeleteBook(book.id)}
                                title="删除"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                {filterContent(books).length === 0 && (
                  <div className="p-12 text-center text-gray-500">
                    <BookOpen className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>暂无书籍</p>
                    <p className="text-sm mt-2">点击上方按钮添加新书籍</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 分类管理（已停用）：统一标签体系切换中，避免继续产生旧分类 */}
          {activeMenu === 'categories' && (
            <div className="space-y-6">
              <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-2xl p-6">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 mt-0.5" />
                  <div>
                    <div className="font-semibold">分类管理已停用</div>
                    <div className="text-sm mt-1">
                      当前正在切换到统一的四类标签体系（战略 / 业务设计 / 组织 / AI 技术）。
                      为避免新增旧分类导致数据混乱，分类管理暂时不开放编辑。
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 邀请码管理 */}
          {activeMenu === 'invite-codes' && (
            <div className="space-y-6">
              {message && (
                <div className={`p-4 rounded-xl flex items-center gap-2 ${
                  message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                }`}>
                  {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                  {message.text}
                </div>
              )}
              
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">生成邀请码</h3>
                
                <div className="flex flex-wrap gap-4 items-end">
                  <div className="flex-1 min-w-48">
                    <label className="block text-sm font-medium text-gray-700 mb-2">邀请码类型</label>
                    <select 
                      value={selectedType}
                      onChange={(e) => {
                        console.log('选择的类型:', e.target.value);
                        setSelectedType(e.target.value as InviteCodeType);
                      }}
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                    >
                      {Object.entries(INVITE_CODE_TYPES).map(([key, config]) => (
                        <option key={key} value={key}>
                          {config.label} - {config.description}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="w-40">
                    <label className="block text-sm font-medium text-gray-700 mb-2">最大使用次数</label>
                    <input
                      type="number"
                      value={maxUses}
                      onChange={(e) => setMaxUses(Math.max(1, parseInt(e.target.value) || 1))}
                      min={1}
                      max={100}
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <button 
                    onClick={handleGenerateCode}
                    disabled={isGenerating}
                    className="flex items-center gap-2 px-6 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors disabled:opacity-50"
                  >
                    {isGenerating ? (
                      <>
                        <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        生成中...
                      </>
                    ) : (
                      <>
                        <Plus className="w-5 h-5" />
                        生成邀请码
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex items-center justify-between gap-3">
                  <h3 className="text-lg font-semibold text-gray-900">邀请码列表</h3>
                  <div className="flex items-center gap-2 flex-wrap justify-end">
                    <button
                      onClick={() => {
                        const selected = inviteCodes.filter((c) => selectedInviteIds.includes(c.id));
                        const rows = selected.length > 0 ? selected : inviteCodes;
                        exportInviteCodesCsv(rows);
                      }}
                      className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors text-gray-600"
                      title="导出为 CSV（Excel 可直接打开）"
                    >
                      导出 Excel
                    </button>
                    <button
                      onClick={() => setSelectedInviteIds(inviteCodes.map((c) => c.id))}
                      className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors text-gray-600"
                    >
                      全选
                    </button>
                    <button
                      onClick={() => setSelectedInviteIds([])}
                      className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors text-gray-600"
                    >
                      清空
                    </button>
                    <button 
                      onClick={loadInviteCodes}
                      className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors text-gray-600"
                    >
                      <RefreshCw className="w-5 h-5" />
                      刷新
                    </button>
                  </div>
                </div>
                
                {inviteCodes.length === 0 ? (
                  <div className="p-12 text-center text-gray-500">
                    <Gift className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>暂无邀请码</p>
                    <p className="text-sm mt-2">点击上方按钮生成新的邀请码</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            <input
                              type="checkbox"
                              checked={selectedInviteIds.length > 0 && selectedInviteIds.length === inviteCodes.length}
                              onChange={(e) => {
                                setSelectedInviteIds(e.target.checked ? inviteCodes.map((c) => c.id) : []);
                              }}
                            />
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">邀请码</th>
                          <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">类型</th>
                          <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">使用情况</th>
                          <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">奖励时长</th>
                          <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">状态</th>
                          <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">创建时间</th>
                          <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {inviteCodes.map((code) => {
                          const typeInfo = getTypeInfo(code.type as InviteCodeType);
                          const statusInfo = getStatusInfo(code.status);
                          
                          return (
                            <tr key={code.id} className="hover:bg-gray-50 transition-colors">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <input
                                  type="checkbox"
                                  checked={selectedInviteIds.includes(code.id)}
                                  onChange={(e) => {
                                    const on = e.target.checked;
                                    setSelectedInviteIds((prev) =>
                                      on ? Array.from(new Set([...prev, code.id])) : prev.filter((x) => x !== code.id)
                                    );
                                  }}
                                />
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center gap-2">
                                  <code className="font-mono font-medium text-gray-900">{code.code}</code>
                                  <button 
                                    className="p-1 hover:bg-gray-100 rounded transition-colors"
                                    onClick={() => handleCopyCode(code.code)}
                                    title="复制"
                                  >
                                    <Copy className="w-4 h-4 text-gray-400" />
                                  </button>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${typeInfo.color}`}>
                                  {typeInfo.label}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                {code.usedCount} / {code.maxUses}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                {typeInfo.days}天
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 w-fit ${statusInfo.color}`}>
                                  {statusInfo.icon}
                                  {statusInfo.label}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                {new Date(code.createdAt).toLocaleString('zh-CN')}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center gap-1">
                                  <button 
                                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600"
                                    onClick={() => handleCopyCode(code.code)}
                                    title="复制"
                                  >
                                    <Copy className="w-4 h-4" />
                                  </button>
                                  {code.status === 'valid' && (
                                    <button 
                                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-amber-600"
                                      onClick={() => handleDisableCode(code.code)}
                                      title="禁用"
                                    >
                                      <XCircle className="w-4 h-4" />
                                    </button>
                                  )}
                                  <button 
                                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-red-500"
                                    onClick={() => handleDeleteCode(code.code)}
                                    title="删除"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 用户管理 */}
          {activeMenu === 'user-management' && (
            <UserManagementPage />
          )}

          {/* 战略客户管理（已替换为新设计后台页） */}
          {activeMenu === 'strategy-companion' && (
            <AdminStrategyCompanionConceptPage showHeader={false} />
          )}

          {/* 系统设置 */}
          {activeMenu === 'settings' && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <div className="flex items-start justify-between gap-6">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">AI 封面生成设置</h2>
                    <p className="text-sm text-gray-500 mt-1">
                      使用 Hugging Face Inference API（免费额度）为文章/报告生成封面。Token 仅保存在你的浏览器本地，不会提交到代码仓库。
                    </p>
                    <p className="text-xs text-amber-600 mt-2">
                      注意：这是演示方案。若需更安全的生产方案，建议后续加服务端代理隐藏 Token。
                    </p>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Hugging Face Token</label>
                    <input
                      type="password"
                      defaultValue={getHfToken()}
                      placeholder="hf_..."
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                      onBlur={(e) => {
                        setHfToken(e.target.value);
                        setMessage({ type: 'success', text: 'HF Token 已保存到本机浏览器' });
                      }}
                    />
                    <p className="text-xs text-gray-500 mt-2">粘贴后点击页面空白处即可保存（onBlur）。</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">生成模型（可选）</label>
                    <input
                      type="text"
                      defaultValue={getHfModel()}
                      placeholder="stabilityai/stable-diffusion-xl-base-1.0"
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                      onBlur={(e) => {
                        setHfModel(e.target.value);
                        setMessage({ type: 'success', text: 'HF 模型已保存到本机浏览器' });
                      }}
                    />
                    <p className="text-xs text-gray-500 mt-2">默认：SDXL base。后续我们可换成更快/更写实的模型。</p>
                  </div>
                </div>

                <div className="mt-6 flex items-center gap-3">
                  <button
                    className="px-4 py-2 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-colors text-sm font-medium"
                    onClick={async () => {
                      try {
                        const dataUrl = await generateCoverImage({
                          title: '测试封面：战略前哨周报',
                          excerpt: '用于验证 Hugging Face 生图链路与封面比例适配。',
                          tags: ['战略', '洞察', '周报'],
                        });
                        // quick preview
                        const w = window.open('about:blank');
                        if (w) {
                          w.document.write(`<img src="${dataUrl}" style="max-width:100%" />`);
                        }
                        setMessage({ type: 'success', text: '测试生成成功（已打开预览窗口）' });
                      } catch (e: any) {
                        setMessage({ type: 'error', text: '测试生成失败：' + (e?.message || String(e)) });
                      }
                    }}
                  >
                    测试生成
                  </button>
                  <span className="text-xs text-gray-500">如果失败，通常是 Token/额度/模型不可用。</span>
                </div>
              </div>

              <SettingsPage onBack={() => setActiveMenu('dashboard')} />
            </div>
          )}

          {/* 会员管理与用户管理同页：保留兼容但隐藏菜单入口 */}
          {['membership'].includes(activeMenu) && (
            <div className="h-full">
              <UserManagementPage />
            </div>
          )}

          {/* 评论管理 */}
          {activeMenu === 'comments' && (
            <div className="space-y-6">
              {message && (
                <div className={`p-4 rounded-xl flex items-center gap-2 ${
                  message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                }`}>
                  {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                  {message.text}
                </div>
              )}

              {/* 统计卡片 */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl p-4 border border-gray-100">
                  <p className="text-sm text-gray-500 mb-1">总评论数</p>
                  <p className="text-2xl font-bold text-gray-900">{comments.length}</p>
                </div>
                <div className="bg-white rounded-xl p-4 border border-gray-100">
                  <p className="text-sm text-gray-500 mb-1">总显示数</p>
                  <p className="text-2xl font-bold text-green-600">
                    {comments.filter(c => c.status === 'approved').length}
                  </p>
                </div>
                <div className="bg-white rounded-xl p-4 border border-gray-100">
                  <p className="text-sm text-gray-500 mb-1">总回复数</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {comments.filter(c => Boolean(c.reply && c.reply.trim())).length}
                  </p>
                </div>
                <div className="bg-white rounded-xl p-4 border border-gray-100">
                  <p className="text-sm text-gray-500 mb-1">未审核数</p>
                  <p className="text-2xl font-bold text-amber-600">
                    {comments.filter(c => c.status === 'pending').length}
                  </p>
                </div>
              </div>

              {/* 筛选栏 */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <div className="flex flex-wrap gap-4 items-center">
                  <div className="relative flex-1 min-w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="搜索评论内容或用户名..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  
                  <select
                    value={commentStatusFilter}
                    onChange={(e) => setCommentStatusFilter(e.target.value as any)}
                    className="px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                  >
                    <option value="all">全部状态</option>
                    <option value="pending">未审核</option>
                    <option value="approved">显示</option>
                    <option value="rejected">不显示</option>
                    <option value="has_reply">有回复</option>
                  </select>
                </div>
              </div>

              {/* 评论列表 */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                {comments
                  .filter(comment => {
                    const matchesSearch = !searchQuery || 
                      comment.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      comment.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      comment.contentTitle.toLowerCase().includes(searchQuery.toLowerCase());
                    const matchesStatus = (
                      commentStatusFilter === 'all'
                        ? true
                        : commentStatusFilter === 'has_reply'
                          ? Boolean(comment.reply && comment.reply.trim())
                          : comment.status === commentStatusFilter
                    );
                    return matchesSearch && matchesStatus;
                  })
                  .length === 0 ? (
                  <div className="p-12 text-center text-gray-500">
                    <MessageSquare className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>暂无评论</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {comments
                      .filter(comment => {
                        const matchesSearch = !searchQuery || 
                          comment.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          comment.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          comment.contentTitle.toLowerCase().includes(searchQuery.toLowerCase());
                        const matchesStatus = (
                          commentStatusFilter === 'all'
                            ? true
                            : commentStatusFilter === 'has_reply'
                              ? Boolean(comment.reply && comment.reply.trim())
                              : comment.status === commentStatusFilter
                        );
                        return matchesSearch && matchesStatus;
                      })
                      .map((comment) => (
                        <div key={comment.id} className="p-6 hover:bg-gray-50 transition-colors">
                          {/* 评论头部 */}
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-start gap-3 flex-1">
                              {/* 用户头像 */}
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-medium flex-shrink-0">
                                {comment.userName.charAt(0)}
                              </div>
                              
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-medium text-gray-900">{comment.userName}</span>
                                  <span className="text-xs text-gray-400">•</span>
                                  <span className="text-xs text-gray-500">
                                    {new Date(comment.createdAt).toLocaleString('zh-CN')}
                                  </span>
                                </div>
                                
                                {/* 关联内容 */}
                                <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                                  <span className={`px-2 py-0.5 rounded text-xs ${
                                    comment.contentType === 'insight' ? 'bg-blue-100 text-blue-700' :
                                    comment.contentType === 'report' ? 'bg-green-100 text-green-700' :
                                    'bg-purple-100 text-purple-700'
                                  }`}>
                                    {comment.contentType === 'insight' ? '洞察' : 
                                     comment.contentType === 'report' ? '报告' : '书籍'}
                                  </span>
                                  <span className="truncate">{comment.contentTitle}</span>
                                </div>
                                
                                {/* 评论内容 */}
                                <p className="text-gray-700 mb-2">{comment.text}</p>
                                
                                {/* 管理员回复 */}
                                {comment.reply && (
                                  <div className="mt-3 p-3 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                                    <p className="text-sm font-medium text-blue-900 mb-1">管理员回复：</p>
                                    <p className="text-sm text-blue-800">{comment.reply}</p>
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            {/* 状态标签 */}
                            <span className={`px-3 py-1 rounded-full text-xs font-medium flex-shrink-0 ${
                              comment.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                              comment.status === 'approved' ? 'bg-green-100 text-green-700' :
                              'bg-red-100 text-red-700'
                            }`}>
                              {comment.status === 'pending' ? '未审核' :
                               comment.status === 'approved' ? '显示' : '不显示'}
                            </span>
                          </div>
                          
                          {/* 操作按钮 */}
                          <div className="flex items-center gap-2 mt-3">
                            <button
                              onClick={() => handleShowComment(comment.id)}
                              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg transition-colors text-sm ${
                                comment.status === 'approved'
                                  ? 'bg-green-600 text-white hover:bg-green-700'
                                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                              }`}
                            >
                              <CheckCircle className="w-4 h-4" />
                              显示
                            </button>
                            <button
                              onClick={() => handleHideComment(comment.id)}
                              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg transition-colors text-sm ${
                                comment.status === 'rejected'
                                  ? 'bg-red-600 text-white hover:bg-red-700'
                                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                              }`}
                            >
                              <XCircle className="w-4 h-4" />
                              不显示
                            </button>

                            <button
                              onClick={() => handleOpenReplyModal(comment)}
                              className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                            >
                              <MessageSquare className="w-4 h-4" />
                              {comment.reply ? '修改回复' : '回复'}
                            </button>

                            {comment.reply && (
                              <button
                                onClick={() => handleWithdrawReply(comment.id)}
                                className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                              >
                                <RotateCcw className="w-4 h-4" />
                                撤回
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 添加/编辑报告表单模态框 */}
          {showReportForm && (
            <ReportFormModal
              editingItem={editingItem as Report | null}
              coverImage={coverImage}
              setCoverImage={setCoverImage}
              reportPages={reportPages}
              setReportPages={setReportPages}
              calculatedReadTime={calculatedReadTime}
              onClose={() => {
                setShowReportForm(false);
                setEditingItem(null);
                setCoverImage(null);
                setReportPages(0);
                setCalculatedReadTime('');
                setReportFile(null);
                setReportStatus('published');
              }}
              onSave={handleSaveReport}
              fileInputRef={fileInputRef}
              coverInputRef={coverInputRef}
              handleCoverButtonClick={handleCoverButtonClick}
              handleCoverImageSelect={handleCoverImageSelect}
              strategyClients={strategyClients}
              syncClientIds={syncClientIds}
              setSyncClientIds={setSyncClientIds}
              reportFile={reportFile}
              setReportFile={setReportFile}
              setCalculatedReadTime={setCalculatedReadTime}
              reportStatus={reportStatus}
              setReportStatus={setReportStatus}
              reportFileInputRef={reportFileInputRef}
              handleReportFileButtonClick={handleReportFileButtonClick}
              handleReportFileSelect={handleReportFileSelect}
            />
          )}

          {/* 添加/编辑洞察文章表单模态框 */}
          {showInsightForm && (
            <InsightFormModal
              editingItem={editingItem as InsightArticle | null}
              onClose={() => {
                setShowInsightForm(false);
                setEditingItem(null);
              }}
              onSave={async (e: React.FormEvent<HTMLFormElement>) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);

                const selectedTopics = (formData.getAll('topics') as string[]).map(s => s.trim()).filter(Boolean) as any;
                const current = editingItem as InsightArticle | null;

                const articleData: Partial<InsightArticle> = {
                  id: current ? current.id : undefined,
                  title: (formData.get('title') as string) || current?.title || '待补充',
                  excerpt: (formData.get('excerpt') as string) || current?.excerpt || '待补充',
                  content: (formData.get('content') as string) || current?.content || '',
                  topics: selectedTopics.length > 0 ? (selectedTopics as any) : (current?.topics || ['战略']),
                  publishDate: (formData.get('publishDate') as string) || current?.publishDate || new Date().toISOString().split('T')[0],
                  status: (formData.get('status') as 'draft' | 'published') || current?.status || 'draft',
                  showOnHome: formData.get('showOnHome') === 'on',
                  coverImage: (current as any)?.coverImage || 'images/placeholders/document.svg',

                  // Share settings (WeChat Moments etc.)
                  shareEnabled: formData.get('shareEnabled') === 'on',
                  shareSlug: (formData.get('shareSlug') as string) || undefined,
                  shareTitle: (formData.get('shareTitle') as string) || undefined,
                  shareDescription: (formData.get('shareDescription') as string) || undefined,
                  shareImage: (formData.get('shareImage') as string) || undefined,
                };

                const saved = saveInsight(articleData);
                await syncInternalCourseRecommendations({
                  internalType: 'article',
                  internalId: saved.id,
                  title: saved.title,
                  selectedProjectIds: syncClientIds,
                });
                refreshAllData();
                setShowInsightForm(false);
                setEditingItem(null);
                setMessage({ type: 'success', text: '文章已保存，前台洞察页面可见！' });
              }}
              strategyClients={strategyClients}
              syncClientIds={syncClientIds}
              setSyncClientIds={setSyncClientIds}
            />
          )}

          {/* 添加/编辑方法论表单模态框 */}
          {showMethodologyForm && (
            <InsightFormModal
              editingItem={editingItem as any}
              onClose={() => {
                setShowMethodologyForm(false);
                setEditingItem(null);
              }}
              onSave={async (e: React.FormEvent<HTMLFormElement>) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);

                const selectedTopics = (formData.getAll('topics') as string[]).map(s => s.trim()).filter(Boolean) as any;
                const current = editingItem as Methodology | null;

                const data: Partial<Methodology> = {
                  id: current ? current.id : undefined,
                  title: (formData.get('title') as string) || current?.title || '待补充',
                  excerpt: (formData.get('excerpt') as string) || current?.excerpt || '待补充',
                  content: (formData.get('content') as string) || current?.content || '',
                  topics: selectedTopics.length > 0 ? (selectedTopics as any) : (current?.topics || ['战略']),
                  publishDate: (formData.get('publishDate') as string) || current?.publishDate || new Date().toISOString().split('T')[0],
                  status: (formData.get('status') as 'draft' | 'published') || current?.status || 'draft',
                  showOnHome: formData.get('showOnHome') === 'on',
                  coverImage: (current as any)?.coverImage || 'images/placeholders/document.svg',
                };

                const saved = saveMethodology(data);
                await syncInternalCourseRecommendations({
                  internalType: 'methodology',
                  internalId: saved.id,
                  title: saved.title,
                  selectedProjectIds: syncClientIds,
                });

                refreshAllData();
                setShowMethodologyForm(false);
                setEditingItem(null);
                setMessage({ type: 'success', text: '方法论已保存！' });
              }}
              strategyClients={strategyClients}
              syncClientIds={syncClientIds}
              setSyncClientIds={setSyncClientIds}
            />
          )}

          {/* 添加/编辑书籍表单模态框 */}
          {showBookForm && (
            <BookFormModal
              editingItem={editingItem as Book | null}
              onClose={() => {
                setShowBookForm(false);
                setEditingItem(null);
                setBookCoverImage(null);
              }}
              onSave={async (e: React.FormEvent<HTMLFormElement>) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const selectedTopics = (formData.getAll('topics') as string[]).map(s => s.trim()).filter(Boolean) as any;

                const current = editingItem as Book | null;

                const bookData: Partial<Book> = {
                  id: current ? current.id : undefined,
                  title: (formData.get('title') as string) || current?.title || '待补充',
                  author: (formData.get('author') as string) || current?.author || '待补充',
                  description: (formData.get('description') as string) || current?.description || '待补充',
                  abstract: (formData.get('abstract') as string) || current?.abstract || '待补充',
                  topics: selectedTopics.length > 0 ? (selectedTopics as any) : (current?.topics || ['战略']),
                  rating: parseFloat(formData.get('rating') as string) || current?.rating || 4.5,
                  coverImage: bookCoverImage || current?.coverImage || 'images/placeholders/document.svg',
                  publishDate: (formData.get('publishDate') as string) || current?.publishDate || new Date().toISOString().split('T')[0],
                  status: (formData.get('status') as 'draft' | 'published') || current?.status || 'draft',
                  showOnHome: formData.get('showOnHome') === 'on',
                };
                
                const saved = saveBook(bookData);
                await syncInternalCourseRecommendations({
                  internalType: 'book',
                  internalId: saved.id,
                  title: saved.title,
                  selectedProjectIds: syncClientIds,
                });
                refreshAllData();
                setShowBookForm(false);
                setEditingItem(null);
                setBookCoverImage(null);
                setMessage({ type: 'success', text: '书籍已保存，前台书库可见！' });
              }}
              strategyClients={strategyClients}
              syncClientIds={syncClientIds}
              setSyncClientIds={setSyncClientIds}
              bookCoverImage={bookCoverImage}
              setBookCoverImage={setBookCoverImage}
              bookCoverFileInputRef={bookCoverFileInputRef}
              handleBookCoverButtonClick={handleBookCoverButtonClick}
              handleBookCoverImageSelect={handleBookCoverImageSelect}
            />
          )}

          {/* 评论回复模态框 */}
          {showCommentReplyModal && replyingComment && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl w-full max-w-2xl">
                <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">回复评论</h3>
                  <button
                    onClick={() => {
                      setShowCommentReplyModal(false);
                      setReplyingComment(null);
                      setReplyText('');
                    }}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>
                
                <div className="p-6 space-y-4">
                  {/* 原始评论 */}
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-sm font-medium">
                        {replyingComment.userName.charAt(0)}
                      </div>
                      <span className="font-medium text-gray-900">{replyingComment.userName}</span>
                    </div>
                    <p className="text-gray-700">{replyingComment.text}</p>
                  </div>
                  
                  {/* 回复输入 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      回复内容
                    </label>
                    <textarea
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      rows={4}
                      placeholder="请输入回复内容..."
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    />
                  </div>
                </div>
                
                <div className="p-6 border-t border-gray-200 flex justify-end gap-4">
                  <button
                    onClick={() => {
                      setShowCommentReplyModal(false);
                      setReplyingComment(null);
                      setReplyText('');
                    }}
                    className="px-6 py-3 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleSubmitReply}
                    disabled={!replyText.trim()}
                    className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <Send className="w-5 h-5" />
                    发送回复
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

// 报告表单模态框组件 - 实现用户的具体需求
interface ReportFormModalProps {
  editingItem: Report | null;
  coverImage: string | null;
  setCoverImage: React.Dispatch<React.SetStateAction<string | null>>;
  reportPages: number;
  setReportPages: React.Dispatch<React.SetStateAction<number>>;
  calculatedReadTime: string;
  setCalculatedReadTime: React.Dispatch<React.SetStateAction<string>>;
  onClose: () => void;
  onSave: (e: React.FormEvent<HTMLFormElement>) => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  coverInputRef: React.RefObject<HTMLDivElement>;
  handleCoverButtonClick: () => void;
  handleCoverImageSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  reportFile: File | null;
  setReportFile: React.Dispatch<React.SetStateAction<File | null>>;
  reportStatus: 'draft' | 'published';
  setReportStatus: React.Dispatch<React.SetStateAction<'draft' | 'published'>>;
  reportFileInputRef: React.RefObject<HTMLInputElement>;
  handleReportFileButtonClick: () => void;
  handleReportFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  strategyClients: ClientProject[];
  syncClientIds: string[];
  setSyncClientIds: React.Dispatch<React.SetStateAction<string[]>>;

}

function ReportFormModal({
  editingItem,
  coverImage,
  setCoverImage,
  reportPages,
  setReportPages,
  calculatedReadTime,
  setCalculatedReadTime,
  onClose,
  onSave,
  fileInputRef,
  coverInputRef,
  handleCoverButtonClick,
  handleCoverImageSelect,
  reportFile,
  setReportFile,
  reportStatus,
  setReportStatus,
  reportFileInputRef,
  handleReportFileButtonClick,
  handleReportFileSelect,
  strategyClients,
  syncClientIds,
  setSyncClientIds,
}: ReportFormModalProps) {
  // tags/usedTags 已废弃（统一改为 topics）。
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [isExtractingCover, setIsExtractingCover] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  // 处理报告文件拖放 - 简化版本，不自动提取
  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFile(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];

      // 检查是否为PDF文件
      if (!isValidPdfFile(file)) {
        alert('请上传 PDF 格式的文件');
        return;
      }

      setReportFile(file);
      setUploadSuccess(true);
      setTimeout(() => setUploadSuccess(false), 3000);
    }
  };

  // 处理报告文件拖放状态
  const handleFileDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFile(true);
  };

  const handleFileDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFile(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 overflow-auto">
      <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto my-8">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white z-10">
          <h3 className="text-lg font-semibold text-gray-900">
            {editingItem ? '编辑报告' : '添加报告'}
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        
        <form onSubmit={onSave} className="p-6 space-y-6">
          {/* 16:9 封面图上传 - 需求1：分离上传按钮和粘贴区域 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              封面图 <span className="text-gray-400 text-xs">(建议尺寸 1920x1080，16:9比例)</span>
            </label>

            {/* AI 生成封面（使用 Hugging Face 免费额度；token 存在浏览器本地） */}
            <div className="flex flex-wrap items-center gap-3 mb-3">
              <button
                type="button"
                className="px-4 py-2 rounded-lg bg-gray-900 text-white hover:bg-gray-800 transition-colors text-sm font-medium"
                onClick={async () => {
                  try {
                    const formEl = document.activeElement?.closest('form') as HTMLFormElement | null;
                    // Best-effort: read title/excerpt/tags from current form fields
                    const titleInput = document.querySelector('input[name="title"]') as HTMLInputElement | null;
                    const summaryInput = document.querySelector('textarea[name="summary"]') as HTMLTextAreaElement | null;
                    // 旧 tags 字段已废弃：用 topics 作为 prompt 关键词
                    const topicChecks = Array.from(document.querySelectorAll('input[name="topics"]')) as HTMLInputElement[];

                    const title = titleInput?.value || editingItem?.title || '报告封面';
                    const excerpt = summaryInput?.value || editingItem?.summary || '';
                    const tags = topicChecks.filter(c => c.checked).map(c => c.value).filter(Boolean);

                    const dataUrl = await generateCoverImage({ title, excerpt, tags });
                    setCoverImage(dataUrl);
                    alert('✅ AI 封面已生成并填充（请记得保存报告）');
                  } catch (e: any) {
                    alert('❌ AI 生成封面失败：' + (e?.message || String(e)) + '\n\n请先到「系统设置」填写 Hugging Face Token。');
                  }
                }}
              >
                AI 生成封面
              </button>

              <div className="text-xs text-gray-500">
                当前模型：<code className="px-1 py-0.5 bg-gray-100 rounded">{getHfModel()}</code>
              </div>
            </div>

            {coverImage ? (
              <div className="relative border-2 border-green-500 rounded-xl overflow-hidden group">
                <img 
                  src={coverImage} 
                  alt="封面图" 
                  className="w-full aspect-video object-cover"
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                  {/* 需求1：点击按钮重新上传 */}
                  <button 
                    type="button"
                    className="px-4 py-2 bg-white text-gray-900 rounded-lg hover:bg-gray-100 transition-colors text-sm font-medium"
                    onClick={handleCoverButtonClick}
                  >
                    重新上传
                  </button>
                  <button 
                    type="button"
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                    onClick={() => setCoverImage(null)}
                  >
                    删除图片
                  </button>
                </div>
                <div className="absolute top-3 right-3 bg-green-600 text-white text-xs px-2 py-1 rounded-full">
                  已设置
                </div>
              </div>
            ) : (
              <div 
                ref={coverInputRef}
                className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-green-500 transition-colors"
              >
                {/* 隐藏的文件输入 */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleCoverImageSelect}
                  className="hidden"
                />
                
                <div className="w-full aspect-video bg-gray-100 rounded-lg flex flex-col items-center justify-center text-gray-400">
                  <Image className="w-16 h-16 mb-3" />
                  <p className="text-base mb-3">点击下方按钮上传封面图</p>
                  
                  {/* 需求1：明确的上传按钮 - 点击触发文件夹选择 */}
                  <button
                    type="button"
                    onClick={handleCoverButtonClick}
                    className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors font-medium"
                  >
                    <Upload className="w-5 h-5" />
                    选择图片文件
                  </button>
                  
                  <p className="text-xs text-green-600 mt-4 font-medium">
                    💡 或者直接 Ctrl+V 粘贴图片到这里
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* 报告文件上传 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              报告文件 <span className="text-gray-400 text-xs">(支持 PDF 格式)</span>
            </label>

            {reportFile ? (
              <div className="border-2 border-green-500 bg-green-50 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="w-10 h-10 text-green-600" />
                    <div>
                      <p className="font-medium text-gray-900">{reportFile.name}</p>
                      <p className="text-sm text-gray-500">
                        {formatFileSize(reportFile.size)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 bg-green-600 text-white text-xs rounded-full">
                      已选择
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setReportFile(null);
                      }}
                      className="p-2 hover:bg-red-100 rounded-lg transition-colors text-red-500"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div
                onDragOver={handleFileDragOver}
                onDragLeave={handleFileDragLeave}
                onDrop={handleFileDrop}
                className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors cursor-pointer ${
                  isDraggingFile
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-300 hover:border-green-500'
                }`}
              >
                {/* 隐藏的报告文件输入 */}
                <input
                  ref={reportFileInputRef}
                  type="file"
                  accept="application/pdf"
                  onChange={handleReportFileSelect}
                  className="hidden"
                />
                
                <div className="flex flex-col items-center justify-center text-gray-400">
                  <Upload className="w-12 h-12 mb-2" />
                  <p className="text-sm mb-4">
                    {isDraggingFile ? '释放鼠标上传PDF文件' : '点击或拖拽上传PDF报告'}
                  </p>
                  
                  {/* 明确的选择文件按钮 */}
                  <button
                    type="button"
                    onClick={handleReportFileButtonClick}
                    className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors font-medium"
                  >
                    <Upload className="w-5 h-5" />
                    选择PDF文件
                  </button>
                  
                  <p className="text-xs mt-4 text-gray-500">💡 提示：请先上传封面图，再输入页数</p>
                </div>
              </div>
            )}
          </div>

          <hr className="border-gray-200" />

          {/* 基本信息 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              报告标题 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="title"
              placeholder="请输入报告标题"
              required
              defaultValue={editingItem?.title || ''}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                发布机构
              </label>
              <input
                type="text"
                name="publisher"
                placeholder="请输入发布机构"
                defaultValue={editingItem?.publisher || ''}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            
            {/* 旧分类字段已废弃（已迁移到 topics），按需求从表单移除 */}
          </div>
          
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                版本号
              </label>
              <input
                type="text"
                name="version"
                placeholder="如: v1.0"
                defaultValue={editingItem?.version || 'v1.0'}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                修改时间 <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="publishDate"
                required
                defaultValue={editingItem?.publishDate || new Date().toISOString().split('T')[0]}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            {/* 需求3：总页数自动计算阅读时间 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                总页数
              </label>
              <input
                type="number"
                name="pages"
                placeholder="如: 31"
                min={1}
                value={reportPages || editingItem?.pages || ''}
                onChange={(e) => {
                  const pages = parseInt(e.target.value) || 0;
                  setReportPages(pages);
                }}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              摘要描述
            </label>
            <textarea
              name="summary"
              rows={4}
              placeholder="请输入报告摘要描述..."
              defaultValue={editingItem?.summary || ''}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
            />
          </div>

          {/* 同步到战略陪伴客户 */}
          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-800">同步到战略陪伴客户</label>
                <p className="text-xs text-gray-600 mt-1">勾选后，保存时将把该内容写入对应客户的「课程推荐」（站内）。</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSyncClientIds(strategyClients.map(c => c.id))}
                  className="px-3 py-1.5 text-xs bg-white border rounded-lg hover:bg-gray-100"
                >
                  全选
                </button>
                <button
                  type="button"
                  onClick={() => setSyncClientIds([])}
                  className="px-3 py-1.5 text-xs bg-white border rounded-lg hover:bg-gray-100"
                >
                  清空
                </button>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 max-h-40 overflow-auto">
              {strategyClients.length === 0 ? (
                <div className="text-xs text-gray-500">暂无战略陪伴客户（请先在「战略客户」菜单添加）</div>
              ) : (
                strategyClients.map((c) => {
                  const checked = syncClientIds.includes(c.id);
                  return (
                    <label key={c.id} className="flex items-center gap-2 text-sm text-gray-800">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          const on = e.target.checked;
                          setSyncClientIds((prev) =>
                            on ? Array.from(new Set([...prev, c.id])) : prev.filter((x) => x !== c.id)
                          );
                        }}
                        className="w-4 h-4 text-green-600 rounded"
                      />
                      <span>{c.clientName}</span>
                    </label>
                  );
                })
              )}
            </div>
          </div>

          {/* 统一四类标签（多选） */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              统一标签（四类） <span className="text-red-500">*</span>
              <span className="text-gray-400 text-xs ml-2">(可多选)</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {RESOURCE_TOPICS.map((t) => (
                <label key={t} className="flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    name="topics"
                    value={t}
                    defaultChecked={(editingItem as any)?.topics?.includes(t)}
                    className="w-4 h-4 text-green-600 rounded"
                  />
                  <span className="text-sm text-gray-800">{t}</span>
                </label>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-2">旧“标签/分类”字段正在停用切换中，后续会移除。</p>
          </div>

          {/* legacy tags/usedTags removed (topics-only schema) */}
          
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                状态
              </label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="status"
                    value="draft"
                    checked={reportStatus === 'draft'}
                    onChange={() => setReportStatus('draft')}
                    className="text-green-600 focus:ring-green-500"
                  />
                  <span className="text-sm text-gray-700">草稿</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="status"
                    value="published"
                    checked={reportStatus === 'published'}
                    onChange={() => setReportStatus('published')}
                    className="text-green-600 focus:ring-green-500"
                  />
                  <span className="text-sm text-gray-700">已发布</span>
                </label>
              </div>
            </div>

            {/* isHot removed (topics-only schema) */}

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                name="showOnHome"
                id="showOnHome"
                defaultChecked={editingItem ? editingItem.showOnHome : false}
                className="rounded text-green-600 focus:ring-green-500"
              />
              <label htmlFor="showOnHome" className="text-sm text-gray-700 cursor-pointer">
                添加到首页
                <span className="text-xs text-gray-400 ml-1">(手动推荐，显示在首页精选位置)</span>
              </label>
            </div>
          </div>

          {/* 报告预览信息 - 需求3：显示自动计算的阅读时间 */}
          <div className="bg-gray-50 rounded-xl p-4">
            <h4 className="text-sm font-medium text-gray-700 mb-3">报告预览信息</h4>
            <div className="grid grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-gray-900">{reportPages || editingItem?.pages || '-'}</p>
                <p className="text-xs text-gray-500">总页数</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">-</p>
                <p className="text-xs text-gray-500">章节数</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">-</p>
                <p className="text-xs text-gray-500">数据图表</p>
              </div>
              {/* 需求3：显示自动计算的阅读时间 */}
              <div>
                <p className="text-2xl font-bold text-green-600">
                  {calculatedReadTime || (editingItem?.pages ? calculateReadTime(editingItem.pages) : '-')}
                </p>
                <p className="text-xs text-gray-500">预计阅读</p>
              </div>
            </div>
          </div>

          <div className="p-6 border-t border-gray-200 flex justify-end gap-4 sticky bottom-0 bg-white">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors flex items-center gap-2"
            >
              <Check className="w-5 h-5" />
              保存报告
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// 洞察文章表单模态框组件
interface InsightFormModalProps {
  editingItem: InsightArticle | null;
  onClose: () => void;
  onSave: (e: React.FormEvent<HTMLFormElement>) => void;
  strategyClients: ClientProject[];
  syncClientIds: string[];
  setSyncClientIds: React.Dispatch<React.SetStateAction<string[]>>;

}

function InsightFormModal({
  editingItem,
  onClose,
  onSave,
  strategyClients,
  syncClientIds,
  setSyncClientIds,
}: InsightFormModalProps) {

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 overflow-auto">
      <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto my-8">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white z-10">
          <h3 className="text-lg font-semibold text-gray-900">
            {editingItem ? '编辑文章' : '添加文章'}
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        
        <form onSubmit={onSave} className="p-6 space-y-6">
          {/* 标题 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              文章标题 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="title"
              placeholder="请输入文章标题"
              required
              defaultValue={editingItem?.title || ''}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          
          {/* 旧分类/作者字段已废弃（已迁移到 topics），按需求从表单移除 */}

          {/* 统一四类标签（多选） */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              统一标签（四类） <span className="text-red-500">*</span>
              <span className="text-gray-400 text-xs ml-2">(可多选)</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {RESOURCE_TOPICS.map((t) => (
                <label key={t} className="flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    name="topics"
                    value={t}
                    defaultChecked={(editingItem as any)?.topics?.includes(t)}
                    className="w-4 h-4 text-purple-600 rounded"
                  />
                  <span className="text-sm text-gray-800">{t}</span>
                </label>
              ))}
            </div>
          </div>
          
          {/* 摘要 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              文章摘要 <span className="text-red-500">*</span>
            </label>
            <textarea
              name="excerpt"
              rows={3}
              required
              placeholder="请输入文章摘要（在列表页显示）..."
              defaultValue={editingItem?.excerpt || ''}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
            />
          </div>
          
          {/* 正文内容 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              文章正文
            </label>
            <textarea
              name="content"
              rows={8}
              placeholder="请输入文章正文内容..."
              defaultValue={editingItem?.content || ''}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none font-mono text-sm"
            />
          </div>
          


          {/* 同步到战略陪伴客户 */}
          <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-800">同步到战略陪伴客户</label>
                <p className="text-xs text-gray-600 mt-1">保存时将把该文章写入对应客户的「课程推荐」（站内）。</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSyncClientIds(strategyClients.map(c => c.id))}
                  className="px-3 py-1.5 text-xs bg-white border rounded-lg hover:bg-gray-100"
                >
                  全选
                </button>
                <button
                  type="button"
                  onClick={() => setSyncClientIds([])}
                  className="px-3 py-1.5 text-xs bg-white border rounded-lg hover:bg-gray-100"
                >
                  清空
                </button>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 max-h-40 overflow-auto">
              {strategyClients.length === 0 ? (
                <div className="text-xs text-gray-500">暂无战略陪伴客户（请先在「战略客户」菜单添加）</div>
              ) : (
                strategyClients.map((c) => {
                  const checked = syncClientIds.includes(c.id);
                  return (
                    <label key={c.id} className="flex items-center gap-2 text-sm text-gray-800">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          const on = e.target.checked;
                          setSyncClientIds((prev) =>
                            on ? Array.from(new Set([...prev, c.id])) : prev.filter((x) => x !== c.id)
                          );
                        }}
                        className="w-4 h-4 text-purple-600 rounded"
                      />
                      <span>{c.clientName}</span>
                    </label>
                  );
                })
              )}
            </div>
          </div>
          {/* 阅读时间和修改时间 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                阅读时间（分钟）
              </label>
              <input
                type="number"
                name="readTime"
                placeholder="如: 15"
                min={1}
                disabled
                defaultValue={0}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                修改时间 <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="publishDate"
                required
                defaultValue={editingItem?.publishDate || new Date().toISOString().split('T')[0]}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>
          
          {/* 旧标签（已停用）：只读展示 */}
          {/* 旧标签字段已废弃（已迁移到 topics），按需求从表单移除 */}

          {/* legacy tags/usedTags removed (topics-only schema) */}

          {/* 分享设置（用于微信朋友圈卡片） */}
          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-gray-900">分享设置（朋友圈/微信卡片）</div>
                <div className="text-xs text-gray-600 mt-1">用于生成静态分享页：/share/article/&lt;slug&gt;</div>
                <div className="text-[11px] text-gray-500 mt-1">注意：当前站点部署在 GitHub Pages（纯静态）。分享卡片读取的是“构建时生成的分享页”。在后台修改文章后，如需更新朋友圈卡片信息，需要触发一次重新构建/发布。</div>
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-800">
                <input
                  type="checkbox"
                  name="shareEnabled"
                  defaultChecked={editingItem?.shareEnabled !== false}
                  className="rounded text-green-600 focus:ring-green-500"
                />
                启用分享
              </label>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">分享链接 Slug（必填，建议英文/数字/短横线）</label>
                <input
                  type="text"
                  name="shareSlug"
                  placeholder="例如：ai-enterprise-practice"
                  defaultValue={editingItem?.shareSlug || editingItem?.id || ''}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">分享封面图 URL（可选）</label>
                <input
                  type="text"
                  name="shareImage"
                  placeholder="留空则使用文章封面"
                  defaultValue={editingItem?.shareImage || ''}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">分享标题（可选）</label>
                <input
                  type="text"
                  name="shareTitle"
                  placeholder="留空则使用文章标题"
                  defaultValue={editingItem?.shareTitle || ''}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">分享摘要（可选）</label>
                <textarea
                  name="shareDescription"
                  rows={2}
                  placeholder="留空则使用文章摘要"
                  defaultValue={editingItem?.shareDescription || ''}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                />
              </div>
            </div>
          </div>

          {/* 状态和推荐 */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                状态
              </label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="status"
                    value="draft"
                    defaultChecked={editingItem?.status === 'draft'}
                    className="text-purple-600 focus:ring-purple-500"
                  />
                  <span className="text-sm text-gray-700">草稿</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="status"
                    value="published"
                    defaultChecked={!editingItem || editingItem?.status === 'published'}
                    className="text-purple-600 focus:ring-purple-500"
                  />
                  <span className="text-sm text-gray-700">已发布</span>
                </label>
              </div>
            </div>

            {/* featured removed (topics-only schema) */}

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                name="showOnHome"
                id="showOnHome"
                defaultChecked={editingItem?.showOnHome || false}
                className="rounded text-purple-600 focus:ring-purple-500"
              />
              <label htmlFor="showOnHome" className="text-sm text-gray-700 cursor-pointer">
                添加到首页
                <span className="text-xs text-gray-400 ml-1">(手动推荐，显示在首页精选位置)</span>
              </label>
            </div>
          </div>

          {/* 提交按钮 */}
          <div className="p-6 border-t border-gray-200 flex justify-end gap-4 sticky bottom-0 bg-white">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors flex items-center gap-2"
            >
              <Check className="w-5 h-5" />
              保存文章
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// 书籍表单模态框组件
interface BookFormModalProps {
  editingItem: Book | null;
  onClose: () => void;
  onSave: (e: React.FormEvent<HTMLFormElement>) => void;
  bookCoverImage: string | null;
  setBookCoverImage: React.Dispatch<React.SetStateAction<string | null>>;
  bookCoverFileInputRef: React.RefObject<HTMLInputElement>;
  handleBookCoverButtonClick: () => void;
  handleBookCoverImageSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  strategyClients: ClientProject[];
  syncClientIds: string[];
  setSyncClientIds: React.Dispatch<React.SetStateAction<string[]>>;

}

function BookFormModal({
  editingItem,
  onClose,
  onSave,
  bookCoverImage,
  setBookCoverImage,
  bookCoverFileInputRef,
  handleBookCoverButtonClick,
  handleBookCoverImageSelect,
  strategyClients,
  syncClientIds,
  setSyncClientIds,
}: BookFormModalProps) {

  const colorOptions = [
    { value: 'from-blue-600 to-indigo-800', label: '蓝色' },
    { value: 'from-purple-600 to-pink-600', label: '紫色' },
    { value: 'from-green-600 to-teal-600', label: '绿色' },
    { value: 'from-amber-600 to-orange-600', label: '橙色' },
    { value: 'from-red-600 to-rose-600', label: '红色' },
    { value: 'from-gray-700 to-gray-900', label: '灰色' },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 overflow-auto">
      <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto my-8">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white z-10">
          <h3 className="text-lg font-semibold text-gray-900">
            {editingItem ? '编辑书籍' : '添加书籍'}
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        
        <form onSubmit={onSave} className="p-6 space-y-6">
          {/* 书籍封面图上传 - 16:9 比例 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              封面图 <span className="text-gray-400 text-xs">(建议尺寸 1920x1080，16:9比例)</span>
            </label>
            {bookCoverImage || editingItem?.coverImage ? (
              <div className="relative border-2 border-purple-500 rounded-xl overflow-hidden group">
                <img 
                  src={bookCoverImage || editingItem?.coverImage} 
                  alt="封面图" 
                  className="w-full aspect-video object-cover"
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                  <button 
                    type="button"
                    className="px-4 py-2 bg-white text-gray-900 rounded-lg hover:bg-gray-100 transition-colors text-sm font-medium"
                    onClick={handleBookCoverButtonClick}
                  >
                    重新上传
                  </button>
                  <button 
                    type="button"
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                    onClick={() => setBookCoverImage(null)}
                  >
                    删除图片
                  </button>
                </div>
                <div className="absolute top-3 right-3 bg-purple-600 text-white text-xs px-2 py-1 rounded-full">
                  已设置
                </div>
              </div>
            ) : (
              <div 
                className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-purple-500 transition-colors"
              >
                {/* 隐藏的文件输入 */}
                <input
                  ref={bookCoverFileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleBookCoverImageSelect}
                  className="hidden"
                />
                
                <div className="w-full aspect-video bg-gray-100 rounded-lg flex flex-col items-center justify-center text-gray-400">
                  <Image className="w-16 h-16 mb-3" />
                  <p className="text-base mb-3">点击下方按钮上传封面图</p>
                  
                  <button
                    type="button"
                    onClick={handleBookCoverButtonClick}
                    className="flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors font-medium"
                  >
                    <Upload className="w-5 h-5" />
                    选择图片文件
                  </button>
                  
                  <p className="text-xs text-purple-600 mt-4 font-medium">
                    💡 或者直接 Ctrl+V 粘贴图片到这里
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* 书名 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              书名 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="title"
              placeholder="请输入书名"
              required
              defaultValue={editingItem?.title || ''}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          
          {/* 作者（书籍保留） */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              作者 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="author"
              placeholder="作者名称"
              required
              defaultValue={editingItem?.author || ''}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* 统一四类标签（多选） */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              统一标签（四类） <span className="text-red-500">*</span>
              <span className="text-gray-400 text-xs ml-2">(可多选)</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {RESOURCE_TOPICS.map((t) => (
                <label key={t} className="flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    name="topics"
                    value={t}
                    defaultChecked={(editingItem as any)?.topics?.includes(t)}
                    className="w-4 h-4 text-purple-600 rounded"
                  />
                  <span className="text-sm text-gray-800">{t}</span>
                </label>
              ))}
            </div>
          </div>
          
          {/* 简介 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              简介 <span className="text-red-500">*</span>
            </label>
            <textarea
              name="description"
              rows={3}
              required
              placeholder="请输入书籍简介..."
              defaultValue={editingItem?.description || ''}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
            />
          </div>
          
          {/* 摘要 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              详细摘要
            </label>
            <textarea
              name="abstract"
              rows={5}
              placeholder="请输入详细摘要（可选）..."
              defaultValue={editingItem?.abstract || ''}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
            />
          </div>
          
          {/* 页数/阅读时长已按需求移除；保留评分 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                评分（1-5）
              </label>
              <input
                type="number"
                name="rating"
                placeholder="如: 4.8"
                min={1}
                max={5}
                step={0.1}
                defaultValue={editingItem?.rating || 4.5}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>
          
          {/* 封面颜色已按需求移除；保留修改时间 */}
          <div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                修改时间 <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="publishDate"
                required
                defaultValue={editingItem?.publishDate || new Date().toISOString().split('T')[0]}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>
          


          {/* 同步到战略陪伴客户 */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-800">同步到战略陪伴客户</label>
                <p className="text-xs text-gray-600 mt-1">保存时将把该书写入对应客户的「课程推荐」（站内）。</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSyncClientIds(strategyClients.map(c => c.id))}
                  className="px-3 py-1.5 text-xs bg-white border rounded-lg hover:bg-gray-100"
                >
                  全选
                </button>
                <button
                  type="button"
                  onClick={() => setSyncClientIds([])}
                  className="px-3 py-1.5 text-xs bg-white border rounded-lg hover:bg-gray-100"
                >
                  清空
                </button>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 max-h-40 overflow-auto">
              {strategyClients.length === 0 ? (
                <div className="text-xs text-gray-500">暂无战略陪伴客户（请先在「战略客户」菜单添加）</div>
              ) : (
                strategyClients.map((c) => {
                  const checked = syncClientIds.includes(c.id);
                  return (
                    <label key={c.id} className="flex items-center gap-2 text-sm text-gray-800">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          const on = e.target.checked;
                          setSyncClientIds((prev) =>
                            on ? Array.from(new Set([...prev, c.id])) : prev.filter((x) => x !== c.id)
                          );
                        }}
                        className="w-4 h-4 text-amber-600 rounded"
                      />
                      <span>{c.clientName}</span>
                    </label>
                  );
                })
              )}
            </div>
          </div>
          {/* legacy tags/usedTags removed (topics-only schema) */}

          
          {/* 状态 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              状态
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="status"
                  value="draft"
                  defaultChecked={editingItem?.status === 'draft'}
                  className="text-purple-600 focus:ring-purple-500"
                />
                <span className="text-sm text-gray-700">草稿</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="status"
                  value="published"
                  defaultChecked={!editingItem || editingItem?.status === 'published'}
                  className="text-purple-600 focus:ring-purple-500"
                />
                <span className="text-sm text-gray-700">已发布</span>
              </label>
            </div>
          </div>

          {/* 提交按钮 */}
          <div className="p-6 border-t border-gray-200 flex justify-end gap-4 sticky bottom-0 bg-white">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors flex items-center gap-2"
            >
              <Check className="w-5 h-5" />
              保存书籍
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AdminDashboard;
