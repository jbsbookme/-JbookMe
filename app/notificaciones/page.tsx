'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ArrowLeft, Bell } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

import { Button } from '@/components/ui/button';
import { HistoryBackButton } from '@/components/layout/history-back-button';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  link?: string;
  isRead: boolean;
  createdAt: string;
}

export default function NotificacionesPage() {
  const router = useRouter();
  const { data: session, status } = useSession() || {};

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth');
      return;
    }

    if (status === 'authenticated') {
      void fetchNotifications();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/notifications');
      if (!res.ok) {
        setNotifications([]);
        setUnreadCount(0);
        return;
      }

      const data = await res.json();
      setNotifications(Array.isArray(data.notifications) ? data.notifications : []);
      setUnreadCount(typeof data.unreadCount === 'number' ? data.unreadCount : 0);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      setNotifications([]);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId?: string) => {
    try {
      const res = await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notificationId,
          markAllAsRead: !notificationId,
        }),
      });

      if (res.ok) {
        await fetchNotifications();
      }
    } catch (error) {
      console.error('Error marking notifications as read:', error);
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-gray-400">Loading…</div>
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="min-h-screen bg-black pb-24">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <HistoryBackButton
          fallbackHref="/menu"
          variant="ghost"
          size="icon"
          aria-label="Back"
          className="mb-4 text-gray-400 hover:text-white hover:bg-gray-800/50"
        >
          <ArrowLeft className="w-5 h-5" />
        </HistoryBackButton>

        <div className="flex items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#00f0ff]/20 flex items-center justify-center">
              <Bell className="w-5 h-5 text-[#00f0ff]" />
            </div>
            <div>
              <h1 className="text-white text-xl font-semibold">Notifications</h1>
              <p className="text-gray-400 text-sm">
                {unreadCount > 0
                  ? `${unreadCount} unread`
                  : 'All caught up'}
              </p>
            </div>
          </div>

          {unreadCount > 0 && (
            <Button
              variant="ghost"
              onClick={() => markAsRead()}
              className="text-[#00f0ff] hover:bg-transparent"
            >
              Mark all as read
            </Button>
          )}
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
          {loading ? (
            <div className="p-6 text-center text-gray-400">Loading…</div>
          ) : notifications.length === 0 ? (
            <div className="p-10 text-center text-gray-400">
              <Bell className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>You don’t have any notifications yet</p>
            </div>
          ) : (
            notifications.map((notification) => {
              const row = (
                <div
                  className={`p-4 border-b border-gray-800 cursor-pointer transition-colors ${
                    notification.isRead
                      ? 'hover:bg-gray-800/50'
                      : 'bg-[#00f0ff]/5 hover:bg-[#00f0ff]/10'
                  }`}
                  onClick={() => {
                    if (!notification.isRead) {
                      void markAsRead(notification.id);
                    }
                  }}
                >
                  <div className="flex items-start gap-2">
                    {!notification.isRead && (
                      <div className="w-2 h-2 rounded-full bg-[#00f0ff] mt-2 flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium text-sm">
                        {notification.title}
                      </p>
                      <p className="text-gray-400 text-xs mt-1">
                        {notification.message}
                      </p>
                      <p className="text-gray-500 text-xs mt-1">
                        {formatDistanceToNow(new Date(notification.createdAt), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              );

              if (notification.link) {
                return (
                  <Link
                    key={notification.id}
                    href={notification.link}
                    className="block"
                    onClick={() => {
                      if (!notification.isRead) {
                        void markAsRead(notification.id);
                      }
                    }}
                  >
                    {row}
                  </Link>
                );
              }

              return <div key={notification.id}>{row}</div>;
            })
          )}
        </div>
      </div>
    </div>
  );
}
