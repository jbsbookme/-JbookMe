'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/use-toast';
import { Checkbox } from '@/components/ui/checkbox';
import Image from 'next/image';
import { MessageSquare, Send, Trash2, ArrowLeft, ListChecks } from 'lucide-react';

interface Message {
  id: string;
  senderId: string;
  recipientId: string;
  content: string;
  createdAt: string;
  isRead: boolean;
  sender?: {
    id: string;
    name: string | null;
    email: string | null;
    image?: string | null;
    role?: string | null;
  };
  recipient?: {
    id: string;
    name: string | null;
    email: string | null;
    image?: string | null;
    role?: string | null;
  };
}

interface User {
  id: string;
  name: string | null;
  email: string | null;
  role: string;
  image?: string | null;
}

type Thread = {
  otherId: string;
  otherName: string;
  otherEmail?: string | null;
  otherImage?: string | null;
  lastMessage?: Message;
  unreadCount: number;
};

function getInitials(name: string) {
  const cleaned = name.trim().replace(/\s+/g, ' ');
  if (!cleaned) return 'U';
  const parts = cleaned.split(' ').filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ''}${parts[parts.length - 1][0] ?? ''}`.toUpperCase();
}

export default function InboxPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [receivedMessages, setReceivedMessages] = useState<Message[]>([]);
  const [sentMessages, setSentMessages] = useState<Message[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [selectedRecipient, setSelectedRecipient] = useState<string>('');
  const [sending, setSending] = useState(false);
  const [activeThreadUserId, setActiveThreadUserId] = useState<string>('');
  const [draft, setDraft] = useState('');
  const [attachment, setAttachment] = useState<File | null>(null);
  const [selectedMessageId, setSelectedMessageId] = useState<string>('');
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedMessageIds, setSelectedMessageIds] = useState<string[]>([]);
  const [isDeleteSelectedOpen, setIsDeleteSelectedOpen] = useState(false);

  const bottomRef = useRef<HTMLDivElement | null>(null);
  const meId = session?.user?.id || '';

  // Start baseline at mount time so we don't beep for old messages,
  // but we DO beep for the first new one even if it arrives before the first poll.
  const lastReceivedAtRef = useRef<number>(Date.now());

  const audioCtxRef = useRef<AudioContext | null>(null);
  const audioUnlockedRef = useRef(false);
  const pendingIncomingBeepRef = useRef(false);

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

      // Tiny silent-ish tick to satisfy some autoplay policies.
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.value = 1;
      gain.gain.value = 0.0001;
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.start();
      oscillator.stop(ctx.currentTime + 0.02);

      audioUnlockedRef.current = true;

      // If a message arrived while audio was locked, play the queued beep now.
      if (pendingIncomingBeepRef.current) {
        pendingIncomingBeepRef.current = false;
        void playIncomingMessageSound();
      }
    } catch {
      // ignore
    }
  };

  const playIncomingMessageSound = async () => {
    try {
      // Don't attempt audio until we've had at least one user gesture.
      if (!audioUnlockedRef.current) {
        pendingIncomingBeepRef.current = true;
        return;
      }

      const ctx = audioCtxRef.current;
      if (!ctx) return;
      if (ctx.state === 'suspended') {
        await ctx.resume().catch(() => null);
      }

      const beepOnce = (freq: number, startAt: number) => {
        const oscillator = ctx.createOscillator();
        const gain = ctx.createGain();

        oscillator.type = 'triangle';
        oscillator.frequency.setValueAtTime(freq, startAt);

        gain.gain.setValueAtTime(0.0001, startAt);
        gain.gain.exponentialRampToValueAtTime(0.18, startAt + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.18);

        oscillator.connect(gain);
        gain.connect(ctx.destination);

        oscillator.start(startAt);
        oscillator.stop(startAt + 0.2);
      };

      const t0 = ctx.currentTime;
      beepOnce(988, t0);
      beepOnce(1318, t0 + 0.22);
    } catch {
      // Some browsers block autoplay audio without user gesture.
    }
  };

  const notifyIncomingMessage = (count: number, latest: Message | null) => {
    const senderName =
      (latest?.sender?.name && String(latest.sender.name).trim()) || 'Someone';

    toast({
      title: count > 1 ? 'New messages' : 'New message',
      description:
        count > 1
          ? `You received ${count} new messages.`
          : `You received a new message from ${senderName}.`,
    });

    // System notification (native browser Notification API) - only if already granted.
    // We only fire this when the tab is in the background, like WhatsApp/Instagram Web.
    try {
      if (
        typeof window !== 'undefined' &&
        'Notification' in window &&
        Notification.permission === 'granted' &&
        document.visibilityState !== 'visible'
      ) {
        new Notification('Nuevo mensaje', {
          body:
            count > 1
              ? `Tienes ${count} mensajes nuevos`
              : 'Tienes un mensaje nuevo',
          icon: '/icon-192.png',
        });
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);

  useEffect(() => {
    if (session?.user?.id) {
      fetchMessages();
      fetchUsers();
    }
  }, [session]);

  // Unlock audio on the first user gesture so incoming sounds can play.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = () => void unlockAudio();

    window.addEventListener('pointerdown', handler, { passive: true });
    window.addEventListener('keydown', handler);

    return () => {
      window.removeEventListener('pointerdown', handler);
      window.removeEventListener('keydown', handler);
    };
  }, []);

  // Lightweight polling so incoming messages trigger sound/notification.
  useEffect(() => {
    if (!session?.user?.id) return;
    const id = window.setInterval(() => {
      fetchMessages();
    }, 10000);
    return () => window.clearInterval(id);
  }, [session?.user?.id]);

  const fetchMessages = async () => {
    try {
      const [receivedRes, sentRes] = await Promise.all([
        fetch('/api/messages?type=received'),
        fetch('/api/messages?type=sent'),
      ]);

      if (receivedRes.ok) {
        const data = await receivedRes.json();
        const list = Array.isArray(data?.messages) ? data.messages : [];

        // Detect new incoming messages since last fetch.
        const receivedOnly = list.filter(
          (m: Message) => m.recipientId === meId
        );
        const maxReceivedAt = receivedOnly.reduce((max: number, m: Message) => {
          const t = new Date(m.createdAt).getTime();
          return Number.isFinite(t) && t > max ? t : max;
        }, 0);

        const since = lastReceivedAtRef.current;
        const newOnes = receivedOnly
          .filter((m: Message) => new Date(m.createdAt).getTime() > since)
          .sort(
            (a: Message, b: Message) =>
              new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );

        lastReceivedAtRef.current = Math.max(since, maxReceivedAt);

        if (newOnes.length > 0) {
          void playIncomingMessageSound();
          notifyIncomingMessage(newOnes.length, newOnes[newOnes.length - 1] || null);
        }

        setReceivedMessages(list);
        setUnreadCount(typeof data?.unreadCount === 'number' ? data.unreadCount : list.filter((m: Message) => !m.isRead).length);
      } else {
        setReceivedMessages([]);
        setUnreadCount(0);
      }

      if (sentRes.ok) {
        const data = await sentRes.json();
        const list = Array.isArray(data?.messages) ? data.messages : [];
        setSentMessages(list);
      } else {
        setSentMessages([]);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
      setReceivedMessages([]);
      setSentMessages([]);
      setUnreadCount(0);
      toast({
        title: 'Error',
        description: 'Failed to load messages',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/messages/recipients');
      if (response.ok) {
        const data = await response.json();
        // Ensure data is an array
        const usersList = Array.isArray(data) ? data : [];
        setUsers(usersList);
      } else {
        setUsers([]);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      setUsers([]);
    }
  };

  const markAsRead = async (messageId: string) => {
    try {
      await fetch(`/api/messages/${messageId}/read`, {
        method: 'PATCH',
      });
      setReceivedMessages((prev) => prev.map((msg) => (msg.id === messageId ? { ...msg, isRead: true } : msg)));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  };

  const markThreadAsRead = async (otherId: string) => {
    if (!meId || !otherId) return;
    const unread = receivedMessages.filter(
      (m) => m.senderId === otherId && m.recipientId === meId && !m.isRead
    );
    if (unread.length === 0) return;

    await Promise.all(
      unread.map((m) =>
        fetch(`/api/messages/${m.id}/read`, { method: 'PATCH' }).catch(() => null)
      )
    );

    setReceivedMessages((prev) =>
      prev.map((m) =>
        m.senderId === otherId && m.recipientId === meId ? { ...m, isRead: true } : m
      )
    );
    setUnreadCount((prev) => Math.max(0, prev - unread.length));
  };

  const handleSendTo = async (recipientId: string) => {
    if (!recipientId || !draft.trim()) return;

    setSending(true);
    try {
      const formData = new FormData();
      formData.append('recipientId', recipientId);
      formData.append('content', draft.trim());
      if (attachment) formData.append('attachment', attachment);

      const response = await fetch('/api/messages', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || 'Failed to send message');
      }

      const created = (await response.json().catch(() => null)) as Message | null;
      setDraft('');
      setAttachment(null);
      if (created?.id) {
        setSentMessages((prev) => [created, ...prev]);
      } else {
        fetchMessages();
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to send message',
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  const handleDraftKeyDown: React.KeyboardEventHandler<HTMLTextAreaElement> = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!sending && activeThreadUserId && draft.trim()) {
        handleSendTo(activeThreadUserId);
      }
    }
  };

  const handleComposeSend = async () => {
    if (!selectedRecipient) return;
    // If user picked a recipient, jump into that thread.
    setActiveThreadUserId(selectedRecipient);
    setIsComposeOpen(false);
  };

  const deleteMessage = async (messageId: string) => {
    try {
      const res = await fetch(`/api/messages/${messageId}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || 'Failed to delete');
      }
      setSelectedMessageId((prev) => (prev === messageId ? '' : prev));
      setReceivedMessages((prev) => prev.filter((m) => m.id !== messageId));
      setSentMessages((prev) => prev.filter((m) => m.id !== messageId));
    } catch (error) {
      console.error('Error deleting message:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete message',
        variant: 'destructive',
      });
    }
  };

  const toggleSelectedMessage = (messageId: string) => {
    setSelectedMessageIds((prev) =>
      prev.includes(messageId) ? prev.filter((id) => id !== messageId) : [...prev, messageId]
    );
  };

  const deleteSelectedMessages = async () => {
    const ids = selectedMessageIds;
    if (ids.length === 0) return;

    // Optimistically clear selection UI.
    setSelectionMode(false);
    setSelectedMessageIds([]);
    setSelectedMessageId('');

    const results = await Promise.all(
      ids.map(async (id) => {
        try {
          const res = await fetch(`/api/messages/${id}`, { method: 'DELETE' });
          if (!res.ok) {
            const data = await res.json().catch(() => null);
            return { ok: false, id, error: data?.error || 'Failed to delete' };
          }
          return { ok: true, id };
        } catch {
          return { ok: false, id, error: 'Failed to delete' };
        }
      })
    );

    const okIds = results.filter((r) => r.ok).map((r) => r.id);
    const failed = results.filter((r) => !r.ok);

    if (okIds.length > 0) {
      setReceivedMessages((prev) => prev.filter((m) => !okIds.includes(m.id)));
      setSentMessages((prev) => prev.filter((m) => !okIds.includes(m.id)));
    }

    if (failed.length > 0) {
      toast({
        title: 'Some messages were not deleted',
        description: failed[0]?.error || 'Failed to delete one or more messages',
        variant: 'destructive',
      });
    }
  };

  const allMessages = useMemo(() => {
    const merged = [...receivedMessages, ...sentMessages];
    merged.sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    return merged;
  }, [receivedMessages, sentMessages]);

  const threads: Thread[] = useMemo(() => {
    if (!meId) return [];

    const byOther = new Map<string, Thread>();

    for (const m of allMessages) {
      const otherIsSender = m.senderId !== meId;
      const otherId = otherIsSender ? m.senderId : m.recipientId;
      const other = otherIsSender ? m.sender : m.recipient;

      const fallback = users.find((u) => u.id === otherId);

      const otherName =
        (other?.name && String(other.name)) ||
        (fallback?.name && String(fallback.name)) ||
        'Unknown';
      const otherEmail =
        (other?.email && String(other.email)) ||
        (fallback?.email && String(fallback.email)) ||
        null;
      const otherImage =
        (other?.image ?? null) ||
        ((fallback as any)?.image ?? null) ||
        null;

      const existing = byOther.get(otherId);
      const unreadInc =
        m.recipientId === meId && m.senderId === otherId && !m.isRead ? 1 : 0;

      if (!existing) {
        byOther.set(otherId, {
          otherId,
          otherName,
          otherEmail,
          otherImage,
          lastMessage: m,
          unreadCount: unreadInc,
        });
      } else {
        const existingLast = existing.lastMessage;
        const isNewer =
          !existingLast ||
          new Date(m.createdAt).getTime() > new Date(existingLast.createdAt).getTime();
        byOther.set(otherId, {
          ...existing,
          otherName: existing.otherName || otherName,
          otherEmail: existing.otherEmail || otherEmail,
          otherImage: existing.otherImage || otherImage,
          lastMessage: isNewer ? m : existingLast,
          unreadCount: existing.unreadCount + unreadInc,
        });
      }
    }

    return Array.from(byOther.values()).sort((a, b) => {
      const at = a.lastMessage ? new Date(a.lastMessage.createdAt).getTime() : 0;
      const bt = b.lastMessage ? new Date(b.lastMessage.createdAt).getTime() : 0;
      return bt - at;
    });
  }, [allMessages, meId, users]);

  const activeThread = useMemo(
    () => threads.find((t) => t.otherId === activeThreadUserId) || null,
    [threads, activeThreadUserId]
  );

  const activeMessages = useMemo(() => {
    if (!meId || !activeThreadUserId) return [] as Message[];
    return allMessages.filter(
      (m) =>
        (m.senderId === meId && m.recipientId === activeThreadUserId) ||
        (m.senderId === activeThreadUserId && m.recipientId === meId)
    );
  }, [allMessages, meId, activeThreadUserId]);

  useEffect(() => {
    if (!activeThreadUserId) return;
    markThreadAsRead(activeThreadUserId);
    // Scroll to bottom when opening a thread.
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 0);
  }, [activeThreadUserId]);

  useEffect(() => {
    if (!activeThreadUserId) return;
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeThreadUserId, activeMessages.length]);

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading messages...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black pb-24">
      <div className="container mx-auto p-4 sm:p-6 max-w-6xl">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2 text-white">
              <MessageSquare className="h-7 w-7 sm:h-8 sm:w-8" />
              Inbox
              {unreadCount > 0 ? (
                <span className="ml-2 bg-white/10 text-white rounded-full px-2 py-0.5 text-xs">
                  {unreadCount}
                </span>
              ) : null}
            </h1>
            <p className="text-zinc-400 mt-1 text-sm">
              Your chats
            </p>
          </div>

          <Dialog
            open={isComposeOpen}
            onOpenChange={(open) => {
              setIsComposeOpen(open);
              if (!open) setSelectedRecipient('');
            }}
          >
            <DialogTrigger asChild>
              <Button className="gap-2 bg-cyan-500 hover:bg-cyan-400 text-black">
                <Send className="h-4 w-4" />
                New chat
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[520px] bg-zinc-950 text-white border-zinc-800">
              <DialogHeader>
                <DialogTitle className="text-white">Start a chat</DialogTitle>
                <DialogDescription className="text-zinc-400">
                  Pick a recipient
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label htmlFor="recipient" className="text-zinc-200">
                    Recipient
                  </Label>
                  <Select value={selectedRecipient} onValueChange={setSelectedRecipient}>
                    <SelectTrigger
                      id="recipient"
                      className="bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-500 [&>span]:text-white [&>span[data-placeholder]]:text-zinc-500"
                    >
                      <SelectValue placeholder="Select recipient" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-950 border-zinc-800 text-white">
                      {users.map((u) => (
                        <SelectItem
                          key={u.id}
                          value={u.id}
                          className="focus:bg-white/10 focus:text-white"
                        >
                          {(() => {
                            const name = (u.name || '').trim() || 'User';
                            const email = (u.email || '').trim();
                            return email ? `${name} (${email})` : name;
                          })()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsComposeOpen(false)}
                  className="border-zinc-800 bg-transparent text-white hover:bg-white/5"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleComposeSend}
                  disabled={!selectedRecipient}
                  className="bg-cyan-500 hover:bg-cyan-400 text-black disabled:bg-white/10 disabled:text-zinc-500"
                >
                  Open
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[340px_1fr] gap-4">
          {/* Threads */}
          <div className={`bg-zinc-950 border border-zinc-800 rounded-lg overflow-hidden ${activeThreadUserId ? 'hidden md:block' : ''}`}>
            <div className="p-3 border-b border-zinc-800 text-white font-semibold">
              Chats
            </div>
            <div className="max-h-[70vh] overflow-auto">
              {threads.length === 0 ? (
                <div className="p-6 text-center text-zinc-400">
                  No chats yet
                </div>
              ) : (
                threads.map((t) => {
                  const active = t.otherId === activeThreadUserId;
                  const last = t.lastMessage?.content || '';
                  return (
                    <button
                      key={t.otherId}
                      type="button"
                      className={`w-full text-left px-3 py-3 flex items-center gap-3 border-b border-zinc-900 hover:bg-white/5 transition-colors ${active ? 'bg-white/5' : ''}`}
                      onClick={() => setActiveThreadUserId(t.otherId)}
                    >
                      {t.otherImage ? (
                        <div className="relative h-10 w-10 rounded-full overflow-hidden border border-white/10 flex-shrink-0">
                          <Image
                            src={t.otherImage}
                            alt={t.otherName ? `${t.otherName} avatar` : 'Avatar'}
                            fill
                            sizes="40px"
                            className="object-cover"
                          />
                        </div>
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-white/10 text-white flex items-center justify-center font-bold flex-shrink-0">
                          {getInitials(t.otherName)}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-white font-semibold truncate">{t.otherName}</div>
                          {t.unreadCount > 0 ? (
                            <div className="bg-cyan-500 text-black text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0">
                              {t.unreadCount}
                            </div>
                          ) : null}
                        </div>
                        <div className="text-zinc-400 text-sm truncate">
                          {last}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Chat */}
          <div className={`bg-zinc-950 border border-zinc-800 rounded-lg overflow-hidden flex flex-col min-h-[70vh] ${!activeThreadUserId ? 'hidden md:flex' : ''}`}>
            {!activeThreadUserId ? (
              <div className="flex-1 flex items-center justify-center text-zinc-400">
                Select a chat
              </div>
            ) : (
              <>
                <div className="p-3 border-b border-zinc-800 flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="md:hidden text-white hover:bg-white/5"
                    onClick={() => setActiveThreadUserId('')}
                    aria-label="Back"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                  <div className="flex items-center gap-3 min-w-0">
                    {activeThread?.otherImage ? (
                      <div className="relative h-9 w-9 rounded-full overflow-hidden border border-white/10 flex-shrink-0">
                        <Image
                          src={activeThread.otherImage}
                          alt={activeThread.otherName ? `${activeThread.otherName} avatar` : 'Avatar'}
                          fill
                          sizes="36px"
                          className="object-cover"
                        />
                      </div>
                    ) : (
                      <div className="h-9 w-9 rounded-full bg-white/10 text-white flex items-center justify-center font-bold flex-shrink-0">
                        {getInitials(activeThread?.otherName || 'User')}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="text-white font-semibold truncate">
                        {activeThread?.otherName || 'Chat'}
                      </div>
                      <div className="text-zinc-400 text-xs truncate">
                        {activeThread?.otherEmail || ''}
                      </div>
                    </div>
                  </div>

                  <div className="ml-auto flex items-center gap-2">
                    {selectionMode ? (
                      <>
                        <Button
                          type="button"
                          variant="outline"
                          className="border-zinc-800 bg-transparent text-white hover:bg-white/5"
                          onClick={() => {
                            setSelectionMode(false);
                            setSelectedMessageIds([]);
                          }}
                        >
                          Cancel
                        </Button>

                        <Dialog open={isDeleteSelectedOpen} onOpenChange={setIsDeleteSelectedOpen}>
                          <DialogTrigger asChild>
                            <Button
                              type="button"
                              className="bg-cyan-500 hover:bg-cyan-400 text-black disabled:bg-white/10 disabled:text-zinc-500"
                              disabled={selectedMessageIds.length === 0}
                              aria-label="Delete selected messages"
                            >
                              <Trash2 className="h-5 w-5" />
                              <span className="ml-2">Delete</span>
                              <span className="ml-2 rounded-full bg-black/10 px-2 py-0.5 text-xs font-bold">
                                {selectedMessageIds.length}
                              </span>
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-[520px] bg-zinc-950 text-white border-zinc-800">
                            <DialogHeader>
                              <DialogTitle className="text-white">Delete selected messages?</DialogTitle>
                              <DialogDescription className="text-zinc-400">
                                This will delete only the messages you sent that you selected.
                              </DialogDescription>
                            </DialogHeader>

                            <div className="flex justify-end gap-2">
                              <Button
                                variant="outline"
                                onClick={() => setIsDeleteSelectedOpen(false)}
                                className="border-zinc-800 bg-transparent text-white hover:bg-white/5"
                              >
                                Cancel
                              </Button>
                              <Button
                                onClick={async () => {
                                  await deleteSelectedMessages();
                                  setIsDeleteSelectedOpen(false);
                                }}
                                className="bg-cyan-500 hover:bg-cyan-400 text-black"
                                disabled={selectedMessageIds.length === 0}
                              >
                                Delete
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </>
                    ) : (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-white/80 hover:text-white hover:bg-white/5"
                        onClick={() => {
                          setSelectionMode(true);
                          setSelectedMessageIds([]);
                          setSelectedMessageId('');
                        }}
                        aria-label="Select messages"
                      >
                        <ListChecks className="h-5 w-5" />
                      </Button>
                    )}
                  </div>
                </div>

                <div className="flex-1 overflow-auto p-3 space-y-2">
                  {activeMessages.length === 0 ? (
                    <div className="text-zinc-400 text-center py-8">
                      No messages yet
                    </div>
                  ) : (
                    activeMessages.map((m) => {
                      const mine = m.senderId === meId;
                      const isSelected = mine && selectedMessageId === m.id;
                      const isBulkSelected = selectionMode && mine && selectedMessageIds.includes(m.id);

                      const bubble = (
                        <div
                          onClick={() => {
                            if (!mine) return;
                            if (selectionMode) {
                              toggleSelectedMessage(m.id);
                              return;
                            }
                            setSelectedMessageId((prev) => (prev === m.id ? '' : m.id));
                          }}
                          className={`max-w-[85%] sm:max-w-[70%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap transition-all ${
                            mine
                              ? selectionMode
                                ? isBulkSelected
                                  ? 'bg-yellow-300 text-black ring-2 ring-yellow-200 shadow-lg shadow-yellow-200/20'
                                  : 'bg-cyan-500 text-black'
                                : isSelected
                                  ? 'bg-yellow-300 text-black ring-2 ring-yellow-200 shadow-lg shadow-yellow-200/20'
                                  : 'bg-cyan-500 text-black'
                              : 'bg-white/10 text-white'
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            <div className="flex-1">
                              {m.content}
                              <div className={`mt-1 text-[11px] ${mine ? 'text-black/70' : 'text-white/60'}`}>
                                {new Date(m.createdAt).toLocaleString()}
                                {!mine && !m.isRead ? <span className="ml-2">• New</span> : null}
                              </div>
                            </div>
                            {mine && !selectionMode ? (
                              isSelected ? (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteMessage(m.id);
                                  }}
                                  aria-label="Delete message"
                                  className="mt-0.5 opacity-80 hover:opacity-100 text-black/80"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              ) : null
                            ) : null}
                          </div>
                        </div>
                      );

                      if (selectionMode && mine) {
                        return (
                          <div key={m.id} className="flex justify-end">
                            <div className="flex items-center gap-2">
                              <Checkbox
                                checked={isBulkSelected}
                                onCheckedChange={() => toggleSelectedMessage(m.id)}
                                className="border-white/20 data-[state=checked]:bg-cyan-500 data-[state=checked]:text-black"
                                aria-label="Select message"
                              />
                              {bubble}
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                          {bubble}
                        </div>
                      );
                    })
                  )}
                  <div ref={bottomRef} />
                </div>

                <div className="border-t border-zinc-800 p-3">
                  <div className="flex items-end gap-2">
                    <div className="flex-1">
                      <Textarea
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        onKeyDown={handleDraftKeyDown}
                        placeholder="Type a message…"
                        rows={1}
                        className="bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-500 caret-white min-h-[44px]"
                      />
                      <div className="mt-2">
                        <Input
                          type="file"
                          onChange={(e) => setAttachment(e.target.files?.[0] || null)}
                          className="bg-zinc-900 border-zinc-800 text-white file:text-zinc-200 file:bg-white/10 file:border-0"
                        />
                      </div>
                      <p className="mt-2 text-xs text-zinc-500">Enter to send • Shift+Enter for new line</p>
                    </div>

                    <Button
                      onClick={() => handleSendTo(activeThreadUserId)}
                      disabled={sending || !draft.trim()}
                      className="bg-cyan-500 hover:bg-cyan-400 text-black disabled:bg-white/10 disabled:text-zinc-500 h-11"
                      aria-label="Send"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
