'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import {
  Calendar,
  Scissors,
  Star,
  MapPin,
  Image as ImageIcon,
  MessageSquare,
  User,
  Clock,
  Award,
  Sparkles,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShareFAB } from '@/components/share-fab';
import { useI18n } from '@/lib/i18n/i18n-context';
import { useEffect, useState } from 'react';

interface Post {
  id: string;
  caption: string;
  cloud_storage_path: string;
  authorType: 'USER' | 'BARBER';
  likes: number;
  createdAt: string;
  author?: {
    name: string;
    image: string | null;
  };
  barber?: {
    user: {
      name: string;
    };
  };
}

interface Barber {
  id: string;
  profileImage?: string | null;
  gender?: 'MALE' | 'FEMALE' | 'BOTH' | null;
  user?: {
    name?: string | null;
    image?: string | null;
  };
  specialties?: string | null;
  bio?: string | null;
  hourlyRate?: number | null;
  rating?: number | null;
  _count?: {
    reviews?: number;
  };
}

export default function InicioPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { t } = useI18n();
  const [stats, setStats] = useState({
    upcomingAppointments: 0,
    totalAppointments: 0,
  });
  const [recentPosts, setRecentPosts] = useState<Post[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);

  useEffect(() => {
    // /inicio is a public landing page. If unauthenticated, render the page normally.
    // If authenticated, middleware will redirect off /inicio.
    if (status === 'authenticated' && session?.user?.role === 'CLIENT') {
      fetchClientStats();
    }

    fetchRecentPosts();
  }, [session, status, router]);

  const fetchClientStats = async () => {
    try {
      const res = await fetch('/api/appointments');
      const data: unknown = await res.json();
      const appointments =
        typeof data === 'object' && data !== null && 'appointments' in data
          ? (data as { appointments?: unknown }).appointments
          : undefined;
      
      if (res.ok && Array.isArray(appointments)) {
        const now = new Date();
        const upcoming = appointments.filter((apt) => {
          if (typeof apt !== 'object' || apt === null) return false;
          const date = (apt as { date?: unknown }).date;
          const status = (apt as { status?: unknown }).status;
          if (typeof date !== 'string' && !(date instanceof Date)) return false;
          const aptDate = new Date(date);
          return aptDate >= now && status === 'CONFIRMED';
        });
        
        setStats({
          upcomingAppointments: upcoming.length,
          totalAppointments: appointments.length,
        });
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchRecentPosts = async () => {
    try {
      const res = await fetch('/api/posts?status=APPROVED');
      const data = await res.json();
      
      if (res.ok && data.posts) {
        setRecentPosts(data.posts.slice(0, 6));
      }
    } catch (error) {
      console.error('Error fetching recent posts:', error);
    }
  };

  const getMediaUrl = (cloud_storage_path: string) => {
    if (/^https?:\/\//i.test(cloud_storage_path)) {
      return cloud_storage_path;
    }

    if (cloud_storage_path.startsWith('/')) {
      return cloud_storage_path;
    }

    const bucketName = process.env.NEXT_PUBLIC_AWS_BUCKET_NAME;
    const region = process.env.NEXT_PUBLIC_AWS_REGION || 'us-east-1';
    if (!bucketName) return cloud_storage_path;
    return `https://${bucketName}.s3.${region}.amazonaws.com/${cloud_storage_path}`;
  };

  const fetchBarbers = async () => {
    try {
      const res = await fetch('/api/barbers');
      const data = await res.json();
      const barbersArray = Array.isArray(data) ? data : (data.barbers || []);
      setBarbers(barbersArray);
    } catch (error) {
      console.error('Error fetching barbers on inicio:', error);
      setBarbers([]);
    }
  };

  useEffect(() => {
    // Load barbers for the inicio dashboard
    fetchBarbers();
  }, []);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#00f0ff]"></div>
      </div>
    );
  }

  const navigationCards = [
    {
      title: t('common.bookAppointmentCard'),
      description: t('common.bookAppointmentDesc'),
      icon: Calendar,
      href: '/reservar',
      color: 'from-[#00f0ff] to-[#0099cc]',
      gradient: 'bg-gradient-to-br from-[#00f0ff]/20 to-[#0099cc]/20',
    },
    {
      title: t('common.myProfileCard'),
      description: t('common.myProfileDesc'),
      icon: User,
      href: '/perfil',
      color: 'from-[#ffd700] to-[#ffaa00]',
      gradient: 'bg-gradient-to-br from-[#ffd700]/20 to-[#ffaa00]/20',
    },
    {
      title: t('common.galleryCard'),
      description: t('common.galleryDesc'),
      icon: ImageIcon,
      href: '/galeria',
      color: 'from-purple-500 to-pink-500',
      gradient: 'bg-gradient-to-br from-purple-500/20 to-pink-500/20',
    },
    {
      title: t('common.reviewsCard'),
      description: t('common.reviewsDesc'),
      icon: Star,
      href: '/resenas',
      color: 'from-yellow-500 to-orange-500',
      gradient: 'bg-gradient-to-br from-yellow-500/20 to-orange-500/20',
    },
    {
      title: t('common.locationCard'),
      description: t('common.locationDesc'),
      icon: MapPin,
      href: '/ubicacion',
      color: 'from-green-500 to-emerald-500',
      gradient: 'bg-gradient-to-br from-green-500/20 to-emerald-500/20',
    },
    {
      title: t('common.assistantCard'),
      description: t('common.assistantDesc'),
      icon: MessageSquare,
      href: '/asistente',
      color: 'from-blue-500 to-cyan-500',
      gradient: 'bg-gradient-to-br from-blue-500/20 to-cyan-500/20',
    },
  ];

  return (
    <div className="min-h-screen bg-black pb-24">
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#00f0ff]/10 via-black to-black"></div>
        
        <div className="relative container mx-auto px-4 pt-8 pb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <div className="inline-flex items-center gap-2 bg-[#00f0ff]/10 border border-[#00f0ff]/30 rounded-full px-6 py-3 mb-6">
              <Sparkles className="w-5 h-5 text-[#00f0ff]" />
              <span className="text-[#00f0ff] font-semibold">{t('common.welcomeTo')}</span>
            </div>
            
            <h1 className="text-5xl md:text-6xl font-bold text-white mb-4">
              {t('common.hello')}, <span className="bg-gradient-to-r from-[#00f0ff] to-[#ffd700] bg-clip-text text-transparent">
                {session?.user?.name || t('common.client')}
              </span>
            </h1>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              {t('common.tagline')}
            </p>
          </motion.div>

          {/* Our Professional Team - Modern Design */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="mt-16 max-w-7xl mx-auto"
          >
            <div className="mb-8 flex flex-col items-center gap-4 sm:grid sm:grid-cols-[1fr_auto_1fr] sm:items-center sm:gap-0">
              <div className="hidden sm:block" />
              <div className="text-center">
                <h2 className="text-4xl font-bold mb-2">
                  <span className="text-white">Our </span>
                  <span className="bg-gradient-to-r from-[#00f0ff] to-[#ffd700] bg-clip-text text-transparent">
                    Professional Team
                  </span>
                </h2>
                <p className="text-gray-400">Experts in style and personal care</p>
              </div>
              <Link href="/barberos" className="sm:justify-self-end">
                <Button 
                  variant="outline" 
                  className="border-2 border-[#00f0ff] text-[#00f0ff] hover:bg-[#00f0ff] hover:text-black transition-all duration-300 shadow-[0_0_20px_rgba(0,240,255,0.3)] hover:shadow-[0_0_30px_rgba(0,240,255,0.6)]"
                >
                  View All
                  <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Button>
              </Link>
            </div>

            {barbers.length === 0 ? (
              <div className="text-center py-12 bg-gray-900/50 rounded-2xl border border-gray-800">
                <Scissors className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400 text-lg">No professionals available yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {barbers.map((barber, index) => (
                  <motion.div
                    key={barber.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: index * 0.1 }}
                    whileHover={{ y: -10 }}
                    className="group"
                  >
                    <Link href={`/barberos/${barber.id}`}>
                      <Card className="bg-gradient-to-br from-gray-900 to-gray-950 border-gray-800 hover:border-[#00f0ff] transition-all duration-500 overflow-hidden cursor-pointer relative">
                        {/* Glow effect on hover */}
                        <div className="absolute inset-0 bg-gradient-to-br from-[#00f0ff]/0 to-[#ffd700]/0 group-hover:from-[#00f0ff]/10 group-hover:to-[#ffd700]/10 transition-all duration-500" />
                        
                        <CardContent className="p-6 relative z-10">
                          {/* Profile Image with modern styling */}
                          <div className="relative w-32 h-32 mx-auto mb-4">
                            {/* Animated gradient border */}
                            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-[#00f0ff] via-[#ffd700] to-[#00f0ff] opacity-50 group-hover:opacity-100 blur-sm group-hover:blur-md transition-all duration-500 animate-pulse" />
                            
                            <div className="relative w-full h-full rounded-full overflow-hidden border-4 border-gray-900 shadow-xl group-hover:scale-105 transition-transform duration-500">
                              {barber.profileImage || barber.user?.image ? (
                                <Image 
                                  src={barber.profileImage || barber.user?.image || ''} 
                                  alt={barber.user?.name || 'Barber'} 
                                  fill 
                                  className="object-cover group-hover:scale-110 transition-transform duration-500"
                                />
                              ) : (
                                <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
                                  <Scissors className="w-12 h-12 text-gray-600 group-hover:text-[#00f0ff] transition-colors duration-300" />
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Name */}
                          <div className="text-center">
                            <h3 className="text-xl font-bold text-white mb-1 group-hover:text-[#00f0ff] transition-colors duration-300">
                              {barber.user?.name || 'Professional'}
                            </h3>
                            <p className="text-sm text-gray-400 mb-3">Style Specialist</p>
                            
                            {/* CTA Button */}
                            <div className="flex items-center justify-center gap-2 text-[#00f0ff] opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
                              <span className="text-sm font-semibold">View Profile</span>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                              </svg>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>

          {/* Stats Section - Solo para clientes */}
          {session?.user?.role === 'CLIENT' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto mb-16 mt-16"
            >
              <Card className="bg-gray-900/50 border-gray-800 backdrop-blur">
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="p-3 bg-[#00f0ff]/20 rounded-lg">
                    <Clock className="w-8 h-8 text-[#00f0ff]" />
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">{t('common.upcomingAppointments')}</p>
                    <p className="text-3xl font-bold text-white">{stats.upcomingAppointments}</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gray-900/50 border-gray-800 backdrop-blur">
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="p-3 bg-[#ffd700]/20 rounded-lg">
                    <Award className="w-8 h-8 text-[#ffd700]" />
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">{t('common.totalBookings')}</p>
                    <p className="text-3xl font-bold text-white">{stats.totalAppointments}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Navigation Cards Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto mt-16"
          >
            {navigationCards.map((card, index) => {
              const Icon = card.icon;
              return (
                <Link key={card.href} href={card.href}>
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: index * 0.1 }}
                    whileHover={{ scale: 1.05, y: -5 }}
                    whileTap={{ scale: 0.98 }}
                    className="h-full"
                  >
                    <Card className={`bg-gray-900 border-gray-800 hover:border-[#00f0ff] transition-all duration-300 h-full group overflow-hidden relative`}>
                      <div className={`absolute inset-0 ${card.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}></div>
                      
                      <CardContent className="p-8 relative z-10">
                        <div className={`p-4 bg-gradient-to-br ${card.color} rounded-xl inline-block mb-4 shadow-lg`}>
                          <Icon className="w-8 h-8 text-white" />
                        </div>
                        
                        <h3 className="text-2xl font-bold text-white mb-3 group-hover:text-[#00f0ff] transition-colors">
                          {card.title}
                        </h3>
                        <p className="text-gray-400 leading-relaxed">
                          {card.description}
                        </p>
                        
                        <div className="mt-4 flex items-center text-[#00f0ff] opacity-0 group-hover:opacity-100 transition-opacity">
                          <span className="text-sm font-semibold mr-2">{t('common.go')}</span>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                          </svg>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                </Link>
              );
            })}
          </motion.div>

          {recentPosts.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              className="mt-16 max-w-6xl mx-auto"
            >
              <div className="mb-8 flex flex-col items-center gap-4 sm:grid sm:grid-cols-[1fr_auto_1fr] sm:items-center sm:gap-0">
                <div className="hidden sm:block" />
                <h2 className="text-3xl font-bold text-white text-center">
                  {t('common.latestPosts')}
                </h2>
                <Link href="/feed" className="sm:justify-self-end">
                  <Button variant="outline" className="border-[#00f0ff] text-[#00f0ff] hover:bg-[#00f0ff]/10">
                    {t('common.viewAll')}
                  </Button>
                </Link>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {recentPosts.map((post, index) => (
                  <motion.div
                    key={post.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Link href="/feed">
                      <Card className="glass hover:scale-105 smooth-transition overflow-hidden group cursor-pointer">
                        <div className="relative aspect-square bg-zinc-800">
                          <Image
                            src={getMediaUrl(post.cloud_storage_path)}
                            alt={post.caption || 'Post'}
                            fill
                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                            className="object-cover group-hover:scale-110 transition-transform duration-300"
                            loading={index < 3 ? "eager" : "lazy"}
                            priority={index < 3}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="absolute bottom-0 left-0 right-0 p-4">
                              <p className="text-white text-sm font-semibold">
                                {post.authorType === 'BARBER' 
                                  ? post.barber?.user?.name 
                                  : post.author?.name}
                              </p>
                              {post.caption && (
                                <p className="text-gray-300 text-xs mt-1 line-clamp-2">
                                  {post.caption}
                                </p>
                              )}
                              <div className="flex items-center gap-3 mt-2">
                                <div className="flex items-center gap-1">
                                  <Star className="w-4 h-4 text-[#ffd700] fill-[#ffd700]" />
                                  <span className="text-white text-xs">{post.likes}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </Card>
                    </Link>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.8 }}
            className="text-center mt-16"
          >
            <Link href="/reservar">
              <Button
                size="lg"
                className="bg-gradient-to-r from-[#00f0ff] to-[#ffd700] text-black font-bold text-lg px-12 py-6 hover:shadow-[0_0_40px_rgba(0,240,255,0.6)] transition-all duration-300 group"
              >
                <Scissors className="w-6 h-6 mr-3 group-hover:rotate-12 transition-transform" />
                {t('common.bookNow')}
              </Button>
            </Link>
          </motion.div>
        </div>
      </div>

      <div className="h-20"></div>
      <ShareFAB />
    </div>
  );
}
