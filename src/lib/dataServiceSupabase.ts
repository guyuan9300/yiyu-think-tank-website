/**
 * Supabase 数据服务层
 * 使用Supabase替代localStorage进行数据持久化
 */
import { createClient } from '@supabase/supabase-js';

// 从环境变量获取配置
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://bnflqessqkkxsrumwbkb.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_igknTd2-xDRARspwBxk9EQ_qU0XzFy-';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 服务端专用客户端（使用service_role_key）
export const createServerClient = (serviceRoleKey: string) => {
  return createClient(supabaseUrl, serviceRoleKey);
};

export default supabase;

// 数据类型定义
export interface Report {
  id: string;
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
  status: 'draft' | 'published' | 'archived';
  isHot: boolean;
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
  category: string;
  tags: string[];
  coverImage?: string;
  author: string;
  readTime: number;
  publishDate: string;
  status: 'draft' | 'published' | 'archived';
  featured: boolean;
  showOnHome: boolean;
  views: number;
  likes: number;
  createdAt: string;
  updatedAt: string;
}

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
  status: 'draft' | 'published' | 'archived';
  views: number;
  reviews: number;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  type: 'insight' | 'report' | 'book';
  parentId?: string;
  sort: number;
}

export interface Comment {
  id: string;
  contentId: string;
  contentType: 'insight' | 'report' | 'book';
  contentTitle: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  text: string;
  status: 'pending' | 'approved' | 'rejected';
  reply?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Tag {
  id: string;
  name: string;
  count: number;
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
  teamMembers?: Array<{
    name: string;
    role: string;
    bio?: string;
    avatar?: string;
  }>;
  updatedAt: string;
  updatedBy: string;
}

// 数据转换工具函数
const formatDate = (dateStr: string | null): string => {
  if (!dateStr) return new Date().toISOString().split('T')[0];
  return typeof dateStr === 'string' ? dateStr.split('T')[0] : dateStr;
};

// 类型断言工具函数
const toReportStatus = (status: unknown): 'draft' | 'published' | 'archived' => {
  const validStatuses = ['draft', 'published', 'archived'];
  const s = String(status);
  return validStatuses.includes(s) ? s as 'draft' | 'published' | 'archived' : 'draft';
};

const toContentType = (type: unknown): 'insight' | 'report' | 'book' => {
  const validTypes = ['insight', 'report', 'book'];
  const t = String(type);
  return validTypes.includes(t) ? t as 'insight' | 'report' | 'book' : 'insight';
};

// ================================================
// 报告管理 (Reports)
// ================================================

export const getReports = async (): Promise<Report[]> => {
  const { data, error } = await supabase
    .from('reports')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('获取报告失败:', error);
    return [];
  }

  return (data || []).map((item: Record<string, unknown>) => ({
    id: String(item.id || ''),
    title: String(item.title || ''),
    publisher: String(item.publisher || ''),
    category: String(item.category || ''),
    summary: String(item.summary || ''),
    tags: Array.isArray(item.tags) ? item.tags as string[] : [],
    version: String(item.version || 'v1.0'),
    format: Array.isArray(item.format) ? item.format as string[] : [],
    coverImage: item.cover_image as string | undefined,
    fileUrl: item.file_url as string | undefined,
    fileSize: item.file_size as number | undefined,
    pages: item.pages as number | undefined,
    publishDate: formatDate(item.publish_date as string | null),
    status: toReportStatus(item.status),
    isHot: Boolean(item.is_hot),
    showOnHome: Boolean(item.show_on_home),
    views: Number(item.views) || 0,
    downloads: Number(item.downloads) || 0,
    createdAt: String(item.created_at || ''),
    updatedAt: String(item.updated_at || ''),
  }));
};

export const saveReport = async (report: Partial<Report>): Promise<Report | null> => {
  const reportData: Record<string, unknown> = {
    title: report.title,
    publisher: report.publisher,
    category: report.category,
    summary: report.summary,
    tags: report.tags,
    version: report.version,
    format: report.format,
    cover_image: report.coverImage,
    file_url: report.fileUrl,
    file_size: report.fileSize,
    pages: report.pages,
    publish_date: report.publishDate,
    status: report.status,
    is_hot: report.isHot,
    show_on_home: report.showOnHome,
    views: report.views,
    downloads: report.downloads,
  };

  let result: { data: Record<string, unknown> | null; error: unknown | null };

  if (report.id) {
    const { data, error } = await supabase
      .from('reports')
      .update(reportData)
      .eq('id', report.id)
      .select()
      .single();
    result = { data, error };
  } else {
    const { data, error } = await supabase
      .from('reports')
      .insert(reportData)
      .select()
      .single();
    result = { data, error };
  }

  if (result.error) {
    console.error('保存报告失败:', result.error);
    return null;
  }

  if (!result.data) return null;

  const item = result.data;
  return {
    id: String(item.id || ''),
    title: String(item.title || ''),
    publisher: String(item.publisher || ''),
    category: String(item.category || ''),
    summary: String(item.summary || ''),
    tags: Array.isArray(item.tags) ? item.tags as string[] : [],
    version: String(item.version || 'v1.0'),
    format: Array.isArray(item.format) ? item.format as string[] : [],
    coverImage: item.cover_image as string | undefined,
    fileUrl: item.file_url as string | undefined,
    fileSize: item.file_size as number | undefined,
    pages: item.pages as number | undefined,
    publishDate: formatDate(item.publish_date as string | null),
    status: toReportStatus(item.status),
    isHot: Boolean(item.is_hot),
    showOnHome: Boolean(item.show_on_home),
    views: Number(item.views) || 0,
    downloads: Number(item.downloads) || 0,
    createdAt: String(item.created_at || ''),
    updatedAt: String(item.updated_at || ''),
  };
};

export const deleteReport = async (id: string): Promise<boolean> => {
  const { error } = await supabase
    .from('reports')
    .delete()
    .eq('id', id);

  return !error;
};

export const incrementReportViews = async (id: string): Promise<void> => {
  await supabase.rpc('increment_views', { content_type: 'report', content_id: id });
};

export const incrementReportDownloads = async (id: string): Promise<void> => {
  await supabase.rpc('increment_downloads', { content_id: id });
};

// ================================================
// 洞察文章管理 (Insights)
// ================================================

export const getInsights = async (): Promise<InsightArticle[]> => {
  const { data, error } = await supabase
    .from('insights')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('获取洞察文章失败:', error);
    return [];
  }

  return (data || []).map((item: Record<string, unknown>) => ({
    id: String(item.id || ''),
    title: String(item.title || ''),
    excerpt: String(item.excerpt || ''),
    content: String(item.content || ''),
    category: String(item.category || ''),
    tags: Array.isArray(item.tags) ? item.tags as string[] : [],
    coverImage: item.cover_image as string | undefined,
    author: String(item.author || ''),
    readTime: Number(item.read_time) || 10,
    publishDate: formatDate(item.publish_date as string | null),
    status: toReportStatus(item.status),
    featured: Boolean(item.featured),
    showOnHome: Boolean(item.show_on_home),
    views: Number(item.views) || 0,
    likes: Number(item.likes) || 0,
    createdAt: String(item.created_at || ''),
    updatedAt: String(item.updated_at || ''),
  }));
};

export const saveInsight = async (article: Partial<InsightArticle>): Promise<InsightArticle | null> => {
  const articleData: Record<string, unknown> = {
    title: article.title,
    excerpt: article.excerpt,
    content: article.content,
    category: article.category,
    tags: article.tags,
    cover_image: article.coverImage,
    author: article.author,
    read_time: article.readTime,
    publish_date: article.publishDate,
    status: article.status,
    featured: article.featured,
    show_on_home: article.showOnHome,
    views: article.views,
    likes: article.likes,
  };

  let result: { data: Record<string, unknown> | null; error: unknown | null };

  if (article.id) {
    const { data, error } = await supabase
      .from('insights')
      .update(articleData)
      .eq('id', article.id)
      .select()
      .single();
    result = { data, error };
  } else {
    const { data, error } = await supabase
      .from('insights')
      .insert(articleData)
      .select()
      .single();
    result = { data, error };
  }

  if (result.error || !result.data) {
    console.error('保存洞察文章失败:', result.error);
    return null;
  }

  const item = result.data;
  return {
    id: String(item.id || ''),
    title: String(item.title || ''),
    excerpt: String(item.excerpt || ''),
    content: String(item.content || ''),
    category: String(item.category || ''),
    tags: Array.isArray(item.tags) ? item.tags as string[] : [],
    coverImage: item.cover_image as string | undefined,
    author: String(item.author || ''),
    readTime: Number(item.read_time) || 10,
    publishDate: formatDate(item.publish_date as string | null),
    status: toReportStatus(item.status),
    featured: Boolean(item.featured),
    showOnHome: Boolean(item.show_on_home),
    views: Number(item.views) || 0,
    likes: Number(item.likes) || 0,
    createdAt: String(item.created_at || ''),
    updatedAt: String(item.updated_at || ''),
  };
};

export const deleteInsight = async (id: string): Promise<boolean> => {
  const { error } = await supabase
    .from('insights')
    .delete()
    .eq('id', id);

  return !error;
};

export const incrementInsightViews = async (id: string): Promise<void> => {
  await supabase.rpc('increment_views', { content_type: 'insight', content_id: id });
};

export const incrementInsightLikes = async (id: string): Promise<void> => {
  await supabase.rpc('increment_likes', { content_type: 'insight', content_id: id });
};

// ================================================
// 书籍管理 (Books)
// ================================================

export const getBooks = async (): Promise<Book[]> => {
  const { data, error } = await supabase
    .from('books')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('获取书籍失败:', error);
    return [];
  }

  return (data || []).map((item: Record<string, unknown>) => ({
    id: String(item.id || ''),
    title: String(item.title || ''),
    author: String(item.author || ''),
    description: String(item.description || ''),
    abstract: String(item.abstract || ''),
    category: String(item.category || ''),
    tags: Array.isArray(item.tags) ? item.tags as string[] : [],
    pages: Number(item.pages) || 100,
    duration: String(item.duration || ''),
    rating: Number(item.rating) || 4.5,
    coverImage: item.cover_image as string | undefined,
    coverColor: item.cover_color as string | undefined,
    publishDate: formatDate(item.publish_date as string | null),
    status: toReportStatus(item.status),
    views: Number(item.views) || 0,
    reviews: Number(item.reviews) || 0,
    createdAt: String(item.created_at || ''),
    updatedAt: String(item.updated_at || ''),
  }));
};

export const saveBook = async (book: Partial<Book>): Promise<Book | null> => {
  const bookData: Record<string, unknown> = {
    title: book.title,
    author: book.author,
    description: book.description,
    abstract: book.abstract,
    category: book.category,
    tags: book.tags,
    pages: book.pages,
    duration: book.duration,
    rating: book.rating,
    cover_image: book.coverImage,
    cover_color: book.coverColor,
    publish_date: book.publishDate,
    status: book.status,
    views: book.views,
    reviews: book.reviews,
  };

  let result: { data: Record<string, unknown> | null; error: unknown | null };

  if (book.id) {
    const { data, error } = await supabase
      .from('books')
      .update(bookData)
      .eq('id', book.id)
      .select()
      .single();
    result = { data, error };
  } else {
    const { data, error } = await supabase
      .from('books')
      .insert(bookData)
      .select()
      .single();
    result = { data, error };
  }

  if (result.error || !result.data) {
    console.error('保存书籍失败:', result.error);
    return null;
  }

  const item = result.data;
  return {
    id: String(item.id || ''),
    title: String(item.title || ''),
    author: String(item.author || ''),
    description: String(item.description || ''),
    abstract: String(item.abstract || ''),
    category: String(item.category || ''),
    tags: Array.isArray(item.tags) ? item.tags as string[] : [],
    pages: Number(item.pages) || 100,
    duration: String(item.duration || ''),
    rating: Number(item.rating) || 4.5,
    coverImage: item.cover_image as string | undefined,
    coverColor: item.cover_color as string | undefined,
    publishDate: formatDate(item.publish_date as string | null),
    status: toReportStatus(item.status),
    views: Number(item.views) || 0,
    reviews: Number(item.reviews) || 0,
    createdAt: String(item.created_at || ''),
    updatedAt: String(item.updated_at || ''),
  };
};

export const deleteBook = async (id: string): Promise<boolean> => {
  const { error } = await supabase
    .from('books')
    .delete()
    .eq('id', id);

  return !error;
};

export const incrementBookViews = async (id: string): Promise<void> => {
  await supabase.rpc('increment_views', { content_type: 'book', content_id: id });
};

// ================================================
// 分类管理 (Categories)
// ================================================

export const getCategories = async (): Promise<Category[]> => {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('sort', { ascending: true });

  if (error) {
    console.error('获取分类失败:', error);
    return [];
  }

  return (data || []).map((item: Record<string, unknown>) => ({
    id: String(item.id || ''),
    name: String(item.name || ''),
    type: toContentType(item.type),
    parentId: item.parent_id as string | undefined,
    sort: Number(item.sort) || 0,
  }));
};

export const saveCategory = async (category: Category): Promise<void> => {
  const categoryData = {
    id: category.id,
    name: category.name,
    type: category.type,
    parent_id: category.parentId,
    sort: category.sort,
  };

  if (category.id) {
    await supabase
      .from('categories')
      .update(categoryData)
      .eq('id', category.id);
  } else {
    await supabase
      .from('categories')
      .insert(categoryData);
  }
};

// ================================================
// 标签管理 (Tags)
// ================================================

export const getTags = async (): Promise<Tag[]> => {
  const { data, error } = await supabase
    .from('tags')
    .select('*')
    .order('count', { ascending: false });

  if (error) {
    console.error('获取标签失败:', error);
    return [];
  }

  return (data || []).map((item: Record<string, unknown>) => ({
    id: String(item.id || ''),
    name: String(item.name || ''),
    count: Number(item.count) || 0,
  }));
};

export const getUsedTags = async (): Promise<string[]> => {
  const tags = await getTags();
  return tags.slice(0, 20).map(t => t.name);
};

export const addUsedTag = async (tag: string): Promise<void> => {
  const { data: existing } = await supabase
    .from('tags')
    .select('id')
    .eq('name', tag)
    .single();

  if (existing) {
    await supabase
      .from('tags')
      .update({ count: 1 })
      .eq('id', (existing as Record<string, unknown>).id);
  } else {
    await supabase
      .from('tags')
      .insert({ name: tag, count: 1 });
  }
};

// ================================================
// 评论管理 (Comments)
// ================================================

export const getComments = async (): Promise<Comment[]> => {
  const { data, error } = await supabase
    .from('comments')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('获取评论失败:', error);
    return [];
  }

  return (data || []).map((item: Record<string, unknown>) => ({
    id: String(item.id || ''),
    contentId: String(item.content_id || ''),
    contentType: (item.content_type as 'insight' | 'report' | 'book') || 'insight',
    contentTitle: String(item.content_title || ''),
    userId: String(item.user_id || ''),
    userName: String(item.user_name || ''),
    userAvatar: item.user_avatar as string | undefined,
    text: String(item.text || ''),
    status: (item.status as 'pending' | 'approved' | 'rejected') || 'pending',
    reply: item.reply as string | undefined,
    createdAt: String(item.created_at || ''),
    updatedAt: String(item.updated_at || ''),
  }));
};

export const getCommentsByContent = async (
  contentId: string,
  contentType: 'insight' | 'report' | 'book'
): Promise<Comment[]> => {
  const { data, error } = await supabase
    .from('comments')
    .select('*')
    .eq('content_id', contentId)
    .eq('content_type', contentType)
    .eq('status', 'approved')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('获取内容评论失败:', error);
    return [];
  }

  return (data || []).map((item: Record<string, unknown>) => ({
    id: String(item.id || ''),
    contentId: String(item.content_id || ''),
    contentType: (item.content_type as 'insight' | 'report' | 'book') || 'insight',
    contentTitle: String(item.content_title || ''),
    userId: String(item.user_id || ''),
    userName: String(item.user_name || ''),
    userAvatar: item.user_avatar as string | undefined,
    text: String(item.text || ''),
    status: (item.status as 'pending' | 'approved' | 'rejected') || 'pending',
    reply: item.reply as string | undefined,
    createdAt: String(item.created_at || ''),
    updatedAt: String(item.updated_at || ''),
  }));
};

export const saveComment = async (comment: Partial<Comment>): Promise<Comment | null> => {
  const commentData = {
    content_id: comment.contentId,
    content_type: comment.contentType,
    content_title: comment.contentTitle,
    user_id: comment.userId,
    user_name: comment.userName,
    user_avatar: comment.userAvatar,
    text: comment.text,
    status: 'pending',
    reply: comment.reply,
  };

  const { data, error } = await supabase
    .from('comments')
    .insert(commentData)
    .select()
    .single();

  if (error || !data) {
    console.error('保存评论失败:', error);
    return null;
  }

  const item = data as Record<string, unknown>;
  return {
    id: String(item.id || ''),
    contentId: String(item.content_id || ''),
    contentType: (item.content_type as 'insight' | 'report' | 'book') || 'insight',
    contentTitle: String(item.content_title || ''),
    userId: String(item.user_id || ''),
    userName: String(item.user_name || ''),
    userAvatar: item.user_avatar as string | undefined,
    text: String(item.text || ''),
    status: (item.status as 'pending' | 'approved' | 'rejected') || 'pending',
    reply: item.reply as string | undefined,
    createdAt: String(item.created_at || ''),
    updatedAt: String(item.updated_at || ''),
  };
};

export const updateCommentStatus = async (
  commentId: string,
  status: 'approved' | 'rejected'
): Promise<boolean> => {
  const { error } = await supabase
    .from('comments')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', commentId);

  return !error;
};

export const replyComment = async (commentId: string, replyText: string): Promise<boolean> => {
  const { error } = await supabase
    .from('comments')
    .update({ reply: replyText, updated_at: new Date().toISOString() })
    .eq('id', commentId);

  return !error;
};

export const deleteComment = async (commentId: string): Promise<boolean> => {
  const { error } = await supabase
    .from('comments')
    .delete()
    .eq('id', commentId);

  return !error;
};

// ================================================
// 系统设置 (System Settings)
// ================================================

export const getSystemSettings = async (): Promise<SystemSettings> => {
  const { data, error } = await supabase
    .from('system_settings')
    .select('*')
    .eq('id', 1)
    .single();

  if (error || !data) {
    // 返回默认值
    return {
      siteName: '益语智库 Yiyu Think Tank',
      siteDescription: '致力于为公益组织、社会企业提供专业的战略咨询和能力建设服务',
      contactEmail: 'contact@yiyu-thinktank.org',
      seoTitle: '益语智库 - 公益行业战略咨询与能力建设平台',
      seoKeywords: ['公益', '战略咨询', '能力建设', '社会企业', '行业研究', 'AI', '数字化转型'],
      seoDescription: '益语智库是专注于公益行业的战略咨询与能力建设平台',
      allowRegistration: true,
      requireInvitation: false,
      commentModeration: true,
      aboutTitle: '关于益语智库',
      aboutContent: '益语智库（Yiyu Think Tank）成立于2020年，是一家专注于公益行业的专业智库机构。',
      updatedAt: new Date().toISOString(),
      updatedBy: '系统',
    };
  }

  const item = data as Record<string, unknown>;
  return {
    siteName: String(item.site_name || '益语智库 Yiyu Think Tank'),
    siteLogo: item.site_logo as string | undefined,
    siteDescription: String(item.site_description || ''),
    contactEmail: String(item.contact_email || ''),
    contactPhone: item.contact_phone as string | undefined,
    seoTitle: String(item.seo_title || ''),
    seoKeywords: Array.isArray(item.seo_keywords) ? item.seo_keywords as string[] : [],
    seoDescription: String(item.seo_description || ''),
    allowRegistration: Boolean(item.allow_registration),
    requireInvitation: Boolean(item.require_invitation),
    commentModeration: Boolean(item.comment_moderation),
    aboutTitle: String(item.about_title || ''),
    aboutContent: String(item.about_content || ''),
    teamTitle: item.team_title as string | undefined,
    teamMembers: item.team_members as SystemSettings['teamMembers'],
    updatedAt: String(item.updated_at || ''),
    updatedBy: String(item.updated_by || ''),
  };
};

export const saveSystemSettings = async (
  settings: Partial<SystemSettings>
): Promise<SystemSettings> => {
  const settingsData: Record<string, unknown> = {
    site_name: settings.siteName,
    site_logo: settings.siteLogo,
    site_description: settings.siteDescription,
    contact_email: settings.contactEmail,
    contact_phone: settings.contactPhone,
    seo_title: settings.seoTitle,
    seo_keywords: settings.seoKeywords,
    seo_description: settings.seoDescription,
    allow_registration: settings.allowRegistration,
    require_invitation: settings.requireInvitation,
    comment_moderation: settings.commentModeration,
    about_title: settings.aboutTitle,
    about_content: settings.aboutContent,
    team_title: settings.teamTitle,
    team_members: settings.teamMembers,
    updated_at: new Date().toISOString(),
    updated_by: settings.updatedBy,
  };

  const { data, error } = await supabase
    .from('system_settings')
    .upsert({ id: 1, ...settingsData })
    .select()
    .single();

  if (error || !data) {
    console.error('保存系统设置失败:', error);
    return await getSystemSettings();
  }

  const item = data as Record<string, unknown>;
  return {
    siteName: String(item.site_name || ''),
    siteLogo: item.site_logo as string | undefined,
    siteDescription: String(item.site_description || ''),
    contactEmail: String(item.contact_email || ''),
    contactPhone: item.contact_phone as string | undefined,
    seoTitle: String(item.seo_title || ''),
    seoKeywords: Array.isArray(item.seo_keywords) ? item.seo_keywords as string[] : [],
    seoDescription: String(item.seo_description || ''),
    allowRegistration: Boolean(item.allow_registration),
    requireInvitation: Boolean(item.require_invitation),
    commentModeration: Boolean(item.comment_moderation),
    aboutTitle: String(item.about_title || ''),
    aboutContent: String(item.about_content || ''),
    teamTitle: item.team_title as string | undefined,
    teamMembers: item.team_members as SystemSettings['teamMembers'],
    updatedAt: String(item.updated_at || ''),
    updatedBy: String(item.updated_by || ''),
  };
};

// ================================================
// 搜索功能
// ================================================

export const searchReports = async (
  query: string,
  category?: string
): Promise<Report[]> => {
  let supabaseQuery = supabase
    .from('reports')
    .select('*')
    .eq('status', 'published');

  if (query) {
    supabaseQuery = supabaseQuery.or(`title.ilike.%${query}%,summary.ilike.%${query}%`);
  }

  if (category && category !== 'all') {
    supabaseQuery = supabaseQuery.eq('category', category);
  }

  const { data, error } = await supabaseQuery.order('created_at', { ascending: false });

  if (error) {
    console.error('搜索报告失败:', error);
    return [];
  }

  return (data || []).map((item: Record<string, unknown>) => ({
    id: String(item.id || ''),
    title: String(item.title || ''),
    publisher: String(item.publisher || ''),
    category: String(item.category || ''),
    summary: String(item.summary || ''),
    tags: Array.isArray(item.tags) ? item.tags as string[] : [],
    version: String(item.version || 'v1.0'),
    format: Array.isArray(item.format) ? item.format as string[] : [],
    coverImage: item.cover_image as string | undefined,
    fileUrl: item.file_url as string | undefined,
    fileSize: item.file_size as number | undefined,
    pages: item.pages as number | undefined,
    publishDate: formatDate(item.publish_date as string | null),
    status: toReportStatus(item.status),
    isHot: Boolean(item.is_hot),
    showOnHome: Boolean(item.show_on_home),
    views: Number(item.views) || 0,
    downloads: Number(item.downloads) || 0,
    createdAt: String(item.created_at || ''),
    updatedAt: String(item.updated_at || ''),
  }));
};

export const searchInsights = async (
  query: string,
  category?: string
): Promise<InsightArticle[]> => {
  let supabaseQuery = supabase
    .from('insights')
    .select('*')
    .eq('status', 'published');

  if (query) {
    supabaseQuery = supabaseQuery.or(`title.ilike.%${query}%,excerpt.ilike.%${query}%`);
  }

  if (category && category !== 'all') {
    supabaseQuery = supabaseQuery.eq('category', category);
  }

  const { data, error } = await supabaseQuery.order('created_at', { ascending: false });

  if (error) {
    console.error('搜索洞察文章失败:', error);
    return [];
  }

  return (data || []).map((item: Record<string, unknown>) => ({
    id: String(item.id || ''),
    title: String(item.title || ''),
    excerpt: String(item.excerpt || ''),
    content: String(item.content || ''),
    category: String(item.category || ''),
    tags: Array.isArray(item.tags) ? item.tags as string[] : [],
    coverImage: item.cover_image as string | undefined,
    author: String(item.author || ''),
    readTime: Number(item.read_time) || 10,
    publishDate: formatDate(item.publish_date as string | null),
    status: toReportStatus(item.status),
    featured: Boolean(item.featured),
    showOnHome: Boolean(item.show_on_home),
    views: Number(item.views) || 0,
    likes: Number(item.likes) || 0,
    createdAt: String(item.created_at || ''),
    updatedAt: String(item.updated_at || ''),
  }));
};

export const searchBooks = async (
  query: string,
  category?: string
): Promise<Book[]> => {
  let supabaseQuery = supabase
    .from('books')
    .select('*')
    .eq('status', 'published');

  if (query) {
    supabaseQuery = supabaseQuery.or(`title.ilike.%${query}%,description.ilike.%${query}%`);
  }

  if (category && category !== 'all') {
    supabaseQuery = supabaseQuery.eq('category', category);
  }

  const { data, error } = await supabaseQuery.order('created_at', { ascending: false });

  if (error) {
    console.error('搜索书籍失败:', error);
    return [];
  }

  return (data || []).map((item: Record<string, unknown>) => ({
    id: String(item.id || ''),
    title: String(item.title || ''),
    author: String(item.author || ''),
    description: String(item.description || ''),
    abstract: String(item.abstract || ''),
    category: String(item.category || ''),
    tags: Array.isArray(item.tags) ? item.tags as string[] : [],
    pages: Number(item.pages) || 100,
    duration: String(item.duration || ''),
    rating: Number(item.rating) || 4.5,
    coverImage: item.cover_image as string | undefined,
    coverColor: item.cover_color as string | undefined,
    publishDate: formatDate(item.publish_date as string | null),
    status: toReportStatus(item.status),
    views: Number(item.views) || 0,
    reviews: Number(item.reviews) || 0,
    createdAt: String(item.created_at || ''),
    updatedAt: String(item.updated_at || ''),
  }));
};

// ================================================
// 统计数据
// ================================================

export const getStats = async () => {
  const [reports, insights, books] = await Promise.all([
    getReports(),
    getInsights(),
    getBooks(),
  ]);

  return {
    reports: reports.filter(r => r.status === 'published').length,
    insights: insights.filter(i => i.status === 'published').length,
    books: books.filter(b => b.status === 'published').length,
    totalViews:
      reports.reduce((sum, r) => sum + (r.views || 0), 0) +
      insights.reduce((sum, i) => sum + (i.views || 0), 0) +
      books.reduce((sum, b) => sum + (b.views || 0), 0),
    hotReports: reports.filter(r => r.isHot).length,
  };
};

// ================================================
// 实时订阅
// ================================================

export const subscribeToDataChanges = (
  table: string,
  callback: (payload: unknown) => void
) => {
  return supabase
    .channel(`${table}_changes`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: table,
      },
      callback
    )
    .subscribe();
};

export const subscribeToAllDataChanges = (callback: (payload: unknown) => void) => {
  const tables = ['reports', 'insights', 'books', 'comments'];

  const channel = supabase.channel('all_changes');

  tables.forEach(table => {
    channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: table,
      },
      callback
    );
  });

  return channel.subscribe();
};

// ================================================
// 战略客户管理 (Strategic Companion)
// ================================================

// 类型定义
export interface StrategicMilestone {
  id: string;
  title: string;
  description?: string;
  status: 'pending' | 'in-progress' | 'completed';
  phaseOrder: number;
  coreGoal?: string;
  deliverable?: string;
  participants: string[];
  outputs: string[];
  milestoneDate?: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StrategicGoal {
  id: string;
  title: string;
  description?: string;
  progress: number;
  quarter?: string;
  attachmentUrl?: string;        // 附件URL（方法论文档、PDF等）
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GoalMetric {
  id: string;
  goalId: string;
  label: string;
  value?: number;
  target?: number;
  unit?: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectEvent {
  id: string;
  type: 'meeting' | 'deliverable' | 'milestone';
  title: string;
  description?: string;
  eventDate: string;
  details?: string;
  participants?: number;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectDocument {
  id: string;
  category: 'assessment' | 'strategy' | 'tools';
  title: string;
  description?: string;
  docDate?: string;
  meta?: string;
  fileType?: 'pdf' | 'ppt' | 'xlsx' | 'doc';
  fileUrl?: string;              // 上传的文件URL
  documentLink?: string;         // 外部文档链接
  fileSize?: number;
  passwordProtected: boolean;    // 是否启用密码保护
  password?: string;             // 下载密码（可选）
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectMeeting {
  id: string;
  title: string;
  meetingDate: string;
  duration?: string;
  participantsCount?: number;
  keyPoints: string[];
  attendees?: string[];
  decisions?: string[];
  actionItems?: string[];
  notes?: string;
  attachmentUrl?: string;        // 会议记录附件URL
  meetingLink?: string;          // 会议链接（如腾讯会议、Zoom等）
  passwordProtected: boolean;    // 是否启用密码保护
  password?: string;             // 下载密码（可选）
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ClientProject {
  id: string;
  clientName: string;
  projectName?: string;
  startDate?: string;
  endDate?: string;
  status: 'active' | 'completed' | 'paused';
  description?: string;
  currentMilestoneId?: string;
  currentGoalId?: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectMilestone {
  id: string;
  projectId: string;
  milestoneId: string;
  status: 'pending' | 'in-progress' | 'completed';
  startDate?: string;
  endDate?: string;
  actualDate?: string;
  notes?: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

// 类型转换工具
const toMilestoneStatus = (status: unknown): 'pending' | 'in-progress' | 'completed' => {
  const validStatuses = ['pending', 'in-progress', 'completed'];
  const s = String(status);
  return validStatuses.includes(s) ? s as 'pending' | 'in-progress' | 'completed' : 'pending';
};

const toEventType = (type: unknown): 'meeting' | 'deliverable' | 'milestone' => {
  const validTypes = ['meeting', 'deliverable', 'milestone'];
  const t = String(type);
  return validTypes.includes(t) ? t as 'meeting' | 'deliverable' | 'milestone' : 'meeting';
};

const toDocCategory = (category: unknown): 'assessment' | 'strategy' | 'tools' => {
  const validCategories = ['assessment', 'strategy', 'tools'];
  const c = String(category);
  return validCategories.includes(c) ? c as 'assessment' | 'strategy' | 'tools' : 'assessment';
};

const toFileType = (type: unknown): 'pdf' | 'ppt' | 'xlsx' | 'doc' | undefined => {
  if (!type) return undefined;
  const validTypes = ['pdf', 'ppt', 'xlsx', 'doc'];
  const t = String(type);
  return validTypes.includes(t) ? t as 'pdf' | 'ppt' | 'xlsx' | 'doc' : undefined;
};

const toProjectStatus = (status: unknown): 'active' | 'completed' | 'paused' => {
  const validStatuses = ['active', 'completed', 'paused'];
  const s = String(status);
  return validStatuses.includes(s) ? s as 'active' | 'completed' | 'paused' : 'active';
};

// 战略里程碑管理
export const getStrategicMilestones = async (): Promise<StrategicMilestone[]> => {
  const { data, error } = await supabase
    .from('strategic_milestones')
    .select('*')
    .order('phase_order', { ascending: true });

  if (error) {
    console.error('获取战略里程碑失败:', error);
    return [];
  }

  return (data || []).map((item: Record<string, unknown>) => ({
    id: String(item.id || ''),
    title: String(item.title || ''),
    description: item.description as string | undefined,
    status: toMilestoneStatus(item.status),
    phaseOrder: Number(item.phase_order) || 0,
    coreGoal: item.core_goal as string | undefined,
    deliverable: item.deliverable as string | undefined,
    participants: Array.isArray(item.participants) ? item.participants as string[] : [],
    outputs: Array.isArray(item.outputs) ? item.outputs as string[] : [],
    milestoneDate: item.milestone_date as string | undefined,
    sortOrder: Number(item.sort_order) || 0,
    isActive: Boolean(item.is_active),
    createdAt: String(item.created_at || ''),
    updatedAt: String(item.updated_at || ''),
  }));
};

export const saveStrategicMilestone = async (
  milestone: Partial<StrategicMilestone>
): Promise<StrategicMilestone | null> => {
  const milestoneData: Record<string, unknown> = {
    title: milestone.title,
    description: milestone.description,
    status: milestone.status,
    phase_order: milestone.phaseOrder,
    core_goal: milestone.coreGoal,
    deliverable: milestone.deliverable,
    participants: milestone.participants,
    outputs: milestone.outputs,
    milestone_date: milestone.milestoneDate,
    sort_order: milestone.sortOrder,
    is_active: milestone.isActive,
  };

  let result: { data: Record<string, unknown> | null; error: unknown | null };

  if (milestone.id) {
    const { data, error } = await supabase
      .from('strategic_milestones')
      .update(milestoneData)
      .eq('id', milestone.id)
      .select()
      .single();
    result = { data, error };
  } else {
    const { data, error } = await supabase
      .from('strategic_milestones')
      .insert(milestoneData)
      .select()
      .single();
    result = { data, error };
  }

  if (result.error || !result.data) {
    console.error('保存战略里程碑失败:', result.error);
    return null;
  }

  const item = result.data;
  return {
    id: String(item.id || ''),
    title: String(item.title || ''),
    description: item.description as string | undefined,
    status: toMilestoneStatus(item.status),
    phaseOrder: Number(item.phase_order) || 0,
    coreGoal: item.core_goal as string | undefined,
    deliverable: item.deliverable as string | undefined,
    participants: Array.isArray(item.participants) ? item.participants as string[] : [],
    outputs: Array.isArray(item.outputs) ? item.outputs as string[] : [],
    milestoneDate: item.milestone_date as string | undefined,
    sortOrder: Number(item.sort_order) || 0,
    isActive: Boolean(item.is_active),
    createdAt: String(item.created_at || ''),
    updatedAt: String(item.updated_at || ''),
  };
};

export const deleteStrategicMilestone = async (id: string): Promise<boolean> => {
  const { error } = await supabase
    .from('strategic_milestones')
    .delete()
    .eq('id', id);

  return !error;
};

// 战略目标管理
export const getStrategicGoals = async (): Promise<StrategicGoal[]> => {
  const { data, error } = await supabase
    .from('strategic_goals')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('获取战略目标失败:', error);
    return [];
  }

  return (data || []).map((item: Record<string, unknown>) => ({
    id: String(item.id || ''),
    title: String(item.title || ''),
    description: item.description as string | undefined,
    progress: Number(item.progress) || 0,
    quarter: item.quarter as string | undefined,
    isActive: Boolean(item.is_active),
    createdAt: String(item.created_at || ''),
    updatedAt: String(item.updated_at || ''),
  }));
};

export const saveStrategicGoal = async (
  goal: Partial<StrategicGoal>
): Promise<StrategicGoal | null> => {
  const goalData: Record<string, unknown> = {
    title: goal.title,
    description: goal.description,
    progress: goal.progress,
    quarter: goal.quarter,
    is_active: goal.isActive,
  };

  let result: { data: Record<string, unknown> | null; error: unknown | null };

  if (goal.id) {
    const { data, error } = await supabase
      .from('strategic_goals')
      .update(goalData)
      .eq('id', goal.id)
      .select()
      .single();
    result = { data, error };
  } else {
    const { data, error } = await supabase
      .from('strategic_goals')
      .insert(goalData)
      .select()
      .single();
    result = { data, error };
  }

  if (result.error || !result.data) {
    console.error('保存战略目标失败:', result.error);
    return null;
  }

  const item = result.data;
  return {
    id: String(item.id || ''),
    title: String(item.title || ''),
    description: item.description as string | undefined,
    progress: Number(item.progress) || 0,
    quarter: item.quarter as string | undefined,
    isActive: Boolean(item.is_active),
    createdAt: String(item.created_at || ''),
    updatedAt: String(item.updated_at || ''),
  };
};

export const deleteStrategicGoal = async (id: string): Promise<boolean> => {
  const { error } = await supabase
    .from('strategic_goals')
    .delete()
    .eq('id', id);

  return !error;
};

// 目标指标管理
export const getGoalMetrics = async (goalId: string): Promise<GoalMetric[]> => {
  const { data, error } = await supabase
    .from('goal_metrics')
    .select('*')
    .eq('goal_id', goalId)
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('获取目标指标失败:', error);
    return [];
  }

  return (data || []).map((item: Record<string, unknown>) => ({
    id: String(item.id || ''),
    goalId: String(item.goal_id || ''),
    label: String(item.label || ''),
    value: item.value as number | undefined,
    target: item.target as number | undefined,
    unit: item.unit as string | undefined,
    sortOrder: Number(item.sort_order) || 0,
    createdAt: String(item.created_at || ''),
    updatedAt: String(item.updated_at || ''),
  }));
};

export const saveGoalMetric = async (
  metric: Partial<GoalMetric>
): Promise<GoalMetric | null> => {
  const metricData: Record<string, unknown> = {
    goal_id: metric.goalId,
    label: metric.label,
    value: metric.value,
    target: metric.target,
    unit: metric.unit,
    sort_order: metric.sortOrder,
  };

  let result: { data: Record<string, unknown> | null; error: unknown | null };

  if (metric.id) {
    const { data, error } = await supabase
      .from('goal_metrics')
      .update(metricData)
      .eq('id', metric.id)
      .select()
      .single();
    result = { data, error };
  } else {
    const { data, error } = await supabase
      .from('goal_metrics')
      .insert(metricData)
      .select()
      .single();
    result = { data, error };
  }

  if (result.error || !result.data) {
    console.error('保存目标指标失败:', result.error);
    return null;
  }

  const item = result.data;
  return {
    id: String(item.id || ''),
    goalId: String(item.goal_id || ''),
    label: String(item.label || ''),
    value: item.value as number | undefined,
    target: item.target as number | undefined,
    unit: item.unit as string | undefined,
    sortOrder: Number(item.sort_order) || 0,
    createdAt: String(item.created_at || ''),
    updatedAt: String(item.updated_at || ''),
  };
};

export const deleteGoalMetric = async (id: string): Promise<boolean> => {
  const { error } = await supabase
    .from('goal_metrics')
    .delete()
    .eq('id', id);

  return !error;
};

// 项目事件管理
export const getProjectEvents = async (): Promise<ProjectEvent[]> => {
  const { data, error } = await supabase
    .from('project_events')
    .select('*')
    .order('event_date', { ascending: false });

  if (error) {
    console.error('获取项目事件失败:', error);
    return [];
  }

  return (data || []).map((item: Record<string, unknown>) => ({
    id: String(item.id || ''),
    type: toEventType(item.type),
    title: String(item.title || ''),
    description: item.description as string | undefined,
    eventDate: formatDate(item.event_date as string | null),
    details: item.details as string | undefined,
    participants: item.participants as number | undefined,
    sortOrder: Number(item.sort_order) || 0,
    isActive: Boolean(item.is_active),
    createdAt: String(item.created_at || ''),
    updatedAt: String(item.updated_at || ''),
  }));
};

export const saveProjectEvent = async (
  event: Partial<ProjectEvent>
): Promise<ProjectEvent | null> => {
  const eventData: Record<string, unknown> = {
    type: event.type,
    title: event.title,
    description: event.description,
    event_date: event.eventDate,
    details: event.details,
    participants: event.participants,
    sort_order: event.sortOrder,
    is_active: event.isActive,
  };

  let result: { data: Record<string, unknown> | null; error: unknown | null };

  if (event.id) {
    const { data, error } = await supabase
      .from('project_events')
      .update(eventData)
      .eq('id', event.id)
      .select()
      .single();
    result = { data, error };
  } else {
    const { data, error } = await supabase
      .from('project_events')
      .insert(eventData)
      .select()
      .single();
    result = { data, error };
  }

  if (result.error || !result.data) {
    console.error('保存项目事件失败:', result.error);
    return null;
  }

  const item = result.data;
  return {
    id: String(item.id || ''),
    type: toEventType(item.type),
    title: String(item.title || ''),
    description: item.description as string | undefined,
    eventDate: formatDate(item.event_date as string | null),
    details: item.details as string | undefined,
    participants: item.participants as number | undefined,
    sortOrder: Number(item.sort_order) || 0,
    isActive: Boolean(item.is_active),
    createdAt: String(item.created_at || ''),
    updatedAt: String(item.updated_at || ''),
  };
};

export const deleteProjectEvent = async (id: string): Promise<boolean> => {
  const { error } = await supabase
    .from('project_events')
    .delete()
    .eq('id', id);

  return !error;
};

// 项目文档管理
export const getProjectDocuments = async (): Promise<ProjectDocument[]> => {
  const { data, error } = await supabase
    .from('project_documents')
    .select('*')
    .order('doc_date', { ascending: false });

  if (error) {
    console.error('获取项目文档失败:', error);
    return [];
  }

  return (data || []).map((item: Record<string, unknown>) => ({
    id: String(item.id || ''),
    category: toDocCategory(item.category),
    title: String(item.title || ''),
    description: item.description as string | undefined,
    docDate: item.doc_date as string | undefined,
    meta: item.meta as string | undefined,
    fileType: toFileType(item.file_type),
    fileUrl: item.file_url as string | undefined,
    fileSize: item.file_size as number | undefined,
    passwordProtected: Boolean(item.password_protected),
    password: item.password as string | undefined,
    sortOrder: Number(item.sort_order) || 0,
    isActive: Boolean(item.is_active),
    createdAt: String(item.created_at || ''),
    updatedAt: String(item.updated_at || ''),
  }));
};

export const saveProjectDocument = async (
  document: Partial<ProjectDocument>
): Promise<ProjectDocument | null> => {
  const documentData: Record<string, unknown> = {
    category: document.category,
    title: document.title,
    description: document.description,
    doc_date: document.docDate,
    meta: document.meta,
    file_type: document.fileType,
    file_url: document.fileUrl,
    file_size: document.fileSize,
    password_protected: document.passwordProtected,
    password: document.password,
    sort_order: document.sortOrder,
    is_active: document.isActive,
  };

  let result: { data: Record<string, unknown> | null; error: unknown | null };

  if (document.id) {
    const { data, error } = await supabase
      .from('project_documents')
      .update(documentData)
      .eq('id', document.id)
      .select()
      .single();
    result = { data, error };
  } else {
    const { data, error } = await supabase
      .from('project_documents')
      .insert(documentData)
      .select()
      .single();
    result = { data, error };
  }

  if (result.error || !result.data) {
    console.error('保存项目文档失败:', result.error);
    return null;
  }

  const item = result.data;
  return {
    id: String(item.id || ''),
    category: toDocCategory(item.category),
    title: String(item.title || ''),
    description: item.description as string | undefined,
    docDate: item.doc_date as string | undefined,
    meta: item.meta as string | undefined,
    fileType: toFileType(item.file_type),
    fileUrl: item.file_url as string | undefined,
    fileSize: item.file_size as number | undefined,
    passwordProtected: Boolean(item.password_protected),
    password: item.password as string | undefined,
    sortOrder: Number(item.sort_order) || 0,
    isActive: Boolean(item.is_active),
    createdAt: String(item.created_at || ''),
    updatedAt: String(item.updated_at || ''),
  };
};

export const deleteProjectDocument = async (id: string): Promise<boolean> => {
  const { error } = await supabase
    .from('project_documents')
    .delete()
    .eq('id', id);

  return !error;
};

// 项目会议管理
export const getProjectMeetings = async (): Promise<ProjectMeeting[]> => {
  const { data, error } = await supabase
    .from('project_meetings')
    .select('*')
    .order('meeting_date', { ascending: false });

  if (error) {
    console.error('获取项目会议失败:', error);
    return [];
  }

  return (data || []).map((item: Record<string, unknown>) => ({
    id: String(item.id || ''),
    title: String(item.title || ''),
    meetingDate: String(item.meeting_date || ''),
    duration: item.duration as string | undefined,
    participantsCount: item.participants_count as number | undefined,
    keyPoints: Array.isArray(item.key_points) ? item.key_points as string[] : [],
    attendees: Array.isArray(item.attendees) ? item.attendees as string[] : [],
    decisions: Array.isArray(item.decisions) ? item.decisions as string[] : [],
    actionItems: Array.isArray(item.action_items) ? item.action_items as string[] : [],
    notes: item.notes as string | undefined,
    passwordProtected: Boolean(item.password_protected),
    password: item.password as string | undefined,
    sortOrder: Number(item.sort_order) || 0,
    isActive: Boolean(item.is_active),
    createdAt: String(item.created_at || ''),
    updatedAt: String(item.updated_at || ''),
  }));
};

export const saveProjectMeeting = async (
  meeting: Partial<ProjectMeeting>
): Promise<ProjectMeeting | null> => {
  const meetingData: Record<string, unknown> = {
    title: meeting.title,
    meeting_date: meeting.meetingDate,
    duration: meeting.duration,
    participants_count: meeting.participantsCount,
    key_points: meeting.keyPoints,
    attendees: meeting.attendees,
    decisions: meeting.decisions,
    action_items: meeting.actionItems,
    notes: meeting.notes,
    password_protected: meeting.passwordProtected,
    password: meeting.password,
    sort_order: meeting.sortOrder,
    is_active: meeting.isActive,
  };

  let result: { data: Record<string, unknown> | null; error: unknown | null };

  if (meeting.id) {
    const { data, error } = await supabase
      .from('project_meetings')
      .update(meetingData)
      .eq('id', meeting.id)
      .select()
      .single();
    result = { data, error };
  } else {
    const { data, error } = await supabase
      .from('project_meetings')
      .insert(meetingData)
      .select()
      .single();
    result = { data, error };
  }

  if (result.error || !result.data) {
    console.error('保存项目会议失败:', result.error);
    return null;
  }

  const item = result.data;
  return {
    id: String(item.id || ''),
    title: String(item.title || ''),
    meetingDate: String(item.meeting_date || ''),
    duration: item.duration as string | undefined,
    participantsCount: item.participants_count as number | undefined,
    keyPoints: Array.isArray(item.key_points) ? item.key_points as string[] : [],
    attendees: Array.isArray(item.attendees) ? item.attendees as string[] : [],
    decisions: Array.isArray(item.decisions) ? item.decisions as string[] : [],
    actionItems: Array.isArray(item.action_items) ? item.action_items as string[] : [],
    notes: item.notes as string | undefined,
    passwordProtected: Boolean(item.password_protected),
    password: item.password as string | undefined,
    sortOrder: Number(item.sort_order) || 0,
    isActive: Boolean(item.is_active),
    createdAt: String(item.created_at || ''),
    updatedAt: String(item.updated_at || ''),
  };
};

export const deleteProjectMeeting = async (id: string): Promise<boolean> => {
  const { error } = await supabase
    .from('project_meetings')
    .delete()
    .eq('id', id);

  return !error;
};

// 客户项目管理
export const getClientProjects = async (): Promise<ClientProject[]> => {
  const { data, error } = await supabase
    .from('client_projects')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('获取客户项目失败:', error);
    return [];
  }

  return (data || []).map((item: Record<string, unknown>) => ({
    id: String(item.id || ''),
    clientName: String(item.client_name || ''),
    projectName: item.project_name as string | undefined,
    startDate: item.start_date as string | undefined,
    endDate: item.end_date as string | undefined,
    status: toProjectStatus(item.status),
    description: item.description as string | undefined,
    currentMilestoneId: item.current_milestone_id as string | undefined,
    currentGoalId: item.current_goal_id as string | undefined,
    sortOrder: Number(item.sort_order) || 0,
    isActive: Boolean(item.is_active),
    createdAt: String(item.created_at || ''),
    updatedAt: String(item.updated_at || ''),
  }));
};

export const saveClientProject = async (
  project: Partial<ClientProject>
): Promise<ClientProject | null> => {
  const projectData: Record<string, unknown> = {
    client_name: project.clientName,
    project_name: project.projectName,
    start_date: project.startDate,
    end_date: project.endDate,
    status: project.status,
    description: project.description,
    current_milestone_id: project.currentMilestoneId,
    current_goal_id: project.currentGoalId,
    sort_order: project.sortOrder,
    is_active: project.isActive,
  };

  let result: { data: Record<string, unknown> | null; error: unknown | null };

  if (project.id) {
    const { data, error } = await supabase
      .from('client_projects')
      .update(projectData)
      .eq('id', project.id)
      .select()
      .single();
    result = { data, error };
  } else {
    const { data, error } = await supabase
      .from('client_projects')
      .insert(projectData)
      .select()
      .single();
    result = { data, error };
  }

  if (result.error || !result.data) {
    console.error('保存客户项目失败:', result.error);
    return null;
  }

  const item = result.data;
  return {
    id: String(item.id || ''),
    clientName: String(item.client_name || ''),
    projectName: item.project_name as string | undefined,
    startDate: item.start_date as string | undefined,
    endDate: item.end_date as string | undefined,
    status: toProjectStatus(item.status),
    description: item.description as string | undefined,
    currentMilestoneId: item.current_milestone_id as string | undefined,
    currentGoalId: item.current_goal_id as string | undefined,
    sortOrder: Number(item.sort_order) || 0,
    isActive: Boolean(item.is_active),
    createdAt: String(item.created_at || ''),
    updatedAt: String(item.updated_at || ''),
  };
};

export const deleteClientProject = async (id: string): Promise<boolean> => {
  const { error } = await supabase
    .from('client_projects')
    .delete()
    .eq('id', id);

  return !error;
};

// 项目里程碑关联管理
export const getProjectMilestones = async (projectId: string): Promise<ProjectMilestone[]> => {
  const { data, error } = await supabase
    .from('project_milestones')
    .select('*')
    .eq('project_id', projectId)
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('获取项目里程碑失败:', error);
    return [];
  }

  return (data || []).map((item: Record<string, unknown>) => ({
    id: String(item.id || ''),
    projectId: String(item.project_id || ''),
    milestoneId: String(item.milestone_id || ''),
    status: toMilestoneStatus(item.status),
    startDate: item.start_date as string | undefined,
    endDate: item.end_date as string | undefined,
    actualDate: item.actual_date as string | undefined,
    notes: item.notes as string | undefined,
    sortOrder: Number(item.sort_order) || 0,
    createdAt: String(item.created_at || ''),
    updatedAt: String(item.updated_at || ''),
  }));
};

export const saveProjectMilestone = async (
  projectMilestone: Partial<ProjectMilestone>
): Promise<ProjectMilestone | null> => {
  const projectMilestoneData: Record<string, unknown> = {
    project_id: projectMilestone.projectId,
    milestone_id: projectMilestone.milestoneId,
    status: projectMilestone.status,
    start_date: projectMilestone.startDate,
    end_date: projectMilestone.endDate,
    actual_date: projectMilestone.actualDate,
    notes: projectMilestone.notes,
    sort_order: projectMilestone.sortOrder,
  };

  let result: { data: Record<string, unknown> | null; error: unknown | null };

  if (projectMilestone.id) {
    const { data, error } = await supabase
      .from('project_milestones')
      .update(projectMilestoneData)
      .eq('id', projectMilestone.id)
      .select()
      .single();
    result = { data, error };
  } else {
    const { data, error } = await supabase
      .from('project_milestones')
      .insert(projectMilestoneData)
      .select()
      .single();
    result = { data, error };
  }

  if (result.error || !result.data) {
    console.error('保存项目里程碑失败:', result.error);
    return null;
  }

  const item = result.data;
  return {
    id: String(item.id || ''),
    projectId: String(item.project_id || ''),
    milestoneId: String(item.milestone_id || ''),
    status: toMilestoneStatus(item.status),
    startDate: item.start_date as string | undefined,
    endDate: item.end_date as string | undefined,
    actualDate: item.actual_date as string | undefined,
    notes: item.notes as string | undefined,
    sortOrder: Number(item.sort_order) || 0,
    createdAt: String(item.created_at || ''),
    updatedAt: String(item.updated_at || ''),
  };
};

export const deleteProjectMilestone = async (id: string): Promise<boolean> => {
  const { error } = await supabase
    .from('project_milestones')
    .delete()
    .eq('id', id);

  return !error;
};

// 获取前台显示的战略客户数据
export const getStrategyCompanionData = async () => {
  const [milestones, goals, events, documents, meetings] = await Promise.all([
    getStrategicMilestones(),
    getStrategicGoals(),
    getProjectEvents(),
    getProjectDocuments(),
    getProjectMeetings(),
  ]);

  // 获取每个目标的指标
  const goalsWithMetrics = await Promise.all(
    goals.map(async (goal) => ({
      ...goal,
      metrics: await getGoalMetrics(goal.id),
    }))
  );

  return {
    milestones,
    goals: goalsWithMetrics,
    events,
    documents,
    meetings,
  };
};
