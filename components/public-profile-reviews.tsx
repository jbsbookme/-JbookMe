'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Star, User } from 'lucide-react';

type ReviewItem = {
  id: string;
  rating: number;
  comment?: string | null;
  createdAt: string; // ISO
  client?: {
    name?: string | null;
    image?: string | null;
  } | null;
};

type Props = {
  initialReviews: ReviewItem[];
};

type QuickRatingSubmittedDetail = {
  avgRating?: number;
  review?: {
    id: string;
    rating: number;
    comment?: string | null;
    createdAt?: string | Date;
    client?: {
      name?: string | null;
      image?: string | null;
    } | null;
  };
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function PublicProfileReviews({ initialReviews }: Props) {
  const [reviews, setReviews] = useState<ReviewItem[]>(initialReviews);
  const [isOpen, setIsOpen] = useState(false);

  const emptyState = useMemo(() => reviews.length === 0, [reviews.length]);

  useEffect(() => {
    const handler = (event: Event) => {
      const custom = event as CustomEvent<QuickRatingSubmittedDetail>;
      const detail = custom.detail;
      if (!detail?.review?.id || typeof detail.review.rating !== 'number') return;

      const createdAtRaw = detail.review.createdAt;
      const createdAt =
        typeof createdAtRaw === 'string'
          ? createdAtRaw
          : createdAtRaw instanceof Date
            ? createdAtRaw.toISOString()
            : new Date().toISOString();

      setReviews((current) => {
        if (current.some((r) => r.id === detail.review!.id)) return current;
        const next: ReviewItem = {
          id: detail.review!.id,
          rating: detail.review!.rating,
          comment: detail.review!.comment ?? null,
          createdAt,
          client: detail.review!.client ?? null,
        };
        return [next, ...current].slice(0, 10);
      });

      setIsOpen(true);
    };

    window.addEventListener('quick-rating:submitted', handler);
    return () => window.removeEventListener('quick-rating:submitted', handler);
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between gap-4 mb-6">
        <h2 className="text-3xl font-bold text-white">Reviews</h2>
        {emptyState ? null : (
          <Button
            type="button"
            variant="outline"
            className="border-gray-700 text-white hover:bg-[#0a0a0a] hover:text-[#00f0ff]"
            onClick={() => setIsOpen((v) => !v)}
          >
            {isOpen ? 'Hide reviews' : `Show reviews (${reviews.length})`}
          </Button>
        )}
      </div>
      {emptyState ? (
        <Card className="bg-[#1a1a1a] border-gray-800">
          <CardContent className="py-12 text-center">
            <Star className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">No reviews yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className={isOpen ? 'block' : 'hidden'}>
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            {reviews.map((review) => (
              <Card key={review.id} className="bg-[#1a1a1a] border-gray-800">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                      {review.client?.image ? (
                        <div className="relative w-12 h-12 rounded-full overflow-hidden">
                          <Image
                            src={review.client.image}
                            alt={review.client?.name || 'Client'}
                            fill
                            sizes="48px"
                            className="object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#00f0ff]/20 to-[#0099cc]/10 flex items-center justify-center">
                          <User className="w-6 h-6 text-[#00f0ff]" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <h4 className="text-white font-semibold">{review.client?.name || 'Client'}</h4>
                          <p className="text-gray-500 text-sm">{formatDate(review.createdAt)}</p>
                        </div>
                        <div className="flex items-center">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={`w-5 h-5 ${
                                i < review.rating ? 'text-[#ffd700] fill-current' : 'text-gray-600'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                      {review.comment ? <p className="text-gray-400">{review.comment}</p> : null}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
