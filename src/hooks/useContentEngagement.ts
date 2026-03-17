import { useCallback, useEffect, useState } from 'react';
import {
  fetchContentEngagement,
  toggleContentFavorite,
  toggleContentLike,
  type ContentEngagementState,
  type ContentEngagementType,
} from '../lib/contentEngagementApi';

const defaultState = (contentType: ContentEngagementType, contentId: string): ContentEngagementState => ({
  contentType,
  contentId,
  likesCount: 0,
  favoritesCount: 0,
  liked: false,
  favorited: false,
});

export function useContentEngagement(contentType: ContentEngagementType, contentId: string) {
  const [state, setState] = useState<ContentEngagementState>(() => defaultState(contentType, contentId));
  const [isLoading, setIsLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!contentId) {
      setState(defaultState(contentType, contentId));
      setIsLoading(false);
      return { ok: false, error: '内容不存在' };
    }
    setIsLoading(true);
    const result = await fetchContentEngagement(contentType, contentId);
    if (result.ok && result.data) {
      setState(result.data);
    } else {
      setState(defaultState(contentType, contentId));
    }
    setIsLoading(false);
    return result;
  }, [contentId, contentType]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const handleToggleLike = useCallback(async () => {
    if (!contentId) {
      return { ok: false, error: '内容不存在' };
    }
    const result = await toggleContentLike(contentType, contentId);
    if (result.ok && result.data) {
      setState(result.data);
    }
    return result;
  }, [contentId, contentType]);

  const handleToggleFavorite = useCallback(async () => {
    if (!contentId) {
      return { ok: false, error: '内容不存在' };
    }
    const result = await toggleContentFavorite(contentType, contentId);
    if (result.ok && result.data) {
      setState(result.data);
    }
    return result;
  }, [contentId, contentType]);

  return {
    engagement: state,
    isEngagementLoading: isLoading,
    reloadEngagement: reload,
    toggleLike: handleToggleLike,
    toggleFavorite: handleToggleFavorite,
  };
}
