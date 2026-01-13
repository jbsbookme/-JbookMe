'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { useSession } from 'next-auth/react';
import { Heart } from 'lucide-react';
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
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
      {localImages.map((image) => (
        <div
          key={image.id}
          className="relative aspect-square overflow-hidden bg-gray-900 rounded-lg"
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
                  onClick={() => handleLike(image.id)}
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
  );
}
