'use client'

import { useCallback, useEffect, useState } from 'react'
import { Star, ArrowLeft } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { format } from 'date-fns'
import { useI18n } from '@/lib/i18n/i18n-context'
import { HistoryBackButton } from '@/components/layout/history-back-button'

interface Review {
  id: string
  rating: number
  comment: string
  createdAt: string
  adminResponse?: string | null
  adminRespondedAt?: string | null
  client: {
    name: string
    email: string
    image?: string | null
  }
  barber: {
    name: string
  }
}

export default function ResenasPage() {
  const { t } = useI18n()
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    average: 0,
    total: 0,
    distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
  })

  const fetchReviews = useCallback(async () => {
    try {
      const res = await fetch('/api/reviews?limit=50')
      if (res.ok) {
        const data = await res.json()
        setReviews(data)
        calculateStats(data)
      }
    } catch (error) {
      console.error('Error fetching reviews:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchReviews()
  }, [fetchReviews])

  const calculateStats = (reviewsData: Review[]) => {
    if (reviewsData.length === 0) return

    const total = reviewsData.length
    const sum = reviewsData.reduce((acc, r) => acc + r.rating, 0)
    const average = sum / total

    const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
    reviewsData.forEach(r => {
      distribution[r.rating as keyof typeof distribution]++
    })

    setStats({ average, total, distribution })
  }

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${
              star <= rating
                ? 'fill-[#00f0ff] text-[#00f0ff]'
                : 'text-gray-600'
            }`}
          />
        ))}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-cyan-500">{t('reviews.loadingReviews')}</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black pb-24">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-gradient-to-b from-black via-black/95 to-transparent backdrop-blur-sm border-b border-gray-800">
        <div className="max-w-4xl mx-auto px-4 py-5">
          <div className="flex items-center gap-4 mb-3">
              <HistoryBackButton
                fallbackHref="/menu"
                variant="ghost"
                size="icon"
                className="text-gray-400 hover:text-[#00f0ff] hover:bg-transparent"
              >
                <ArrowLeft className="w-5 h-5" />
              </HistoryBackButton>
            <div>
              <h1 className="text-3xl font-bold text-white">{t('reviews.title')}</h1>
            </div>
          </div>
          <p className="text-gray-400">{t('reviews.whatClientsSay')}</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Stats Overview */}
        <Card className="bg-gray-900 border-gray-800 p-6 mb-8 rounded-2xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Average Rating */}
            <div className="text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-4 mb-4">
                <div className="text-5xl font-bold text-white">
                  {stats.average.toFixed(1)}
                </div>
                <div>
                  {renderStars(Math.round(stats.average))}
                  <p className="text-sm text-gray-400 mt-1">{stats.total} {t('reviews.reviewsCount')}</p>
                </div>
              </div>
            </div>

            {/* Rating Distribution */}
            <div className="space-y-2">
              {[5, 4, 3, 2, 1].map((rating) => {
                const count = stats.distribution[rating as keyof typeof stats.distribution]
                const percentage = stats.total > 0 ? (count / stats.total) * 100 : 0
                return (
                  <div key={rating} className="flex items-center gap-2">
                    <span className="text-sm text-gray-400 w-8">{rating}★</span>
                    <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#00f0ff]"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="text-sm text-gray-400 w-12 text-right">{count}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </Card>

        {/* Reviews List */}
        <div className="space-y-4">
          {reviews.length === 0 ? (
            <Card className="bg-gray-900 border-gray-800 p-8 text-center">
              <p className="text-gray-400">{t('reviews.noReviewsAvailable')}</p>
            </Card>
          ) : (
            reviews.map((review) => (
              <Card key={review.id} className="bg-gray-900 border-gray-800 p-6 rounded-2xl">
                <div className="flex items-start gap-4">
                  <Avatar className="w-12 h-12 bg-cyan-500">
                    <AvatarFallback className="bg-cyan-500 text-black font-semibold">
                      {review.client.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="text-white font-semibold">{review.client.name}</h3>
                        <p className="text-sm text-gray-400">
                          {t('reviews.barber')}: {review.barber.name}
                        </p>
                      </div>
                      <div className="text-right">
                        {renderStars(review.rating)}
                        <p className="text-xs text-gray-500 mt-1">
                          {format(new Date(review.createdAt), 'dd MMM yyyy')}
                        </p>
                      </div>
                    </div>
                    <p className="text-gray-300">{review.comment}</p>
                    
                    {/* Admin Response */}
                    {review.adminResponse && (
                      <div className="mt-4 pl-4 border-l-2 border-[#00f0ff]/30 bg-[#00f0ff]/5 p-4 rounded-r-lg">
                        <p className="text-xs font-semibold text-[#00f0ff] mb-2">
                          {t('reviews.teamResponse')}
                        </p>
                        <p className="text-gray-300 text-sm">{review.adminResponse}</p>
                        {review.adminRespondedAt && (
                          <p className="text-xs text-gray-500 mt-2">
                            {format(new Date(review.adminRespondedAt), 'dd MMM yyyy')}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
