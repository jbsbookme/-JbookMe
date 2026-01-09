'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { AdminDashboardHeader } from '@/components/admin-dashboard-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, User, Calendar, DollarSign, Star, TrendingUp, Scissors, Wallet, FileText, Image as ImageIcon, MapPin, Share2, Bot, ShieldCheck, BarChart3 } from 'lucide-react';
import { AppointmentStatus } from '@prisma/client';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function AdminDashboard() {
  const router = useRouter();
  const { data: session, status } = useSession() || {};
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    
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
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) {
    return null;
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00f0ff]"></div>
      </div>
    );
  }

  if (!session?.user || session.user.role !== 'ADMIN' || !stats) {
    return null;
  }

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusColor = (status: AppointmentStatus) => {
    switch (status) {
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

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-[#1a1a1a] border-gray-800">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Citas Totales</CardTitle>
              <Calendar className="w-4 h-4 text-[#00f0ff]" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-[#00f0ff]">{stats.totalAppointments}</div>
              <p className="text-xs text-gray-500 mt-1">
                {stats.pendingAppointments} pendientes
              </p>
            </CardContent>
          </Card>

          <Card className="bg-[#1a1a1a] border-gray-800">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Clientes</CardTitle>
              <Users className="w-4 h-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-500">{stats.totalClients}</div>
              <p className="text-xs text-gray-500 mt-1">Clientes registrados</p>
            </CardContent>
          </Card>

          <Card className="bg-[#1a1a1a] border-gray-800">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Barberos</CardTitle>
              <Scissors className="w-4 h-4 text-[#ffd700]" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-[#ffd700]">{stats.totalBarbers}</div>
              <p className="text-xs text-gray-500 mt-1">Barberos activos</p>
            </CardContent>
          </Card>

          <Card className="bg-[#1a1a1a] border-gray-800">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Ingresos</CardTitle>
              <DollarSign className="w-4 h-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-500">${stats.totalRevenue.toFixed(0)}</div>
              <p className="text-xs text-gray-500 mt-1">De {stats.completedAppointments} citas</p>
            </CardContent>
          </Card>

          <Card className="bg-[#1a1a1a] border-gray-800">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Calificación</CardTitle>
              <Star className="w-4 h-4 text-[#ffd700]" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-[#ffd700]">{stats.avgRating.toFixed(1)}</div>
              <p className="text-xs text-gray-500 mt-1">{stats.totalReviews} reseñas</p>
            </CardContent>
          </Card>

          <Card className="bg-[#1a1a1a] border-gray-800">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Posts Pendientes</CardTitle>
              <ShieldCheck className="w-4 h-4 text-[#ffd700]" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-[#ffd700]">{stats.pendingPosts}</div>
              <Link href="/dashboard/admin/moderacion">
                <Button
                  variant="outline"
                  className="mt-2 w-full bg-transparent border-[#ffd700]/30 text-[#ffd700] hover:bg-[#ffd700]/10"
                >
                  Ver Posts
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Admin Menu */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
          <Link href="/dashboard/admin/citas">
            <Card className="bg-gradient-to-br from-[#1a1a1a] to-[#2a2a2a] border-gray-800 hover:border-[#00f0ff] transition-all cursor-pointer">
              <CardContent className="flex flex-col items-center justify-center p-6">
                <Calendar className="w-12 h-12 text-[#00f0ff] mb-2" />
                <p className="text-white font-medium">Citas</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/dashboard/admin/barberos">
            <Card className="bg-gradient-to-br from-[#1a1a1a] to-[#2a2a2a] border-gray-800 hover:border-[#ffd700] transition-all cursor-pointer">
              <CardContent className="flex flex-col items-center justify-center p-6">
                <Scissors className="w-12 h-12 text-[#ffd700] mb-2" />
                <p className="text-white font-medium">Barberos</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/dashboard/admin/usuarios">
            <Card className="bg-gradient-to-br from-[#1a1a1a] to-[#2a2a2a] border-gray-800 hover:border-green-500 transition-all cursor-pointer">
              <CardContent className="flex flex-col items-center justify-center p-6">
                <Users className="w-12 h-12 text-green-500 mb-2" />
                <p className="text-white font-medium">Usuarios</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/dashboard/admin/servicios">
            <Card className="bg-gradient-to-br from-[#1a1a1a] to-[#2a2a2a] border-gray-800 hover:border-blue-500 transition-all cursor-pointer">
              <CardContent className="flex flex-col items-center justify-center p-6">
                <User className="w-12 h-12 text-blue-500 mb-2" />
                <p className="text-white font-medium">Servicios</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/dashboard/admin/contabilidad">
            <Card className="bg-gradient-to-br from-[#1a1a1a] to-[#2a2a2a] border-gray-800 hover:border-green-500 transition-all cursor-pointer">
              <CardContent className="flex flex-col items-center justify-center p-6">
                <Wallet className="w-12 h-12 text-green-500 mb-2" />
                <p className="text-white font-medium">Contabilidad</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/dashboard/admin/ganancias">
            <Card className="bg-gradient-to-br from-[#1a1a1a] to-[#2a2a2a] border-gray-800 hover:border-yellow-500 transition-all cursor-pointer">
              <CardContent className="flex flex-col items-center justify-center p-6">
                <TrendingUp className="w-12 h-12 text-yellow-500 mb-2" />
                <p className="text-white font-medium">Ganancias</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/dashboard/admin/resenas">
            <Card className="bg-gradient-to-br from-[#1a1a1a] to-[#2a2a2a] border-gray-800 hover:border-[#ffd700] transition-all cursor-pointer">
              <CardContent className="flex flex-col items-center justify-center p-6">
                <Star className="w-12 h-12 text-[#ffd700] mb-2" />
                <p className="text-white font-medium">Reseñas</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/dashboard/admin/galeria">
            <Card className="bg-gradient-to-br from-[#1a1a1a] to-[#2a2a2a] border-gray-800 hover:border-purple-500 transition-all cursor-pointer">
              <CardContent className="flex flex-col items-center justify-center p-6">
                <ImageIcon className="w-12 h-12 text-purple-500 mb-2" />
                <p className="text-white font-medium">Galería</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/dashboard/admin/ubicacion">
            <Card className="bg-gradient-to-br from-[#1a1a1a] to-[#2a2a2a] border-gray-800 hover:border-red-500 transition-all cursor-pointer">
              <CardContent className="flex flex-col items-center justify-center p-6">
                <MapPin className="w-12 h-12 text-red-500 mb-2" />
                <p className="text-white font-medium">Ubicación</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/dashboard/admin/redes-sociales">
            <Card className="bg-gradient-to-br from-[#1a1a1a] to-[#2a2a2a] border-gray-800 hover:border-pink-500 transition-all cursor-pointer">
              <CardContent className="flex flex-col items-center justify-center p-6">
                <Share2 className="w-12 h-12 text-pink-500 mb-2" />
                <p className="text-white font-medium">Redes Sociales</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/asistente">
            <Card className="bg-gradient-to-br from-[#1a1a1a] to-[#2a2a2a] border-gray-800 hover:border-[#00f0ff] transition-all cursor-pointer">
              <CardContent className="flex flex-col items-center justify-center p-6">
                <Bot className="w-12 h-12 text-[#00f0ff] mb-2" />
                <p className="text-white font-medium">Asistente IA</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/dashboard/admin/moderacion">
            <Card className="bg-gradient-to-br from-[#1a1a1a] to-[#2a2a2a] border-gray-800 hover:border-orange-500 transition-all cursor-pointer">
              <CardContent className="flex flex-col items-center justify-center p-6">
                <ShieldCheck className="w-12 h-12 text-orange-500 mb-2" />
                <p className="text-white font-medium">Moderación</p>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Recent Appointments */}
        <Card className="bg-[#1a1a1a] border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">Citas Recientes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.recentAppointments?.map((appointment: any) => (
                <div
                  key={appointment.id}
                  className="flex items-center justify-between p-4 bg-[#2a2a2a] rounded-lg"
                >
                  <div className="flex-1">
                    <p className="text-white font-medium">{appointment.client.name}</p>
                    <p className="text-gray-400 text-sm">{appointment.client.email}</p>
                  </div>
                  <div className="flex-1 text-center">
                    <p className="text-white">{appointment.service?.name || 'N/A'}</p>
                    <p className="text-gray-400 text-sm">
                      con {appointment.barber?.user?.name || 'N/A'}
                    </p>
                  </div>
                  <div className="flex-1 text-right">
                    <p className="text-white">{formatDate(appointment.date)}</p>
                    <p className={`text-sm font-medium ${getStatusColor(appointment.status)}`}>
                      {appointment.status}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
