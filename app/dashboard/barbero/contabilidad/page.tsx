'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
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
  Target,
  BarChart3,
  TrendingDown,
  Award,
  Zap,
  Filter,
  PieChart,
  Sun,
  Moon,
  ChevronDown
} from 'lucide-react';
import Link from 'next/link';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, isWithinInterval, subMonths } from 'date-fns';
import { enUS } from 'date-fns/locale';
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

interface ServiceStats {
  name: string;
  count: number;
  revenue: number;
  percentage: number;
}

interface TimeSlotStats {
  slot: string;
  count: number;
  revenue: number;
}

interface DailyEarnings {
  date: string;
  amount: number;
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
  const [serviceStats, setServiceStats] = useState<ServiceStats[]>([]);
  const [timeSlotStats, setTimeSlotStats] = useState<TimeSlotStats[]>([]);
  const [dailyEarnings, setDailyEarnings] = useState<DailyEarnings[]>([]);
  const [monthlyGoal, setMonthlyGoal] = useState<number>(5000);
  const [filterPeriod, setFilterPeriod] = useState<string>('all');
  const [filterService, setFilterService] = useState<string>('all');
  const [filterPayment, setFilterPayment] = useState<string>('all');
  const [lastMonthEarnings, setLastMonthEarnings] = useState<number>(0);
  const [showGoalDialog, setShowGoalDialog] = useState(false);
  const [newGoal, setNewGoal] = useState<string>('');

  const [isGoalOpen, setIsGoalOpen] = useState(false);
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);
  const [isInsightsOpen, setIsInsightsOpen] = useState(false);
  const [isTrendOpen, setIsTrendOpen] = useState(false);
  const [isAnalysisOpen, setIsAnalysisOpen] = useState(false);
  const [isProjectionOpen, setIsProjectionOpen] = useState(false);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [isPaymentMethodsOpen, setIsPaymentMethodsOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  const fetchAppointments = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/appointments?role=barber');
      const data = await res.json();

      if (res.ok) {
        const appointmentsData = data.appointments || [];
        setAppointments(appointmentsData);
        calculateEarnings(appointmentsData);
        calculateServiceStats(appointmentsData);
        calculateTimeSlotStats(appointmentsData);
        calculateDailyEarnings(appointmentsData);
        calculateLastMonthEarnings(appointmentsData);
      }
    } catch (error) {
      console.error('Error fetching appointments:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth');
      return;
    }

    if (session?.user) {
      fetchAppointments();
    }
  }, [session, status, router, fetchAppointments]);

  useEffect(() => {
    const savedGoal = localStorage.getItem('monthlyGoal');
    if (savedGoal) {
      setMonthlyGoal(parseFloat(savedGoal));
    }
  }, []);

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

      const method = apt.paymentMethod?.toLowerCase() || 'cash';
      if (method.includes('cash')) {
        paymentMethods.cash += price;
      } else if (method.includes('cashapp')) {
        paymentMethods.cashapp += price;
      } else if (method.includes('zelle')) {
        paymentMethods.zelle += price;
      } else if (method.includes('card') || method.includes('credit') || method.includes('debit')) {
        paymentMethods.card += price;
      } else {
        paymentMethods.cash += price;
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

  const calculateServiceStats = (appointmentsData: Appointment[]) => {
    const completedAppointments = appointmentsData.filter(
      (apt) => apt.status === 'COMPLETED' || apt.status === 'CONFIRMED'
    );

    const serviceMap = new Map<string, { count: number; revenue: number }>();
    let totalRevenue = 0;

    completedAppointments.forEach((apt) => {
      const serviceName = apt.service?.name || 'Otro';
      const price = apt.service?.price || 0;
      totalRevenue += price;

      if (serviceMap.has(serviceName)) {
        const existing = serviceMap.get(serviceName)!;
        serviceMap.set(serviceName, {
          count: existing.count + 1,
          revenue: existing.revenue + price,
        });
      } else {
        serviceMap.set(serviceName, { count: 1, revenue: price });
      }
    });

    const stats: ServiceStats[] = Array.from(serviceMap.entries())
      .map(([name, data]) => ({
        name,
        count: data.count,
        revenue: data.revenue,
        percentage: totalRevenue > 0 ? (data.revenue / totalRevenue) * 100 : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue);

    setServiceStats(stats);
  };

  const calculateTimeSlotStats = (appointmentsData: Appointment[]) => {
    const completedAppointments = appointmentsData.filter(
      (apt) => apt.status === 'COMPLETED' || apt.status === 'CONFIRMED'
    );

    const timeSlots = [
      { slot: '8:00-10:00 AM', start: 8, end: 10 },
      { slot: '10:00-12:00 PM', start: 10, end: 12 },
      { slot: '12:00-2:00 PM', start: 12, end: 14 },
      { slot: '2:00-4:00 PM', start: 14, end: 16 },
      { slot: '4:00-6:00 PM', start: 16, end: 18 },
      { slot: '6:00-8:00 PM', start: 18, end: 20 },
    ];

    const slotMap = new Map<string, { count: number; revenue: number }>();

    timeSlots.forEach((ts) => {
      slotMap.set(ts.slot, { count: 0, revenue: 0 });
    });

    completedAppointments.forEach((apt) => {
      const hour = parseInt(apt.time.split(':')[0]);
      const price = apt.service?.price || 0;

      timeSlots.forEach((ts) => {
        if (hour >= ts.start && hour < ts.end) {
          const existing = slotMap.get(ts.slot)!;
          slotMap.set(ts.slot, {
            count: existing.count + 1,
            revenue: existing.revenue + price,
          });
        }
      });
    });

    const stats: TimeSlotStats[] = Array.from(slotMap.entries())
      .map(([slot, data]) => ({
        slot,
        count: data.count,
        revenue: data.revenue,
      }))
      .sort((a, b) => b.revenue - a.revenue);

    setTimeSlotStats(stats);
  };

  const calculateDailyEarnings = (appointmentsData: Appointment[]) => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(now.getDate() - 30);

    const completedAppointments = appointmentsData.filter(
      (apt) => (apt.status === 'COMPLETED' || apt.status === 'CONFIRMED') && new Date(apt.date) >= thirtyDaysAgo
    );

    const dailyMap = new Map<string, number>();

    for (let i = 0; i <= 30; i++) {
      const date = new Date(now);
      date.setDate(now.getDate() - i);
      const dateStr = format(date, 'yyyy-MM-dd');
      dailyMap.set(dateStr, 0);
    }

    completedAppointments.forEach((apt) => {
      const dateStr = apt.date;
      const price = apt.service?.price || 0;
      const existing = dailyMap.get(dateStr) || 0;
      dailyMap.set(dateStr, existing + price);
    });

    const earnings: DailyEarnings[] = Array.from(dailyMap.entries())
      .map(([date, amount]) => ({ date, amount }))
      .sort((a, b) => a.date.localeCompare(b.date));

    setDailyEarnings(earnings);
  };

  const calculateLastMonthEarnings = (appointmentsData: Appointment[]) => {
    const now = new Date();
    const lastMonthStart = startOfMonth(subMonths(now, 1));
    const lastMonthEnd = endOfMonth(subMonths(now, 1));

    const completedAppointments = appointmentsData.filter(
      (apt) => {
        const aptDate = new Date(apt.date);
        return (
          (apt.status === 'COMPLETED' || apt.status === 'CONFIRMED') &&
          isWithinInterval(aptDate, { start: lastMonthStart, end: lastMonthEnd })
        );
      }
    );

    const total = completedAppointments.reduce((sum, apt) => sum + (apt.service?.price || 0), 0);
    setLastMonthEarnings(total);
  };

  const saveMonthlyGoal = () => {
    const goal = parseFloat(newGoal);
    if (isNaN(goal) || goal <= 0) {
      toast.error('Please enter a valid goal');
      return;
    }
    setMonthlyGoal(goal);
    setShowGoalDialog(false);
    toast.success(`Monthly goal updated: $${goal.toFixed(2)}`);
    localStorage.setItem('monthlyGoal', goal.toString());
  };

  const getFilteredAppointments = () => {
    let filtered = appointments.filter(
      (apt) => apt.status === 'COMPLETED' || apt.status === 'CONFIRMED'
    );

    if (filterService !== 'all') {
      filtered = filtered.filter((apt) => apt.service?.name === filterService);
    }

    if (filterPayment !== 'all') {
      filtered = filtered.filter((apt) => {
        const method = apt.paymentMethod?.toLowerCase() || 'cash';
        return method.includes(filterPayment.toLowerCase());
      });
    }

    if (filterPeriod !== 'all') {
      const now = new Date();
      filtered = filtered.filter((apt) => {
        const aptDate = new Date(apt.date);
        switch (filterPeriod) {
          case 'today':
            return format(aptDate, 'yyyy-MM-dd') === format(now, 'yyyy-MM-dd');
          case 'week':
            return isWithinInterval(aptDate, {
              start: startOfWeek(now, { weekStartsOn: 1 }),
              end: endOfWeek(now, { weekStartsOn: 1 }),
            });
          case 'month':
            return isWithinInterval(aptDate, {
              start: startOfMonth(now),
              end: endOfMonth(now),
            });
          default:
            return true;
        }
      });
    }

    return filtered;
  };

  const exportToCSV = () => {
    const completedAppointments = getFilteredAppointments();

    const csvData = [
      ['Date', 'Time', 'Client', 'Service', 'Price', 'Payment Method', 'Status'],
      ...completedAppointments.map((apt) => [
        apt.date,
        apt.time,
        apt.user?.name || 'Client',
        apt.service?.name || 'Service',
        `$${apt.service?.price || 0}`,
        apt.paymentMethod || 'Cash',
        apt.status,
      ]),
    ];

    const csv = csvData.map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `accounting-${format(new Date(), 'yyyy-MM-dd')}.csv`;
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
                <span className="text-white">My </span>
                <span className="bg-gradient-to-r from-[#00f0ff] to-[#ffd700] bg-clip-text text-transparent">
                  Earnings
                </span>
              </h1>
              <p className="text-gray-400">Manage your earnings and payments</p>
            </div>

            <Button
              onClick={exportToCSV}
              className="bg-gradient-to-r from-[#00f0ff] to-[#0099cc] hover:from-[#00d4e6] hover:to-[#0088bb] text-black font-semibold"
            >
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Goal Progress Card */}
        <Collapsible open={isGoalOpen} onOpenChange={setIsGoalOpen}>
          <Card className="bg-gradient-to-r from-purple-900/20 to-pink-900/20 border-purple-500/30 mb-8">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-purple-500/20 rounded-lg">
                    <Target className="w-6 h-6 text-purple-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Monthly Goal</h3>
                    <p className="text-sm text-gray-400">Target: ${monthlyGoal.toFixed(2)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => {
                      setIsGoalOpen(true);
                      setNewGoal(monthlyGoal.toString());
                      setShowGoalDialog(!showGoalDialog);
                    }}
                    variant="outline"
                    size="sm"
                    className="border-purple-500/50 text-purple-400 hover:bg-purple-500/10"
                  >
                    Adjust
                  </Button>

                  <CollapsibleTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="border-purple-500/50 text-purple-400 hover:bg-purple-500/10"
                      aria-label={isGoalOpen ? 'Hide section: Monthly Goal' : 'Show section: Monthly Goal'}
                    >
                      {isGoalOpen ? 'Hide' : 'Show'}
                      <ChevronDown className={`w-4 h-4 ml-2 transition-transform ${isGoalOpen ? 'rotate-180' : ''}`} />
                    </Button>
                  </CollapsibleTrigger>
                </div>
              </div>

              <CollapsibleContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Progress this month</span>
                    <span className="text-white font-semibold">
                      ${earnings.thisMonth.toFixed(2)} / ${monthlyGoal.toFixed(2)}
                    </span>
                  </div>
                  <div className="w-full bg-gray-800 rounded-full h-3 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500 rounded-full"
                      style={{ width: `${Math.min((earnings.thisMonth / monthlyGoal) * 100, 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-500">
                      {((earnings.thisMonth / monthlyGoal) * 100).toFixed(1)}% completed
                    </span>
                    {earnings.thisMonth >= monthlyGoal ? (
                      <span className="text-xs text-green-400 flex items-center gap-1">
                        <Award className="w-3 h-3" />
                        Goal achieved!
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">Remaining: ${(monthlyGoal - earnings.thisMonth).toFixed(2)}</span>
                    )}
                  </div>
                </div>

                {showGoalDialog && (
                  <div className="mt-4 p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                    <label className="text-sm text-gray-400 mb-2 block">New monthly goal:</label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        value={newGoal}
                        onChange={(e) => setNewGoal(e.target.value)}
                        placeholder="5000.00"
                        className="bg-gray-900 border-gray-700 text-white"
                      />
                      <Button onClick={saveMonthlyGoal} className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                        Save
                      </Button>
                    </div>
                  </div>
                )}
              </CollapsibleContent>
            </CardContent>
          </Card>
        </Collapsible>

        {/* Summary Cards */}
        <Collapsible open={isSummaryOpen} onOpenChange={setIsSummaryOpen}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-white">Summary</h2>
            <CollapsibleTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="border-gray-700 text-gray-300 hover:bg-gray-800"
                aria-label={isSummaryOpen ? 'Hide section: Summary' : 'Show section: Summary'}
              >
                {isSummaryOpen ? 'Hide' : 'Show'}
                <ChevronDown className={`w-4 h-4 ml-2 transition-transform ${isSummaryOpen ? 'rotate-180' : ''}`} />
              </Button>
            </CollapsibleTrigger>
          </div>

          <CollapsibleContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700 hover:border-[#00f0ff] transition-all">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-gray-400">Today</CardTitle>
                    <div className="p-2 bg-[#00f0ff]/20 rounded-lg">
                      <DollarSign className="w-4 h-4 text-[#00f0ff]" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-white mb-1">${earnings.today.toFixed(2)}</div>
                  <p className="text-xs text-gray-400">Earnings today</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700 hover:border-[#ffd700] transition-all">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-gray-400">This Week</CardTitle>
                    <div className="p-2 bg-[#ffd700]/20 rounded-lg">
                      <TrendingUp className="w-4 h-4 text-[#ffd700]" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-white mb-1">${earnings.thisWeek.toFixed(2)}</div>
                  <p className="text-xs text-gray-400">Last 7 days</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700 hover:border-[#00f0ff] transition-all">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-gray-400">This Month</CardTitle>
                    <div className="p-2 bg-[#00f0ff]/20 rounded-lg">
                      <Calendar className="w-4 h-4 text-[#00f0ff]" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-white mb-1">${earnings.thisMonth.toFixed(2)}</div>
                  <p className="text-xs text-gray-400">{format(new Date(), 'MMMM yyyy', { locale: enUS })}</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700 hover:border-[#ffd700] transition-all">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-gray-400">Total</CardTitle>
                    <div className="p-2 bg-[#ffd700]/20 rounded-lg">
                      <Wallet className="w-4 h-4 text-[#ffd700]" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-white mb-1">${earnings.total.toFixed(2)}</div>
                  <p className="text-xs text-gray-400">{earnings.completedAppointments} completed appointments</p>
                </CardContent>
              </Card>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Insights & Comparison */}
        <Collapsible open={isInsightsOpen} onOpenChange={setIsInsightsOpen}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-white">Insights</h2>
            <CollapsibleTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="border-gray-700 text-gray-300 hover:bg-gray-800"
                aria-label={isInsightsOpen ? 'Hide section: Insights' : 'Show section: Insights'}
              >
                {isInsightsOpen ? 'Hide' : 'Show'}
                <ChevronDown className={`w-4 h-4 ml-2 transition-transform ${isInsightsOpen ? 'rotate-180' : ''}`} />
              </Button>
            </CollapsibleTrigger>
          </div>

          <CollapsibleContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Month Comparison */}
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-gray-400 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-[#00f0ff]" />
                Monthly Comparison
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-400">Current Month</span>
                  <span className="text-lg font-bold text-white">${earnings.thisMonth.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-400">Previous Month</span>
                  <span className="text-lg font-bold text-gray-500">${lastMonthEarnings.toFixed(2)}</span>
                </div>
                <div className="pt-2 border-t border-gray-800">
                  {earnings.thisMonth > lastMonthEarnings ? (
                    <div className="flex items-center gap-2 text-green-400">
                      <TrendingUp className="w-4 h-4" />
                      <span className="text-sm font-semibold">
                        +{((earnings.thisMonth - lastMonthEarnings) / lastMonthEarnings * 100).toFixed(1)}%
                      </span>
                      <span className="text-xs">vs previous month</span>
                    </div>
                  ) : earnings.thisMonth < lastMonthEarnings ? (
                    <div className="flex items-center gap-2 text-red-400">
                      <TrendingDown className="w-4 h-4" />
                      <span className="text-sm font-semibold">
                        {((earnings.thisMonth - lastMonthEarnings) / lastMonthEarnings * 100).toFixed(1)}%
                      </span>
                      <span className="text-xs">vs previous month</span>
                    </div>
                  ) : (
                    <div className="text-xs text-gray-400">No changes</div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Best Service */}
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-gray-400 flex items-center gap-2">
                <Award className="w-4 h-4 text-[#ffd700]" />
                Top Service
              </CardTitle>
            </CardHeader>
            <CardContent>
              {serviceStats.length > 0 ? (
                <div className="space-y-2">
                  <div className="text-lg font-bold text-white">{serviceStats[0].name}</div>
                  <div className="text-2xl font-bold text-[#ffd700]">${serviceStats[0].revenue.toFixed(2)}</div>
                  <div className="text-xs text-gray-400">
                    {serviceStats[0].count} services • {serviceStats[0].percentage.toFixed(1)}% of total
                  </div>
                </div>
              ) : (
                <div className="text-sm text-gray-500">No data</div>
              )}
            </CardContent>
          </Card>

          {/* Best Time Slot */}
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-gray-400 flex items-center gap-2">
                <Zap className="w-4 h-4 text-yellow-500" />
                Peak Time
              </CardTitle>
            </CardHeader>
            <CardContent>
              {timeSlotStats.length > 0 ? (
                <div className="space-y-2">
                  <div className="text-lg font-bold text-white flex items-center gap-2">
                    {timeSlotStats[0].slot.includes('AM') ? (
                      <Sun className="w-5 h-5 text-yellow-500" />
                    ) : (
                      <Moon className="w-5 h-5 text-blue-400" />
                    )}
                    {timeSlotStats[0].slot}
                  </div>
                  <div className="text-2xl font-bold text-yellow-500">${timeSlotStats[0].revenue.toFixed(2)}</div>
                  <div className="text-xs text-gray-400">
                    {timeSlotStats[0].count} appointments in this time slot
                  </div>
                </div>
              ) : (
                <div className="text-sm text-gray-500">No data</div>
              )}
            </CardContent>
          </Card>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Earnings Trend Chart */}
        <Collapsible open={isTrendOpen} onOpenChange={setIsTrendOpen}>
          <Card className="bg-gray-900 border-gray-800 mb-8">
            <CardHeader>
              <div className="flex items-center justify-between gap-4">
                <CardTitle className="text-xl text-white flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-[#00f0ff]" />
                  Earnings Trend (Last 30 days)
                </CardTitle>
                <CollapsibleTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="border-gray-700 text-gray-300 hover:bg-gray-800"
                    aria-label={isTrendOpen ? 'Hide section: Earnings Trend' : 'Show section: Earnings Trend'}
                  >
                    {isTrendOpen ? 'Hide' : 'Show'}
                    <ChevronDown className={`w-4 h-4 ml-2 transition-transform ${isTrendOpen ? 'rotate-180' : ''}`} />
                  </Button>
                </CollapsibleTrigger>
              </div>
            </CardHeader>
            <CollapsibleContent>
              <CardContent>
            <div className="h-64 flex items-end justify-between gap-1">
              {dailyEarnings.slice(-30).map((day, index) => {
                const maxAmount = Math.max(...dailyEarnings.map(d => d.amount));
                const height = maxAmount > 0 ? (day.amount / maxAmount) * 100 : 0;
                return (
                  <div key={index} className="flex-1 flex flex-col items-center group">
                    <div
                      className="w-full bg-gradient-to-t from-[#00f0ff] to-[#0099cc] rounded-t hover:from-[#ffd700] hover:to-[#ffaa00] transition-all cursor-pointer"
                      style={{ height: `${height}%`, minHeight: day.amount > 0 ? '2px' : '0' }}
                      title={`${format(new Date(day.date), 'dd MMM', { locale: enUS })}: $${day.amount.toFixed(2)}`}
                    />
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity mt-1">
                      <div className="text-[10px] text-gray-500">${day.amount.toFixed(0)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 flex justify-between text-xs text-gray-500">
              <span>{format(new Date(dailyEarnings[0]?.date || new Date()), 'dd MMM', { locale: enUS })}</span>
              <span>Last 30 days</span>
              <span>{format(new Date(), 'dd MMM', { locale: enUS })}</span>
            </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Service & Time Analysis */}
        <Collapsible open={isAnalysisOpen} onOpenChange={setIsAnalysisOpen}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-white">Analysis</h2>
            <CollapsibleTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="border-gray-700 text-gray-300 hover:bg-gray-800"
                aria-label={isAnalysisOpen ? 'Hide section: Analysis' : 'Show section: Analysis'}
              >
                {isAnalysisOpen ? 'Hide' : 'Show'}
                <ChevronDown className={`w-4 h-4 ml-2 transition-transform ${isAnalysisOpen ? 'rotate-180' : ''}`} />
              </Button>
            </CollapsibleTrigger>
          </div>

          <CollapsibleContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Services Breakdown */}
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="text-xl text-white flex items-center gap-2">
                <PieChart className="w-5 h-5 text-[#00f0ff]" />
                Revenue by Service
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {serviceStats.slice(0, 5).map((service, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-white font-medium">{service.name}</span>
                      <span className="text-sm text-[#ffd700] font-bold">${service.revenue.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 bg-gray-800 rounded-full h-2 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-[#00f0ff] to-[#0099cc] rounded-full"
                          style={{ width: `${service.percentage}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-400 w-12 text-right">
                        {service.percentage.toFixed(0)}%
                      </span>
                    </div>
                    <div className="text-xs text-gray-500">{service.count} services performed</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Time Slots Performance */}
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="text-xl text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-[#ffd700]" />
                Performance by Time Slot
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {timeSlotStats.map((slot, index) => {
                  const maxRevenue = Math.max(...timeSlotStats.map(s => s.revenue));
                  const percentage = maxRevenue > 0 ? (slot.revenue / maxRevenue) * 100 : 0;
                  return (
                    <div key={index} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-white font-medium flex items-center gap-2">
                          {slot.slot.includes('AM') ? (
                            <Sun className="w-4 h-4 text-yellow-500" />
                          ) : (
                            <Moon className="w-4 h-4 text-blue-400" />
                          )}
                          {slot.slot}
                        </span>
                        <span className="text-sm text-[#ffd700] font-bold">${slot.revenue.toFixed(2)}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 bg-gray-800 rounded-full h-2 overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-[#ffd700] to-[#ffaa00] rounded-full"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-400 w-16 text-right">
                          {slot.count} appointments
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Projection Card */}
        <Collapsible open={isProjectionOpen} onOpenChange={setIsProjectionOpen}>
          <Card className="bg-gradient-to-r from-indigo-900/20 to-purple-900/20 border-indigo-500/30 mb-8">
            <CardHeader>
              <div className="flex items-center justify-between gap-4">
                <CardTitle className="text-xl text-white flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-indigo-400" />
                  End-of-Month Projection
                </CardTitle>
                <CollapsibleTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="border-indigo-500/40 text-indigo-200 hover:bg-indigo-500/10"
                    aria-label={isProjectionOpen ? 'Hide section: Projection' : 'Show section: Projection'}
                  >
                    {isProjectionOpen ? 'Hide' : 'Show'}
                    <ChevronDown className={`w-4 h-4 ml-2 transition-transform ${isProjectionOpen ? 'rotate-180' : ''}`} />
                  </Button>
                </CollapsibleTrigger>
              </div>
            </CardHeader>
            <CollapsibleContent>
              <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <p className="text-sm text-gray-400 mb-1">Days elapsed</p>
                <p className="text-2xl font-bold text-white">
                  {new Date().getDate()} / {new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-400 mb-1">Daily average</p>
                <p className="text-2xl font-bold text-indigo-400">
                  ${(earnings.thisMonth / new Date().getDate()).toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-400 mb-1">End-of-month projection</p>
                <p className="text-2xl font-bold text-purple-400">
                  ${
                    (
                      (earnings.thisMonth / new Date().getDate()) *
                      new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()
                    ).toFixed(2)
                  }
                </p>
              </div>
            </div>
            <div className="mt-4 p-3 bg-gray-800/50 rounded-lg">
              <p className="text-xs text-gray-400">
                {earnings.thisMonth > 0 && monthlyGoal > 0 ? (
                  (earnings.thisMonth / new Date().getDate()) *
                    new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate() >=
                  monthlyGoal ? (
                    <span className="text-green-400 flex items-center gap-1">
                      <Award className="w-3 h-3" />
                      If you keep this pace, you&apos;ll reach your monthly goal of ${monthlyGoal.toFixed(2)}
                    </span>
                  ) : (
                    <span className="text-yellow-400">
                      You need to increase your daily average to $
                      {(
                        (monthlyGoal - earnings.thisMonth) /
                        (new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate() - new Date().getDate())
                      ).toFixed(2)}{' '}
                      to reach your goal
                    </span>
                  )
                ) : (
                  'Complete more appointments to see projections'
                )}
              </p>
            </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Filters */}
        <Collapsible open={isFiltersOpen} onOpenChange={setIsFiltersOpen}>
          <Card className="bg-gray-900 border-gray-800 mb-8">
            <CardHeader>
              <div className="flex items-center justify-between gap-4">
                <CardTitle className="text-lg text-white flex items-center gap-2">
                  <Filter className="w-5 h-5 text-[#00f0ff]" />
                  Advanced Filters
                </CardTitle>
                <CollapsibleTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="border-gray-700 text-gray-300 hover:bg-gray-800"
                    aria-label={isFiltersOpen ? 'Hide section: Filters' : 'Show section: Filters'}
                  >
                    {isFiltersOpen ? 'Hide' : 'Show'}
                    <ChevronDown className={`w-4 h-4 ml-2 transition-transform ${isFiltersOpen ? 'rotate-180' : ''}`} />
                  </Button>
                </CollapsibleTrigger>
              </div>
            </CardHeader>
            <CollapsibleContent>
              <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm text-gray-400 mb-2 block">Period</label>
                <Select value={filterPeriod} onValueChange={setFilterPeriod}>
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="week">This Week</SelectItem>
                    <SelectItem value="month">This Month</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-2 block">Service</label>
                <Select value={filterService} onValueChange={setFilterService}>
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    <SelectItem value="all">All</SelectItem>
                    {serviceStats.map((service, index) => (
                      <SelectItem key={index} value={service.name}>
                        {service.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-2 block">Payment Method</label>
                <Select value={filterPayment} onValueChange={setFilterPayment}>
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="cashapp">CashApp</SelectItem>
                    <SelectItem value="zelle">Zelle</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {(filterPeriod !== 'all' || filterService !== 'all' || filterPayment !== 'all') && (
              <Button
                onClick={() => {
                  setFilterPeriod('all');
                  setFilterService('all');
                  setFilterPayment('all');
                }}
                variant="outline"
                size="sm"
                className="mt-4 border-gray-700 text-gray-400 hover:text-white"
              >
                Clear filters
              </Button>
            )}
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Payment Methods Breakdown */}
        <Collapsible open={isPaymentMethodsOpen} onOpenChange={setIsPaymentMethodsOpen}>
          <Card className="bg-gray-900 border-gray-800 mb-8">
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle className="text-xl text-white flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-[#00f0ff]" />
                    Payment Methods
                  </CardTitle>
                  <CardDescription className="text-gray-400">Summary by payment method</CardDescription>
                </div>
                <CollapsibleTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="border-gray-700 text-gray-300 hover:bg-gray-800"
                    aria-label={isPaymentMethodsOpen ? 'Hide section: Payment Methods' : 'Show section: Payment Methods'}
                  >
                    {isPaymentMethodsOpen ? 'Hide' : 'Show'}
                    <ChevronDown
                      className={`w-4 h-4 ml-2 transition-transform ${isPaymentMethodsOpen ? 'rotate-180' : ''}`}
                    />
                  </Button>
                </CollapsibleTrigger>
              </div>
            </CardHeader>
            <CollapsibleContent>
              <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-green-500/20 rounded-lg">
                    <DollarSign className="w-5 h-5 text-green-500" />
                  </div>
                  <span className="text-gray-300 font-medium">Cash</span>
                </div>
                <p className="text-2xl font-bold text-white">${paymentStats.cash.toFixed(2)}</p>
              </div>

              <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-blue-500/20 rounded-lg">
                    <CreditCard className="w-5 h-5 text-blue-500" />
                  </div>
                  <span className="text-gray-300 font-medium">CashApp</span>
                </div>
                <p className="text-2xl font-bold text-white">${paymentStats.cashapp.toFixed(2)}</p>
              </div>

              <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-purple-500/20 rounded-lg">
                    <Wallet className="w-5 h-5 text-purple-500" />
                  </div>
                  <span className="text-gray-300 font-medium">Zelle</span>
                </div>
                <p className="text-2xl font-bold text-white">${paymentStats.zelle.toFixed(2)}</p>
              </div>

              <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-yellow-500/20 rounded-lg">
                    <CreditCard className="w-5 h-5 text-yellow-500" />
                  </div>
                  <span className="text-gray-300 font-medium">Card</span>
                </div>
                <p className="text-2xl font-bold text-white">${paymentStats.card.toFixed(2)}</p>
              </div>
            </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Recent Transactions */}
        <Collapsible open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle className="text-xl text-white flex items-center gap-2">
                    <Receipt className="w-5 h-5 text-[#ffd700]" />
                    Payment History
                  </CardTitle>
                  <CardDescription className="text-gray-400">Detailed record of all your payments</CardDescription>
                </div>
                <CollapsibleTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="border-gray-700 text-gray-300 hover:bg-gray-800"
                    aria-label={isHistoryOpen ? 'Hide section: Payment History' : 'Show section: Payment History'}
                  >
                    {isHistoryOpen ? 'Hide' : 'Show'}
                    <ChevronDown className={`w-4 h-4 ml-2 transition-transform ${isHistoryOpen ? 'rotate-180' : ''}`} />
                  </Button>
                </CollapsibleTrigger>
              </div>
            </CardHeader>
            <CollapsibleContent>
              <CardContent>
            <div className="space-y-3">
              {getFilteredAppointments()
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .slice(0, 15)
                .map((apt) => {
                  const clientName = apt.user?.name || 'Client';
                  const serviceName = apt.service?.name || 'Service';
                  const price = apt.service?.price || 0;
                  const paymentMethod = apt.paymentMethod || 'Cash';
                  
                  // Normalize payment method labels
                  const paymentMethodES =
                    paymentMethod.toLowerCase().includes('cash') || paymentMethod === 'CASH' ? 'Cash' :
                    paymentMethod.toLowerCase().includes('zelle') || paymentMethod === 'ZELLE' ? 'Zelle' :
                    paymentMethod.toLowerCase().includes('cashapp') || paymentMethod === 'CASHAPP' ? 'CashApp' :
                    paymentMethod.toLowerCase().includes('card') || paymentMethod === 'CARD' ? 'Card' :
                    paymentMethod;

                  // Pick icon and color based on payment method
                  const paymentIcon = 
                    paymentMethodES === 'Cash' ? { color: 'green', bg: 'bg-green-500/20', text: 'text-green-400' } :
                    paymentMethodES === 'Zelle' ? { color: 'purple', bg: 'bg-purple-500/20', text: 'text-purple-400' } :
                    paymentMethodES === 'CashApp' ? { color: 'blue', bg: 'bg-blue-500/20', text: 'text-blue-400' } :
                    { color: 'yellow', bg: 'bg-yellow-500/20', text: 'text-yellow-400' };

                  return (
                    <div
                      key={apt.id}
                      className="p-4 bg-gray-800/50 rounded-lg border border-gray-700 hover:border-[#00f0ff] transition-all"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 flex-1">
                          <div className={`p-2 ${paymentIcon.bg} rounded-lg mt-1`}>
                            {paymentMethodES === 'Cash' && <DollarSign className={`w-5 h-5 ${paymentIcon.text}`} />}
                            {(paymentMethodES === 'Zelle' || paymentMethodES === 'CashApp') && <Wallet className={`w-5 h-5 ${paymentIcon.text}`} />}
                            {paymentMethodES === 'Card' && <CreditCard className={`w-5 h-5 ${paymentIcon.text}`} />}
                          </div>
                          <div className="flex-1">
                            <p className="text-white font-semibold text-base leading-tight mb-1">
                              <span className="text-[#00f0ff]">{clientName}</span> paid you{' '}
                              <span className="text-[#ffd700]">${price.toFixed(2)}</span>{' '}
                              via <span className={paymentIcon.text}>{paymentMethodES}</span>
                            </p>
                            <p className="text-sm text-gray-400 mb-2">
                              For service: <span className="text-white font-medium">{serviceName}</span>
                            </p>
                            <div className="flex items-center gap-3">
                              <span className="text-xs text-gray-500 flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {format(new Date(apt.date), 'dd MMM yyyy', { locale: enUS })}
                              </span>
                              <span className="text-xs text-gray-500 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {apt.time}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col items-end">
                          <div className={`px-3 py-1 rounded-full ${paymentIcon.bg} border border-gray-700`}>
                            <p className={`text-xs font-semibold ${paymentIcon.text}`}>
                              {paymentMethodES}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}

              {getFilteredAppointments().length === 0 && (
                <div className="text-center py-12">
                  <Receipt className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400">You don&apos;t have any payments yet</p>
                  <p className="text-sm text-gray-500 mt-2">Your payments will appear here once you complete your first appointments</p>
                </div>
              )}
            </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      </div>
    </div>
  );
}
