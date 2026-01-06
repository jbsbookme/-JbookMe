'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Calendar, User } from 'lucide-react';
import { useI18n } from '@/lib/i18n/i18n-context';
import { HistoryBackButton } from '@/components/layout/history-back-button';

interface Barber {
  id: string;
  profileImage?: string | null;
  gender?: 'MALE' | 'FEMALE' | 'BOTH' | null;
  user?: {
    name?: string | null;
    image?: string | null;
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

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] pb-24 pt-16">
        {/* Skeleton Loading */}
        <main className="container mx-auto px-4 py-12 max-w-7xl">
          <HistoryBackButton
            fallbackHref="/menu"
            variant="ghost"
            size="icon"
            aria-label="Back"
            className="mb-6 text-gray-400 hover:text-white hover:bg-[#1a1a1a]"
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
    <div className="min-h-screen bg-[#0a0a0a] pb-24 pt-16">
      <main className="container mx-auto px-4 py-12 max-w-7xl">
        <HistoryBackButton
          fallbackHref="/menu"
          variant="ghost"
          size="icon"
          aria-label="Back"
          className="mb-6 text-gray-400 hover:text-white hover:bg-[#1a1a1a]"
        >
          <ArrowLeft className="w-5 h-5" />
        </HistoryBackButton>

        <div className="mb-10">
          <div className="text-center mb-10">
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
                const isFemale = barber.gender === 'FEMALE';
                const ringClass = isFemale
                  ? 'border-[#ffd700]/60 from-[#ffd700]/10 to-[#ff69b4]/10'
                  : 'border-[#00f0ff]/60 from-[#00f0ff]/10 to-[#0099cc]/10';
                const iconClass = isFemale ? 'text-[#ffd700]/40' : 'text-[#00f0ff]/40';
                const buttonClass = isFemale
                  ? 'from-[#ffd700] to-[#ff69b4]'
                  : 'from-[#00f0ff] to-[#0099cc]';

                return (
                  <Card
                    key={barber.id}
                    className="bg-[#1a1a1a] border-gray-800 hover:border-gray-700 transition-colors"
                    style={{ animationDelay: `${index * 60}ms` }}
                  >
                    <CardContent className="p-6">
                      <div className="flex flex-col sm:flex-row gap-5 items-center sm:items-start text-center sm:text-left">
                        <div className="flex-shrink-0">
                          <div
                            className={`relative w-24 h-24 rounded-full overflow-hidden border-2 bg-gradient-to-br ${ringClass}`}
                          >
                            {barber.profileImage || barber.user?.image ? (
                              <Image
                                src={barber.profileImage || barber.user?.image || ''}
                                alt={barber.user?.name || t('barbers.barber')}
                                fill
                                sizes="96px"
                                className="object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <User className={`w-10 h-10 ${iconClass}`} />
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex-1 w-full">
                          <div className="mb-4">
                            <h2 className="text-white text-xl font-bold leading-tight">
                              {barber.user?.name || t('barbers.barber')}
                            </h2>
                            {barber.specialties ? (
                              <p className="text-gray-300 text-sm mt-1 line-clamp-2">{barber.specialties}</p>
                            ) : null}
                            {barber.bio ? (
                              <p className="text-gray-400 text-sm mt-2 line-clamp-3">{barber.bio}</p>
                            ) : null}
                            {barber.hourlyRate ? (
                              <div className="text-gray-400 text-sm mt-2">
                                ${barber.hourlyRate}/hr
                              </div>
                            ) : null}
                          </div>

                          <Link href={`/reservar?barberId=${barber.id}`} className="block w-full">
                            <Button className={`w-full bg-gradient-to-r ${buttonClass} text-black hover:opacity-90 font-bold`}>
                              <Calendar className="w-4 h-4 mr-2" />
                              {t('booking.bookAppointment')}
                            </Button>
                          </Link>
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
