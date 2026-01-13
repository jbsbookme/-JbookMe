'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Star, ArrowLeft, MessageSquare, Calendar, User, Filter, TrendingUp, Award, BarChart3, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import Image from 'next/image';
import { useI18n } from '@/lib/i18n/i18n-context';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Review {
  id: string;
  rating: number;
  comment: string;
  createdAt: string;
  adminResponse?: string | null;
  adminRespondedAt?: string | null;
  client: {
    name: string;
    email: string;
    image?: string;
  };
  barber: {
    name: string;
  };
}

export default function AdminResenasPage() {
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  const { t, language } = useI18n();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [responseText, setResponseText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  // Filters
  const [ratingFilter, setRatingFilter] = useState<string>('ALL');
  const [dateFilter, setDateFilter] = useState<string>('ALL');
  const [barberFilter, setBarberFilter] = useState<string>('ALL');
  
  // Templates
  const [showTemplates, setShowTemplates] = useState(false);
  const responseTemplates = [
    { id: 1, name: t('admin.reviewsPage.templates.generalThanks.name'), text: t('admin.reviewsPage.templates.generalThanks.text') },
    { id: 2, name: t('admin.reviewsPage.templates.positiveResponse.name'), text: t('admin.reviewsPage.templates.positiveResponse.text') },
    { id: 3, name: t('admin.reviewsPage.templates.apology.name'), text: t('admin.reviewsPage.templates.apology.text') },
    { id: 4, name: t('admin.reviewsPage.templates.firstVisit.name'), text: t('admin.reviewsPage.templates.firstVisit.text') },
  ];

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated' && session?.user?.role !== 'ADMIN') {
      router.push('/dashboard');
    } else if (status === 'authenticated') {
      fetchReviews();
    }
  }, [status, session, router]);

  const fetchReviews = async () => {
    try {
      const response = await fetch('/api/reviews');
      if (response.ok) {
        const data = await response.json();
        setReviews(data || []);
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
      toast.error(t('admin.reviewsPage.errorLoadingReviews'));
    } finally {
      setLoading(false);
    }
  };

  const openResponseDialog = (review: Review) => {
    setSelectedReview(review);
    setResponseText(review.adminResponse || '');
    setIsDialogOpen(true);
  };

  const handleSubmitResponse = async () => {
    if (!selectedReview || !responseText.trim()) {
      toast.error(t('admin.reviewsPage.writeResponse'));
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`/api/reviews/${selectedReview.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminResponse: responseText }),
      });

      if (response.ok) {
        toast.success(t('admin.reviewsPage.responsePublished'));
        setIsDialogOpen(false);
        setResponseText('');
        fetchReviews();
      } else {
        const error = await response.json();
        toast.error(error.error || t('admin.reviewsPage.responsePublishError'));
      }
    } catch (error) {
      console.error('Error submitting response:', error);
      toast.error(t('admin.reviewsPage.responsePublishError'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteResponse = async (reviewId: string) => {
    if (!window.confirm(t('admin.reviewsPage.confirmDeleteAdminResponse'))) return;

    try {
      const response = await fetch(`/api/reviews/${reviewId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success(t('admin.reviewsPage.responseDeletedSuccess'));
        fetchReviews();
      } else {
        const error = await response.json();
        toast.error(error.error || t('admin.reviewsPage.responseDeleteError'));
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
      const response = await fetch(`/api/reviews/${reviewId}/hard-delete`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });

      if (response.ok) {
        toast.success(t('admin.reviewsPage.reviewDeletedSuccess'));
        fetchReviews();
      } else {
        const error = await response.json();
        toast.error(error.error || t('admin.reviewsPage.reviewDeleteError'));
      }
    } catch (error) {
      console.error('Error deleting review:', error);
      toast.error(t('admin.reviewsPage.reviewDeleteError'));
    }
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-5 h-5 ${
              star <= rating
                ? 'fill-[#ffd700] text-[#ffd700]'
                : 'fill-gray-700 text-gray-700'
            }`}
          />
        ))}
      </div>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Filter reviews
  const filteredReviews = reviews.filter((review) => {
    // Rating filter
    if (ratingFilter !== 'ALL' && review.rating !== parseInt(ratingFilter)) {
      return false;
    }

    // Date filter
    if (dateFilter !== 'ALL') {
      const reviewDate = new Date(review.createdAt);
      const now = new Date();
      const daysDiff = Math.floor((now.getTime() - reviewDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (dateFilter === 'TODAY' && daysDiff > 0) return false;
      if (dateFilter === 'WEEK' && daysDiff > 7) return false;
      if (dateFilter === 'MONTH' && daysDiff > 30) return false;
      if (dateFilter === 'YEAR' && daysDiff > 365) return false;
    }

    // Barber filter
    if (barberFilter !== 'ALL' && review.barber.name !== barberFilter) {
      return false;
    }

    return true;
  });

  // Calculate detailed stats
  const detailedStats = {
    total: filteredReviews.length,
    average: filteredReviews.length > 0 
      ? filteredReviews.reduce((acc, r) => acc + r.rating, 0) / filteredReviews.length 
      : 0,
    responded: filteredReviews.filter(r => r.adminResponse).length,
    pending: filteredReviews.filter(r => !r.adminResponse).length,
    byRating: {
      5: filteredReviews.filter(r => r.rating === 5).length,
      4: filteredReviews.filter(r => r.rating === 4).length,
      3: filteredReviews.filter(r => r.rating === 3).length,
      2: filteredReviews.filter(r => r.rating === 2).length,
      1: filteredReviews.filter(r => r.rating === 1).length,
    },
  };

  // Get unique barbers for filter
  const uniqueBarbers = Array.from(new Set(reviews.map(r => r.barber.name)));

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a]">

      <main className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-6">
          <Button
            onClick={() => router.push('/dashboard/admin')}
            variant="outline"
            size="icon"
            className="border-gray-700 text-gray-300 hover:bg-gray-800 active:bg-gray-800 active:text-gray-300"
            aria-label="Back to Panel"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </div>

        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            Reviews <span className="text-[#00f0ff]">Management</span>
          </h1>
          <p className="text-gray-400">Respond to your customers&apos; reviews</p>
        </div>

        <div className="mb-6">
          <Button
            onClick={() => router.push('/dashboard/admin/reviews-deletions')}
            variant="outline"
            className="border-gray-700 text-gray-300 hover:bg-gray-800 active:bg-gray-800 active:text-gray-300"
          >
            View deletion history
          </Button>
        </div>

        {/* Detailed Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Total Reviews</p>
                  <p className="text-3xl font-bold text-white">{detailedStats.total}</p>
                </div>
                <BarChart3 className="w-8 h-8 text-[#00f0ff]" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Average</p>
                  <p className="text-3xl font-bold text-white">{detailedStats.average.toFixed(1)}</p>
                  <div className="flex mt-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-4 h-4 ${
                          star <= Math.round(detailedStats.average)
                            ? 'fill-[#ffd700] text-[#ffd700]'
                            : 'fill-gray-700 text-gray-700'
                        }`}
                      />
                    ))}
                  </div>
                </div>
                <Award className="w-8 h-8 text-[#ffd700]" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Responded</p>
                  <p className="text-3xl font-bold text-green-400">{detailedStats.responded}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {detailedStats.total > 0 ? ((detailedStats.responded / detailedStats.total) * 100).toFixed(0) : 0}% of total
                  </p>
                </div>
                <MessageSquare className="w-8 h-8 text-green-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Pending</p>
                  <p className="text-3xl font-bold text-orange-400">{detailedStats.pending}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Unanswered
                  </p>
                </div>
                <TrendingUp className="w-8 h-8 text-orange-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="bg-gray-900 border-gray-800 mb-6">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-400">Filters:</span>
              </div>

              <Select value={ratingFilter} onValueChange={setRatingFilter}>
                <SelectTrigger className="w-[200px] bg-[#0a0a0a] border-gray-700 text-white">
                  <SelectValue placeholder="Rating" />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a1a] border-gray-700">
                  <SelectItem value="ALL">All ratings</SelectItem>
                  <SelectItem value="5">⭐⭐⭐⭐⭐ (5)</SelectItem>
                  <SelectItem value="4">⭐⭐⭐⭐ (4)</SelectItem>
                  <SelectItem value="3">⭐⭐⭐ (3)</SelectItem>
                  <SelectItem value="2">⭐⭐ (2)</SelectItem>
                  <SelectItem value="1">⭐ (1)</SelectItem>
                </SelectContent>
              </Select>

              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="w-[160px] bg-[#0a0a0a] border-gray-700 text-white">
                  <SelectValue placeholder="Date" />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a1a] border-gray-700">
                  <SelectItem value="ALL">All dates</SelectItem>
                  <SelectItem value="TODAY">Today</SelectItem>
                  <SelectItem value="WEEK">Last week</SelectItem>
                  <SelectItem value="MONTH">Last month</SelectItem>
                  <SelectItem value="YEAR">Last year</SelectItem>
                </SelectContent>
              </Select>

              {uniqueBarbers.length > 1 && (
                <Select value={barberFilter} onValueChange={setBarberFilter}>
                  <SelectTrigger className="w-[180px] bg-[#0a0a0a] border-gray-700 text-white">
                    <SelectValue placeholder="Barber" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1a1a] border-gray-700">
                    <SelectItem value="ALL">All barbers</SelectItem>
                    {uniqueBarbers.map((barber) => (
                      <SelectItem key={barber} value={barber}>
                        {barber}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {(ratingFilter !== 'ALL' || dateFilter !== 'ALL' || barberFilter !== 'ALL') && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setRatingFilter('ALL');
                    setDateFilter('ALL');
                    setBarberFilter('ALL');
                  }}
                  className="text-gray-400 hover:text-white"
                >
                  Clear filters
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Reviews List */}
        {filteredReviews.length === 0 ? (
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="py-12 text-center">
              <MessageSquare className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 text-lg">
                {reviews.length === 0 ? 'No reviews yet' : 'No reviews match the filters'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredReviews.map((review) => (
              <Card
                key={review.id}
                className="bg-[#1a1a1a] border-gray-800 hover:border-[#00f0ff]/50 transition-all duration-300"
              >
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-start gap-4">
                      <div
                        className={`relative w-12 h-12 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0 ${
                          review.client.image
                            ? 'bg-transparent'
                            : 'bg-gradient-to-br from-[#00f0ff]/20 to-[#0099cc]/20'
                        }`}
                      >
                        {review.client.image ? (
                          <Image
                            src={review.client.image}
                            alt={review.client.name || 'User'}
                            fill
                            sizes="48px"
                            className="object-cover"
                          />
                        ) : (
                          <User className="w-6 h-6 text-[#00f0ff]/50" />
                        )}
                      </div>
                      <div>
                        <h3 className="font-semibold text-white">{review.client.name}</h3>
                        <p className="text-sm text-gray-400">Barber: {review.barber.name}</p>
                        <div className="flex items-center gap-3 mt-2">
                          {renderStars(review.rating)}
                          <span className="text-xs text-gray-500 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatDate(review.createdAt)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <Button
                      onClick={() => handleDeleteReview(review.id)}
                      variant="outline"
                      size="sm"
                      className="border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete review
                    </Button>
                  </div>

                  {review.comment && (
                    <div className="mb-4 pl-16">
                      <p className="text-gray-300 text-sm">&quot;{review.comment}&quot;</p>
                    </div>
                  )}

                  {/* Admin Response Section */}
                  {review.adminResponse ? (
                    <div className="mt-4 pl-16 border-l-2 border-[#00f0ff]/30">
                      <div className="pl-4 bg-[#00f0ff]/5 p-4 rounded-lg">
                        <div className="flex justify-between items-start mb-2">
                          <p className="text-xs font-semibold text-[#00f0ff]">
                            Administrator response
                          </p>
                          <div className="flex gap-2">
                            <Button
                              onClick={() => openResponseDialog(review)}
                              variant="outline"
                              size="sm"
                              className="border-gray-700 text-gray-300 hover:bg-gray-800 h-7 text-xs"
                            >
                              Edit
                            </Button>
                            <Button
                              onClick={() => handleDeleteResponse(review.id)}
                              variant="outline"
                              size="sm"
                              className="border-red-500 text-red-500 hover:bg-red-500 hover:text-white h-7 text-xs"
                            >
                              Delete
                            </Button>
                          </div>
                        </div>
                        <p className="text-gray-300 text-sm mb-2">{review.adminResponse}</p>
                        {review.adminRespondedAt && (
                          <p className="text-xs text-gray-500">
                            {formatDate(review.adminRespondedAt)}
                          </p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="mt-4 pl-16">
                      <Button
                        onClick={() => openResponseDialog(review)}
                        variant="outline"
                        className="border-[#00f0ff] text-[#00f0ff] hover:bg-[#00f0ff] hover:text-black"
                        size="sm"
                      >
                        <MessageSquare className="w-4 h-4 mr-2" />
                        Respond
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Response Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-[#1a1a1a] border-gray-800 text-white">
          <DialogHeader>
            <DialogTitle className="text-[#00f0ff]">
              {selectedReview?.adminResponse ? 'Edit response' : 'Respond to review'}
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Write your response to {selectedReview?.client.name}&apos;s review
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selectedReview && (
              <div className="bg-[#0a0a0a] p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  {renderStars(selectedReview.rating)}
                </div>
                {selectedReview.comment && (
                  <p className="text-gray-300 text-sm">&quot;{selectedReview.comment}&quot;</p>
                )}
              </div>
            )}

            <div>
              <div className="mb-3">
                <Button
                  onClick={() => setShowTemplates(!showTemplates)}
                  variant="outline"
                  size="sm"
                  className="border-[#00f0ff]/50 text-[#00f0ff] hover:bg-[#00f0ff]/10"
                >
                  {showTemplates ? 'Hide templates' : 'View templates'}
                </Button>
              </div>

              {showTemplates && (
                <div className="mb-3 space-y-2 p-3 bg-[#0a0a0a] rounded-lg border border-gray-700">
                  <p className="text-xs text-gray-400 mb-2">Response templates:</p>
                  {responseTemplates.map((template) => (
                    <Button
                      key={template.id}
                      onClick={() => {
                        setResponseText(template.text);
                        setShowTemplates(false);
                      }}
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start text-left text-sm text-gray-300 hover:bg-[#00f0ff]/10 hover:text-[#00f0ff]"
                    >
                      {template.name}
                    </Button>
                  ))}
                </div>
              )}

              <Textarea
                value={responseText}
                onChange={(e) => setResponseText(e.target.value)}
                placeholder="Write your response here..."
                className="bg-[#0a0a0a] border-gray-700 text-white min-h-[120px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => setIsDialogOpen(false)}
              variant="outline"
              className="border-gray-700 text-gray-300"
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmitResponse}
              className="bg-gradient-to-r from-[#00f0ff] to-[#0099cc] text-black hover:opacity-90"
              disabled={submitting || !responseText.trim()}
            >
              {submitting ? 'Publishing...' : 'Publish Response'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
