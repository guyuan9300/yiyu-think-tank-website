/**
 * 益语智库 TypeScript 类型定义
 * 包含所有数据模型的类型定义
 */

// ================================================
// 内容相关类型
// ================================================

export type ContentStatus = 'draft' | 'published' | 'archived';
export type MemberType = 'regular' | 'gold' | 'diamond';
export type UserStatus = 'active' | 'disabled';
export type CommentStatus = 'pending' | 'approved' | 'rejected';
export type ContentType = 'insight' | 'report' | 'book';

/**
 * 报告类型
 */
export interface Report {
  id: string;
  title: string;
  publisher: string;
  category: string;
  summary: string;
  tags: string[];
  version: string;
  format: string[];  // ['PPT', 'PDF']
  coverImage?: string;
  fileUrl?: string;
  fileSize?: number;
  pages?: number;
  publishDate: string;
  status: ContentStatus;
  isHot: boolean;
  showOnHome: boolean;
  views: number;
  downloads: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * 洞察文章类型
 */
export interface InsightArticle {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  category: string;
  tags: string[];
  coverImage?: string;
  author: string;
  readTime: number;
  publishDate: string;
  status: ContentStatus;
  featured: boolean;
  showOnHome: boolean;
  views: number;
  likes: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * 书籍类型
 */
export interface Book {
  id: string;
  title: string;
  author: string;
  description: string;
  abstract: string;
  category: string;
  tags: string[];
  pages: number;
  duration: string;
  rating: number;
  coverImage?: string;
  coverColor?: string;
  publishDate: string;
  status: ContentStatus;
  views: number;
  reviews: number;
  createdAt: string;
  updatedAt: string;
}

// ================================================
// 内容摘要类型（用于列表展示）
// ================================================

export interface ContentSummary {
  id: string;
  title: string;
  excerpt?: string;
  coverImage?: string;
  category: string;
  publishDate: string;
  views: number;
}

// ================================================
// 分类和标签
// ================================================

export interface Category {
  id: string;
  name: string;
  type: ContentType;
  parentId?: string;
  sort: number;
}

export interface Tag {
  id: string;
  name: string;
  count: number;
}

// ================================================
// 评论相关
// ================================================

export interface Comment {
  id: string;
  contentId: string;
  contentType: ContentType;
  contentTitle: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  text: string;
  status: CommentStatus;
  reply?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CommentInput {
  contentId: string;
  contentType: ContentType;
  contentTitle: string;
  text: string;
}

// ================================================
// 用户相关
// ================================================

export interface User {
  id: string;
  email: string;
  nickname: string;
  avatar?: string;
  phone?: string;
  memberType: MemberType;
  status: UserStatus;
  invitationCode?: string;
  invitedBy?: string;
  createdAt: string;
  lastLoginAt?: string;
  loginCount: number;
  commentsCount: number;
  favoritesCount: number;
}

export interface UserProfileUpdate {
  nickname?: string;
  avatar?: string;
  phone?: string;
}

export interface UserStats {
  total: number;
  active: number;
  disabled: number;
  todayNew: number;
  regular: number;
  gold: number;
  diamond: number;
  membershipRate: number;
}

// ================================================
// 邀请码相关
// ================================================

export type InviteCodeType = '7days' | '30days' | '90days' | 'forever' | 'custom';

export interface InviteCode {
  id: string;
  code: string;
  type: InviteCodeType;
  maxUses: number;
  currentUses: number;
  isActive: boolean;
  expiresAt?: string;
  createdBy?: string;
  createdAt: string;
  usedAt?: string;
}

export interface InviteCodeTypeInfo {
  label: string;
  days: number;
  description: string;
}

export const INVITE_CODE_TYPES: Record<InviteCodeType, InviteCodeTypeInfo> = {
  '7days': { label: '7天体验', days: 7, description: '7天黄金会员体验' },
  '30days': { label: '30天会员', days: 30, description: '30天黄金会员' },
  '90days': { label: '90天会员', days: 90, description: '90天黄金会员' },
  'forever': { label: '永久会员', days: -1, description: '永久黄金会员' },
  'custom': { label: '自定义', days: 0, description: '自定义类型' },
};

// ================================================
// 系统设置
// ================================================

export interface TeamMember {
  name: string;
  role: string;
  bio?: string;
  avatar?: string;
}

export interface SystemSettings {
  siteName: string;
  siteLogo?: string;
  siteDescription: string;
  contactEmail: string;
  contactPhone?: string;
  seoTitle: string;
  seoKeywords: string[];
  seoDescription: string;
  allowRegistration: boolean;
  requireInvitation: boolean;
  commentModeration: boolean;
  aboutTitle: string;
  aboutContent: string;
  teamTitle?: string;
  teamMembers?: TeamMember[];
  updatedAt: string;
  updatedBy: string;
}

// ================================================
// 收藏和阅读历史
// ================================================

export interface Favorite {
  id: string;
  userId: string;
  contentId: string;
  contentType: ContentType;
  contentTitle: string;
  createdAt: string;
}

export interface ReadingHistory {
  id: string;
  userId: string;
  contentId: string;
  contentType: ContentType;
  progress: number;
  createdAt: string;
  updatedAt: string;
}

// ================================================
// 统计数据
// ================================================

export interface ContentStats {
  reports: number;
  insights: number;
  books: number;
  totalViews: number;
  hotReports: number;
}

export interface Stats {
  reports: number;
  insights: number;
  books: number;
  totalViews: number;
  hotReports: number;
}

// ================================================
// API 响应类型
// ================================================

export interface ApiResponse<T> {
  data: T | null;
  error?: string;
  success: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ================================================
// 表单数据类型
// ================================================

export interface ReportFormData {
  title: string;
  publisher: string;
  category: string;
  summary: string;
  tags: string[];
  version: string;
  format: string[];
  coverImage?: string;
  fileUrl?: string;
  fileSize?: number;
  pages?: number;
  publishDate: string;
  status: ContentStatus;
  isHot: boolean;
  showOnHome: boolean;
}

export interface InsightFormData {
  title: string;
  excerpt: string;
  content: string;
  category: string;
  tags: string[];
  coverImage?: string;
  author: string;
  readTime: number;
  publishDate: string;
  status: ContentStatus;
  featured: boolean;
  showOnHome: boolean;
}

export interface BookFormData {
  title: string;
  author: string;
  description: string;
  abstract: string;
  category: string;
  tags: string[];
  pages: number;
  duration: string;
  rating: number;
  coverImage?: string;
  coverColor?: string;
  publishDate: string;
  status: ContentStatus;
}

// ================================================
// 筛选和搜索
// ================================================

export interface SearchFilters {
  query?: string;
  category?: string;
  tags?: string[];
  status?: ContentStatus;
  dateFrom?: string;
  dateTo?: string;
}

export interface ReportFilters extends SearchFilters {
  isHot?: boolean;
  showOnHome?: boolean;
}

export interface InsightFilters extends SearchFilters {
  featured?: boolean;
  showOnHome?: boolean;
}

export interface BookFilters extends SearchFilters {
  ratingMin?: number;
  ratingMax?: number;
}

// ================================================
// 导航相关
// ================================================

export type Page =
  | 'home'
  | 'insights'
  | 'insight-detail'
  | 'reports'
  | 'report-detail'
  | 'books'
  | 'book-detail'
  | 'learning'
  | 'strategy'
  | 'about'
  | 'login'
  | 'register'
  | 'user-center'
  | 'admin'
  | 'admin-dashboard'
  | 'admin-users'
  | 'admin-reports'
  | 'admin-insights'
  | 'admin-books'
  | 'admin-settings';

export interface NavigationItem {
  id: Page;
  label: string;
  path: string;
  icon?: React.ReactNode;
}

// ================================================
// 通知和消息
// ================================================

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
}
