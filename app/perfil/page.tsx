
'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useI18n } from '@/lib/i18n/i18n-context';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { User, Camera, Save, ArrowLeft, MessageSquare, Calendar, Clock, RefreshCw, XCircle, ChevronRight, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useUser } from '@/contexts/user-context';
import { AddToCalendarButton } from '@/components/add-to-calendar-button';
import { resolvePublicMediaUrl } from '@/lib/utils';
import { formatTime12h } from '@/lib/time';

type Post = {
  id: string;
  cloud_storage_path: string;
  postType: 'BARBER_WORK' | 'CLIENT_SHARE';
  createdAt?: string;
  caption?: string | null;
};

interface Appointment {
  id: string;
  barberId: string;
  serviceId: string;
  date: string;
  time: string;
  status: string;
  service: {
    name: string;
    price: number;
    duration: number;
  } | null;
  barber: {
    profileImage: string | null;
    user: {
      name: string;
      email: string;
      image: string | null;
    };
  } | null;
}

export default function PerfilPage() {
  const { status, data: session } = useSession();
  const { updateUser } = useUser();
  const { t } = useI18n();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [gender, setGender] = useState<string | null>(null);

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [appointmentsLoading, setAppointmentsLoading] = useState(false);
  const [appointmentsExpanded, setAppointmentsExpanded] = useState(false);

  const [myPosts, setMyPosts] = useState<Post[]>([]);
  const [myPostsLoading, setMyPostsLoading] = useState(false);
  const [openedPost, setOpenedPost] = useState<{
    id: string;
    url: string;
    isVideo: boolean;
    caption?: string | null;
  } | null>(null);

  const getMediaUrl = (cloud_storage_path: string) => {
    return resolvePublicMediaUrl(cloud_storage_path);
  };

  const isVideo = (path: string): boolean => {
    return /\.(mp4|webm|ogg|mov)$/i.test(path);
  };

  const isActiveAppointment = (aptStatus: string) => aptStatus === 'PENDING' || aptStatus === 'CONFIRMED';

  const normalizeStatusForDisplay = (aptStatus: string) => {
    // This product flow does not require manual confirmation.
    return aptStatus === 'PENDING' ? 'CONFIRMED' : aptStatus;
  };

  const parseHoursMinutes = (timeValue: string): { hours: number; minutes: number } => {
    const match = timeValue.trim().match(/^\s*(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?\s*$/i);
    if (!match) return { hours: 0, minutes: 0 };

    let hours = Number(match[1]);
    const minutes = Number(match[2]);
    const ampm = match[4]?.toUpperCase();

    if (ampm) {
      if (ampm === 'AM') {
        hours = hours === 12 ? 0 : hours;
      } else {
        hours = hours === 12 ? 12 : hours + 12;
      }
    }
    return { hours, minutes };
  };

  const getAppointmentDateTime = (appointment: Appointment) => {
    const dateValue = new Date(appointment.date);
    const { hours, minutes } = parseHoursMinutes(appointment.time);
    if (!Number.isNaN(dateValue.getTime())) {
      dateValue.setHours(hours, minutes, 0, 0);
    }
    return dateValue;
  };

  const fetchAppointments = useCallback(async () => {
    setAppointmentsLoading(true);
    try {
      const res = await fetch('/api/appointments');
      const data = await res.json();
      if (res.ok) {
        setAppointments(data.appointments || []);
      }
    } catch (error) {
      console.error('Error fetching appointments:', error);
    } finally {
      setAppointmentsLoading(false);
    }
  }, []);

  const fetchMyPosts = useCallback(async () => {
    const userId = (session?.user as { id?: string } | undefined)?.id;
    if (!userId) return;

    setMyPostsLoading(true);
    try {
      const res = await fetch(`/api/posts?authorId=${encodeURIComponent(userId)}`);
      const data = await res.json();
      if (res.ok) {
        const posts = (data.posts || []) as Post[];
        setMyPosts(posts.filter((p) => p.postType === 'CLIENT_SHARE').slice(0, 12));
      }
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setMyPostsLoading(false);
    }
  }, [session?.user]);

  const handleDeleteMyPost = async (postId: string) => {
    const accepted = window.confirm(t('feed.confirmDeletePost'));
    if (!accepted) return;

    try {
      const res = await fetch(`/api/posts/${postId}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || t('feed.errorDeletingPost'));
      }

      setMyPosts((prev) => prev.filter((p) => p.id !== postId));
      setOpenedPost((prev) => (prev?.id === postId ? null : prev));
      toast.success(t('feed.postDeleted'));
    } catch (error) {
      console.error('Error deleting post:', error);
      toast.error(error instanceof Error ? error.message : t('feed.errorDeletingPost'));
    }
  };

  const fetchProfile = useCallback(async () => {
    try {
      const response = await fetch('/api/user/profile');
      if (response.ok) {
        const data = await response.json();
        setName(data.name || '');
        setEmail(data.email || '');
        setImage(data.image || null);
        setGender(data.gender || null);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast.error(t('messages.error.loadProfile'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth');
      return;
    }

    if (status === 'authenticated') {
      fetchProfile();
      fetchAppointments();
      fetchMyPosts();
    }
  }, [status, router, fetchProfile, fetchAppointments, fetchMyPosts]);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hash === '#appointments') {
      setAppointmentsExpanded(true);
    }
  }, []);

  const handleReschedule = (appointment: Appointment) => {
    if (!isActiveAppointment(appointment.status)) {
      toast.error('Only active appointments can be rescheduled');
      return;
    }
    if (!appointment.barberId || !appointment.serviceId) {
      toast.error('Error: could not retrieve appointment details');
      return;
    }
    const params = new URLSearchParams({
      barberId: appointment.barberId,
      serviceId: appointment.serviceId,
      reschedule: appointment.id,
    });
    router.push(`/reservar?${params.toString()}`);
  };

  const handleCancel = async (appointment: Appointment) => {
    if (!isActiveAppointment(appointment.status)) {
      toast.error(t('profile.appointments.onlyActiveCanBeCancelled'));
      return;
    }

    const appointmentDateTime = getAppointmentDateTime(appointment);
    const now = new Date();
    const hoursDiff = (appointmentDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursDiff < 24) {
      toast.error(t('profile.appointments.mustCancel24HoursInAdvance'), {
        duration: 5000,
        style: { background: '#dc2626', color: '#fff' },
      });
      return;
    }

    const accepted = window.confirm(t('profile.appointments.confirmCancelWithPolicy'));
    if (!accepted) return;

    try {
      const res = await fetch(`/api/appointments/${appointment.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'CANCELLED',
          cancellationReason: 'Cancelled by client',
        }),
      });

      if (res.ok) {
        toast.success(t('profile.appointments.appointmentCancelledSuccess'));
        fetchAppointments();
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || t('profile.appointments.errorCancellingAppointment'));
      }
    } catch (error) {
      console.error('Error cancelling appointment:', error);
      toast.error(t('profile.appointments.errorCancellingAppointment'));
    }
  };

  const handleDeleteCancelled = async (appointment: Appointment) => {
    const displayStatus = normalizeStatusForDisplay(appointment.status);
    if (displayStatus !== 'CANCELLED') {
      toast.error(t('profile.appointments.onlyCancelledCanBeDeleted'));
      return;
    }

    const accepted = window.confirm(t('profile.appointments.confirmDeleteCancelledFromHistory'));
    if (!accepted) return;

    try {
      const res = await fetch(`/api/appointments/${appointment.id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        toast.success(t('profile.appointments.appointmentDeleted'));
        setAppointments((prev) => prev.filter((a) => a.id !== appointment.id));
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || t('profile.appointments.errorDeletingAppointment'));
      }
    } catch (error) {
      console.error('Error deleting appointment:', error);
      toast.error(t('profile.appointments.errorDeletingAppointment'));
    }
  };

  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    console.log('[PROFILE IMAGE] File selected:', {
      name: file.name,
      type: file.type,
      size: file.size
    });

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error(t('messages.error.selectImage'));
      return;
    }

    // Validate size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error(t('messages.error.imageSize5MB'));
      return;
    }

    setUploading(true);

    try {
      // Upload image
      const formData = new FormData();
      formData.append('image', file);

      console.log('[PROFILE IMAGE] Uploading to /api/user/profile/image...');

      const response = await fetch('/api/user/profile/image', {
        method: 'POST',
        body: formData,
      });

      console.log('[PROFILE IMAGE] Response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('[PROFILE IMAGE] Upload successful:', data);
        
        setImage(data.imageUrl);
        
        // Update UserContext for instant sync across app
        await updateUser({ image: data.imageUrl });
        
        toast.success(t('messages.success.profilePhotoUpdated'), {
          duration: 2500,
        });
      } else {
        const error = await response.json();
        console.error('[PROFILE IMAGE] Upload failed:', error);
        toast.error(error.message || t('messages.error.uploadImage'));
      }
    } catch (error) {
      console.error('[PROFILE IMAGE] Error uploading image:', error);
      toast.error(t('messages.error.uploadImage'));
    } finally {
      setUploading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!name.trim()) {
      toast.error(t('messages.error.nameEmpty'));
      return;
    }

    setSaving(true);

    try {
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, gender }),
      });

      if (response.ok) {
        // Update UserContext
        await updateUser({ name });
        
        toast.success(t('messages.success.profileSaved'), {
          duration: 2500,
        });
        
        // Optional: stay on page instead of redirecting
        // router.push('/dashboard');
      } else {
        const error = await response.json();
        toast.error(error.message || t('messages.error.updateProfile'));
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      toast.error(t('messages.error.saveProfile'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#00f0ff]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black pb-24 overflow-x-hidden">
      <div className="container mx-auto px-4 pt-10 pb-8 sm:pt-8">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-3xl mx-auto"
        >
          {/* Page Header */}
          <div className="mb-6 flex flex-col gap-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 min-w-0">
                <Link href="/menu">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-gray-400 hover:text-[#00f0ff] hover:bg-transparent"
                    aria-label="Back"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </Button>
                </Link>

                <div className="min-w-0">
                  <h1 className="text-2xl sm:text-4xl font-bold text-white leading-tight">
                    {t('client.my')} <span className="text-[#00f0ff]">{t('client.profile')}</span>
                  </h1>
                  <p className="text-gray-400 text-sm sm:text-base">{t('client.manageInfo')}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-6">
            {/* Profile photo */}
            <Card className="bg-[#0a0a0a] border-gray-800 overflow-hidden">
              <CardContent className="p-6">
                <Label className="text-gray-300 text-sm font-semibold mb-4 block">
                  {t('profile.profilePhoto')}
                </Label>

                <div className="flex flex-col items-center text-center">
                  <div className="relative mb-3">
                    <button
                      type="button"
                      onClick={handleImageClick}
                      className="group relative h-32 w-32 rounded-full border border-gray-700 bg-black/20 overflow-hidden shadow-[0_0_20px_rgba(0,240,255,0.12)]"
                      aria-label={t('profile.changePhoto')}
                    >
                      {image ? (
                        <Image
                          src={image}
                          alt={name || 'User'}
                          fill
                          sizes="128px"
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-gray-900 to-black">
                          <User className="w-10 h-10 text-gray-500" />
                        </div>
                      )}

                      <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity">
                        {uploading ? (
                          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#00f0ff]"></div>
                        ) : (
                          <Camera className="w-7 h-7 text-white" />
                        )}
                      </div>
                    </button>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                    />
                  </div>

                  <p className="text-xs text-gray-400">{t('profile.clickToUpdate')}</p>
                </div>
              </CardContent>
            </Card>

            {/* Personal info */}
            <Card className="bg-[#0a0a0a] border-gray-800">
              <CardContent className="p-6 space-y-5">
                <div>
                  <Label htmlFor="name" className="text-gray-300 text-sm font-semibold mb-2 block">
                    {t('profile.fullName')} *
                  </Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t('profile.yourName')}
                    className="bg-black/30 border-gray-700 text-white h-11"
                  />
                </div>

                <div>
                  <Label htmlFor="email" className="text-gray-300 text-sm font-semibold mb-2 block">
                    Email
                  </Label>
                  <Input
                    id="email"
                    value={email}
                    disabled
                    className="bg-black/20 border-gray-800 text-gray-500 h-11 cursor-not-allowed"
                  />
                  <p className="text-xs text-gray-500 mt-1">{t('profile.emailCannotModify')}</p>
                </div>

                <Button
                  onClick={handleSaveProfile}
                  disabled={saving || !name.trim()}
                  className="w-full sm:w-auto sm:ml-auto h-10 px-4 text-sm bg-gradient-to-r from-[#00f0ff] to-[#0099cc] text-black font-bold hover:opacity-90 disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-black mr-2"></div>
                      {t('common.saving')}
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      {t('profile.saveProfile')}
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* POSTS */}
          <Card className="bg-[#0a0a0a] border-gray-800 mt-6 hover:border-[#00f0ff]/20 transition-colors">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-[#00f0ff]/10 flex items-center justify-center">
                  <Camera className="w-6 h-6 text-[#00f0ff]" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Posts</h3>
                  <p className="text-sm text-gray-400">Your latest photos & videos</p>
                </div>
              </div>

              {myPostsLoading ? (
                <div className="text-gray-400 text-sm">Loading...</div>
              ) : myPosts.length === 0 ? (
                <div className="text-gray-400 text-sm">No posts yet</div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-1">
                  {myPosts.map((post) => {
                    const video = isVideo(post.cloud_storage_path);
                    const src = video ? `/api/posts/${post.id}/media` : getMediaUrl(post.cloud_storage_path);
                    return (
                      <div
                        key={post.id}
                        className="relative aspect-square overflow-hidden rounded-lg bg-black/20 border border-gray-800 cursor-pointer"
                        role="button"
                        tabIndex={0}
                        aria-label={post.caption || 'Open post'}
                        onClick={() => setOpenedPost({ id: post.id, url: src, isVideo: video, caption: post.caption })}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setOpenedPost({ id: post.id, url: src, isVideo: video, caption: post.caption });
                          }
                        }}
                      >
                        <button
                          type="button"
                          className="absolute top-2 right-2 z-10 rounded-full p-2 text-white/90 drop-shadow-md hover:text-red-400 active:scale-95 transition-all"
                          onClick={(e) => {
                            e.stopPropagation();
                            void handleDeleteMyPost(post.id);
                          }}
                          aria-label={t('feed.deletePostAria')}
                          title={t('feed.deletePostTitle')}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        {video ? (
                          <video
                            src={src}
                            className="h-full w-full object-cover"
                            autoPlay
                            loop
                            muted
                            playsInline
                            preload="metadata"
                          />
                        ) : (
                          <Image
                            src={src}
                            alt={post.caption || 'Post'}
                            fill
                            sizes="(max-width: 640px) 33vw, (max-width: 1024px) 25vw, 20vw"
                            className="object-cover"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Post Viewer Modal */}
          {openedPost && (
            <div
              className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
              onClick={() => setOpenedPost(null)}
              role="dialog"
              aria-modal="true"
            >
              <div
                className="relative w-full max-w-3xl max-h-[85vh]"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  className="absolute -top-12 right-0 text-white/80 hover:text-white"
                  onClick={() => setOpenedPost(null)}
                  aria-label="Close"
                >
                  ✕
                </button>

                <button
                  type="button"
                  className="absolute -top-12 right-10 text-white/80 hover:text-red-400"
                  onClick={() => void handleDeleteMyPost(openedPost.id)}
                  aria-label={t('feed.deletePostAria')}
                  title={t('feed.deletePostTitle')}
                >
                  <Trash2 className="w-5 h-5" />
                </button>

                <div className="relative w-full bg-black rounded-xl overflow-hidden border border-white/10">
                  {openedPost.isVideo ? (
                    <video
                      src={openedPost.url}
                      controls
                      playsInline
                      className="w-full max-h-[85vh] object-contain bg-black"
                    />
                  ) : (
                    <div className="relative w-full h-[70vh] bg-black">
                      <Image
                        src={openedPost.url}
                        alt={openedPost.caption || 'Post'}
                        fill
                        className="object-contain"
                        sizes="(max-width: 768px) 100vw, 900px"
                      />
                    </div>
                  )}

                  {openedPost.caption ? (
                    <div className="p-3 text-white text-sm border-t border-white/10">
                      {openedPost.caption}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          )}

          {/* CHAT CON BARBEROS */}
          <Card className="bg-[#0a0a0a] border-gray-800 mt-6 hover:border-[#00f0ff]/30 transition-colors">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-[#00f0ff]/10 flex items-center justify-center">
                  <MessageSquare className="w-6 h-6 text-[#00f0ff]" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">{t('nav.chat')}</h3>
                  <p className="text-sm text-gray-400">{t('client.chatWithBarber')}</p>
                </div>
              </div>

              <div className="flex justify-center mb-4">
                <Link href="/inbox">
                  <Button
                    size="sm"
                    className="h-9 px-5 text-sm bg-gradient-to-r from-[#00f0ff] to-cyan-400 text-black font-bold hover:opacity-90 shadow-[0_0_20px_rgba(0,240,255,0.5)]"
                  >
                    <MessageSquare className="w-4 h-4 mr-2" />
                    {t('client.openChat')}
                  </Button>
                </Link>
              </div>
              <p className="text-gray-400 text-sm">
                {t('client.chatDescription')}
              </p>
            </CardContent>
          </Card>

          {/* APPOINTMENT HISTORY */}
          <Card id="appointments" className="bg-[#0a0a0a] border-gray-800 mt-6 hover:border-[#00f0ff]/20 transition-colors">
            <CardContent className="p-6">
              <button
                type="button"
                onClick={() => setAppointmentsExpanded((v) => !v)}
                className="w-full flex items-center justify-between"
                aria-expanded={appointmentsExpanded}
                aria-controls="appointments-panel"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-[#ffd700]/10 flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-[#ffd700]" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-xl font-bold text-white">Appointment History</h3>
                    <p className="text-sm text-gray-400">Your recent appointments</p>
                  </div>
                </div>
                <ChevronRight
                  className={`w-5 h-5 text-gray-500 transition-transform ${appointmentsExpanded ? 'rotate-90' : ''}`}
                />
              </button>

              {appointmentsExpanded && (
                <div className="mt-4" id="appointments-panel">
                  {appointmentsLoading ? (
                    <div className="text-gray-400 text-sm">Loading appointments...</div>
                  ) : appointments.length === 0 ? (
                    <div className="text-gray-400 text-sm">No recent appointments</div>
                  ) : (
                    <div className="space-y-3">
                      {appointments.slice(0, 5).map((appointment) => {
                        const displayStatus = normalizeStatusForDisplay(appointment.status);
                        const statusClass =
                          displayStatus === 'CONFIRMED'
                            ? 'bg-green-500/20 text-green-400'
                            : displayStatus === 'COMPLETED'
                              ? 'bg-blue-500/20 text-blue-400'
                              : displayStatus === 'CANCELLED'
                                ? 'bg-red-500/20 text-red-400'
                                : 'bg-yellow-500/20 text-yellow-400';

                        return (
                          <div
                            key={appointment.id}
                            className="p-4 bg-black/20 rounded-lg border border-gray-800"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-white font-semibold truncate">
                                  {appointment.service?.name || 'Service'}
                                </p>
                                <p className="text-gray-400 text-sm truncate">
                                  with {appointment.barber?.user?.name || 'Barber'}
                                </p>
                                <div className="flex items-center gap-3 text-xs text-gray-500 mt-2">
                                  <span className="flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    {new Date(appointment.date).toLocaleDateString('en-US', {
                                      year: 'numeric',
                                      month: 'short',
                                      day: '2-digit',
                                    })}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {formatTime12h(appointment.time)}
                                  </span>
                                </div>
                              </div>

                              <div className="flex flex-col items-end gap-2">
                                <p className="text-lg font-bold text-[#ffd700]">
                                  ${appointment.service?.price || 0}
                                </p>
                                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusClass}`}>
                                  {displayStatus === 'CONFIRMED'
                                    ? 'Confirmed'
                                    : displayStatus === 'COMPLETED'
                                      ? 'Completed'
                                      : displayStatus === 'CANCELLED'
                                        ? 'Cancelled'
                                        : 'Pending'}
                                </span>
                              </div>
                            </div>

                            <div className="mt-3 flex items-center gap-2">
                              <AddToCalendarButton
                                appointmentId={appointment.id}
                                variant="outline"
                                size="sm"
                                showText={false}
                                appointmentData={{
                                  date: appointment.date,
                                  time: appointment.time,
                                  service: {
                                    name: appointment.service?.name || 'Service',
                                    duration: appointment.service?.duration || 60,
                                  },
                                  barber: {
                                    name: appointment.barber?.user?.name || 'Barber',
                                    email: appointment.barber?.user?.email,
                                  },
                                  client: {
                                    name: name || session?.user?.name || 'Client',
                                    email: email || session?.user?.email || '',
                                  },
                                }}
                              />

                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleReschedule(appointment)}
                                disabled={!isActiveAppointment(appointment.status)}
                                className="border-blue-500 text-blue-500 hover:bg-blue-500 hover:text-white transition-colors disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-blue-500"
                                title="Reschedule"
                              >
                                <RefreshCw className="w-4 h-4" />
                              </Button>

                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const displayStatus = normalizeStatusForDisplay(appointment.status);
                                  if (displayStatus === 'CANCELLED') {
                                    handleDeleteCancelled(appointment);
                                  } else {
                                    handleCancel(appointment);
                                  }
                                }}
                                disabled={
                                  normalizeStatusForDisplay(appointment.status) === 'CANCELLED'
                                    ? false
                                    : !isActiveAppointment(appointment.status)
                                }
                                className={
                                  normalizeStatusForDisplay(appointment.status) === 'CANCELLED'
                                    ? 'border-red-500 text-red-500 hover:bg-red-500 hover:text-white transition-colors'
                                    : 'border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white transition-colors disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-orange-500'
                                }
                                title={
                                  normalizeStatusForDisplay(appointment.status) === 'CANCELLED'
                                    ? 'Delete'
                                    : 'Cancel'
                                }
                              >
                                {normalizeStatusForDisplay(appointment.status) === 'CANCELLED' ? (
                                  <Trash2 className="w-4 h-4" />
                                ) : (
                                  <XCircle className="w-4 h-4" />
                                )}
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
