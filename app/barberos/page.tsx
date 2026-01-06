'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Calendar, User, Star, Facebook, Instagram, Music2, Phone, MessageCircle } from 'lucide-react';
import { useI18n } from '@/lib/i18n/i18n-context';
import { HistoryBackButton } from '@/components/layout/history-back-button';

interface Barber {
  id: string;
  profileImage?: string | null;
  gender?: 'MALE' | 'FEMALE' | 'BOTH' | null;
  facebookUrl?: string | null;
  instagramUrl?: string | null;
  tiktokUrl?: string | null;
  whatsappUrl?: string | null;
  phone?: string | null;
  avgRating?: number;
  totalReviews?: number;
  user?: {
    name?: string | null;
    image?: string | null;
    phone?: string | null;
  };
  specialties?: string | null;
  bio?: string | null;
  hourlyRate?: number | null;
}

type BarbersApiResponse = { barbers?: Barber[] };

export default function BarberosPage() {
  const { t } = useI18n();
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBarbers();
  }, []);

  const fetchBarbers = async () => {
    try {
      const res = await fetch('/api/barbers');
      const data: unknown = await res.json();
      
      const payload = data as BarbersApiResponse;
      if (res.ok && Array.isArray(payload.barbers)) {
        setBarbers(payload.barbers);
      }
    } catch (error) {
      console.error('Error fetching barbers:', error);
    } finally {
      setLoading(false);
    }
  };

  const normalizeUrl = (url: string | null | undefined) => {
    const trimmed = url?.trim();
    if (!trimmed) return null;
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    return `https://${trimmed}`;
  };

  const normalizePhone = (phone: string | null | undefined) => {
    const trimmed = phone?.trim();
    if (!trimmed) return null;
    const cleaned = trimmed.replace(/[^\d+]/g, '');
    return cleaned || null;
  };

  const renderStars = () => {
    return (
      <div className="flex items-center gap-1">
        {Array.from({ length: 5 }).map((_, idx) => (
          <Star
            key={idx}
            className="h-5 w-5 text-gray-600"
            fill="none"
          />
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] pb-24 pt-2">
        {/* Skeleton Loading */}
        <main className="container mx-auto px-4 py-4 max-w-7xl">
          <HistoryBackButton
            fallbackHref="/menu"
            variant="ghost"
            size="icon"
            aria-label="Back"
            className="mb-4 text-gray-400 hover:text-white hover:bg-[#1a1a1a]"
          >
            <ArrowLeft className="w-5 h-5" />
          </HistoryBackButton>

          <div className="mb-16">
            <div className="text-center mb-12">
              <div className="h-12 bg-gray-800 rounded-lg w-64 mx-auto mb-4 animate-pulse"></div>
              <div className="h-6 bg-gray-800 rounded-lg w-96 mx-auto animate-pulse"></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Card key={i} className="bg-[#1a1a1a] border-gray-800">
                  <CardContent className="space-y-4 p-6">
                    <div className="relative w-24 h-24 mx-auto rounded-full overflow-hidden bg-gray-800 animate-pulse"></div>
                    <div className="h-6 bg-gray-800 rounded w-3/4 mx-auto animate-pulse"></div>
                    <div className="h-4 bg-gray-800 rounded w-5/6 mx-auto animate-pulse"></div>
                    <div className="h-6 bg-gray-800 rounded w-1/2 animate-pulse"></div>
                    <div className="h-4 bg-gray-800 rounded w-full animate-pulse"></div>
                    <div className="h-10 bg-gray-800 rounded w-full animate-pulse"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] pb-24 pt-2">
      <main className="container mx-auto px-4 py-4 max-w-7xl">
        <HistoryBackButton
          fallbackHref="/menu"
          variant="ghost"
          size="icon"
          aria-label="Back"
          className="mb-4 text-gray-400 hover:text-white hover:bg-[#1a1a1a]"
        >
          <ArrowLeft className="w-5 h-5" />
        </HistoryBackButton>

        <div className="mb-6">
          <div className="text-center mb-8">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              <span className="bg-gradient-to-r from-[#00f0ff] via-[#00d4ff] to-[#0099cc] bg-clip-text text-transparent drop-shadow-[0_0_30px_rgba(0,240,255,0.5)]">
                {t('barbers.ourTeam')}
              </span>
            </h1>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              {t('barbers.ourTeamSubtitle')}
            </p>
          </div>

          {barbers.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-gray-400 text-lg">{t('barbers.noBarbers')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {barbers.map((barber, index) => {
                const ringClass = 'border-[#00f0ff]/60 from-[#00f0ff]/10 to-[#0099cc]/10';
                const iconClass = 'text-[#00f0ff]/40';
                const buttonClass = 'from-[#00f0ff] to-[#0099cc]';

                const fbHref = normalizeUrl(barber.facebookUrl);
                const igHref = normalizeUrl(barber.instagramUrl);
                const ttHref = normalizeUrl(barber.tiktokUrl);

                const phoneRaw = barber.phone || barber.user?.phone || null;
                const phoneForLinks = normalizePhone(phoneRaw);
                const telHref = phoneForLinks ? `tel:${phoneForLinks}` : null;
                const chatHref = normalizeUrl(barber.whatsappUrl) || (phoneForLinks ? `sms:${phoneForLinks.replace(/\D/g, '')}` : null);
                const chatTarget = barber.whatsappUrl ? '_blank' : undefined;
                const chatRel = barber.whatsappUrl ? 'noreferrer noopener' : undefined;

                const avg = typeof barber.avgRating === 'number' ? barber.avgRating : 0;
                const reviews = typeof barber.totalReviews === 'number' ? barber.totalReviews : 0;

                return (
                  <Card
                    key={barber.id}
                    className="bg-[#1a1a1a] border-gray-800 hover:border-[#00f0ff]/40 transition-colors"
                    style={{ animationDelay: `${index * 60}ms` }}
                  >
                    <CardContent className="p-6 sm:p-8">
                      <div className="flex flex-col md:flex-row gap-6 sm:gap-8 items-center md:items-start text-center md:text-left">
                        <div className="flex-shrink-0">
                          <div
                            className={`relative w-28 h-28 sm:w-32 sm:h-32 rounded-full overflow-hidden border-2 bg-gradient-to-br ${ringClass}`}
                          >
                            {barber.profileImage || barber.user?.image ? (
                              <Image
                                src={barber.profileImage || barber.user?.image || ''}
                                alt={barber.user?.name || t('barbers.barber')}
                                fill
                                sizes="128px"
                                className="object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#00f0ff]/10 to-[#0099cc]/10">
                                <User className={`w-10 h-10 ${iconClass}`} />
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex-1 w-full">
                          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                            <div className="min-w-0">
                              <h2 className="text-white text-2xl font-bold leading-tight truncate">
                                {barber.user?.name || t('barbers.barber')}
                              </h2>
                              {barber.specialties ? (
                                <p className="text-[#00f0ff] text-sm sm:text-base mt-2 line-clamp-2">{barber.specialties}</p>
                              ) : null}
                            </div>
                            {/* Hourly rate removed from Team cards */}
                          </div>

                          <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-3 justify-center md:justify-start">
                            <div className="flex items-center gap-2 justify-center md:justify-start">
                              <Star className="h-6 w-6 text-[#ffd700]" fill="currentColor" />
                              <span className="text-[#ffd700] text-2xl font-bold">{avg.toFixed(1)}</span>
                            </div>
                            <div className="flex items-center justify-center md:justify-start gap-3">
                              {renderStars()}
                              <span className="text-gray-400 text-lg">({reviews} reviews)</span>
                            </div>
                          </div>

                          {barber.bio ? (
                            <p className="text-gray-400 mt-5 text-sm sm:text-base line-clamp-3">{barber.bio}</p>
                          ) : null}

                          <div className="mt-6 flex gap-2 justify-center md:justify-start flex-wrap">
                            {telHref ? (
                              <Button
                                asChild
                                variant="outline"
                                size="icon"
                                className="border-gray-700 bg-black/20 text-white hover:bg-gray-900 hover:text-[#00f0ff]"
                              >
                                <a href={telHref} aria-label="Call">
                                  <Phone className="h-4 w-4" />
                                </a>
                              </Button>
                            ) : (
                              <Button
                                variant="outline"
                                size="icon"
                                disabled
                                className="border-gray-800 bg-black/10 text-gray-600"
                                aria-label="Call (unavailable)"
                              >
                                <Phone className="h-4 w-4" />
                              </Button>
                            )}

                            {chatHref ? (
                              <Button
                                asChild
                                variant="outline"
                                size="icon"
                                className="border-gray-700 bg-black/20 text-white hover:bg-gray-900 hover:text-[#00f0ff]"
                              >
                                <a href={chatHref} aria-label="Message" target={chatTarget} rel={chatRel}>
                                  <MessageCircle className="h-4 w-4" />
                                </a>
                              </Button>
                            ) : (
                              <Button
                                variant="outline"
                                size="icon"
                                disabled
                                className="border-gray-800 bg-black/10 text-gray-600"
                                aria-label="Message (unavailable)"
                              >
                                <MessageCircle className="h-4 w-4" />
                              </Button>
                            )}

                            {fbHref ? (
                              <Button
                                asChild
                                variant="outline"
                                size="icon"
                                className="border-gray-700 bg-black/20 text-white hover:bg-gray-900 hover:text-[#00f0ff]"
                              >
                                <a href={fbHref} aria-label="Facebook" target="_blank" rel="noreferrer noopener">
                                  <Facebook className="h-4 w-4" />
                                </a>
                              </Button>
                            ) : (
                              <Button
                                variant="outline"
                                size="icon"
                                disabled
                                className="border-gray-800 bg-black/10 text-gray-600"
                                aria-label="Facebook (unavailable)"
                              >
                                <Facebook className="h-4 w-4" />
                              </Button>
                            )}

                            {igHref ? (
                              <Button
                                asChild
                                variant="outline"
                                size="icon"
                                className="border-gray-700 bg-black/20 text-white hover:bg-gray-900 hover:text-[#00f0ff]"
                              >
                                <a href={igHref} aria-label="Instagram" target="_blank" rel="noreferrer noopener">
                                  <Instagram className="h-4 w-4" />
                                </a>
                              </Button>
                            ) : (
                              <Button
                                variant="outline"
                                size="icon"
                                disabled
                                className="border-gray-800 bg-black/10 text-gray-600"
                                aria-label="Instagram (unavailable)"
                              >
                                <Instagram className="h-4 w-4" />
                              </Button>
                            )}

                            {ttHref ? (
                              <Button
                                asChild
                                variant="outline"
                                size="icon"
                                className="border-gray-700 bg-black/20 text-white hover:bg-gray-900 hover:text-[#00f0ff]"
                              >
                                <a href={ttHref} aria-label="TikTok" target="_blank" rel="noreferrer noopener">
                                  <Music2 className="h-4 w-4" />
                                </a>
                              </Button>
                            ) : (
                              <Button
                                variant="outline"
                                size="icon"
                                disabled
                                className="border-gray-800 bg-black/10 text-gray-600"
                                aria-label="TikTok (unavailable)"
                              >
                                <Music2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>

                          <div className="mt-6 flex justify-center md:justify-start">
                            <Link href={`/reservar?barberId=${barber.id}`} className="block w-full sm:w-auto">
                              <Button
                                className={`w-full sm:w-auto bg-gradient-to-r ${buttonClass} text-black hover:opacity-90 neon-glow text-base sm:text-lg px-6 sm:px-8 font-bold`}
                              >
                                <Calendar className="w-5 h-5 mr-2" />
                                {t('booking.bookAppointment')}
                              </Button>
                            </Link>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
