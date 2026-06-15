/**
 * 数据持久化服务
 * 内容主数据优先以腾讯云快照和同步接口为准，浏览器只保留必要缓存。
 */

import { httpRequest } from './httpClient';

// 数据类型定义
export type ResourceTopic = '战略' | '业务设计' | '组织' | 'AI 技术';

export interface Report {
  id: string;
  title: string;
  publisher: string;
  summary: string;

  /** 统一标签（四类，多选）。旧 category/tags 已彻底废弃。 */
  topics: ResourceTopic[];

  version: string;
  format: string[];
  coverImage?: string;
  fileUrl?: string; // PDF 原件 (下载用)
  fileSize?: number;
  /** 报告解读 Markdown 正文 (离线大模型生成, 前台据此渲染简介/目录/正文 + 作 AI 问答上下文) */
  markdownContent?: string;
  /** 或指向 .md 文件的 URL (与 markdownContent 二选一, content 优先) */
  markdownUrl?: string;
  likes?: number;
  favoritesCount?: number;
  pages?: number;
  publishDate: string;
  /** parsed = 已从 Markdown 解析出正文(新增报告默认); published/draft/archived 为旧口径, 前台两者均展示 */
  status: 'draft' | 'published' | 'archived' | 'parsed';

  /** 是否显示在首页（手动选择） */
  showOnHome: boolean;

  views: number;
  downloads: number;
  createdAt: string;
  updatedAt: string;
}

export interface InsightArticle {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  contentJson?: any;
  contentHtml?: string;
  contentText?: string;
  fileUrl?: string;
  fileSize?: number;

  /** AI 综述（导读：这篇讲什么、核心是什么） */
  aiOverview?: string;
  /** AI 总结：核心观点 + 结构化目录（指向逻辑结构，非页码） */
  aiSummary?: {
    points: string[];
    outline: { title: string; desc?: string }[];
  };

  /** 统一标签（四类，多选）。旧 category/tags/readTime/featured/author 已彻底废弃。 */
  topics: ResourceTopic[];

  coverImage?: string;
  coverPresetId?: string;
  publishDate: string;
  status: 'draft' | 'published' | 'archived';

  /** 是否显示在首页（手动选择） */
  showOnHome: boolean;

  views: number;
  likes: number;
  favoritesCount?: number;

  // Share (WeChat Moments, etc.)
  shareEnabled?: boolean;
  shareSlug?: string; // used to generate static share page url
  shareTitle?: string;
  shareDescription?: string;
  shareImage?: string;

  createdAt: string;
  updatedAt: string;
}

export interface Book {
  id: string;
  title: string;
  author: string;
  description: string;
  abstract: string;

  /** 统一标签（四类，多选）。旧 category/tags 已彻底废弃。 */
  topics: ResourceTopic[];

  pages: number;
  duration: string;
  rating: number;
  coverImage?: string;
  coverColor?: string;
  // optional: allow books to attach a PDF/asset like reports
  fileUrl?: string;
  fileSize?: number;
  likes?: number;
  favoritesCount?: number;
  publishDate: string;
  status: 'draft' | 'published' | 'archived';
  showOnHome: boolean; // 是否显示在首页（手动选择）
  views: number;
  reviews: number;
  createdAt: string;
  updatedAt: string;
}

export interface Tag {
  id: string;
  name: string;
  count: number;
}

export interface Category {
  id: string;
  name: string;
  type: 'insight' | 'report' | 'book';
  parentId?: string;
  sort: number;
}

// ========== 益语方法论（正文类资源，类似洞察文章） ==========
export interface Methodology {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  contentJson?: any;
  contentHtml?: string;
  contentText?: string;
  fileUrl?: string;
  fileSize?: number;

  /** 统一标签（四类，多选）。旧 category/tags/readTime/featured/author 已彻底废弃。 */
  topics: ResourceTopic[];

  coverImage?: string;
  coverPresetId?: string;
  publishDate: string;
  status: 'draft' | 'published' | 'archived';
  showOnHome: boolean;
  views: number;
  likes: number;
  favoritesCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Comment {
  id: string;
  contentId: string;      // 关联内容ID
  contentType: 'insight' | 'report' | 'book' | 'methodology';  // 内容类型
  contentTitle: string;   // 内容标题（冗余存储便于显示）
  userId: string;         // 评论用户ID
  userName: string;       // 评论用户名称
  userAvatar?: string;    // 评论用户头像
  text: string;           // 评论内容
  status: 'pending' | 'approved' | 'rejected'; // 审核状态
  reply?: string;         // 管理员回复
  createdAt: string;      // 评论时间
  updatedAt: string;      // 更新时间
}

// 团队成员接口
export interface TeamMember {
  name: string;
  role: string;
  bio?: string;
  avatar?: string;
}

// 系统设置接口
export interface SystemSettings {
  // 基本信息
  siteName: string;
  siteLogo?: string;
  siteDescription: string;
  contactEmail: string;
  contactPhone?: string;
  
  // SEO
  seoTitle: string;
  seoKeywords: string[];
  seoDescription: string;
  
  // 功能开关
  allowRegistration: boolean;
  requireInvitation: boolean;
  commentModeration: boolean; // 评论需审核
  
  // 关于我们
  aboutTitle: string;
  aboutContent: string;
  teamTitle?: string;
  teamMembers?: TeamMember[];
  
  // 更新信息
  updatedAt: string;
  updatedBy: string;
}

// 用户接口定义
export interface User {
  id: string;
  email: string;
  nickname: string;
  avatar?: string;
  avatarUrl?: string;
  phone?: string;
  memberType: 'regular' | 'gold' | 'diamond';
  status: 'active' | 'disabled' | 'deactivated';
  adminRole?: 'admin';
  paidSource?: 'manual' | 'invite_code' | 'payment' | 'strategy_client';
  paidStartedAt?: string;
  paidExpiresAt?: string;
  paidNote?: string;
  invitationCode?: string;        // 使用哪个邀请码注册
  invitedBy?: string;             // 邀请人ID
  strategyProjectId?: string;
  strategyBoundAt?: string;
  strategyAccessSource?: string;
  strategyProjectName?: string;
  createdAt: string;
  lastLoginAt?: string;
  loginCount: number;
  commentsCount: number;          // 评论数量
  favoritesCount: number;         // 收藏数量
}

// 咨询申请（用于“申请战略咨询”筛选表单）
export interface ConsultRequest {
  id: string;
  createdAt: string;

  // Contact
  name: string;
  organization?: string;
  role?: string;
  email?: string;
  wechat?: string;
  phone?: string;

  // Qualification
  topic: string;                 // 想解决的核心问题
  background?: string;           // 背景信息
  goals?: string;                // 3个月目标
  constraints?: string;          // 最大阻力/约束
  commitment?: string;           // 每周投入/预算区间等
  notes?: string;

  // Status
  status: 'new' | 'reviewing' | 'accepted' | 'rejected';
  reviewedBy?: string;
  reviewedAt?: string;
}

// 存储键
export const STORAGE_KEYS = {
  reports: 'yiyu_reports',
  insights: 'yiyu_insights',
  methodologies: 'yiyu_methodologies',
  books: 'yiyu_books',
  tags: 'yiyu_tags',
  categories: 'yiyu_categories',
  usedTags: 'yiyu_used_tags', // 历史使用的标签
  comments: 'yiyu_comments', // 评论数据
  systemSettings: 'yiyu_system_settings', // 系统设置
  users: 'yiyu_users', // 用户数据
  consultRequests: 'yiyu_consult_requests', // 咨询申请表单
};

// 初始化默认分类
const defaultCategories: Category[] = [
  { id: '1', name: '行业洞察', type: 'insight', sort: 1 },
  { id: '2', name: '数据洞察', type: 'insight', sort: 2 },
  { id: '3', name: '深度洞察', type: 'insight', sort: 3 },
  { id: '4', name: '行业报告', type: 'report', sort: 1 },
  { id: '5', name: '市场研究', type: 'report', sort: 2 },
  { id: '6', name: '政策解读', type: 'report', sort: 3 },
  { id: '7', name: '人工智能', type: 'book', sort: 1 },
  { id: '8', name: '商业思维', type: 'book', sort: 2 },
  { id: '9', name: '管理实战', type: 'book', sort: 3 },
];

// 初始化默认标签
const defaultTags: Tag[] = [
  { id: '1', name: '公益', count: 15 },
  { id: '2', name: '数字化', count: 23 },
  { id: '3', name: '供应链', count: 18 },
  { id: '4', name: 'AI', count: 45 },
  { id: '5', name: '组织学习', count: 12 },
  { id: '6', name: '人力资源', count: 20 },
  { id: '7', name: '行业研究', count: 30 },
  { id: '8', name: '旅游', count: 10 },
  { id: '9', name: '风险管理', count: 15 },
  { id: '10', name: '战略管理', count: 25 },
];

export const PG_SYNC_KEYS = new Set<string>([
  'yiyu_reports',
  'yiyu_insights',
  'yiyu_methodologies',
  'yiyu_books',
  'yiyu_categories',
  'yiyu_tags',
  'yiyu_system_settings',
]);

const pgSyncTimers = new Map<string, number>();
const CONTENT_STORAGE_KEYS = new Set<string>([
  STORAGE_KEYS.reports,
  STORAGE_KEYS.insights,
  STORAGE_KEYS.methodologies,
  STORAGE_KEYS.books,
  STORAGE_KEYS.tags,
  STORAGE_KEYS.categories,
  STORAGE_KEYS.systemSettings,
]);
const contentMemoryCache = new Map<string, any>();

export const schedulePgSync = (key: string, data: any) => {
  if (typeof window === 'undefined' || !PG_SYNC_KEYS.has(key)) return;

  const existing = pgSyncTimers.get(key);
  if (existing) window.clearTimeout(existing);

  const timer = window.setTimeout(async () => {
    try {
      // content-sync 现需管理员鉴权:带上官网登录 token(与 authHttp 一致)。
      const token = localStorage.getItem('yiyu_auth_token') ?? sessionStorage.getItem('yiyu_auth_token') ?? '';
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;
      const res = await fetch('/api/content-sync', {
        method: 'POST',
        headers,
        body: JSON.stringify({ key, data }),
      });
      if (!res.ok) {
        console.error('PG sync failed:', key, res.status, await res.text());
      }
    } catch (error) {
      console.error('PG sync request failed:', key, error);
    } finally {
      pgSyncTimers.delete(key);
    }
  }, 600);

  pgSyncTimers.set(key, timer);
};

// 工具函数：保存数据（内容域：内存缓存 + 后端 PG sync + 本地 localStorage 镜像）
// 本地 localStorage 镜像的作用：内存缓存只在单个页面实例内有效，而后台↔前台是整页跳转
// (window.location)，跳转后内存即清空。没有 localStorage 镜像，后台新上传的报告在前台
// 刷新/跳转后就消失。写 localStorage 后：跨刷新可读、跨标签页 storage 事件可感知、
// bootstrap 合并也能把它当作"本地新增"保留下来。
const saveToStorage = (key: string, data: any) => {
  try {
    if (CONTENT_STORAGE_KEYS.has(key)) {
      contentMemoryCache.set(key, data);
      schedulePgSync(key, data);
      try { localStorage.setItem(key, JSON.stringify(data)); } catch { /* 配额/隐私模式忽略 */ }
      return;
    }
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error('Failed to save data:', error);
  }
};

// 工具函数：读取数据（内容域：内存缓存优先，缺失则回退 localStorage 镜像）
const loadFromStorage = (key: string, defaultData: any) => {
  try {
    if (CONTENT_STORAGE_KEYS.has(key)) {
      if (contentMemoryCache.has(key)) return contentMemoryCache.get(key);
      const mirror = localStorage.getItem(key);
      if (mirror) {
        const parsed = JSON.parse(mirror);
        contentMemoryCache.set(key, parsed);
        return parsed;
      }
      return defaultData;
    }
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : defaultData;
  } catch (error) {
    console.error('Failed to load data:', error);
    return defaultData;
  }
};

// 跨标签页同步: 另一个标签页(如后台)写了内容域 localStorage 镜像时, 本标签页同步更新内存缓存,
// 否则本页的内存缓存是旧的, getReports/loadFromStorage 优先读内存就看不到新数据。
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (!e.key || !CONTENT_STORAGE_KEYS.has(e.key)) return;
    try {
      if (e.newValue) contentMemoryCache.set(e.key, JSON.parse(e.newValue));
      else contentMemoryCache.delete(e.key);
      window.dispatchEvent(new Event('yiyu_data_change'));
    } catch { /* ignore */ }
  });
}

// ================================================
// Legacy 字段迁移（彻底废弃 category/tags/readTime/featured/isHot/author 等）
// ================================================

const ALL_RESOURCE_TOPICS: ResourceTopic[] = ['战略', '业务设计', '组织', 'AI 技术'];

const normalizeTopics = (topics: any): ResourceTopic[] => {
  if (!Array.isArray(topics)) return [];
  const out: ResourceTopic[] = [];
  for (const t of topics) {
    if (ALL_RESOURCE_TOPICS.includes(t)) out.push(t);
  }
  // 去重
  return Array.from(new Set(out));
};

const inferTopicsFromLegacy = (input: {
  category?: any;
  tags?: any;
  title?: any;
  summary?: any;
  excerpt?: any;
  content?: any;
}): ResourceTopic[] => {
  const text = [input.category, ...(Array.isArray(input.tags) ? input.tags : []), input.title, input.summary, input.excerpt]
    .filter(Boolean)
    .join(' ');

  const hits: ResourceTopic[] = [];
  for (const t of ALL_RESOURCE_TOPICS) {
    if (text.includes(t)) hits.push(t);
  }

  // 一些常见关键词兜底
  const lowered = text.toLowerCase();
  if (lowered.includes('ai') || text.includes('人工智能') || text.includes('大模型')) hits.push('AI 技术');
  if (text.includes('组织') || text.includes('人力') || text.includes('文化')) hits.push('组织');
  if (text.includes('业务') || text.includes('产品') || text.includes('增长')) hits.push('业务设计');
  if (text.includes('战略') || text.includes('okr') || text.includes('kpi')) hits.push('战略');

  const uniq = Array.from(new Set(hits));
  return uniq.length > 0 ? uniq : ['战略'];
};

const migrateList = <T extends Record<string, any>>(key: string, list: T[], kind: 'report' | 'insight' | 'book' | 'methodology'): any[] => {
  let changed = false;

  const migrated = (list || []).map((item) => {
    if (!item || typeof item !== 'object') return item;

    const existingTopics = normalizeTopics(item.topics);
    const topics = existingTopics.length > 0 ? existingTopics : inferTopicsFromLegacy(item);

    // 删除彻底废弃字段
    const { category, tags, isHot, featured, readTime, author, ...rest } = item;

    // 书籍保留 author（但上面 destructure 掉了，这里加回来）
    const finalAuthor = kind === 'book' ? String(item.author || '') : undefined;

    const next: any = {
      ...rest,
      topics,
    };

    if (kind === 'book') next.author = finalAuthor;

    // 保障 showOnHome 等开关为 boolean
    if (typeof next.showOnHome !== 'boolean') next.showOnHome = false;

    // 保障 publishDate/status
    if (!next.publishDate) next.publishDate = new Date().toISOString().slice(0, 10);
    if (!next.status) next.status = 'draft';

    // 粗略检测是否变化
    if (
      category !== undefined ||
      tags !== undefined ||
      isHot !== undefined ||
      featured !== undefined ||
      readTime !== undefined ||
      author !== undefined ||
      existingTopics.length === 0
    ) {
      changed = true;
    }

    return next;
  });

  if (changed) {
    saveToStorage(key, migrated);
    // 直接触发数据变化事件（避免依赖后续声明的 notifyDataChange）
    if (typeof window !== 'undefined') {
      try {
        window.dispatchEvent(new Event('yiyu_data_change'));
      } catch {}
    }
  }

  return migrated;
};

// 工具函数：计算预计阅读时间（根据总页数）
export const calculateReadTime = (pages: number): string => {
  // 假设一页平均阅读时间约30秒，加上前后的准备时间
  const totalSeconds = pages * 30 + 120; // 120秒是额外准备时间
  const minutes = Math.ceil(totalSeconds / 60);
  
  if (minutes < 1) return '<1分钟';
  if (minutes < 60) return `${minutes}分钟`;
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours < 24) {
    return remainingMinutes > 0 ? `${hours}小时${remainingMinutes}分钟` : `${hours}小时`;
  }
  
  return '>1天';
};

// ========== 报告管理 ==========

// 内置样例报告 (SET 指数 2024) — 用于打通 Markdown 阅读 + AI 问答全链路。
// markdownUrl/fileUrl 指向 public/reports/ 下的文件, 报告对象本身保持轻量。
export const SET_INDEX_SEED_REPORT: Report = {
  id: 'set-index-2024',
  title: '全球创新城市教育科技人才协同发展评估报告暨 SET 指数 2024',
  publisher: '深圳国际科技信息中心 / 清华大学 / 爱思唯尔',
  summary:
    'SET 指数从教育、科技、人才三个维度评估 30 个全球创新城市。波士顿、旧金山、北京位列前三；中美城市占据前列，中国城市在人才潜力、青年人才与科研机构增长上表现突出，深圳人才潜力居首。',
  topics: ['战略', 'AI 技术'],
  version: '2024',
  format: ['PDF', 'Markdown'],
  fileUrl: '/reports/set-index-2024.pdf',
  markdownUrl: '/reports/set-index-2024.md',
  pages: 80,
  publishDate: '2025-02-14',
  status: 'published',
  showOnHome: true,
  views: 0,
  downloads: 0,
  likes: 0,
  favoritesCount: 0,
  createdAt: '2025-02-14T00:00:00.000Z',
  updatedAt: '2025-02-14T00:00:00.000Z',
};

// 内置样例报告 2: 临床 AI 报告 (含 30 个图表块, 用于验证图表渲染)
export const CLINICAL_AI_SEED_REPORT: Report = {
  id: 'clinical-ai-2026',
  title: 'State of Clinical AI Report 2026 · 临床 AI 从能力展示走向真实照护转译',
  publisher: 'ARISE Network',
  summary:
    '2026 年临床 AI 已从"模型性能展示"进入"真实照护转译"阶段：前沿模型在受控推理、影像识别与风险预测中快速逼近或超过人类，但真实临床价值仍取决于评估质量、工作流协同、不确定性校准、安全护栏与前瞻性证据。',
  topics: ['战略', 'AI 技术'],
  version: '2026',
  format: ['Markdown'],
  markdownUrl: '/reports/clinical-ai-2026.md',
  publishDate: '2026-01-01',
  status: 'parsed',
  showOnHome: false,
  views: 0,
  downloads: 0,
  likes: 0,
  favoritesCount: 0,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

// 站点只保留用户自己通过后台上传的 MD 报告 —— 不再注入内置样例。
// SET_INDEX / CLINICAL_AI 两个样例仅保留常量定义(供历史引用), 不进入报告列表。
const SEED_REPORTS: Report[] = [];
// 历史样例报告 id: 若 localStorage 残留其副本(含被编辑过的), 一并清除, 不在站点出现。
const LEGACY_SEED_IDS = new Set<string>([SET_INDEX_SEED_REPORT.id, CLINICAL_AI_SEED_REPORT.id]);

// 新解析机制: 报告必须有 Markdown 解读稿(markdownContent 或 markdownUrl)才有效。
// 旧机制报告(纯 PDF / 无 MD 的历史报告)一律视为失效, 不在站点任何位置出现。
export const isMarkdownReport = (r?: Report | null): boolean =>
  !!(r && (r.markdownContent || r.markdownUrl));

// 是否为应清除的报告(旧机制无 MD, 或历史样例 seed)
const isStaleReport = (r?: Report | null): boolean =>
  !r || !isMarkdownReport(r) || LEGACY_SEED_IDS.has(r.id);

// 获取所有报告: 仅返回用户上传的新机制 MD 报告(过滤旧报告 + 历史样例)。
export const getReports = (): Report[] => {
  const list = loadFromStorage(STORAGE_KEYS.reports, []);
  const migrated = migrateList(STORAGE_KEYS.reports, list, 'report') as Report[];
  const have = new Set(migrated.map(r => r.id));
  const missing = SEED_REPORTS.filter(s => !have.has(s.id));
  const all = missing.length ? [...missing, ...migrated] : migrated;
  return all.filter(r => !isStaleReport(r));
};

/**
 * 物理清除旧解析机制遗留的报告(无 Markdown 解读稿者): 重写 localStorage 镜像 + 内存缓存,
 * 让旧报告痕迹彻底消失。每次启动调用, 自愈式清理(断网时也能清, 不依赖后端)。
 * 返回被清除的数量。
 */
export const purgeLegacyReports = (): number => {
  if (typeof localStorage === 'undefined') return 0;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.reports);
    const stored: Report[] = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(stored) || stored.length === 0) return 0;
    const kept = stored.filter(r => !isStaleReport(r));
    const removed = stored.length - kept.length;
    if (removed > 0) {
      try { localStorage.setItem(STORAGE_KEYS.reports, JSON.stringify(kept)); } catch {}
      contentMemoryCache.set(STORAGE_KEYS.reports, kept);
      try { window.dispatchEvent(new Event('yiyu_data_change')); } catch {}
    }
    return removed;
  } catch { return 0; }
};

// 工具函数：触发数据变化事件
const notifyDataChange = () => {
  // 触发自定义事件，通知所有页面刷新数据
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('yiyu_data_change'));
    console.log('已触发数据变化事件');
  }
};

// 保存报告
export const saveReport = (report: Partial<Report> | Report): Report => {
  const reports = getReports();
  const now = new Date().toISOString();
  
  if ('id' in report && report.id) {
    // 更新现有报告
    const index = reports.findIndex(r => r.id === report.id);
    if (index !== -1) {
      reports[index] = { 
        ...reports[index], 
        ...report, 
        updatedAt: now 
      };
      saveToStorage(STORAGE_KEYS.reports, reports);
      notifyDataChange();
      return reports[index];
    }
  }
  
  // 创建新报告
  const newReport: Report = {
    id: report.id || `report_${Date.now()}`,
    title: report.title || '无标题报告',
    publisher: report.publisher || '',
    summary: report.summary || '',
    topics: (report as any).topics || [],
    version: report.version || 'v1.0',
    format: report.format || ['PDF'],
    coverImage: report.coverImage,
    likes: (report as any).likes || 0,
    favoritesCount: (report as any).favoritesCount || 0,
    fileUrl: report.fileUrl,
    fileSize: report.fileSize,
    markdownContent: (report as any).markdownContent,
    markdownUrl: (report as any).markdownUrl,
    pages: report.pages,
    publishDate: report.publishDate || new Date().toISOString().split('T')[0],
    status: report.status || 'draft',
    showOnHome: report.showOnHome || false,
    views: report.views || 0,
    downloads: report.downloads || 0,
    createdAt: report.createdAt || now,
    updatedAt: now,
  };
  
  reports.unshift(newReport);
  saveToStorage(STORAGE_KEYS.reports, reports);
  notifyDataChange();
  
  // 更新使用的标签
  return newReport;
};

// 删除报告
export const deleteReport = (id: string): boolean => {
  const reports = getReports();
  const filtered = reports.filter(r => r.id !== id);
  if (filtered.length !== reports.length) {
    saveToStorage(STORAGE_KEYS.reports, filtered);
    notifyDataChange();
    return true;
  }
  return false;
};

// ========== 洞察文章管理 ==========

export const getInsights = (): InsightArticle[] => {
  const list = loadFromStorage(STORAGE_KEYS.insights, []);
  return migrateList(STORAGE_KEYS.insights, list, 'insight') as InsightArticle[];
};

// ========== 益语方法论（正文类资源） ==========

const initDefaultMethodologies = (): Methodology[] => [];

export const getMethodologies = (): Methodology[] => {
  const list = loadFromStorage(STORAGE_KEYS.methodologies, []);
  return migrateList(STORAGE_KEYS.methodologies, list, 'methodology') as Methodology[];
};

export const saveMethodology = (item: Partial<Methodology> | Methodology): Methodology => {
  const list = getMethodologies();
  const now = new Date().toISOString();

  const pickUpdatedAt = (incoming?: string) => (incoming && String(incoming).trim() ? String(incoming).trim() : now);

  if ('id' in item && item.id) {
    const index = list.findIndex(r => r.id === item.id);
    if (index !== -1) {
      list[index] = {
        ...list[index],
        ...item,
        updatedAt: pickUpdatedAt((item as any).updatedAt),
      } as Methodology;
      saveToStorage(STORAGE_KEYS.methodologies, list);
      notifyDataChange();
      return list[index];
    }
  }

  const newItem: Methodology = {
    id: (item as any).id || `methodology_${Date.now()}`,
    title: (item as any).title || '待补充',
    excerpt: (item as any).excerpt || '待补充',
    content: (item as any).content || '',
    contentJson: (item as any).contentJson,
    contentHtml: (item as any).contentHtml,
    contentText: (item as any).contentText,
    fileUrl: (item as any).fileUrl,
    fileSize: (item as any).fileSize,
    topics: normalizeTopics((item as any).topics).length > 0 ? normalizeTopics((item as any).topics) : ['战略'],
    coverImage: (item as any).coverImage,
    coverPresetId: (item as any).coverPresetId,
    publishDate: (item as any).publishDate || new Date().toISOString().split('T')[0],
    status: (item as any).status || 'draft',
    showOnHome: (item as any).showOnHome || false,
    views: (item as any).views || 0,
    likes: (item as any).likes || 0,
    favoritesCount: (item as any).favoritesCount || 0,
    createdAt: (item as any).createdAt || now,
    updatedAt: pickUpdatedAt((item as any).updatedAt),
  };

  list.unshift(newItem);
  saveToStorage(STORAGE_KEYS.methodologies, list);
  notifyDataChange();
  return newItem;
};

export const deleteMethodology = (id: string): boolean => {
  const list = getMethodologies();
  const filtered = list.filter(r => r.id !== id);
  if (filtered.length !== list.length) {
    saveToStorage(STORAGE_KEYS.methodologies, filtered);
    notifyDataChange();
    return true;
  }
  return false;
};

export const saveInsight = (article: Partial<InsightArticle> | InsightArticle): InsightArticle => {
  const articles = getInsights();
  const now = new Date().toISOString();
  
  if ('id' in article && article.id) {
    const index = articles.findIndex(a => a.id === article.id);
    if (index !== -1) {
      articles[index] = { 
        ...articles[index], 
        ...article, 
        updatedAt: now 
      };
      saveToStorage(STORAGE_KEYS.insights, articles);
      notifyDataChange();
      return articles[index];
    }
  }
  
  const newArticle: InsightArticle = {
    id: article.id || `insight_${Date.now()}`,
    title: article.title || '无标题文章',
    excerpt: article.excerpt || '',
    content: article.content || '',
    contentJson: (article as any).contentJson,
    contentHtml: (article as any).contentHtml,
    contentText: (article as any).contentText,
    fileUrl: (article as any).fileUrl,
    fileSize: (article as any).fileSize,
    topics: normalizeTopics((article as any).topics).length > 0 ? normalizeTopics((article as any).topics) : ['战略'],
    coverImage: article.coverImage,
    coverPresetId: (article as any).coverPresetId,
    publishDate: article.publishDate || new Date().toISOString().split('T')[0],
    status: article.status || 'draft',
    showOnHome: article.showOnHome || false,
    views: (article as any).views || 0,
    likes: (article as any).likes || 0,
    favoritesCount: (article as any).favoritesCount || 0,
    createdAt: (article as any).createdAt || now,
    updatedAt: now,
  };
  
  articles.unshift(newArticle);
  saveToStorage(STORAGE_KEYS.insights, articles);
  notifyDataChange();
  
  return newArticle;
};

export const deleteInsight = (id: string): boolean => {
  const articles = getInsights();
  const filtered = articles.filter(a => a.id !== id);
  if (filtered.length !== articles.length) {
    saveToStorage(STORAGE_KEYS.insights, filtered);
    notifyDataChange();
    return true;
  }
  return false;
};

// ========== 书籍管理 ==========

export const getBooks = (): Book[] => {
  const list = loadFromStorage(STORAGE_KEYS.books, []);
  return migrateList(STORAGE_KEYS.books, list, 'book') as Book[];
};

export const saveBook = (book: Partial<Book> | Book): Book => {
  const books = getBooks();
  const now = new Date().toISOString();
  
  if ('id' in book && book.id) {
    const index = books.findIndex(b => b.id === book.id);
    if (index !== -1) {
      books[index] = { 
        ...books[index], 
        ...book, 
        updatedAt: now 
      };
      saveToStorage(STORAGE_KEYS.books, books);
      notifyDataChange();
      return books[index];
    }
  }
  
  const newBook: Book = {
    id: book.id || `book_${Date.now()}`,
    title: book.title || '无标题书籍',
    author: book.author || '',
    description: book.description || '',
    abstract: book.abstract || '',
    topics: normalizeTopics((book as any).topics).length > 0 ? normalizeTopics((book as any).topics) : ['战略'],
    pages: (book as any).pages || 100,
    duration: (book as any).duration || calculateReadTime((book as any).pages || 100),
    rating: (book as any).rating || 4.5,
    coverImage: (book as any).coverImage,
    coverColor: (book as any).coverColor || 'from-blue-600 to-indigo-800',
    likes: (book as any).likes || 0,
    favoritesCount: (book as any).favoritesCount || 0,
    publishDate: (book as any).publishDate || new Date().toISOString().split('T')[0],
    status: book.status || 'published',
    showOnHome: (book as any).showOnHome || false,
    views: book.views || 0,
    reviews: book.reviews || 0,
    createdAt: book.createdAt || now,
    updatedAt: now,
  };
  
  books.unshift(newBook);
  saveToStorage(STORAGE_KEYS.books, books);
  notifyDataChange();
  
  return newBook;
};

export const deleteBook = (id: string): boolean => {
  const books = getBooks();
  const filtered = books.filter(b => b.id !== id);
  if (filtered.length !== books.length) {
    saveToStorage(STORAGE_KEYS.books, filtered);
    notifyDataChange();
    return true;
  }
  return false;
};

// ========== 标签管理 ==========

// 获取所有标签（带使用次数）
export const getTags = (): Tag[] => {
  return loadFromStorage(STORAGE_KEYS.tags, []);
};

// 获取历史使用过的标签（按最近使用排序）
export const getUsedTags = (): string[] => {
  return loadFromStorage(STORAGE_KEYS.usedTags, [
    '公益', '数字化', '供应链', 'AI', '人力资源', '行业研究'
  ]);
};

// 更新使用过的标签
const updateUsedTags = (newTags: string[]) => {
  const usedTags = getUsedTags();
  const updated = [...new Set([...newTags, ...usedTags])];
  saveToStorage(STORAGE_KEYS.usedTags, updated.slice(0, 20)); // 只保留最近20个
  notifyDataChange();
};

// 添加标签到使用历史
export const addUsedTag = (tag: string) => {
  const usedTags = getUsedTags();
  const updated = [tag, ...usedTags.filter(t => t !== tag)];
  saveToStorage(STORAGE_KEYS.usedTags, updated.slice(0, 20));
  notifyDataChange();
};

// ========== 分类管理 ==========

export const getCategories = (): Category[] => {
  return loadFromStorage(STORAGE_KEYS.categories, []);
};

export const saveCategory = (category: Category): void => {
  const categories = getCategories();
  const index = categories.findIndex(c => c.id === category.id);
  if (index !== -1) {
    categories[index] = category;
  } else {
    categories.push(category);
  }
  saveToStorage(STORAGE_KEYS.categories, categories);
  notifyDataChange();
};

// ========== 评论管理 ==========

// 获取所有评论
export const getComments = (): Comment[] => {
  return loadFromStorage(STORAGE_KEYS.comments, []);
};

// 根据内容ID和类型获取评论
export const getCommentsByContent = (contentId: string, contentType: 'insight' | 'report' | 'book' | 'methodology'): Comment[] => {
  const comments = getComments();
  return comments
    .filter(c => c.contentId === contentId && c.contentType === contentType)
    .filter(c => c.status === 'approved') // 只返回已审核通过的评论
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
};

// 保存评论（用户发表评论）
export const saveComment = (comment: Partial<Comment>): Comment => {
  const comments = getComments();
  const now = new Date().toISOString();
  
  // 创建新评论
  const newComment: Comment = {
    id: comment.id || `comment_${Date.now()}`,
    contentId: comment.contentId || '',
    contentType: comment.contentType || 'insight',
    contentTitle: comment.contentTitle || '',
    userId: comment.userId || 'guest',
    userName: comment.userName || '访客',
    userAvatar: comment.userAvatar,
    text: comment.text || '',
    status: 'pending', // 新评论默认待审核
    reply: comment.reply,
    createdAt: comment.createdAt || now,
    updatedAt: now,
  };
  
  comments.unshift(newComment);
  saveToStorage(STORAGE_KEYS.comments, comments);
  notifyDataChange();
  
  return newComment;
};

// 更新评论状态（审核）
export const updateCommentStatus = (commentId: string, status: 'approved' | 'rejected'): boolean => {
  const comments = getComments();
  const index = comments.findIndex(c => c.id === commentId);
  
  if (index !== -1) {
    comments[index].status = status;
    comments[index].updatedAt = new Date().toISOString();
    saveToStorage(STORAGE_KEYS.comments, comments);
    notifyDataChange();
    return true;
  }
  
  return false;
};

// 管理员回复评论
export const replyComment = (commentId: string, replyText: string): boolean => {
  const comments = getComments();
  const index = comments.findIndex(c => c.id === commentId);
  
  if (index !== -1) {
    comments[index].reply = replyText;
    comments[index].updatedAt = new Date().toISOString();
    saveToStorage(STORAGE_KEYS.comments, comments);
    notifyDataChange();
    return true;
  }
  
  return false;
};

// 删除评论
export const deleteComment = (commentId: string): boolean => {
  const comments = getComments();
  const filtered = comments.filter(c => c.id !== commentId);
  
  if (filtered.length !== comments.length) {
    saveToStorage(STORAGE_KEYS.comments, filtered);
    notifyDataChange();
    return true;
  }
  
  return false;
};

// ========== 搜索和筛选 ==========

export const searchReports = (query: string, topic?: ResourceTopic | 'all'): Report[] => {
  const reports = getReports();
  return reports.filter(report => {
    const matchesSearch = !query ||
      report.title.toLowerCase().includes(query.toLowerCase()) ||
      report.summary.toLowerCase().includes(query.toLowerCase());
    const matchesTopic = !topic || topic === 'all' || (report.topics || []).includes(topic as ResourceTopic);
    return matchesSearch && matchesTopic && report.status === 'published';
  });
};

export const searchInsights = (query: string, topic?: ResourceTopic | 'all'): InsightArticle[] => {
  const articles = getInsights();
  return articles.filter(article => {
    const matchesSearch = !query ||
      article.title.toLowerCase().includes(query.toLowerCase()) ||
      article.excerpt.toLowerCase().includes(query.toLowerCase());
    const matchesTopic = !topic || topic === 'all' || (article.topics || []).includes(topic as ResourceTopic);
    return matchesSearch && matchesTopic && article.status === 'published';
  });
};

export const searchBooks = (query: string, topic?: ResourceTopic | 'all'): Book[] => {
  const books = getBooks();
  return books.filter(book => {
    const matchesSearch = !query ||
      book.title.toLowerCase().includes(query.toLowerCase()) ||
      book.description.toLowerCase().includes(query.toLowerCase());
    const matchesTopic = !topic || topic === 'all' || (book.topics || []).includes(topic as ResourceTopic);
    return matchesSearch && matchesTopic && book.status === 'published';
  });
};

// ========== 统计数据 ==========

export const getStats = () => {
  const reports = getReports().filter(r => r.status === 'published');
  const insights = getInsights().filter(i => i.status === 'published');
  const books = getBooks().filter(b => b.status === 'published');
  
  return {
    reports: reports.length,
    insights: insights.length,
    books: books.length,
    totalViews: reports.reduce((sum, r) => sum + r.views, 0) + 
                insights.reduce((sum, i) => sum + i.views, 0) +
                books.reduce((sum, b) => sum + b.views, 0),
    hotReports: 0,
  };
};

// ========== 系统设置管理 ==========

// 默认系统设置
const defaultSystemSettings: SystemSettings = {
  // 基本信息
  siteName: '益语智库 Yiyu Think Tank',
  siteDescription: '致力于为公益组织、社会企业提供专业的战略咨询和能力建设服务',
  contactEmail: 'guyuan@klngo.org',
  contactPhone: '18027370767',
  
  // SEO
  seoTitle: '益语智库 - 公益行业战略咨询与能力建设平台',
  seoKeywords: ['公益', '战略咨询', '能力建设', '社会企业', '行业研究', 'AI', '数字化转型'],
  seoDescription: '益语智库是专注于公益行业的战略咨询与能力建设平台，提供深度洞察、行业报告、专业培训等服务，助力公益组织实现可持续发展。',
  
  // 功能开关
  allowRegistration: true,
  requireInvitation: false,
  commentModeration: true,
  
  // 关于我们
  aboutTitle: '关于益语智库',
  aboutContent: `益语智库（Yiyu Think Tank）成立于2020年，是一家专注于公益行业的专业智库机构。我们致力于通过深度研究、战略咨询和能力建设，推动公益行业的专业化和可持续发展。

我们的核心服务包括：
- 行业研究与洞察：发布公益行业发展报告，提供前沿趋势分析
- 战略咨询：为公益组织提供战略规划、组织发展等咨询服务
- 能力建设：开展专业培训，提升公益从业者的专业能力
- 数字化转型：协助公益组织进行数字化升级，提高运营效率

我们相信，专业化的公益行业能够创造更大的社会价值。`,
  teamTitle: '核心团队',
  teamMembers: [
    {
      name: '张明',
      role: '创始人 & CEO',
      bio: '15年公益行业经验，曾任多家知名基金会战略顾问',
      avatar: '',
    },
    {
      name: '李华',
      role: '首席研究员',
      bio: '社会学博士，专注公益行业发展研究',
      avatar: '',
    },
    {
      name: '王芳',
      role: '战略咨询总监',
      bio: '10年管理咨询经验，服务过50+公益组织',
      avatar: '',
    },
  ],
  
  // 更新信息
  updatedAt: new Date().toISOString(),
  updatedBy: '系统初始化',
};

// 获取系统设置
export const getSystemSettings = (): SystemSettings => {
  return loadFromStorage(STORAGE_KEYS.systemSettings, defaultSystemSettings);
};

// 保存系统设置
export const saveSystemSettings = (settings: Partial<SystemSettings>): SystemSettings => {
  const currentSettings = getSystemSettings();
  const updatedSettings: SystemSettings = {
    ...currentSettings,
    ...settings,
    updatedAt: new Date().toISOString(),
  };
  
  saveToStorage(STORAGE_KEYS.systemSettings, updatedSettings);
  notifyDataChange();
  
  return updatedSettings;
};

// 重置系统设置为默认值
export const resetSystemSettings = (): SystemSettings => {
  const resetSettings = {
    ...defaultSystemSettings,
    updatedAt: new Date().toISOString(),
    updatedBy: '系统重置',
  };
  
  saveToStorage(STORAGE_KEYS.systemSettings, resetSettings);
  notifyDataChange();
  
  return resetSettings;
};

export const bootstrapFromPgApi = async (): Promise<boolean> => {
  if (typeof window === 'undefined') return false;

  try {
    const res = await httpRequest('/api/content-snapshot', { cache: 'no-store' });
    if (!res.ok) {
      const body = await res.text();
      console.error('content-snapshot request failed:', res.status, body.slice(0, 200));
      return false;
    }

    const contentType = res.headers.get('content-type') || '';
    if (contentType && !contentType.includes('application/json')) {
      console.warn('content-snapshot response is not JSON:', res.status, contentType);
      return false;
    }

    const payload = await res.json();
    if (!payload || payload.ok !== true) {
      console.error('content-snapshot payload invalid:', payload);
      return false;
    }

    // 报告: 合并本地新增 —— 后台新上传的报告先写在 localStorage 镜像里, 后端快照还没有它,
    // 必须保留, 否则每次 bootstrap 都把它冲掉(这正是"上传后前台看不到"的根因)。
    // 新机制: 仅保留有 Markdown 解读稿的报告 —— 后端历史旧报告/样例(无 MD 或样例 id)一并过滤, 不再回流。
    const backendReports = ((payload.reports || []) as Report[]).filter((r) => !isStaleReport(r));
    const backendIds = new Set(backendReports.map((r) => r && r.id));
    let localReports: Report[] = [];
    try { localReports = JSON.parse(localStorage.getItem(STORAGE_KEYS.reports) || '[]'); } catch { localReports = []; }
    // 保留后端没有的本地报告(后台新上传、尚未同步到云者), 同样只保留新机制 MD 报告, 旧报告/样例不留痕。
    const localOnlyReports = localReports.filter(
      (r) => r && r.id && !backendIds.has(r.id) && !isStaleReport(r),
    );
    const mergedReports = [...localOnlyReports, ...backendReports];

    const writes: Array<[string, any]> = [
      [STORAGE_KEYS.reports, mergedReports],
      [STORAGE_KEYS.insights, payload.insights || []],
      [STORAGE_KEYS.methodologies, payload.methodologies || []],
      [STORAGE_KEYS.books, payload.books || []],
      [STORAGE_KEYS.categories, payload.categories || []],
      [STORAGE_KEYS.tags, payload.tags || []],
    ];

    if (payload.systemSettings) {
      writes.push([STORAGE_KEYS.systemSettings, payload.systemSettings]);
    }

    for (const [key, value] of writes) {
      contentMemoryCache.set(key, value);
      if (key === STORAGE_KEYS.reports) {
        // 保留报告的本地镜像(含本地新增), 供跨刷新/标签页读取
        try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
      } else {
        try { localStorage.removeItem(key); } catch {}
      }
    }

    // 清理浏览器内历史内容缓存(reports 除外, 它要保留本地镜像)
    for (const key of CONTENT_STORAGE_KEYS) {
      if (key === STORAGE_KEYS.reports) continue;
      try { localStorage.removeItem(key); } catch {}
    }

    try {
      window.dispatchEvent(new Event('yiyu_data_change'));
    } catch {}

    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const name = error instanceof Error ? error.name : '';
    if (name === 'AbortError' || message.includes('Failed to fetch')) {
      return false;
    }
    console.error('bootstrapFromPgApi failed:', error);
    return false;
  }
};

// 清除缓存（清除所有localStorage数据）
export const clearAllCache = (): boolean => {
  try {
    // 保存系统设置，其他数据清空
    const settings = getSystemSettings();
    Object.keys(STORAGE_KEYS).forEach(key => {
      const storageKey = STORAGE_KEYS[key as keyof typeof STORAGE_KEYS];
      if (key !== 'systemSettings') {
        if (CONTENT_STORAGE_KEYS.has(storageKey)) contentMemoryCache.delete(storageKey);
        localStorage.removeItem(storageKey);
      }
    });
    notifyDataChange();
    return true;
  } catch (error) {
    console.error('清除缓存失败:', error);
    return false;
  }
};

// 导出所有数据为JSON
export const exportAllData = (): string => {
  const data = {
    reports: getReports(),
    insights: getInsights(),
    methodologies: getMethodologies(),
    books: getBooks(),
    categories: getCategories(),
    tags: getTags(),
    comments: getComments(),
    systemSettings: getSystemSettings(),
    exportTime: new Date().toISOString(),
  };
  
  return JSON.stringify(data, null, 2);
};

// 导入数据
export const importAllData = (jsonData: string): boolean => {
  try {
    const data = JSON.parse(jsonData);
    
    // 验证数据结构
    if (!data.reports || !data.insights || !data.books) {
      throw new Error('数据格式不正确');
    }
    
    // 导入各类数据
    // 报告: 与本地合并 —— 后端没有的本地报告(如后台新上传、尚未同步到云的)予以保留,
    // 避免每次启动 bootstrap 把本地上传冲掉。冲突 id 以后端为准(生产真相)。
    if (data.reports) {
      const backendReports = data.reports as Report[];
      const backendIds = new Set(backendReports.map((r) => r.id));
      const localReports = loadFromStorage(STORAGE_KEYS.reports, []) as Report[];
      const localOnly = localReports.filter(
        (r) => r && r.id && !backendIds.has(r.id) && r.id !== SET_INDEX_SEED_REPORT.id,
      );
      saveToStorage(STORAGE_KEYS.reports, [...localOnly, ...backendReports]);
    }
    if (data.insights) saveToStorage(STORAGE_KEYS.insights, data.insights);
    if (data.methodologies) saveToStorage(STORAGE_KEYS.methodologies, data.methodologies);
    if (data.books) saveToStorage(STORAGE_KEYS.books, data.books);
    if (data.categories) saveToStorage(STORAGE_KEYS.categories, data.categories);
    if (data.tags) saveToStorage(STORAGE_KEYS.tags, data.tags);
    if (data.comments) saveToStorage(STORAGE_KEYS.comments, data.comments);
    if (data.systemSettings) saveToStorage(STORAGE_KEYS.systemSettings, data.systemSettings);
    
    notifyDataChange();
    return true;
  } catch (error) {
    console.error('导入数据失败:', error);
    return false;
  }
};

// ========== 用户管理 ==========

// 初始化默认用户数据（包含一些测试用户）
const initDefaultUsers = (): User[] => [
  {
    id: 'user_momo_colleague',
    email: '13631445251@phone.local',
    nickname: '默默的同事',
    phone: '13631445251',
    memberType: 'regular',
    status: 'active',
    createdAt: new Date().toISOString(),
    lastLoginAt: undefined,
    loginCount: 0,
    commentsCount: 0,
    favoritesCount: 0,
  },
  {
    id: 'user_doubao_colleague',
    email: '18027370767@phone.local',
    nickname: '豆包的同事',
    phone: '18027370767',
    memberType: 'gold',
    status: 'active',
    paidSource: 'manual',
    paidStartedAt: '2026-01-12T10:00:00.000Z',
    paidExpiresAt: '2026-12-31T23:59:59.000Z',
    paidNote: '历史付费会员测试账号',
    createdAt: new Date().toISOString(),
    lastLoginAt: undefined,
    loginCount: 0,
    commentsCount: 0,
    favoritesCount: 0,
  },
  {
    id: 'user_001',
    email: 'test@example.com',
    nickname: '测试用户',
    phone: '13800138000',
    memberType: 'gold',
    status: 'active',
    paidSource: 'manual',
    paidStartedAt: '2026-01-15T10:00:00.000Z',
    paidExpiresAt: '2026-04-15T10:00:00.000Z',
    createdAt: '2026-01-15T10:00:00.000Z',
    lastLoginAt: '2026-02-01T08:30:00.000Z',
    loginCount: 45,
    commentsCount: 12,
    favoritesCount: 28,
  },
  {
    id: 'user_002',
    email: 'user@example.com',
    nickname: '示例普通用户',
    memberType: 'regular',
    status: 'active',
    createdAt: '2026-01-20T14:20:00.000Z',
    lastLoginAt: '2026-01-31T16:45:00.000Z',
    loginCount: 23,
    commentsCount: 5,
    favoritesCount: 15,
  },
  {
    id: 'user_003',
    email: 'diamond@example.com',
    nickname: '示例付费用户',
    memberType: 'gold',
    status: 'active',
    paidSource: 'invite_code',
    paidStartedAt: '2026-01-10T09:00:00.000Z',
    paidExpiresAt: '2027-01-10T09:00:00.000Z',
    paidNote: '通过邀请码转为付费会员',
    invitationCode: 'DIAMOND2026',
    createdAt: '2026-01-10T09:00:00.000Z',
    lastLoginAt: '2026-02-01T20:15:00.000Z',
    loginCount: 89,
    commentsCount: 34,
    favoritesCount: 67,
  },
];

// 获取所有用户
export const getUsers = (): User[] => {
  return loadFromStorage(STORAGE_KEYS.users, initDefaultUsers());
};

// 获取单个用户
export const getUserById = (id: string): User | null => {
  const users = getUsers();
  return users.find(u => u.id === id) || null;
};

// 根据邮箱获取用户
export const getUserByEmail = (email: string): User | null => {
  const users = getUsers();
  return users.find(u => u.email === email) || null;
};

// 保存用户（创建或更新）
export const saveUser = (user: Partial<User> | User): User => {
  const users = getUsers();
  const now = new Date().toISOString();
  
  if ('id' in user && user.id) {
    // 更新现有用户
    const index = users.findIndex(u => u.id === user.id);
    if (index !== -1) {
      users[index] = { 
        ...users[index], 
        ...user,
      };
      saveToStorage(STORAGE_KEYS.users, users);
      notifyDataChange();
      return users[index];
    }
  }
  
  // 创建新用户
  const newUser: User = {
    id: user.id || `user_${Date.now()}`,
    email: user.email || '',
    nickname: user.nickname || '新用户',
    avatar: user.avatar,
    phone: user.phone,
    memberType: user.memberType || 'regular',
    status: user.status || 'active',
    paidSource: user.paidSource,
    paidStartedAt: user.paidStartedAt,
    paidExpiresAt: user.paidExpiresAt,
    paidNote: user.paidNote,
    invitationCode: user.invitationCode,
    invitedBy: user.invitedBy,
    createdAt: user.createdAt || now,
    lastLoginAt: user.lastLoginAt,
    loginCount: user.loginCount || 0,
    commentsCount: user.commentsCount || 0,
    favoritesCount: user.favoritesCount || 0,
  };
  
  users.unshift(newUser);
  saveToStorage(STORAGE_KEYS.users, users);
  notifyDataChange();
  
  return newUser;
};

// 更新用户状态（启用/禁用）
export const updateUserStatus = (userId: string, status: 'active' | 'disabled'): boolean => {
  const users = getUsers();
  const index = users.findIndex(u => u.id === userId);
  
  if (index !== -1) {
    users[index].status = status;
    saveToStorage(STORAGE_KEYS.users, users);
    notifyDataChange();
    return true;
  }
  
  return false;
};

// 更新用户会员类型
export const updateUserMemberType = (userId: string, memberType: 'regular' | 'gold' | 'diamond'): boolean => {
  const users = getUsers();
  const index = users.findIndex(u => u.id === userId);
  
  if (index !== -1) {
    users[index].memberType = memberType;
    saveToStorage(STORAGE_KEYS.users, users);
    notifyDataChange();
    return true;
  }
  
  return false;
};

// 记录用户登录
export const recordUserLogin = (userId: string): boolean => {
  const users = getUsers();
  const index = users.findIndex(u => u.id === userId);
  
  if (index !== -1) {
    users[index].lastLoginAt = new Date().toISOString();
    users[index].loginCount = (users[index].loginCount || 0) + 1;
    saveToStorage(STORAGE_KEYS.users, users);
    notifyDataChange();
    return true;
  }
  
  return false;
};

// 删除用户
export const deleteUser = (userId: string): boolean => {
  const users = getUsers();
  const filtered = users.filter(u => u.id !== userId);
  
  if (filtered.length !== users.length) {
    saveToStorage(STORAGE_KEYS.users, filtered);
    notifyDataChange();
    return true;
  }
  
  return false;
};

// 搜索用户
export const searchUsers = (query: string, memberType?: string, status?: string): User[] => {
  const users = getUsers();
  return users.filter(user => {
    const matchesSearch = !query || 
      user.nickname.toLowerCase().includes(query.toLowerCase()) ||
      user.email.toLowerCase().includes(query.toLowerCase()) ||
      user.phone?.includes(query);
    const matchesMemberType = !memberType || memberType === 'all' || user.memberType === memberType;
    const matchesStatus = !status || status === 'all' || user.status === status;
    return matchesSearch && matchesMemberType && matchesStatus;
  });
};

// 获取用户统计数据
export const getUserStats = () => {
  const users = getUsers();
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  return {
    total: users.length,
    active: users.filter(u => u.status === 'active').length,
    disabled: users.filter(u => u.status === 'disabled').length,
    todayNew: users.filter(u => new Date(u.createdAt) >= today).length,
    regular: users.filter(u => u.memberType === 'regular').length,
    gold: users.filter(u => u.memberType === 'gold').length,
    diamond: users.filter(u => u.memberType === 'diamond').length,
    paid: users.filter(u => u.memberType !== 'regular').length,
    membershipRate: users.length > 0 
      ? Math.round((users.filter(u => u.memberType !== 'regular').length / users.length) * 100) 
      : 0,
  };
};

// ========== 咨询申请（战略咨询申请表单） ==========

const initDefaultConsultRequests = (): ConsultRequest[] => [];

export const getConsultRequests = (): ConsultRequest[] => {
  return loadFromStorage(STORAGE_KEYS.consultRequests, initDefaultConsultRequests());
};

export const saveConsultRequest = (
  req: Omit<ConsultRequest, 'id' | 'createdAt'> | ConsultRequest
): ConsultRequest => {
  const list = getConsultRequests();
  const now = new Date().toISOString();

  if ((req as ConsultRequest).id) {
    const r = req as ConsultRequest;
    const idx = list.findIndex(x => x.id === r.id);
    if (idx !== -1) {
      list[idx] = { ...list[idx], ...r };
      saveToStorage(STORAGE_KEYS.consultRequests, list);
      notifyDataChange();
      return list[idx];
    }
  }

  const next: ConsultRequest = {
    ...(req as any),
    id: (req as any).id || `cr_${Date.now()}`,
    createdAt: (req as any).createdAt || now,
    status: (req as any).status || 'new',
  };

  list.unshift(next);
  saveToStorage(STORAGE_KEYS.consultRequests, list);
  notifyDataChange();
  return next;
};

export default {
  // 报告
  getReports,
  saveReport,
  deleteReport,
  
  // 洞察
  getInsights,
  saveInsight,
  deleteInsight,
  
  // 书籍
  getBooks,
  saveBook,
  deleteBook,
  
  // 标签
  getTags,
  getUsedTags,
  addUsedTag,
  
  // 分类
  getCategories,
  saveCategory,
  
  // 评论
  getComments,
  getCommentsByContent,
  saveComment,
  updateCommentStatus,
  replyComment,
  deleteComment,
  
  // 搜索
  searchReports,
  searchInsights,
  searchBooks,
  
  // 统计
  getStats,
  
  // 系统设置
  getSystemSettings,
  saveSystemSettings,
  resetSystemSettings,
  
  // 数据管理
  clearAllCache,
  exportAllData,
  importAllData,
  
  // 用户管理
  getUsers,
  getUserById,
  getUserByEmail,
  saveUser,
  updateUserStatus,
  updateUserMemberType,
  recordUserLogin,
  deleteUser,
  searchUsers,
  getUserStats,

  // 咨询申请
  getConsultRequests,
  saveConsultRequest,
  
  // 工具
  calculateReadTime,
};
