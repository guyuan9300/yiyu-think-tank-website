import { authRequest } from './authHttp';
import type { Comment } from './dataService';

export async function fetchCommentsByContent(
  contentId: string,
  contentType: Comment['contentType']
) {
  const params = new URLSearchParams({
    contentId,
    contentType,
  });
  return authRequest<Comment[]>(`/comments?${params.toString()}`);
}

export async function fetchAdminComments(status: 'all' | 'pending' | 'approved' | 'rejected' | 'has_reply' = 'all') {
  const params = new URLSearchParams({
    scope: 'admin',
    status,
  });
  return authRequest<Comment[]>(`/comments?${params.toString()}`, undefined, { withAuth: true });
}

export async function createCommentApi(payload: {
  contentId: string;
  contentType: Comment['contentType'];
  contentTitle: string;
  text: string;
  userId?: string;
  userName?: string;
  userAvatar?: string;
}) {
  return authRequest<Comment>('/comments', {
    method: 'POST',
    body: JSON.stringify(payload),
  }, { withAuth: true });
}

export async function updateCommentStatusApi(commentId: string, status: 'approved' | 'rejected') {
  return authRequest<null>(
    `/comments/${encodeURIComponent(commentId)}/status`,
    { method: 'POST', body: JSON.stringify({ status }) },
    { withAuth: true }
  );
}

export async function replyCommentApi(commentId: string, reply: string) {
  return authRequest<null>(
    `/comments/${encodeURIComponent(commentId)}/reply`,
    { method: 'POST', body: JSON.stringify({ reply }) },
    { withAuth: true }
  );
}

export async function deleteCommentApi(commentId: string) {
  return authRequest<null>(
    `/comments/${encodeURIComponent(commentId)}`,
    { method: 'DELETE' },
    { withAuth: true }
  );
}
