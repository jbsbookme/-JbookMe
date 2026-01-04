'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { 
  MapPin, 
  Phone, 
  Mail, 
  Calendar,
  Clock, 
  Facebook, 
  Instagram, 
  Twitter,
  Scissors,
  ArrowLeft,
  Star,
  Bell,
  MessageCircle,
  Shield,
  FileText,
  LogOut,
  Image as ImageIcon,
  User as UserIcon,
  ChevronRight,
  Share2,
  RefreshCw,
  XCircle
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { signOut } from 'next-auth/react';
import { toast } from 'sonner';
import { useI18n } from '@/lib/i18n/i18n-context';
import { isAdmin, isBarberOrStylist } from '@/lib/auth/role-utils';
import { useUser } from '@/contexts/user-context';
import { AddToCalendarButton } from '@/components/add-to-calendar-button';

interface Settings {
  businessName: string;
  address: string;
  phone: string;
  email: string;
  facebookUrl?: string;
  instagramUrl?: string;
  twitterUrl?: string;
  whatsappNumber?: string;
}

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

export default function MenuPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { t } = useI18n();
  const { user } = useUser();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [appointmentsLoading, setAppointmentsLoading] = useState(false);
  const [appointmentsExpanded, setAppointmentsExpanded] = useState(false);
  const [contactExpanded, setContactExpanded] = useState(false);
  const [hoursExpanded, setHoursExpanded] = useState(false);

  const role = (session?.user as unknown as { role?: string } | undefined)?.role;
  const appointmentsHref = isAdmin(role)
    ? '/dashboard/admin/citas'
    : isBarberOrStylist(role)
      ? '/dashboard/barbero'
      : '/menu#appointments';

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth');
      return;
    }
    
    if (status === 'authenticated') {
      fetchSettings();
      fetchAppointments();
    }
  }, [status, router]);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hash === '#appointments') {
      setAppointmentsExpanded(true);
    }
  }, []);

  const isActiveAppointment = (aptStatus: string) => aptStatus === 'PENDING' || aptStatus === 'CONFIRMED';

  const normalizeStatusForDisplay = (aptStatus: string) => {
    // This product flow does not require manual confirmation.
    return aptStatus === 'PENDING' ? 'CONFIRMED' : aptStatus;
  };

  const parseHoursMinutes = (time: string): { hours: number; minutes: number } => {
    const match = time.trim().match(/^\s*(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?\s*$/i);
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
    const date = new Date(appointment.date);
    const { hours, minutes } = parseHoursMinutes(appointment.time);
    if (!Number.isNaN(date.getTime())) {
      date.setHours(hours, minutes, 0, 0);
    }
    return date;
  };

  const fetchAppointments = async () => {
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
  };

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
      toast.error('Only active appointments can be cancelled');
      return;
    }

    const appointmentDateTime = getAppointmentDateTime(appointment);
    const now = new Date();
    const hoursDiff = (appointmentDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursDiff < 24) {
      toast.error('Cannot cancel: you must cancel at least 24 hours in advance', {
        duration: 5000,
        style: { background: '#dc2626', color: '#fff' },
      });
      return;
    }

    const accepted = window.confirm('I accept the 24-hour cancellation policy. Do you want to cancel this appointment?');
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
        toast.success('✓ Appointment cancelled successfully');
        fetchAppointments();
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || 'Error cancelling appointment');
      }
    } catch (error) {
      console.error('Error cancelling appointment:', error);
      toast.error('Error cancelling appointment');
    }
  };

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/settings');
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/' });
    toast.success(t('auth.logoutSuccess'));
  };

  const handleShare = async () => {
    const shareData = {
      title: 'JBookMe',
      text: t('common.shareText'),
      url: window.location.origin,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        toast.success(t('common.shareSuccess'));
      } else {
        await navigator.clipboard.writeText(window.location.origin);
        toast.success(t('common.linkCopied'));
      }
    } catch (error: unknown) {
      const errorName =
        typeof error === 'object' && error !== null && 'name' in error
          ? String((error as { name?: unknown }).name)
          : '';

      if (errorName !== 'AbortError') {
        console.error('Error sharing:', error);
        try {
          await navigator.clipboard.writeText(window.location.origin);
          toast.success(t('common.linkCopied'));
        } catch {
          toast.error(t('common.shareError'));
        }
      }
    }
  };

  const currentYear = new Date().getFullYear();

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#00f0ff]"></div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return null;
  }

  return (
    <div className="min-h-screen bg-black pb-24">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-gradient-to-b from-black via-black/95 to-transparent backdrop-blur-sm border-b border-gray-800">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-white">{t('common.menu')}</h1>
            <Button
              variant="ghost"
              size="icon"
              className="text-gray-400 hover:text-[#00f0ff]"
              aria-label={t('common.back')}
              onClick={() => {
                if (typeof window !== 'undefined' && window.history.length > 1) {
                  router.back();
                } else {
                  router.push(session ? '/feed' : '/');
                }
              }}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* User */}
        {session?.user && (
          <Card className="bg-gradient-to-br from-[#00f0ff]/10 to-[#0099cc]/10 border-[#00f0ff]/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {(user?.image || session.user.image) ? (
                    <div className="relative w-12 h-12 rounded-full overflow-hidden border border-[#00f0ff]/30">
                      <Image
                        src={user?.image || session.user.image || ''}
                        alt={(user?.name || session.user.name) ? `${user?.name || session.user.name} profile photo` : 'Profile photo'}
                        fill
                        className="object-cover"
                        sizes="48px"
                        priority
                      />
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#00f0ff] to-[#0099cc] flex items-center justify-center">
                      <UserIcon className="w-6 h-6 text-black" />
                    </div>
                  )}
                  <div>
                    <p className="text-white font-semibold">{user?.name || session.user.name || t('common.user')}</p>
                    <p className="text-gray-400 text-sm">{user?.email || session.user.email}</p>
                  </div>
                </div>
                <Button
                  onClick={handleLogout}
                  variant="ghost"
                  size="sm"
                  className="text-red-400 hover:text-red-500 hover:bg-red-500/10 px-2"
                >
                  <LogOut className="w-5 h-5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Links */}
        <div>
          <h2 className="text-white font-semibold text-lg mb-3 px-2">{t('common.quickLinks')}</h2>
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-0">
              <Link href="/reservar" className="block">
                <div className="flex items-center justify-between p-4 hover:bg-gray-800/50 transition-colors border-b border-gray-800">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#00f0ff]/20 flex items-center justify-center">
                      <Scissors className="w-5 h-5 text-[#00f0ff]" />
                    </div>
                    <span className="text-white">{t('booking.title')}</span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-500" />
                </div>
              </Link>

              <Link href={appointmentsHref} className="block">
                <div className="flex items-center justify-between p-4 hover:bg-gray-800/50 transition-colors border-b border-gray-800">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#00f0ff]/20 flex items-center justify-center">
                      <Calendar className="w-5 h-5 text-[#00f0ff]" />
                    </div>
                    <span className="text-white">Appointment History</span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-500" />
                </div>
              </Link>

              <Link href="/barberos" className="block">
                <div className="flex items-center justify-between p-4 hover:bg-gray-800/50 transition-colors border-b border-gray-800">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#ffd700]/20 flex items-center justify-center">
                      <UserIcon className="w-5 h-5 text-[#ffd700]" />
                    </div>
                    <span className="text-white">{t('barbers.ourTeam')}</span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-500" />
                </div>
              </Link>

              <Link href="/galeria" className="block">
                <div className="flex items-center justify-between p-4 hover:bg-gray-800/50 transition-colors border-b border-gray-800">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                      <ImageIcon className="w-5 h-5 text-purple-400" />
                    </div>
                    <span className="text-white">{t('gallery.title')}</span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-500" />
                </div>
              </Link>

              <Link href="/resenas" className="block">
                <div className="flex items-center justify-between p-4 hover:bg-gray-800/50 transition-colors border-b border-gray-800">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center">
                      <Star className="w-5 h-5 text-yellow-400" />
                    </div>
                    <span className="text-white">{t('reviews.title')}</span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-500" />
                </div>
              </Link>

              <Link href="/notificaciones" className="block">
                <div className="flex items-center justify-between p-4 hover:bg-gray-800/50 transition-colors border-b border-gray-800">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#00f0ff]/20 flex items-center justify-center">
                      <Bell className="w-5 h-5 text-[#00f0ff]" />
                    </div>
                      <span className="text-white">Notifications</span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-500" />
                </div>
              </Link>

              <Link href="/asistente" className="block">
                <div className="flex items-center justify-between p-4 hover:bg-gray-800/50 transition-colors border-b border-gray-800">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-pink-500/20 flex items-center justify-center">
                      <MessageCircle className="w-5 h-5 text-pink-400" />
                    </div>
                    <span className="text-white">{t('assistant.title')}</span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-500" />
                </div>
              </Link>

              <button onClick={handleShare} className="block w-full">
                <div className="flex items-center justify-between p-4 hover:bg-gray-800/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#00f0ff] to-[#ffd700] flex items-center justify-center">
                      <Share2 className="w-5 h-5 text-black" />
                    </div>
                    <span className="text-white font-semibold">{t('common.shareApp')}</span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-500" />
                </div>
              </button>
            </CardContent>
          </Card>
        </div>

        {/* Appointment History */}
        {!isAdmin(role) && !isBarberOrStylist(role) && (
          <div id="appointments">
            <button
              type="button"
              onClick={() => setAppointmentsExpanded((v) => !v)}
              className="w-full flex items-center justify-between px-2 mb-3"
              aria-expanded={appointmentsExpanded}
              aria-controls="appointments-panel"
            >
              <span className="text-white font-semibold text-lg">Appointment History</span>
              <ChevronRight
                className={`w-5 h-5 text-gray-500 transition-transform ${appointmentsExpanded ? 'rotate-90' : ''}`}
              />
            </button>

            {appointmentsExpanded && (
              <Card className="bg-gray-900 border-gray-800" id="appointments-panel">
                <CardContent className="p-4">
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
                            className="p-4 bg-gray-800 rounded-lg border border-gray-700"
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
                                    {appointment.time}
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
                                    name: user?.name || session?.user?.name || 'Client',
                                    email: user?.email || session?.user?.email || '',
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
                                onClick={() => handleCancel(appointment)}
                                disabled={!isActiveAppointment(appointment.status)}
                                className="border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white transition-colors disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-orange-500"
                                title="Cancel"
                              >
                                <XCircle className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}

                      <div className="pt-1">
                        <Link href={appointmentsHref} className="text-sm text-[#00f0ff] hover:underline">
                          View all appointments
                        </Link>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Contact Information */}
        {!loading && settings && (
          <div>
            <button
              type="button"
              onClick={() => setContactExpanded((v) => !v)}
              className="w-full flex items-center justify-between px-2 mb-3"
              aria-expanded={contactExpanded}
              aria-controls="contact-panel"
            >
              <span className="text-white font-semibold text-lg">{t('common.contact')}</span>
              <ChevronRight
                className={`w-5 h-5 text-gray-500 transition-transform ${contactExpanded ? 'rotate-90' : ''}`}
              />
            </button>

            {contactExpanded && (
              <Card className="bg-gray-900 border-gray-800" id="contact-panel">
                <CardContent className="p-4 space-y-4">
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-[#ffd700] mt-0.5" />
                    <div>
                      <p className="text-gray-400 text-sm">{t('common.address')}</p>
                      <p className="text-white">{settings.address || '123 Main Street, City'}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Phone className="w-5 h-5 text-[#ffd700] mt-0.5" />
                    <div>
                      <p className="text-gray-400 text-sm">{t('common.phone')}</p>
                      <a
                        href={`tel:${settings.phone || '+15551234567'}`}
                        className="text-[#00f0ff] hover:underline"
                      >
                        {settings.phone || '+1 (555) 123-4567'}
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Mail className="w-5 h-5 text-[#ffd700] mt-0.5" />
                    <div>
                      <p className="text-gray-400 text-sm">{t('common.email')}</p>
                      <a
                        href={`mailto:${settings.email || 'info@bookme.com'}`}
                        className="text-[#00f0ff] hover:underline"
                      >
                        {settings.email || 'info@bookme.com'}
                      </a>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Hours */}
        <div>
          <button
            type="button"
            onClick={() => setHoursExpanded((v) => !v)}
            className="w-full flex items-center justify-between px-2 mb-3"
            aria-expanded={hoursExpanded}
            aria-controls="hours-panel"
          >
            <span className="text-white font-semibold text-lg">{t('common.hours')}</span>
            <ChevronRight
              className={`w-5 h-5 text-gray-500 transition-transform ${hoursExpanded ? 'rotate-90' : ''}`}
            />
          </button>

          {hoursExpanded && (
            <Card className="bg-gray-900 border-gray-800" id="hours-panel">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-3 mb-3">
                  <Clock className="w-5 h-5 text-[#ffd700]" />
                  <p className="text-white font-semibold">{t('common.businessHours')}</p>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">{t('common.monSat')}</span>
                    <span className="text-white font-medium">{t('common.monSatHours')}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">{t('common.sunday')}</span>
                    <span className="text-white font-medium">{t('common.sundayHours')}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Social Media */}
        {!loading && settings && (settings.facebookUrl || settings.instagramUrl || settings.twitterUrl) && (
          <div>
            <h2 className="text-white font-semibold text-lg mb-3 px-2">{t('common.followUs')}</h2>
            <Card className="bg-gray-900 border-gray-800">
              <CardContent className="p-4">
                <div className="flex justify-center gap-6">
                  {settings.facebookUrl && (
                    <a
                      href={settings.facebookUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex flex-col items-center gap-2 group"
                    >
                      <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center group-hover:bg-blue-500/30 transition-colors">
                        <Facebook className="w-6 h-6 text-blue-400" />
                      </div>
                      <span className="text-gray-400 text-xs">Facebook</span>
                    </a>
                  )}
                  {settings.instagramUrl && (
                    <a
                      href={settings.instagramUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex flex-col items-center gap-2 group"
                    >
                      <div className="w-12 h-12 rounded-full bg-pink-500/20 flex items-center justify-center group-hover:bg-pink-500/30 transition-colors">
                        <Instagram className="w-6 h-6 text-pink-400" />
                      </div>
                      <span className="text-gray-400 text-xs">Instagram</span>
                    </a>
                  )}
                  {settings.twitterUrl && (
                    <a
                      href={settings.twitterUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex flex-col items-center gap-2 group"
                    >
                      <div className="w-12 h-12 rounded-full bg-[#00f0ff]/20 flex items-center justify-center group-hover:bg-[#00f0ff]/30 transition-colors">
                        <Twitter className="w-6 h-6 text-[#00f0ff]" />
                      </div>
                      <span className="text-gray-400 text-xs">Twitter</span>
                    </a>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Legal Links */}
        <div>
          <h2 className="text-white font-semibold text-lg mb-3 px-2">{t('common.legal')}</h2>
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-0">
              <Link href="/privacidad" className="block">
                <div className="flex items-center justify-between p-4 hover:bg-gray-800/50 transition-colors border-b border-gray-800">
                  <div className="flex items-center gap-3">
                    <Shield className="w-5 h-5 text-gray-400" />
                    <span className="text-white">{t('legal.privacyPolicy')}</span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-500" />
                </div>
              </Link>

              <Link href="/terminos" className="block">
                <div className="flex items-center justify-between p-4 hover:bg-gray-800/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-gray-400" />
                    <span className="text-white">{t('legal.termsConditions')}</span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-500" />
                </div>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Simple Footer */}
        <div className="text-center pt-6 pb-4">
          <p className="text-gray-500 text-sm">© {currentYear} JBookMe</p>
          <p className="text-gray-600 text-xs mt-1">{t('common.allRightsReserved')}</p>
        </div>
      </div>
    </div>
  );
}
