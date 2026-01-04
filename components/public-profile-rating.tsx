'use client';

import { useState } from 'react';
import { Star } from 'lucide-react';
import { QuickRatingStars } from '@/components/quick-rating-stars';

type Props = {
  barberId: string;
  initialAvgRating: number;
  initialReviewCount: number;
  hourlyRate?: number | null;
};

export function PublicProfileRating({
  barberId,
  initialAvgRating,
  initialReviewCount,
  hourlyRate,
}: Props) {
  const [avgRating, setAvgRating] = useState<number>(initialAvgRating);
  const [reviewCount, setReviewCount] = useState<number>(initialReviewCount);

  return (
    <div className="flex items-center gap-4 mb-6">
      <div className="flex items-center">
        <Star className="w-6 h-6 text-[#ffd700] fill-current mr-2" />
        <span className="text-2xl font-bold text-[#ffd700]">
          {avgRating > 0 ? avgRating.toFixed(1) : 'New'}
        </span>
      </div>

      <QuickRatingStars
        barberId={barberId}
        onSubmitted={(payload) => {
          if (typeof payload.avgRating === 'number') {
            setAvgRating(payload.avgRating);
          }
          setReviewCount((c) => c + 1);
        }}
      />

      <span className="text-gray-400">
        ({reviewCount} {reviewCount === 1 ? 'review' : 'reviews'})
      </span>

      {typeof hourlyRate === 'number' ? (
        <span className="text-[#00f0ff] font-semibold ml-auto">${hourlyRate}/hour</span>
      ) : null}
    </div>
  );
}
