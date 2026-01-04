'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { DashboardNavbar } from '@/components/dashboard/navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

type DeletionLog = {
  id: string;
  reviewId: string;
  appointmentId: string;
  rating: number;
  comment: string | null;
  reason: string;
  googleReviewId: string | null;
  reviewCreatedAt: string;
  deletedAt: string;
  admin: { id: string; name: string };
  barber: { id: string; name: string };
  client: { id: string; name: string };
};

export default function AdminReviewDeletionsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<DeletionLog[]>([]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth');
      return;
    }

    if (session?.user?.role && session.user.role !== 'ADMIN') {
      router.push('/dashboard');
      return;
    }
  }, [router, session?.user?.role, status]);

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/admin/reviews/deletions?limit=100');
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data?.error || 'Failed to fetch deletion history');
        }
        const data = await res.json();
        setLogs(Array.isArray(data?.logs) ? data.logs : []);
      } catch (e) {
        console.error(e);
        toast.error('Failed to load deletion history');
      } finally {
        setLoading(false);
      }
    };

    if (session?.user?.role === 'ADMIN') {
      run();
    }
  }, [session?.user?.role]);

  return (
    <div className="min-h-screen bg-black pb-24">
      <DashboardNavbar />

      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-6 flex items-center gap-3">
          <Button
            onClick={() => router.push('/dashboard/admin/reviews')}
            variant="outline"
            size="icon"
            className="border-gray-700 text-gray-300 hover:bg-gray-800 active:bg-gray-800 active:text-gray-300"
            aria-label="Back"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-red-500" />
              Review Deletion History
            </h1>
            <p className="text-sm text-gray-400">Internal audit log (ADMIN only)</p>
          </div>
        </div>

        {loading || status === 'loading' ? (
          <div className="text-cyan-500">Loading...</div>
        ) : logs.length === 0 ? (
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="py-10 text-center text-gray-400">
              No deletions logged yet
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {logs.map((log) => (
              <Card key={log.id} className="bg-gray-900 border-gray-800">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-gray-200 flex items-center justify-between">
                    <span>
                      {log.rating}★ — {log.client.name} → {log.barber.name}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(log.deletedAt).toLocaleString('en-US')}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm">
                  <div className="text-gray-300">
                    <span className="text-gray-400">Reason:</span> {log.reason}
                  </div>
                  {log.comment ? (
                    <div className="mt-2 text-gray-300">
                      <span className="text-gray-400">Comment:</span> “{log.comment}”
                    </div>
                  ) : null}
                  <div className="mt-2 text-xs text-gray-500">
                    Deleted by {log.admin.name} • Review ID {log.reviewId}
                    {log.googleReviewId ? ` • Google ID ${log.googleReviewId}` : ''}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
