'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';

type Barber = {
  id: string;
  name: string;
  image?: string | null;
  rating?: number | null;
  reviewsCount?: number | null;
  specialty?: string | null;
};

function Stars({ value }: { value: number }) {
  const v = Math.max(0, Math.min(5, value));
  const full = Math.floor(v);
  const hasHalf = v - full >= 0.5;

  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }).map((_, i) => {
        const idx = i + 1;
        const filled = idx <= full;
        const half = !filled && hasHalf && idx === full + 1;

        return (
          <span key={i} className="text-[14px] leading-none">
            {filled ? (
              <span className="text-yellow-400">★</span>
            ) : half ? (
              <span className="text-yellow-400">☆</span>
            ) : (
              <span className="text-gray-600">★</span>
            )}
          </span>
        );
      })}
    </div>
  );
}

export default function HomePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [videoLoaded, setVideoLoaded] = useState(false);

  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [barbersLoading, setBarbersLoading] = useState(true);

  const authHrefFor = (callbackUrl: string) =>
    `/auth?callbackUrl=${encodeURIComponent(callbackUrl)}`;

  useEffect(() => {
    if (status === 'authenticated') {
      if (session?.user?.role === 'ADMIN') {
        router.push('/dashboard/admin');
      } else if (
        session?.user?.role === 'BARBER' ||
        session?.user?.role === 'STYLIST'
      ) {
        router.push('/dashboard/barbero');
      } else {
        router.push('/feed');
      }
    }
  }, [session, status, router]);

  // Load featured barbers (real)
  useEffect(() => {
    const fetchBarbers = async () => {
      try {
        setBarbersLoading(true);

        // ✅ CAMBIA ESTA URL si tu endpoint es diferente:
        const res = await fetch('/api/barbers?featured=true', { cache: 'no-store' });

        if (!res.ok) throw new Error('Failed to load barbers');
        const data = (await res.json()) as { barbers?: Array<{
          id: string;
          user?: { name?: string | null; image?: string | null } | null;
          profileImage?: string | null;
          specialties?: string | null;
          avgRating?: number | null;
          totalReviews?: number | null;
        }> };

        const cleaned = Array.isArray(data.barbers)
          ? data.barbers
              .map((barber) => ({
                id: barber.id,
                name: barber.user?.name || 'Barber',
                image: barber.profileImage || barber.user?.image || null,
                rating: barber.avgRating ?? 0,
                reviewsCount: barber.totalReviews ?? 0,
                specialty: barber.specialties || null,
              }))
              .slice(0, 3)
          : [];
        setBarbers(cleaned);
      } catch (e) {
        console.error(e);
        setBarbers([]);
      } finally {
        setBarbersLoading(false);
      }
    };

    void fetchBarbers();
  }, []);

  const featured = useMemo(() => {
    if (barbers.length > 0) return barbers.slice(0, 3);

    // Fallback pro (si todavía no hay data)
    return [
      { id: 'fallback-1', name: 'JB’s Crew', rating: 5, reviewsCount: 120, specialty: 'Fades • Beard • Style' },
      { id: 'fallback-2', name: 'Studio Barber', rating: 4.9, reviewsCount: 86, specialty: 'Modern cuts • Line up' },
      { id: 'fallback-3', name: 'Premium Barber', rating: 4.8, reviewsCount: 64, specialty: 'Clean finish • Detail' }
    ] as Barber[];
  }, [barbers]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#00f0ff]" />
      </div>
    );
  }

  if (status === 'authenticated') return null;

  return (
    <div className="relative min-h-screen bg-black overflow-hidden">
      {/* Background video */}
      <div className="absolute inset-0 w-full h-full pointer-events-none">
        <video
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
          poster="/poster.jpg"
          className="absolute inset-0 w-full h-full object-cover"
          onLoadedMetadata={() => setVideoLoaded(true)}
        >
          <source src="/intro-video.mp4" type="video/mp4" />
        </video>

        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black/80" />
      </div>

      {/* HERO */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: videoLoaded ? 1 : 0, y: videoLoaded ? 0 : 30 }}
          transition={{ duration: 1, delay: 0.4 }}
          className="max-w-4xl mx-auto"
        >
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="text-[clamp(32px,12vw,96px)] font-bold mb-6 leading-none tracking-tight"
          >
            <span className="relative inline-block whitespace-nowrap bg-gradient-to-r from-[#00f0ff] via-[#ffd700] to-[#00f0ff] bg-[length:200%_200%] bg-clip-text text-transparent animate-gradient">
              JBookMe
            </span>
          </motion.h1>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1 }}
            className="flex flex-col items-center gap-4 justify-center"
          >
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}>
              <Button
                asChild
                size="lg"
                className="relative overflow-hidden bg-gradient-to-r from-[#00f0ff] to-[#ffd700] text-black font-bold text-lg px-12 py-6 rounded-xl shadow-lg transition-all duration-300"
              >
                <Link href={authHrefFor('/reservar')}>
                  <span className="relative z-10">Book Now</span>
                  <span className="absolute inset-0 bg-gradient-to-r from-[#00f0ff] via-[#ffd700] to-[#00f0ff] opacity-30 blur-xl animate-pulse" />
                </Link>
              </Button>
            </motion.div>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 1.2 }}
              className="text-sm text-gray-300"
            >
              Choose your barber • Book instantly • Skip the wait
            </motion.p>

            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 1.4 }}>
              <Button asChild variant="outline" size="lg" className="border-gray-500/50 text-white hover:bg-white/10 px-12 py-6">
                <Link href={authHrefFor('/barberos')}>Find Your Barber</Link>
              </Button>
            </motion.div>
          </motion.div>
        </motion.div>
      </div>

      {/* FEATURED BARBERS */}
      <section className="relative z-10 bg-black px-6 pb-24">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true, amount: 0.3 }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-white">
              Featured <span className="text-[#00f0ff]">Barbers</span>
            </h2>
            <p style={{ textAlign: "center", color: "#aaa", fontSize: "14px", marginTop: "10px" }}>
              By booking an appointment, you agree to receive SMS notifications for confirmations and reminders from JB's Barbershop.
            </p>
            <p className="text-gray-400 mt-3">
              Pick your favorite — see ratings and book instantly.
            </p>
          </motion.div>

          {barbersLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[1, 2, 3].map((i) => (
                <div key={i} className="rounded-2xl overflow-hidden border border-gray-800 bg-[#0f0f0f]">
                  <div className="h-56 bg-gradient-to-b from-gray-900 to-black animate-pulse" />
                  <div className="p-6 space-y-3">
                    <div className="h-5 w-1/2 bg-gray-800 rounded animate-pulse" />
                    <div className="h-4 w-2/3 bg-gray-800 rounded animate-pulse" />
                    <div className="h-10 w-full bg-gray-800 rounded animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {featured.map((b, i) => {
                const rating = typeof b.rating === 'number' ? b.rating : 0;
                const reviews = typeof b.reviewsCount === 'number' ? b.reviewsCount : 0;

                return (
                  <motion.div
                    key={b.id}
                    initial={{ opacity: 0, y: 60 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7, delay: i * 0.12 }}
                    viewport={{ once: true, amount: 0.25 }}
                    className="group rounded-2xl overflow-hidden border border-gray-800 bg-[#0f0f0f] hover:border-[#00f0ff] transition-all"
                  >
                    <div className="h-60 relative bg-gradient-to-b from-gray-900 to-black overflow-hidden">
                      {b.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={b.image}
                          alt={b.name}
                          className="absolute inset-0 h-full w-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
                        />
                      ) : (
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(0,240,255,0.15),transparent_60%)]" />
                      )}

                      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-[radial-gradient(circle_at_top,rgba(0,240,255,0.22),transparent_60%)]" />
                    </div>

                    <div className="p-6">
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="text-xl font-semibold text-white">{b.name}</h3>
                        <div className="text-right">
                          <div className="flex justify-end">
                            <Stars value={rating} />
                          </div>
                          <p className="text-xs text-gray-400 mt-1">
                            {reviews > 0 ? `${rating.toFixed(1)} • ${reviews} reviews` : 'New • No reviews yet'}
                          </p>
                        </div>
                      </div>

                      <p className="text-gray-400 text-sm mt-3 mb-5">
                        {b.specialty || 'Modern cuts • Fades • Beard sculpt • Clean finish'}
                      </p>

                      <div className="grid grid-cols-2 gap-2">
                        <Link href={authHrefFor(`/barberos`)}>
                          <Button variant="outline" className="w-full border-gray-700 text-white hover:bg-white/10">
                            View
                          </Button>
                        </Link>
                        <Link href={authHrefFor(`/reservar`)}>
                          <Button className="w-full bg-[#00f0ff] text-black hover:bg-[#00d0dd]">
                            Book
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}

          <div className="mt-10 flex justify-center">
            <Link href={authHrefFor('/barberos')}>
              <Button variant="outline" className="border-gray-700 text-white hover:bg-white/10 px-10">
                See all barbers
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
