'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { DashboardNavbar } from '@/components/dashboard/navbar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DollarSign, Users, TrendingUp, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

export default function AdminEarningsPage() {
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  const [earnings, setEarnings] = useState<any>(null);
  const [period, setPeriod] = useState('week');
  const [selectedBarberId, setSelectedBarberId] = useState<string>('all');
  const [barbers, setBarbers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'loading') return;

    if (!session || session.user.role !== 'ADMIN') {
      router.push('/dashboard');
      return;
    }

    loadBarbers();
    loadEarnings();
  }, [session, status, router]);

  const loadBarbers = async () => {
    try {
      const res = await fetch('/api/barbers');
      if (res.ok) {
        const data = await res.json();
        setBarbers(data);
      }
    } catch (error) {
      console.error('Error loading barbers:', error);
    }
  };

  const loadEarnings = async (newPeriod: string = period, barberId: string = selectedBarberId) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ period: newPeriod });
      if (barberId !== 'all') {
        params.append('barberId', barberId);
      }
      
      const res = await fetch(`/api/admin/earnings?${params}`);
      
      if (!res.ok) throw new Error('Error al cargar ganancias');
      
      const data = await res.json();
      setEarnings(data);
    } catch (error) {
      console.error('Error loading earnings:', error);
      toast.error('Error al cargar ganancias');
    } finally {
      setLoading(false);
    }
  };

  const handlePeriodChange = (value: string) => {
    setPeriod(value);
    loadEarnings(value, selectedBarberId);
  };

  const handleBarberChange = (value: string) => {
    setSelectedBarberId(value);
    loadEarnings(period, value);
  };

  return (
    <>
      <DashboardNavbar />
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <Link href="/dashboard/admin">
              <Button variant="outline" size="icon" className="border-gray-700 hover:border-[#00f0ff] flex-shrink-0">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-3xl font-bold text-[#00f0ff] truncate">Ganancias Totales</h1>
              <p className="text-gray-400 mt-1 text-sm sm:text-base">Vista de ganancias de todos los barberos</p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
            <Select value={selectedBarberId} onValueChange={handleBarberChange}>
              <SelectTrigger className="w-full sm:w-[200px] bg-zinc-800 border-zinc-700 text-white">
                <SelectValue placeholder="Filtrar barbero" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-800 border-zinc-700">
                <SelectItem value="all" className="text-white">Todos los barberos</SelectItem>
                {Array.isArray(barbers) && barbers.map((barber) => (
                  <SelectItem key={barber.id} value={barber.id} className="text-white">
                    {barber.user?.name || barber.user?.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={period} onValueChange={handlePeriodChange}>
              <SelectTrigger className="w-full sm:w-[180px] bg-zinc-800 border-zinc-700 text-white">
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-800 border-zinc-700">
                <SelectItem value="week" className="text-white">Esta Semana</SelectItem>
                <SelectItem value="month" className="text-white">Este Mes</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00f0ff]"></div>
          </div>
        ) : earnings ? (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-gradient-to-br from-green-900/20 to-emerald-900/20 border-green-500/30">
                <CardHeader>
                  <CardTitle className="text-lg text-white flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-green-400" />
                    Total Ganado
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-4xl font-bold text-green-400">
                    ${earnings.summary?.totalEarnings?.toFixed(2) || '0.00'}
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-blue-900/20 to-cyan-900/20 border-blue-500/30">
                <CardHeader>
                  <CardTitle className="text-lg text-white flex items-center gap-2">
                    <Users className="w-5 h-5 text-blue-400" />
                    Clientes Atendidos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-4xl font-bold text-blue-400">
                    {earnings.summary?.totalClients || 0}
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-purple-900/20 to-pink-900/20 border-purple-500/30">
                <CardHeader>
                  <CardTitle className="text-lg text-white flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-purple-400" />
                    Barberos Activos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-4xl font-bold text-purple-400">
                    {earnings.summary?.totalBarbers || 0}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Earnings by Barber */}
            {selectedBarberId === 'all' && Array.isArray(earnings.barbers) && earnings.barbers.length > 0 && (
              <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader>
                  <CardTitle className="text-[#00f0ff]">Ganancias por Barbero</CardTitle>
                  <CardDescription>Desglose individual de cada barbero</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {earnings.barbers.map((barber: any) => (
                      <Card key={barber.barberId} className="bg-black/30 border-zinc-800">
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <div>
                              <CardTitle className="text-white">{barber.barberName}</CardTitle>
                              <p className="text-sm text-gray-400">{barber.barberEmail}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-2xl font-bold text-green-400">
                                ${barber.totalEarnings.toFixed(2)}
                              </p>
                              <p className="text-sm text-gray-400">{barber.totalClients} cliente(s)</p>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-3 gap-4">
                            {barber.byPaymentMethod && Object.entries(barber.byPaymentMethod).map(([method, data]: [string, any]) => (
                              <div key={method} className="text-center p-3 bg-zinc-900 rounded-lg">
                                <p className="text-xs text-gray-400 uppercase">
                                  {method === 'CASH' ? 'Efectivo' :
                                   method === 'ZELLE' ? 'Zelle' :
                                   method === 'CASHAPP' ? 'CashApp' : method}
                                </p>
                                <p className="text-lg font-bold text-white">${data.total.toFixed(2)}</p>
                                <p className="text-xs text-gray-500">{data.count} pago(s)</p>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Recent Transactions */}
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-[#00f0ff]">Transacciones Recientes</CardTitle>
                <CardDescription>Últimas 20 transacciones registradas</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Array.isArray(earnings.recentTransactions) && earnings.recentTransactions.length > 0 ? (
                    earnings.recentTransactions.map((transaction: any) => (
                      <div key={transaction.id} className="flex items-center justify-between p-4 bg-black/30 rounded-lg border border-zinc-800">
                        <div className="flex-1">
                          <p className="font-semibold text-white">{transaction.clientName}</p>
                          <p className="text-sm text-gray-400">
                            Barbero: {transaction.barberName} • {transaction.serviceName}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(transaction.date).toLocaleDateString('es-ES')} - {transaction.time}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-green-400">${transaction.amount.toFixed(2)}</p>
                          <p className="text-xs text-gray-400">
                            {transaction.paymentMethod === 'CASH' ? 'Efectivo' :
                             transaction.paymentMethod === 'ZELLE' ? 'Zelle' :
                             transaction.paymentMethod === 'CASHAPP' ? 'CashApp' : transaction.paymentMethod}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-gray-400 py-8">No hay transacciones registradas en este período</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </>
        ) : (
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="py-12">
              <p className="text-center text-gray-400">No hay datos de ganancias disponibles</p>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
