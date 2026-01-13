'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { User, Users, ArrowLeft } from 'lucide-react';
import { useI18n } from '@/lib/i18n/i18n-context';

export default function GaleriaGeneroPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [galleryMaleCircleImage, setGalleryMaleCircleImage] = useState<string | null>(null);
  const [galleryFemaleCircleImage, setGalleryFemaleCircleImage] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/settings', { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        setGalleryMaleCircleImage(data?.galleryMaleCircleImage ?? null);
        setGalleryFemaleCircleImage(data?.galleryFemaleCircleImage ?? null);
      } catch {
        // ignore
      }
    })();
  }, []);

  const handleGenderSelect = (gender: 'MALE' | 'FEMALE') => {
    router.push(`/galeria?gender=${gender}`);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white pb-24">
      {/* Header */}
      <div
        className="sticky top-0 z-40 bg-black/90 backdrop-blur-sm border-b border-gray-800"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-gray-400 hover:text-white"
                aria-label={t('common.back')}
                onClick={() => {
                  if (typeof window !== 'undefined' && window.history.length > 1) {
                    router.back();
                  } else {
                    router.push('/feed');
                  }
                }}
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl font-bold">{t('gallery.title')}</h1>
                <p className="text-xs sm:text-sm text-gray-400 break-words">{t('gallery.chooseWhatToExplore')}</p>
              </div>
            </div>

            <Button
              variant="outline"
              onClick={() => router.push('/galeria')}
              className="border-gray-700 text-white hover:bg-[#111111] self-start sm:self-auto"
            >
              {t('common.viewAll')}
            </Button>
          </div>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-10">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <h2 className="text-2xl sm:text-3xl font-bold">
            {t('gallery.selectGalleryTitle')}
          </h2>
          <p className="text-gray-400 mt-2">{t('gallery.selectGallerySubtitle')}</p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
            <Card
              role="button"
              tabIndex={0}
              onClick={() => handleGenderSelect('MALE')}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') handleGenderSelect('MALE');
              }}
              className="bg-[#111111] border-gray-800 hover:border-[#00f0ff]/60 transition-colors cursor-pointer"
            >
              <CardContent className="p-6 flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-[#00f0ff]/10 flex items-center justify-center">
                  {galleryMaleCircleImage ? (
                    <div className="relative w-14 h-14 rounded-full overflow-hidden">
                      <Image src={galleryMaleCircleImage} alt={t('gallery.men')} fill className="object-cover" />
                    </div>
                  ) : (
                    <User className="w-7 h-7 text-[#00f0ff]" />
                  )}
                </div>
                <div className="min-w-0">
                  <h3 className="text-lg font-bold text-white">{t('gallery.men')}</h3>
                  <p className="text-sm text-gray-300">{t('gallery.menCardSubtitle')}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card
              role="button"
              tabIndex={0}
              onClick={() => handleGenderSelect('FEMALE')}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') handleGenderSelect('FEMALE');
              }}
              className="bg-[#111111] border-gray-800 hover:border-[#ffd700]/60 transition-colors cursor-pointer"
            >
              <CardContent className="p-6 flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-[#ffd700]/10 flex items-center justify-center">
                  {galleryFemaleCircleImage ? (
                    <div className="relative w-14 h-14 rounded-full overflow-hidden">
                      <Image src={galleryFemaleCircleImage} alt={t('gallery.women')} fill className="object-cover" />
                    </div>
                  ) : (
                    <Users className="w-7 h-7 text-[#ffd700]" />
                  )}
                </div>
                <div className="min-w-0">
                  <h3 className="text-lg font-bold text-white">{t('gallery.women')}</h3>
                  <p className="text-sm text-gray-300">{t('gallery.womenCardSubtitle')}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
