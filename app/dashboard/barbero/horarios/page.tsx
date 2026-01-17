'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Calendar } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  ArrowLeft, 
  Clock, 
  Calendar as CalendarIcon, 
  Save, 
  Plus,
  Trash2,
  Coffee,
  AlertCircle,
  ChevronDown
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useI18n } from '@/lib/i18n/i18n-context';

interface Availability {
  id: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
}

interface DayOff {
  id: string;
  date: string;
  reason?: string;
}

export default function HorariosPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { t } = useI18n();
  const [availability, setAvailability] = useState<Availability[]>([]);
  const [daysOff, setDaysOff] = useState<DayOff[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [isWeeklyScheduleOpen, setIsWeeklyScheduleOpen] = useState(true);
  const [bulkStartTime, setBulkStartTime] = useState('09:00');
  const [bulkEndTime, setBulkEndTime] = useState('18:00');
  
  // Day off dialog
  const [showDayOffDialog, setShowDayOffDialog] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [dayOffReason, setDayOffReason] = useState('');

  const DAYS_OF_WEEK = [
    { value: 'MONDAY', label: t('barber.monday'), icon: '📅' },
    { value: 'TUESDAY', label: t('barber.tuesday'), icon: '📅' },
    { value: 'WEDNESDAY', label: t('barber.wednesday'), icon: '📅' },
    { value: 'THURSDAY', label: t('barber.thursday'), icon: '📅' },
    { value: 'FRIDAY', label: t('barber.friday'), icon: '📅' },
    { value: 'SATURDAY', label: t('barber.saturday'), icon: '🎉' },
    { value: 'SUNDAY', label: t('barber.sunday'), icon: '☀️' },
  ];

  const daysOrder = useMemo(() => DAYS_OF_WEEK.map((d) => d.value), [DAYS_OF_WEEK]);

  const toMinutes = (hhmm: string) => {
    const [h, m] = hhmm.split(':').map((v) => Number(v));
    if (!Number.isFinite(h) || !Number.isFinite(m)) return NaN;
    return h * 60 + m;
  };

  const ensureAllDays = (raw: Availability[]) => {
    const byDay = new Map(raw.map((a) => [a.dayOfWeek, a]));
    return daysOrder.map((day) => {
      const existing = byDay.get(day);
      if (existing) return existing;
      return {
        id: `temp-${day}`,
        dayOfWeek: day,
        startTime: '09:00',
        endTime: '18:00',
        isAvailable: day !== 'SUNDAY',
      };
    });
  };

  const applyTimesToDays = (days: string[], startTime: string, endTime: string) => {
    setAvailability((prev) => {
      const normalized = ensureAllDays(prev);
      return normalized.map((a) =>
        days.includes(a.dayOfWeek)
          ? {
              ...a,
              isAvailable: true,
              startTime,
              endTime,
            }
          : a
      );
    });
  };

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth');
      return;
    }

    if (session?.user?.role === 'BARBER' || session?.user?.role === 'STYLIST') {
      fetchAvailability();
      fetchDaysOff();
    }
  }, [session, status, router]);

  const fetchAvailability = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/barber/availability');
      if (res.ok) {
        const data = await res.json();
        const normalized = ensureAllDays(data.availability || []);
        setAvailability(normalized);

        const preferred = normalized.find((a) => a.dayOfWeek === 'MONDAY') || normalized[0];
        if (preferred?.startTime) setBulkStartTime(preferred.startTime);
        if (preferred?.endTime) setBulkEndTime(preferred.endTime);
      }
    } catch (error) {
      console.error('Error fetching availability:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDaysOff = async () => {
    try {
      const res = await fetch('/api/barber/days-off');
      if (res.ok) {
        const data = await res.json();
        const rawDaysOff = Array.isArray(data) ? data : data.daysOff;
        const normalized: DayOff[] = (rawDaysOff || []).map((d: any) => ({
          id: d.id,
          // Normalize to date-only string to avoid timezone shifting in comparisons/rendering.
          date: format(new Date(d.date), 'yyyy-MM-dd'),
          reason: d.reason ?? undefined,
        }));
        setDaysOff(normalized);
      }
    } catch (error) {
      console.error('Error fetching days off:', error);
    }
  };

  const handleToggleDay = (dayOfWeek: string) => {
    setAvailability((prev) =>
      ensureAllDays(prev).map((a) =>
        a.dayOfWeek === dayOfWeek ? { ...a, isAvailable: !a.isAvailable } : a
      )
    );
  };

  const handleTimeChange = (dayOfWeek: string, field: 'startTime' | 'endTime', value: string) => {
    setAvailability((prev) =>
      ensureAllDays(prev).map((a) =>
        a.dayOfWeek === dayOfWeek ? { ...a, [field]: value } : a
      )
    );
  };

  const handleSaveAvailability = async () => {
    const normalized = ensureAllDays(availability);
    for (const day of normalized) {
      if (!day.isAvailable) continue;
      const start = toMinutes(day.startTime);
      const end = toMinutes(day.endTime);
      if (!Number.isFinite(start) || !Number.isFinite(end) || start >= end) {
        const label = DAYS_OF_WEEK.find((d) => d.value === day.dayOfWeek)?.label || day.dayOfWeek;
        toast.error(`${label}: ${t('barber.scheduleError')}`);
        return;
      }
    }

    setIsSaving(true);
    try {
      const res = await fetch('/api/barber/availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ availability: normalized }),
      });

      if (res.ok) {
        toast.success(t('barber.scheduleSaved'));
        fetchAvailability();
      } else {
        const data = await res.json();
        toast.error(data.error || t('barber.scheduleError'));
      }
    } catch (error) {
      console.error('Error saving availability:', error);
      toast.error(t('barber.scheduleError'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddDayOff = async () => {
    if (!selectedDate) {
      toast.error(t('barber.selectDate'));
      return;
    }

    try {
      const res = await fetch('/api/barber/days-off', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: format(selectedDate, 'yyyy-MM-dd'),
          reason: dayOffReason || undefined,
        }),
      });

      if (res.ok) {
        toast.success(t('barber.dayOffAdded'));
        setShowDayOffDialog(false);
        setSelectedDate(undefined);
        setDayOffReason('');
        fetchDaysOff();
      } else {
        const data = await res.json();
        toast.error(data.error || t('barber.dayOffError'));
      }
    } catch (error) {
      console.error('Error adding day off:', error);
      toast.error(t('barber.dayOffError'));
    }
  };

  const handleDeleteDayOff = async (id: string) => {
    if (!confirm(t('common.confirmDelete'))) return;

    try {
      const res = await fetch(`/api/barber/days-off?id=${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        toast.success(t('barber.dayOffDeleted'));
        fetchDaysOff();
      } else {
        toast.error(t('barber.dayOffError'));
      }
    } catch (error) {
      console.error('Error deleting day off:', error);
      toast.error(t('barber.dayOffError'));
    }
  };

  const isDayOff = (date: Date) => {
    const key = format(date, 'yyyy-MM-dd');
    return daysOff.some((d) => d.date === key);
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
                <span className="text-white">{t('barber.mySchedule').split(' ')[0]} </span>
                <span className="bg-gradient-to-r from-[#00f0ff] to-[#ffd700] bg-clip-text text-transparent">
                  {t('barber.schedule')}
                </span>
              </h1>
              <p className="text-gray-400">{t('barber.manageSchedule')}</p>
            </div>

            <Button
              onClick={handleSaveAvailability}
              disabled={isSaving}
              className="bg-gradient-to-r from-[#00f0ff] to-[#0099cc] hover:from-[#00d4e6] hover:to-[#0088bb] text-black font-semibold"
            >
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? t('common.saving') : t('barber.saveSchedule')}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Weekly Schedule */}
          <div className="lg:col-span-2">
            <Collapsible open={isWeeklyScheduleOpen} onOpenChange={setIsWeeklyScheduleOpen}>
              <Card className="bg-gray-900 border-gray-800">
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-xl text-white flex items-center gap-2">
                        <Clock className="w-5 h-5 text-[#00f0ff]" />
                        {t('barber.weeklySchedule')}
                      </CardTitle>
                      <CardDescription className="text-gray-400">
                        {t('barber.scheduleDescription')}
                      </CardDescription>
                    </div>

                    <CollapsibleTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-gray-700 text-gray-300 hover:border-[#00f0ff] hover:text-[#00f0ff]"
                      >
                        {isWeeklyScheduleOpen ? 'Hide' : 'Show'}
                        <ChevronDown
                          className={`ml-2 h-4 w-4 transition-transform ${isWeeklyScheduleOpen ? 'rotate-180' : ''}`}
                        />
                      </Button>
                    </CollapsibleTrigger>
                  </div>
                </CardHeader>

                <CollapsibleContent>
                  <CardContent className="space-y-4">
                    {/* Quick editor */}
                    <div className="border border-gray-700 rounded-lg p-4 bg-gray-800/30">
                      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
                        <div className="grid grid-cols-2 gap-3 w-full sm:max-w-md">
                          <div>
                            <Label className="text-sm text-gray-400 mb-2 block">{t('barber.startTime')}</Label>
                            <Input
                              type="time"
                              step={900}
                              value={bulkStartTime}
                              onChange={(e) => setBulkStartTime(e.target.value)}
                              className="bg-gray-800 border-gray-700 text-white"
                            />
                          </div>
                          <div>
                            <Label className="text-sm text-gray-400 mb-2 block">{t('barber.endTime')}</Label>
                            <Input
                              type="time"
                              step={900}
                              value={bulkEndTime}
                              onChange={(e) => setBulkEndTime(e.target.value)}
                              className="bg-gray-800 border-gray-700 text-white"
                            />
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-2 sm:justify-end w-full sm:w-auto">
                          <Button
                            type="button"
                            variant="outline"
                            className="border-gray-700 text-gray-200 hover:border-[#00f0ff] hover:text-[#00f0ff]"
                            onClick={() => applyTimesToDays(daysOrder, bulkStartTime, bulkEndTime)}
                          >
                            Aplicar a todos
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            className="border-gray-700 text-gray-200 hover:border-[#00f0ff] hover:text-[#00f0ff]"
                            onClick={() => applyTimesToDays(['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'], bulkStartTime, bulkEndTime)}
                          >
                            Aplicar L-V
                          </Button>
                        </div>
                      </div>
                      <p className="text-xs text-gray-400 mt-3">
                        Tip: pon 09:00 a 18:00 y usa “Aplicar a todos”.
                      </p>
                    </div>

                {DAYS_OF_WEEK.map((day) => {
                  const dayAvailability = availability.find(a => a.dayOfWeek === day.value);
                  const isAvailable = dayAvailability?.isAvailable ?? false;

                  return (
                    <div key={day.value} className="border border-gray-700 rounded-lg p-4 bg-gray-800/50">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="text-2xl">{day.icon}</span>
                          <span className="text-base sm:text-lg font-semibold text-white truncate">{day.label}</span>
                        </div>
                        <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
                          <Label className="text-sm text-gray-400 whitespace-nowrap">
                            {isAvailable ? 'Disponible' : 'No disponible'}
                          </Label>
                          <Switch
                            checked={isAvailable}
                            onCheckedChange={() => handleToggleDay(day.value)}
                            className="shrink-0 data-[state=checked]:bg-[#00f0ff]"
                          />
                        </div>
                      </div>

                      {dayAvailability && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mt-3">
                          <div>
                            <Label className="text-sm text-gray-400 mb-2 block">{t('barber.startTime')}</Label>
                            <Input
                              type="time"
                              step={900}
                              value={dayAvailability.startTime}
                              disabled={!isAvailable}
                              onChange={(e) => handleTimeChange(day.value, 'startTime', e.target.value)}
                              className="bg-gray-700 border-gray-600 text-white disabled:opacity-50"
                            />
                          </div>
                          <div>
                            <Label className="text-sm text-gray-400 mb-2 block">{t('barber.endTime')}</Label>
                            <Input
                              type="time"
                              step={900}
                              value={dayAvailability.endTime}
                              disabled={!isAvailable}
                              onChange={(e) => handleTimeChange(day.value, 'endTime', e.target.value)}
                              className="bg-gray-700 border-gray-600 text-white disabled:opacity-50"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-blue-300">
                      <p className="font-semibold mb-1">{t('common.important')}:</p>
                      <p className="text-blue-200">
                        {t('barber.scheduleDescription')}
                      </p>
                    </div>
                  </div>
                </div>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          </div>

          {/* Days Off */}
          <div className="lg:col-span-1">
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle className="text-xl text-white flex items-center gap-2">
                  <Coffee className="w-5 h-5 text-[#ffd700]" />
                  {t('barber.daysOff')}
                </CardTitle>
                <CardDescription className="text-gray-400">
                  {t('barber.daysOffManagement')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Dialog open={showDayOffDialog} onOpenChange={setShowDayOffDialog}>
                  <DialogTrigger asChild>
                    <Button className="w-full bg-gradient-to-r from-[#ffd700] to-[#ffaa00] hover:from-[#ffcc00] hover:to-[#ff9900] text-black font-semibold mb-4">
                      <Plus className="w-4 h-4 mr-2" />
                      {t('barber.addDayOffButton')}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-gray-900 border-gray-700">
                    <DialogHeader>
                      <DialogTitle className="text-white">{t('barber.addDayOff')}</DialogTitle>
                      <DialogDescription className="text-gray-400">
                        {t('barber.selectDate')}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 mt-4">
                      <div>
                        <Label className="text-gray-300 mb-2 block">{t('barber.date')}</Label>
                        <Calendar
                          mode="single"
                          selected={selectedDate}
                          onSelect={setSelectedDate}
                          disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                          className="rounded-lg border border-gray-700 bg-gray-800 text-white"
                          modifiers={{
                            dayOff: (date) => isDayOff(date)
                          }}
                          modifiersStyles={{
                            dayOff: {
                              backgroundColor: 'rgb(239 68 68 / 0.3)',
                              color: '#fecaca'
                            }
                          }}
                        />
                      </div>
                      
                      <div>
                        <Label className="text-gray-300 mb-2 block">{t('barber.addReason')}</Label>
                        <Input
                          type="text"
                          value={dayOffReason}
                          onChange={(e) => setDayOffReason(e.target.value)}
                          placeholder={t('common.optional')}
                          className="bg-gray-800 border-gray-700 text-white"
                        />
                      </div>

                      <div className="flex gap-2 pt-4">
                        <Button
                          onClick={handleAddDayOff}
                          disabled={!selectedDate}
                          className="flex-1 bg-gradient-to-r from-[#00f0ff] to-[#ffd700] text-black font-semibold"
                        >
                          {t('common.add')}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setShowDayOffDialog(false);
                            setSelectedDate(undefined);
                            setDayOffReason('');
                          }}
                          className="border-gray-600 text-gray-300 hover:bg-gray-800"
                        >
                          {t('common.cancel')}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>

                <div className="space-y-3">
                  {daysOff.length === 0 ? (
                    <div className="text-center py-8">
                      <CalendarIcon className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                      <p className="text-gray-400 text-sm">{t('barber.noDaysOff')}</p>
                    </div>
                  ) : (
                    daysOff
                      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                      .map((dayOff) => (
                        <div
                          key={dayOff.id}
                          className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg border border-gray-700 hover:border-red-500/50 transition-colors"
                        >
                          <div>
                            <p className="text-white font-medium">
                              {format(new Date(dayOff.date), "EEEE, dd 'de' MMMM", { locale: es })}
                            </p>
                            {dayOff.reason && (
                              <p className="text-sm text-gray-400 mt-1">{dayOff.reason}</p>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteDayOff(dayOff.id)}
                            className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
