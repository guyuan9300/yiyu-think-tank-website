import { useEffect, useState } from 'react';
import { fetchMyFavoriteResources, toggleContentFavorite, type ContentEngagementType } from './contentEngagementApi';

// ============================================================
// 我的收藏 · 本地镜像 + 云端合并
// 云端 /me/favorites 是真相源; 断网时回退到本地镜像, 保证个人中心「我的收藏」可用。
// 内容页收藏时若也调 addLocalFavorite, 即可离线可见(本期先以云端为主, 本地兜底)。
// ============================================================

export interface FavoriteRef {
  contentType: ContentEngagementType;
  contentId: string;
  createdAt: string;
}

const KEY = 'yiyu_my_favorites_v1';
export const MY_FAVORITES_EVENT = 'yiyu:my-favorites-changed';

export function loadLocalFavorites(): FavoriteRef[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(KEY);
    const list = raw ? (JSON.parse(raw) as FavoriteRef[]) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function persist(list: FavoriteRef[]): void {
  try { localStorage.setItem(KEY, JSON.stringify(list)); } catch { /* quota */ }
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(MY_FAVORITES_EVENT));
}

function sameRef(a: FavoriteRef, t: ContentEngagementType, id: string): boolean {
  return a.contentType === t && a.contentId === id;
}

/** 把一批云端收藏并入本地镜像(去重), 供离线下次读取 */
export function mergeIntoLocal(refs: FavoriteRef[]): void {
  if (!refs.length) return;
  const local = loadLocalFavorites();
  const merged = [...local];
  for (const r of refs) {
    if (!merged.some((m) => sameRef(m, r.contentType, r.contentId))) merged.push(r);
  }
  persist(merged);
}

export function addLocalFavorite(contentType: ContentEngagementType, contentId: string): void {
  const list = loadLocalFavorites();
  if (list.some((m) => sameRef(m, contentType, contentId))) return;
  persist([{ contentType, contentId, createdAt: new Date().toISOString() }, ...list]);
}

export function removeLocalFavorite(contentType: ContentEngagementType, contentId: string): void {
  persist(loadLocalFavorites().filter((m) => !sameRef(m, contentType, contentId)));
}

export interface MyFavoritesResult {
  items: FavoriteRef[];
  source: 'cloud' | 'local';
}

/** 加载我的收藏: 优先云端, 失败回退本地镜像 */
export async function loadMyFavorites(): Promise<MyFavoritesResult> {
  try {
    const res = await fetchMyFavoriteResources();
    if (res.ok && Array.isArray(res.data)) {
      mergeIntoLocal(res.data);
      return { items: res.data, source: 'cloud' };
    }
  } catch {
    /* 断网 → 本地兜底 */
  }
  return { items: loadLocalFavorites(), source: 'local' };
}

/** 取消收藏: 同步云端 + 本地镜像(任一成功都更新本地, 保证 UI 立即反映) */
export async function removeMyFavorite(contentType: ContentEngagementType, contentId: string): Promise<void> {
  removeLocalFavorite(contentType, contentId);
  try {
    await toggleContentFavorite(contentType, contentId); // 已收藏 → 切换为取消
  } catch {
    /* 断网: 本地已移除, 待恢复网络后内容页再同步 */
  }
}

export function useLocalFavoritesCount(): number {
  const [n, setN] = useState<number>(() => loadLocalFavorites().length);
  useEffect(() => {
    const reload = () => setN(loadLocalFavorites().length);
    window.addEventListener(MY_FAVORITES_EVENT, reload);
    window.addEventListener('storage', reload);
    return () => {
      window.removeEventListener(MY_FAVORITES_EVENT, reload);
      window.removeEventListener('storage', reload);
    };
  }, []);
  return n;
}
