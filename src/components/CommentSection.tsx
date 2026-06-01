/**
 * 评论区组件
 * 用于文章、报告、书籍详情页的评论功能
 */
import { useState, useEffect } from 'react';
import { MessageSquare, Send, User, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { type Comment } from '../lib/dataService';
import { createCommentApi, fetchCommentsByContent } from '../lib/commentApi';
import { useLang } from '../lib/i18n';

interface CommentSectionProps {
  contentId: string;
  contentType: 'insight' | 'report' | 'book' | 'methodology';
  contentTitle: string;
  isLoggedIn?: boolean;
  userName?: string;
  userAvatar?: string;
}

export function CommentSection({
  contentId,
  contentType,
  contentTitle,
  isLoggedIn = false,
  userName = '访客',
  userAvatar,
}: CommentSectionProps) {
  const { t } = useLang();
  // Global login fallback: if caller didn't wire isLoggedIn, infer from storage.
  // This ensures comment input works consistently across pages.
  const [derivedLoggedIn, setDerivedLoggedIn] = useState<boolean>(isLoggedIn);
  const [derivedUserName, setDerivedUserName] = useState<string>(userName);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Login status (global)
  useEffect(() => {
    const readUser = () => {
      const userStr = (localStorage.getItem('yiyu_current_user') ?? sessionStorage.getItem('yiyu_current_user'));
      if (userStr) {
        try {
          const u = JSON.parse(userStr);
          setDerivedLoggedIn(true);
          setDerivedUserName((u?.nickname || u?.email || userName || '用户') as string);
          return;
        } catch {
          // ignore
        }
      }
      setDerivedLoggedIn(isLoggedIn);
      setDerivedUserName(userName || '访客');
    };

    readUser();
    window.addEventListener('yiyu_user_updated', readUser);
    window.addEventListener('storage', readUser);
    return () => {
      window.removeEventListener('yiyu_user_updated', readUser);
      window.removeEventListener('storage', readUser);
    };
  }, [isLoggedIn, userName]);

  // 加载评论
  useEffect(() => {
    void loadComments();

    // 监听数据变化事件
    const handleDataChange = () => {
      void loadComments();
    };

    window.addEventListener('yiyu_comments_updated', handleDataChange);
    window.addEventListener('yiyu_data_change', handleDataChange);

    return () => {
      window.removeEventListener('yiyu_comments_updated', handleDataChange);
      window.removeEventListener('yiyu_data_change', handleDataChange);
    };
  }, [contentId, contentType]);

  const loadComments = async () => {
    const result = await fetchCommentsByContent(contentId, contentType);
    setComments(result.ok && result.data ? result.data : []);
  };

  // 提交评论
  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!commentText.trim()) {
      setMessage({ type: 'error', text: t({ zh: '请输入评论内容', en: 'Please enter a comment' }) });
      return;
    }

    setIsSubmitting(true);
    setMessage(null);

    try {
      const result = await createCommentApi({
        contentId,
        contentType,
        contentTitle,
        userId: derivedLoggedIn ? 'user_' + Date.now() : 'guest',
        userName: derivedUserName,
        userAvatar,
        text: commentText.trim(),
      });
      if (!result.ok) {
        throw new Error(result.error || t({ zh: '提交失败，请稍后重试', en: 'Submission failed. Please try again later.' }));
      }

      setCommentText('');
      setMessage({
        type: 'success',
        text: t({ zh: '评论已提交，待管理员审核后将显示在评论列表中', en: 'Comment submitted. It will appear once approved by an administrator.' })
      });
      window.dispatchEvent(new Event('yiyu_comments_updated'));

      // 3秒后清除提示
      setTimeout(() => {
        setMessage(null);
      }, 3000);
    } catch (error) {
      console.error('提交评论失败:', error);
      setMessage({ type: 'error', text: t({ zh: '提交失败，请稍后重试', en: 'Submission failed. Please try again later.' }) });
    } finally {
      setIsSubmitting(false);
    }
  };

  // 格式化时间
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return t({ zh: '刚刚', en: 'just now' });
    if (minutes < 60) return t({ zh: `${minutes}分钟前`, en: `${minutes} min ago` });
    if (hours < 24) return t({ zh: `${hours}小时前`, en: `${hours} h ago` });
    if (days < 7) return t({ zh: `${days}天前`, en: `${days} d ago` });

    return date.toLocaleDateString(t({ zh: 'zh-CN', en: 'en-US' }));
  };

  return (
    <div
      data-yiyu-section="detail-comments"
      data-yiyu-section-type="comments"
      data-yiyu-comment-state={message?.type === 'success' ? 'submitted' : message?.type === 'error' ? 'error' : 'idle'}
      data-yiyu-comment-success-hint="评论已提交，待管理员审核后将显示在评论列表中"
      data-yiyu-comments-total={String(comments.length)}
      className="mt-12 pt-8 border-t border-gray-200"
    >
      {/* 标题 */}
      <div className="flex items-center gap-2 mb-6">
        <MessageSquare className="w-6 h-6 text-purple-600" />
        <h3 className="text-xl font-bold text-gray-900">
          {t({ zh: '评论', en: 'Comments' })} ({comments.length})
        </h3>
      </div>

      {/* 提示消息 */}
      {message && (
        <div
          data-yiyu-comment-status={message.type}
          className={`mb-6 p-4 rounded-xl flex items-center gap-2 ${
          message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
        }`}
        >
          {message.type === 'success' ? (
            <CheckCircle className="w-5 h-5" />
          ) : (
            <AlertCircle className="w-5 h-5" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* 发表评论表单 */}
      <form onSubmit={handleSubmitComment} className="mb-8">
        <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
          <div className="flex items-start gap-3">
            {/* 用户头像 */}
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-medium flex-shrink-0">
              {derivedUserName.charAt(0)}
            </div>
            
            <div className="flex-1">
              <textarea
                data-yiyu-comment-box="true"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder={derivedLoggedIn ? t({ zh: '写下你的评论...', en: 'Write your comment...' }) : t({ zh: '请登录后发表评论', en: 'Please log in to comment' })}
                disabled={!derivedLoggedIn || isSubmitting}
                rows={3}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
              
              <div className="flex items-center justify-between mt-3">
                <span className="text-sm text-gray-500">
                  {derivedLoggedIn ? t({ zh: '发表评论需经管理员审核', en: 'Comments require administrator approval' }) : t({ zh: '请先登录', en: 'Please log in first' })}
                </span>
                
                <button
                  data-yiyu-comment-submit="true"
                  type="submit"
                  disabled={!derivedLoggedIn || !commentText.trim() || isSubmitting}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      {t({ zh: '提交中...', en: 'Submitting...' })}
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      {t({ zh: '发表评论', en: 'Post comment' })}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </form>

      {/* 评论列表 */}
      <div className="space-y-6">
        {comments.length === 0 ? (
          <div className="text-center py-12">
            <MessageSquare className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500">{t({ zh: '暂无评论，快来发表第一条评论吧！', en: 'No comments yet. Be the first to comment!' })}</p>
          </div>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="ml-12 bg-white rounded-xl p-6 border border-gray-100 hover:border-purple-200 transition-colors">
              {/* 评论头部 */}
              <div className="flex items-start gap-3 mb-3">
                {/* 用户头像 */}
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-medium flex-shrink-0">
                  {comment.userName.charAt(0)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-gray-900">{comment.userName}</span>
                    <span className="text-xs text-gray-400">•</span>
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatTime(comment.createdAt)}
                    </span>
                  </div>
                  
                  {/* 评论内容 */}
                  <p className="text-gray-700 leading-relaxed">{comment.text}</p>
                </div>
              </div>
              
              {/* 管理员回复 */}
              {comment.reply && (
                <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border-l-4 border-purple-500">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center overflow-hidden flex-shrink-0">
                      <img
                        src={`${import.meta.env.BASE_URL}yiyu-avatar.png`}
                        alt={t({ zh: '益语智库', en: 'Yiyu Institute' })}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-purple-900 mb-1">{t({ zh: '管理员回复：', en: 'Administrator reply:' })}</p>
                      <p className="text-sm text-gray-800 leading-relaxed">{comment.reply}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default CommentSection;
