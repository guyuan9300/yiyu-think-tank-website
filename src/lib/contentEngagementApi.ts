import { authRequest, type ApiResult } from './authHttp';

export type ContentEngagementType = 'insight' | 'methodology' | 'report' | 'book';

export interface ContentEngagementState {
  contentType: ContentEngagementType;
  contentId: string;
  likesCount: number;
  favoritesCount: number;
  liked: boolean;
  favorited: boolean;
}

export interface FavoriteResourceRecord {
  contentType: ContentEngagementType;
  contentId: string;
  createdAt: string;
}

export async function fetchContentEngagement(contentType: ContentEngagementType, contentId: string) {
  return authRequest<ContentEngagementState>(
    `/content-engagement?contentType=${encodeURIComponent(contentType)}&contentId=${encodeURIComponent(contentId)}`,
    undefined,
    { withAuth: true }
  );
}

export async function toggleContentLike(contentType: ContentEngagementType, contentId: string) {
  return authRequest<ContentEngagementState>('/content-engagement/like', {
    method: 'POST',
    body: JSON.stringify({ contentType, contentId }),
  }, { withAuth: true });
}

export async function toggleContentFavorite(contentType: ContentEngagementType, contentId: string) {
  return authRequest<ContentEngagementState>('/content-engagement/favorite', {
    method: 'POST',
    body: JSON.stringify({ contentType, contentId }),
  }, { withAuth: true });
}

export async function fetchMyFavoriteResources() {
  return authRequest<FavoriteResourceRecord[]>('/me/favorites', undefined, { withAuth: true });
}
