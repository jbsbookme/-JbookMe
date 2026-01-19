'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useI18n } from '@/lib/i18n/i18n-context';
import { motion, useMotionValue } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { 
  Heart, 
  Scissors, 
  Star, 
  Sparkles,
  Calendar,
  Clock,
  ArrowRight,
  User,
  MessageCircle,
  Send,
  Facebook,
  Instagram,
  Share2,
  Trash2,
  Link2,
  Image as ImageIcon,
  Play
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { resolvePublicMediaUrl } from '@/lib/utils';
import { formatTime12h } from '@/lib/time';
import { DashboardNavbar } from '@/components/dashboard/navbar';
import PromotionsCarousel from '@/components/promotions-carousel';
import { CommentsModal } from '@/components/posts/comments-modal';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  author: {
    id: string;
    name: string;
    image: string | null;
    role: string;
  };
}

interface Post {
  id: string;
  authorId: string;
  caption: string;
  hashtags: string[];
  cloud_storage_path: string;
  imageUrl?: string;
  postType: 'BARBER_WORK' | 'CLIENT_SHARE';
  authorType: string;
  likes: number;
  viewCount: number;
  createdAt: string;
  author?: {
    id: string;
    name: string;
    image: string | null;
    role?: string;
  };
  barber?: {
    id: string;
    profileImage: string | null;
    user: {
      name: string;
      image: string | null;
    };
  };
  comments?: Comment[];
  _count?: {
    comments: number;
  };
}

interface Barber {
  id: string;
  userId: string;
  bio: string | null;
  specialties: string | null;
  hourlyRate: number | null;
  profileImage: string | null;
  rating: number | null;
  gender: 'MALE' | 'FEMALE' | 'BOTH';
  user: {
    id: string;
    name: string | null;
    image: string | null;
  };
}

interface Appointment {
  id: string;
  date: string;
  time: string;
  status: string;
  service: {
    name: string;
    price: number;
  } | null;
  barber: {
    user: {
      name: string;
      image: string | null;
    };
  } | null;
}

type HeartParticle = {
  id: string;
  leftPct: number;
  size: number;
  durationMs: number;
  delayMs: number;
  rotate: number;
};

export default function FeedPage() {
  const { data: session, status } = useSession();
  const { t, language } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const sharedPostId = searchParams.get('post');

  const FEED_CACHE_KEY = 'jbookme_feed_cache_v1';
  const POSTS_PAGE_SIZE = 24;

  const sessionUserId = (session?.user as { id?: string } | undefined)?.id;
  const [posts, setPosts] = useState<Post[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [stylists, setStylists] = useState<Barber[]>([]);
  const [nextAppointment, setNextAppointment] = useState<Appointment | null>(null);
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [showComments, setShowComments] = useState<Set<string>>(new Set());
  const [commentText, setCommentText] = useState<{[key: string]: string}>({});
  const [loading, setLoading] = useState(true);
  const [commentsModalOpen, setCommentsModalOpen] = useState<string | null>(null);
  const [postsCursor, setPostsCursor] = useState<string | null>(null);
  const [hasMorePosts, setHasMorePosts] = useState(false);
  const [loadingMorePosts, setLoadingMorePosts] = useState(false);
  const loadMoreSentinelRef = useRef<HTMLDivElement | null>(null);
  const [restoredFromCache, setRestoredFromCache] = useState(false);
  const restoredScrollOnceRef = useRef(false);
  const openedSharedPostIdRef = useRef<string | null>(null);
  const scrollLockRef = useRef<{
    locked: boolean;
    scrollY: number;
    prevBodyPosition: string;
    prevBodyTop: string;
    prevBodyLeft: string;
    prevBodyRight: string;
    prevBodyWidth: string;
    prevBodyOverflow: string;
    prevBodyPaddingRight: string;
  } | null>(null);

  const sharePost = useCallback(async (post: Post) => {
    const shareUrl = `${window.location.origin}/p/${post.id}`;
    const barbershopName = "JB's Barbershop";
    const title = barbershopName;
    const text = post.caption?.trim() ? `${post.caption}\n\n${barbershopName}` : barbershopName;

    try {
      if (!navigator.share) {
        await navigator.clipboard.writeText(shareUrl);
        toast.success(t('common.linkCopied'));
        return;
      }

      // Try to share the actual media file when supported.
      // Fallback: share a link (this may show as a generic card on some apps).
      const canShareFiles = typeof navigator.canShare === 'function';

      if (canShareFiles) {
        try {
          const mediaRes = await fetch(`/api/posts/${post.id}/media`);
          if (mediaRes.ok) {
            const blob = await mediaRes.blob();
            const blobType = blob.type || (isVideo(post.cloud_storage_path) ? 'video/mp4' : 'image/jpeg');
            const ext = blobType.includes('video') ? 'mp4' : 'jpg';
            const file = new File([blob], `jbsbarbershop-${post.id}.${ext}`, { type: blobType });

            // Prefer sharing file + public link when the platform supports it.
            const fileAndLinkData = { title, text, url: shareUrl, files: [file] } as any;
            if (navigator.canShare(fileAndLinkData)) {
              await navigator.share(fileAndLinkData);
              return;
            }

            // Fallback: share file only.
            if (navigator.canShare({ files: [file] })) {
              await navigator.share({ title, text, files: [file] } as any);
              return;
            }
          }
        } catch {
          // Ignore and fall back to link sharing.
        }
      }

      await navigator.share({ title, text, url: shareUrl });
    } catch {
      // User cancelled share or platform failed.
    }
  }, [t]);

  const sharePostLinkOnly = useCallback(async (post: Post) => {
    const shareUrl = `${window.location.origin}/p/${post.id}`;
    const barbershopName = "JB's Barbershop";
    const title = barbershopName;
    const text = post.caption?.trim() ? `${post.caption}\n\n${barbershopName}` : barbershopName;

    try {
      if (navigator.share) {
        await navigator.share({ title, text, url: shareUrl });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        toast.success(t('common.linkCopied'));
      }
    } catch {
      // user cancelled
    }
  }, [t]);

  const shareToFacebook = useCallback((post: Post) => {
    const shareUrl = `${window.location.origin}/p/${post.id}`;
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  }, []);

  const shareToWhatsApp = useCallback((post: Post) => {
    const shareUrl = `${window.location.origin}/p/${post.id}`;
    const barbershopName = "JB's Barbershop";
    const text = post.caption?.trim() ? `${post.caption}\n\n${barbershopName}\n${shareUrl}` : `${barbershopName}\n${shareUrl}`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  }, []);

  const shareToInstagram = useCallback(async (post: Post) => {
    const shareUrl = `${window.location.origin}/p/${post.id}`;
    const barbershopName = "JB's Barbershop";
    const text = post.caption?.trim() ? `${post.caption}\n\n${barbershopName}` : barbershopName;

    // Instagram does not support a reliable web-based "share" URL for arbitrary links.
    // Best-effort: use Web Share (mobile), otherwise copy link.
    try {
      if (navigator.share) {
        await navigator.share({ title: barbershopName, text, url: shareUrl });
        return;
      }
    } catch {
      // user cancelled / not supported
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success(t('common.linkCopied'));
    } catch {
      // ignore
    }
  }, [t]);
  const bookingCtaRef = useRef<HTMLDivElement | null>(null);
  const [isBookingCtaInView, setIsBookingCtaInView] = useState(true);
  const [zoomedMedia, setZoomedMedia] = useState<{
    url: string;
    isVideo: boolean;
    poster?: string;
    authorName?: string;
    dateLabel?: string;
  } | null>(null);

  const captureVideoPoster = useCallback((video: HTMLVideoElement): string | null => {
    try {
      // Need decoded frame; otherwise drawing will be blank.
      if (video.readyState < 2) return null;
      if (!video.videoWidth || !video.videoHeight) return null;

      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL('image/jpeg', 0.82);
    } catch {
      return null;
    }
  }, []);

  // Instagram-like scroll lock: freeze background without jumping and restore exact scroll.
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const modalOpen = !!zoomedMedia || !!commentsModalOpen;

    if (modalOpen) {
      if (scrollLockRef.current?.locked) return;

      const scrollY = window.scrollY || 0;
      const bodyStyle = window.document.body.style;

      const scrollbarWidth = Math.max(0, window.innerWidth - document.documentElement.clientWidth);
      const prev = {
        locked: true,
        scrollY,
        prevBodyPosition: bodyStyle.position,
        prevBodyTop: bodyStyle.top,
        prevBodyLeft: bodyStyle.left,
        prevBodyRight: bodyStyle.right,
        prevBodyWidth: bodyStyle.width,
        prevBodyOverflow: bodyStyle.overflow,
        prevBodyPaddingRight: bodyStyle.paddingRight,
      };
      scrollLockRef.current = prev;

      bodyStyle.position = 'fixed';
      bodyStyle.top = `-${scrollY}px`;
      bodyStyle.left = '0';
      bodyStyle.right = '0';
      bodyStyle.width = '100%';
      bodyStyle.overflow = 'hidden';
      if (scrollbarWidth > 0) {
        bodyStyle.paddingRight = `${scrollbarWidth}px`;
      }

      return;
    }

    // Modal closed → restore.
    const lock = scrollLockRef.current;
    if (!lock?.locked) return;

    const bodyStyle = window.document.body.style;
    bodyStyle.position = lock.prevBodyPosition;
    bodyStyle.top = lock.prevBodyTop;
    bodyStyle.left = lock.prevBodyLeft;
    bodyStyle.right = lock.prevBodyRight;
    bodyStyle.width = lock.prevBodyWidth;
    bodyStyle.overflow = lock.prevBodyOverflow;
    bodyStyle.paddingRight = lock.prevBodyPaddingRight;

    scrollLockRef.current = null;
    window.scrollTo({ top: lock.scrollY, left: 0, behavior: 'auto' });
  }, [zoomedMedia, commentsModalOpen]);

  const [feedAudioEnabled, setFeedAudioEnabled] = useState(false);
  const feedAudioEnabledRef = useRef(false);
  const zoomedMediaRef = useRef<typeof zoomedMedia>(null);

  useEffect(() => {
    feedAudioEnabledRef.current = feedAudioEnabled;
  }, [feedAudioEnabled]);

  useEffect(() => {
    zoomedMediaRef.current = zoomedMedia;
  }, [zoomedMedia]);

  const [playingByPostId, setPlayingByPostId] = useState<Record<string, boolean>>({});
  const [isZoomVideoPlaying, setIsZoomVideoPlaying] = useState(false);

  const pauseAllVideos = useCallback(() => {
    const videos = Array.from(document.querySelectorAll('video'));
    for (const video of videos) {
      try {
        video.pause();
      } catch {
        // ignore
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const observed = new WeakSet<Element>();
    const ratios = new WeakMap<Element, number>();

    const ensureObserved = (el: Element) => {
      if (observed.has(el)) return;
      observed.add(el);
      intersectionObserver.observe(el);
    };

    const ensureSrc = (video: HTMLVideoElement) => {
      try {
        const hasSrc = !!video.getAttribute('src');
        const dataSrc = (video as any).dataset?.src as string | undefined;
        if (!hasSrc && dataSrc) {
          video.setAttribute('src', dataSrc);
          try {
            video.preload = 'metadata';
          } catch {
            // ignore
          }
          try {
            video.load();
          } catch {
            // ignore
          }
        }
      } catch {
        // ignore
      }
    };

    const unloadSrc = (video: HTMLVideoElement) => {
      try {
        if (video.getAttribute('src')) {
          try {
            if (!video.paused) video.pause();
          } catch {
            // ignore
          }
          video.removeAttribute('src');
          try {
            // Hint browser to release resource.
            video.load();
          } catch {
            // ignore
          }
        }
      } catch {
        // ignore
      }
    };

    const intersectionObserver = new IntersectionObserver(
      (entries) => {
        // While zoom modal is open, never auto-start background videos.
        if (zoomedMediaRef.current) {
          const videos = Array.from(document.querySelectorAll('video[data-feed-video="true"]')) as HTMLVideoElement[];
          for (const v of videos) {
            try {
              v.pause();
            } catch {
              // ignore
            }
          }
          return;
        }

        for (const entry of entries) {
          ratios.set(entry.target, entry.intersectionRatio);
        }

        const videos = Array.from(document.querySelectorAll('video[data-feed-video="true"]')) as HTMLVideoElement[];
        let bestVideo: HTMLVideoElement | null = null;
        let bestRatio = 0;

        for (const v of videos) {
          const ratio = ratios.get(v) ?? 0;
          if (ratio >= 0.6 && ratio > bestRatio) {
            bestRatio = ratio;
            bestVideo = v;
          }
        }

        // Load/unload sources to avoid many videos buffering/decoding at once (prevents freezes).
        for (const v of videos) {
          const ratio = ratios.get(v) ?? 0;
          const shouldLoadNow = v === bestVideo || ratio >= 0.2;
          const shouldUnloadNow = ratio <= 0.01;

          if (shouldLoadNow) {
            ensureSrc(v);
          } else if (shouldUnloadNow) {
            unloadSrc(v);
          }
        }

        // Pause everything that isn't the primary visible video.
        for (const v of videos) {
          const ratio = ratios.get(v) ?? 0;
          const shouldPause = v !== bestVideo || ratio < 0.25;
          if (shouldPause) {
            try {
              if (!v.paused) v.pause();
            } catch {
              // ignore
            }
          }
        }

        if (!bestVideo) return;

        const primaryVideo = bestVideo;
        const wantAudio = feedAudioEnabledRef.current;

        // Start playback muted first (max compatibility), then unmute if user enabled audio.
        const ensurePlaying = async (video: HTMLVideoElement) => {
          ensureSrc(video);
          if (video.paused) {
            try {
              video.muted = true;
              video.loop = true;
              await video.play();
            } catch {
              // ignore
            }
          }

          if (wantAudio) {
            try {
              video.muted = false;
              video.volume = 1;
            } catch {
              // ignore
            }
          }
        };

        void ensurePlaying(primaryVideo);
      },
      {
        threshold: [0, 0.1, 0.25, 0.5, 0.75, 1],
      }
    );

    const observeAll = () => {
      const videos = Array.from(document.querySelectorAll('video[data-feed-video="true"]'));
      for (const video of videos) ensureObserved(video);
    };

    observeAll();

    // Debounce DOM scans (route transitions can cause many mutations and freeze mobile UI).
    let rafId: number | null = null;
    const scheduleObserveAll = () => {
      if (rafId !== null) return;
      rafId = window.requestAnimationFrame(() => {
        rafId = null;
        observeAll();
      });
    };

    const mutationObserver = new MutationObserver(() => scheduleObserveAll());
    mutationObserver.observe(document.body, { childList: true, subtree: true });

    return () => {
      mutationObserver.disconnect();
      intersectionObserver.disconnect();
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
        rafId = null;
      }
    };
  }, []);

  const toggleVideoPlayback = useCallback((video: HTMLVideoElement) => {
    if (video.paused) {
      void video.play().catch(() => {
        // Some browsers require muted playback even on user gesture.
        try {
          video.muted = true;
        } catch {
          // ignore
        }
        return video.play().catch(() => {
          // ignore
        });
      });
    } else {
      video.pause();
    }
  }, []);

  const handleVideoTap = useCallback(
    (video: HTMLVideoElement) => {
      // Keep videos muted by default (autoplay policies), but allow sound on explicit user tap.
      if (video.muted) {
        video.muted = false;
        video.volume = 1;
        setFeedAudioEnabled(true);
        try {
          video.loop = true;
        } catch {
          // ignore
        }
        if (video.paused) {
          void video.play();
        }
        return;
      }

      toggleVideoPlayback(video);
    },
    [toggleVideoPlayback]
  );

  useEffect(() => {
    return () => {
      // Ensure no video keeps playing after leaving the feed.
      pauseAllVideos();
    };
  }, [pauseAllVideos]);
  const [imageScale, setImageScale] = useState(1);
  const [viewedPosts, setViewedPosts] = useState<Set<string>>(new Set());
  const [heartBursts, setHeartBursts] = useState<Record<string, HeartParticle[]>>({});
  const heartBurstTimeoutsRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const fetchSharedPost = useCallback(async (postId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/posts/${encodeURIComponent(postId)}?_ts=${Date.now()}`);
      if (!res.ok) {
        setPosts([]);
        return;
      }
      const data = await res.json();
      const post = data?.post as Post | undefined;
      if (post) {
        setPosts([post]);
      } else {
        setPosts([]);
      }
    } catch (error) {
      console.error('Error fetching shared post:', error);
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Zoom/Pan state (modal)
  const imageX = useMotionValue(0);
  const imageY = useMotionValue(0);
  const pinchStartDistanceRef = useRef<number | null>(null);
  const pinchStartScaleRef = useRef<number>(1);
  const panStartRef = useRef<{ x: number; y: number } | null>(null);
  const panOriginRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const resetZoom = () => {
    setImageScale(1);
    imageX.set(0);
    imageY.set(0);
    pinchStartDistanceRef.current = null;
    panStartRef.current = null;
    panOriginRef.current = { x: 0, y: 0 };
  };

  const triggerHeartBurst = (postId: string) => {
    // Clear any existing scheduled cleanup for this post
    const existing = heartBurstTimeoutsRef.current[postId];
    if (existing) clearTimeout(existing);

    const count = 14;
    const now = Date.now();
    const particles: HeartParticle[] = Array.from({ length: count }).map((_, idx) => {
      const leftPct = 20 + Math.random() * 60; // avoid edges
      const size = 16 + Math.round(Math.random() * 10);
      const durationMs = 850 + Math.round(Math.random() * 450);
      const delayMs = Math.round(Math.random() * 120);
      const rotate = -18 + Math.random() * 36;

      return {
        id: `${now}-${idx}`,
        leftPct,
        size,
        durationMs,
        delayMs,
        rotate,
      };
    });

    setHeartBursts((prev) => ({ ...prev, [postId]: particles }));

    const maxLifetime = Math.max(...particles.map((p) => p.durationMs + p.delayMs));
    heartBurstTimeoutsRef.current[postId] = setTimeout(() => {
      setHeartBursts((prev) => {
        const next = { ...prev };
        delete next[postId];
        return next;
      });
      delete heartBurstTimeoutsRef.current[postId];
    }, maxLifetime + 100);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      );

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

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && pinchStartDistanceRef.current) {
      e.preventDefault();

      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      );

      const rawScale = pinchStartScaleRef.current * (distance / pinchStartDistanceRef.current);
      const newScale = Math.min(Math.max(1, rawScale), 4);
      setImageScale(newScale);
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

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length < 2) {
      pinchStartDistanceRef.current = null;
    }
    if (e.touches.length === 0) {
      panStartRef.current = null;

      if (imageScale < 1.05) {
        resetZoom();
      }
    }
  };

  useEffect(() => {
    // Instagram-like UX: restore feed state + scroll position when coming back.
    // Only restore for authenticated users (the feed requires auth anyway).
    if (typeof window !== 'undefined' && status === 'authenticated' && !restoredFromCache) {
      try {
        const raw = window.sessionStorage.getItem(FEED_CACHE_KEY);
        if (raw) {
          const cached = JSON.parse(raw) as {
            posts?: Post[];
            cursor?: string | null;
            hasMore?: boolean;
            scrollY?: number;
            ts?: number;
          };

          if (Array.isArray(cached.posts) && cached.posts.length > 0) {
            setPosts(cached.posts);
            setPostsCursor(cached.cursor ?? null);
            setHasMorePosts(!!cached.hasMore);
            setLoading(false);
            setRestoredFromCache(true);

            const targetScroll = Number.isFinite(cached.scrollY) ? Number(cached.scrollY) : 0;
            // Defer scroll restore until after paint.
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                if (!restoredScrollOnceRef.current) {
                  restoredScrollOnceRef.current = true;
                  window.scrollTo({ top: targetScroll, left: 0, behavior: 'auto' });
                }
              });
            });
            return;
          }
        }
      } catch {
        // Ignore cache errors.
      }
    }

    // Shared post view should be accessible without login.
    // If unauthenticated and a shared post id is present, render the shared post view.
    if (status === 'unauthenticated') {
      if (sharedPostId) {
        fetchSharedPost(sharedPostId);
        return;
      }

      router.push('/auth');
      return;
    }

    if (status === 'authenticated' && !restoredFromCache) {
      fetchData();
    }
  }, [status, router, sharedPostId, fetchSharedPost, restoredFromCache]);

  // Persist feed state on unmount/navigation (Instagram-like back behavior).
  useEffect(() => {
    if (status !== 'authenticated') return;

    return () => {
      try {
        const payload = {
          posts,
          cursor: postsCursor,
          hasMore: hasMorePosts,
          scrollY: typeof window !== 'undefined' ? window.scrollY : 0,
          ts: Date.now(),
        };
        window.sessionStorage.setItem(FEED_CACHE_KEY, JSON.stringify(payload));
      } catch {
        // Ignore cache write errors.
      }
    };
  }, [sharedPostId, status, posts, postsCursor, hasMorePosts]);

  // Show the persistent mobile BOOK button only after the main booking CTA card
  // (date card) has scrolled out of view.
  useEffect(() => {
    if (loading || status === 'loading') return;
    const el = bookingCtaRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsBookingCtaInView(entry.isIntersecting);
      },
      {
        threshold: 0.4,
      }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [loading, status]);

  const fetchData = async () => {
    try {
      // Fetch approved posts
      const postsRes = await fetch(`/api/posts?status=APPROVED&limit=${POSTS_PAGE_SIZE}&_ts=${Date.now()}`);
      if (postsRes.ok) {
        const postsData = await postsRes.json();
        setPosts(postsData.posts || []);
        setPostsCursor(postsData.nextCursor || null);
        setHasMorePosts(!!postsData.nextCursor);
      }

      // FIXED: Fetch barbers and stylists using gender filter
      const barbersRes = await fetch('/api/barbers?gender=MALE');
      const stylistsRes = await fetch('/api/barbers?gender=FEMALE');
      
      if (barbersRes.ok) {
        const barbersData = await barbersRes.json();
        setBarbers((barbersData.barbers || []).slice(0, 12));
      }
      
      if (stylistsRes.ok) {
        const stylistsData = await stylistsRes.json();
        setStylists((stylistsData.barbers || []).slice(0, 12));
      }

      // Fetch next appointment
      const appointmentsRes = await fetch('/api/appointments?status=upcoming&limit=1');
      if (appointmentsRes.ok) {
        const appointmentsData = await appointmentsRes.json();
        setNextAppointment(appointmentsData[0] || null);
      }

      // Note: Like checking removed for performance - will check on demand
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  // If we landed on /feed?post=..., open that post in the modal (Instagram-like) for authenticated users.
  // We keep the full feed behind (restored from cache or freshly loaded).
  useEffect(() => {
    if (!sharedPostId) return;
    if (status !== 'authenticated') return;
    if (openedSharedPostIdRef.current === sharedPostId) return;

    const isVideoAsset = (path: string): boolean => {
      if (/(\.(mp4|webm|ogg|mov|avi|mkv|flv)$)/i.test(path)) return true;
      const lowerPath = String(path || '').toLowerCase();
      if (lowerPath.includes('video') || lowerPath.includes('.mp4') || lowerPath.includes('.mov')) return true;
      try {
        const url = new URL(path);
        const contentType = url.searchParams.get('content-type') || url.searchParams.get('contentType');
        if (contentType && contentType.startsWith('video/')) return true;
      } catch {
        // ignore
      }
      return false;
    };

    const openFromPost = (post: Post) => {
      const authorName =
        post.authorType === 'BARBER'
          ? post.barber?.user?.name
          : post.author?.name || 'User';

      const dateLabel = new Date(post.createdAt).toLocaleDateString('en', {
        month: 'short',
        day: 'numeric',
      });

      const isVideoPost = isVideoAsset(post.cloud_storage_path);
      const mediaUrl = isVideoPost
        ? `/api/posts/${post.id}/media`
        : (post as any).imageUrl || resolvePublicMediaUrl(post.cloud_storage_path);

      pauseAllVideos();
      setZoomedMedia({
        url: mediaUrl,
        isVideo: isVideoPost,
        poster: undefined,
        authorName,
        dateLabel,
      });
    };

    const fromFeed = posts.find((p) => p.id === sharedPostId);
    if (fromFeed) {
      openedSharedPostIdRef.current = sharedPostId;
      openFromPost(fromFeed);
      return;
    }

    (async () => {
      try {
        const res = await fetch(`/api/posts/${encodeURIComponent(sharedPostId)}?_ts=${Date.now()}`);
        if (!res.ok) return;
        const data = await res.json();
        const post = data?.post as Post | undefined;
        if (!post) return;
        openedSharedPostIdRef.current = sharedPostId;
        openFromPost(post);
      } catch {
        // ignore
      }
    })();
  }, [sharedPostId, status, posts, pauseAllVideos]);

  const loadMorePosts = useCallback(async () => {
    if (!hasMorePosts || !postsCursor || loadingMorePosts) return;
    setLoadingMorePosts(true);
    try {
      const res = await fetch(
        `/api/posts?status=APPROVED&limit=${POSTS_PAGE_SIZE}&cursor=${encodeURIComponent(postsCursor)}&_ts=${Date.now()}`
      );
      if (!res.ok) return;

      const data = await res.json();
      const newPosts = (data.posts || []) as Post[];

      setPosts((prev) => {
        const seen = new Set(prev.map((p) => p.id));
        const merged = [...prev];
        for (const p of newPosts) {
          if (!seen.has(p.id)) merged.push(p);
        }
        return merged;
      });

      setPostsCursor(data.nextCursor || null);
      setHasMorePosts(!!data.nextCursor);
    } catch {
      // Ignore and keep existing posts.
    } finally {
      setLoadingMorePosts(false);
    }
  }, [hasMorePosts, postsCursor, loadingMorePosts]);

  // Infinite scroll: auto-load more posts when user nears the bottom.
  useEffect(() => {
    if (sharedPostId) return;
    if (!hasMorePosts) return;
    const el = loadMoreSentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting) {
          loadMorePosts();
        }
      },
      {
        root: null,
        // Preload aggressively (Instagram-like) so the next page is ready.
        rootMargin: '4000px 0px',
        threshold: 0,
      }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [sharedPostId, hasMorePosts, loadMorePosts]);

  const handleLike = async (postId: string) => {
    if (status !== 'authenticated') {
      router.push('/auth');
      return;
    }
    try {
      // Optimistic update
      const wasLiked = likedPosts.has(postId);

      if (!wasLiked) {
        triggerHeartBurst(postId);
      }
      
      setLikedPosts(prev => {
        const newSet = new Set(prev);
        if (wasLiked) {
          newSet.delete(postId);
        } else {
          newSet.add(postId);
        }
        return newSet;
      });

      setPosts(prev => prev.map(post => 
        post.id === postId 
          ? { ...post, likes: post.likes + (wasLiked ? -1 : 1) } 
          : post
      ));

      const response = await fetch(`/api/posts/${postId}/like`, {
        method: 'POST'
      });

      if (!response.ok) {
        // Revert optimistic update on error
        setLikedPosts(prev => {
          const newSet = new Set(prev);
          if (wasLiked) {
            newSet.add(postId);
          } else {
            newSet.delete(postId);
          }
          return newSet;
        });
        
        setPosts(prev => prev.map(post => 
          post.id === postId 
            ? { ...post, likes: post.likes + (wasLiked ? 1 : -1) } 
            : post
        ));
        
        throw new Error('Failed to like post');
      }

      const data = await response.json();
      
      // Update with server response
      setPosts(prev => prev.map(post => 
        post.id === postId 
          ? { ...post, likes: data.likes } 
          : post
      ));
      
    } catch (error) {
      console.error('Error toggling like:', error);
      toast.error(t('feed.errorLikingPost'));
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!confirm(t('feed.confirmDeletePost'))) return;

    try {
      const res = await fetch(`/api/posts/${postId}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || 'Failed to delete post');
      }

      setPosts(prev => prev.filter(p => p.id !== postId));
      toast.success(t('feed.postDeleted'));
    } catch (error) {
      console.error('Error deleting post:', error);
      toast.error(error instanceof Error ? error.message : t('feed.errorDeletingPost'));
    }
  };

  const toggleComments = (postId: string) => {
    setShowComments(prev => {
      const newSet = new Set(prev);
      if (newSet.has(postId)) {
        newSet.delete(postId);
      } else {
        newSet.add(postId);
      }
      return newSet;
    });
  };

  const handleAddComment = async (postId: string) => {
    const content = commentText[postId]?.trim();
    if (!content) {
      toast.error(t('feed.emptyComment'));
      return;
    }

    try {
      const response = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId, content })
      });

      if (response.ok) {
        const { comment } = await response.json();
        
        // Update posts with new comment
        setPosts(prev => prev.map(post => {
          if (post.id === postId) {
            return {
              ...post,
              comments: [comment, ...(post.comments || [])]
            };
          }
          return post;
        }));

        // Clear comment text
        setCommentText(prev => ({ ...prev, [postId]: '' }));
        toast.success(t('feed.commentAdded'));
      } else {
        toast.error(t('feed.errorAddingComment'));
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error(t('feed.errorAddingComment'));
    }
  };

  const getMediaUrl = (cloud_storage_path: string) => {
    return resolvePublicMediaUrl(cloud_storage_path);
  };

  const isVideo = (path: string): boolean => {
    // Check file extension
    if (/\.(mp4|webm|ogg|mov|avi|mkv|flv)$/i.test(path)) {
      return true;
    }
    
    // Check if URL contains video indicators (for Vercel Blob or other CDNs)
    const lowerPath = path.toLowerCase();
    if (lowerPath.includes('video') || lowerPath.includes('.mp4') || lowerPath.includes('.mov')) {
      return true;
    }
    
    // Check URL parameters for content type
    try {
      const url = new URL(path);
      const contentType = url.searchParams.get('content-type') || url.searchParams.get('contentType');
      if (contentType && contentType.startsWith('video/')) {
        return true;
      }
    } catch {
      // Not a valid URL, continue with file extension check
    }
    
    return false;
  };

  const incrementViewCount = useCallback(async (postId: string) => {
    if (viewedPosts.has(postId)) return; // Already viewed
    
    try {
      setViewedPosts(prev => new Set(prev).add(postId));
      
      const response = await fetch(`/api/posts/${postId}/view`, {
        method: 'POST'
      });

      if (response.ok) {
        const data = await response.json();
        setPosts(prev => prev.map(post => 
          post.id === postId 
            ? { ...post, viewCount: data.viewCount } 
            : post
        ));
      }
    } catch (error) {
      console.error('Error incrementing view count:', error);
    }
  }, [viewedPosts]);

  // IntersectionObserver to track post views
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const postId = entry.target.getAttribute('data-post-id');
            if (postId) {
              incrementViewCount(postId);
            }
          }
        });
      },
      {
        threshold: 0.5 // Post must be at least 50% visible
      }
    );

    // Observe all post elements
    const postElements = document.querySelectorAll('[data-post-id]');
    postElements.forEach(el => observer.observe(el));

    return () => {
      postElements.forEach(el => observer.unobserve(el));
    };
  }, [posts, incrementViewCount]);

  if (loading || status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="text-[#00f0ff] flex items-center gap-3">
          <Sparkles className="w-5 h-5 animate-pulse" />
          <span>Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black pb-24">
      {/* Mensaje de bienvenida */}
      <div className="hidden sm:block bg-gradient-to-b from-gray-900/50 to-transparent border-b border-gray-800">
        <div className="container mx-auto px-4 py-6">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex items-center justify-center gap-2"
          >
            <Sparkles className="w-5 h-5 text-[#00f0ff]" />
            <h2 className="text-lg text-gray-300">
              {t('feed.discover')}
            </h2>
          </motion.div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Featured Barbers (IG-like Stories) */}
        {barbers.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Scissors className="w-5 h-5 text-[#00f0ff]" />
                {t('feed.featuredBarbers')}
              </h2>
              <Link href="/barberos">
                <Button variant="ghost" size="sm" className="text-[#00f0ff] hover:text-[#00f0ff]">
                  View All
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </div>

            <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hide">
              {barbers.map((pro) => {
                const ringClass = 'border-[#00f0ff]/60';
                const glowClass = 'shadow-[0_0_18px_rgba(0,240,255,0.25)]';
                const name = pro.user?.name || 'Barber';

                return (
                  <Link
                    key={pro.id}
                    href={`/barberos/${pro.id}`}
                    className="flex-none w-[calc((100%-1.5rem)/3)] sm:w-20 snap-start"
                  >
                    <div
                      className={`relative w-14 h-14 sm:w-16 sm:h-16 mx-auto rounded-full overflow-hidden border-2 ${ringClass} ${glowClass}`}
                    >
                      {(pro.profileImage || pro.user?.image) ? (
                        <Image
                          src={pro.profileImage || pro.user?.image || ''}
                          alt={name}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                          <Scissors className="w-6 h-6 sm:w-7 sm:h-7 text-[#00f0ff]/60" />
                        </div>
                      )}
                    </div>

                    <p className="mt-1.5 sm:mt-2 text-[11px] sm:text-xs text-white text-center truncate leading-tight">
                      {name}
                    </p>
                    {pro.rating && pro.rating > 0 ? (
                      <div className="mt-1 hidden sm:flex items-center justify-center gap-1">
                        <Star className="w-3 h-3 text-[#ffd700] fill-current" />
                        <span className="text-[#ffd700] text-[11px] font-semibold">
                          {pro.rating.toFixed(1)}
                        </span>
                      </div>
                    ) : null}
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Featured Stylists (IG-like Stories) */}
        {stylists.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-pink-400" />
                {t('feed.featuredStylists')}
              </h2>
              <Link href="/barberos">
                <Button variant="ghost" size="sm" className="text-pink-400 hover:text-pink-400">
                  View All
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </div>

            <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hide">
              {stylists.map((pro) => {
                const ringClass = 'border-pink-400/60';
                const glowClass = 'shadow-[0_0_18px_rgba(236,72,153,0.25)]';
                const name = pro.user?.name || 'Stylist';

                return (
                  <Link
                    key={pro.id}
                    href={`/barberos/${pro.id}`}
                    className="flex-none w-[calc((100%-1.5rem)/3)] sm:w-20 snap-start"
                  >
                    <div
                      className={`relative w-14 h-14 sm:w-16 sm:h-16 mx-auto rounded-full overflow-hidden border-2 ${ringClass} ${glowClass}`}
                    >
                      {(pro.profileImage || pro.user?.image) ? (
                        <Image
                          src={pro.profileImage || pro.user?.image || ''}
                          alt={name}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                          <Sparkles className="w-6 h-6 sm:w-7 sm:h-7 text-pink-400/60" />
                        </div>
                      )}
                    </div>

                    <p className="mt-1.5 sm:mt-2 text-[11px] sm:text-xs text-white text-center truncate leading-tight">
                      {name}
                    </p>
                    {pro.rating && pro.rating > 0 ? (
                      <div className="mt-1 hidden sm:flex items-center justify-center gap-1">
                        <Star className="w-3 h-3 text-[#ffd700] fill-current" />
                        <span className="text-[#ffd700] text-[11px] font-semibold">
                          {pro.rating.toFixed(1)}
                        </span>
                      </div>
                    ) : null}
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Quick Action (Primary CTA) */}
        <div ref={bookingCtaRef}>
          <Link href="/reservar" className="block">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              whileHover={{ scale: 1.05, rotate: 1 }}
              whileTap={{ scale: 0.95 }}
            >
              <Card className="glass-cyan hover:glow-cyan smooth-transition overflow-hidden relative">
                <div className="pointer-events-none absolute inset-0">
                  <div className="absolute inset-0 bg-gradient-to-r from-[#00f0ff]/25 via-transparent to-[#ffd700]/20" />
                  <motion.div
                    className="absolute -inset-1 bg-gradient-to-r from-[#00f0ff]/30 to-[#ffd700]/20 blur-2xl"
                    initial={{ opacity: 0.65 }}
                    animate={{ opacity: [0.6, 0.85, 0.6] }}
                    transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
                  />
                </div>
                <CardContent className="p-6 text-center relative z-10">
                  <motion.div
                    animate={{ y: [0, -5, 0] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="mb-2"
                  >
                    <div className="text-[#00f0ff] font-bold text-4xl leading-none">
                      {new Date().getDate()}
                    </div>
                    <div className="text-[#00f0ff]/70 text-sm mt-1 uppercase">
                      {new Date().toLocaleDateString(language === 'es' ? 'es' : 'en', { 
                        month: 'short', 
                        year: 'numeric' 
                      })}
                    </div>
                    <div className="mt-2 text-xs text-gray-300">
                      Elige tu barbero o estilista de tu preferencia
                    </div>
                  </motion.div>

                  <motion.div
                    className="mt-3 flex items-center justify-center gap-2"
                    animate={{ scale: [1, 1.03, 1] }}
                    transition={{ duration: 3.8, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    <div className="h-9 w-9 rounded-full bg-gradient-to-br from-[#00f0ff]/25 to-[#ffd700]/20 border border-[#00f0ff]/30 flex items-center justify-center">
                      <motion.div
                        initial={{ opacity: 0, y: 2, scale: 0.96 }}
                        animate={{ opacity: 1, y: [0, -4, 0], scale: [1, 1.06, 1] }}
                        transition={{ duration: 0.65, ease: 'easeOut' }}
                      >
                        <Calendar className="w-5 h-5 text-[#00f0ff]" />
                      </motion.div>
                    </div>
                    <p className="text-white font-extrabold text-xl tracking-wide">
                      {t('nav.book').toUpperCase()}
                    </p>
                  </motion.div>
                </CardContent>
                <div className="absolute inset-0 shimmer opacity-50" />
              </Card>
            </motion.div>
          </Link>
        </div>

        {/* Promotions Carousel */}
        <PromotionsCarousel />

        {/* Next Appointment */}
        {nextAppointment && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="bg-gradient-to-r from-purple-900/20 to-pink-900/20 border-purple-500/30">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center">
                      <Clock className="w-6 h-6 text-purple-400" />
                    </div>
                    <div>
                      <p className="text-white font-semibold">Next Appointment</p>
                      <p className="text-gray-400 text-sm">
                        {nextAppointment.service?.name} - {nextAppointment.barber?.user?.name}
                      </p>
                      <p className="text-[#00f0ff] text-xs mt-1">
                        {new Date(nextAppointment.date).toLocaleDateString('en-US', { 
                          weekday: 'short', 
                          month: 'short', 
                          day: 'numeric' 
                        })} at {formatTime12h(nextAppointment.time)}
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-500" />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Posts Feed */}
        {posts.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#00f0ff]" />
                Community Feed
              </h2>
            </div>

            <div className="space-y-6">
              {posts.map((post, index) => (
                <motion.div
                  key={post.id}
                  data-post-id={post.id}
                  initial={{ opacity: 0, y: 30, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ 
                    delay: index * 0.1,
                    type: "spring",
                    stiffness: 100
                  }}
                  whileHover={{ y: -5 }}
                >
                  <Card className="glass smooth-transition overflow-hidden relative group">
                    <CardContent className="p-0 relative z-10">
                      {/* Author Header */}
                      <div className="flex items-center gap-3 p-4">
                        <motion.div 
                          className={`w-10 h-10 rounded-full flex items-center justify-center overflow-hidden ${
                            (post.authorType === 'BARBER' && post.barber?.profileImage) ||
                            (post.authorType === 'BARBER' && post.barber?.user?.image) ||
                            post.author?.image
                              ? 'bg-transparent'
                              : 'bg-gradient-to-br from-cyan-500 to-purple-500'
                          }`}
                          whileHover={{ scale: 1.1, rotate: 180 }}
                          transition={{ duration: 0.3 }}
                        >
                          {(post.authorType === 'BARBER' && post.barber?.profileImage) ? (
                            <Image
                              src={post.barber.profileImage}
                              alt={post.barber.user.name || 'Barber'}
                              width={40}
                              height={40}
                              className="block rounded-full object-cover"
                              loading="lazy"
                            />
                          ) : (post.authorType === 'BARBER' && post.barber?.user?.image) ? (
                            <Image
                              src={post.barber.user.image}
                              alt={post.barber.user.name || 'Barber'}
                              width={40}
                              height={40}
                              className="block rounded-full object-cover"
                              loading="lazy"
                            />
                          ) : post.author?.image ? (
                            <Image
                              src={post.author.image}
                              alt={post.author.name || 'User'}
                              width={40}
                              height={40}
                              className="block rounded-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <User className="w-5 h-5 text-white" />
                          )}
                        </motion.div>
                        <div className="flex-1">
                          <p className="text-white font-semibold text-sm">
                            {post.authorType === 'BARBER' 
                              ? post.barber?.user?.name 
                              : post.author?.name || 'User'}
                          </p>
                          <div className="flex items-center gap-2">
                            <p className="text-xs text-gray-400">
                              {new Date(post.createdAt).toLocaleDateString('en', {
                                month: 'short',
                                day: 'numeric'
                              })}
                            </p>
                            {post.postType === 'BARBER_WORK' ? (
                              <motion.div 
                                className="px-2 py-0.5 bg-cyan-500/20 rounded-full"
                                whileHover={{ scale: 1.1 }}
                              >
                                <Scissors className="w-3 h-3 text-cyan-400" />
                              </motion.div>
                            ) : (
                              <motion.div 
                                className="px-2 py-0.5 bg-pink-500/20 rounded-full"
                                whileHover={{ scale: 1.1 }}
                              >
                                <User className="w-3 h-3 text-pink-400" />
                              </motion.div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Media */}
                      <div 
                        className={`relative w-full ${
                          isVideo(post.cloud_storage_path)
                            ? 'h-[78vh] md:h-[70vh] lg:h-[620px]'
                            : 'aspect-square'
                        } ${isVideo(post.cloud_storage_path) ? 'bg-black' : 'bg-zinc-800'} cursor-pointer`}
                        onClick={(e) => {
                          // Prevent background audio/video from continuing when opening modal.
                          pauseAllVideos();

                          const authorName =
                            post.authorType === 'BARBER'
                              ? post.barber?.user?.name
                              : post.author?.name || 'User';

                          const dateLabel = new Date(post.createdAt).toLocaleDateString('en', {
                            month: 'short',
                            day: 'numeric',
                          });

                          const isVideoPost = isVideo(post.cloud_storage_path);
                          const mediaUrl = isVideoPost
                            ? `/api/posts/${post.id}/media`
                            : post.imageUrl || getMediaUrl(post.cloud_storage_path);

                          let poster: string | undefined;
                          if (isVideoPost) {
                            const videoEl = (e.currentTarget as HTMLElement).querySelector('video') as
                              | HTMLVideoElement
                              | null;
                            const captured = videoEl ? captureVideoPoster(videoEl) : null;
                            if (captured) poster = captured;
                          }

                          setZoomedMedia({
                            url: mediaUrl,
                            isVideo: isVideoPost,
                            poster,
                            authorName,
                            dateLabel,
                          });
                        }}
                      >
                        {/* Floating hearts burst (visual) */}
                        {heartBursts[post.id]?.length ? (
                          <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
                            {heartBursts[post.id].map((p) => (
                              <motion.div
                                key={p.id}
                                className="absolute"
                                style={{ left: `${p.leftPct}%`, bottom: '18%' }}
                                initial={{ opacity: 0, y: 10, scale: 0.7, rotate: p.rotate }}
                                animate={{ opacity: [0, 1, 1, 0], y: -160, scale: [0.7, 1.05, 0.95], rotate: p.rotate + (Math.random() > 0.5 ? 10 : -10) }}
                                transition={{
                                  duration: p.durationMs / 1000,
                                  delay: p.delayMs / 1000,
                                  ease: 'easeOut',
                                }}
                              >
                                <Heart
                                  className="fill-red-500 text-red-500 drop-shadow-[0_0_10px_rgba(239,68,68,0.35)]"
                                  style={{ width: p.size, height: p.size }}
                                />
                              </motion.div>
                            ))}
                          </div>
                        ) : null}

                        {isVideo(post.cloud_storage_path) ? (
                          <div className="pointer-events-none absolute left-3 top-3 z-20">
                            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/55 backdrop-blur border border-white/10">
                              <span className="text-xs font-medium text-white leading-none">
                                {(post.authorType === 'BARBER'
                                  ? post.barber?.user?.name
                                  : post.author?.name || 'User')}
                                <span className="text-white/70">{' '}•{' '}
                                  {new Date(post.createdAt).toLocaleDateString('en', {
                                    month: 'short',
                                    day: 'numeric',
                                  })}
                                </span>
                              </span>
                            </div>
                          </div>
                        ) : null}

                        {isVideo(post.cloud_storage_path) ? (
                          <div className="relative w-full h-full">
                            <video
                              data-src={`/api/posts/${post.id}/media`}
                              data-feed-video="true"
                              autoPlay={false}
                              loop
                              muted={!feedAudioEnabled}
                              playsInline
                              preload="metadata"
                              className="w-full h-full object-cover bg-black"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleVideoTap(e.currentTarget);
                              }}
                              onPlay={() => setPlayingByPostId((prev) => ({ ...prev, [post.id]: true }))}
                              onPause={() => setPlayingByPostId((prev) => ({ ...prev, [post.id]: false }))}
                              onEnded={() => setPlayingByPostId((prev) => ({ ...prev, [post.id]: false }))}
                            />

                            {!playingByPostId[post.id] ? (
                              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                                <div className="h-16 w-16 rounded-full border border-white/35 bg-black/20 backdrop-blur-sm flex items-center justify-center">
                                  <Play className="h-8 w-8 text-white/90 drop-shadow translate-x-0.5" />
                                </div>
                              </div>
                            ) : null}
                          </div>
                        ) : (
                          <Image
                            src={post.imageUrl || getMediaUrl(post.cloud_storage_path)}
                            alt={post.caption}
                            fill
                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 80vw, 600px"
                            className="object-cover"
                            loading={index < 2 ? "eager" : "lazy"}
                            priority={index < 2}
                          />
                        )}
                      </div>

                      {/* Actions & Caption */}
                      <div className="p-4 space-y-3">
                        {/* Action Buttons */}
                        <div className="flex items-center gap-4">
                          {/* Like Button with Animation */}
                          <motion.button
                            onClick={() => handleLike(post.id)}
                            className="flex items-center gap-2"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.9 }}
                          >
                            <motion.div
                              animate={likedPosts.has(post.id) ? {
                                scale: [1, 1.3, 1],
                                rotate: [0, -10, 10, -10, 0]
                              } : {}}
                              transition={{ duration: 0.4 }}
                            >
                              <Heart
                                className={`w-6 h-6 smooth-transition ${
                                  likedPosts.has(post.id)
                                    ? 'fill-red-500 text-red-500'
                                    : 'text-white hover:text-red-400'
                                }`}
                              />
                            </motion.div>
                            <span className="text-white font-semibold text-sm">{post.likes}</span>
                          </motion.button>

                          {/* Comment Button */}
                          <motion.button
                            onClick={() => setCommentsModalOpen(post.id)}
                            className="flex items-center gap-2"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.9 }}
                          >
                            <MessageCircle className="w-6 h-6 text-white hover:text-cyan-400 smooth-transition" />
                            <span className="text-white font-semibold text-sm">
                              {post._count?.comments || 0}
                            </span>
                          </motion.button>

                          {/* Share Button */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <motion.button
                                className="flex items-center gap-2"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.9 }}
                                aria-label={t('feed.share')}
                                title={t('feed.share')}
                              >
                                <Share2 className="w-6 h-6 text-white hover:text-pink-400 smooth-transition" />
                              </motion.button>
                            </DropdownMenuTrigger>

                            <DropdownMenuContent
                              align="end"
                              className="border-white/10 bg-black/85 backdrop-blur-md text-white"
                            >
                              <div className="px-3 py-2">
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    type="button"
                                    onClick={() => shareToFacebook(post)}
                                    className="h-10 w-10 rounded-full border border-white/10 bg-white/0 hover:bg-white/10 transition-colors flex items-center justify-center"
                                    aria-label={t('feed.shareToFacebook')}
                                    title={t('feed.shareToFacebook')}
                                  >
                                    <Facebook className="h-5 w-5 text-white/80" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => void shareToInstagram(post)}
                                    className="h-10 w-10 rounded-full border border-white/10 bg-white/0 hover:bg-white/10 transition-colors flex items-center justify-center"
                                    aria-label={t('feed.shareToInstagram')}
                                    title={t('feed.shareToInstagram')}
                                  >
                                    <Instagram className="h-5 w-5 text-white/80" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => shareToWhatsApp(post)}
                                    className="h-10 w-10 rounded-full border border-white/10 bg-white/0 hover:bg-white/10 transition-colors flex items-center justify-center"
                                    aria-label={t('feed.shareToWhatsApp')}
                                    title={t('feed.shareToWhatsApp')}
                                  >
                                    <Send className="h-5 w-5 text-white/80" />
                                  </button>
                                </div>

                                <div className="mt-2 flex items-center justify-end gap-2">
                                  <button
                                    type="button"
                                    onClick={() => sharePost(post)}
                                    className="text-xs text-white/80 hover:text-white transition-colors"
                                  >
                                    {t('feed.share')}
                                  </button>
                                  <span className="text-white/20">•</span>
                                  <button
                                    type="button"
                                    onClick={() => sharePostLinkOnly(post)}
                                    className="text-xs text-white/80 hover:text-white transition-colors"
                                  >
                                    {t('feed.copyLink')}
                                  </button>
                                </div>
                              </div>
                            </DropdownMenuContent>
                          </DropdownMenu>

                          {(session?.user?.role === 'ADMIN' || (sessionUserId && (post.author?.id === sessionUserId || post.authorId === sessionUserId))) && (
                            <motion.button
                              onClick={() => handleDeletePost(post.id)}
                              className="ml-auto"
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.9 }}
                              aria-label={t('feed.deletePostAria')}
                              title={t('feed.deletePostTitle')}
                            >
                              <Trash2 className="w-6 h-6 text-white hover:text-red-400 smooth-transition" />
                            </motion.button>
                          )}
                        </div>

                        {/* Caption */}
                        <div>
                          <p className="text-white text-sm">
                            <span className="font-semibold mr-2">
                              {post.authorType === 'BARBER' 
                                ? post.barber?.user?.name 
                                : post.author?.name || 'User'}
                            </span>
                            {post.caption}
                          </p>

                          {/* Hashtags */}
                          {post.hashtags && post.hashtags.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-2">
                              {post.hashtags.map((tag, i) => (
                                <span key={i} className="text-xs text-cyan-400">
                                  #{tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* View Count */}
                        <p className="text-xs text-zinc-500">{post.viewCount} views</p>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>

            {!sharedPostId && (
              <div className="mt-8">
                {/* Sentinel for infinite scrolling */}
                <div ref={loadMoreSentinelRef} className="h-1 w-full" />

                {loadingMorePosts && (
                  <div className="mt-6 space-y-6">
                    {Array.from({ length: 2 }).map((_, idx) => (
                      <Card key={idx} className="glass smooth-transition overflow-hidden relative">
                        <CardContent className="p-0">
                          <div className="p-4 flex items-center gap-3 animate-pulse">
                            <div className="h-10 w-10 rounded-full bg-white/10" />
                            <div className="flex-1 space-y-2">
                              <div className="h-3 w-28 bg-white/10 rounded" />
                              <div className="h-3 w-16 bg-white/10 rounded" />
                            </div>
                            <div className="h-7 w-7 rounded bg-white/10" />
                          </div>
                          <div className="aspect-square bg-white/5 animate-pulse" />
                          <div className="p-4 space-y-3 animate-pulse">
                            <div className="h-4 w-40 bg-white/10 rounded" />
                            <div className="h-3 w-3/4 bg-white/10 rounded" />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Zoom Modal */}
      {zoomedMedia && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/95"
          onClick={() => {
            pauseAllVideos();
            setZoomedMedia(null);
            resetZoom();
            if (sharedPostId) {
              try {
                window.history.replaceState(null, '', '/feed');
              } catch {
                // ignore
              }
            }
          }}
        >
          <motion.button
            className="absolute top-4 right-4 z-50 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full p-3 transition-colors"
            onClick={() => {
              pauseAllVideos();
              setZoomedMedia(null);
              resetZoom();
              if (sharedPostId) {
                try {
                  window.history.replaceState(null, '', '/feed');
                } catch {
                  // ignore
                }
              }
            }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </motion.button>

          {/* Reset Zoom Button */}
          {imageScale > 1 && !zoomedMedia.isVideo && (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute top-4 left-4 z-50 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 transition-colors flex items-center gap-2"
              onClick={(e) => {
                e.stopPropagation();
                resetZoom();
              }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
              </svg>
              <span className="text-white text-sm font-medium">Reset</span>
            </motion.button>
          )}
          
          <div className="relative w-full h-full flex items-center justify-center overflow-hidden" onClick={(e) => e.stopPropagation()}>
            {zoomedMedia.isVideo ? (
              <div className="relative max-w-full max-h-full">
                {zoomedMedia.authorName && zoomedMedia.dateLabel ? (
                  <div className="pointer-events-none absolute left-3 top-3 z-10">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/55 backdrop-blur border border-white/10">
                      <span className="text-xs font-medium text-white leading-none">
                        {zoomedMedia.authorName}
                        <span className="text-white/70">{' '}•{' '}{zoomedMedia.dateLabel}</span>
                      </span>
                    </div>
                  </div>
                ) : null}

                <div className="relative">
                  <video
                    src={zoomedMedia.url}
                    poster={zoomedMedia.poster}
                    controls
                    playsInline
                    preload="metadata"
                    className="max-w-full max-h-full object-contain rounded-lg shadow-2xl bg-black"
                    onPlay={() => setIsZoomVideoPlaying(true)}
                    onPause={() => setIsZoomVideoPlaying(false)}
                    onEnded={() => setIsZoomVideoPlaying(false)}
                  />

                  {!isZoomVideoPlaying ? (
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                      <div className="h-20 w-20 rounded-full border border-white/35 bg-black/20 backdrop-blur-sm flex items-center justify-center">
                        <Play className="h-10 w-10 text-white/90 drop-shadow translate-x-0.5" />
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : (
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
                  cursor: imageScale > 1 ? 'move' : 'default'
                }}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
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
                <div className="relative w-[90vw] h-[90vh]">
                  <Image
                    src={zoomedMedia.url}
                    alt="Zoomed media"
                    fill
                    className="object-contain select-none"
                    sizes="100vw"
                    priority
                    draggable={false}
                  />
                </div>
              </motion.div>
            )}
          </div>

          {/* Instructions */}
          {!zoomedMedia.isVideo && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-sm px-6 py-3 rounded-full"
            >
              <p className="text-white/90 text-sm text-center font-medium">
                Pellizca con 2 dedos para hacer zoom
              </p>
            </motion.div>
          )}
        </motion.div>
      )}

      {/* Comments Modal */}
      <CommentsModal 
        postId={commentsModalOpen || ''}
        isOpen={!!commentsModalOpen}
        onClose={() => {
          setCommentsModalOpen(null);
          if (sharedPostId) {
            try {
              window.history.replaceState(null, '', '/feed');
            } catch {
              // ignore
            }
          }
        }}
      />

    </div>
  );
}
