'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { 
  MapPin, 
  Phone, 
  Mail, 
  Clock, 
  Facebook, 
  Instagram, 
  Twitter,
  Youtube,
  Music2,
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
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { signOut } from 'next-auth/react';
import { toast } from 'sonner';
import { useI18n } from '@/lib/i18n/i18n-context';
import { useUser } from '@/contexts/user-context';
import { LanguageSelector } from '@/components/language-selector';
import { normalizeExternalUrl, normalizeWhatsAppUrl } from '@/lib/utils';

interface Settings {
  // Core business settings
  shopName?: string;
  businessName?: string;
  address?: string;
  phone?: string;
  email?: string;

  // Social networks (current schema)
  facebook?: string;
  instagram?: string;
  twitter?: string;
  tiktok?: string;
  youtube?: string;
  whatsapp?: string;

  // Backward-compat fields (some older UI used *Url)
  facebookUrl?: string;
  instagramUrl?: string;
  twitterUrl?: string;
  tiktokUrl?: string;
  youtubeUrl?: string;
  whatsappUrl?: string;
  whatsappNumber?: string;
}

export default function MenuPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useI18n();
  const { user } = useUser();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [contactExpanded, setContactExpanded] = useState(false);
  const [hoursExpanded, setHoursExpanded] = useState(false);

  const directionsHrefFor = (address: string) => {
    const encoded = encodeURIComponent(address);

    // Prefer Apple Maps on iOS (opens the native Maps app more reliably).
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent || '' : '';
    const isIOS = /iPad|iPhone|iPod/i.test(ua);
    if (isIOS) return `https://maps.apple.com/?daddr=${encoded}`;

    // Default: Google Maps Directions.
    return `https://www.google.com/maps/dir/?api=1&destination=${encoded}`;
  };

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth');
      return;
    }
    
    if (status === 'authenticated') {
      fetchSettings();
    }
  }, [status, router]);

  useEffect(() => {
    if (searchParams?.get('assistantDisabled') === '1') {
      toast.info('Asistente temporalmente desactivado');
    }
  }, [searchParams]);

  const assistantEnabled = process.env.NEXT_PUBLIC_ASSISTANT_ENABLED === 'true';

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
    const url = window.location.origin;
    const shareData = {
      url,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        toast.success(t('common.shareSuccess'));
      } else {
        await navigator.clipboard.writeText(url);
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
          await navigator.clipboard.writeText(url);
          toast.success(t('common.linkCopied'));
        } catch {
          toast.error(t('common.shareError'));
        }
      }
    }
  };

  const currentYear = new Date().getFullYear();

  const businessFacebook = settings?.facebookUrl || settings?.facebook;
  const businessInstagram = settings?.instagramUrl || settings?.instagram;
  const businessTwitter = settings?.twitterUrl || settings?.twitter;
  const businessTiktok = settings?.tiktokUrl || settings?.tiktok;
  const businessYoutube = settings?.youtubeUrl || settings?.youtube;
  const businessWhatsapp = settings?.whatsappUrl || settings?.whatsapp;

  const facebookHref = normalizeExternalUrl(businessFacebook) || '';
  const instagramHref = normalizeExternalUrl(businessInstagram) || '';
  const twitterHref = normalizeExternalUrl(businessTwitter) || '';
  const tiktokHref = normalizeExternalUrl(businessTiktok) || '';
  const youtubeHref = normalizeExternalUrl(businessYoutube) || '';
  const whatsappHref = normalizeWhatsAppUrl(businessWhatsapp, settings?.phone || undefined) || '';

  const telHref = settings?.phone ? `tel:${settings.phone.trim().replace(/[^\d+]/g, '')}` : '';
  const mailHref = settings?.email ? `mailto:${settings.email.trim()}` : '';

  const isAdmin = session?.user?.role === 'ADMIN';
  const isBarber = session?.user?.role === 'BARBER' || session?.user?.role === 'STYLIST';
  const profileHref = isAdmin ? '/dashboard/admin' : isBarber ? '/dashboard/barbero' : '/perfil';
  const profileLabel = isAdmin || isBarber ? t('nav.dashboard') : t('nav.profile');

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
        <div className="container mx-auto px-4 py-5 max-w-4xl">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-white">{t('common.menu')}</h1>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="text-gray-400 hover:text-[#00f0ff] hover:bg-transparent"
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
      </div>

      <div className="container mx-auto px-4 py-5 space-y-5 max-w-4xl">
        {/* User */}
        {session?.user && (
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {(session.user.image || user?.image) ? (
                    <div className="relative w-12 h-12 rounded-full overflow-hidden border border-[#00f0ff]/30 bg-transparent">
                      <Image
                        src={session.user.image || user?.image || ''}
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

        {/* Language */}
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-white font-semibold">{t('common.language')}</p>
              </div>
              <LanguageSelector />
            </div>
          </CardContent>
        </Card>

        {/* Quick Links */}
        <div>
          <h2 className="text-white font-semibold text-lg mb-3 px-2">{t('common.quickLinks')}</h2>
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-0">
              <Link href={profileHref} className="block">
                <div className="flex items-center justify-between p-4 hover:bg-gray-800/50 transition-colors border-b border-gray-800">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#00f0ff]/20 flex items-center justify-center">
                      <UserIcon className="w-5 h-5 text-[#00f0ff]" />
                    </div>
                    <span className="text-white">{profileLabel}</span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-500" />
                </div>
              </Link>

              {isAdmin && (
                <Link href="/perfil" className="block">
                  <div className="flex items-center justify-between p-4 hover:bg-gray-800/50 transition-colors border-b border-gray-800">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#ffd700]/20 flex items-center justify-center">
                        <UserIcon className="w-5 h-5 text-[#ffd700]" />
                      </div>
                      <span className="text-white">{t('nav.profile')}</span>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-500" />
                  </div>
                </Link>
              )}

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

              <Link href="/galeria-genero" className="block">
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
                      <span className="text-white">{t('notifications.title')}</span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-500" />
                </div>
              </Link>

              {assistantEnabled ? (
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
              ) : null}

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

        {/* Contact Information */}
        {!loading && settings && (
          <div>
            <button
              type="button"
              onClick={() => setContactExpanded((v) => !v)}
              className="w-full flex items-center justify-between px-4 py-3 mb-3 rounded-2xl border border-gray-800 bg-gray-900/40 hover:border-[#00f0ff]/30 transition-colors"
              aria-expanded={contactExpanded}
              aria-controls="contact-panel"
            >
              <span className="text-white font-semibold text-lg">{t('common.contact')}</span>
              <ChevronRight
                className={`w-5 h-5 text-gray-500 transition-transform ${contactExpanded ? 'rotate-90' : ''}`}
              />
            </button>

            {contactExpanded && (
              <Card className="bg-gray-900 border-gray-800 rounded-2xl" id="contact-panel">
                <CardContent className="p-4 space-y-4">
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-[#00f0ff] mt-0.5" />
                    <div>
                      <p className="text-gray-400 text-sm">{t('common.address')}</p>
                      {settings.address ? (
                        <a
                          href={directionsHrefFor(settings.address)}
                          rel="noopener noreferrer"
                          className="text-white hover:text-[#00f0ff]"
                        >
                          {settings.address}
                        </a>
                      ) : (
                        <p className="text-white">{t('common.notAvailable')}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Phone className="w-5 h-5 text-[#00f0ff] mt-0.5" />
                    <div>
                      <p className="text-gray-400 text-sm">{t('common.phone')}</p>
                      {settings.phone ? (
                        <a
                          href={telHref}
                          className="text-white hover:text-[#00f0ff]"
                        >
                          {settings.phone}
                        </a>
                      ) : (
                        <p className="text-white">{t('common.notAvailable')}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Mail className="w-5 h-5 text-[#00f0ff] mt-0.5" />
                    <div>
                      <p className="text-gray-400 text-sm">{t('common.email')}</p>
                      {settings.email ? (
                        <a
                          href={mailHref}
                          className="text-white hover:text-[#00f0ff]"
                        >
                          {settings.email}
                        </a>
                      ) : (
                        <p className="text-white">{t('common.notAvailable')}</p>
                      )}
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
            className="w-full flex items-center justify-between px-4 py-3 mb-3 rounded-2xl border border-gray-800 bg-gray-900/40 hover:border-[#00f0ff]/30 transition-colors"
            aria-expanded={hoursExpanded}
            aria-controls="hours-panel"
          >
            <span className="text-white font-semibold text-lg">{t('common.hours')}</span>
            <ChevronRight
              className={`w-5 h-5 text-gray-500 transition-transform ${hoursExpanded ? 'rotate-90' : ''}`}
            />
          </button>

          {hoursExpanded && (
            <Card className="bg-gray-900 border-gray-800 rounded-2xl" id="hours-panel">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-3 mb-3">
                  <Clock className="w-5 h-5 text-[#00f0ff]" />
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
        {!loading && settings && (businessFacebook || businessInstagram || businessTwitter || businessTiktok || businessYoutube || businessWhatsapp) && (
          <div>
            <h2 className="text-white font-semibold text-lg mb-3 px-2">{t('common.followUs')}</h2>
            <Card className="bg-gray-900 border-gray-800">
              <CardContent className="p-4">
                <div className="flex justify-center gap-6 flex-wrap">
                  {businessFacebook && (
                    <a
                      href={facebookHref}
                      rel="noopener noreferrer"
                      className="flex flex-col items-center gap-2 group"
                    >
                      <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center group-hover:bg-blue-500/30 transition-colors">
                        <Facebook className="w-6 h-6 text-blue-400" />
                      </div>
                      <span className="text-gray-400 text-xs">Facebook</span>
                    </a>
                  )}
                  {businessInstagram && (
                    <a
                      href={instagramHref}
                      rel="noopener noreferrer"
                      className="flex flex-col items-center gap-2 group"
                    >
                      <div className="w-12 h-12 rounded-full bg-pink-500/20 flex items-center justify-center group-hover:bg-pink-500/30 transition-colors">
                        <Instagram className="w-6 h-6 text-pink-400" />
                      </div>
                      <span className="text-gray-400 text-xs">Instagram</span>
                    </a>
                  )}
                  {businessTwitter && (
                    <a
                      href={twitterHref}
                      rel="noopener noreferrer"
                      className="flex flex-col items-center gap-2 group"
                    >
                      <div className="w-12 h-12 rounded-full bg-[#00f0ff]/20 flex items-center justify-center group-hover:bg-[#00f0ff]/30 transition-colors">
                        <Twitter className="w-6 h-6 text-[#00f0ff]" />
                      </div>
                      <span className="text-gray-400 text-xs">Twitter / X</span>
                    </a>
                  )}
                  {businessTiktok && (
                    <a
                      href={tiktokHref}
                      rel="noopener noreferrer"
                      className="flex flex-col items-center gap-2 group"
                    >
                      <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-white/20 transition-colors">
                        <Music2 className="w-6 h-6 text-white" />
                      </div>
                      <span className="text-gray-400 text-xs">TikTok</span>
                    </a>
                  )}
                  {businessYoutube && (
                    <a
                      href={youtubeHref}
                      rel="noopener noreferrer"
                      className="flex flex-col items-center gap-2 group"
                    >
                      <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center group-hover:bg-red-500/30 transition-colors">
                        <Youtube className="w-6 h-6 text-red-400" />
                      </div>
                      <span className="text-gray-400 text-xs">YouTube</span>
                    </a>
                  )}
                  {businessWhatsapp && (
                    <a
                      href={whatsappHref}
                      rel="noopener noreferrer"
                      className="flex flex-col items-center gap-2 group"
                    >
                      <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center group-hover:bg-green-500/30 transition-colors">
                        <MessageCircle className="w-6 h-6 text-green-400" />
                      </div>
                      <span className="text-gray-400 text-xs">WhatsApp</span>
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
