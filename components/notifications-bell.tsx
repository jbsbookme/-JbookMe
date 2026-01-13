'use client';

import { useState, useEffect, useRef } from 'react';
import { Bell } from 'lucide-react';
import { Button } from './ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from './ui/popover';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  link?: string;
  isRead: boolean;
  createdAt: string;
}

export function NotificationsBell() {
  const { data: session } = useSession() || {};
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  // Start baseline at mount time so we don't beep for old notifications,
  // but we DO beep for the first new one even if it arrives before the first poll.
  const lastNotifAtRef = useRef<number>(Date.now());

  const audioCtxRef = useRef<AudioContext | null>(null);
  const audioUnlockedRef = useRef(false);
  const pendingBeepRef = useRef(false);

  const unlockAudio = async () => {
    if (audioUnlockedRef.current) return;
    try {
      const AudioContextCtor =
        (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextCtor) return;
      const ctx: AudioContext = audioCtxRef.current ?? new AudioContextCtor();
      audioCtxRef.current = ctx;
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }

      // Tiny silent-ish tick to satisfy stricter autoplay policies on some mobile browsers.
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.value = 1;
      gain.gain.value = 0.0001;
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.start();
      oscillator.stop(ctx.currentTime + 0.02);

      if (ctx.state === 'running') {
        audioUnlockedRef.current = true;
      }

      if (pendingBeepRef.current) {
        pendingBeepRef.current = false;
        void playBeep();
      }
    } catch {
      // ignore
    }
  };

  const playBeep = async () => {
    try {
      if (!audioUnlockedRef.current) {
        pendingBeepRef.current = true;
        return;
      }

      const ctx = audioCtxRef.current;
      if (!ctx) return;
      if (ctx.state === 'suspended') {
        await ctx.resume().catch(() => null);
      }
      if (ctx.state !== 'running') {
        pendingBeepRef.current = true;
        return;
      }

      const beepOnce = (freq: number, startAt: number) => {
        const oscillator = ctx.createOscillator();
        const gain = ctx.createGain();

        oscillator.type = 'triangle';
        oscillator.frequency.setValueAtTime(freq, startAt);

        // Envelope to avoid clicks and make it audible.
        gain.gain.setValueAtTime(0.0001, startAt);
        gain.gain.exponentialRampToValueAtTime(0.18, startAt + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.18);

        oscillator.connect(gain);
        gain.connect(ctx.destination);

        oscillator.start(startAt);
        oscillator.stop(startAt + 0.2);
      };

      const t0 = ctx.currentTime;
      // Double beep (more noticeable)
      beepOnce(988, t0);
      beepOnce(1318, t0 + 0.22);
    } catch {
      // ignore
    }
  };

  const notifySystem = () => {
    try {
      if (
        typeof window !== 'undefined' &&
        'Notification' in window &&
        Notification.permission === 'granted' &&
        document.visibilityState !== 'visible'
      ) {
        new Notification('Nuevo mensaje', {
          body: 'Tienes un mensaje nuevo',
          icon: '/icon-192.png',
        });
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (session && open) {
      fetchNotifications();
    }
  }, [session, open]);

  // Unlock audio on first user gesture (required by browsers for sound).
  useEffect(() => {
    if (!session) return;
    if (typeof window === 'undefined') return;
    const handler = () => void unlockAudio();
    window.addEventListener('pointerdown', handler, { passive: true });
    window.addEventListener('touchstart', handler, { passive: true });
    window.addEventListener('mousedown', handler);
    window.addEventListener('keydown', handler);
    return () => {
      window.removeEventListener('pointerdown', handler);
      window.removeEventListener('touchstart', handler);
      window.removeEventListener('mousedown', handler);
      window.removeEventListener('keydown', handler);
    };
  }, [session]);

  // Poll for new notifications every 30 seconds
  useEffect(() => {
    if (!session) return;

    const fetchUnreadCount = async () => {
      try {
        const res = await fetch('/api/notifications');
        if (res.ok) {
          const data = await res.json();

          const nextUnread = typeof data?.unreadCount === 'number' ? data.unreadCount : 0;
          setUnreadCount(nextUnread);

          // Detect new notifications since last poll.
          const list: Notification[] = Array.isArray(data?.notifications)
            ? data.notifications
            : [];
          const maxAt = list.reduce((max: number, n: Notification) => {
            const t = new Date(n.createdAt).getTime();
            return Number.isFinite(t) && t > max ? t : max;
          }, 0);

          const since = lastNotifAtRef.current;
          const newOnes = list.filter((n) => new Date(n.createdAt).getTime() > since);
          lastNotifAtRef.current = Math.max(since, maxAt);

          const newMessages = newOnes.filter((n) => n.type === 'NEW_MESSAGE');
          if (newMessages.length > 0) {
            void playBeep();
            notifySystem();
          }

          // Keep a fresh cache so opening the popover is instant.
          setNotifications(list);
        }
      } catch (error) {
        console.error('Error fetching unread count:', error);
      }
    };

    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 10000); // Every 10 seconds (faster for beep)

    return () => clearInterval(interval);
  }, [session]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/notifications');
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
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
          markAllAsRead: !notificationId
        })
      });

      if (res.ok) {
        fetchNotifications();
      }
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead) {
      markAsRead(notification.id);
    }
    if (notification.link) {
      setOpen(false);
    }
  };

  if (!session) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => void unlockAudio()}
          className="relative hover:bg-transparent h-7 w-7 sm:h-8 sm:w-8 p-0"
        >
          <Bell className="w-4 h-4 sm:w-5 sm:h-5 text-[#00f0ff] drop-shadow-[0_0_12px_rgba(0,240,255,0.9)]" />
          {unreadCount > 0 && (
            <span className="absolute top-0 right-0 sm:-top-1 sm:-right-1 w-4 h-4 sm:w-5 sm:h-5 bg-red-500 rounded-full text-white text-[10px] sm:text-xs flex items-center justify-center font-bold animate-pulse">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 bg-gray-900 border-gray-800" align="end">
        <div className="p-4 border-b border-gray-800 flex items-center justify-between">
          <h3 className="text-white font-semibold">Notifications</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => markAsRead()}
              className="text-[#00f0ff] text-xs hover:bg-transparent"
            >
              Mark all as read
            </Button>
          )}
        </div>
        <div className="max-h-96 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center text-gray-400">
              Loading...
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              <Bell className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No notifications yet</p>
            </div>
          ) : (
            notifications.map((notification) => (
              <div
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                className={`p-4 border-b border-gray-800 cursor-pointer transition-colors ${
                  notification.isRead
                    ? 'hover:bg-gray-800/50'
                    : 'bg-[#00f0ff]/5 hover:bg-[#00f0ff]/10'
                }`}
              >
                {notification.link ? (
                  <Link href={notification.link} className="block">
                    <div className="flex items-start gap-2">
                      {!notification.isRead && (
                        <div className="w-2 h-2 rounded-full bg-[#00f0ff] mt-2 flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium text-sm">
                          {notification.title}
                        </p>
                        <p className="text-gray-400 text-xs mt-1 line-clamp-2">
                          {notification.message}
                        </p>
                        <p className="text-gray-500 text-xs mt-1">
                          {formatDistanceToNow(new Date(notification.createdAt), {
                            addSuffix: true
                          })}
                        </p>
                      </div>
                    </div>
                  </Link>
                ) : (
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
                          addSuffix: true
                        })}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
