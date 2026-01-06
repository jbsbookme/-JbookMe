'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import { DashboardNavbar } from '@/components/dashboard/navbar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Star, Send } from 'lucide-react';
import { toast } from 'sonner';

type Appointment = {
  id: string;
  barber: {
    id: string;
    user: {
      name: string | null;
    };
  };
  service: {
    name: string;
  };
};

export default function LeaveReviewPage() {
  const { status } = useSession();
  const router = useRouter();
  const params = useParams();
  const appointmentId = params?.id as string;

  const [loading, setLoading] = useState(false);
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState('');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  const fetchAppointment = useCallback(async () => {
    try {
      const response = await fetch(`/api/appointments/${appointmentId}`);
      const data = await response.json();

      if (!response.ok) {
        toast.error(data?.error || 'Appointment not found');
        router.push('/perfil');
        return;
      }

      setAppointment(data.appointment);
    } catch (error) {
      console.error('Error fetching appointment:', error);
      toast.error('Error loading appointment');
    }
  }, [appointmentId, router]);

  useEffect(() => {
    if (appointmentId) {
      fetchAppointment();
    }
  }, [appointmentId, fetchAppointment]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (rating === 0) {
      toast.error('Please select a rating');
      return;
    }

    if (!appointment) {
      toast.error('Error: appointment not found');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appointmentId,
          barberId: appointment.barber.id,
          rating,
          comment: comment || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error creating review');
      }

      toast.success('Review submitted successfully!');
      router.push('/perfil');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error creating review';
      console.error('Error creating review:', error);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading' || !appointment) {
    return (
      <div className="min-h-screen bg-black">
        <DashboardNavbar />
        <div className="flex items-center justify-center py-20">
          <p className="text-white">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black pb-20">
      <DashboardNavbar />

      <main className="container mx-auto px-4 py-10 max-w-2xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            Leave a <span className="text-[#00f0ff]">Review</span>
          </h1>
          <p className="text-gray-400">
            Share your experience with {appointment.barber?.user?.name || 'the barber'}
          </p>
        </div>

        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">Your feedback matters</CardTitle>
            <CardDescription className="text-gray-400">
              Service: {appointment.service?.name || 'N/A'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Star Rating */}
              <div className="space-y-3">
                <Label className="text-gray-300 text-lg">Rating *</Label>
                <div className="flex items-center justify-center gap-2 py-4">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoveredRating(star)}
                      onMouseLeave={() => setHoveredRating(0)}
                      className="transition-transform hover:scale-110 focus:outline-none"
                    >
                      <Star
                        className={`w-10 h-10 sm:w-12 sm:h-12 transition-colors ${
                          star <= (hoveredRating || rating)
                            ? 'text-[#00f0ff] fill-current'
                            : 'text-gray-600'
                        }`}
                      />
                    </button>
                  ))}
                </div>
                {rating > 0 && (
                  <p className="text-center text-[#00f0ff] font-semibold">
                    {rating === 1 && 'Very bad'}
                    {rating === 2 && 'Bad'}
                    {rating === 3 && 'Okay'}
                    {rating === 4 && 'Good'}
                    {rating === 5 && 'Excellent!'}
                  </p>
                )}
              </div>

              {/* Comment */}
              <div className="space-y-2">
                <Label htmlFor="comment" className="text-gray-300">
                  Comment (optional)
                </Label>
                <Textarea
                  id="comment"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={5}
                  placeholder="Tell us about your experience..."
                  className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 resize-none focus-visible:ring-[#00f0ff] focus-visible:ring-offset-0"
                />
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={loading || rating === 0}
                className="w-full bg-gradient-to-r from-[#00f0ff] to-[#0099cc] text-black hover:opacity-90 neon-glow text-lg py-6"
              >
                {loading ? (
                  'Sending...'
                ) : (
                  <>
                    <Send className="w-5 h-5 mr-2" />
                    Submit Review
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
