'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { AdminDashboardHeader } from '@/components/admin-dashboard-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, User, Calendar, DollarSign, Star, TrendingUp, Scissors, Wallet, Image as ImageIcon, MapPin, Share2, Bot, ShieldCheck } from 'lucide-react';
import { AppointmentStatus } from '@prisma/client';
import Link from 'next/link';

type AdminRecentAppointment = {
  id: string;
  date: string | Date;
  status: AppointmentStatus | string;
  client?: { name?: string | null } | null;
  service?: { name?: string | null } | null;
};

type AdminNewClient = {
  id: string;
  name?: string | null;
  email?: string | null;
};

type AdminStats = {
  totalAppointments: number;
  totalClients: number;
  monthlyRevenue: number | string;
  averageRating: number | string;
  recentAppointments?: AdminRecentAppointment[];
  newClients?: AdminNewClient[];
};

export function AdminDashboardClient() {
  const router = useRouter();
  const { data: session, status } = useSession() || {};
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }
    
    if (status === 'authenticated' && session?.user?.role !== 'ADMIN') {
      router.push('/dashboard');
      return;
    }

    if (status === 'authenticated') {
      fetchStats();
    }
  }, [status, session, router]);

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/admin/stats');
      
      if (response.ok) {
        const data = await response.json();
        setStats(data);
        setStatsError(null);
      } else {
        const bodyText = await response.text();
        console.error('[AdminDashboard] Failed to fetch stats:', bodyText);

        if (response.status === 503) {
          setStatsError('Database not available. Install/start local Postgres to view statistics.');
        } else {
          setStatsError('Could not load statistics.');
        }

        // Keep rendering the dashboard UI even if stats fail.
        setStats({
          totalAppointments: 0,
          totalClients: 0,
          monthlyRevenue: 0,
          averageRating: 0,
          recentAppointments: [],
          newClients: [],
        });
      }
    } catch (error) {
      console.error('[AdminDashboard] Error fetching stats:', error);
      setStatsError('Could not load statistics.');
      setStats({
        totalAppointments: 0,
        totalClients: 0,
        monthlyRevenue: 0,
        averageRating: 0,
        recentAppointments: [],
        newClients: [],
      });
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00f0ff]"></div>
      </div>
    );
  }

  if (!session?.user || session.user.role !== 'ADMIN') {
    return null;
  }

  const displayStats: AdminStats =
    stats ??
    ({
      totalAppointments: 0,
      totalClients: 0,
      monthlyRevenue: 0,
      averageRating: 0,
      recentAppointments: [],
      newClients: [],
    } satisfies AdminStats);

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getStatusColor = (status: AppointmentStatus | string) => {
    const normalized = Object.values(AppointmentStatus).includes(status as AppointmentStatus)
      ? (status as AppointmentStatus)
      : null;

    switch (normalized) {
      case AppointmentStatus.CONFIRMED:
        return 'text-green-500';
      case AppointmentStatus.PENDING:
        return 'text-yellow-500';
      case AppointmentStatus.COMPLETED:
        return 'text-blue-500';
      default:
        return 'text-gray-400';
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a]">

      <main className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <AdminDashboardHeader />

        {statsError ? (
          <Card className="bg-[#1a1a1a] border-gray-800 mb-6">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-gray-200">Data status</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-400">{statsError}</p>
            </CardContent>
          </Card>
        ) : null}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-[#1a1a1a] border-gray-800">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Total Appointments</CardTitle>
              <Calendar className="w-4 h-4 text-[#00f0ff]" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-[#00f0ff]">{displayStats.totalAppointments}</div>
            </CardContent>
          </Card>

          <Card className="bg-[#1a1a1a] border-gray-800">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Active Clients</CardTitle>
              <Users className="w-4 h-4 text-[#ffd700]" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-[#ffd700]">{displayStats.totalClients}</div>
            </CardContent>
          </Card>

          <Card className="bg-[#1a1a1a] border-gray-800">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Monthly Revenue</CardTitle>
              <DollarSign className="w-4 h-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-500">${displayStats.monthlyRevenue}</div>
            </CardContent>
          </Card>

          <Card className="bg-[#1a1a1a] border-gray-800">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Average Rating</CardTitle>
              <Star className="w-4 h-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-yellow-500">{displayStats.averageRating}</div>
            </CardContent>
          </Card>
        </div>

        {/* Management Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
          <Link href="/dashboard/admin/usuarios">
            <Card className="bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a] border-gray-800 hover:border-[#00f0ff] transition-all cursor-pointer h-full">
              <CardContent className="flex flex-col items-center justify-center p-6 space-y-2">
                <ShieldCheck className="w-8 h-8 text-[#00f0ff]" />
                <h3 className="text-lg font-semibold text-white">Users</h3>
                <p className="text-sm text-gray-400 text-center">User and role management</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/dashboard/admin/barberos">
            <Card className="bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a] border-gray-800 hover:border-[#00f0ff] transition-all cursor-pointer h-full">
              <CardContent className="flex flex-col items-center justify-center p-6 space-y-2">
                <Scissors className="w-8 h-8 text-[#ffd700]" />
                <h3 className="text-lg font-semibold text-white">Barbers</h3>
                <p className="text-sm text-gray-400 text-center">Manage barbers and stylists</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/dashboard/admin/citas">
            <Card className="bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a] border-gray-800 hover:border-[#00f0ff] transition-all cursor-pointer h-full">
              <CardContent className="flex flex-col items-center justify-center p-6 space-y-2">
                <Calendar className="w-8 h-8 text-[#00f0ff]" />
                <h3 className="text-lg font-semibold text-white">Appointments</h3>
                <p className="text-sm text-gray-400 text-center">View and manage bookings</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/dashboard/admin/servicios">
            <Card className="bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a] border-gray-800 hover:border-[#00f0ff] transition-all cursor-pointer h-full">
              <CardContent className="flex flex-col items-center justify-center p-6 space-y-2">
                <Scissors className="w-8 h-8 text-[#ffd700]" />
                <h3 className="text-lg font-semibold text-white">Services</h3>
                <p className="text-sm text-gray-400 text-center">Manage catalog</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/dashboard/admin/resenas">
            <Card className="bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a] border-gray-800 hover:border-[#00f0ff] transition-all cursor-pointer h-full">
              <CardContent className="flex flex-col items-center justify-center p-6 space-y-2">
                <Star className="w-8 h-8 text-yellow-500" />
                <h3 className="text-lg font-semibold text-white">Reviews</h3>
                <p className="text-sm text-gray-400 text-center">Moderate reviews</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/dashboard/admin/contabilidad">
            <Card className="bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a] border-gray-800 hover:border-[#00f0ff] transition-all cursor-pointer h-full">
              <CardContent className="flex flex-col items-center justify-center p-6 space-y-2">
                <Wallet className="w-8 h-8 text-green-500" />
                <h3 className="text-lg font-semibold text-white">Accounting</h3>
                <p className="text-sm text-gray-400 text-center">Payments and expenses</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/dashboard/admin/ganancias">
            <Card className="bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a] border-gray-800 hover:border-[#00f0ff] transition-all cursor-pointer h-full">
              <CardContent className="flex flex-col items-center justify-center p-6 space-y-2">
                <TrendingUp className="w-8 h-8 text-[#00f0ff]" />
                <h3 className="text-lg font-semibold text-white">Earnings</h3>
                <p className="text-sm text-gray-400 text-center">Financial statistics</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/dashboard/admin/moderacion">
            <Card className="bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a] border-gray-800 hover:border-[#00f0ff] transition-all cursor-pointer h-full">
              <CardContent className="flex flex-col items-center justify-center p-6 space-y-2">
                <ShieldCheck className="w-8 h-8 text-red-500" />
                <h3 className="text-lg font-semibold text-white">Moderation</h3>
                <p className="text-sm text-gray-400 text-center">Reported content</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/dashboard/admin/galeria">
            <Card className="bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a] border-gray-800 hover:border-[#00f0ff] transition-all cursor-pointer h-full">
              <CardContent className="flex flex-col items-center justify-center p-6 space-y-2">
                <ImageIcon className="w-8 h-8 text-purple-500" />
                <h3 className="text-lg font-semibold text-white">Gallery</h3>
                <p className="text-sm text-gray-400 text-center">Media management</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/dashboard/admin/ubicacion">
            <Card className="bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a] border-gray-800 hover:border-[#00f0ff] transition-all cursor-pointer h-full">
              <CardContent className="flex flex-col items-center justify-center p-6 space-y-2">
                <MapPin className="w-8 h-8 text-[#ffd700]" />
                <h3 className="text-lg font-semibold text-white">Location</h3>
                <p className="text-sm text-gray-400 text-center">Contact and address</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/dashboard/admin/redes-sociales">
            <Card className="bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a] border-gray-800 hover:border-[#00f0ff] transition-all cursor-pointer h-full">
              <CardContent className="flex flex-col items-center justify-center p-6 space-y-2">
                <Share2 className="w-8 h-8 text-blue-500" />
                <h3 className="text-lg font-semibold text-white">Social Media</h3>
                <p className="text-sm text-gray-400 text-center">Links and profiles</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/asistente">
            <Card className="bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a] border-gray-800 hover:border-[#00f0ff] transition-all cursor-pointer h-full">
              <CardContent className="flex flex-col items-center justify-center p-6 space-y-2">
                <Bot className="w-8 h-8 text-[#00f0ff]" />
                <h3 className="text-lg font-semibold text-white">Asistente IA</h3>
                <p className="text-sm text-gray-400 text-center">Chat inteligente</p>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="bg-[#1a1a1a] border-gray-800">
            <CardHeader>
              <CardTitle className="text-white">Recent Appointments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {displayStats.recentAppointments && displayStats.recentAppointments.length > 0 ? (
                  displayStats.recentAppointments.slice(0, 5).map((appointment) => (
                    <div key={appointment.id} className="flex items-center justify-between py-2 border-b border-gray-800">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-white">{appointment.client?.name || 'Client'}</p>
                        <p className="text-xs text-gray-400">
                          {formatDate(appointment.date)} - {appointment.service?.name || 'Service'}
                        </p>
                      </div>
                      <span className={`text-xs font-semibold ${getStatusColor(appointment.status)}`}>
                        {appointment.status}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-400 text-center py-4">No recent appointments</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#1a1a1a] border-gray-800">
            <CardHeader>
              <CardTitle className="text-white">New Clients</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {displayStats.newClients && displayStats.newClients.length > 0 ? (
                  displayStats.newClients.slice(0, 5).map((client) => (
                    <div key={client.id} className="flex items-center py-2 border-b border-gray-800">
                      <User className="w-8 h-8 rounded-full bg-[#00f0ff]/20 text-[#00f0ff] p-2 mr-3" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-white">{client.name || 'Client'}</p>
                        <p className="text-xs text-gray-400">{client.email || 'No email'}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-400 text-center py-4">No new clients</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
