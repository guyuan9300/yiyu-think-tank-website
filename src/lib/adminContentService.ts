import {
  STORAGE_KEYS,
  bootstrapFromPgApi,
  calculateReadTime,
  getBooks,
  getInsights,
  getMethodologies,
  getReports,
  type Book,
  type InsightArticle,
  type Methodology,
  type Report,
  type ResourceTopic,
} from './dataService';
import { getSavedAuthToken } from './storage';

const normalizeTopics = (topics: unknown): ResourceTopic[] => {
  const allowed: ResourceTopic[] = ['战略', '业务设计', '组织', 'AI 技术'];
  if (!Array.isArray(topics)) return ['战略'];
  const cleaned = topics.filter((t): t is ResourceTopic => allowed.includes(t as ResourceTopic));
  return cleaned.length > 0 ? Array.from(new Set(cleaned)) : ['战略'];
};

const syncKey = async (key: string, data: unknown) => {
  const token = getSavedAuthToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch('/api/content-sync', {
    method: 'POST',
    headers,
    body: JSON.stringify({ key, data }),
  });
  if (!res.ok) {
    throw new Error(await res.text());
  }
};

export const refreshContentCacheFromApi = async () => {
  await bootstrapFromPgApi();
};

const numberOr = (value: unknown, fallback: number) => {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
};

const normalizeReportFormat = (report: Partial<Report>): string[] => {
  const next = new Set(
    Array.isArray(report.format)
      ? report.format.map((item) => String(item).trim()).filter(Boolean)
      : []
  );

  if (report.fileUrl) next.add('PDF');
  if (report.markdownContent || report.markdownUrl) next.add('Markdown');

  return next.size > 0 ? Array.from(next) : ['PDF'];
};

export const saveReportDirect = async (report: Partial<Report> | Report): Promise<Report> => {
  await refreshContentCacheFromApi();
  const reports = getReports();
  const now = new Date().toISOString();
  let saved: Report;
  const normalizedReport = {
    ...report,
    likes: numberOr((report as any).likes, 0),
    favoritesCount: numberOr((report as any).favoritesCount, 0),
    views: numberOr(report.views, 0),
    downloads: numberOr(report.downloads, 0),
  };

  if ('id' in normalizedReport && normalizedReport.id) {
    const index = reports.findIndex(r => r.id === normalizedReport.id);
    if (index !== -1) {
      const mergedReport = {
        ...reports[index],
        ...normalizedReport,
        topics: normalizeTopics((normalizedReport as any).topics ?? reports[index].topics),
        updatedAt: now,
      };
      reports[index] = {
        ...mergedReport,
        format: normalizeReportFormat(mergedReport),
      };
      saved = reports[index];
    } else {
      const draftReport: Report = {
        id: normalizedReport.id,
        title: normalizedReport.title || '无标题报告',
        publisher: normalizedReport.publisher || '',
        summary: normalizedReport.summary || '',
        topics: normalizeTopics((normalizedReport as any).topics),
        version: normalizedReport.version || 'v1.0',
        format: normalizedReport.format || ['PDF'],
        coverImage: normalizedReport.coverImage,
        likes: numberOr((normalizedReport as any).likes, 0),
        favoritesCount: numberOr((normalizedReport as any).favoritesCount, 0),
        fileUrl: normalizedReport.fileUrl,
        fileSize: normalizedReport.fileSize,
        markdownContent: (normalizedReport as any).markdownContent,
        markdownUrl: (normalizedReport as any).markdownUrl,
        pages: normalizedReport.pages,
        publishDate: normalizedReport.publishDate || new Date().toISOString().split('T')[0],
        status: normalizedReport.status || 'draft',
        showOnHome: normalizedReport.showOnHome || false,
        views: numberOr(normalizedReport.views, 0),
        downloads: numberOr(normalizedReport.downloads, 0),
        createdAt: normalizedReport.createdAt || now,
        updatedAt: now,
      };
      saved = {
        ...draftReport,
        format: normalizeReportFormat(draftReport),
      };
      reports.unshift(saved);
    }
  } else {
    const draftReport: Report = {
      id: `report_${Date.now()}`,
      title: normalizedReport.title || '无标题报告',
      publisher: normalizedReport.publisher || '',
      summary: normalizedReport.summary || '',
      topics: normalizeTopics((normalizedReport as any).topics),
      version: normalizedReport.version || 'v1.0',
      format: normalizedReport.format || ['PDF'],
      coverImage: normalizedReport.coverImage,
      likes: numberOr((normalizedReport as any).likes, 0),
      favoritesCount: numberOr((normalizedReport as any).favoritesCount, 0),
      fileUrl: normalizedReport.fileUrl,
      fileSize: normalizedReport.fileSize,
      markdownContent: (normalizedReport as any).markdownContent,
      markdownUrl: (normalizedReport as any).markdownUrl,
      pages: normalizedReport.pages,
      publishDate: normalizedReport.publishDate || new Date().toISOString().split('T')[0],
      status: normalizedReport.status || 'draft',
      showOnHome: normalizedReport.showOnHome || false,
      views: numberOr(normalizedReport.views, 0),
      downloads: numberOr(normalizedReport.downloads, 0),
      createdAt: normalizedReport.createdAt || now,
      updatedAt: now,
    };
    saved = {
      ...draftReport,
      format: normalizeReportFormat(draftReport),
    };
    reports.unshift(saved);
  }

  await syncKey(STORAGE_KEYS.reports, reports);
  await refreshContentCacheFromApi();
  return getReports().find((item) => item.id === saved.id) || saved;
};

export const deleteReportDirect = async (id: string): Promise<boolean> => {
  await refreshContentCacheFromApi();
  const reports = getReports().filter(r => r.id !== id);
  await syncKey(STORAGE_KEYS.reports, reports);
  await refreshContentCacheFromApi();
  return true;
};

export const saveInsightDirect = async (article: Partial<InsightArticle> | InsightArticle): Promise<InsightArticle> => {
  await refreshContentCacheFromApi();
  const articles = getInsights();
  const now = new Date().toISOString();
  let saved: InsightArticle;
  const sanitizedArticle = {
    ...article,
    shareEnabled: undefined,
    shareSlug: undefined,
    shareTitle: undefined,
    shareDescription: undefined,
    shareImage: undefined,
    views: numberOr(article.views, 0),
    likes: numberOr(article.likes, 0),
    favoritesCount: numberOr((article as any).favoritesCount, 0),
  };

  if ('id' in sanitizedArticle && sanitizedArticle.id) {
    const index = articles.findIndex(a => a.id === sanitizedArticle.id);
    if (index !== -1) {
      articles[index] = {
        ...articles[index],
        ...sanitizedArticle,
        topics: normalizeTopics((sanitizedArticle as any).topics ?? articles[index].topics),
        updatedAt: now,
      };
      saved = articles[index];
    } else {
      saved = {
        id: sanitizedArticle.id,
        title: sanitizedArticle.title || '无标题文章',
        excerpt: sanitizedArticle.excerpt || '',
        content: sanitizedArticle.content || '',
        contentJson: sanitizedArticle.contentJson,
        contentHtml: sanitizedArticle.contentHtml,
        contentText: sanitizedArticle.contentText,
        fileUrl: sanitizedArticle.fileUrl,
        fileSize: sanitizedArticle.fileSize,
        topics: normalizeTopics((sanitizedArticle as any).topics),
        coverImage: sanitizedArticle.coverImage,
        coverPresetId: (sanitizedArticle as any).coverPresetId,
        publishDate: sanitizedArticle.publishDate || new Date().toISOString().split('T')[0],
        status: sanitizedArticle.status || 'draft',
        showOnHome: sanitizedArticle.showOnHome || false,
        views: sanitizedArticle.views || 0,
        likes: sanitizedArticle.likes || 0,
        favoritesCount: (sanitizedArticle as any).favoritesCount || 0,
        createdAt: sanitizedArticle.createdAt || now,
        updatedAt: now,
      };
      articles.unshift(saved);
    }
  } else {
    saved = {
      id: `insight_${Date.now()}`,
      title: sanitizedArticle.title || '无标题文章',
      excerpt: sanitizedArticle.excerpt || '',
      content: sanitizedArticle.content || '',
      contentJson: sanitizedArticle.contentJson,
      contentHtml: sanitizedArticle.contentHtml,
      contentText: sanitizedArticle.contentText,
      fileUrl: sanitizedArticle.fileUrl,
      fileSize: sanitizedArticle.fileSize,
      topics: normalizeTopics((sanitizedArticle as any).topics),
      coverImage: sanitizedArticle.coverImage,
      coverPresetId: (sanitizedArticle as any).coverPresetId,
      publishDate: sanitizedArticle.publishDate || new Date().toISOString().split('T')[0],
      status: sanitizedArticle.status || 'draft',
      showOnHome: sanitizedArticle.showOnHome || false,
      views: sanitizedArticle.views || 0,
      likes: sanitizedArticle.likes || 0,
      favoritesCount: (sanitizedArticle as any).favoritesCount || 0,
      createdAt: sanitizedArticle.createdAt || now,
      updatedAt: now,
    };
    articles.unshift(saved);
  }

  await syncKey(STORAGE_KEYS.insights, articles);
  await refreshContentCacheFromApi();
  return getInsights().find((item) => item.id === saved.id) || saved;
};

export const deleteInsightDirect = async (id: string): Promise<boolean> => {
  await refreshContentCacheFromApi();
  const articles = getInsights().filter(a => a.id !== id);
  await syncKey(STORAGE_KEYS.insights, articles);
  await refreshContentCacheFromApi();
  return true;
};

export const saveMethodologyDirect = async (item: Partial<Methodology> | Methodology): Promise<Methodology> => {
  await refreshContentCacheFromApi();
  const list = getMethodologies();
  const now = new Date().toISOString();
  let saved: Methodology;
  const normalizedItem = {
    ...item,
    views: numberOr(item.views, 0),
    likes: numberOr(item.likes, 0),
    favoritesCount: numberOr((item as any).favoritesCount, 0),
  };

  if ('id' in normalizedItem && normalizedItem.id) {
    const index = list.findIndex(r => r.id === normalizedItem.id);
    if (index !== -1) {
      list[index] = {
        ...list[index],
        ...normalizedItem,
        topics: normalizeTopics((normalizedItem as any).topics ?? list[index].topics),
        updatedAt: now,
      };
      saved = list[index];
    } else {
      saved = {
        id: normalizedItem.id,
        title: normalizedItem.title || '待补充',
        excerpt: normalizedItem.excerpt || '待补充',
        content: normalizedItem.content || '',
        contentJson: normalizedItem.contentJson,
        contentHtml: normalizedItem.contentHtml,
        contentText: normalizedItem.contentText,
        fileUrl: normalizedItem.fileUrl,
        fileSize: normalizedItem.fileSize,
        topics: normalizeTopics((normalizedItem as any).topics),
        coverImage: normalizedItem.coverImage,
        coverPresetId: (normalizedItem as any).coverPresetId,
        publishDate: normalizedItem.publishDate || new Date().toISOString().split('T')[0],
        status: normalizedItem.status || 'draft',
        showOnHome: normalizedItem.showOnHome || false,
        views: numberOr(normalizedItem.views, 0),
        likes: numberOr(normalizedItem.likes, 0),
        favoritesCount: numberOr((normalizedItem as any).favoritesCount, 0),
        createdAt: normalizedItem.createdAt || now,
        updatedAt: now,
      };
      list.unshift(saved);
    }
  } else {
    saved = {
      id: `methodology_${Date.now()}`,
      title: normalizedItem.title || '待补充',
      excerpt: normalizedItem.excerpt || '待补充',
      content: normalizedItem.content || '',
      contentJson: normalizedItem.contentJson,
      contentHtml: normalizedItem.contentHtml,
      contentText: normalizedItem.contentText,
      fileUrl: normalizedItem.fileUrl,
      fileSize: normalizedItem.fileSize,
      topics: normalizeTopics((normalizedItem as any).topics),
      coverImage: normalizedItem.coverImage,
      coverPresetId: (normalizedItem as any).coverPresetId,
      publishDate: normalizedItem.publishDate || new Date().toISOString().split('T')[0],
      status: normalizedItem.status || 'draft',
      showOnHome: normalizedItem.showOnHome || false,
      views: numberOr(normalizedItem.views, 0),
      likes: numberOr(normalizedItem.likes, 0),
      favoritesCount: numberOr((normalizedItem as any).favoritesCount, 0),
      createdAt: normalizedItem.createdAt || now,
      updatedAt: now,
    };
    list.unshift(saved);
  }

  await syncKey(STORAGE_KEYS.methodologies, list);
  await refreshContentCacheFromApi();
  return getMethodologies().find((entry) => entry.id === saved.id) || saved;
};

export const deleteMethodologyDirect = async (id: string): Promise<boolean> => {
  await refreshContentCacheFromApi();
  const list = getMethodologies().filter(r => r.id !== id);
  await syncKey(STORAGE_KEYS.methodologies, list);
  await refreshContentCacheFromApi();
  return true;
};

export const saveBookDirect = async (book: Partial<Book> | Book): Promise<Book> => {
  await refreshContentCacheFromApi();
  const books = getBooks();
  const now = new Date().toISOString();
  let saved: Book;
  const normalizedDescription = book.description || '';
  const normalizedAbstract = book.abstract || normalizedDescription;
  const normalizedBook = {
    ...book,
    likes: numberOr((book as any).likes, 0),
    favoritesCount: numberOr((book as any).favoritesCount, 0),
    views: numberOr(book.views, 0),
    reviews: numberOr(book.reviews, 0),
  };

  if ('id' in normalizedBook && normalizedBook.id) {
    const index = books.findIndex(b => b.id === normalizedBook.id);
    if (index !== -1) {
      books[index] = {
        ...books[index],
        ...normalizedBook,
        description: normalizedDescription || books[index].description || '',
        abstract: normalizedAbstract || books[index].abstract || normalizedDescription || '',
        topics: normalizeTopics((normalizedBook as any).topics ?? books[index].topics),
        updatedAt: now,
      };
      saved = books[index];
    } else {
      saved = {
        id: normalizedBook.id,
        title: normalizedBook.title || '无标题书籍',
        author: normalizedBook.author || '',
        description: normalizedDescription,
        abstract: normalizedAbstract,
        topics: normalizeTopics((normalizedBook as any).topics),
        pages: (normalizedBook as any).pages || 100,
        duration: (normalizedBook as any).duration || calculateReadTime((normalizedBook as any).pages || 100),
        rating: (normalizedBook as any).rating || 4.5,
        coverImage: (normalizedBook as any).coverImage,
        coverColor: (normalizedBook as any).coverColor || 'from-blue-600 to-indigo-800',
        likes: numberOr((normalizedBook as any).likes, 0),
        favoritesCount: numberOr((normalizedBook as any).favoritesCount, 0),
        fileUrl: normalizedBook.fileUrl,
        fileSize: normalizedBook.fileSize,
        publishDate: (normalizedBook as any).publishDate || new Date().toISOString().split('T')[0],
        status: normalizedBook.status || 'published',
        showOnHome: (normalizedBook as any).showOnHome || false,
        views: numberOr(normalizedBook.views, 0),
        reviews: numberOr(normalizedBook.reviews, 0),
        createdAt: normalizedBook.createdAt || now,
        updatedAt: now,
      };
      books.unshift(saved);
    }
  } else {
    saved = {
      id: `book_${Date.now()}`,
      title: normalizedBook.title || '无标题书籍',
      author: normalizedBook.author || '',
      description: normalizedDescription,
      abstract: normalizedAbstract,
      topics: normalizeTopics((normalizedBook as any).topics),
      pages: (normalizedBook as any).pages || 100,
      duration: (normalizedBook as any).duration || calculateReadTime((normalizedBook as any).pages || 100),
      rating: (normalizedBook as any).rating || 4.5,
      coverImage: (normalizedBook as any).coverImage,
      coverColor: (normalizedBook as any).coverColor || 'from-blue-600 to-indigo-800',
      likes: numberOr((normalizedBook as any).likes, 0),
      favoritesCount: numberOr((normalizedBook as any).favoritesCount, 0),
      fileUrl: normalizedBook.fileUrl,
      fileSize: normalizedBook.fileSize,
      publishDate: (normalizedBook as any).publishDate || new Date().toISOString().split('T')[0],
      status: normalizedBook.status || 'published',
      showOnHome: (normalizedBook as any).showOnHome || false,
      views: numberOr(normalizedBook.views, 0),
      reviews: numberOr(normalizedBook.reviews, 0),
      createdAt: normalizedBook.createdAt || now,
      updatedAt: now,
    };
    books.unshift(saved);
  }

  await syncKey(STORAGE_KEYS.books, books);
  await refreshContentCacheFromApi();
  return getBooks().find((item) => item.id === saved.id) || saved;
};

export const deleteBookDirect = async (id: string): Promise<boolean> => {
  await refreshContentCacheFromApi();
  const books = getBooks().filter(b => b.id !== id);
  await syncKey(STORAGE_KEYS.books, books);
  await refreshContentCacheFromApi();
  return true;
};
