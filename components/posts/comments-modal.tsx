'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { X, Send, Trash2, User } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { enUS, es } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import { useI18n } from '@/lib/i18n/i18n-context';

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  author: {
    id: string;
    name: string;
    image: string | null;
    role: string;
  };
}

interface CommentsModalProps {
  postId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function CommentsModal({ postId, isOpen, onClose }: CommentsModalProps) {
  const { data: session } = useSession();
  const { t, language } = useI18n();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingComments, setLoadingComments] = useState(true);

  const dateLocale = language === 'es' ? es : enUS;
  const commentLabel = comments.length === 1 ? t('feed.commentSingular') : t('feed.commentPlural');

  useEffect(() => {
    if (isOpen) {
      fetchComments();
    }
  }, [isOpen, postId]);

  const fetchComments = async () => {
    try {
      setLoadingComments(true);
      const res = await fetch(`/api/posts/${postId}/comments`);
      const data = await res.json();

      if (data.success) {
        setComments(data.data.comments);
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setLoadingComments(false);
    }
  };

  const handleAddComment = async () => {
    if (!session) {
      toast.error(t('feed.mustLoginToComment'));
      return;
    }

    if (!newComment.trim()) {
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`/api/posts/${postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newComment }),
      });

      const data = await res.json();

      if (data.success) {
        setComments([data.data, ...comments]);
        setNewComment('');
        toast.success(t('feed.commentPosted'));
      } else {
        toast.error(data.error || t('feed.commentError'));
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error(t('feed.commentPostError'));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      const res = await fetch(`/api/posts/${postId}/comments/${commentId}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (data.success) {
        setComments(comments.filter((c) => c.id !== commentId));
        toast.success(t('feed.commentDeleted'));
      } else {
        toast.error(data.error || t('feed.deleteError'));
      }
    } catch (error) {
      console.error('Error deleting comment:', error);
      toast.error(t('feed.deleteCommentError'));
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-sm flex items-end sm:items-center justify-center"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="bg-gradient-to-b from-zinc-900 to-black rounded-t-3xl sm:rounded-3xl w-full sm:max-w-lg max-h-[85vh] sm:max-h-[80vh] flex flex-col shadow-2xl border border-zinc-800/50"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-zinc-800/50 backdrop-blur-xl">
            <div>
              <h2 className="text-xl font-bold text-white">{t('feed.comments')}</h2>
              <p className="text-xs text-zinc-400 mt-0.5">{comments.length} {commentLabel}</p>
            </div>
            <button
              onClick={onClose}
              aria-label={t('common.close')}
              className="p-2.5 hover:bg-zinc-800/80 rounded-full transition-all duration-200 hover:scale-105 active:scale-95"
            >
              <X className="w-5 h-5 text-zinc-400 hover:text-white transition-colors" />
            </button>
          </div>

          {/* Comments List */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {loadingComments ? (
              <div className="text-center text-zinc-400 py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
                <p className="mt-3 text-sm">{t('feed.loadingComments')}</p>
              </div>
            ) : comments.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-zinc-800/50 flex items-center justify-center">
                  <Send className="w-8 h-8 text-zinc-600" />
                </div>
                <p className="text-zinc-400 text-sm">{t('feed.noCommentsYet')}</p>
                <p className="text-zinc-600 text-xs mt-1">{t('feed.beFirstToComment')}</p>
              </div>
            ) : (
              comments.map((comment) => (
                <motion.div
                  key={comment.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex gap-3 p-3 rounded-2xl hover:bg-zinc-800/30 transition-colors"
                >
                  {/* Avatar */}
                  <div className="flex-shrink-0">
                    {comment.author.image ? (
                      <Image
                        src={comment.author.image}
                        alt={comment.author.name}
                        width={40}
                        height={40}
                        className="block rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-400 via-blue-500 to-purple-600 flex items-center justify-center ring-2 ring-zinc-800">
                        <User className="w-5 h-5 text-white" />
                      </div>
                    )}
                  </div>

                  {/* Comment Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className="font-bold text-white text-sm">
                        {comment.author.name}
                      </span>
                      {comment.author.role === 'BARBER' && (
                        <span className="px-2.5 py-1 text-xs font-medium bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-400 rounded-full border border-cyan-500/30">
                          {t('common.barber')}
                        </span>
                      )}
                      {comment.author.role === 'ADMIN' && (
                        <span className="px-2.5 py-1 text-xs font-medium bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-400 rounded-full border border-purple-500/30">
                          {t('common.admin')}
                        </span>
                      )}
                      <span className="text-xs text-zinc-500">
                        {formatDistanceToNow(new Date(comment.createdAt), {
                          addSuffix: true,
                          locale: dateLocale,
                        })}
                      </span>
                    </div>
                    <p className="text-zinc-100 text-sm leading-relaxed break-words">{comment.content}</p>

                    {/* Delete Button */}
                    {(session?.user?.role === 'ADMIN' || comment.author.id === session?.user?.id) && (
                      <button
                        onClick={() => handleDeleteComment(comment.id)}
                        className="mt-2 text-xs text-red-400/80 hover:text-red-400 flex items-center gap-1.5 transition-colors hover:bg-red-500/10 px-2 py-1 rounded-lg"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        {t('common.delete')}
                      </button>
                    )}
                  </div>
                </motion.div>
              ))
            )}
          </div>

          {/* Input Area */}
          <div className="p-5 border-t border-zinc-800/50 bg-zinc-900/50 backdrop-blur-xl pb-safe">
            <div className="flex gap-3 items-end">
              {/* Avatar */}
              <div className="flex-shrink-0 mb-1">
                {session?.user?.image ? (
                  <Image
                    src={session.user.image}
                    alt={session.user.name || t('common.user')}
                    width={36}
                    height={36}
                    className="block rounded-full object-cover"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-cyan-400 via-blue-500 to-purple-600 flex items-center justify-center ring-2 ring-zinc-800">
                    <User className="w-4 h-4 text-white" />
                  </div>
                )}
              </div>

              {/* Input */}
              <Textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleAddComment();
                  }
                }}
                placeholder={session ? t('feed.writeComment') : t('feed.loginToComment')}
                className="flex-1 min-h-[44px] max-h-[100px] bg-zinc-800/70 border-zinc-700/50 hover:border-cyan-500/30 focus:border-cyan-500/50 text-white placeholder:text-zinc-500 resize-none rounded-2xl px-4 py-3 transition-all duration-200"
                disabled={!session}
              />

              {/* Send Button */}
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button
                  onClick={handleAddComment}
                  disabled={!newComment.trim() || loading || !session}
                  size="icon"
                  className="h-11 w-11 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white rounded-full shadow-lg shadow-cyan-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                >
                  {loading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </Button>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
