'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { DashboardNavbar } from '@/components/dashboard/navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Star, MessageSquare, User, Calendar, TrendingUp, ArrowLeft, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { enUS } from 'date-fns/locale';
import Image from 'next/image';
import Link from 'next/link';
import { useI18n } from '@/lib/i18n/i18n-context';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  adminResponse: string | null;
  client: {
    id: string;
    name: string;
    image: string | null;
  };
  appointment: {
    service: {
      name: string;
    };
  };
}

export default function BarberReviewsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { t } = useI18n();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    average: 0,
    total: 0,
    distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
  });

  const calculateStats = useCallback((reviewsData: Review[]) => {
    if (reviewsData.length === 0) return;

    const total = reviewsData.length;
    const sum = reviewsData.reduce((acc, r) => acc + r.rating, 0);
    const average = sum / total;

    const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviewsData.forEach((r) => {
      distribution[r.rating as keyof typeof distribution]++;
    });

    setStats({ average, total, distribution });
  }, []);

  const fetchReviews = useCallback(async () => {
    if (!session?.user?.barberId) return;

    try {
      const res = await fetch(`/api/reviews?barberId=${session.user.barberId}`);
      if (res.ok) {
        const data = await res.json();
        setReviews(data);
        calculateStats(data);
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
      toast.error(t('messages.error.loadReviews'));
    } finally {
      setLoading(false);
    }
  }, [session?.user?.barberId, calculateStats, t]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth');
      return;
    }

    if ((session?.user?.role !== 'BARBER' && session?.user?.role !== 'STYLIST') || !session.user.barberId) {
      router.push('/dashboard');
      return;
    }

    fetchReviews();
  }, [status, session, router, fetchReviews]);

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${star <= rating ? 'fill-yellow-500 text-yellow-500' : 'text-gray-600'}`}
          />
        ))}
      </div>
    );
  };

  if (loading || status === 'loading') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-cyan-500">Loading reviews...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black pb-24">
      <DashboardNavbar />

      <main className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Link href="/dashboard/barbero">
              <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">
                <span className="text-[#ffd700]">{t('barber.myReviews')}</span>
              </h1>
              <p className="text-gray-400">{t('barber.clientOpinions')}</p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-gradient-to-br from-yellow-500/20 to-yellow-600/20 border-yellow-500/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-gray-400">{t('reviews.averageRating')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <Star className="w-8 h-8 text-yellow-500 fill-yellow-500" />
                <span className="text-4xl font-bold text-yellow-500">
                  {stats.average > 0 ? stats.average.toFixed(1) : '0.0'}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-gray-400">{t('reviews.totalReviews')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-[#00f0ff]">{stats.total}</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500/20 to-green-600/20 border-green-500/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-gray-400">{t('reviews.fiveStars')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-6 h-6 text-green-500" />
                <span className="text-4xl font-bold text-green-500">{stats.distribution[5]}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-gray-400">{t('reviews.fourPlusStars')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-cyan-500">{stats.distribution[4] + stats.distribution[5]}</div>
              <p className="text-xs text-gray-500 mt-1">
                {stats.total > 0
                  ? Math.round(((stats.distribution[4] + stats.distribution[5]) / stats.total) * 100)
                  : 0}
                % {t('reviews.positive')}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Distribution Chart */}
        <Card className="bg-gray-900 border-gray-800 mb-8">
          <CardHeader>
            <CardTitle className="text-white">{t('reviews.distribution')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[5, 4, 3, 2, 1].map((stars) => (
                <div key={stars} className="flex items-center gap-3">
                  <div className="flex items-center gap-1 w-20">
                    <span className="text-sm text-gray-400">{stars}</span>
                    <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                  </div>
                  <div className="flex-1 h-6 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-yellow-500 to-yellow-600 transition-all"
                      style={{
                        width:
                          stats.total > 0
                            ? `${(stats.distribution[stars as keyof typeof stats.distribution] / stats.total) * 100}%`
                            : '0%',
                      }}
                    />
                  </div>
                  <span className="text-sm text-gray-400 w-12 text-right">
                    {stats.distribution[stars as keyof typeof stats.distribution]}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Reviews List */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-white mb-4">{t('reviews.clientComments')}</h2>

          {reviews.length === 0 ? (
            <Card className="bg-gray-900 border-gray-800">
              <CardContent className="py-12 text-center">
                <MessageSquare className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400 text-lg">{t('reviews.noReviewsYet')}</p>
                <p className="text-gray-500 text-sm mt-2">{t('reviews.clientsCanLeaveReviews')}</p>
              </CardContent>
            </Card>
          ) : (
            reviews.map((review) => (
              <Card
                key={review.id}
                className="bg-gray-900 border-gray-800 hover:border-cyan-500/50 transition-colors"
              >
                <CardContent className="p-6">
                  {/* Header */}
                  <div className="flex items-start gap-4 mb-4">
                    {/* Client Avatar */}
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center overflow-hidden flex-shrink-0">
                      {review.client.image ? (
                        <Image
                          src={review.client.image}
                          alt={review.client.name}
                          width={48}
                          height={48}
                          className="object-cover"
                        />
                      ) : (
                        <User className="w-6 h-6 text-white" />
                      )}
                    </div>

                    {/* Client Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="text-white font-semibold">{review.client.name}</p>
                          <p className="text-sm text-gray-400">{review.appointment?.service?.name || 'Service'}</p>
                        </div>
                        <div className="flex items-center gap-2">{renderStars(review.rating)}</div>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Calendar className="w-3 h-3" />
                        {format(new Date(review.createdAt), 'MMM d, yyyy', { locale: enUS })}
                      </div>
                    </div>
                  </div>

                  {/* Comment */}
                  {review.comment && (
                    <Collapsible>
                      <div className="bg-gray-800 rounded-lg">
                        <CollapsibleTrigger asChild>
                          <button
                            type="button"
                            className="w-full flex items-center justify-between gap-3 p-4 text-left [&[data-state=open]>svg]:rotate-180"
                            aria-label="Toggle comment"
                          >
                            <span className="min-w-0 text-gray-300">
                              <span className="font-semibold">Comment:</span>{' '}
                              <span className="text-gray-400 truncate inline-block align-bottom max-w-[70ch]">
                                {review.comment}
                              </span>
                            </span>
                            <ChevronDown className="h-4 w-4 shrink-0 text-gray-400 transition-transform duration-200" />
                          </button>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="px-4 pb-4">
                            <p className="text-gray-300 whitespace-pre-line">{review.comment}</p>
                          </div>
                        </CollapsibleContent>
                      </div>
                    </Collapsible>
                  )}

                  {/* Admin Response */}
                  {review.adminResponse && (
                    <div className="mt-4 bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <MessageSquare className="w-4 h-4 text-cyan-500" />
                        <span className="text-sm font-semibold text-cyan-500">Team Response</span>
                      </div>
                      <p className="text-gray-300 text-sm">{review.adminResponse}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
