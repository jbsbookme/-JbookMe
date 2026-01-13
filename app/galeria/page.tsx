'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { Heart, Tag, Filter, User, Sparkles, X } from 'lucide-react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
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
  const [galleryMaleCircleImage, setGalleryMaleCircleImage] = useState<string | null>(null);
  const [galleryFemaleCircleImage, setGalleryFemaleCircleImage] = useState<string | null>(null);

  useEffect(() => {
    // Proteger la ruta - requiere autenticación
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
        
        // Extraer todos los tags únicos
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
      // Verificar likes para cada imagen
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

    // Filtrar por género
    if (selectedGender !== 'ALL') {
      filtered = filtered.filter(img => 
        img.gender === selectedGender || img.gender === 'UNISEX'
      );
    }

    // Filtrar por tag
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

  // Mostrar pantalla de carga mientras verifica autenticación o carga imágenes
  // Nota: la pantalla "Get Inspired" (selección) no requiere cargar imágenes.
  if (status === 'loading' || (loading && !showGenderSelection)) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#00f0ff]"></div>
      </div>
    );
  }

  // Si no está autenticado, no renderizar nada (ya redirige en useEffect)
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
      {/* Navbar con logo JBookMe */}
      {/* Título y Filtros */}
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

          {/* Filtros de género */}
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
                onClick={() => setSelectedImage(image)}
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

                {/* Like button sempre visível em mobile */}
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

        {/* Contador */}
        <div className="text-center mt-6 text-gray-500 text-sm">
          {t('gallery.showing')} {filteredImages.length} {t('gallery.of')} {images.length} {t('gallery.photos')}
        </div>
      </div>
      {/* Image Zoom Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex flex-col"
          onClick={() => setSelectedImage(null)}
        >
          <button
            onClick={() => setSelectedImage(null)}
            className="absolute top-4 right-4 z-50 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full p-3 transition-colors"
            aria-label={t('common.close')}
          >
            <X className="w-6 h-6 text-white" />
          </button>

          <div className="flex-1 w-full flex items-center justify-center p-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <TransformWrapper
              initialScale={1}
              minScale={0.5}
              maxScale={4}
              doubleClick={{ disabled: false }}
              wheel={{ step: 0.1 }}
            >
              <TransformComponent
                wrapperClass="!w-full !h-full flex items-center justify-center"
                contentClass="!w-auto !h-auto"
              >
                <div className="relative w-full h-full max-w-full max-h-full flex items-center justify-center">
                  <Image
                    src={selectedImage.imageUrl}
                    alt={selectedImage.title}
                    width={1200}
                    height={1200}
                    className="object-contain max-w-full max-h-full"
                    priority
                  />
                </div>
              </TransformComponent>
            </TransformWrapper>
          </div>

          {/* Image Info */}
          <div className="w-full bg-black/90 p-6 text-white">
            <h3 className="text-xl font-bold mb-2">{selectedImage.title}</h3>
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
