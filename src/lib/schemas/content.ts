/**
 * AI-Native 内容Schema定义
 * Content-as-Code模式的核心类型定义
 */

/**
 * 基础内容接口，所有内容类型的父类型
 */
export interface BaseContent {
  // 基础标识
  id: string;
  contentType: 'report' | 'article' | 'insight';
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  category: string;
  tags: string[];
  status: 'draft' | 'review' | 'published' | 'archived';
  
  // AI相关元数据
  semanticMetadata: {
    topics: string[];
    sentiment: 'positive' | 'neutral' | 'negative';
    targetAudience: string[];
    complexity: number;
    readingTime: number;
  };
  
  // 版本与溯源
  version: number;
  parentVersion?: number;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
  
  // 发布信息
  publishedAt?: string;
  publishedBy?: string;
  isFeatured: boolean;
  showOnHome: boolean;
  
  // 浏览统计
  views: number;
  likes: number;
  shares: number;
  
  // AI生成特有字段
  aiMetadata?: {
    model: string;
    promptId: string;
    confidenceScore: number;
    generationParams: object;
    humanReviewed: boolean;
    reviewComments?: string;
  };
}

/**
 * 报告类型扩展
 */
export interface ReportContent extends BaseContent {
  contentType: 'report';
  reportSpecific: {
    publisher: string;
    reportType: 'whitepaper' | 'research' | 'analysis' | 'forecast';
    reportVersion: string;
    pages?: number;
    fileUrl?: string;
    fileSize?: number;
    format: string[];
    isHot: boolean;
    relatedReports: string[];
  };
}

/**
 * 文章类型扩展
 */
export interface ArticleContent extends BaseContent {
  contentType: 'article';
  articleSpecific: {
    author: string;
    authorTitle?: string;
    readTime: number;
    featured: boolean;
    relatedArticles: string[];
  };
}

/**
 * 洞察类型扩展
 */
export interface InsightContent extends BaseContent {
  contentType: 'insight';
  insightSpecific: {
    author: string;
    insightType: 'trend' | 'analysis' | 'forecast' | 'case-study';
    keyFindings: string[];
    recommendations: string[];
    dataSources: string[];
  };
}

export type Content = ReportContent | ArticleContent | InsightContent;

/**
 * 内容变更记录
 */
export interface ContentChange {
  contentId: string;
  changeType: 'added' | 'modified' | 'deleted';
  before?: Partial<Content>;
  after?: Partial<Content>;
  changedFields: string[];
}

/**
 * 内容查询参数
 */
export interface ContentQuery {
  contentType?: 'report' | 'article' | 'insight';
  category?: string;
  tags?: string[];
  status?: 'draft' | 'review' | 'published' | 'archived';
  featured?: boolean;
  showOnHome?: boolean;
  startDate?: string;
  endDate?: string;
  author?: string;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'updatedAt' | 'views' | 'likes';
  sortOrder?: 'asc' | 'desc';
}
