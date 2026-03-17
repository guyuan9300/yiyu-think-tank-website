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

const normalizeTopics = (topics: unknown): ResourceTopic[] => {
  const allowed: ResourceTopic[] = ['战略', '业务设计', '组织', 'AI 技术'];
  if (!Array.isArray(topics)) return ['战略'];
  const cleaned = topics.filter((t): t is ResourceTopic => allowed.includes(t as ResourceTopic));
  return cleaned.length > 0 ? Array.from(new Set(cleaned)) : ['战略'];
};

const syncKey = async (key: string, data: unknown) => {
  const res = await fetch('/api/content-sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key, data }),
  });
  if (!res.ok) {
    throw new Error(await res.text());
  }
};

export const refreshContentCacheFromApi = async () => {
  await bootstrapFromPgApi();
};

export const saveReportDirect = async (report: Partial<Report> | Report): Promise<Report> => {
  await refreshContentCacheFromApi();
  const reports = getReports();
  const now = new Date().toISOString();
  let saved: Report;

  if ('id' in report && report.id) {
    const index = reports.findIndex(r => r.id === report.id);
    if (index !== -1) {
      reports[index] = { ...reports[index], ...report, topics: normalizeTopics((report as any).topics ?? reports[index].topics), updatedAt: now };
      saved = reports[index];
    } else {
      saved = {
        id: report.id,
        title: report.title || '无标题报告',
        publisher: report.publisher || '',
        summary: report.summary || '',
        topics: normalizeTopics((report as any).topics),
        version: report.version || 'v1.0',
        format: report.format || ['PDF'],
        coverImage: report.coverImage,
        fileUrl: report.fileUrl,
        fileSize: report.fileSize,
        pages: report.pages,
        publishDate: report.publishDate || new Date().toISOString().split('T')[0],
        status: report.status || 'draft',
        showOnHome: report.showOnHome || false,
        views: report.views || 0,
        downloads: report.downloads || 0,
        createdAt: report.createdAt || now,
        updatedAt: now,
      };
      reports.unshift(saved);
    }
  } else {
    saved = {
      id: `report_${Date.now()}`,
      title: report.title || '无标题报告',
      publisher: report.publisher || '',
      summary: report.summary || '',
      topics: normalizeTopics((report as any).topics),
      version: report.version || 'v1.0',
      format: report.format || ['PDF'],
      coverImage: report.coverImage,
      fileUrl: report.fileUrl,
      fileSize: report.fileSize,
      pages: report.pages,
      publishDate: report.publishDate || new Date().toISOString().split('T')[0],
      status: report.status || 'draft',
      showOnHome: report.showOnHome || false,
      views: report.views || 0,
      downloads: report.downloads || 0,
      createdAt: report.createdAt || now,
      updatedAt: now,
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
        topics: normalizeTopics((sanitizedArticle as any).topics),
        coverImage: sanitizedArticle.coverImage,
        publishDate: sanitizedArticle.publishDate || new Date().toISOString().split('T')[0],
        status: sanitizedArticle.status || 'draft',
        showOnHome: sanitizedArticle.showOnHome || false,
        views: sanitizedArticle.views || 0,
        likes: sanitizedArticle.likes || 0,
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
      topics: normalizeTopics((sanitizedArticle as any).topics),
      coverImage: sanitizedArticle.coverImage,
      publishDate: sanitizedArticle.publishDate || new Date().toISOString().split('T')[0],
      status: sanitizedArticle.status || 'draft',
      showOnHome: sanitizedArticle.showOnHome || false,
      views: sanitizedArticle.views || 0,
      likes: sanitizedArticle.likes || 0,
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

  if ('id' in item && item.id) {
    const index = list.findIndex(r => r.id === item.id);
    if (index !== -1) {
      list[index] = {
        ...list[index],
        ...item,
        topics: normalizeTopics((item as any).topics ?? list[index].topics),
        updatedAt: now,
      };
      saved = list[index];
    } else {
      saved = {
        id: item.id,
        title: item.title || '待补充',
        excerpt: item.excerpt || '待补充',
        content: item.content || '',
        contentJson: item.contentJson,
        contentHtml: item.contentHtml,
        contentText: item.contentText,
        topics: normalizeTopics((item as any).topics),
        coverImage: item.coverImage,
        publishDate: item.publishDate || new Date().toISOString().split('T')[0],
        status: item.status || 'draft',
        showOnHome: item.showOnHome || false,
        views: item.views || 0,
        likes: item.likes || 0,
        createdAt: item.createdAt || now,
        updatedAt: now,
      };
      list.unshift(saved);
    }
  } else {
    saved = {
      id: `methodology_${Date.now()}`,
      title: item.title || '待补充',
      excerpt: item.excerpt || '待补充',
      content: item.content || '',
      contentJson: item.contentJson,
      contentHtml: item.contentHtml,
      contentText: item.contentText,
      topics: normalizeTopics((item as any).topics),
      coverImage: item.coverImage,
      publishDate: item.publishDate || new Date().toISOString().split('T')[0],
      status: item.status || 'draft',
      showOnHome: item.showOnHome || false,
      views: item.views || 0,
      likes: item.likes || 0,
      createdAt: item.createdAt || now,
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

  if ('id' in book && book.id) {
    const index = books.findIndex(b => b.id === book.id);
    if (index !== -1) {
      books[index] = {
        ...books[index],
        ...book,
        topics: normalizeTopics((book as any).topics ?? books[index].topics),
        updatedAt: now,
      };
      saved = books[index];
    } else {
      saved = {
        id: book.id,
        title: book.title || '无标题书籍',
        author: book.author || '',
        description: book.description || '',
        abstract: book.abstract || '',
        topics: normalizeTopics((book as any).topics),
        pages: (book as any).pages || 100,
        duration: (book as any).duration || calculateReadTime((book as any).pages || 100),
        rating: (book as any).rating || 4.5,
        coverImage: (book as any).coverImage,
        coverColor: (book as any).coverColor || 'from-blue-600 to-indigo-800',
        fileUrl: book.fileUrl,
        fileSize: book.fileSize,
        publishDate: (book as any).publishDate || new Date().toISOString().split('T')[0],
        status: book.status || 'published',
        showOnHome: (book as any).showOnHome || false,
        views: book.views || 0,
        reviews: book.reviews || 0,
        createdAt: book.createdAt || now,
        updatedAt: now,
      };
      books.unshift(saved);
    }
  } else {
    saved = {
      id: `book_${Date.now()}`,
      title: book.title || '无标题书籍',
      author: book.author || '',
      description: book.description || '',
      abstract: book.abstract || '',
      topics: normalizeTopics((book as any).topics),
      pages: (book as any).pages || 100,
      duration: (book as any).duration || calculateReadTime((book as any).pages || 100),
      rating: (book as any).rating || 4.5,
      coverImage: (book as any).coverImage,
      coverColor: (book as any).coverColor || 'from-blue-600 to-indigo-800',
      fileUrl: book.fileUrl,
      fileSize: book.fileSize,
      publishDate: (book as any).publishDate || new Date().toISOString().split('T')[0],
      status: book.status || 'published',
      showOnHome: (book as any).showOnHome || false,
      views: book.views || 0,
      reviews: book.reviews || 0,
      createdAt: book.createdAt || now,
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
