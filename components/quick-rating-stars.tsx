'use client';

import { useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Star } from 'lucide-react';
import { toast } from 'sonner';
import { useI18n } from '@/lib/i18n/i18n-context';

type Props = {
  barberId: string;
  onSubmitted?: (payload: { avgRating?: number }) => void;
};

export function QuickRatingStars({ barberId, onSubmitted }: Props) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { language, t } = useI18n();

  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [selectedRating, setSelectedRating] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const canRate = useMemo(() => {
    if (status !== 'authenticated') return false;
    return session?.user?.role === 'CLIENT';
  }, [session?.user?.role, status]);

  const displayRating = hoverRating ?? selectedRating;

  const submitRating = async (rating: number) => {
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

    setSubmitting(true);
    try {
      const res = await fetch('/api/quick-rating', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ barberId, rating }),
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
          createdAt?: string | Date;
          client?: { name?: string | null; image?: string | null } | null;
        };
      };

      if (!res.ok) {
        toast.error(payload.error || t('reviews.ratingSubmitFailed'));
        return;
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
    } catch (error) {
      console.error('Error submitting rating:', error);
      toast.error(t('reviews.ratingNetworkError'));
    } finally {
      setSubmitting(false);
      setHoverRating(null);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <div
        className="flex items-center"
        onMouseLeave={() => setHoverRating(null)}
      >
        {Array.from({ length: 5 }).map((_, index) => {
          const ratingValue = index + 1;
          const active = (displayRating ?? 0) >= ratingValue;

          return (
            <button
              key={ratingValue}
              type="button"
              className="p-1"
              aria-label={
                language === 'es'
                  ? `Calificar ${ratingValue} estrella${ratingValue > 1 ? 's' : ''}`
                  : `Rate ${ratingValue} star${ratingValue > 1 ? 's' : ''}`
              }
              disabled={!canRate || submitting}
              onMouseEnter={() => setHoverRating(ratingValue)}
              onFocus={() => setHoverRating(ratingValue)}
              onClick={() => submitRating(ratingValue)}
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

      {status === 'authenticated' && session?.user?.role !== 'CLIENT' ? (
        <span className="text-xs text-gray-500">{t('reviews.clientsOnlyLabel')}</span>
      ) : null}
    </div>
  );
}
