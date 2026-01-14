'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, 
  Search, 
  MapPin, 
  Star, 
  Clock, 
  Calendar,
  ArrowLeft,
  Filter,
  X,
  ChevronDown,
  Sparkles,
  Award,
  TrendingUp,
  Heart,
  Share2
} from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { useI18n } from '@/lib/i18n/i18n-context';
import { HistoryBackButton } from '@/components/layout/history-back-button';

interface Barber {
  id: string;
  name: string;
  specialty: string;
  rating: number;
  reviewCount: number;
  experience?: string;
  location?: string;
  avatar?: string;
  price?: string;
  availability?: string;
  featured?: boolean;
  badges?: string[];
  isStylist?: boolean;
}

export default function BarberosPage() {
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const { t } = useI18n();

  const shareBarberProfile = async (barber: Barber) => {
    try {
      const origin = window.location.origin;
      const url = `${origin}/barberos/${barber.id}`;
      const title = barber.name ? `${barber.name} | JB Barbershop` : 'JB Barbershop';
      const shareName = (barber.name || '').trim() || t('barbers.barber');

      if (typeof navigator !== 'undefined' && 'share' in navigator) {
        try {
          await (navigator as any).share({
            title,
            text: t('barbers.shareProfileText', { name: shareName }),
            url,
          });
          return;
        } catch (err: any) {
          // User cancelled share sheet.
          if (err?.name === 'AbortError') return;
        }
      }

      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        toast.success(t('common.linkCopied'));
        return;
      }

      window.prompt(t('common.copyThisLinkPrompt'), url);
    } catch {
      toast.error(t('common.shareError'));
    }
  };

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const res = await fetch('/api/barbers');
        const data = await res.json();
        const apiBarbers = (data?.barbers || []) as Array<{
          id: string;
          specialties: string | null;
          profileImage: string | null;
          hourlyRate: number | null;
          avgRating: number;
          totalReviews: number;
          gender?: string | null;
          user: { name: string | null; image: string | null; role?: string | null };
        }>;

        const mapped: Barber[] = apiBarbers.map((b) => {
          const gender = String(b.gender || '').toUpperCase();
          const isStylist = gender === 'FEMALE';
          const roleLabel = isStylist ? t('barbers.stylist') : t('barbers.barber');

          const rawSpecialty = (b.specialties || '').trim();
          const looksLikeGenericBarber = /^(barber|barbero)$/i.test(rawSpecialty);
          const looksLikeGenericStylist = /^(stylist|estilista)$/i.test(rawSpecialty);

          const specialty = rawSpecialty
            ? (isStylist && looksLikeGenericBarber
                ? t('barbers.stylist')
                : (!isStylist && looksLikeGenericBarber)
                  ? t('barbers.barber')
                  : looksLikeGenericStylist
                    ? t('barbers.stylist')
                    : rawSpecialty)
            : roleLabel;

          return {
            id: b.id,
            name: b.user?.name || roleLabel,
            specialty,
            rating: typeof b.avgRating === 'number' ? b.avgRating : 0,
            reviewCount: typeof b.totalReviews === 'number' ? b.totalReviews : 0,
            avatar: b.profileImage || b.user?.image || undefined,
            price: b.hourlyRate != null ? `$${b.hourlyRate}/hr` : undefined,
            isStylist,
          };
        });

        if (!cancelled) {
          setBarbers(mapped);
          setLoading(false);
        }
      } catch (e) {
        console.error('Error fetching barbers:', e);
        if (!cancelled) {
          setBarbers([]);
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [t]);

  const sortedBarbers = [...barbers].sort((a, b) => {
    const aIsStylist = !!a.isStylist;
    const bIsStylist = !!b.isStylist;
    if (aIsStylist !== bIsStylist) return aIsStylist ? 1 : -1; // barbers first
    return b.rating - a.rating;
  });

  const toggleFavorite = (id: string) => {
    setFavorites(prev => {
      const newFavorites = new Set(prev);
      if (newFavorites.has(id)) {
        newFavorites.delete(id);
      } else {
        newFavorites.add(id);
      }
      return newFavorites;
    });
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Animated Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, 90, 0],
            opacity: [0.03, 0.05, 0.03]
          }}
          transition={{ duration: 20, repeat: Infinity }}
          className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-cyan-500/60 to-transparent rounded-full blur-3xl"
        />
        <motion.div
          animate={{
            scale: [1.2, 1, 1.2],
            rotate: [90, 0, 90],
            opacity: [0.03, 0.05, 0.03]
          }}
          transition={{ duration: 25, repeat: Infinity }}
          className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-amber-500/60 to-transparent rounded-full blur-3xl"
        />
      </div>

      <div className="relative z-10">
        {/* Hero Section */}
        <motion.section 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="relative pt-4 sm:pt-20 pb-10 px-4 sm:px-6 lg:px-8 overflow-hidden"
        >
          <div className="max-w-7xl mx-auto">
            <div className="mb-2 sm:mb-6 flex justify-start">
              <HistoryBackButton
                fallbackHref="/menu"
                variant="ghost"
                size="icon"
                aria-label={t('common.back')}
                className="text-gray-400 hover:text-[#00f0ff] hover:bg-transparent"
              >
                <ArrowLeft className="w-5 h-5" />
              </HistoryBackButton>
            </div>
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.6 }}
              className="text-center mb-6 sm:mb-12"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-black/30 border border-gray-800 mb-6"
              >
                <Sparkles className="w-4 h-4 text-[#00f0ff]" />
                <span className="text-sm font-semibold text-[#00f0ff]">{t('barbers.heroPill')}</span>
              </motion.div>
              
              <h1 className="text-5xl md:text-7xl font-bold mb-4 sm:mb-6 text-white">{t('barbers.theTeam')}</h1>
              
              <p className="text-xl text-gray-400 max-w-2xl mx-auto">
                {t('barbers.ourTeamSubtitle')}
              </p>
            </motion.div>
          </div>
        </motion.section>

        {/* Barbers Grid */}
        <section className="px-4 sm:px-6 lg:px-8 pb-20">
          <div className="max-w-7xl mx-auto">
            {loading ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-6 h-96 animate-pulse"
                  />
                ))}
              </div>
            ) : (
              <motion.div 
                layout
                className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
              >
                <AnimatePresence mode="popLayout">
                  {sortedBarbers.map((barber, index) => (
                    <motion.div
                      key={barber.id}
                      layout
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                      whileHover={{ y: -8, transition: { duration: 0.2 } }}
                      className="group relative"
                    >
                      {/* Featured Badge */}
                      {barber.featured && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="absolute -top-2 -right-2 z-10 px-3 py-1 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full shadow-lg"
                        >
                          <div className="flex items-center gap-1">
                            <Award className="w-3 h-3" />
                            <span className="text-xs font-bold">FEATURED</span>
                          </div>
                        </motion.div>
                      )}

                      <div className="relative bg-black/35 border border-gray-800 rounded-3xl p-6 overflow-hidden hover:border-[#00f0ff]/45 transition-all duration-300 h-full shadow-[0_14px_40px_rgba(0,0,0,0.55)]">

                        <div className="relative">
                          {/* Header */}
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-4">
                              <motion.div 
                                whileHover={{ scale: 1.1, rotate: 5 }}
                                className="relative"
                              >
                                <div className="absolute inset-0 bg-[#00f0ff] rounded-2xl blur-lg opacity-25 group-hover:opacity-35 transition-opacity duration-300" />
                                <div className="relative w-16 h-16 bg-gradient-to-br from-[#00f0ff] to-[#0099cc] rounded-2xl flex items-center justify-center border border-white/10">
                                  {barber.avatar ? (
                                    <img src={barber.avatar} alt={barber.name} className="w-full h-full rounded-2xl object-cover" />
                                  ) : (
                                    <User className="w-8 h-8 text-white" />
                                  )}
                                </div>
                              </motion.div>

                              <div className="flex-1">
                                <h3 className="text-lg font-bold text-white mb-1 group-hover:text-cyan-400 transition-colors duration-300">
                                  {barber.name}
                                </h3>
                                <p className="text-sm text-gray-400">{barber.specialty}</p>
                              </div>
                            </div>

                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => toggleFavorite(barber.id)}
                              className="p-2 rounded-xl bg-black/30 hover:bg-black/40 border border-gray-800 transition-colors duration-300"
                            >
                              <Heart 
                                className={`w-5 h-5 transition-colors duration-300 ${
                                  favorites.has(barber.id) ? 'fill-red-500 text-red-500' : 'text-gray-400'
                                }`} 
                              />
                            </motion.button>
                          </div>

                          {/* Badges */}
                          {barber.badges && barber.badges.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-4">
                              {barber.badges.map((badge, i) => (
                                <motion.span
                                  key={badge}
                                  initial={{ opacity: 0, scale: 0 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  transition={{ delay: 0.1 * i }}
                                  className="px-2 py-1 text-xs font-medium bg-gradient-to-r from-cyan-500/20 to-amber-500/20 border border-cyan-500/30 rounded-lg"
                                >
                                  {badge}
                                </motion.span>
                              ))}
                            </div>
                          )}

                          {/* Stats Grid */}
                          <div className="grid grid-cols-2 gap-3 mb-4">
                            <div className="flex items-center gap-2 p-3 bg-black/30 rounded-xl border border-gray-800">
                              <Star className="w-4 h-4 text-[#ffd700] fill-[#ffd700]" />
                              <div>
                                <div className="text-sm font-bold text-white">{barber.rating}</div>
                                <div className="text-xs text-gray-400">{barber.reviewCount} reviews</div>
                              </div>
                            </div>

                            {barber.experience ? (
                              <div className="flex items-center gap-2 p-3 bg-black/30 rounded-xl border border-gray-800">
                                <Clock className="w-4 h-4 text-[#00f0ff]" />
                                <div>
                                  <div className="text-sm font-bold text-white">{barber.experience}</div>
                                  <div className="text-xs text-gray-400">experience</div>
                                </div>
                              </div>
                            ) : null}
                          </div>

                          {/* Info */}
                          <div className="space-y-2 mb-4">
                            {barber.location ? (
                              <div className="flex items-center gap-2 text-sm text-gray-300">
                                <MapPin className="w-4 h-4 text-[#00f0ff]" />
                                <span>{barber.location}</span>
                              </div>
                            ) : null}
                            
                            {barber.price ? (
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-400">Price:</span>
                                <span className="font-bold text-[#ffd700]">{barber.price}</span>
                              </div>
                            ) : null}

                            {barber.availability ? (
                              <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-green-400" />
                                <span className="text-sm text-green-400 font-medium">{barber.availability}</span>
                              </div>
                            ) : null}
                          </div>

                          {/* Actions */}
                          <div className="flex gap-2">
                            <Link href={`/barberos/${barber.id}`} className="flex-1">
                              <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                className="w-full py-3 bg-gradient-to-r from-[#00f0ff] to-[#0099cc] hover:from-[#00f0ff] hover:to-[#00a6d6] rounded-xl font-semibold text-black shadow-lg shadow-[#00f0ff]/20 transition-all duration-300"
                              >
                                View Profile
                              </motion.button>
                            </Link>

                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => shareBarberProfile(barber)}
                              className="p-3 bg-black/30 hover:bg-black/40 rounded-xl border border-gray-800 transition-colors duration-300"
                              aria-label={`Share ${barber.name}'s profile`}
                            >
                              <Share2 className="w-5 h-5 text-gray-400" />
                            </motion.button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </motion.div>
            )}

            {/* No Results */}
            {!loading && sortedBarbers.length === 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-20"
              >
                <div className="bg-black/35 border border-gray-800 rounded-3xl p-12 max-w-md mx-auto shadow-[0_14px_40px_rgba(0,0,0,0.55)]">
                  <div className="w-20 h-20 bg-black/30 border border-gray-800 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Search className="w-10 h-10 text-gray-400" />
                  </div>
                  <h3 className="text-2xl font-bold mb-2">No results found</h3>
                  <p className="text-gray-400 mb-6">Try again in a moment.</p>
                </div>
              </motion.div>
            )}
          </div>
        </section>

        {/* CTA Section */}
        <motion.section
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="px-4 sm:px-6 lg:px-8 pb-20"
        >
          <div className="max-w-4xl mx-auto">
            <div className="relative backdrop-blur-xl bg-gradient-to-br from-cyan-500/10 to-amber-500/10 border border-cyan-500/30 rounded-3xl p-12 overflow-hidden">
              <motion.div
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.3, 0.5, 0.3]
                }}
                transition={{ duration: 8, repeat: Infinity }}
                className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-cyan-500 to-transparent rounded-full blur-3xl"
              />
              
              <div className="relative text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  whileInView={{ scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ type: "spring", stiffness: 200 }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-cyan-500/20 to-amber-500/20 border border-cyan-500/30 mb-6"
                >
                  <TrendingUp className="w-4 h-4 text-cyan-400" />
                  <span className="text-sm font-medium bg-gradient-to-r from-cyan-400 to-amber-400 bg-clip-text text-transparent">
                    Are you a professional?
                  </span>
                </motion.div>

                <h2 className="text-4xl font-bold mb-4 bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                  Join our platform
                </h2>
                <p className="text-xl text-gray-400 mb-8 max-w-2xl mx-auto">
                  Grow your clientele and manage bookings professionally.
                </p>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Link
                    href="/aplicar"
                    className="inline-flex px-8 py-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 rounded-xl font-bold text-white shadow-2xl shadow-amber-500/30 transition-all duration-300"
                  >
                    Apply to join our team
                  </Link>
                </motion.div>
              </div>
            </div>
          </div>
        </motion.section>
      </div>
    </div>
  );
}
