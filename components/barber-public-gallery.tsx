'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { useSession } from 'next-auth/react';
import { ChevronLeft, ChevronRight, Heart, X } from 'lucide-react';
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
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const zoomRef = useRef<any>(null);
  const zoomedInRef = useRef(false);
  const [isZoomedIn, setIsZoomedIn] = useState(false);
  const touchStartRef = useRef<{ x: number; y: number; t: number } | null>(null);
  const tapStateRef = useRef<{ count: number; lastAt: number; timeoutId: number | null }>({
    count: 0,
    lastAt: 0,
    timeoutId: null,
  });
  const thumbsRef = useRef<HTMLDivElement | null>(null);

  const openAtIndex = useCallback(
    (index: number) => {
      if (localImages.length === 0) return;
      const normalized = (index + localImages.length) % localImages.length;
      setSelectedIndex(normalized);
      setSelectedImage(localImages[normalized]);
      requestAnimationFrame(() => zoomRef.current?.resetTransform?.(0));
    },
    [localImages]
  );

  const goNext = useCallback(() => {
    if (localImages.length <= 1) return;
    const base = selectedIndex >= 0 ? selectedIndex : 0;
    openAtIndex(base + 1);
  }, [localImages.length, openAtIndex, selectedIndex]);

  const goPrev = useCallback(() => {
    if (localImages.length <= 1) return;
    const base = selectedIndex >= 0 ? selectedIndex : 0;
    openAtIndex(base - 1);
  }, [localImages.length, openAtIndex, selectedIndex]);

  const toggleZoomTripleTap = useCallback(() => {
    const ref = zoomRef.current;
    if (!ref) return;

    if (zoomedInRef.current) {
      ref.resetTransform?.(200);
      return;
    }

    // Zoom in centered (feels consistent on mobile).
    ref.centerView?.(3, 200);
  }, []);

  const scheduleTapNavigate = useCallback(
    (clientX: number, target: HTMLElement) => {
      if (localImages.length <= 1) return;
      if (isZoomedIn) return;

      const rect = target.getBoundingClientRect();
      const ratio = rect.width > 0 ? (clientX - rect.left) / rect.width : 0.5;
      // Left third = prev, right third = next, middle = no-op.
      if (ratio <= 0.33) goPrev();
      else if (ratio >= 0.67) goNext();
    },
    [goNext, goPrev, isZoomedIn, localImages.length]
  );

  const registerTap = useCallback(
    (clientX: number, target: HTMLElement) => {
      const now = Date.now();
      const state = tapStateRef.current;

      if (state.timeoutId) {
        window.clearTimeout(state.timeoutId);
        state.timeoutId = null;
      }

      state.count = now - state.lastAt < 420 ? state.count + 1 : 1;
      state.lastAt = now;

      // Triple tap: toggle zoom in/out.
      if (state.count >= 3) {
        state.count = 0;
        toggleZoomTripleTap();
        return;
      }

      // Single tap navigation (delay a bit to allow triple-tap without navigating).
      state.timeoutId = window.setTimeout(() => {
        tapStateRef.current.timeoutId = null;
        if (tapStateRef.current.count !== 1) return;
        tapStateRef.current.count = 0;
        scheduleTapNavigate(clientX, target);
      }, 260);
    },
    [scheduleTapNavigate, toggleZoomTripleTap]
  );

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
    if (!selectedImage) {
      setSelectedIndex(-1);
      return;
    }
    const idx = localImages.findIndex((img) => img.id === selectedImage.id);
    if (idx === -1) {
      setSelectedImage(null);
      setSelectedIndex(-1);
      return;
    }
    setSelectedIndex(idx);
  }, [localImages, selectedImage]);

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
          {localImages.length > 1 && (
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
            style={{ touchAction: 'none' }}
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
              const touch = e.changedTouches?.[0];
              if (!touch) return;
              const endX = touch.clientX;
              const endY = touch.clientY;
              const deltaX = start.x - endX;
              const deltaY = start.y - endY;
              const dt = Date.now() - start.t;

              // Treat tiny move as a tap.
              const isTap = dt < 300 && Math.abs(deltaX) < 12 && Math.abs(deltaY) < 12;
              if (isTap) {
                registerTap(endX, e.currentTarget);
                return;
              }

              if (isZoomedIn) return;

              if (dt > 600) return;
              if (Math.abs(deltaX) < 120) return;
              if (Math.abs(deltaX) < Math.abs(deltaY) * 1.2) return;

              if (deltaX > 0) goNext();
              else goPrev();
            }}
          >
            <TransformWrapper
              initialScale={1}
              minScale={1}
              maxScale={4}
              centerOnInit
              centerZoomedOut
              limitToBounds
              onInit={(ref) => {
                zoomRef.current = ref;
              }}
              onTransformed={(_ref, state) => {
                const next = state.scale > 1.05;
                if (zoomedInRef.current === next) return;
                zoomedInRef.current = next;
                setIsZoomedIn(next);
              }}
              onPanningStop={(ref) => {
                if (ref.state.scale <= 1.001) ref.resetTransform(200);
              }}
              onPinchingStop={(ref) => {
                if (ref.state.scale <= 1.001) ref.resetTransform(200);
              }}
              onWheelStop={(ref) => {
                if (ref.state.scale <= 1.001) ref.resetTransform(200);
              }}
              onZoomStop={(ref) => {
                if (ref.state.scale <= 1.001) ref.resetTransform(200);
              }}
              doubleClick={{ disabled: true }}
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
            {localImages.length > 1 && selectedIndex >= 0 && (
              <div
                ref={thumbsRef}
                className={`mb-3 flex gap-2 overflow-x-auto pb-1 transition-all duration-200 ${
                  isZoomedIn ? 'max-h-0 opacity-0 pointer-events-none' : 'max-h-24 opacity-100'
                }`}
                style={{ WebkitOverflowScrolling: 'touch' }}
                onClick={(e) => e.stopPropagation()}
              >
                {localImages.map((img, idx) => (
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
                      className="h-14 w-14 md:h-[72px] md:w-[72px] rounded-md object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
            <p className="text-sm font-semibold">{selectedImage.title}</p>
            {localImages.length > 1 && selectedIndex >= 0 && (
              <p className="text-xs text-gray-400 mt-1">
                {selectedIndex + 1} / {localImages.length}
              </p>
            )}
            <p className="text-xs text-gray-400 mt-1">{t('gallery.zoomHint')}</p>
          </div>
        </div>
      )}
    </>
  );
}
