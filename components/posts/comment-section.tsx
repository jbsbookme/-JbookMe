'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { MessageCircle, Send, Trash2, Reply, User } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

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
  replies?: Comment[];
}

interface CommentSectionProps {
  postId: string;
  initialCommentCount?: number;
}

export function CommentSection({ postId, initialCommentCount = 0 }: CommentSectionProps) {
  const { data: session } = useSession();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingComments, setLoadingComments] = useState(true);
  const [showComments, setShowComments] = useState(false);

  useEffect(() => {
    if (showComments) {
      fetchComments();
    }
  }, [showComments, postId]);

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
      toast.error('Debes iniciar sesión para comentar');
      return;
    }

    if (!newComment.trim()) {
      toast.error('Escribe un comentario');
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
        toast.success('Comentario publicado');
      } else {
        toast.error(data.error || 'Error al comentar');
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error('Error al publicar comentario');
    } finally {
      setLoading(false);
    }
  };

  const handleAddReply = async (parentId: string) => {
    if (!session) {
      toast.error('Debes iniciar sesión para responder');
      return;
    }

    if (!replyContent.trim()) {
      toast.error('Escribe una respuesta');
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`/api/posts/${postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          content: replyContent,
          parentId 
        }),
      });

      const data = await res.json();

      if (data.success) {
        setComments(comments.map(comment => {
          if (comment.id === parentId) {
            return {
              ...comment,
              replies: [...(comment.replies || []), data.data]
            };
          }
          return comment;
        }));
        setReplyContent('');
        setReplyingTo(null);
        toast.success('Respuesta publicada');
      } else {
        toast.error(data.error || 'Error al responder');
      }
    } catch (error) {
      console.error('Error adding reply:', error);
      toast.error('Error al publicar respuesta');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('¿Eliminar este comentario?')) return;

    try {
      const res = await fetch(`/api/posts/${postId}/comments/${commentId}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (data.success) {
        setComments(comments.filter(c => c.id !== commentId));
        toast.success('Comentario eliminado');
      } else {
        toast.error(data.error || 'Error al eliminar');
      }
    } catch (error) {
      console.error('Error deleting comment:', error);
      toast.error('Error al eliminar comentario');
    }
  };

  const CommentItem = ({ comment, isReply = false }: { comment: Comment; isReply?: boolean }) => {
    const canDelete = session?.user?.id === comment.author.id || session?.user?.role === 'ADMIN';

    return (
      <div className={`${isReply ? 'ml-12' : ''} mb-4`}>
        <div className="flex gap-3">
          <div className="flex-shrink-0">
            {comment.author.image ? (
              <Image
                src={comment.author.image}
                alt={comment.author.name}
                width={40}
                height={40}
                className="rounded-full"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#00f0ff] to-[#0099cc] flex items-center justify-center">
                <User className="w-5 h-5 text-white" />
              </div>
            )}
          </div>

          <div className="flex-1 bg-gray-900/50 rounded-lg p-3 border border-gray-800">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-white">{comment.author.name}</span>
                {comment.author.role === 'BARBER' && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-[#00f0ff]/20 text-[#00f0ff]">
                    Barbero
                  </span>
                )}
              </div>
              <span className="text-xs text-gray-500">
                {formatDistanceToNow(new Date(comment.createdAt), { 
                  addSuffix: true,
                  locale: es 
                })}
              </span>
            </div>

            <p className="text-gray-300 text-sm whitespace-pre-wrap">{comment.content}</p>

            <div className="flex items-center gap-3 mt-2">
              {!isReply && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setReplyingTo(comment.id)}
                  className="text-gray-400 hover:text-[#00f0ff] h-7 px-2 text-xs"
                >
                  <Reply className="w-3 h-3 mr-1" />
                  Responder
                </Button>
              )}

              {canDelete && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDeleteComment(comment.id)}
                  className="text-gray-400 hover:text-red-500 h-7 px-2 text-xs"
                >
                  <Trash2 className="w-3 h-3 mr-1" />
                  Eliminar
                </Button>
              )}
            </div>

            {replyingTo === comment.id && (
              <div className="mt-3 flex gap-2">
                <Textarea
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  placeholder="Escribe tu respuesta..."
                  className="bg-black border-gray-700 text-white text-sm resize-none"
                  rows={2}
                  maxLength={1000}
                />
                <div className="flex flex-col gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleAddReply(comment.id)}
                    disabled={loading || !replyContent.trim()}
                    className="bg-[#00f0ff] hover:bg-[#00d0df] text-black h-8 w-8 p-0"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setReplyingTo(null);
                      setReplyContent('');
                    }}
                    className="text-gray-400 h-8 w-8 p-0"
                  >
                    ✕
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {comment.replies && comment.replies.length > 0 && (
          <div className="mt-2">
            {comment.replies.map((reply) => (
              <CommentItem key={reply.id} comment={reply} isReply />
            ))}
          </div>
        )}
      </div>
    );
  };

  const totalComments = comments.length + comments.reduce((sum, c) => sum + (c.replies?.length || 0), 0);

  return (
    <div className="border-t border-gray-800 pt-4">
      <Button
        variant="ghost"
        onClick={() => setShowComments(!showComments)}
        className="w-full text-gray-400 hover:text-white mb-4"
      >
        <MessageCircle className="w-5 h-5 mr-2" />
        {showComments ? 'Ocultar' : 'Ver'} comentarios ({totalComments || initialCommentCount})
      </Button>

      {showComments && (
        <>
          {session ? (
            <div className="mb-6 flex gap-3">
              <div className="flex-shrink-0">
                {session.user.image ? (
                  <Image
                    src={session.user.image}
                    alt={session.user.name || 'User'}
                    width={40}
                    height={40}
                    className="rounded-full"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#00f0ff] to-[#0099cc] flex items-center justify-center">
                    <User className="w-5 h-5 text-white" />
                  </div>
                )}
              </div>
              <div className="flex-1 flex gap-2">
                <Textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Escribe un comentario..."
                  className="bg-gray-900/50 border-gray-800 text-white resize-none"
                  rows={3}
                  maxLength={1000}
                />
                <Button
                  onClick={handleAddComment}
                  disabled={loading || !newComment.trim()}
                  className="bg-gradient-to-r from-[#00f0ff] to-[#0099cc] hover:shadow-[0_0_20px_rgba(0,240,255,0.5)] text-white h-12 w-12 p-0"
                >
                  <Send className="w-5 h-5" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="mb-6 text-center p-4 bg-gray-900/50 rounded-lg border border-gray-800">
              <p className="text-gray-400">Inicia sesión para comentar</p>
            </div>
          )}

          {loadingComments ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#00f0ff] mx-auto"></div>
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-8">
              <MessageCircle className="w-12 h-12 text-gray-600 mx-auto mb-2" />
              <p className="text-gray-500">No hay comentarios aún</p>
              <p className="text-gray-600 text-sm">Sé el primero en comentar</p>
            </div>
          ) : (
            <div>
              {comments.map((comment) => (
                <CommentItem key={comment.id} comment={comment} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
