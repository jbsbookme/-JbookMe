'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Star, Send, MessageSquare, User, ArrowLeft, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { enUS, es } from 'date-fns/locale';
import Image from 'next/image';
import { useI18n } from '@/lib/i18n/i18n-context';

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  adminResponse: string | null;
  adminRespondedAt: string | null;
  client: {
    id: string;
    name: string;
    email: string;
    image: string | null;
  };
  barber: {
    id: string;
    user: {
      name: string;
    };
  };
  appointment: {
    service: {
      name: string;
    };
  };
}

export default function AdminReviewsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { t, language } = useI18n();
  const dateLocale = language === 'es' ? es : enUS;
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [responseText, setResponseText] = useState<{ [key: string]: string }>({});
  const [isEditingResponse, setIsEditingResponse] = useState<{ [key: string]: boolean }>({});
  const [stats, setStats] = useState({
    average: 0,
    total: 0,
    distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
  });

  const calculateStats = (reviewsData: Review[]) => {
    if (reviewsData.length === 0) return;

    const total = reviewsData.length;
    const sum = reviewsData.reduce((acc, r) => acc + r.rating, 0);
    const average = sum / total;

    const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviewsData.forEach(r => {
      distribution[r.rating as keyof typeof distribution]++;
    });

    setStats({ average, total, distribution });
  };

  const fetchReviews = useCallback(async () => {
    try {
      const res = await fetch('/api/reviews?limit=50');
      if (res.ok) {
        const data = await res.json();
        setReviews(data);
        calculateStats(data);
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
      toast.error(t('messages.error.general'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth');
      return;
    }

    if (session?.user?.role !== 'ADMIN') {
      router.push('/dashboard');
      return;
    }

    fetchReviews();
  }, [fetchReviews, router, session, status]);

  const handleRespond = async (reviewId: string) => {
    const response = responseText[reviewId]?.trim();
    
    if (!response) {
      toast.error(t('admin.reviewsPage.writeResponse'));
      return;
    }

    try {
      const res = await fetch(`/api/reviews/${reviewId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminResponse: response })
      });

      if (res.ok) {
        toast.success(t('admin.reviewsPage.responseSent'));
        setResponseText(prev => ({ ...prev, [reviewId]: '' }));
        setIsEditingResponse(prev => ({ ...prev, [reviewId]: false }));
        fetchReviews();
      } else {
        const data = await res.json();
        toast.error(data.error || t('admin.reviewsPage.responseSendError'));
      }
    } catch (error) {
      console.error('Error responding to review:', error);
      toast.error(t('admin.reviewsPage.responseSendError'));
    }
  };

  const handleDeleteResponse = async (reviewId: string) => {
    if (!window.confirm(t('admin.reviewsPage.confirmDeleteResponse'))) return;

    try {
      const res = await fetch(`/api/reviews/${reviewId}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success(t('admin.reviewsPage.responseDeleted'));
        setResponseText(prev => ({ ...prev, [reviewId]: '' }));
        setIsEditingResponse(prev => ({ ...prev, [reviewId]: false }));
        fetchReviews();
      } else {
        const data = await res.json();
        toast.error(data.error || t('admin.reviewsPage.responseDeleteError'));
      }
    } catch (error) {
      console.error('Error deleting response:', error);
      toast.error(t('admin.reviewsPage.responseDeleteError'));
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    const confirmed = window.confirm(
      t('admin.reviewsPage.confirmDeleteReview')
    );
    if (!confirmed) return;

    const reason = window.prompt(t('admin.reviewsPage.promptDeletionReason')) || '';

    try {
      const res = await fetch(`/api/reviews/${reviewId}/hard-delete`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });

      if (res.ok) {
        toast.success(t('admin.reviewsPage.reviewDeleted'));
        fetchReviews();
      } else {
        const data = await res.json();
        toast.error(data.error || t('admin.reviewsPage.reviewDeleteError'));
      }
    } catch (error) {
      console.error('Error deleting review:', error);
      toast.error(t('admin.reviewsPage.reviewDeleteError'));
    }
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${
              star <= rating
                ? 'fill-yellow-500 text-yellow-500'
                : 'text-gray-600'
            }`}
          />
        ))}
      </div>
    );
  };

  if (loading || status === 'loading') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-cyan-500">{t('admin.reviewsPage.loadingReviews')}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black pb-24">

      <main className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Back Button */}
        <div className="mb-6">
          <Button
            onClick={() => router.push('/dashboard/admin')}
            variant="outline"
            size="icon"
            className="border-gray-700 text-gray-300 hover:bg-gray-800 active:bg-gray-800 active:text-gray-300"
            aria-label={t('admin.reviewsPage.backToPanelAria')}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </div>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            {t('admin.reviewsPage.titleReviews')}{' '}
            <span className="text-[#ffd700]">{t('admin.reviewsPage.titleManagement')}</span>
          </h1>
          <p className="text-gray-400">
            {t('admin.reviewsPage.subtitle')}
          </p>

          <div className="mt-4">
            <Button
              onClick={() => router.push('/dashboard/admin/reviews-deletions')}
              variant="outline"
              className="border-gray-700 text-gray-300 hover:bg-gray-800"
            >
              {t('admin.reviewsPage.viewDeletionHistory')}
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-gray-400">Average</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Star className="w-6 h-6 text-yellow-500 fill-yellow-500" />
                <span className="text-3xl font-bold text-yellow-500">
                  {stats.average > 0 ? stats.average.toFixed(1) : '0.0'}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-gray-400">Total</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-[#00f0ff]">
                {stats.total}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-gray-400">5 Stars</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-500">
                {stats.distribution[5]}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-gray-400">1-2 Stars</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-500">
                {stats.distribution[1] + stats.distribution[2]}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Reviews List */}
        <div className="space-y-3">
          {reviews.length === 0 ? (
            <Card className="bg-gray-900 border-gray-800">
              <CardContent className="py-12 text-center">
                <MessageSquare className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">No reviews yet</p>
              </CardContent>
            </Card>
          ) : (
            reviews.map((review) => (
              <Card key={review.id} className="bg-gray-900 border-gray-800">
                <CardContent className="p-4">
                  {/* Header */}
                  <div className="flex items-start gap-3 mb-3">
                    {/* Client Avatar */}
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0 ${
                        review.client.image ? 'bg-transparent' : 'bg-gradient-to-br from-cyan-500 to-purple-500'
                      }`}
                    >
                      {review.client.image ? (
                        <Image
                          src={review.client.image}
                          alt={review.client.name}
                          width={40}
                          height={40}
                          className="object-cover"
                        />
                      ) : (
                        <User className="w-5 h-5 text-white" />
                      )}
                    </div>

                    {/* Client Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <div>
                          <p className="text-white font-semibold text-sm">{review.client.name}</p>
                          <p className="text-xs text-gray-400">
                            {review.barber.user.name}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {renderStars(review.rating)}
                          <span className="text-xs text-gray-500 ml-1">
                            {format(new Date(review.createdAt), 'MMM d, yyyy', { locale: dateLocale })}
                          </span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7 border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
                            aria-label="Delete review"
                            onClick={() => handleDeleteReview(review.id)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Comment */}
                  {review.comment && (
                    <div className="bg-gray-800 rounded-lg p-3 mb-3">
                      <p className="text-gray-300 text-sm">{review.comment}</p>
                    </div>
                  )}

                  {/* Admin Response */}
                  {review.adminResponse ? (
                    <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <MessageSquare className="w-3 h-3 text-cyan-500" />
                          <span className="text-xs font-semibold text-cyan-500">Team Response</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">
                            {review.adminRespondedAt
                              ? format(new Date(review.adminRespondedAt), 'MMM d, yyyy', { locale: dateLocale })
                              : format(new Date(review.createdAt), 'MMM d, yyyy', { locale: dateLocale })}
                          </span>
                          {!isEditingResponse[review.id] && (
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-7 w-7 border-gray-700 text-gray-300 hover:bg-gray-800"
                                aria-label="Edit response"
                                onClick={() => {
                                  setResponseText(prev => ({ ...prev, [review.id]: review.adminResponse || '' }));
                                  setIsEditingResponse(prev => ({ ...prev, [review.id]: true }));
                                }}
                              >
                                <Pencil className="w-3 h-3" />
                              </Button>
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-7 w-7 border-gray-700 text-gray-300 hover:bg-gray-800"
                                aria-label="Delete response"
                                onClick={() => handleDeleteResponse(review.id)}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>

                      {isEditingResponse[review.id] ? (
                        <div className="space-y-2">
                          <Textarea
                            placeholder="Write a response..."
                            value={responseText[review.id] || ''}
                            onChange={(e) =>
                              setResponseText((prev) => ({ ...prev, [review.id]: e.target.value }))
                            }
                            className="bg-gray-800 border-gray-700 text-white"
                          />
                          <div className="flex gap-2">
                            <Button
                              onClick={() => handleRespond(review.id)}
                              size="sm"
                              className="flex-1 bg-cyan-600 hover:bg-cyan-700"
                            >
                              <Send className="w-3 h-3 mr-2" />
                              Save Response
                            </Button>
                            <Button
                              onClick={() => setIsEditingResponse(prev => ({ ...prev, [review.id]: false }))}
                              size="sm"
                              variant="outline"
                              className="border-gray-700 text-gray-300 hover:bg-gray-800"
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-gray-300 text-sm">{review.adminResponse}</p>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Textarea
                        placeholder="Write a response..."
                        value={responseText[review.id] || ''}
                        onChange={(e) =>
                          setResponseText((prev) => ({ ...prev, [review.id]: e.target.value }))
                        }
                        className="bg-gray-800 border-gray-700 text-white"
                      />
                      <Button
                        onClick={() => handleRespond(review.id)}
                        size="sm"
                        className="w-full bg-cyan-600 hover:bg-cyan-700"
                      >
                        <Send className="w-3 h-3 mr-2" />
                        Send Response
                      </Button>
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
