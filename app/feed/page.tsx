'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
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
  Trash2
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { ShareFAB } from '@/components/share-fab';
import { DashboardNavbar } from '@/components/dashboard/navbar';
import PromotionsCarousel from '@/components/promotions-carousel';

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
  caption: string;
  hashtags: string[];
  cloud_storage_path: string;
  postType: 'BARBER_WORK' | 'CLIENT_SHARE';
  authorType: 'USER' | 'BARBER';
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
  const [posts, setPosts] = useState<Post[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [stylists, setStylists] = useState<Barber[]>([]);
  const [nextAppointment, setNextAppointment] = useState<Appointment | null>(null);
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [showComments, setShowComments] = useState<Set<string>>(new Set());
  const [commentText, setCommentText] = useState<{[key: string]: string}>({});
  const [loading, setLoading] = useState(true);
  const [zoomedMedia, setZoomedMedia] = useState<{ url: string; isVideo: boolean } | null>(null);
  const [imageScale, setImageScale] = useState(1);
  const [viewedPosts, setViewedPosts] = useState<Set<string>>(new Set());
  const [heartBursts, setHeartBursts] = useState<Record<string, HeartParticle[]>>({});
  const heartBurstTimeoutsRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

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
    if (status === 'unauthenticated') {
      router.push('/auth');
      return;
    }

    if (status === 'authenticated') {
      fetchData();
    }
  }, [status, router]);

  const fetchData = async () => {
    try {
      // Fetch approved posts
      const postsRes = await fetch('/api/posts?status=APPROVED');
      if (postsRes.ok) {
        const postsData = await postsRes.json();
        setPosts(postsData.posts?.slice(0, 12) || []); // Latest 12 posts
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

  const handleLike = async (postId: string) => {
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
      toast.error('Error liking post');
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!confirm('Are you sure you want to delete this post?')) return;

    try {
      const res = await fetch(`/api/posts/${postId}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || 'Failed to delete post');
      }

      setPosts(prev => prev.filter(p => p.id !== postId));
      toast.success('Post deleted');
    } catch (error) {
      console.error('Error deleting post:', error);
      toast.error(error instanceof Error ? error.message : 'Error deleting post');
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
      toast.error('Comment cannot be empty');
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
        toast.success('Comment added');
      } else {
        toast.error('Error adding comment');
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error('Error adding comment');
    }
  };

  const getMediaUrl = (cloud_storage_path: string) => {
    // If it's already a full URL, return as-is
    if (/^https?:\/\//i.test(cloud_storage_path)) {
      return cloud_storage_path;
    }

    // Si la ruta empieza con /, es una ruta local (public folder)
    if (cloud_storage_path.startsWith('/')) {
      return cloud_storage_path;
    }
    
    // Si no, es una ruta de S3
    const bucketName = process.env.NEXT_PUBLIC_AWS_BUCKET_NAME || 'your-bucket';
    const region = process.env.NEXT_PUBLIC_AWS_REGION || 'us-east-1';
    return `https://${bucketName}.s3.${region}.amazonaws.com/${cloud_storage_path}`;
  };

  const isVideo = (path: string): boolean => {
    return /\.(mp4|webm|ogg|mov)$/i.test(path);
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
      <DashboardNavbar />
      
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

            <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-2 -mx-4 px-4 snap-x snap-mandatory scroll-px-4">
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

            <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-2 -mx-4 px-4 snap-x snap-mandatory scroll-px-4">
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
        <div>
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
                  <div className="absolute -inset-1 bg-gradient-to-r from-[#00f0ff]/30 to-[#ffd700]/20 blur-2xl opacity-70" />
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
                  </motion.div>

                  <div className="mt-3 flex items-center justify-center gap-2">
                    <div className="h-9 w-9 rounded-full bg-gradient-to-br from-[#00f0ff]/25 to-[#ffd700]/20 border border-[#00f0ff]/30 flex items-center justify-center">
                      <Calendar className="w-5 h-5 text-[#00f0ff]" />
                    </div>
                    <p className="text-white font-extrabold text-xl tracking-wide">
                      {language === 'es' ? 'RESERVAR' : 'BOOK'}
                    </p>
                  </div>
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
                        })} at {nextAppointment.time}
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
                          className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center overflow-hidden"
                          whileHover={{ scale: 1.1, rotate: 180 }}
                          transition={{ duration: 0.3 }}
                        >
                          {(post.authorType === 'BARBER' && post.barber?.profileImage) ? (
                            <Image
                              src={post.barber.profileImage}
                              alt={post.barber.user.name || 'Barber'}
                              width={40}
                              height={40}
                              className="rounded-full object-cover"
                              loading="lazy"
                            />
                          ) : (post.authorType === 'BARBER' && post.barber?.user?.image) ? (
                            <Image
                              src={post.barber.user.image}
                              alt={post.barber.user.name || 'Barber'}
                              width={40}
                              height={40}
                              className="rounded-full object-cover"
                              loading="lazy"
                            />
                          ) : post.author?.image ? (
                            <Image
                              src={post.author.image}
                              alt={post.author.name || 'User'}
                              width={40}
                              height={40}
                              className="rounded-full object-cover"
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
                        className="relative w-full aspect-square bg-zinc-800 cursor-pointer"
                        onClick={() => setZoomedMedia({ url: getMediaUrl(post.cloud_storage_path), isVideo: isVideo(post.cloud_storage_path) })}
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
                          <video
                            src={getMediaUrl(post.cloud_storage_path)}
                            autoPlay
                            muted
                            loop
                            playsInline
                            preload="metadata"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Image
                            src={getMediaUrl(post.cloud_storage_path)}
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
                            <span className="text-white font-semibold text-sm">{post.likes} likes</span>
                          </motion.button>

                          {/* Comment Button */}
                          <motion.button
                            onClick={() => toggleComments(post.id)}
                            className="flex items-center gap-2"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.9 }}
                          >
                            <MessageCircle className="w-6 h-6 text-white hover:text-cyan-400 smooth-transition" />
                            <span className="text-white font-semibold text-sm">
                              {post.comments?.length || 0} comments
                            </span>
                          </motion.button>

                          {(session?.user?.role === 'ADMIN' || post.author?.id === session?.user?.id) && (
                            <motion.button
                              onClick={() => handleDeletePost(post.id)}
                              className="ml-auto"
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.9 }}
                              aria-label="Delete post"
                              title="Delete post"
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

                        {/* Comments Section */}
                        {showComments.has(post.id) && (
                          <div className="mt-4 border-t border-zinc-700 pt-4 space-y-3">
                            {/* Comment Input */}
                            <div className="flex gap-2">
                              <input
                                type="text"
                                placeholder="Add a comment..."
                                value={commentText[post.id] || ''}
                                onChange={(e) => setCommentText(prev => ({ 
                                  ...prev, 
                                  [post.id]: e.target.value 
                                }))}
                                onKeyPress={(e) => {
                                  if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleAddComment(post.id);
                                  }
                                }}
                                className="flex-1 bg-zinc-800 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                              />
                              <motion.button
                                onClick={() => handleAddComment(post.id)}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                className="bg-gradient-to-r from-cyan-500 to-cyan-600 text-white px-4 py-2 rounded-lg hover:from-cyan-600 hover:to-cyan-700 smooth-transition"
                              >
                                <Send className="w-4 h-4" />
                              </motion.button>
                            </div>

                            {/* Comments List */}
                            <div className="space-y-3 max-h-60 overflow-y-auto">
                              {post.comments && post.comments.length > 0 ? (
                                post.comments.map((comment) => (
                                  <div key={comment.id} className="flex gap-3">
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center flex-shrink-0">
                                      {comment.author.image ? (
                                        <Image
                                          src={comment.author.image}
                                          alt={comment.author.name}
                                          width={32}
                                          height={32}
                                          className="rounded-full object-cover"
                                        />
                                      ) : (
                                        <User className="w-4 h-4 text-white" />
                                      )}
                                    </div>
                                    <div className="flex-1">
                                      <div className="bg-zinc-800 rounded-lg p-3">
                                        <p className="text-white font-semibold text-xs">
                                          {comment.author.name}
                                        </p>
                                        <p className="text-gray-300 text-sm mt-1">
                                          {comment.content}
                                        </p>
                                      </div>
                                      <p className="text-xs text-zinc-500 mt-1">
                                        {new Date(comment.createdAt).toLocaleDateString('en-US', {
                                          month: 'short',
                                          day: 'numeric',
                                          hour: '2-digit',
                                          minute: '2-digit'
                                        })}
                                      </p>
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <p className="text-center text-gray-400 text-sm py-4">
                                  No comments yet. Be the first to comment!
                                </p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
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
            setZoomedMedia(null);
            resetZoom();
          }}
        >
          <motion.button
            className="absolute top-4 right-4 z-50 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full p-3 transition-colors"
            onClick={() => {
              setZoomedMedia(null);
              resetZoom();
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
              <video
                src={zoomedMedia.url}
                controls
                autoPlay
                muted
                loop
                playsInline
                preload="metadata"
                className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
              />
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

      {/* Persistent mobile booking button (stays visible while scrolling) */}
      <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40 sm:hidden">
        <Link href="/reservar">
          <Button className="h-12 px-6 rounded-full bg-[#00f0ff] text-black font-extrabold hover:bg-[#00f0ff]/90">
            <Calendar className="w-5 h-5 mr-2" />
            {language === 'es' ? 'RESERVAR' : 'BOOK'}
          </Button>
        </Link>
      </div>

      {/* FAB Buttons */}
      <ShareFAB />
    </div>
  );
}
