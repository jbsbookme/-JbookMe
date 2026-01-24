'use client';

import { useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Star } from 'lucide-react';
import { toast } from 'sonner';
import { useI18n } from '@/lib/i18n/i18n-context';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

type Props = {
  barberId: string;
  onSubmitted?: (payload: { avgRating?: number }) => void;
};

export function QuickRatingStars({ barberId, onSubmitted }: Props) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { language, t } = useI18n();

  const [ignoreNextClick, setIgnoreNextClick] = useState(false);

  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [selectedRating, setSelectedRating] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pendingRating, setPendingRating] = useState<number | null>(null);
  const [comment, setComment] = useState('');

  const canRate = useMemo(() => {
    if (status !== 'authenticated') return false;
    const role = String(session?.user?.role || '').toUpperCase();
    return role === 'CLIENT' || role === 'ADMIN';
  }, [session?.user?.role, status]);

  const displayRating = hoverRating ?? selectedRating;

  const submitRating = async (rating: number, commentText?: string): Promise<boolean> => {
    if (submitting) return false;

    if (status === 'unauthenticated') {
      toast.error(t('reviews.loginToRate'));
      router.push('/auth');
      return false;
    }

    if (!canRate) {
      toast.error(t('reviews.clientsOnlyToRate'));
      return false;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/quick-rating', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ barberId, rating, comment: commentText }),
      });

      const data: unknown = await res.json().catch(() => ({}));
      const payload = data as {
        message?: string;
        error?: string;
        avgRating?: number;
        review?: {
          id: string;
          rating: number;
          comment?: string | null;
          adminResponse?: string | null;
          adminRespondedAt?: string | Date | null;
          createdAt?: string | Date;
          client?: { name?: string | null; image?: string | null } | null;
        };
      };

      if (!res.ok) {
        toast.error(payload.error || t('reviews.ratingSubmitFailed'));
        return false;
      }

      setSelectedRating(rating);
      toast.success(payload.message || t('reviews.ratingSubmitted'));
      onSubmitted?.({ avgRating: payload.avgRating });

      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('quick-rating:submitted', {
            detail: { avgRating: payload.avgRating, review: payload.review },
          })
        );
      }

      return true;
    } catch (error) {
      console.error('Error submitting rating:', error);
      toast.error(t('reviews.ratingNetworkError'));
      return false;
    } finally {
      setSubmitting(false);
      setHoverRating(null);
    }
  };

  const handleStarSelect = (ratingValue: number) => {
    if (submitting) return;

    if (status === 'unauthenticated') {
      toast.error(t('reviews.loginToRate'));
      router.push('/auth');
      return;
    }

    if (!canRate) {
      toast.error(t('reviews.clientsOnlyToRate'));
      return;
    }

    setPendingRating(ratingValue);
    setComment('');
    setDialogOpen(true);
  };

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center" onMouseLeave={() => setHoverRating(null)}>
        {Array.from({ length: 5 }).map((_, index) => {
          const ratingValue = index + 1;
          const active = (displayRating ?? 0) >= ratingValue;

          return (
            <button
              key={ratingValue}
              type="button"
              className={`p-1 ${submitting ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
              aria-label={
                language === 'es'
                  ? `Calificar ${ratingValue} estrella${ratingValue > 1 ? 's' : ''}`
                  : `Rate ${ratingValue} star${ratingValue > 1 ? 's' : ''}`
              }
              aria-disabled={!canRate || submitting}
              disabled={!canRate || submitting}
              onMouseEnter={() => setHoverRating(ratingValue)}
              onFocus={() => setHoverRating(ratingValue)}
              onPointerDown={(e) => {
                // iOS/WKWebView sometimes delays or drops click events on fast taps.
                // Using pointer down makes this feel instant and reliable.
                e.preventDefault();
                setIgnoreNextClick(true);
                handleStarSelect(ratingValue);
              }}
              onTouchStart={(e) => {
                // Extra fallback for environments where pointer events are flaky.
                e.preventDefault();
                setIgnoreNextClick(true);
                handleStarSelect(ratingValue);
              }}
              onClick={() => {
                if (ignoreNextClick) {
                  setIgnoreNextClick(false);
                  return;
                }
                handleStarSelect(ratingValue);
              }}
            >
              <Star
                className={
                  active
                    ? 'w-6 h-6 text-[#ffd700] fill-current'
                    : 'w-6 h-6 text-gray-600'
                }
              />
            </button>
          );
        })}
      </div>

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setPendingRating(null);
            setComment('');
          }
        }}
      >
        <DialogContent className="bg-[#0b0b0b] border border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">
              {language === 'es' ? 'Deja tu reseña' : 'Leave a review'}
            </DialogTitle>
            <DialogDescription className="text-gray-300">
              {language === 'es'
                ? `Tu calificación: ${pendingRating ?? ''} / 5`
                : `Your rating: ${pendingRating ?? ''} / 5`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <div className="flex items-center gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={`w-5 h-5 ${
                    i < (pendingRating ?? 0)
                      ? 'text-[#ffd700] fill-current'
                      : 'text-gray-600'
                  }`}
                />
              ))}
            </div>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={
                language === 'es'
                  ? 'Escribe tu comentario (requerido)'
                  : 'Write your comment (required)'
              }
              className="bg-black/40 border-white/10 text-white placeholder:text-gray-400"
              rows={4}
            />
            <div className="text-xs text-gray-400">
              {language === 'es'
                ? 'El comentario es obligatorio.'
                : 'A comment is required.'}
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              type="button"
              className="bg-[#00f0ff] text-black hover:bg-[#00d9e6]"
              disabled={submitting || !pendingRating || comment.trim().length === 0}
              onClick={() => {
                if (!pendingRating) return;
                const cleaned = comment.trim();
                void (async () => {
                  if (!cleaned) {
                    toast.error(
                      language === 'es'
                        ? 'Escribe un comentario para enviar tu reseña.'
                        : 'Please write a comment to submit your review.'
                    );
                    return;
                  }
                  const ok = await submitRating(pendingRating, cleaned);
                  if (ok) setDialogOpen(false);
                })();
              }}
            >
              {submitting
                ? language === 'es'
                  ? 'Enviando...'
                  : 'Submitting...'
                : language === 'es'
                  ? 'Enviar'
                  : 'Submit'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {status === 'authenticated' && !canRate ? (
        <span className="text-xs text-gray-500">{t('reviews.clientsOnlyLabel')}</span>
      ) : null}
    </div>
  );
}
