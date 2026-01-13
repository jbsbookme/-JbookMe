'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';

export default function HomePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [videoLoaded, setVideoLoaded] = useState(false);

  const authHrefFor = (callbackUrl: string) => `/auth?callbackUrl=${encodeURIComponent(callbackUrl)}`;

  useEffect(() => {
    if (status === 'authenticated') {
      if (session?.user?.role === 'ADMIN') {
        router.push('/dashboard/admin');
      } else if (session?.user?.role === 'BARBER' || session?.user?.role === 'STYLIST') {
        router.push('/dashboard/barbero');
      } else {
        router.push('/feed');
      }
    }
  }, [session, status, router]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#00f0ff]"></div>
      </div>
    );
  }

  if (status === 'authenticated') {
    return null;
  }

  return (
    <div className="relative min-h-screen bg-black overflow-hidden">
      {/* Video de fondo */}
      <div className="absolute inset-0 w-full h-full">
        <video
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
          className="absolute inset-0 w-full h-full object-cover"
          onLoadedMetadata={() => setVideoLoaded(true)}
        >
          <source src="/intro-video.mp4" type="video/mp4" />
        </video>
        
        {/* Overlay oscuro para mejor legibilidad */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black/80"></div>
      </div>

      {/* Contenido sobre el video */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: videoLoaded ? 1 : 0, y: videoLoaded ? 0 : 30 }}
          transition={{ duration: 1, delay: 0.5 }}
          className="max-w-4xl mx-auto"
        >
          {/* Título principal */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="text-6xl md:text-8xl font-bold mb-6"
          >
            <span className="bg-gradient-to-r from-[#00f0ff] via-[#ffd700] to-[#00f0ff] bg-clip-text text-transparent">
              JBookMe
            </span>
          </motion.h1>

          {/* Botones de acción */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1 }}
            className="flex flex-col items-center gap-3 justify-center"
          >
            <Link href={authHrefFor('/barberos')}>
              <Button
                size="lg"
                className="bg-gradient-to-r from-[#00f0ff] to-[#ffd700] text-black font-bold text-lg px-12 py-6 hover:shadow-[0_0_40px_rgba(0,240,255,0.8)] transition-all duration-300 group"
              >
                Find Your Barber
              </Button>
            </Link>

            <p className="text-sm text-gray-300">Start your experience</p>
          </motion.div>

          {/* Scroll indicator */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 1.5 }}
            className="absolute bottom-8 left-1/2 transform -translate-x-1/2"
          >
            <motion.div
              animate={{ y: [0, 10, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="text-gray-400 text-sm flex flex-col items-center gap-2"
            >
              <span>Swipe to explore</span>
              <div className="w-6 h-10 border-2 border-gray-400 rounded-full flex items-start justify-center p-2">
                <motion.div
                  animate={{ y: [0, 12, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="w-1.5 h-1.5 bg-gray-400 rounded-full"
                />
              </div>
            </motion.div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
