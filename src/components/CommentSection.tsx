/**
 * 评论区组件
 * 用于文章、报告、书籍详情页的评论功能
 */
import { useState, useEffect } from 'react';
import { MessageSquare, Send, User, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { 
  getCommentsByContent, 
  saveComment,
  type Comment 
} from '../lib/dataService';

interface CommentSectionProps {
  contentId: string;
  contentType: 'insight' | 'report' | 'book';
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
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // 加载评论
  useEffect(() => {
    loadComments();
    
    // 监听数据变化事件
    const handleDataChange = () => {
      loadComments();
    };
    
    window.addEventListener('yiyu_data_change', handleDataChange);
    
    return () => {
      window.removeEventListener('yiyu_data_change', handleDataChange);
    };
  }, [contentId, contentType]);

  const loadComments = () => {
    const loadedComments = getCommentsByContent(contentId, contentType);
    setComments(loadedComments);
  };

  // 提交评论
  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!commentText.trim()) {
      setMessage({ type: 'error', text: '请输入评论内容' });
      return;
    }

    setIsSubmitting(true);
    setMessage(null);

    try {
      // 保存评论
      saveComment({
        contentId,
        contentType,
        contentTitle,
        userId: isLoggedIn ? 'user_' + Date.now() : 'guest',
        userName,
        userAvatar,
        text: commentText.trim(),
      });

      setCommentText('');
      setMessage({ 
        type: 'success', 
        text: '评论已提交，待管理员审核后将显示在评论列表中' 
      });

      // 3秒后清除提示
      setTimeout(() => {
        setMessage(null);
      }, 3000);
    } catch (error) {
      console.error('提交评论失败:', error);
      setMessage({ type: 'error', text: '提交失败，请稍后重试' });
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
    
    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    if (days < 7) return `${days}天前`;
    
    return date.toLocaleDateString('zh-CN');
  };

  return (
    <div className="mt-12 pt-8 border-t border-gray-200">
      {/* 标题 */}
      <div className="flex items-center gap-2 mb-6">
        <MessageSquare className="w-6 h-6 text-purple-600" />
        <h3 className="text-xl font-bold text-gray-900">
          评论 ({comments.length})
        </h3>
      </div>

      {/* 提示消息 */}
      {message && (
        <div className={`mb-6 p-4 rounded-xl flex items-center gap-2 ${
          message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
        }`}>
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
              {userName.charAt(0)}
            </div>
            
            <div className="flex-1">
              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder={isLoggedIn ? '写下你的评论...' : '请登录后发表评论'}
                disabled={!isLoggedIn || isSubmitting}
                rows={3}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
              
              <div className="flex items-center justify-between mt-3">
                <span className="text-sm text-gray-500">
                  {isLoggedIn ? '发表评论需经管理员审核' : '请先登录'}
                </span>
                
                <button
                  type="submit"
                  disabled={!isLoggedIn || !commentText.trim() || isSubmitting}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      提交中...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      发表评论
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
            <p className="text-gray-500">暂无评论，快来发表第一条评论吧！</p>
          </div>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="bg-white rounded-xl p-6 border border-gray-100 hover:border-purple-200 transition-colors">
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
                <div className="ml-13 mt-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border-l-4 border-purple-500">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white text-sm font-medium flex-shrink-0">
                      管
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-purple-900 mb-1">管理员回复：</p>
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
