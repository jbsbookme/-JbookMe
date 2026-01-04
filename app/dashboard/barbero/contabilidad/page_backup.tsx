'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { DashboardNavbar } from '@/components/dashboard/navbar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { 
  DollarSign, 
  TrendingUp, 
  Calendar, 
  CreditCard, 
  Download,
  ArrowLeft,
  Wallet,
  Receipt,
  Clock,
  CheckCircle,
  Target,
  BarChart3,
  TrendingDown,
  Award,
  Zap,
  Filter,
  PieChart,
  Sun,
  Moon
} from 'lucide-react';
import Link from 'next/link';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, isWithinInterval, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { useI18n } from '@/lib/i18n/i18n-context';
import { toast } from 'sonner';

interface Appointment {
  id: string;
  date: string;
  time: string;
  status: string;
  paymentMethod?: string | null;
  service: {
    name: string;
    price: number;
    duration: number;
  } | null;
  user: {
    name: string;
    email: string;
  } | null;
}

interface EarningsSummary {
  today: number;
  thisWeek: number;
  thisMonth: number;
  total: number;
  completedAppointments: number;
}

interface PaymentMethodStats {
  cash: number;
  cashapp: number;
  zelle: number;
  card: number;
}

export default function ContabilidadBarbero() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { t } = useI18n();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [earnings, setEarnings] = useState<EarningsSummary>({
    today: 0,
    thisWeek: 0,
    thisMonth: 0,
    total: 0,
    completedAppointments: 0,
  });
  const [paymentStats, setPaymentStats] = useState<PaymentMethodStats>({
    cash: 0,
    cashapp: 0,
    zelle: 0,
    card: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth');
      return;
    }

    if (session?.user) {
      fetchAppointments();
    }
  }, [session, status, router]);

  const fetchAppointments = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/appointments?role=barber');
      const data = await res.json();

      if (res.ok) {
        const appointmentsData = data.appointments || [];
        setAppointments(appointmentsData);
        calculateEarnings(appointmentsData);
      }
    } catch (error) {
      console.error('Error fetching appointments:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateEarnings = (appointmentsData: Appointment[]) => {
    const now = new Date();
    const todayStart = new Date(now.setHours(0, 0, 0, 0));
    const todayEnd = new Date(now.setHours(23, 59, 59, 999));
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    const completedAppointments = appointmentsData.filter(
      (apt) => apt.status === 'COMPLETED' || apt.status === 'CONFIRMED'
    );

    let todayTotal = 0;
    let weekTotal = 0;
    let monthTotal = 0;
    let total = 0;

    const paymentMethods: PaymentMethodStats = {
      cash: 0,
      cashapp: 0,
      zelle: 0,
      card: 0,
    };

    completedAppointments.forEach((apt) => {
      const price = apt.service?.price || 0;
      const aptDate = new Date(apt.date);

      total += price;

      if (isWithinInterval(aptDate, { start: todayStart, end: todayEnd })) {
        todayTotal += price;
      }

      if (isWithinInterval(aptDate, { start: weekStart, end: weekEnd })) {
        weekTotal += price;
      }

      if (isWithinInterval(aptDate, { start: monthStart, end: monthEnd })) {
        monthTotal += price;
      }

      // Count by payment method
      const method = apt.paymentMethod?.toLowerCase() || 'cash';
      if (method.includes('cash') || method === 'efectivo') {
        paymentMethods.cash += price;
      } else if (method.includes('cashapp')) {
        paymentMethods.cashapp += price;
      } else if (method.includes('zelle')) {
        paymentMethods.zelle += price;
      } else if (method.includes('card') || method.includes('tarjeta')) {
        paymentMethods.card += price;
      } else {
        paymentMethods.cash += price; // Default to cash
      }
    });

    setEarnings({
      today: todayTotal,
      thisWeek: weekTotal,
      thisMonth: monthTotal,
      total,
      completedAppointments: completedAppointments.length,
    });

    setPaymentStats(paymentMethods);
  };

  const exportToCSV = () => {
    const completedAppointments = appointments.filter(
      (apt) => apt.status === 'COMPLETED' || apt.status === 'CONFIRMED'
    );

    const csvData = [
      ['Fecha', 'Hora', 'Cliente', 'Servicio', 'Precio', 'Método de Pago', 'Estado'],
      ...completedAppointments.map((apt) => [
        apt.date,
        apt.time,
        apt.user?.name || 'Cliente',
        apt.service?.name || 'Servicio',
        `$${apt.service?.price || 0}`,
        apt.paymentMethod || 'Efectivo',
        apt.status,
      ]),
    ];

    const csv = csvData.map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `contabilidad-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#00f0ff]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black pb-24">
      <DashboardNavbar />

      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <Link href="/dashboard/barbero">
            <Button variant="ghost" className="mb-4 text-gray-400 hover:text-white">
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t('barber.backToDashboard')}
            </Button>
          </Link>

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold mb-2">
                <span className="text-white">{t('barber.myEarnings').split(' ')[0]} </span>
                <span className="bg-gradient-to-r from-[#00f0ff] to-[#ffd700] bg-clip-text text-transparent">
                  {t('accounting.title')}
                </span>
              </h1>
              <p className="text-gray-400">{t('barber.manageEarnings')}</p>
            </div>

            <Button
              onClick={exportToCSV}
              className="bg-gradient-to-r from-[#00f0ff] to-[#0099cc] hover:from-[#00d4e6] hover:to-[#0088bb] text-black font-semibold"
            >
              <Download className="w-4 h-4 mr-2" />
              {t('barber.exportCSV')}
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Today's Earnings */}
          <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700 hover:border-[#00f0ff] transition-all">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-400">{t('barber.today')}</CardTitle>
                <div className="p-2 bg-[#00f0ff]/20 rounded-lg">
                  <DollarSign className="w-4 h-4 text-[#00f0ff]" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white mb-1">
                ${earnings.today.toFixed(2)}
              </div>
              <p className="text-xs text-gray-400">{t('barber.today')} {t('barber.earnings')}</p>
            </CardContent>
          </Card>

          {/* This Week */}
          <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700 hover:border-[#ffd700] transition-all">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-400">{t('barber.thisWeek')}</CardTitle>
                <div className="p-2 bg-[#ffd700]/20 rounded-lg">
                  <TrendingUp className="w-4 h-4 text-[#ffd700]" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white mb-1">
                ${earnings.thisWeek.toFixed(2)}
              </div>
              <p className="text-xs text-gray-400">{t('common.last')} 7 {t('common.days')}</p>
            </CardContent>
          </Card>

          {/* This Month */}
          <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700 hover:border-[#00f0ff] transition-all">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-400">{t('barber.thisMonth')}</CardTitle>
                <div className="p-2 bg-[#00f0ff]/20 rounded-lg">
                  <Calendar className="w-4 h-4 text-[#00f0ff]" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white mb-1">
                ${earnings.thisMonth.toFixed(2)}
              </div>
              <p className="text-xs text-gray-400">{format(new Date(), 'MMMM yyyy', { locale: es })}</p>
            </CardContent>
          </Card>

          {/* Total Earnings */}
          <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700 hover:border-[#ffd700] transition-all">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-400">{t('common.total')}</CardTitle>
                <div className="p-2 bg-[#ffd700]/20 rounded-lg">
                  <Wallet className="w-4 h-4 text-[#ffd700]" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white mb-1">
                ${earnings.total.toFixed(2)}
              </div>
              <p className="text-xs text-gray-400">{earnings.completedAppointments} {t('barber.completedAppointments').toLowerCase()}</p>
            </CardContent>
          </Card>
        </div>

        {/* Payment Methods Breakdown */}
        <Card className="bg-gray-900 border-gray-800 mb-8">
          <CardHeader>
            <CardTitle className="text-xl text-white flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-[#00f0ff]" />
              {t('barber.paymentMethods')}
            </CardTitle>
            <CardDescription className="text-gray-400">
              {t('accounting.summary')} {t('common.by')} {t('common.paymentMethod')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-green-500/20 rounded-lg">
                    <DollarSign className="w-5 h-5 text-green-500" />
                  </div>
                  <span className="text-gray-300 font-medium">{t('booking.paymentMethods.cash')}</span>
                </div>
                <p className="text-2xl font-bold text-white">${paymentStats.cash.toFixed(2)}</p>
              </div>

              <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-blue-500/20 rounded-lg">
                    <CreditCard className="w-5 h-5 text-blue-500" />
                  </div>
                  <span className="text-gray-300 font-medium">{t('booking.paymentMethods.cashapp')}</span>
                </div>
                <p className="text-2xl font-bold text-white">${paymentStats.cashapp.toFixed(2)}</p>
              </div>

              <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-purple-500/20 rounded-lg">
                    <Wallet className="w-5 h-5 text-purple-500" />
                  </div>
                  <span className="text-gray-300 font-medium">{t('booking.paymentMethods.zelle')}</span>
                </div>
                <p className="text-2xl font-bold text-white">${paymentStats.zelle.toFixed(2)}</p>
              </div>

              <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-yellow-500/20 rounded-lg">
                    <CreditCard className="w-5 h-5 text-yellow-500" />
                  </div>
                  <span className="text-gray-300 font-medium">{t('booking.paymentMethods.card')}</span>
                </div>
                <p className="text-2xl font-bold text-white">${paymentStats.card.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Transactions */}
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-xl text-white flex items-center gap-2">
              <Receipt className="w-5 h-5 text-[#ffd700]" />
              {t('barber.recentTransactions')}
            </CardTitle>
            <CardDescription className="text-gray-400">
              {t('appointments.completed')} {t('common.and')} {t('common.payments')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {appointments
                .filter((apt) => apt.status === 'COMPLETED' || apt.status === 'CONFIRMED')
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .slice(0, 10)
                .map((apt) => (
                  <div
                    key={apt.id}
                    className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg border border-gray-700 hover:border-[#00f0ff] transition-all"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-[#00f0ff]/20 rounded-lg">
                        <CheckCircle className="w-5 h-5 text-[#00f0ff]" />
                      </div>
                      <div>
                        <p className="text-white font-medium">{apt.user?.name || t('barber.client')}</p>
                        <p className="text-sm text-gray-400">{apt.service?.name || t('barber.service')}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs text-gray-500 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {format(new Date(apt.date), 'dd MMM yyyy', { locale: es })}
                          </span>
                          <span className="text-xs text-gray-500 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {apt.time}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-[#ffd700]">
                        ${apt.service?.price.toFixed(2) || '0.00'}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {apt.paymentMethod || 'Efectivo'}
                      </p>
                    </div>
                  </div>
                ))}

              {appointments.filter((apt) => apt.status === 'COMPLETED' || apt.status === 'CONFIRMED').length === 0 && (
                <div className="text-center py-12">
                  <Receipt className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400">{t('barber.noAppointments')}</p>
                  <p className="text-sm text-gray-500 mt-2">{t('barber.noAppointmentsDesc')}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
