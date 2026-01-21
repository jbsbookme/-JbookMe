'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, useMotionValue } from 'framer-motion';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, Heart, Tag, Filter, User, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { useI18n } from '@/lib/i18n/i18n-context';
import { HistoryBackButton } from '@/components/layout/history-back-button';

interface GalleryImage {
  id: string;
  imageUrl: string;
  title: string;
  description: string | null;
  tags: string[];
  gender: string | null;
  likes: number;
  barberId: string | null;
  barber?: {
    user?: {
      name: string | null;
    };
  };
}

export default function GaleriaPage() {
  const { t } = useI18n();
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [filteredImages, setFilteredImages] = useState<GalleryImage[]>([]);
  const [selectedGender, setSelectedGender] = useState<string>('ALL');
  const [selectedTag, setSelectedTag] = useState<string>('');
  const [likedImages, setLikedImages] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [showGenderSelection, setShowGenderSelection] = useState(true);
  const [selectedImage, setSelectedImage] = useState<GalleryImage | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const [isZoomedIn, setIsZoomedIn] = useState(false);
  const [imageScale, setImageScale] = useState(1);
  const imageX = useMotionValue(0);
  const imageY = useMotionValue(0);
  const pinchStartDistanceRef = useRef<number | null>(null);
  const pinchStartScaleRef = useRef<number>(1);
  const panStartRef = useRef<{ x: number; y: number } | null>(null);
  const panOriginRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const touchStartRef = useRef<{ x: number; y: number; t: number } | null>(null);
  const thumbsRef = useRef<HTMLDivElement | null>(null);
  const [galleryMaleCircleImage, setGalleryMaleCircleImage] = useState<string | null>(null);
  const [galleryFemaleCircleImage, setGalleryFemaleCircleImage] = useState<string | null>(null);

  const resetZoom = () => {
    setImageScale(1);
    imageX.set(0);
    imageY.set(0);
    pinchStartDistanceRef.current = null;
    panStartRef.current = null;
    panOriginRef.current = { x: 0, y: 0 };
  };

  const handleZoomTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.hypot(touch2.clientX - touch1.clientX, touch2.clientY - touch1.clientY);

      pinchStartDistanceRef.current = distance;
      pinchStartScaleRef.current = imageScale;
      panStartRef.current = null;
      return;
    }

    if (e.touches.length === 1 && imageScale > 1) {
      const touch = e.touches[0];
      panStartRef.current = { x: touch.clientX, y: touch.clientY };
      panOriginRef.current = { x: imageX.get(), y: imageY.get() };
    }
  };

  const handleZoomTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && pinchStartDistanceRef.current) {
      e.preventDefault();
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.hypot(touch2.clientX - touch1.clientX, touch2.clientY - touch1.clientY);

      const rawScale = pinchStartScaleRef.current * (distance / pinchStartDistanceRef.current);
      const nextScale = Math.min(Math.max(1, rawScale), 4);
      setImageScale(nextScale);
      return;
    }

    if (e.touches.length === 1 && panStartRef.current && imageScale > 1) {
      e.preventDefault();
      const touch = e.touches[0];
      const dx = touch.clientX - panStartRef.current.x;
      const dy = touch.clientY - panStartRef.current.y;
      imageX.set(panOriginRef.current.x + dx);
      imageY.set(panOriginRef.current.y + dy);
    }
  };

  const handleZoomTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length < 2) pinchStartDistanceRef.current = null;
    if (e.touches.length === 0) {
      panStartRef.current = null;
      if (imageScale < 1.05) resetZoom();
    }
  };

  const openAtIndex = useCallback(
    (index: number) => {
      if (filteredImages.length === 0) return;
      const normalized = (index + filteredImages.length) % filteredImages.length;
      setSelectedIndex(normalized);
      setSelectedImage(filteredImages[normalized]);
      requestAnimationFrame(() => resetZoom());
    },
    [filteredImages]
  );

  useEffect(() => {
    setIsZoomedIn(imageScale > 1.05);
  }, [imageScale]);

  const goNext = useCallback(() => {
    if (filteredImages.length <= 1) return;
    const base = selectedIndex >= 0 ? selectedIndex : 0;
    openAtIndex(base + 1);
  }, [filteredImages.length, openAtIndex, selectedIndex]);

  const goPrev = useCallback(() => {
    if (filteredImages.length <= 1) return;
    const base = selectedIndex >= 0 ? selectedIndex : 0;
    openAtIndex(base - 1);
  }, [filteredImages.length, openAtIndex, selectedIndex]);

  useEffect(() => {
    if (!selectedImage) {
      setSelectedIndex(-1);
      return;
    }
    const idx = filteredImages.findIndex((img) => img.id === selectedImage.id);
    if (idx === -1) {
      setSelectedImage(null);
      setSelectedIndex(-1);
      return;
    }
    setSelectedIndex(idx);
  }, [filteredImages, selectedImage]);

  useEffect(() => {
    if (!selectedImage) return;
    if (selectedIndex < 0) return;
    const container = thumbsRef.current;
    if (!container) return;
    const el = container.querySelector(`[data-thumb-idx="${selectedIndex}"]`) as HTMLElement | null;
    if (!el) return;

    const containerRect = container.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    const elCenter = elRect.left + elRect.width / 2;
    const containerCenter = containerRect.left + containerRect.width / 2;
    const delta = elCenter - containerCenter;
    if (Math.abs(delta) < 4) return;

    container.scrollTo({ left: container.scrollLeft + delta, behavior: 'smooth' });
  }, [selectedImage, selectedIndex]);

  useEffect(() => {
    if (!selectedImage) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedImage(null);
        return;
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        goNext();
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goPrev();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [goNext, goPrev, selectedImage]);

  useEffect(() => {
    // Protect this route - requires authentication
    if (status === 'unauthenticated') {
      router.push('/auth');
      return;
    }
    
    if (status === 'authenticated') {
      // Check if gender is in URL
      const genderParam = searchParams?.get('gender');
      if (genderParam) {
        const newGender = genderParam.toUpperCase();
        setSelectedGender(newGender);
        setShowGenderSelection(false);
      }
    }
  }, [session, status, router, searchParams]);

  useEffect(() => {
    if (status !== 'authenticated') return;

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
  }, [status]);

  const fetchGalleryImages = useCallback(async (): Promise<GalleryImage[]> => {
    try {
      setLoading(true);
      const genderParam = selectedGender && selectedGender !== 'ALL' ? `?gender=${selectedGender}` : '';
      const response = await fetch(`/api/gallery${genderParam}`);
      if (response.ok) {
        const data = await response.json();
        setImages(data);
        
        // Extract all unique tags
        const tags = new Set<string>();
        data.forEach((img: GalleryImage) => {
          img.tags?.forEach(tag => tags.add(tag));
        });
        setAllTags(Array.from(tags));

        return data;
      }
    } catch (error) {
      console.error('Error fetching gallery:', error);
    } finally {
      setLoading(false);
    }
    return [];
  }, [selectedGender]);

  const fetchLikedImages = useCallback(async (galleryImages: GalleryImage[]) => {
    try {
      const liked = new Set<string>();
      // Check likes for each image
      for (const img of galleryImages) {
        const response = await fetch(`/api/gallery/${img.id}/like`);
        if (response.ok) {
          const data = await response.json();
          if (data.liked) {
            liked.add(img.id);
          }
        }
      }
      setLikedImages(liked);
    } catch (error) {
      console.error('Error fetching liked images:', error);
    }
  }, []);

  const filterImages = useCallback(() => {
    let filtered = [...images];

    // Filter by gender
    if (selectedGender !== 'ALL') {
      filtered = filtered.filter(img => 
        img.gender === selectedGender || img.gender === 'UNISEX'
      );
    }

    // Filter by tag
    if (selectedTag) {
      filtered = filtered.filter(img => 
        img.tags?.includes(selectedTag)
      );
    }

    setFilteredImages(filtered);
  }, [images, selectedGender, selectedTag]);

  // Separate effect to fetch images when gender changes
  useEffect(() => {
    if (status === 'authenticated' && !showGenderSelection) {
      (async () => {
        const galleryImages = await fetchGalleryImages();
        if (session?.user) {
          await fetchLikedImages(galleryImages);
        }
      })();
    }
  }, [status, showGenderSelection, session?.user, fetchGalleryImages, fetchLikedImages]);

  useEffect(() => {
    filterImages();
  }, [filterImages]);

  const handleLike = async (imageId: string) => {
    if (!session?.user) {
      toast.error(t('gallery.mustLogin'));
      return;
    }

    try {
      const response = await fetch(`/api/gallery/${imageId}/like`, {
        method: 'POST'
      });

      if (response.ok) {
        const data = await response.json();
        
        // Actualizar estado de like
        setLikedImages(prev => {
          const newSet = new Set(prev);
          if (data.liked) {
            newSet.add(imageId);
          } else {
            newSet.delete(imageId);
          }
          return newSet;
        });

        // Actualizar contador de likes
        setImages(prev => prev.map(img => 
          img.id === imageId 
            ? { ...img, likes: data.likes } 
            : img
        ));
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      toast.error(t('gallery.likeError'));
    }
  };

  // Show loading screen while checking authentication or loading images
  // Note: the "Get Inspired" selection screen doesn't require loading images.
  if (status === 'loading' || (loading && !showGenderSelection)) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#00f0ff]"></div>
      </div>
    );
  }

  // If unauthenticated, render nothing (useEffect already redirects)
  if (status === 'unauthenticated') {
    return null;
  }

  // Render gender selection view
  if (showGenderSelection) {
    return (
      <div className="min-h-screen bg-black pb-24">
        <div className="sticky top-0 z-40 bg-black/90 backdrop-blur-sm border-b border-gray-800">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center gap-3">
              <HistoryBackButton
                fallbackHref="/menu"
                variant="ghost"
                size="icon"
                aria-label={t('common.back')}
                className="text-gray-400 hover:text-white"
              >
                <span aria-hidden>←</span>
              </HistoryBackButton>
              <div className="min-w-0">
                <div className="text-white font-semibold truncate">{t('gallery.title')}</div>
                <div className="text-xs text-gray-400 truncate">{t('gallery.chooseWhatToExplore')}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-4xl mx-auto"
          >
            <h1 className="text-4xl font-bold text-center mb-4">
              <Sparkles className="inline w-10 h-10 text-[#ffd700] mr-3" />
              <span className="text-white">{t('gallery.title')}</span>
            </h1>
            <p className="text-gray-400 text-center text-lg mb-12">
              {t('gallery.chooseWhatToExplore')}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Men Option */}
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => router.push('/galeria?gender=MALE')}
                className="cursor-pointer"
              >
                <Card className="bg-gray-900 border-gray-800 hover:border-[#00f0ff] transition-all duration-300 overflow-hidden group">
                  <div className="relative h-80 bg-gradient-to-br from-blue-500/20 to-cyan-500/20">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <div className="relative w-32 h-32 mx-auto mb-6 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 shadow-[0_0_40px_rgba(59,130,246,0.5)] overflow-hidden">
                          {galleryMaleCircleImage ? (
                            <Image src={galleryMaleCircleImage} alt={t('gallery.men')} fill className="object-cover" />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center">
                              <User className="w-16 h-16 text-white" />
                            </div>
                          )}
                        </div>
                        <h3 className="text-3xl font-bold text-white mb-2">{t('gallery.men')}</h3>
                        <p className="text-gray-400">{t('gallery.menCardSubtitle')}</p>
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>

              {/* Women Option */}
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => router.push('/galeria?gender=FEMALE')}
                className="cursor-pointer"
              >
                <Card className="bg-gray-900 border-gray-800 hover:border-[#ff1493] transition-all duration-300 overflow-hidden group">
                  <div className="relative h-80 bg-gradient-to-br from-pink-500/20 to-purple-500/20">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <div className="relative w-32 h-32 mx-auto mb-6 rounded-full bg-gradient-to-br from-pink-500 to-purple-500 shadow-[0_0_40px_rgba(236,72,153,0.5)] overflow-hidden">
                          {galleryFemaleCircleImage ? (
                            <Image src={galleryFemaleCircleImage} alt={t('gallery.women')} fill className="object-cover" />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center">
                              <User className="w-16 h-16 text-white" />
                            </div>
                          )}
                        </div>
                        <h3 className="text-3xl font-bold text-white mb-2">{t('gallery.women')}</h3>
                        <p className="text-gray-400">{t('gallery.womenCardSubtitle')}</p>
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black pb-24">
      {/* Navbar with JBookMe logo */}
      {/* Title and filters */}
      <div className="bg-black/95 backdrop-blur-sm border-b border-gray-800">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <HistoryBackButton
              fallbackHref="/galeria-genero"
              variant="ghost"
              size="icon"
              aria-label={t('common.back')}
              className="text-gray-400 hover:text-white"
            >
              <span aria-hidden>←</span>
            </HistoryBackButton>
            <h1 className="text-2xl font-bold text-white text-center flex-1">
              <Sparkles className="inline w-6 h-6 text-[#ffd700] mr-2" />
              {t('gallery.title')}
            </h1>
            <div className="w-10" />
          </div>

          {/* Gender filters */}
          <div className="flex gap-2 mb-3">
            <Button
              onClick={() => {
                setSelectedGender('ALL');
                router.push('/galeria?gender=ALL');
              }}
              variant={selectedGender === 'ALL' ? 'default' : 'outline'}
              size="sm"
              className={selectedGender === 'ALL' 
                ? 'bg-gradient-to-r from-[#00f0ff] to-[#0099cc] text-black' 
                : 'border-gray-700 text-gray-400'}
            >
              {t('common.all')}
            </Button>
            <Button
              onClick={() => {
                setSelectedGender('MALE');
                router.push('/galeria?gender=MALE');
              }}
              variant={selectedGender === 'MALE' ? 'default' : 'outline'}
              size="sm"
              className={selectedGender === 'MALE' 
                ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white' 
                : 'border-gray-700 text-gray-400'}
            >
              <User className="w-3 h-3 mr-1" />
              {t('gallery.men')}
            </Button>
            <Button
              onClick={() => {
                setSelectedGender('FEMALE');
                router.push('/galeria?gender=FEMALE');
              }}
              variant={selectedGender === 'FEMALE' ? 'default' : 'outline'}
              size="sm"
              className={selectedGender === 'FEMALE' 
                ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white' 
                : 'border-gray-700 text-gray-400'}
            >
              <User className="w-3 h-3 mr-1" />
              {t('gallery.women')}
            </Button>
          </div>

          {/* Tags */}
          {allTags.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              <Button
                onClick={() => setSelectedTag('')}
                variant={!selectedTag ? 'default' : 'outline'}
                size="sm"
                className={!selectedTag 
                  ? 'bg-[#ffd700] text-black' 
                  : 'border-gray-700 text-gray-400'}
              >
                <Tag className="w-3 h-3 mr-1" />
                {t('gallery.allTags')}
              </Button>
              {allTags.map(tag => (
                <Button
                  key={tag}
                  onClick={() => setSelectedTag(tag)}
                  variant={selectedTag === tag ? 'default' : 'outline'}
                  size="sm"
                  className={selectedTag === tag 
                    ? 'bg-[#ffd700] text-black whitespace-nowrap' 
                    : 'border-gray-700 text-gray-400 whitespace-nowrap'}
                >
                  {tag}
                </Button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Gallery Grid (Instagram Style) */}
      <div className="container mx-auto px-4 py-6">
        {filteredImages.length === 0 ? (
          <div className="text-center py-20">
            <Filter className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 text-lg">{t('gallery.noImages')}</p>
            <p className="text-gray-500 mt-2">{t('gallery.tryOtherFilters')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-1">
            {filteredImages.map((image, index) => (
              <motion.div
                key={image.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => {
                  setSelectedImage(image);
                  setSelectedIndex(index);
                }}
                className="relative aspect-square group cursor-pointer overflow-hidden bg-gray-900"
              >
                <Image
                  src={image.imageUrl}
                  alt={image.title}
                  fill
                  sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
                  className="object-cover"
                  loading={index < 8 ? "eager" : "lazy"}
                  priority={index < 4}
                />
                
                {/* Overlay on hover */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
                  <h3 className="text-white font-bold text-sm mb-1">{image.title}</h3>
                  {image.barber?.user?.name && (
                    <p className="text-[#00f0ff] text-xs mb-2">{t('gallery.by')} {image.barber.user.name}</p>
                  )}
                  
                  {/* Tags */}
                  {image.tags && image.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {image.tags.slice(0, 2).map(tag => (
                        <span
                          key={tag}
                          className="text-xs bg-gray-800/80 text-gray-300 px-2 py-0.5 rounded-full"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleLike(image.id);
                      }}
                      className="flex items-center gap-1 text-white hover:scale-110 transition-transform"
                    >
                      <Heart
                        className={`w-5 h-5 ${
                          likedImages.has(image.id)
                            ? 'fill-red-500 text-red-500'
                            : 'fill-transparent'
                        }`}
                      />
                      <span className="text-sm font-semibold">{image.likes || 0}</span>
                    </button>
                  </div>
                </div>

                {/* Like button always visible on mobile */}
                <div className="absolute bottom-2 right-2 md:hidden">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleLike(image.id);
                    }}
                    className="bg-black/60 backdrop-blur-sm rounded-full p-2 shadow-lg"
                  >
                    <Heart
                      className={`w-5 h-5 ${
                        likedImages.has(image.id)
                          ? 'fill-red-500 text-red-500'
                          : 'text-white fill-transparent'
                      }`}
                    />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Counter */}
        <div className="text-center mt-6 text-gray-500 text-sm">
          {t('gallery.showing')} {filteredImages.length} {t('gallery.of')} {images.length} {t('gallery.photos')}
        </div>
      </div>
      {/* Image Zoom Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 bg-black/95"
          onClick={() => setSelectedImage(null)}
        >
          {filteredImages.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  goPrev();
                }}
                className="absolute left-3 md:left-6 top-1/2 -translate-y-1/2 z-50 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full p-3 transition-colors"
                aria-label={t('common.previous')}
              >
                <ChevronLeft className="w-6 h-6 text-white" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  goNext();
                }}
                className="absolute right-3 md:right-6 top-1/2 -translate-y-1/2 z-50 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full p-3 transition-colors"
                aria-label={t('common.next')}
              >
                <ChevronRight className="w-6 h-6 text-white" />
              </button>
            </>
          )}

          <button
            onClick={() => setSelectedImage(null)}
            className="absolute top-4 right-4 z-50 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full p-3 transition-colors"
            aria-label={t('common.close')}
          >
            <X className="w-6 h-6 text-white" />
          </button>

          <div
            className="absolute inset-0 flex items-center justify-center p-4 pb-40 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
            onTouchStart={(e) => {
              if (isZoomedIn) {
                touchStartRef.current = null;
                return;
              }
              if (e.touches.length !== 1) {
                touchStartRef.current = null;
                return;
              }
              const touch = e.touches[0];
              touchStartRef.current = { x: touch.clientX, y: touch.clientY, t: Date.now() };
            }}
            onTouchEnd={(e) => {
              const start = touchStartRef.current;
              touchStartRef.current = null;
              if (!start) return;
              if (isZoomedIn) return;
              const touch = e.changedTouches?.[0];
              if (!touch) return;
              const endX = touch.clientX;
              const endY = touch.clientY;
              const deltaX = start.x - endX;
              const deltaY = start.y - endY;
              const dt = Date.now() - start.t;

              // Require a fast, mostly-horizontal swipe.
              if (dt > 600) return;
              if (Math.abs(deltaX) < 120) return;
              if (Math.abs(deltaX) < Math.abs(deltaY) * 1.2) return;

              if (deltaX > 0) goNext();
              else goPrev();
            }}
          >
            <motion.div
              className="relative w-full h-full flex items-center justify-center"
              drag={imageScale > 1}
              dragElastic={0.08}
              dragMomentum={false}
              style={{
                scale: imageScale,
                x: imageX,
                y: imageY,
                touchAction: 'none',
                cursor: imageScale > 1 ? 'move' : 'default',
              }}
              onTouchStart={handleZoomTouchStart}
              onTouchMove={handleZoomTouchMove}
              onTouchEnd={handleZoomTouchEnd}
              onDoubleClick={(e) => {
                e.stopPropagation();
                if (imageScale === 1) {
                  setImageScale(2);
                } else {
                  resetZoom();
                }
              }}
              whileTap={{ cursor: imageScale > 1 ? 'grabbing' : 'default' }}
            >
              <div className="relative w-[92vw] h-[78vh]">
                <Image
                  src={selectedImage.imageUrl}
                  alt={selectedImage.title}
                  fill
                  sizes="100vw"
                  className="object-contain select-none"
                  priority
                  draggable={false}
                />
              </div>
            </motion.div>
          </div>

          {/* Image Info */}
          <div className="absolute bottom-0 left-0 right-0 bg-black/90 p-6 text-white">
            {filteredImages.length > 1 && selectedIndex >= 0 && (
              <div
                ref={thumbsRef}
                className={`mb-4 flex gap-2 overflow-x-auto pb-1 transition-all duration-200 ${
                  isZoomedIn ? 'max-h-0 opacity-0 pointer-events-none' : 'max-h-24 opacity-100'
                }`}
                style={{ WebkitOverflowScrolling: 'touch' }}
                onClick={(e) => e.stopPropagation()}
              >
                {filteredImages.map((img, idx) => (
                  <button
                    key={img.id}
                    type="button"
                    data-thumb-idx={idx}
                    onClick={() => openAtIndex(idx)}
                    className={
                      idx === selectedIndex
                        ? 'shrink-0 rounded-md ring-2 ring-[#00f0ff] ring-offset-0'
                        : 'shrink-0 rounded-md opacity-80 hover:opacity-100'
                    }
                    aria-label={`${t('gallery.photos')} ${idx + 1}`}
                  >
                    <Image
                      src={img.imageUrl}
                      alt={img.title}
                      width={72}
                      height={72}
                      className="h-16 w-16 md:h-[72px] md:w-[72px] rounded-md object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
            <h3 className="text-xl font-bold mb-2">{selectedImage.title}</h3>
            {filteredImages.length > 1 && selectedIndex >= 0 && (
              <p className="text-xs text-gray-400 mb-2">
                {selectedIndex + 1} / {filteredImages.length}
              </p>
            )}
            {selectedImage.barber?.user?.name && (
              <p className="text-[#00f0ff] text-sm mb-2">
                {t('gallery.by')} {selectedImage.barber.user.name}
              </p>
            )}
            {selectedImage.tags && selectedImage.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedImage.tags.map(tag => (
                  <span
                    key={tag}
                    className="text-xs bg-white/10 backdrop-blur-sm text-gray-300 px-3 py-1 rounded-full"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
            <p className="text-xs text-gray-400 mt-3">
              {t('gallery.zoomHint')}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
