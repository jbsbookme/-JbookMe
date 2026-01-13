'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  ArrowLeft,
  Bell,
  Calendar,
  CheckCircle2,
  Clock,
  MessageCircle,
  Star,
  Trash2,
  XCircle,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useI18n } from '@/lib/i18n/i18n-context';

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
  const { t } = useI18n();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const getTypeBadge = (type: string, isRead: boolean) => {
    const base = isRead
      ? 'bg-gray-800 text-gray-300 border-gray-700'
      : 'bg-[#00f0ff]/10 text-[#00f0ff] border-[#00f0ff]/30';

    const tUpper = (type || '').toUpperCase();

    if (tUpper.includes('REMINDER')) return { Icon: Clock, className: base };
    if (tUpper.includes('CONFIRMED')) return { Icon: CheckCircle2, className: base };
    if (tUpper.includes('CANCEL')) return { Icon: XCircle, className: base };
    if (tUpper.includes('REVIEW')) return { Icon: Star, className: base };
    if (tUpper.includes('MESSAGE')) return { Icon: MessageCircle, className: base };
    if (tUpper.includes('APPOINTMENT')) return { Icon: Calendar, className: base };

    return { Icon: Bell, className: base };
  };

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

  const deleteNotification = async (notificationId?: string) => {
    if (!notificationId) return;

    const ok = window.confirm(t('notifications.confirmDeleteOne'));
    if (!ok) return;

    try {
      const res = await fetch('/api/notifications', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId }),
      });

      if (res.ok) {
        await fetchNotifications();
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const deleteAllNotifications = async () => {
    const ok = window.confirm(t('notifications.confirmDeleteAll'));
    if (!ok) return;

    try {
      const res = await fetch('/api/notifications', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deleteAll: true }),
      });

      if (res.ok) {
        await fetchNotifications();
      }
    } catch (error) {
      console.error('Error deleting all notifications:', error);
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-gray-400">{t('notifications.loading')}</div>
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="min-h-screen bg-black pb-24">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-gradient-to-b from-black via-black/95 to-transparent backdrop-blur-sm border-b border-gray-800">
        <div className="max-w-3xl mx-auto px-4 py-5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <HistoryBackButton
                fallbackHref="/menu"
                variant="ghost"
                size="icon"
                aria-label={t('common.back')}
                className="text-gray-400 hover:text-white hover:bg-gray-800/50"
              >
                <ArrowLeft className="w-5 h-5" />
              </HistoryBackButton>
              <div className="w-10 h-10 rounded-full bg-[#00f0ff]/15 border border-[#00f0ff]/25 flex items-center justify-center flex-shrink-0">
                <Bell className="w-5 h-5 text-[#00f0ff]" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 min-w-0">
                  <h1 className="text-white text-xl font-semibold truncate">{t('notifications.title')}</h1>
                  {unreadCount > 0 ? (
                    <span className="text-xs font-semibold text-black bg-[#00f0ff] px-2 py-1 rounded-full">
                      {unreadCount}
                    </span>
                  ) : null}
                </div>
                <p className="text-gray-400 text-sm truncate">
                  {unreadCount > 0 ? `${unreadCount} ${t('notifications.unread')}` : t('notifications.allCaughtUp')}
                </p>
              </div>
            </div>

            {unreadCount > 0 && (
              <Button
                variant="outline"
                onClick={() => markAsRead()}
                className="border-gray-700 bg-black/20 text-[#00f0ff] hover:bg-gray-900/40"
              >
                {t('notifications.markAllRead')}
              </Button>
            )}

            {notifications.length > 0 && (
              <Button
                variant="outline"
                onClick={() => void deleteAllNotifications()}
                className="border-gray-700 bg-black/20 text-gray-200 hover:bg-gray-900/40"
              >
                {t('notifications.deleteAll')}
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6">
        {loading ? (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 text-center text-gray-400">
            {t('notifications.loading')}
          </div>
        ) : notifications.length === 0 ? (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-10 text-center text-gray-400">
            <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-gray-800 flex items-center justify-center">
              <Bell className="w-7 h-7 opacity-70" />
            </div>
            <p>{t('notifications.emptyState')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((notification) => {
              const { Icon, className: badgeClassName } = getTypeBadge(notification.type, notification.isRead);

              const itemClassName = `group bg-gray-900 border border-gray-800 rounded-2xl p-4 transition-colors ${
                notification.isRead
                  ? 'hover:bg-gray-900/70'
                  : 'bg-gradient-to-r from-[#00f0ff]/5 to-transparent hover:from-[#00f0ff]/10'
              }`;

              const body = (
                <div
                  className={itemClassName}
                  onClick={() => {
                    if (!notification.isRead) {
                      void markAsRead(notification.id);
                    }
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-xl border flex items-center justify-center flex-shrink-0 ${badgeClassName}`}>
                      <Icon className="w-5 h-5" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {!notification.isRead ? (
                          <span className="w-2 h-2 rounded-full bg-[#00f0ff] flex-shrink-0" />
                        ) : null}
                        <p className="text-white font-semibold text-sm truncate">{notification.title}</p>
                      </div>
                      <p className="text-gray-400 text-sm mt-1">{notification.message}</p>
                      <p className="text-gray-500 text-xs mt-2">
                        {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                      </p>
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        void deleteNotification(notification.id);
                      }}
                      aria-label={t('notifications.deleteOne')}
                      className="text-gray-400 hover:text-white hover:bg-gray-800/50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              );

              return (
                <div key={notification.id}>
                  {notification.link ? (
                    <Link
                      href={notification.link}
                      className="block"
                      onClick={() => {
                        if (!notification.isRead) {
                          void markAsRead(notification.id);
                        }
                      }}
                    >
                      {body}
                    </Link>
                  ) : (
                    body
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
