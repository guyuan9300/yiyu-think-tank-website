/**
 * 数据持久化服务
 * 使用localStorage存储前后台数据，实现数据同步
 */

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
  isHot: boolean;           // 是否热门（自动根据浏览量计算，也可手动设置）
  showOnHome: boolean;      // 是否显示在首页（手动选择）
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
  featured: boolean;        // 是否精选（自动根据点赞量计算，也可手动设置）
  showOnHome: boolean;      // 是否显示在首页（手动选择）
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

export interface Comment {
  id: string;
  contentId: string;      // 关联内容ID
  contentType: 'insight' | 'report' | 'book';  // 内容类型
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
  phone?: string;
  memberType: 'regular' | 'gold' | 'diamond';
  status: 'active' | 'disabled';
  invitationCode?: string;        // 使用哪个邀请码注册
  invitedBy?: string;             // 邀请人ID
  createdAt: string;
  lastLoginAt?: string;
  loginCount: number;
  commentsCount: number;          // 评论数量
  favoritesCount: number;         // 收藏数量
}

// 存储键
const STORAGE_KEYS = {
  reports: 'yiyu_reports',
  insights: 'yiyu_insights',
  books: 'yiyu_books',
  tags: 'yiyu_tags',
  categories: 'yiyu_categories',
  usedTags: 'yiyu_used_tags', // 历史使用的标签
  comments: 'yiyu_comments', // 评论数据
  systemSettings: 'yiyu_system_settings', // 系统设置
  users: 'yiyu_users', // 用户数据
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

// 初始化默认报告数据
const initDefaultReports = (): Report[] => [
  {
    id: 'r_weiaiqianxing_training_20260105',
    title: '为爱黔行｜第一次培训：做好公益的系统思考（课件）',
    publisher: '益语智库（内部示例）',
    category: '行业报告',
    summary: '以“增长式咨询/学习型战略陪伴”为框架，讨论公益组织如何通过系统性认知与行动校准，提升组织战斗力与品牌影响力。',
    tags: ['公益', '品牌', '组织系统', '培训'],
    version: 'v1.0',
    format: ['PDF'],
    fileUrl: '/yiyu-think-tank-website/docs/weiaiqianxing-training-20260105.pdf',
    fileSize: 31 * 1024 * 1024,
    pages: 74,
    publishDate: '2026-01-05',
    status: 'published',
    isHot: true,
    showOnHome: true,
    views: 2680,
    downloads: 420,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '1',
    title: '2026公益行业数字化现状报告（示例）',
    publisher: '益语智库研究中心',
    category: '行业报告',
    summary: '用于演示报告库的内容结构与交互；后续可替换为真实研究报告。',
    tags: ['公益', '数字化', '行业洞察'],
    version: 'v2.1',
    format: ['PPT', 'PDF'],
    publishDate: '2026-01-20',
    status: 'published',
    isHot: false,
    showOnHome: false,
    views: 12340,
    downloads: 3456,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

// 初始化默认洞察文章（Apple 风格：更短、更清晰、更可执行）
const initDefaultInsights = (): InsightArticle[] => [
  {
    id: 'i_brand_system_thinking',
    title: '公益品牌怎么做：不要“解决”，要“治理”',
    excerpt: '社会问题高度复杂。公益咨询的重点不只是对齐供需关系，而是重构社会关系，在认知—行为—习惯中创造新的需求平衡。',
    content: `
<h2>一句话结论</h2>
<p>公益品牌不是“讲一个好故事”，而是<strong>让相关方能参与的场景</strong>，并把这种参与沉淀成持续的组织能力。</p>

<h2>为什么很多公益传播做不起来</h2>
<ul>
  <li>只看表面结果：把复杂问题当成单点问题。</li>
  <li>只做一次性活动：没有形成可复用的方法与机制。</li>
  <li>只强调“我们很善良”：忽略了相关方的真实动机与进入路径。</li>
</ul>

<h2>从“解决”到“治理”</h2>
<p>社会问题极度复杂。公益的长期价值来自于：通过改变认知、行为、习惯，创造新的需求平衡。</p>

<h2>可执行清单（30分钟内能做的）</h2>
<ul>
  <li>写清楚：我们希望谁参与？他/她为什么愿意参与？</li>
  <li>设计入口：为资助方/企业/公众分别设计 1 个“最短路径”。</li>
  <li>沉淀资产：把一次服务变成一个案例，把案例变成行业可借鉴的资产。</li>
</ul>
`.
      trim(),
    category: '行业洞察',
    tags: ['公益', '品牌', '治理', '系统思考'],
    author: '益语智库',
    readTime: 6,
    publishDate: '2026-02-05',
    status: 'published',
    featured: true,
    showOnHome: true,
    views: 680,
    likes: 42,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'i_org_system_design',
    title: '组织系统设计模型：从动机到运营的全局协同',
    excerpt: '组织战斗力来自系统性协同：动机、战略、项目、筹款、品牌、运营、组织彼此咬合，才能把战略变成持续行动。',
    content: `
<h2>框架</h2>
<p>组织系统设计模型的目的，是优化全局运作，确保协同高效，实现全面战略目标。</p>

<h2>七个模块（建议按顺序盘一遍）</h2>
<ol>
  <li><strong>动机</strong>：组织为何存在？成员为何投入？</li>
  <li><strong>战略</strong>：要解决什么问题？选择与取舍是什么？</li>
  <li><strong>项目</strong>：把战略拆成可交付的行动序列。</li>
  <li><strong>筹款</strong>：资源结构与现金流的可持续。</li>
  <li><strong>品牌</strong>：创造相关方可以参与的场景。</li>
  <li><strong>运营</strong>：流程、数据、节奏与复盘。</li>
  <li><strong>组织</strong>：结构、人才、激励与学习机制。</li>
</ol>

<h2>快速诊断问题</h2>
<ul>
  <li>项目做得多，但影响力不增长：通常是“品牌入口/参与路径”断了。</li>
  <li>战略写得好，但执行变形：通常是“运营节奏/复盘机制”断了。</li>
  <li>筹款靠单点资源：通常是“价值叙事/相关方协作”断了。</li>
</ul>
`.
      trim(),
    category: '深度洞察',
    tags: ['组织设计', '战略', '运营', '协同'],
    author: '益语智库',
    readTime: 8,
    publishDate: '2026-02-05',
    status: 'published',
    featured: false,
    showOnHome: true,
    views: 420,
    likes: 25,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'i_material_management',
    title: '素材管理机制：把“经验”变成团队可复用的资产',
    excerpt: '每一次服务沉淀为案例；每一个案例成为行业资产。关键不在收集文件，而在建立命名、版本、入口与复用流程。',
    content: `
<h2>目标</h2>
<p>让团队在需要时<strong>找得到、用得上、能复用</strong>，而不是“文件夹越来越多”。</p>

<h2>四件事就够了</h2>
<ul>
  <li><strong>命名规则</strong>：日期-项目-主题-版本（例：2026-01-05-为爱黔行-培训-v1）。</li>
  <li><strong>入口清单</strong>：给不同相关方准备不同入口（资助方/企业/筹款/公众）。</li>
  <li><strong>版本控制</strong>：谁改了、改了什么、为什么改。</li>
  <li><strong>复用流程</strong>：每次交付后 30 分钟做一次“案例萃取”。</li>
</ul>

<h2>建议的最小表格字段</h2>
<ul>
  <li>标题 / 场景 / 适用对象 / 关键结论 / 证据来源 / 最佳用法 / 负责人</li>
</ul>
`.
      trim(),
    category: '数据洞察',
    tags: ['知识管理', '素材管理', '案例萃取', '复用'],
    author: '益语智库',
    readTime: 6,
    publishDate: '2026-02-05',
    status: 'published',
    featured: false,
    showOnHome: false,
    views: 260,
    likes: 12,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

// 初始化默认书籍
const initDefaultBooks = (): Book[] => [
  {
    id: '1',
    title: '什么是权力',
    author: '弗朗西斯·福山',
    description: '深入探讨权力的本质、来源与运作机制',
    abstract: '本书系统性地探讨了权力的本质与来源',
    category: '战略',
    tags: ['政治哲学', '权力理论'],
    pages: 328,
    duration: '约6小时',
    rating: 4.8,
    coverColor: 'from-blue-600 to-indigo-800',
    publishDate: '2026-01-29',
    status: 'published',
    views: 15680,
    reviews: 1234,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

// 工具函数：保存数据到localStorage
const saveToStorage = (key: string, data: any) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error('Failed to save to localStorage:', error);
  }
};

// 工具函数：从localStorage读取数据
const loadFromStorage = (key: string, defaultData: any) => {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : defaultData;
  } catch (error) {
    console.error('Failed to load from localStorage:', error);
    return defaultData;
  }
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

// 获取所有报告
export const getReports = (): Report[] => {
  return loadFromStorage(STORAGE_KEYS.reports, initDefaultReports());
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
    category: report.category || '行业报告',
    summary: report.summary || '',
    tags: report.tags || [],
    version: report.version || 'v1.0',
    format: report.format || ['PDF'],
    coverImage: report.coverImage,
    fileUrl: report.fileUrl,
    fileSize: report.fileSize,
    pages: report.pages,
    publishDate: report.publishDate || new Date().toISOString().split('T')[0],
    status: report.status || 'draft',
    isHot: report.isHot || false,
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
  updateUsedTags(newReport.tags);
  
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
  return loadFromStorage(STORAGE_KEYS.insights, initDefaultInsights());
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
    category: article.category || '行业洞察',
    tags: article.tags || [],
    coverImage: article.coverImage,
    author: article.author || '益语智库',
    readTime: article.readTime || 10,
    publishDate: article.publishDate || new Date().toISOString().split('T')[0],
    status: article.status || 'draft',
    featured: article.featured || false,
    showOnHome: article.showOnHome || false,
    views: article.views || 0,
    likes: article.likes || 0,
    createdAt: article.createdAt || now,
    updatedAt: now,
  };
  
  articles.unshift(newArticle);
  saveToStorage(STORAGE_KEYS.insights, articles);
  notifyDataChange();
  
  updateUsedTags(newArticle.tags);
  
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
  return loadFromStorage(STORAGE_KEYS.books, initDefaultBooks());
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
    category: book.category || '人工智能',
    tags: book.tags || [],
    pages: book.pages || 100,
    duration: book.duration || calculateReadTime(book.pages || 100),
    rating: book.rating || 4.5,
    coverImage: book.coverImage,
    coverColor: book.coverColor || 'from-blue-600 to-indigo-800',
    publishDate: book.publishDate || new Date().toISOString().split('T')[0],
    status: book.status || 'published',
    views: book.views || 0,
    reviews: book.reviews || 0,
    createdAt: book.createdAt || now,
    updatedAt: now,
  };
  
  books.unshift(newBook);
  saveToStorage(STORAGE_KEYS.books, books);
  notifyDataChange();
  
  updateUsedTags(newBook.tags);
  
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
  return loadFromStorage(STORAGE_KEYS.tags, defaultTags);
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
  return loadFromStorage(STORAGE_KEYS.categories, defaultCategories);
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
export const getCommentsByContent = (contentId: string, contentType: 'insight' | 'report' | 'book'): Comment[] => {
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

export const searchReports = (query: string, category?: string): Report[] => {
  const reports = getReports();
  return reports.filter(report => {
    const matchesSearch = !query || 
      report.title.toLowerCase().includes(query.toLowerCase()) ||
      report.summary.toLowerCase().includes(query.toLowerCase());
    const matchesCategory = !category || category === 'all' || report.category === category;
    return matchesSearch && matchesCategory && report.status === 'published';
  });
};

export const searchInsights = (query: string, category?: string): InsightArticle[] => {
  const articles = getInsights();
  return articles.filter(article => {
    const matchesSearch = !query || 
      article.title.toLowerCase().includes(query.toLowerCase()) ||
      article.excerpt.toLowerCase().includes(query.toLowerCase());
    const matchesCategory = !category || category === 'all' || article.category === category;
    return matchesSearch && matchesCategory && article.status === 'published';
  });
};

export const searchBooks = (query: string, category?: string): Book[] => {
  const books = getBooks();
  return books.filter(book => {
    const matchesSearch = !query || 
      book.title.toLowerCase().includes(query.toLowerCase()) ||
      book.description.toLowerCase().includes(query.toLowerCase());
    const matchesCategory = !category || category === 'all' || book.category === category;
    return matchesSearch && matchesCategory && book.status === 'published';
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
    hotReports: reports.filter(r => r.isHot).length,
  };
};

// ========== 系统设置管理 ==========

// 默认系统设置
const defaultSystemSettings: SystemSettings = {
  // 基本信息
  siteName: '益语智库 Yiyu Think Tank',
  siteDescription: '致力于为公益组织、社会企业提供专业的战略咨询和能力建设服务',
  contactEmail: 'contact@yiyu-thinktank.org',
  contactPhone: '+86 400-123-4567',
  
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

// 清除缓存（清除所有localStorage数据）
export const clearAllCache = (): boolean => {
  try {
    // 保存系统设置，其他数据清空
    const settings = getSystemSettings();
    Object.keys(STORAGE_KEYS).forEach(key => {
      if (key !== 'systemSettings') {
        localStorage.removeItem(STORAGE_KEYS[key as keyof typeof STORAGE_KEYS]);
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
    if (data.reports) saveToStorage(STORAGE_KEYS.reports, data.reports);
    if (data.insights) saveToStorage(STORAGE_KEYS.insights, data.insights);
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
    id: 'user_001',
    email: 'test@example.com',
    nickname: '测试用户',
    phone: '13800138000',
    memberType: 'gold',
    status: 'active',
    createdAt: '2026-01-15T10:00:00.000Z',
    lastLoginAt: '2026-02-01T08:30:00.000Z',
    loginCount: 45,
    commentsCount: 12,
    favoritesCount: 28,
  },
  {
    id: 'user_002',
    email: 'user@example.com',
    nickname: '普通会员',
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
    nickname: '钻石会员',
    memberType: 'diamond',
    status: 'active',
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
    membershipRate: users.length > 0 
      ? Math.round((users.filter(u => u.memberType !== 'regular').length / users.length) * 100) 
      : 0,
  };
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
  
  // 工具
  calculateReadTime,
};
