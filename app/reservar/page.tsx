'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { Textarea } from '@/components/ui/textarea';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Scissors,
  ArrowLeft,
  ArrowRight,
  Clock,
  DollarSign,
  Star,
  Instagram,
  Facebook,
  MessageCircle,
  Check,
  Calendar as CalendarIcon,
  Image as ImageIcon,
  Video,
  User,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { addDays, format } from 'date-fns';
import { enUS, es } from 'date-fns/locale';
import { formatPrice } from '@/lib/utils';
import { formatTime12h } from '@/lib/time';
import { useI18n } from '@/lib/i18n/i18n-context';

// Types
type Service = {
  id: string;
  name: string;
  description: string | null;
  duration: number;
  price: number;
  image: string | null;
  gender: 'MALE' | 'FEMALE' | 'UNISEX' | null;
  barberId?: string | null;
};

const getServiceKey = (service: Pick<Service, 'name' | 'duration' | 'price' | 'gender'>) => {
  const normalizedName = service.name.trim().toLowerCase();
  return `${service.gender ?? ''}::${normalizedName}::${service.duration}::${service.price}`;
};

type Barber = {
  id: string;
  userId: string;
  bio: string | null;
  specialties: string | null;
  hourlyRate: number | null;
  profileImage: string | null;
  phone: string | null;
  whatsappUrl: string | null;
  facebookUrl: string | null;
  instagramUrl: string | null;
  twitterUrl: string | null;
  zelleEmail: string | null;
  zellePhone: string | null;
  cashappTag: string | null;
  rating: number | null;
  gender: 'MALE' | 'FEMALE' | 'BOTH' | null;
  user: {
    id: string;
    name: string | null;
    image: string | null;
  };
  media: Array<{
    id: string;
    mediaType: string;
    mediaUrl: string;
    title: string | null;
  }>;
  galleryImages?: Array<{
    cloud_storage_path: string;
  }>;
};

type Step = 'gender' | 'services' | 'barbers' | 'barber-profile' | 'datetime' | 'payment';

export default function ReservarPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t, language } = useI18n();

  const dateLocale = language === 'es' ? es : enUS;

  const showProfessionalSuccessToast = (mode: 'booked' | 'rescheduled') => {
    const title =
      mode === 'booked' ? t('booking.toastBookingConfirmedTitle') : t('booking.toastAppointmentRescheduledTitle');
    const subtitle = t('booking.toastThanksSubtitle');

    toast.custom(
      (toastData) => (
        <div
          className={`${
            toastData.visible ? 'animate-enter' : 'animate-leave'
          } max-w-md w-full pointer-events-auto rounded-xl border border-[#00f0ff]/30 bg-gray-950/95 backdrop-blur shadow-lg overflow-hidden`}
        >
          <div className="h-1.5 bg-gradient-to-r from-[#00f0ff] to-[#ffd700]" />
          <div className="p-4 flex items-start gap-3">
            <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#00f0ff]/20 to-[#ffd700]/20 border border-[#00f0ff]/30">
              <Star className="h-5 w-5 text-[#ffd700]" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-white truncate">⭐ {title}</p>
              <p className="text-sm text-gray-300 mt-0.5">{subtitle}</p>
            </div>
            <button
              onClick={() => toast.dismiss(toastData.id)}
              className="ml-2 text-gray-400 hover:text-white transition-colors"
              aria-label={t('common.dismiss')}
              type="button"
            >
              ✕
            </button>
          </div>
        </div>
      ),
      { duration: 4500 }
    );
  };

  // CRITICAL: Check if barberId exists in URL to determine initial step
  const initialBarberId = searchParams.get('barberId');
  const [currentStep, setCurrentStep] = useState<Step>(initialBarberId ? 'services' : 'gender');
  
  const [selectedGender, setSelectedGender] = useState<string>('');
  const [services, setServices] = useState<Service[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [filteredBarbers, setFilteredBarbers] = useState<Barber[]>([]);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedBarber, setSelectedBarber] = useState<Barber | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const dateTimeStepTopRef = useRef<HTMLDivElement | null>(null);
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [availableTimes, setAvailableTimes] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<string>('');
  const [paymentReference, setPaymentReference] = useState('');
  const [acceptCancellationPolicy, setAcceptCancellationPolicy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [barbersLoading, setBarbersLoading] = useState(false);
  const [now, setNow] = useState<Date>(() => new Date());
  const [maleGenderImage, setMaleGenderImage] = useState<string | null>(null);
  const [femaleGenderImage, setFemaleGenderImage] = useState<string | null>(null);

  const selectedBarberId = selectedBarber?.id;
  const selectedBarberGender = selectedBarber?.gender;

  const isSameDay = useCallback(
    (a: Date, b: Date) =>
      a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(),
    []
  );

  const parseTimeToMinutes = useCallback((value: string): number | null => {
    const raw = (value || '').trim();
    if (!raw) return null;

    const upper = raw.toUpperCase();

    // 12-hour format: "9:30 AM", "11 AM"
    const ampmMatch = upper.match(/^\s*(\d{1,2})(?::(\d{2}))?\s*(AM|PM)\s*$/);
    if (ampmMatch) {
      let hour = Number(ampmMatch[1]);
      const minute = Number(ampmMatch[2] || '0');
      const meridiem = ampmMatch[3];

      if (Number.isNaN(hour) || Number.isNaN(minute)) return null;
      if (hour < 1 || hour > 12 || minute < 0 || minute > 59) return null;

      if (meridiem === 'AM') {
        if (hour === 12) hour = 0;
      } else {
        if (hour !== 12) hour += 12;
      }

      return hour * 60 + minute;
    }

    // 24-hour format: "09:30", "9:30"
    const hmMatch = raw.match(/^\s*(\d{1,2}):(\d{2})\s*$/);
    if (hmMatch) {
      const hour = Number(hmMatch[1]);
      const minute = Number(hmMatch[2]);
      if (Number.isNaN(hour) || Number.isNaN(minute)) return null;
      if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
      return hour * 60 + minute;
    }

    return null;
  }, []);

  // Tick every minute so "today" time slots update in real time.
  useEffect(() => {
    if (currentStep !== 'datetime' || !selectedDate) return;

    const rightNow = new Date();
    if (!isSameDay(selectedDate, rightNow)) return;

    setNow(rightNow);

    const id = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(id);
  }, [currentStep, isSameDay, selectedDate]);

  const filteredAvailableTimes = useMemo(() => {
    if (!selectedDate) return availableTimes;

    const today = now;
    const todayStart = new Date(today);
    todayStart.setHours(0, 0, 0, 0);

    const selectedStart = new Date(selectedDate);
    selectedStart.setHours(0, 0, 0, 0);

    // Past date (should be blocked by calendar, but safe-guard anyway)
    if (selectedStart < todayStart) return [];

    // Future date: show all slots
    if (selectedStart > todayStart) return availableTimes;

    // Today: hide past slots
    const nowMinutes = today.getHours() * 60 + today.getMinutes();
    return availableTimes.filter((t) => {
      const minutes = parseTimeToMinutes(t);
      if (minutes == null) return true;
      return minutes > nowMinutes;
    });
  }, [availableTimes, now, parseTimeToMinutes, selectedDate]);

  useEffect(() => {
    if (!selectedTime) return;
    if (!filteredAvailableTimes.includes(selectedTime)) {
      setSelectedTime('');
    }
  }, [filteredAvailableTimes, selectedTime]);

  // Load gender images from settings
  useEffect(() => {
    const loadGenderImages = async () => {
      try {
        const res = await fetch('/api/settings');
        if (res.ok) {
          const data = await res.json();
          if (data.maleGenderImage) setMaleGenderImage(data.maleGenderImage);
          if (data.femaleGenderImage) setFemaleGenderImage(data.femaleGenderImage);
        }
      } catch (error) {
        console.error('Error loading gender images:', error);
      }
    };
    loadGenderImages();
  }, []);

  // Check if barberId is provided in URL (direct booking from barber page)
  useEffect(() => {
    const barberId = searchParams.get('barberId');
    const serviceId = searchParams.get('serviceId');
    console.log('[RESERVAR] URL params check:', { barberId, serviceId, hasParams: !!barberId });
    if (barberId) {
      console.log('[RESERVAR] Loading barber from URL params...');
      // Load barber directly and skip to services (or date if serviceId is provided)
      loadBarberAndSkipToServices(barberId, serviceId);
    } else {
      console.log('[RESERVAR] No barberId in URL, starting normal flow');
    }
  }, [searchParams]);

  const loadBarberAndSkipToServices = async (barberId: string, serviceId?: string | null) => {
    try {
      console.log('[RESERVAR] loadBarberAndSkipToServices called:', { barberId, serviceId });
      
      // Fetch all barbers to get the selected one
      const res = await fetch('/api/barbers');
      const data = await res.json();
      console.log('[RESERVAR] Fetched barbers:', data);
      
      if (res.ok) {
        const barbersArray = Array.isArray(data) ? data : (data.barbers || []);
        const barber = barbersArray.find((b: Barber) => b.id === barberId);
        
        console.log('[RESERVAR] Found barber:', barber ? barber.user?.name : 'NOT FOUND');
        
        if (barber) {
          // Fetch media for the barber
          try {
            const mediaRes = await fetch(`/api/barber/media?barberId=${barber.id}`);
            const mediaData = await mediaRes.json();
            barber.media = mediaData || [];
          } catch {
            barber.media = [];
          }

          setSelectedBarber(barber);
          console.log('[RESERVAR] Set selectedBarber:', barber.user?.name);
          
          // CRITICAL: STRICTLY set gender based on barber's gender
          // NO UNISEX - Each barber shows ONLY their gender services
          let barberGender = '';
          if (barber.gender === 'MALE') {
            console.log('[RESERVAR] MALE barber - Showing ONLY MALE services (no UNISEX)');
            barberGender = 'MALE';
            setSelectedGender('MALE');
          } else if (barber.gender === 'FEMALE') {
            console.log('[RESERVAR] FEMALE stylist - Showing ONLY FEMALE services (no UNISEX)');
            barberGender = 'FEMALE';
            setSelectedGender('FEMALE');
          } else {
            // If BOTH or undefined, ERROR - This should not happen
            console.error('[RESERVAR] ERROR: Barber has invalid gender:', barber.gender);
            toast.error(t('booking.errorProfessionalGenderNotSet'));
            return;
          }
          
          // CRITICAL: Fetch services with explicit gender AND barberId (don't wait for state to update)
          const params = new URLSearchParams();
          params.append('gender', barberGender);
          params.append('barberId', barber.id); // IMPORTANT: Pass barberId to get barber-specific services
          
          console.log('[RESERVAR] Fetching services with params:', params.toString());
          const servicesRes = await fetch(`/api/services?${params.toString()}`);
          const servicesData = await servicesRes.json();
          const servicesArray = Array.isArray(servicesData) ? servicesData : (servicesData.services || []);
          console.log('[RESERVAR] Loaded services:', servicesArray.length);

          const normalized = servicesArray.filter((s: Service) => s);
          // Defensive dedupe (legacy DB may have multiple identical rows)
          const byKey = new Map<string, Service>();
          for (const service of normalized) {
            const key = getServiceKey(service);
            const existing = byKey.get(key);
            if (!existing) {
              byKey.set(key, service);
              continue;
            }

            // When a barber is preselected, prefer the service row that belongs to that barber.
            if (existing.barberId !== barber.id && service.barberId === barber.id) {
              byKey.set(key, service);
            }
          }

          setServices(Array.from(byKey.values()));
          
          // If serviceId is provided, pre-select the service and skip to date/time
          if (serviceId) {
            console.log('[RESERVAR] ServiceId provided, finding service...');
            const service = Array.from(byKey.values()).find((s: Service) => s.id === serviceId);
            
            if (service) {
              console.log('[RESERVAR] Found service:', service.name);
              setSelectedService(service);
              // Skip to date/time step
              console.log('[RESERVAR] Jumping to datetime step');
              setCurrentStep('datetime');
            } else {
              console.log('[RESERVAR] Service not found, showing services step');
              // Service not found, just show services step
              setCurrentStep('services');
            }
          } else {
            console.log('[RESERVAR] No serviceId, showing services step');
            // No service pre-selected, show services step
            setCurrentStep('services');
          }
        } else {
          console.log('[RESERVAR] Barber not found in array');
        }
      } else {
        console.log('[RESERVAR] Failed to fetch barbers');
      }
    } catch (error) {
      console.error('[RESERVAR] Error loading barber:', error);
      toast.error(t('booking.errorLoadingProfessional'));
    }
  };

  // ========== FETCH FUNCTIONS ==========
  const fetchServices = useCallback(async () => {
    try {
      // FIXED: If a barber is selected, filter by their gender
      let genderForServices = selectedGender;
      
      if (selectedBarberGender && selectedBarberGender !== 'BOTH') {
        genderForServices = selectedBarberGender;
        console.log('[RESERVAR] Filtering services by barber gender:', genderForServices);
      }
      
      const params = new URLSearchParams();
      if (genderForServices) params.set('gender', genderForServices);

      // IMPORTANT: once a barber is selected, fetch ONLY that barber's services
      if (selectedBarberId) params.set('barberId', selectedBarberId);

      const query = params.toString();
      const res = await fetch(`/api/services${query ? `?${query}` : ''}`);
      const data = await res.json();
      if (res.ok) {
        // Ensure data is an array
        const servicesArray = Array.isArray(data) ? data : (data.services || []);
        const normalized = (servicesArray as Service[]).filter((s) => Boolean(s));

        // If NO barber selected yet, the API returns services for multiple barbers.
        // Deduplicate by (gender + name + duration + price) so UI doesn't show repeats.
        const nextServices = selectedBarberId
          ? normalized
          : Array.from(
              new Map(normalized.map((s: Service) => [getServiceKey(s), s])).values()
            );

        setServices(nextServices);

        console.log('[RESERVAR] Loaded services:', {
          total: normalized.length,
          deduped: nextServices.length,
          gender: genderForServices,
          barberId: selectedBarberId ?? null,
        });
      }
    } catch (error) {
      console.error('Error fetching services:', error);
    }
  }, [selectedGender, selectedBarberGender, selectedBarberId]);

  const ensureSelectedServiceForBarber = useCallback(async () => {
    if (!selectedService || !selectedBarberId) return;

    try {
      const params = new URLSearchParams();
      params.set('barberId', selectedBarberId);

      // Keep the gender strict when possible
      if (selectedBarberGender === 'MALE' || selectedBarberGender === 'FEMALE') {
        params.set('gender', selectedBarberGender);
      }

      const res = await fetch(`/api/services?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) return;

      const servicesArray = Array.isArray(data) ? data : (data.services || []);
      const normalized = (servicesArray as Service[]).filter((s) => Boolean(s));

      const key = getServiceKey(selectedService);
      const match = normalized.find((s: Service) => getServiceKey(s) === key);

      if (match && match.id !== selectedService.id) {
        setSelectedService(match);
      }
    } catch (error) {
      console.error('[RESERVAR] Error ensuring service for barber:', error);
    }
  }, [selectedService, selectedBarberId, selectedBarberGender]);

  const fetchBarbers = useCallback(async () => {
    setBarbersLoading(true);
    try {
      // Add gender filter to API call
      const genderParam = selectedGender ? `?gender=${selectedGender}` : '';
      const res = await fetch(`/api/barbers${genderParam}`);
      const data = await res.json();
      if (res.ok) {
        // Ensure we're working with an array
        const barbersArray = Array.isArray(data) ? data : (data.barbers || []);
        
        // Fetch media for each barber
        const barbersWithMedia = await Promise.all(
          barbersArray.map(async (barber: Barber) => {
            try {
              const mediaRes = await fetch(`/api/barber/media?barberId=${barber.id}`);
              const mediaData = await mediaRes.json();

              const mediaObject = mediaData as { media?: unknown };

              const normalizedMedia = Array.isArray(mediaData)
                ? mediaData
                : Array.isArray(mediaObject?.media)
                  ? mediaObject.media
                  : [];

              return {
                ...barber,
                media: normalizedMedia,
              };
            } catch {
              return { ...barber, media: [] };
            }
          })
        );
        setBarbers(barbersWithMedia);
      }
    } catch (error) {
      console.error('Error fetching barbers:', error);
    } finally {
      setBarbersLoading(false);
    }
  }, [selectedGender]);

  const fetchAvailableTimes = useCallback(async () => {
    if (!selectedBarber || !selectedDate) {
      console.log('[RESERVAR] Missing selectedBarber or selectedDate:', { 
        hasBarber: !!selectedBarber, 
        hasDate: !!selectedDate 
      });
      return;
    }

    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      
      // Get service duration (use 30 minutes as default if no service selected)
      const serviceDuration = selectedService?.duration || 30;
      
      console.log('[RESERVAR] Fetching times for:', { 
        barberId: selectedBarber.id, 
        barberName: selectedBarber.user?.name,
        date: dateStr,
        serviceDuration,
        serviceName: selectedService?.name || 'No service selected'
      });
      
      const res = await fetch(
        `/api/availability?barberId=${selectedBarber.id}&date=${dateStr}&serviceDuration=${serviceDuration}`
      );
      const data = await res.json();
      
      console.log('[RESERVAR] Available times response:', data);
      
      if (res.ok && data.availableTimes) {
        setAvailableTimes(data.availableTimes);
        console.log('[RESERVAR] Set available times:', data.availableTimes.length);
      } else {
        console.log('[RESERVAR] No available times or error');
        setAvailableTimes([]);
      }
    } catch (error) {
      console.error('[RESERVAR] Error fetching available times:', error);
      setAvailableTimes([]);
    }
  }, [selectedBarber, selectedDate, selectedService]);

  // ========== USEEFFECT HOOKS ==========
  // Fetch services when gender is selected
  useEffect(() => {
    if (selectedGender && !selectedBarber) {
      fetchServices();
    }
  }, [selectedGender, selectedBarber, fetchServices]);

  // Fetch barbers when service is selected
  useEffect(() => {
    if (selectedService) {
      fetchBarbers();
    }
  }, [selectedService, fetchBarbers]);

  // If barbers load after selecting a service, recompute the filtered list.
  // Otherwise the UI can look empty until the user re-selects the service.
  useEffect(() => {
    if (!selectedService) return;

    let filtered = barbers;
    if (selectedService.gender === 'MALE') {
      filtered = barbers.filter((b) => b.gender === 'MALE' || b.gender === 'BOTH');
    } else if (selectedService.gender === 'FEMALE') {
      filtered = barbers.filter((b) => b.gender === 'FEMALE' || b.gender === 'BOTH');
    }

    setFilteredBarbers(filtered);
  }, [barbers, selectedService]);

  // Fetch available times when date is selected
  useEffect(() => {
    if (selectedDate && selectedBarber) {
      console.log('[RESERVAR] useEffect triggered - fetching available times');
      fetchAvailableTimes();
    } else {
      console.log('[RESERVAR] useEffect - conditions not met:', {
        hasDate: !!selectedDate,
        hasBarber: !!selectedBarber
      });
    }
  }, [selectedDate, selectedBarber, fetchAvailableTimes]);

  // FIXED: Reload services when the barber changes or when returning to the services step
  useEffect(() => {
    if (currentStep === 'services') {
      console.log('[RESERVAR] Reloading services for step:', currentStep, 'barber:', selectedBarber?.user?.name);
      fetchServices();
    }
  }, [currentStep, selectedBarber]); // eslint-disable-line react-hooks/exhaustive-deps

  // UX: When changing steps (e.g. Services -> Calendar), reset scroll so the main content
  // (calendar) is visible immediately on mobile.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.requestAnimationFrame(() => {
      if (currentStep === 'datetime' && dateTimeStepTopRef.current) {
        // Use scroll-margin to account for fixed headers / safe areas.
        dateTimeStepTopRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }

      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }, [currentStep]);

  // ========== EVENT HANDLERS ==========
  // Date selection handler
  const handleDateSelect = (date: Date | undefined) => {
    console.log('[RESERVAR] handleDateSelect called with:', date);
    console.log('[RESERVAR] Current selectedDate:', selectedDate);
    console.log('[RESERVAR] Current selectedBarber:', selectedBarber?.user?.name);
    setSelectedDate(date);
    // Reset selected time when date changes
    if (date !== selectedDate) {
      console.log('[RESERVAR] Resetting selected time');
      setSelectedTime('');
    }
  };

  const handleServiceSelect = (service: Service) => {
    setSelectedService(service);
    
    // Filter barbers based on service gender
    let filtered = barbers;
    if (service.gender === 'MALE') {
      // Only show male barbers
      filtered = barbers.filter(b => b.gender === 'MALE' || b.gender === 'BOTH');
    } else if (service.gender === 'FEMALE') {
      // Only show female stylists
      filtered = barbers.filter(b => b.gender === 'FEMALE' || b.gender === 'BOTH');
    }
    setFilteredBarbers(filtered);
    
    // If barber is already selected (from URL), skip barbers list and go to datetime
    if (selectedBarber) {
      setCurrentStep('datetime');
    } else {
      setCurrentStep('barbers');
    }
  };

  const handleBarberSelect = (barber: Barber) => {
    setSelectedBarber(barber);
    setCurrentStep('barber-profile');
  };

  const handleContinueToDateTime = async () => {
    await ensureSelectedServiceForBarber();
    setCurrentStep('datetime');
  };

  const handleSubmitBooking = async () => {
    if (!session) {
      toast.error(t('booking.mustLogin'));
      router.push('/auth');
      return;
    }

    if (!selectedService || !selectedBarber || !selectedDate || !selectedTime || !paymentMethod) {
      toast.error(t('booking.completeAllFields'));
      return;
    }

    // Safety: ensure we book the service row that belongs to the selected barber
    await ensureSelectedServiceForBarber();

    if (!acceptCancellationPolicy) {
      toast.error(t('booking.acceptCancellationPolicyRequired'));
      return;
    }

    setLoading(true);

    try {
      const rescheduleId = searchParams.get('reschedule');

      // If we're rescheduling an existing appointment, use the reschedule endpoint.
      if (rescheduleId) {
        const res = await fetch(`/api/appointments/${rescheduleId}/reschedule`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            date: format(selectedDate, 'yyyy-MM-dd'),
            time: selectedTime,
          }),
        });

        if (res.ok) {
          showProfessionalSuccessToast('rescheduled');
          router.push('/perfil');
        } else {
          const data = await res.json().catch(() => ({}));
          toast.error(data.error || data.message || t('booking.errorReschedulingAppointment'));
        }

        return;
      }

      // Otherwise create a new appointment.
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          barberId: selectedBarber.id,
          serviceId: selectedService.id,
          date: format(selectedDate, 'yyyy-MM-dd'),
          time: selectedTime,
          paymentMethod: paymentMethod,
          paymentReference: paymentReference || null,
          notes: notes,
        }),
      });

      if (res.ok) {
        showProfessionalSuccessToast('booked');
        router.push('/perfil');
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || data.message || t('booking.errorBookingAppointment'));
      }
    } catch (error) {
      toast.error(t('booking.errorProcessingBooking'));
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    const barberId = searchParams.get('barberId');
    const serviceId = searchParams.get('serviceId');
    
    if (currentStep === 'payment') {
      setCurrentStep('datetime');
    } else if (currentStep === 'datetime') {
      // If we came with both barberId and serviceId, go back to barber profile
      if (barberId && serviceId) {
        router.push(`/barberos/${barberId}`);
      } else if (barberId && selectedBarber) {
        // If we only came with barberId, go back to services
        setCurrentStep('services');
        setSelectedService(null);
      } else {
        setCurrentStep('barber-profile');
      }
    } else if (currentStep === 'barber-profile') {
      setCurrentStep('barbers');
      setSelectedBarber(null);
    } else if (currentStep === 'barbers') {
      setCurrentStep('services');
      setSelectedService(null);
    } else if (currentStep === 'services') {
      // If we came with a barberId, go back to barber page
      // Otherwise go back to gender selection
      if (barberId) {
        router.push(`/barberos/${barberId}`);
      } else {
        setCurrentStep('gender');
        setSelectedGender('');
      }
    } else if (currentStep === 'gender') {
      // Go back to home or dashboard
      if (status === 'authenticated') {
        router.push('/dashboard');
      } else {
        router.push('/inicio');
      }
    }
  };

  // Step 0: Select Gender
  const renderGenderStep = () => (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6 max-w-2xl mx-auto"
    >
      <div className="text-center mb-8 sm:mb-12">
        <h2 className="text-3xl sm:text-4xl font-bold text-white mb-3 sm:mb-4">{t('booking.whoIsServiceFor')}</h2>
        <p className="text-gray-400 text-base sm:text-lg">{t('booking.selectToSeeServices')}</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:gap-6 max-w-xl mx-auto">
        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => {
            setSelectedGender('MALE');
            setCurrentStep('services');
          }}
          className="cursor-pointer"
        >
          <Card className="relative bg-[#0a0a0a] border-2 border-[#00f0ff]/25 hover:border-[#00f0ff] transition-all duration-300 overflow-hidden group">
            <div className="relative h-32 sm:h-56 md:h-64">
              <div className="absolute inset-0 bg-gradient-to-br from-[#00f0ff]/14 via-black/40 to-black/80" />
              {maleGenderImage ? (
                <div className="absolute inset-0">
                  <Image src={maleGenderImage} alt={t('booking.male')} fill className="object-cover opacity-80" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                </div>
              ) : null}
            </div>

            <CardContent className="p-4 sm:p-8 text-center">
              {!maleGenderImage ? (
                <div className="relative w-14 h-14 sm:w-24 sm:h-24 mx-auto mb-3 sm:mb-6 rounded-full bg-black/30 flex items-center justify-center border border-white/10 group-hover:bg-black/40 transition-colors overflow-hidden">
                  <User className="w-8 h-8 sm:w-12 sm:h-12 text-[#00f0ff] drop-shadow" />
                </div>
              ) : null}
              <h3 className="text-xl sm:text-3xl font-bold text-white mb-1.5 sm:mb-2 drop-shadow">{t('booking.male')}</h3>
              <p className="text-xs sm:text-base text-white/80 drop-shadow">{t('booking.servicesForMale')}</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => {
            setSelectedGender('FEMALE');
            setCurrentStep('services');
          }}
          className="cursor-pointer"
        >
          <Card className="relative bg-[#0a0a0a] border-2 border-[#ffd700]/25 hover:border-[#ffd700] transition-all duration-300 overflow-hidden group">
            <div className="relative h-32 sm:h-56 md:h-64">
              <div className="absolute inset-0 bg-gradient-to-br from-[#ffd700]/14 via-black/40 to-black/80" />
              {femaleGenderImage ? (
                <div className="absolute inset-0">
                  <Image src={femaleGenderImage} alt={t('booking.female')} fill className="object-cover opacity-80" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                </div>
              ) : null}
            </div>

            <CardContent className="p-4 sm:p-8 text-center">
              {!femaleGenderImage ? (
                <div className="relative w-14 h-14 sm:w-24 sm:h-24 mx-auto mb-3 sm:mb-6 rounded-full bg-black/30 flex items-center justify-center border border-white/10 group-hover:bg-black/40 transition-colors overflow-hidden">
                  <User className="w-8 h-8 sm:w-12 sm:h-12 text-[#ffd700] drop-shadow" />
                </div>
              ) : null}
              <h3 className="text-xl sm:text-3xl font-bold text-white mb-1.5 sm:mb-2 drop-shadow">{t('booking.female')}</h3>
              <p className="text-xs sm:text-base text-white/80 drop-shadow">{t('booking.servicesForFemale')}</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );

  // Step 1: Select Service
  const renderServicesStep = () => (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-white mb-2">{t('booking.chooseService')}</h2>
        <p className="text-gray-400">{t('booking.chooseServiceSubtitle')}</p>
      </div>

      <div className="space-y-3 max-w-4xl mx-auto">
        {services.map((service) => {
          const minutes = service.duration ?? 0;
          const hoursPart = Math.floor(minutes / 60);
          const minsPart = minutes % 60;
          const durationLabel =
            hoursPart > 0
              ? minsPart > 0
                ? `${hoursPart} ${t('common.hourShort')} ${minsPart} ${t('common.minuteShort')}`
                : `${hoursPart} ${t('common.hourShort')}`
              : `${minsPart} ${t('common.minuteShort')}`;

          return (
            <motion.div
              key={service.id}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => handleServiceSelect(service)}
              className="cursor-pointer"
            >
              <Card className="bg-black/35 border-gray-800 shadow-[0_10px_28px_rgba(0,0,0,0.45)] hover:shadow-[0_14px_34px_rgba(0,0,0,0.55)] hover:border-[#00f0ff]/60 transition-all duration-300">
                <CardContent className="p-3">
                  <div className="flex items-center gap-3">
                    <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full border border-gray-700 bg-black/20">
                      {service.image ? (
                        <Image src={service.image} alt={service.name} fill className="object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <Scissors className="h-6 w-6 text-gray-600" />
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-base font-bold italic text-white">{service.name}</p>
                        <span className="shrink-0 whitespace-nowrap break-normal tabular-nums text-sm font-bold text-[#ffd700]">{formatPrice(service.price)}</span>
                      </div>
                      <div className="mt-0.5 flex items-center gap-2 text-xs text-gray-400">
                        <Clock className="h-3.5 w-3.5" />
                        <span>{durationLabel}</span>
                      </div>
                    </div>

                    <div className="shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-gray-700 bg-transparent text-white hover:border-[#00f0ff]/60 hover:bg-[#00f0ff]/10"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleServiceSelect(service);
                        }}
                      >
                        {t('common.bookNow')}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );

  // Helper function to get professional title based on gender
  const getProfessionalTitle = (gender: 'MALE' | 'FEMALE' | 'BOTH' | null): string => {
    if (gender === 'MALE') return t('booking.barberTitle');
    if (gender === 'FEMALE') return t('booking.stylistTitle');
    if (gender === 'BOTH') return t('booking.barberAndStylistTitle');
    return t('booking.professionalTitle');
  };

  const getAvatarUrl = (barber: Barber): string | null => {
    if (barber.user?.image) return barber.user.image;
    if (barber.profileImage) return barber.profileImage;

    const media = Array.isArray(barber.media) ? barber.media : [];
    const firstPhoto = media.find((m) => m?.mediaType === 'PHOTO' && typeof m?.mediaUrl === 'string' && m.mediaUrl);

    if (firstPhoto?.mediaUrl) return firstPhoto.mediaUrl;

    const galleryImages = Array.isArray(barber.galleryImages) ? barber.galleryImages : [];
    const firstGalleryUrl = galleryImages.find((g) => typeof g?.cloud_storage_path === 'string' && g.cloud_storage_path)
      ?.cloud_storage_path;
    return firstGalleryUrl || null;
  };

  // Step 2: Select Barber
  const renderBarbersStep = () => (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-white mb-2">
          {selectedGender === 'MALE'
            ? t('booking.chooseBarber')
            : selectedGender === 'FEMALE'
              ? t('booking.chooseStylist')
              : t('booking.chooseProfessional')}
        </h2>
        <p className="text-gray-400">{t('booking.selectPreferredProfessional')}</p>
      </div>

      {barbersLoading ? (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#00f0ff]" />
          <p className="text-gray-400 text-sm mt-4">{t('booking.loadingProfessionals')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {filteredBarbers.map((barber) => {
            const avatarUrl = getAvatarUrl(barber);

            return (
              <motion.div
                key={barber.id}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleBarberSelect(barber)}
                className="cursor-pointer"
              >
                <Card className="bg-gray-900 border-gray-800 hover:border-[#00f0ff] transition-all duration-300 p-3 sm:p-6 text-center">
                  <div className="relative w-16 h-16 sm:w-24 sm:h-24 mx-auto mb-2.5 sm:mb-4">
                    <div className="w-full h-full rounded-full overflow-hidden border-2 sm:border-4 border-[#00f0ff] shadow-[0_0_14px_rgba(0,240,255,0.35)] sm:shadow-[0_0_20px_rgba(0,240,255,0.4)]">
                      {avatarUrl ? (
                        <Image
                          src={avatarUrl}
                          alt={barber.user.name || t('booking.professionalTitle')}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                          <Scissors className="w-8 h-8 sm:w-10 sm:h-10 text-gray-600" />
                        </div>
                      )}
                    </div>
                  </div>
                  <h3 className="text-sm sm:text-lg font-bold text-white mb-0.5 sm:mb-1">
                    {barber.user.name || t('booking.professionalTitle')}
                  </h3>
                  <p className="text-[10px] sm:text-xs text-[#00f0ff] mb-1.5 sm:mb-2 font-semibold">
                    {getProfessionalTitle(barber.gender)}
                  </p>
                  {typeof barber.rating === 'number' && barber.rating > 0 && (
                    <div className="flex items-center justify-center gap-1 text-[#ffd700] mb-1.5 sm:mb-2">
                      <Star className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-current" />
                      <span className="text-xs sm:text-sm font-semibold">{barber.rating.toFixed(1)}</span>
                    </div>
                  )}
                  {barber.specialties && (
                    <p className="text-[10px] sm:text-xs text-gray-500 line-clamp-2">{barber.specialties}</p>
                  )}
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );

  // Step 3: Barber Profile
  const renderBarberProfileStep = () => {
    if (!selectedBarber) return null;

    const media = Array.isArray(selectedBarber.media) ? selectedBarber.media : [];
    const photos = media.filter((m) => m?.mediaType === 'PHOTO');
    const videos = media.filter((m) => m?.mediaType === 'VIDEO');

    const avatarUrl = getAvatarUrl(selectedBarber);

    return (
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className="space-y-6"
      >
        {/* Header with photo and basic info */}
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-8">
            <div className="flex flex-col md:flex-row gap-8 items-start">
              {/* Profile photo */}
              <div className="relative w-40 h-40 flex-shrink-0 mx-auto md:mx-0">
                <div className="w-full h-full rounded-full overflow-hidden border-4 border-[#00f0ff] shadow-[0_0_30px_rgba(0,240,255,0.5)]">
                  {avatarUrl ? (
                    <Image
                      src={avatarUrl}
                      alt={selectedBarber.user.name || 'Professional'}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                      <Scissors className="w-20 h-20 text-gray-600" />
                    </div>
                  )}
                </div>
              </div>

              {/* Info */}
              <div className="flex-1 text-center md:text-left">
                <h2 className="text-4xl font-bold text-white mb-3">
                  {selectedBarber.user.name}
                </h2>

                {/* Rating */}
                {typeof selectedBarber.rating === 'number' && selectedBarber.rating > 0 && (
                  <div className="flex items-center gap-2 mb-4 justify-center md:justify-start">
                    <div className="flex gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-5 h-5 ${
                            i < Math.floor(selectedBarber.rating || 0)
                              ? 'fill-[#ffd700] text-[#ffd700]'
                              : 'text-gray-600'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-lg font-semibold text-[#ffd700]">
                      {selectedBarber.rating.toFixed(1)}
                    </span>
                  </div>
                )}

                {/* Specialties */}
                {selectedBarber.specialties && (
                  <div className="mb-4">
                    <h4 className="text-sm font-semibold text-gray-400 mb-2">Specialties:</h4>
                    <p className="text-gray-300">{selectedBarber.specialties}</p>
                  </div>
                )}

                {/* Rate */}
                {selectedBarber.hourlyRate && (
                  <div className="inline-flex items-center gap-2 bg-[#ffd700]/10 px-4 py-2 rounded-full">
                    <DollarSign className="w-5 h-5 text-[#ffd700]" />
                    <span className="text-[#ffd700] font-bold text-lg">
                      ${selectedBarber.hourlyRate}/hr
                    </span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bio */}
        {selectedBarber.bio && (
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-6">
              <h3 className="text-xl font-bold text-[#00f0ff] mb-3">About me</h3>
              <p className="text-gray-300 leading-relaxed">{selectedBarber.bio}</p>
            </CardContent>
          </Card>
        )}

        {/* Social & Contact */}
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-6">
            <h3 className="text-xl font-bold text-[#00f0ff] mb-4">Contact & Social</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
              {selectedBarber.whatsappUrl && (
                <a
                  href={selectedBarber.whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex min-h-[44px] items-center gap-2 rounded-xl border border-gray-800 bg-black/30 px-3 py-2.5 transition-all hover:border-green-500/50 hover:bg-black/40 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500/40"
                >
                  <MessageCircle className="h-4 w-4 shrink-0 text-green-500" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold leading-none text-white">WhatsApp</p>
                    <p className="mt-0.5 text-[10px] leading-none text-gray-400">Chat</p>
                  </div>
                </a>
              )}

              {selectedBarber.instagramUrl && (
                <a
                  href={selectedBarber.instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex min-h-[44px] items-center gap-2 rounded-xl border border-gray-800 bg-black/30 px-3 py-2.5 transition-all hover:border-pink-500/50 hover:bg-black/40 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500/40"
                >
                  <Instagram className="h-4 w-4 shrink-0 text-pink-500" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold leading-none text-white">Instagram</p>
                    <p className="mt-0.5 text-[10px] leading-none text-gray-400">View profile</p>
                  </div>
                </a>
              )}

              {selectedBarber.facebookUrl && (
                <a
                  href={selectedBarber.facebookUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex min-h-[44px] items-center gap-2 rounded-xl border border-gray-800 bg-black/30 px-3 py-2.5 transition-all hover:border-blue-500/50 hover:bg-black/40 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
                >
                  <Facebook className="h-4 w-4 shrink-0 text-blue-500" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold leading-none text-white">Facebook</p>
                    <p className="mt-0.5 text-[10px] leading-none text-gray-400">View page</p>
                  </div>
                </a>
              )}

              {selectedBarber.twitterUrl && (
                <a
                  href={selectedBarber.twitterUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex min-h-[44px] items-center gap-2 rounded-xl border border-gray-800 bg-black/30 px-3 py-2.5 transition-all hover:border-cyan-500/50 hover:bg-black/40 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/40"
                >
                  <svg className="h-4 w-4 shrink-0 text-cyan-500" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z" />
                  </svg>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold leading-none text-white">TikTok/Twitter</p>
                    <p className="mt-0.5 text-[10px] leading-none text-gray-400">View</p>
                  </div>
                </a>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Gallery */}
        {(photos.length > 0 || videos.length > 0) && (
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-6">
              <h3 className="text-xl font-bold text-[#00f0ff] mb-4">Gallery</h3>
              
              {/* Photos */}
              {photos.length > 0 && (
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <ImageIcon className="w-5 h-5 text-[#ffd700]" />
                    <h4 className="text-lg font-semibold text-white">Photos</h4>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {photos.slice(0, 8).map((photo) => (
                      <div key={photo.id} className="relative aspect-square rounded-lg overflow-hidden group cursor-pointer">
                        <Image
                          src={photo.mediaUrl}
                          alt={photo.title || t('common.photo')}
                          fill
                          className="object-cover group-hover:scale-110 transition-transform duration-300"
                        />
                        {photo.title && (
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                            <p className="text-white text-sm">{photo.title}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Videos */}
              {videos.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Video className="w-5 h-5 text-[#ffd700]" />
                    <h4 className="text-lg font-semibold text-white">{t('common.videos')}</h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {videos.slice(0, 4).map((video) => (
                      <div key={video.id} className="relative aspect-video rounded-lg overflow-hidden bg-gray-800">
                        <video
                          src={video.mediaUrl}
                          controls
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Continue button */}
        <div className="flex justify-center pt-6">
          <Button
            onClick={handleContinueToDateTime}
            className="bg-gradient-to-r from-[#00f0ff] to-[#ffd700] text-black font-semibold px-8 py-2.5 hover:shadow-[0_0_20px_rgba(0,240,255,0.5)] transition-all duration-300"
          >
            {t('booking.continue')}
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </motion.div>
    );
  };

  // Step 4: Date & Time
  const renderDateTimeStep = () => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const quickDays = Array.from({ length: 14 }, (_, i) => addDays(todayStart, i));

    const minutesFor = (t: string) => parseTimeToMinutes(t) ?? 0;
    const sortedSlots = [...filteredAvailableTimes].sort((a, b) => minutesFor(a) - minutesFor(b));

    const formatSlot = (raw: string) => {
      const text = String(raw ?? '').trim();
      const upper = text.toUpperCase();
      const m = upper.match(/^\s*(\d{1,2})(?::(\d{2}))?\s*(AM|PM)\s*$/);
      if (m) {
        const hh = Number(m[1]);
        const mm = m[2] ?? '00';
        const ap = m[3];
        const hour = Number.isFinite(hh) ? String(hh) : m[1];
        return { main: `${hour}:${mm}`, sub: ap };
      }
      return { main: text, sub: '' };
    };

    const morning = sortedSlots.filter((t) => minutesFor(t) < 12 * 60);
    const afternoon = sortedSlots.filter((t) => minutesFor(t) >= 12 * 60 && minutesFor(t) < 17 * 60);
    const evening = sortedSlots.filter((t) => minutesFor(t) >= 17 * 60);

    const slotGroups: Array<{ label: string; items: string[] }> = [
      { label: t('booking.morning'), items: morning },
      { label: t('booking.afternoon'), items: afternoon },
      { label: t('booking.evening'), items: evening },
    ];

    return (
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className="space-y-6 max-w-4xl mx-auto"
      >
        <div ref={dateTimeStepTopRef} className="scroll-mt-24" />
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-white mb-2">{t('booking.selectDateTime')}</h2>
          <p className="text-gray-400">{t('booking.chooseDateTimeSubtitle')}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Calendar */}
          <Card className="bg-black/35 border-gray-800">
            <CardContent className="p-6">
              <h3 className="text-xl font-bold text-[#00f0ff] mb-4 text-center">{t('booking.selectDate')}</h3>

              <div className="flex justify-center">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={handleDateSelect}
                  disabled={(date) => date < todayStart}
                  className="mx-auto rounded-xl border border-gray-800 bg-black/20"
                  classNames={{
                    caption_label: 'text-sm font-semibold text-[#00f0ff]',
                    head_cell: 'text-gray-500 rounded-md w-9 font-medium text-[0.75rem]',
                    nav_button:
                      'h-7 w-7 bg-black/20 border border-gray-800 p-0 text-gray-300 hover:bg-[#00f0ff]/10 hover:text-[#00f0ff] hover:border-[#00f0ff]/30',
                    day: 'h-9 w-9 p-0 font-normal rounded-full hover:bg-[#00f0ff]/15 hover:text-[#00f0ff] transition-colors',
                    day_selected:
                      'bg-[#00f0ff] text-black font-bold hover:bg-[#00f0ff] focus:bg-[#00f0ff] shadow-[0_0_10px_rgba(0,240,255,0.45)]',
                    day_today: 'bg-[#ffd700]/10 text-[#ffd700] border border-[#ffd700]/40 rounded-full',
                    day_outside: 'day-outside text-gray-600 opacity-50',
                    day_disabled: 'text-gray-600 opacity-50',
                  }}
                />
              </div>

              {/* Quick 7-day strip (schedule-style) */}
              <div className="mt-5">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-gray-400">{t('booking.upcomingDates')}</p>
                  {selectedDate ? (
                    <p className="text-sm text-gray-300">
                      <span className="text-gray-500">{t('booking.selected')}:</span>{' '}
                      <span className="font-semibold text-white">
                        {format(selectedDate, 'EEE, MMM d', { locale: dateLocale })}
                      </span>
                    </p>
                  ) : null}
                </div>

                <div className="flex gap-3 overflow-x-auto pb-2 [-webkit-overflow-scrolling:touch] snap-x snap-mandatory scrollbar-hide">
                  {quickDays.map((d) => {
                    const isSelected = selectedDate ? isSameDay(d, selectedDate) : false;
                    const isToday = isSameDay(d, todayStart);
                    return (
                      <button
                        key={d.toISOString()}
                        type="button"
                        onClick={() => handleDateSelect(d)}
                        aria-current={isSelected ? 'date' : undefined}
                        className={`flex-none w-[84px] rounded-xl border px-3 py-2 text-center transition-colors snap-start ${
                          isSelected
                            ? 'border-[#00f0ff]/70 bg-[#00f0ff]/10'
                            : isToday
                              ? 'border-[#ffd700]/40 bg-[#ffd700]/10'
                              : 'border-gray-800 bg-black/20 hover:border-[#00f0ff]/30'
                        }`}
                      >
                        <div className="text-[11px] text-gray-400">{format(d, 'EEE', { locale: dateLocale })}</div>
                        <div className={`text-lg font-extrabold ${isSelected ? 'text-[#00f0ff]' : isToday ? 'text-[#ffd700]' : 'text-white'}`}>
                          {format(d, 'd', { locale: dateLocale })}
                        </div>
                        <div className={`text-[11px] ${isSelected ? 'text-[#00f0ff]/80' : isToday ? 'text-[#ffd700]/80' : 'text-gray-500'}`}>
                          {format(d, 'MMM', { locale: dateLocale })}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Time Slots */}
          <Card className="bg-black/35 border-gray-800">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-[#00f0ff]">{t('booking.selectTime')}</h3>
                {selectedDate ? (
                  <div className="text-right">
                    <div className="text-xs text-gray-500">{t('booking.dateLabel')}</div>
                    <div className="text-sm font-semibold text-white">
                      {format(selectedDate, 'EEE, MMM d', { locale: dateLocale })}
                    </div>
                  </div>
                ) : null}
              </div>

              {!selectedDate ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Clock className="w-16 h-16 text-gray-600 mb-4" />
                  <p className="text-gray-400 text-center">{t('booking.selectDayToSeeTimes')}</p>
                </div>
              ) : sortedSlots.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Clock className="w-16 h-16 text-gray-600 mb-4" />
                  <p className="text-gray-400 text-center">{t('booking.noTimesAvailable')}</p>
                  <p className="text-gray-500 text-sm mt-2">{t('booking.tryAnotherDate')}</p>
                </div>
              ) : (
                <div className="space-y-5">
                  {slotGroups.map((group) =>
                    group.items.length === 0 ? null : (
                      <div key={group.label}>
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm font-semibold text-gray-300">{group.label}</p>
                          <p className="text-xs text-gray-500">
                            {group.items.length} {t('booking.slots')}
                          </p>
                        </div>

                        <div className="flex gap-3 overflow-x-auto pb-2 [-webkit-overflow-scrolling:touch] snap-x snap-mandatory scrollbar-hide">
                          {group.items.map((time) => {
                            const slot = formatSlot(time);
                            return (
                              <button
                                key={time}
                                type="button"
                                onClick={() => setSelectedTime(time)}
                                aria-pressed={selectedTime === time}
                                className={`flex-none w-16 h-16 rounded-full border text-center transition-colors snap-start ${
                                  selectedTime === time
                                    ? 'border-[#00f0ff] bg-[#00f0ff] text-black shadow-[0_0_16px_rgba(0,240,255,0.35)]'
                                    : 'border-gray-800 bg-black/20 text-white hover:border-[#00f0ff]/40 hover:bg-[#00f0ff]/10 hover:text-[#00f0ff]'
                                }`}
                                aria-label={t('booking.selectTimeAria').replace('{time}', formatTime12h(time))}
                              >
                                <div className="w-full h-full flex items-center justify-center px-2">
                                  <span className="text-sm font-bold leading-none whitespace-nowrap">{slot.main}</span>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

      {/* Additional Notes */}
      <Card className="bg-gray-900 border-gray-800">
        <CardContent className="p-6">
          <Label htmlFor="notes" className="text-white text-lg mb-3 block">
            {t('booking.notes')} ({t('common.optional')})
          </Label>
          <Textarea
            id="notes"
            placeholder={t('booking.notesPlaceholder')}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="bg-gray-800 border-gray-700 text-white min-h-[100px]"
          />
        </CardContent>
      </Card>

      {/* Summary and Continue */}
      {selectedDate && selectedTime && (
        <Card className="bg-gradient-to-r from-[#00f0ff]/10 to-[#ffd700]/10 border-[#00f0ff]">
          <CardContent className="p-6">
            <h3 className="text-2xl font-bold text-white mb-4">{t('booking.appointmentSummary')}</h3>
            <div className="space-y-3 text-gray-300 mb-6">
              <div className="flex items-center gap-3">
                <Scissors className="w-5 h-5 text-[#00f0ff]" />
                <span>
                  {t('booking.serviceLabel')}: <strong>{selectedService?.name}</strong>
                </span>
              </div>
              <div className="flex items-center gap-3">
                <User className="w-5 h-5 text-[#00f0ff]" />
                <span>
                  {t('common.barber')}: <strong>{selectedBarber?.user.name}</strong>
                </span>
              </div>
              <div className="flex items-center gap-3">
                <CalendarIcon className="w-5 h-5 text-[#00f0ff]" />
                <span>
                  {t('booking.dateLabel')}: <strong>{format(selectedDate, 'MMMM d, yyyy', { locale: dateLocale })}</strong>
                </span>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-[#00f0ff]" />
                <span>
                  {t('booking.timeLabel')}: <strong>{selectedTime}</strong>
                </span>
              </div>
              <div className="flex items-center gap-3">
                <DollarSign className="w-5 h-5 text-[#ffd700]" />
                <span>
                  {t('booking.priceLabel')}: <strong className="text-[#ffd700] text-xl">${selectedService?.price}</strong>
                </span>
              </div>
            </div>

            <Button
              onClick={() => setCurrentStep('payment')}
              className="w-full bg-gradient-to-r from-[#00f0ff] to-[#ffd700] text-black font-semibold py-2.5 hover:shadow-[0_0_20px_rgba(0,240,255,0.5)] transition-all duration-300"
            >
              <ArrowRight className="w-5 h-5 mr-2" />
              {t('booking.continue')}
            </Button>
          </CardContent>
        </Card>
      )}
      </motion.div>
    );
  };

  // Step 5: Payment Method
  const renderPaymentStep = () => {
    if (!selectedBarber) return null;

    const hasZelle = selectedBarber.zelleEmail || selectedBarber.zellePhone;
    const hasCashapp = selectedBarber.cashappTag;

    const paymentMethodLabel =
      paymentMethod === 'ZELLE'
        ? t('booking.paymentMethods.zelle')
        : paymentMethod === 'CASHAPP'
          ? t('booking.paymentMethods.cashapp')
          : t('booking.paymentMethods.cash');

    return (
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className="space-y-6 max-w-4xl mx-auto"
      >
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-white mb-2">{t('booking.paymentMethod')}</h2>
          <p className="text-gray-400">{t('booking.paymentSubtitle')}</p>
        </div>

        {/* Barber's Payment Info */}
        <Card className="bg-gradient-to-r from-[#00f0ff]/5 to-[#ffd700]/5 border-[#00f0ff]/30">
          <CardContent className="p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-[#00f0ff]">
                {selectedBarber.profileImage ? (
                  <Image
                    src={selectedBarber.profileImage}
                    alt={selectedBarber.user.name || t('common.barber')}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-[#00f0ff] to-[#0099cc] flex items-center justify-center text-white font-bold text-xl">
                    {selectedBarber.user.name?.[0] || 'B'}
                  </div>
                )}
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">{selectedBarber.user.name}</h3>
                {selectedBarber.user.name?.trim().toLowerCase() === 'adolfo torres' ? (
                  <p className="text-gray-300/80 text-sm">(Barber License)</p>
                ) : null}
                <p className="text-gray-400">{t('booking.acceptedPaymentMethods')}</p>
              </div>
            </div>

            {/* Payment Methods */}
            <div className="space-y-4">
              {hasZelle && (
                <div
                  onClick={() => setPaymentMethod('ZELLE')}
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all duration-300 ${
                    paymentMethod === 'ZELLE'
                      ? 'border-purple-400 bg-purple-400/10'
                      : 'border-gray-700 bg-gray-800 hover:border-purple-400/50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <DollarSign className="w-6 h-6 text-purple-400" />
                      <span className="text-xl font-bold text-white">{t('booking.paymentMethods.zelle')}</span>
                    </div>
                    {paymentMethod === 'ZELLE' && (
                      <Check className="w-6 h-6 text-purple-400" />
                    )}
                  </div>
                  <div className="space-y-1 text-sm">
                    {selectedBarber.zelleEmail && (
                      <p className="text-gray-300">
                        <span className="text-gray-500">{t('common.email')}:</span>{' '}
                        <span className="font-semibold text-purple-300">{selectedBarber.zelleEmail}</span>
                      </p>
                    )}
                    {selectedBarber.zellePhone && (
                      <p className="text-gray-300">
                        <span className="text-gray-500">{t('common.phone')}:</span>{' '}
                        <span className="font-semibold text-purple-300">{selectedBarber.zellePhone}</span>
                      </p>
                    )}
                  </div>
                </div>
              )}

              {hasCashapp && (
                <div
                  onClick={() => setPaymentMethod('CASHAPP')}
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all duration-300 ${
                    paymentMethod === 'CASHAPP'
                      ? 'border-green-400 bg-green-400/10'
                      : 'border-gray-700 bg-gray-800 hover:border-green-400/50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <DollarSign className="w-6 h-6 text-green-400" />
                      <span className="text-xl font-bold text-white">{t('booking.paymentMethods.cashapp')}</span>
                    </div>
                    {paymentMethod === 'CASHAPP' && (
                      <Check className="w-6 h-6 text-green-400" />
                    )}
                  </div>
                  <p className="text-gray-300 text-sm">
                    <span className="text-gray-500">{t('booking.cashappCashtagLabel')}:</span>{' '}
                    <span className="font-semibold text-green-300">{selectedBarber.cashappTag}</span>
                  </p>
                </div>
              )}

              {/* Cash option always available */}
              <div
                onClick={() => setPaymentMethod('CASH')}
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all duration-300 ${
                  paymentMethod === 'CASH'
                    ? 'border-[#ffd700] bg-[#ffd700]/10'
                    : 'border-gray-700 bg-gray-800 hover:border-[#ffd700]/50'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <DollarSign className="w-6 h-6 text-[#ffd700]" />
                    <span className="text-xl font-bold text-white">{t('booking.paymentMethods.cash')}</span>
                  </div>
                  {paymentMethod === 'CASH' && (
                    <Check className="w-6 h-6 text-[#ffd700]" />
                  )}
                </div>
                <p className="text-gray-400 text-sm">{t('booking.cashPayment')}</p>
              </div>
            </div>

            {/* Payment Reference (optional) */}
            {(paymentMethod === 'ZELLE' || paymentMethod === 'CASHAPP') && (
              <div className="mt-6 pt-6 border-t border-gray-700">
                <Label htmlFor="paymentRef" className="text-white text-lg mb-3 block">
                  {t('booking.paymentReference')} ({t('common.optional')})
                </Label>
                <Input
                  id="paymentRef"
                  placeholder={t('booking.paymentRefPlaceholder')}
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  className="bg-gray-800 border-gray-700 text-white"
                />
                <p className="text-xs text-gray-500 mt-2">
                  {t('booking.paymentReferenceHelp').replace('{name}', selectedBarber.user.name || t('common.barber'))}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Summary and Confirm */}
        {paymentMethod && (
          <Card className="bg-gradient-to-r from-[#00f0ff]/10 to-[#ffd700]/10 border-[#00f0ff]">
            <CardContent className="p-6">
              <h3 className="text-2xl font-bold text-white mb-4">{t('booking.confirmBooking')}</h3>
              <div className="space-y-3 text-gray-300 mb-6">
                <div className="flex items-center gap-3">
                  <Scissors className="w-5 h-5 text-[#00f0ff]" />
                  <span>
                    {t('booking.serviceLabel')}: <strong>{selectedService?.name}</strong>
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <User className="w-5 h-5 text-[#00f0ff]" />
                  <span>
                    {t('common.barber')}: <strong>{selectedBarber?.user.name}</strong>
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <CalendarIcon className="w-5 h-5 text-[#00f0ff]" />
                  <span>
                    {t('booking.dateLabel')}: <strong>{selectedDate && format(selectedDate, 'MMMM d, yyyy', { locale: dateLocale })}</strong>
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-[#00f0ff]" />
                  <span>
                    {t('booking.timeLabel')}: <strong>{selectedTime}</strong>
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <DollarSign className="w-5 h-5 text-[#ffd700]" />
                  <span>
                    {t('booking.paymentMethodLabel')}: <strong className="text-[#ffd700]">{paymentMethodLabel}</strong>
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <DollarSign className="w-5 h-5 text-[#ffd700]" />
                  <span>
                    {t('booking.priceLabel')}: <strong className="text-[#ffd700] text-xl">${selectedService?.price}</strong>
                  </span>
                </div>
              </div>

              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-6">
                <p className="text-yellow-200 text-sm flex items-start gap-2">
                  <span className="text-xl">⚠️</span>
                  <span>
                    {paymentMethod === 'CASH'
                      ? t('booking.cashReminder')
                      : t('booking.makePaymentBeforeAppointment').replace('{method}', paymentMethodLabel)}
                  </span>
                </p>
              </div>

              <div className="border border-gray-700 bg-gray-900/40 rounded-lg p-4 mb-6">
                <label className="flex items-start gap-3 text-sm text-gray-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={acceptCancellationPolicy}
                    onChange={(e) => setAcceptCancellationPolicy(e.target.checked)}
                    className="mt-1 h-4 w-4 accent-[#ffd700]"
                  />
                  <span>
                    {t('booking.cancellationPolicyAgreementPrefix')} <strong>{t('booking.twentyFourHours')}</strong>{' '}
                    {t('booking.cancellationPolicyAgreementSuffix')}
                  </span>
                </label>
              </div>

              <Button
                onClick={handleSubmitBooking}
                disabled={loading}
                className="w-full bg-gradient-to-r from-[#00f0ff] to-[#ffd700] text-black font-semibold py-2.5 hover:shadow-[0_0_20px_rgba(0,240,255,0.5)] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  t('booking.processing')
                ) : (
                  <>
                    <Check className="w-5 h-5 mr-2" />
                    {t('booking.confirmBooking')}
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}
      </motion.div>
    );
  };

  const isGenderStep = currentStep === 'gender';

  return (
    <div className="min-h-screen bg-black pb-24 flex flex-col">
      {/* Back button */}
      <div className="container mx-auto px-4 mt-4 mb-2 sm:mt-6 sm:mb-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleBack}
          className="text-gray-400 hover:text-[#00f0ff] active:text-[#00f0ff] mb-2"
          aria-label={t('common.back')}
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
      </div>

      {/* Main content */}
      <div
        className={`container mx-auto px-4 flex-1 ${
          isGenderStep ? 'flex items-center justify-center' : ''
        }`}
      >
        <AnimatePresence mode="wait">
          {currentStep === 'gender' && renderGenderStep()}
          {currentStep === 'services' && renderServicesStep()}
          {currentStep === 'barbers' && renderBarbersStep()}
          {currentStep === 'barber-profile' && renderBarberProfileStep()}
          {currentStep === 'datetime' && renderDateTimeStep()}
          {currentStep === 'payment' && renderPaymentStep()}
        </AnimatePresence>
      </div>
    </div>
  );
}