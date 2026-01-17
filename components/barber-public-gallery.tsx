'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { useSession } from 'next-auth/react';
import { Heart, X } from 'lucide-react';
import { TransformComponent, TransformWrapper } from 'react-zoom-pan-pinch';
import { toast } from 'sonner';
import { useI18n } from '@/lib/i18n/i18n-context';

export type BarberPublicGalleryImage = {
  id: string;
  imageUrl: string;
  title: string;
  likes: number;
  likeable?: boolean;
};

type Props = {
  images: BarberPublicGalleryImage[];
};

export function BarberPublicGallery({ images }: Props) {
  const { t } = useI18n();
  const { data: session, status } = useSession();
  const [likedImages, setLikedImages] = useState<Set<string>>(new Set());
  const [localImages, setLocalImages] = useState<BarberPublicGalleryImage[]>(images);
  const [selectedImage, setSelectedImage] = useState<BarberPublicGalleryImage | null>(null);

  useEffect(() => {
    setLocalImages(images);
  }, [images]);

  const likeableImageIds = useMemo(
    () => localImages.filter((img) => img.likeable !== false).map((img) => img.id),
    [localImages]
  );

  const fetchLikedImages = useCallback(async () => {
    if (status !== 'authenticated') return;
    if (!session?.user) return;
    if (likeableImageIds.length === 0) {
      setLikedImages(new Set());
      return;
    }

    try {
      const results = await Promise.all(
        likeableImageIds.map(async (id) => {
          const res = await fetch(`/api/gallery/${id}/like`);
          if (!res.ok) return { id, liked: false };
          const data = (await res.json()) as { liked?: boolean };
          return { id, liked: Boolean(data.liked) };
        })
      );

      const liked = new Set<string>();
      for (const r of results) {
        if (r.liked) liked.add(r.id);
      }
      setLikedImages(liked);
    } catch (error) {
      console.error('Error fetching liked images:', error);
    }
  }, [likeableImageIds, session?.user, status]);

  useEffect(() => {
    void fetchLikedImages();
  }, [fetchLikedImages]);

  useEffect(() => {
    if (!selectedImage) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedImage(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedImage]);

  const handleLike = async (imageId: string) => {
    const img = localImages.find((i) => i.id === imageId);
    if (img?.likeable === false) return;
    if (!session?.user) {
      toast.error(t('gallery.mustLogin'));
      return;
    }

    try {
      const response = await fetch(`/api/gallery/${imageId}/like`, {
        method: 'POST',
      });

      if (!response.ok) {
        toast.error(t('gallery.likeError'));
        return;
      }

      const data = (await response.json()) as { liked: boolean; likes: number };

      setLikedImages((prev) => {
        const next = new Set(prev);
        if (data.liked) next.add(imageId);
        else next.delete(imageId);
        return next;
      });

      setLocalImages((prev) =>
        prev.map((img) => (img.id === imageId ? { ...img, likes: data.likes } : img))
      );
    } catch (error) {
      console.error('Error toggling like:', error);
      toast.error(t('gallery.likeError'));
    }
  };

  if (localImages.length === 0) {
    return <p className="text-gray-400">{t('gallery.noPhotos')}</p>;
  }

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
        {localImages.map((image) => (
          <div
            key={image.id}
            role="button"
            tabIndex={0}
            onClick={() => setSelectedImage(image)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') setSelectedImage(image);
            }}
            className="relative aspect-square overflow-hidden bg-gray-900 rounded-lg cursor-pointer"
            aria-label={t('gallery.galleryImageAlt')}
          >
            <Image
              src={image.imageUrl}
              alt={image.title}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
              className="object-cover"
            />

            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3">
              <div className="flex items-end justify-between gap-2">
                <p className="text-white text-xs font-semibold line-clamp-2">{image.title}</p>
                {image.likeable === false ? null : (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      void handleLike(image.id);
                    }}
                    className="flex items-center gap-1 text-white"
                    aria-label={likedImages.has(image.id) ? t('feed.unlike') : t('feed.like')}
                  >
                    <Heart
                      className={`w-5 h-5 ${
                        likedImages.has(image.id)
                          ? 'fill-red-500 text-red-500'
                          : 'fill-transparent text-white'
                      }`}
                    />
                    <span className="text-xs font-semibold">{image.likes || 0}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {selectedImage && (
        <div
          className="fixed inset-0 z-50 bg-black/95"
          onClick={() => setSelectedImage(null)}
        >
          <button
            type="button"
            onClick={() => setSelectedImage(null)}
            className="absolute top-4 right-4 z-50 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full p-3 transition-colors"
            aria-label={t('common.close')}
          >
            <X className="w-6 h-6 text-white" />
          </button>

          <div
            className="absolute inset-0 flex items-center justify-center p-4 pb-28 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <TransformWrapper
              initialScale={1}
              minScale={0.8}
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
                    width={1400}
                    height={1400}
                    className="object-contain max-w-full max-h-full"
                    priority
                  />
                </div>
              </TransformComponent>
            </TransformWrapper>
          </div>

          <div className="absolute bottom-0 left-0 right-0 bg-black/90 p-4 text-white">
            <p className="text-sm font-semibold">{selectedImage.title}</p>
            <p className="text-xs text-gray-400 mt-1">{t('gallery.zoomHint')}</p>
          </div>
        </div>
      )}
    </>
  );
}
