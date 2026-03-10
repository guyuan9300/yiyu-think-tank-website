import {
  getReports as getSupabaseReports,
  getInsights as getSupabaseInsights,
  getBooks as getSupabaseBooks,
  type Report,
  type InsightArticle,
  type Book,
} from './dataServiceSupabase';
import {
  getMethodologies,
  getCategories,
  getComments,
  type Methodology,
  type Category,
  type Comment,
} from './dataService';

export interface AdminSnapshot {
  reports: Report[];
  insights: InsightArticle[];
  methodologies: Methodology[];
  books: Book[];
  categories: Category[];
  comments: Comment[];
  generatedAt: string;
}

export async function getAdminSnapshot(): Promise<AdminSnapshot> {
  const [reports, insights, books] = await Promise.all([
    getSupabaseReports(),
    getSupabaseInsights(),
    getSupabaseBooks(),
  ]);

  return {
    reports,
    insights,
    methodologies: getMethodologies(),
    books,
    categories: getCategories(),
    comments: getComments(),
    generatedAt: new Date().toISOString(),
  };
}
