/**
 * 内容付费规则 (统一口径, 文章页/报告页共用)
 *
 * 规则 (2026-05-30 顾源源定):
 *   文章 — 未登录看 50%; 登录未付费每天免费看 1 篇(同一篇不扣额度,跨天重置); 一年会员无限.
 *   报告 — 未登录不可看(引导登录); 登录未付费看前 20%; 一年会员看全文 + 可下载.
 *   付费 = 一年会员(¥198, 一次性). 文案: 所有收入用于为行动者加电.
 *
 * 后端付费判定: member_type='gold'/'diamond' 即付费;
 *   paid_expires_at = NULL 视为永不过期(终身); 有值则需未过期.
 */

const FREE_ARTICLE_QUOTA_KEY = 'yiyu_free_article_quota'; // { date: 'YYYY-MM-DD', ids: string[] }
const DAILY_FREE_ARTICLE_LIMIT = 1;

export interface AccessUser {
  memberType?: 'regular' | 'gold' | 'diamond' | 'admin' | string;
  paidExpiresAt?: string;
  adminRole?: 'admin' | string;
}

/** 读取当前登录用户 (localStorage/sessionStorage), 未登录返回 null */
export function getCurrentAccessUser(): AccessUser | null {
  try {
    const raw = localStorage.getItem('yiyu_current_user') ?? sessionStorage.getItem('yiyu_current_user');
    if (!raw) return null;
    return JSON.parse(raw) as AccessUser;
  } catch {
    return null;
  }
}

export function isLoggedIn(user: AccessUser | null): boolean {
  return Boolean(user);
}

/** 是否付费(终身)会员: 管理员直通; gold/diamond 且未过期(无到期日=终身) */
export function isPaidMember(user: AccessUser | null): boolean {
  if (!user) return false;
  if (user.adminRole === 'admin' || user.memberType === 'admin') return true;
  if (user.memberType !== 'gold' && user.memberType !== 'diamond') return false;
  if (!user.paidExpiresAt) return true; // 终身
  return new Date(user.paidExpiresAt).getTime() > Date.now();
}

function todayKey(): string {
  const d = new Date();
  // 本地日期 YYYY-MM-DD
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function readQuota(): { date: string; ids: string[] } {
  try {
    const raw = localStorage.getItem(FREE_ARTICLE_QUOTA_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as { date: string; ids: string[] };
      if (parsed.date === todayKey() && Array.isArray(parsed.ids)) return parsed;
    }
  } catch {
    /* ignore */
  }
  return { date: todayKey(), ids: [] };
}

function writeQuota(ids: string[]): void {
  try {
    localStorage.setItem(FREE_ARTICLE_QUOTA_KEY, JSON.stringify({ date: todayKey(), ids }));
  } catch {
    /* ignore */
  }
}

/** 这篇文章今天是否已用免费额度读过 (同一篇不重复扣) */
export function hasReadArticleToday(articleId: string): boolean {
  return readQuota().ids.includes(articleId);
}

/** 今日剩余免费文章篇数 */
export function remainingFreeArticles(): number {
  return Math.max(0, DAILY_FREE_ARTICLE_LIMIT - readQuota().ids.length);
}

export type ArticleAccess =
  | { tier: 'full' }                         // 全文 (付费会员)
  | { tier: 'free-today'; remaining: number } // 今日免费额度内可看全文
  | { tier: 'preview'; ratio: number; reason: 'guest' | 'quota_used' };

/**
 * 计算某篇文章的可见档位.
 * 调用即视为"消费"一次额度 (仅登录未付费 + 该篇今天没读过 + 还有额度时扣减).
 * 纯展示判断请用 peekArticleAccess.
 */
export function resolveArticleAccess(articleId: string, user: AccessUser | null): ArticleAccess {
  if (isPaidMember(user)) return { tier: 'full' };
  if (!isLoggedIn(user)) return { tier: 'preview', ratio: 0.5, reason: 'guest' };

  // 登录未付费: 每日 1 篇免费, 同篇不扣额度
  const quota = readQuota();
  if (quota.ids.includes(articleId)) {
    return { tier: 'free-today', remaining: Math.max(0, DAILY_FREE_ARTICLE_LIMIT - quota.ids.length) };
  }
  if (quota.ids.length < DAILY_FREE_ARTICLE_LIMIT) {
    const ids = [...quota.ids, articleId];
    writeQuota(ids);
    return { tier: 'free-today', remaining: Math.max(0, DAILY_FREE_ARTICLE_LIMIT - ids.length) };
  }
  return { tier: 'preview', ratio: 0.5, reason: 'quota_used' };
}

/** 不消费额度地预判 (用于渲染前的只读判断, 避免 effect 重复扣减) */
export function peekArticleAccess(articleId: string, user: AccessUser | null): ArticleAccess {
  if (isPaidMember(user)) return { tier: 'full' };
  if (!isLoggedIn(user)) return { tier: 'preview', ratio: 0.5, reason: 'guest' };
  const quota = readQuota();
  if (quota.ids.includes(articleId)) {
    return { tier: 'free-today', remaining: Math.max(0, DAILY_FREE_ARTICLE_LIMIT - quota.ids.length) };
  }
  if (quota.ids.length < DAILY_FREE_ARTICLE_LIMIT) {
    return { tier: 'free-today', remaining: DAILY_FREE_ARTICLE_LIMIT - quota.ids.length - 1 };
  }
  return { tier: 'preview', ratio: 0.5, reason: 'quota_used' };
}

export type ReportAccess =
  | { tier: 'full' }                          // 全文 + 可下载 (付费会员)
  | { tier: 'preview'; ratio: number }        // 登录未付费: 前 20%
  | { tier: 'locked' };                       // 未登录: 不可看, 引导登录

export function resolveReportAccess(user: AccessUser | null): ReportAccess {
  if (isPaidMember(user)) return { tier: 'full' };
  if (!isLoggedIn(user)) return { tier: 'locked' };
  return { tier: 'preview', ratio: 0.2 };
}

export const LIFETIME_MEMBER_TAGLINE = '成为一年会员 · 所有收入用于为行动者加电';
