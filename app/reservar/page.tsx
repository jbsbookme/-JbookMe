'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
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
import { DashboardNavbar } from '@/components/dashboard/navbar';
import { enUS } from 'date-fns/locale';

// Types
type Service = {
  id: string;
  name: string;
  description: string | null;
  duration: number;
  price: number;
  image: string | null;
  gender: 'MALE' | 'FEMALE' | 'UNISEX' | null;
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
};

type Step = 'gender' | 'services' | 'barbers' | 'barber-profile' | 'datetime' | 'payment';

export default function ReservarPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  const showProfessionalSuccessToast = (mode: 'booked' | 'rescheduled') => {
    const title = mode === 'booked' ? 'Booking confirmed' : 'Appointment rescheduled';
    const subtitle = 'Thanks for being part of JBBarbershop.';

    toast.custom(
      (t) => (
        <div
          className={`${
            t.visible ? 'animate-enter' : 'animate-leave'
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
              onClick={() => toast.dismiss(t.id)}
              className="ml-2 text-gray-400 hover:text-white transition-colors"
              aria-label="Dismiss"
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
            toast.error("Error: This professional's gender is not set correctly");
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
          setServices(servicesArray.filter((s: Service) => s));
          
          // If serviceId is provided, pre-select the service and skip to date/time
          if (serviceId) {
            console.log('[RESERVAR] ServiceId provided, finding service...');
            const service = servicesArray.find((s: Service) => s.id === serviceId);
            
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
      toast.error('Error loading professional');
    }
  };

  // ========== FETCH FUNCTIONS ==========
  const fetchServices = useCallback(async () => {
    try {
      // FIXED: If a barber is selected, filter by their gender
      let genderForServices = selectedGender;
      
      if (selectedBarber?.gender && selectedBarber.gender !== 'BOTH') {
        genderForServices = selectedBarber.gender;
        console.log('[RESERVAR] Filtering services by barber gender:', genderForServices);
      }
      
      const genderParam = genderForServices ? `?gender=${genderForServices}` : '';
      const res = await fetch(`/api/services${genderParam}`);
      const data = await res.json();
      if (res.ok) {
        // Ensure data is an array
        const servicesArray = Array.isArray(data) ? data : (data.services || []);
        setServices(servicesArray.filter((s: Service) => s));
        console.log('[RESERVAR] Loaded services:', servicesArray.length, 'for gender:', genderForServices);
      }
    } catch (error) {
      console.error('Error fetching services:', error);
    }
  }, [selectedGender, selectedBarber?.gender]);

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

  const handleContinueToDateTime = () => {
    setCurrentStep('datetime');
  };

  const handleSubmitBooking = async () => {
    if (!session) {
      toast.error('You must sign in to book');
      router.push('/auth');
      return;
    }

    if (!selectedService || !selectedBarber || !selectedDate || !selectedTime || !paymentMethod) {
      toast.error('Please complete all fields, including the payment method');
      return;
    }

    if (!acceptCancellationPolicy) {
      toast.error('Please accept the 24-hour cancellation policy to continue');
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
          router.push('/dashboard/cliente');
        } else {
          const data = await res.json().catch(() => ({}));
          toast.error(data.error || data.message || 'Error rescheduling appointment');
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
        router.push('/dashboard/cliente');
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || data.message || 'Error booking appointment');
      }
    } catch (error) {
      toast.error('Error processing booking');
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
      <div className="text-center mb-12">
        <h2 className="text-4xl font-bold text-white mb-4">Who is this service for?</h2>
        <p className="text-gray-400 text-lg">Select to see personalized services</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => {
            setSelectedGender('MALE');
            setCurrentStep('services');
          }}
          className="cursor-pointer"
        >
          <Card className="bg-gradient-to-br from-blue-900/40 to-cyan-900/40 border-2 border-blue-500/30 hover:border-[#00f0ff] transition-all duration-300 overflow-hidden group">
            <CardContent className="p-12 text-center">
              <div className="relative w-24 h-24 mx-auto mb-6 rounded-full bg-blue-500/20 flex items-center justify-center group-hover:bg-blue-500/30 transition-colors overflow-hidden">
                {maleGenderImage ? (
                  <Image
                    src={maleGenderImage}
                    alt="Man"
                    fill
                    className="object-cover"
                  />
                ) : (
                  <User className="w-12 h-12 text-[#00f0ff]" />
                )}
              </div>
              <h3 className="text-3xl font-bold text-white mb-2">Men</h3>
              <p className="text-gray-400">Services for men</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => {
            setSelectedGender('FEMALE');
            setCurrentStep('services');
          }}
          className="cursor-pointer"
        >
          <Card className="bg-gradient-to-br from-pink-900/40 to-purple-900/40 border-2 border-pink-500/30 hover:border-[#ffd700] transition-all duration-300 overflow-hidden group">
            <CardContent className="p-12 text-center">
              <div className="relative w-24 h-24 mx-auto mb-6 rounded-full bg-pink-500/20 flex items-center justify-center group-hover:bg-pink-500/30 transition-colors overflow-hidden">
                {femaleGenderImage ? (
                  <Image
                    src={femaleGenderImage}
                    alt="Woman"
                    fill
                    className="object-cover"
                  />
                ) : (
                  <User className="w-12 h-12 text-[#ffd700]" />
                )}
              </div>
              <h3 className="text-3xl font-bold text-white mb-2">Women</h3>
              <p className="text-gray-400">Services for women</p>
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
        <h2 className="text-3xl font-bold text-white mb-2">Select a Service</h2>
        <p className="text-gray-400">Choose the service you want to book</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {services.map((service) => (
          <motion.div
            key={service.id}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleServiceSelect(service)}
            className="cursor-pointer"
          >
            <Card className="bg-gray-900 border-gray-800 hover:border-[#00f0ff] transition-all duration-300 overflow-hidden group">
              <div className="relative h-48 bg-gray-800">
                {service.image ? (
                  <Image
                    src={service.image}
                    alt={service.name}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Scissors className="w-16 h-16 text-gray-600" />
                  </div>
                )}
                <div className="absolute top-3 right-3 bg-[#ffd700] text-black px-3 py-1 rounded-full font-bold">
                  ${service.price}
                </div>
              </div>
              <CardContent className="p-6">
                <h3 className="text-xl font-bold text-white mb-2">{service.name}</h3>
                <p className="text-gray-400 text-sm mb-4 line-clamp-2">
                  {service.description || 'No description'}
                </p>
                <div className="flex items-center text-gray-500 text-sm mb-4">
                  <Clock className="w-4 h-4 mr-2" />
                  {service.duration} min
                </div>
                <Button 
                  size="sm"
                  className="w-full bg-gradient-to-r from-[#00f0ff] to-[#ffd700] text-black font-bold hover:opacity-90 transition-opacity text-xs py-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleServiceSelect(service);
                  }}
                >
                  <CalendarIcon className="w-3 h-3 mr-1.5" />
                  Book Now
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );

  // Helper function to get professional title based on gender
  const getProfessionalTitle = (gender: 'MALE' | 'FEMALE' | 'BOTH' | null): string => {
    if (gender === 'MALE') return 'Barber';
    if (gender === 'FEMALE') return 'Stylist';
    if (gender === 'BOTH') return 'Barber & Stylist';
    return 'Professional';
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
          {selectedGender === 'MALE' ? 'Choose Your Barber' : selectedGender === 'FEMALE' ? 'Choose Your Stylist' : 'Choose Your Professional'}
        </h2>
        <p className="text-gray-400">Select your preferred professional</p>
      </div>

      {barbersLoading ? (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#00f0ff]" />
          <p className="text-gray-400 text-sm mt-4">Loading professionals...</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredBarbers.map((barber) => (
            <motion.div
              key={barber.id}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleBarberSelect(barber)}
              className="cursor-pointer"
            >
              <Card className="bg-gray-900 border-gray-800 hover:border-[#00f0ff] transition-all duration-300 p-6 text-center">
                <div className="relative w-24 h-24 mx-auto mb-4">
                  <div className="w-full h-full rounded-full overflow-hidden border-4 border-[#00f0ff] shadow-[0_0_20px_rgba(0,240,255,0.4)]">
                    {barber.user.image ? (
                      <Image
                        src={barber.user.image}
                        alt={barber.user.name || 'Barber'}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                        <Scissors className="w-10 h-10 text-gray-600" />
                      </div>
                    )}
                  </div>
                </div>
                <h3 className="text-lg font-bold text-white mb-1">
                  {barber.user.name || 'Professional'}
                </h3>
                <p className="text-xs text-[#00f0ff] mb-2 font-semibold">
                  {getProfessionalTitle(barber.gender)}
                </p>
                {barber.rating && (
                  <div className="flex items-center justify-center gap-1 text-[#ffd700] mb-2">
                    <Star className="w-4 h-4 fill-current" />
                    <span className="text-sm font-semibold">{barber.rating.toFixed(1)}</span>
                  </div>
                )}
                {barber.specialties && (
                  <p className="text-xs text-gray-500 line-clamp-2">{barber.specialties}</p>
                )}
              </Card>
            </motion.div>
          ))}
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
                  {selectedBarber.profileImage ? (
                    <Image
                      src={selectedBarber.profileImage}
                      alt={selectedBarber.user.name || 'Barber'}
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
                {selectedBarber.rating && (
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
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {selectedBarber.whatsappUrl && (
                <a
                  href={selectedBarber.whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-4 bg-gray-800 rounded-lg hover:bg-green-600/20 hover:border-green-500 border border-gray-700 transition-all"
                >
                  <MessageCircle className="w-6 h-6 text-green-500" />
                  <div>
                    <p className="text-xs text-gray-400">WhatsApp</p>
                    <p className="text-sm font-semibold text-white">Contact</p>
                  </div>
                </a>
              )}

              {selectedBarber.instagramUrl && (
                <a
                  href={selectedBarber.instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-4 bg-gray-800 rounded-lg hover:bg-pink-600/20 hover:border-pink-500 border border-gray-700 transition-all"
                >
                  <Instagram className="w-6 h-6 text-pink-500" />
                  <div>
                    <p className="text-xs text-gray-400">Instagram</p>
                    <p className="text-sm font-semibold text-white">Visit</p>
                  </div>
                </a>
              )}

              {selectedBarber.facebookUrl && (
                <a
                  href={selectedBarber.facebookUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-4 bg-gray-800 rounded-lg hover:bg-blue-600/20 hover:border-blue-500 border border-gray-700 transition-all"
                >
                  <Facebook className="w-6 h-6 text-blue-500" />
                  <div>
                    <p className="text-xs text-gray-400">Facebook</p>
                    <p className="text-sm font-semibold text-white">Visit</p>
                  </div>
                </a>
              )}

              {selectedBarber.twitterUrl && (
                <a
                  href={selectedBarber.twitterUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-4 bg-gray-800 rounded-lg hover:bg-cyan-600/20 hover:border-cyan-500 border border-gray-700 transition-all"
                >
                  <svg className="w-6 h-6 text-cyan-500" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z" />
                  </svg>
                  <div>
                    <p className="text-xs text-gray-400">TikTok/Twitter</p>
                    <p className="text-sm font-semibold text-white">Visit</p>
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
                          alt={photo.title || 'Photo'}
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
                    <h4 className="text-lg font-semibold text-white">Videos</h4>
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
            Continue
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

    const quickDays = Array.from({ length: 7 }, (_, i) => addDays(todayStart, i));

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
      { label: 'Morning', items: morning },
      { label: 'Afternoon', items: afternoon },
      { label: 'Evening', items: evening },
    ];

    return (
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className="space-y-6 max-w-4xl mx-auto"
      >
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-white mb-2">Select Date & Time</h2>
          <p className="text-gray-400">Choose when you want your appointment</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Calendar */}
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-6">
              <h3 className="text-xl font-bold text-[#00f0ff] mb-4 text-center">Select a Day</h3>

              <div className="flex justify-center">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={handleDateSelect}
                  disabled={(date) => date < todayStart}
                  className="mx-auto rounded-md border border-gray-700"
                />
              </div>

              {/* Quick 7-day strip (schedule-style) */}
              <div className="mt-5">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-gray-400">Next days</p>
                  {selectedDate ? (
                    <p className="text-sm text-gray-300">
                      <span className="text-gray-500">Selected:</span>{' '}
                      <span className="font-semibold text-white">
                        {format(selectedDate, 'EEE, MMM d', { locale: enUS })}
                      </span>
                    </p>
                  ) : null}
                </div>

                <div className="flex gap-2 overflow-x-auto pb-2 [-webkit-overflow-scrolling:touch]">
                  {quickDays.map((d) => {
                    const isSelected = selectedDate ? isSameDay(d, selectedDate) : false;
                    return (
                      <button
                        key={d.toISOString()}
                        type="button"
                        onClick={() => handleDateSelect(d)}
                        className={`min-w-[72px] rounded-lg border px-3 py-2 text-center transition-colors ${
                          isSelected
                            ? 'border-[#00f0ff]/60 bg-[#00f0ff]/10'
                            : 'border-gray-800 bg-black/20 hover:border-[#00f0ff]/30'
                        }`}
                      >
                        <div className="text-[11px] text-gray-400">{format(d, 'EEE', { locale: enUS })}</div>
                        <div className={`text-base font-bold ${isSelected ? 'text-[#00f0ff]' : 'text-white'}`}>
                          {format(d, 'd', { locale: enUS })}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Time Slots */}
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-[#00f0ff]">Select a Time</h3>
                {selectedDate ? (
                  <div className="text-right">
                    <div className="text-xs text-gray-500">Date</div>
                    <div className="text-sm font-semibold text-white">
                      {format(selectedDate, 'EEE, MMM d', { locale: enUS })}
                    </div>
                  </div>
                ) : null}
              </div>

              {!selectedDate ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Clock className="w-16 h-16 text-gray-600 mb-4" />
                  <p className="text-gray-400 text-center">Select a day to see available times</p>
                </div>
              ) : sortedSlots.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Clock className="w-16 h-16 text-gray-600 mb-4" />
                  <p className="text-gray-400 text-center">No times available for this day</p>
                  <p className="text-gray-500 text-sm mt-2">Try another date</p>
                </div>
              ) : (
                <div className="space-y-5">
                  {slotGroups.map((group) =>
                    group.items.length === 0 ? null : (
                      <div key={group.label}>
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm font-semibold text-gray-300">{group.label}</p>
                          <p className="text-xs text-gray-500">{group.items.length} slots</p>
                        </div>

                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                          {group.items.map((time) => (
                            (() => {
                              const slot = formatSlot(time);
                              return (
                            <button
                              key={time}
                              type="button"
                              onClick={() => setSelectedTime(time)}
                              className={`min-w-[72px] rounded-lg border px-3 py-2 text-center transition-colors ${
                                selectedTime === time
                                  ? 'border-[#00f0ff]/60 bg-[#00f0ff]/10'
                                  : 'border-gray-800 bg-black/20 hover:border-[#00f0ff]/30'
                              }`}
                            >
                              <div className="text-[11px] text-gray-400 leading-none">
                                {slot.sub || '\u00A0'}
                              </div>
                              <div
                                className={`text-base font-bold leading-tight whitespace-nowrap ${
                                  selectedTime === time ? 'text-[#00f0ff]' : 'text-white'
                                }`}
                              >
                                {slot.main}
                              </div>
                            </button>
                              );
                            })()
                          ))}
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
            Additional notes (optional)
          </Label>
          <Textarea
            id="notes"
            placeholder="Any preferences or special requests..."
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
            <h3 className="text-2xl font-bold text-white mb-4">Appointment Summary</h3>
            <div className="space-y-3 text-gray-300 mb-6">
              <div className="flex items-center gap-3">
                <Scissors className="w-5 h-5 text-[#00f0ff]" />
                <span>Service: <strong>{selectedService?.name}</strong></span>
              </div>
              <div className="flex items-center gap-3">
                <User className="w-5 h-5 text-[#00f0ff]" />
                <span>Barber: <strong>{selectedBarber?.user.name}</strong></span>
              </div>
              <div className="flex items-center gap-3">
                <CalendarIcon className="w-5 h-5 text-[#00f0ff]" />
                <span>
                  Date: <strong>{format(selectedDate, 'MMMM d, yyyy', { locale: enUS })}</strong>
                </span>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-[#00f0ff]" />
                <span>Time: <strong>{selectedTime}</strong></span>
              </div>
              <div className="flex items-center gap-3">
                <DollarSign className="w-5 h-5 text-[#ffd700]" />
                <span>Price: <strong className="text-[#ffd700] text-xl">${selectedService?.price}</strong></span>
              </div>
            </div>

            <Button
              onClick={() => setCurrentStep('payment')}
              className="w-full bg-gradient-to-r from-[#00f0ff] to-[#ffd700] text-black font-semibold py-2.5 hover:shadow-[0_0_20px_rgba(0,240,255,0.5)] transition-all duration-300"
            >
              <ArrowRight className="w-5 h-5 mr-2" />
              Continue
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

    return (
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className="space-y-6 max-w-4xl mx-auto"
      >
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-white mb-2">Payment Method</h2>
          <p className="text-gray-400">Select how you&apos;d like to pay</p>
        </div>

        {/* Barber's Payment Info */}
        <Card className="bg-gradient-to-r from-[#00f0ff]/5 to-[#ffd700]/5 border-[#00f0ff]/30">
          <CardContent className="p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-[#00f0ff]">
                {selectedBarber.profileImage ? (
                  <Image
                    src={selectedBarber.profileImage}
                    alt={selectedBarber.user.name || 'Barber'}
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
                <p className="text-gray-400">Accepted payment methods</p>
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
                      <span className="text-xl font-bold text-white">Zelle</span>
                    </div>
                    {paymentMethod === 'ZELLE' && (
                      <Check className="w-6 h-6 text-purple-400" />
                    )}
                  </div>
                  <div className="space-y-1 text-sm">
                    {selectedBarber.zelleEmail && (
                      <p className="text-gray-300">
                        <span className="text-gray-500">Email:</span>{' '}
                        <span className="font-semibold text-purple-300">{selectedBarber.zelleEmail}</span>
                      </p>
                    )}
                    {selectedBarber.zellePhone && (
                      <p className="text-gray-300">
                        <span className="text-gray-500">Phone:</span>{' '}
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
                      <span className="text-xl font-bold text-white">CashApp</span>
                    </div>
                    {paymentMethod === 'CASHAPP' && (
                      <Check className="w-6 h-6 text-green-400" />
                    )}
                  </div>
                  <p className="text-gray-300 text-sm">
                    <span className="text-gray-500">$Cashtag:</span>{' '}
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
                    <span className="text-xl font-bold text-white">Cash</span>
                  </div>
                  {paymentMethod === 'CASH' && (
                    <Check className="w-6 h-6 text-[#ffd700]" />
                  )}
                </div>
                <p className="text-gray-400 text-sm">Pay in person at the barbershop</p>
              </div>
            </div>

            {/* Payment Reference (optional) */}
            {(paymentMethod === 'ZELLE' || paymentMethod === 'CASHAPP') && (
              <div className="mt-6 pt-6 border-t border-gray-700">
                <Label htmlFor="paymentRef" className="text-white text-lg mb-3 block">
                  Payment reference (optional)
                </Label>
                <Input
                  id="paymentRef"
                  placeholder="e.g., last 4 digits of the transaction"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  className="bg-gray-800 border-gray-700 text-white"
                />
                <p className="text-xs text-gray-500 mt-2">
                  This helps {selectedBarber.user.name} confirm your payment faster
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Summary and Confirm */}
        {paymentMethod && (
          <Card className="bg-gradient-to-r from-[#00f0ff]/10 to-[#ffd700]/10 border-[#00f0ff]">
            <CardContent className="p-6">
              <h3 className="text-2xl font-bold text-white mb-4">Confirm Your Booking</h3>
              <div className="space-y-3 text-gray-300 mb-6">
                <div className="flex items-center gap-3">
                  <Scissors className="w-5 h-5 text-[#00f0ff]" />
                  <span>Service: <strong>{selectedService?.name}</strong></span>
                </div>
                <div className="flex items-center gap-3">
                  <User className="w-5 h-5 text-[#00f0ff]" />
                  <span>Barber: <strong>{selectedBarber?.user.name}</strong></span>
                </div>
                <div className="flex items-center gap-3">
                  <CalendarIcon className="w-5 h-5 text-[#00f0ff]" />
                  <span>
                    Date: <strong>{selectedDate && format(selectedDate, 'MMMM d, yyyy', { locale: enUS })}</strong>
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-[#00f0ff]" />
                  <span>Time: <strong>{selectedTime}</strong></span>
                </div>
                <div className="flex items-center gap-3">
                  <DollarSign className="w-5 h-5 text-[#ffd700]" />
                  <span>
                    Payment method: <strong className="text-[#ffd700]">
                      {paymentMethod === 'ZELLE' ? 'Zelle' : paymentMethod === 'CASHAPP' ? 'CashApp' : 'Cash'}
                    </strong>
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <DollarSign className="w-5 h-5 text-[#ffd700]" />
                  <span>Price: <strong className="text-[#ffd700] text-xl">${selectedService?.price}</strong></span>
                </div>
              </div>

              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-6">
                <p className="text-yellow-200 text-sm flex items-start gap-2">
                  <span className="text-xl">⚠️</span>
                  <span>
                    {paymentMethod === 'CASH' 
                      ? 'Remember to bring cash on the day of your appointment.'
                      : `Make your payment via ${paymentMethod === 'ZELLE' ? 'Zelle' : 'CashApp'} before your appointment. The barber will confirm it.`
                    }
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
                    I accept the 24-hour cancellation policy. Cancellations must be made at least <strong>24 hours</strong> in advance.
                  </span>
                </label>
              </div>

              <Button
                onClick={handleSubmitBooking}
                disabled={loading}
                className="w-full bg-gradient-to-r from-[#00f0ff] to-[#ffd700] text-black font-semibold py-2.5 hover:shadow-[0_0_20px_rgba(0,240,255,0.5)] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  'Processing...'
                ) : (
                  <>
                    <Check className="w-5 h-5 mr-2" />
                    Confirm Booking
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen bg-black pb-24">
      {/* Navbar with JBookMe logo */}
      <DashboardNavbar />
      
      {/* Progress indicator and Back button */}
      <div className="container mx-auto px-4 mt-8 mb-8">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleBack}
          className="text-gray-400 hover:text-[#00f0ff] active:text-[#00f0ff] mb-4"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>

        {/* Progress indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {['gender', 'services', 'barbers', 'barber-profile', 'datetime', 'payment'].map((step, index) => (
            <div
              key={step}
              className={`h-2 rounded-full transition-all duration-300 ${
                currentStep === step
                  ? 'w-12 bg-gradient-to-r from-[#00f0ff] to-[#ffd700]'
                  : index <
                    ['gender', 'services', 'barbers', 'barber-profile', 'datetime', 'payment'].indexOf(currentStep)
                  ? 'w-8 bg-[#00f0ff]'
                  : 'w-8 bg-gray-700'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Main content */}
      <div className="container mx-auto px-4">
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