'use client';

import { useSession } from 'next-auth/react';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DollarSign, Users, TrendingUp, ArrowLeft, Award, TrendingDown, CreditCard, PieChart, BarChart3, Target, Download } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { format } from 'date-fns';
import { enUS } from 'date-fns/locale';

type BarberOption = {
  id: string;
  user?: { name?: string | null; email?: string | null } | null;
};

type PaymentMethodStats = Record<string, { total: number; count: number }>;

type EarningsBarber = {
  barberId: string;
  barberName: string;
  barberEmail?: string | null;
  totalEarnings: number;
  totalClients: number;
  byPaymentMethod?: Record<string, { count: number; total: number }>;
};

type RecentTransaction = {
  id: string;
  date: string | Date;
  time: string;
  clientName: string;
  barberName: string;
  serviceName: string;
  amount: number;
  paymentMethod?: string | null;
};

type EarningsResponse = {
  summary?: {
    totalEarnings?: number;
    totalClients?: number;
    totalBarbers?: number;
  };
  barbers?: EarningsBarber[];
  recentTransactions?: RecentTransaction[];
};

export default function AdminEarningsPage() {
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  const [earnings, setEarnings] = useState<EarningsResponse | null>(null);
  const [period, setPeriod] = useState('week');
  const [selectedBarberId, setSelectedBarberId] = useState<string>('all');
  const [barbers, setBarbers] = useState<BarberOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [previousPeriodEarnings, setPreviousPeriodEarnings] = useState(0);

  const loadBarbers = useCallback(async () => {
    try {
      const res = await fetch('/api/barbers');
      if (res.ok) {
        const data: unknown = await res.json();
        const payload = data as { barbers?: BarberOption[] };
        setBarbers(Array.isArray(payload.barbers) ? payload.barbers : []);
      }
    } catch (error) {
      console.error('Error loading barbers:', error);
    }
  }, []);

  const loadEarnings = useCallback(async (newPeriod: string, barberId: string) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ period: newPeriod });
      if (barberId !== 'all') {
        params.append('barberId', barberId);
      }
      
      const res = await fetch(`/api/admin/earnings?${params}`);
      
      if (!res.ok) throw new Error('Error loading earnings');
      
      const data: unknown = await res.json();
      setEarnings(data as EarningsResponse);
      
      // Load previous period for comparison
      const previousPeriod = newPeriod === 'week' ? 'lastWeek' : 'lastMonth';
      const prevParams = new URLSearchParams({ period: previousPeriod });
      if (barberId !== 'all') {
        prevParams.append('barberId', barberId);
      }
      
      const prevRes = await fetch(`/api/admin/earnings?${prevParams}`);
      if (prevRes.ok) {
        const prevData: unknown = await prevRes.json();
        const prev = prevData as EarningsResponse;
        setPreviousPeriodEarnings(prev.summary?.totalEarnings || 0);
      }
    } catch (error) {
      console.error('Error loading earnings:', error);
      toast.error('Error loading earnings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === 'loading') return;

    if (!session || session.user.role !== 'ADMIN') {
      router.push('/dashboard');
      return;
    }

    loadBarbers();
    loadEarnings('week', 'all');
  }, [loadBarbers, loadEarnings, router, session, status]);

  const handlePeriodChange = (value: string) => {
    setPeriod(value);
    loadEarnings(value, selectedBarberId);
  };

  const handleBarberChange = (value: string) => {
    setSelectedBarberId(value);
    loadEarnings(period, value);
  };

  const exportToCSV = () => {
    if (!earnings?.recentTransactions?.length) {
      toast.error('No hay transacciones para exportar');
      return;
    }

    const csvData = [
      ['Date', 'Time', 'Client', 'Barber', 'Service', 'Price', 'Payment Method'],
      ...(earnings.recentTransactions || []).map((t) => [
        new Date(t.date).toLocaleDateString('es-ES'),
        t.time,
        t.clientName,
        t.barberName,
        t.serviceName,
        `$${t.amount.toFixed(2)}`,
        t.paymentMethod,
      ]),
    ];

    const csv = csvData.map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `total-earnings-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    toast.success('Exportado correctamente');
  };

  const getPaymentMethodStats = () => {
    if (!earnings?.barbers) return null;
    
    const stats: PaymentMethodStats = {
      CASH: { total: 0, count: 0 },
      ZELLE: { total: 0, count: 0 },
      CASHAPP: { total: 0, count: 0 },
      CARD: { total: 0, count: 0 },
    };

    earnings.barbers.forEach((barber) => {
      if (barber.byPaymentMethod) {
        Object.entries(barber.byPaymentMethod).forEach(([method, data]) => {
          if (stats[method as keyof typeof stats]) {
            stats[method as keyof typeof stats].total += data.total;
            stats[method as keyof typeof stats].count += data.count;
          }
        });
      }
    });

    return stats;
  };

  const getTopBarbers = () => {
    if (!earnings?.barbers) return [];
    return [...earnings.barbers]
      .sort((a, b) => b.totalEarnings - a.totalEarnings)
      .slice(0, 5);
  };

  const currentEarnings = earnings?.summary?.totalEarnings || 0;
  const percentageChange = previousPeriodEarnings > 0
    ? ((currentEarnings - previousPeriodEarnings) / previousPeriodEarnings) * 100
    : 0;

  return (
    <>
      <div className="container mx-auto p-6 space-y-6 pb-24">
        {/* Header */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <Link href="/dashboard/admin">
              <Button variant="outline" size="icon" className="border-gray-700 hover:border-[#00f0ff] flex-shrink-0">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div className="min-w-0 flex-1">
              <h1 className="text-xl sm:text-3xl font-bold truncate">
                <span className="text-white">Total </span>
                <span className="bg-gradient-to-r from-[#00f0ff] to-[#ffd700] bg-clip-text text-transparent">
                  Earnings
                </span>
              </h1>
              <p className="text-gray-400 mt-1 text-sm sm:text-base">Earnings view for all barbers</p>
            </div>
            <Button
              onClick={exportToCSV}
              className="bg-gradient-to-r from-[#00f0ff] to-[#0099cc] hover:from-[#00d4e6] hover:to-[#0088bb] text-black font-semibold"
            >
              <Download className="w-4 h-4 mr-2" />
              Exportar
            </Button>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
            <Select value={selectedBarberId} onValueChange={handleBarberChange}>
              <SelectTrigger className="w-full sm:w-[200px] bg-zinc-800 border-zinc-700 text-white">
                <SelectValue placeholder="Filter barber" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-800 border-zinc-700">
                <SelectItem value="all" className="text-white">All barbers</SelectItem>
                {Array.isArray(barbers) && barbers.map((barber) => (
                  <SelectItem key={barber.id} value={barber.id} className="text-white">
                    {barber.user?.name || barber.user?.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={period} onValueChange={handlePeriodChange}>
              <SelectTrigger className="w-full sm:w-[180px] bg-zinc-800 border-zinc-700 text-white">
                <SelectValue placeholder="Period" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-800 border-zinc-700">
                <SelectItem value="today" className="text-white">Hoy</SelectItem>
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
              <Card className="bg-gradient-to-br from-green-900/20 to-emerald-900/20 border-green-500/30 hover:border-green-400 transition-all">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-gray-400 flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-green-400" />
                    Total Ganado
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-4xl font-bold text-green-400 mb-1">
                    ${earnings.summary?.totalEarnings?.toFixed(2) || '0.00'}
                  </p>
                  {previousPeriodEarnings > 0 && (
                    <div className="flex items-center gap-1 text-xs">
                      {percentageChange > 0 ? (
                        <>
                          <TrendingUp className="w-3 h-3 text-green-400" />
                          <span className="text-green-400">+{percentageChange.toFixed(1)}%</span>
                        </>
                      ) : percentageChange < 0 ? (
                        <>
                          <TrendingDown className="w-3 h-3 text-red-400" />
                          <span className="text-red-400">{percentageChange.toFixed(1)}%</span>
                        </>
                      ) : null}
                      <span className="text-gray-500 ml-1">vs previous period</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-blue-900/20 to-cyan-900/20 border-blue-500/30 hover:border-blue-400 transition-all">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-gray-400 flex items-center gap-2">
                    <Users className="w-5 h-5 text-blue-400" />
                    Clients Attended
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-4xl font-bold text-blue-400">
                    {earnings.summary?.totalClients || 0}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {earnings.recentTransactions?.length || 0} transacciones
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-purple-900/20 to-pink-900/20 border-purple-500/30 hover:border-purple-400 transition-all">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-gray-400 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-purple-400" />
                    Active Barbers
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-4xl font-bold text-purple-400">
                    {earnings.summary?.totalBarbers || 0}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Average: ${(currentEarnings / (earnings.summary?.totalBarbers || 1)).toFixed(2)} per barber
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Insights Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Top Barbers Ranking */}
              <Card className="bg-gray-900 border-gray-800">
                <CardHeader>
                  <CardTitle className="text-lg text-white flex items-center gap-2">
                    <Award className="w-5 h-5 text-[#ffd700]" />
                    Top Barbers
                  </CardTitle>
                  <CardDescription>Ranking by earnings in this period</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {getTopBarbers().map((barber, index: number) => {
                      const maxEarnings = getTopBarbers()[0]?.totalEarnings || 1;
                      const percentage = (barber.totalEarnings / maxEarnings) * 100;
                      return (
                        <div key={barber.barberId} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                                index === 0 ? 'bg-[#ffd700]/20 text-[#ffd700]' :
                                index === 1 ? 'bg-gray-500/20 text-gray-400' :
                                index === 2 ? 'bg-orange-500/20 text-orange-500' :
                                'bg-gray-700/20 text-gray-500'
                              }`}>
                                {index + 1}
                              </div>
                              <div>
                                <p className="text-sm font-medium text-white">{barber.barberName}</p>
                                <p className="text-xs text-gray-500">{barber.totalClients} clients</p>
                              </div>
                            </div>
                            <p className="text-lg font-bold text-green-400">${barber.totalEarnings.toFixed(2)}</p>
                          </div>
                          <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                index === 0 ? 'bg-gradient-to-r from-[#ffd700] to-[#ffaa00]' :
                                'bg-gradient-to-r from-[#00f0ff] to-[#0099cc]'
                              }`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Payment Methods Breakdown */}
              <Card className="bg-gray-900 border-gray-800">
                <CardHeader>
                  <CardTitle className="text-lg text-white flex items-center gap-2">
                    <PieChart className="w-5 h-5 text-[#00f0ff]" />
                    Payment Methods
                  </CardTitle>
                  <CardDescription>Total distribution by method</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {getPaymentMethodStats() && Object.entries(getPaymentMethodStats()!).map(([method, data]) => {
                      const totalEarnings = currentEarnings;
                      const percentage = totalEarnings > 0 ? (data.total / totalEarnings) * 100 : 0;
                      const methodName = method === 'CASH' ? 'Efectivo' :
                                       method === 'ZELLE' ? 'Zelle' :
                                       method === 'CASHAPP' ? 'CashApp' : 
                                       method === 'CARD' ? 'Tarjeta' : method;
                      const color = method === 'CASH' ? 'green' :
                                   method === 'ZELLE' ? 'purple' :
                                   method === 'CASHAPP' ? 'blue' : 'yellow';
                      
                      return (
                        <div key={method} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <CreditCard className={`w-4 h-4 text-${color}-400`} />
                              <span className="text-sm text-white font-medium">{methodName}</span>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-bold text-white">${data.total.toFixed(2)}</p>
                              <p className="text-xs text-gray-500">{data.count} pagos</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="flex-1 bg-gray-800 rounded-full h-2 overflow-hidden">
                              <div
                                className={`h-full bg-${color}-500 rounded-full transition-all`}
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                            <span className="text-xs text-gray-400 w-12 text-right">
                              {percentage.toFixed(0)}%
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Earnings by Barber - Detailed View */}
            {selectedBarberId === 'all' && Array.isArray(earnings.barbers) && earnings.barbers.length > 0 && (
              <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader>
                  <CardTitle className="text-xl text-white flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-[#00f0ff]" />
                    Earnings by Barber
                  </CardTitle>
                  <CardDescription>Individual breakdown for each barber</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {earnings.barbers
                      .sort((a, b) => b.totalEarnings - a.totalEarnings)
                      .map((barber) => (
                      <Card key={barber.barberId} className="bg-black/30 border-zinc-800 hover:border-[#00f0ff]/30 transition-all">
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
                              <p className="text-sm text-gray-400">{barber.totalClients} client(s)</p>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            {barber.byPaymentMethod && Object.entries(barber.byPaymentMethod).map(([method, data]) => (
                              <div key={method} className="text-center p-3 bg-zinc-900 rounded-lg border border-zinc-800">
                                <p className="text-xs text-gray-400 uppercase mb-1">
                                  {method === 'CASH' ? 'Efectivo' :
                                   method === 'ZELLE' ? 'Zelle' :
                                   method === 'CASHAPP' ? 'CashApp' : 
                                   method === 'CARD' ? 'Card' : method}
                                </p>
                                <p className="text-lg font-bold text-white">${data.total.toFixed(2)}</p>
                                <p className="text-xs text-gray-500">{data.count} payment(s)</p>
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
                <CardTitle className="text-xl text-white flex items-center gap-2">
                  <Target className="w-5 h-5 text-[#ffd700]" />
                  Recent Transactions
                </CardTitle>
                <CardDescription>Latest 20 recorded transactions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Array.isArray(earnings.recentTransactions) && earnings.recentTransactions.length > 0 ? (
                    earnings.recentTransactions.map((transaction) => (
                      <div key={transaction.id} className="flex items-center justify-between p-4 bg-black/30 rounded-lg border border-zinc-800 hover:border-[#00f0ff]/30 transition-all">
                        <div className="flex-1">
                          <p className="font-semibold text-white">{transaction.clientName}</p>
                          <p className="text-sm text-gray-400">
                            Barber: {transaction.barberName} • {transaction.serviceName}
                          </p>
                          <p className="text-xs text-gray-500">
                            {format(new Date(transaction.date), 'dd MMM yyyy', { locale: enUS })} - {transaction.time}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-green-400">${transaction.amount.toFixed(2)}</p>
                          <p className="text-xs text-gray-400">
                            {transaction.paymentMethod === 'CASH' ? 'Efectivo' :
                             transaction.paymentMethod === 'ZELLE' ? 'Zelle' :
                             transaction.paymentMethod === 'CASHAPP' ? 'CashApp' : 
                             transaction.paymentMethod === 'CARD' ? 'Tarjeta' : transaction.paymentMethod}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-12">
                      <Target className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                      <p className="text-gray-400">No transactions recorded in this period</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </>
        ) : (
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="py-12">
              <p className="text-center text-gray-400">No earnings data available</p>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
