'use client';

import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useState } from 'react';
import { generateGoogleCalendarUrl, type AppointmentData } from '@/lib/calendar';

interface AddToCalendarButtonProps {
  appointmentId: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  showText?: boolean;
  appointmentData?: Omit<AppointmentData, 'id'>;
}

export function AddToCalendarButton({
  appointmentId,
  variant = 'outline',
  size = 'sm',
  showText = true,
  appointmentData,
}: AddToCalendarButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  // Open in Google Calendar
  const handleGoogleCalendar = async () => {
    // IMPORTANT: Browsers can block popups if window.open is called after an await.
    // We open a placeholder tab immediately on click, then navigate it after data is ready.
    const popup = window.open('about:blank', '_blank');
    if (!popup) {
      toast.error('Popup blocked. Please allow popups for this site.');
      return;
    }

    // Reduce tabnabbing risk while still allowing us to navigate the tab.
    try {
      popup.opener = null;
    } catch {
      // ignore
    }

    setIsLoading(true);
    try {
      let resolvedAppointment: AppointmentData;

      if (appointmentData) {
        resolvedAppointment = {
          id: appointmentId,
          ...appointmentData,
        };
      } else {
        const response = await fetch(`/api/appointments/${appointmentId}`);
        if (!response.ok) {
          throw new Error('Error fetching appointment data');
        }
        const appointment = await response.json();

        resolvedAppointment = {
          id: appointmentId,
          date: appointment.date,
          time: appointment.time,
          service: {
            name: appointment.service?.name || 'Service',
            duration: appointment.service?.duration || 60,
          },
          barber: {
            name: appointment.barber?.user?.name || appointment.barber?.name || 'Barber',
            email: appointment.barber?.user?.email,
          },
          client: {
            name: appointment.client?.name || appointment.user?.name || 'Client',
            email: appointment.client?.email || appointment.user?.email,
          },
        };
      }

      const url = generateGoogleCalendarUrl(resolvedAppointment);
      popup.location.replace(url);
      toast.success('Opening Google Calendar...');
    } catch (error) {
      console.error('Error opening Google Calendar:', error);
      try {
        popup.close();
      } catch {
        // ignore
      }
      toast.error('Error opening Google Calendar');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      className={showText ? "gap-2" : "h-7 w-7 p-0"}
      disabled={isLoading}
      onClick={handleGoogleCalendar}
    >
      <svg
        className="h-3.5 w-3.5"
        viewBox="0 0 24 24"
        fill="currentColor"
      >
        <path d="M12 0C5.383 0 0 5.383 0 12s5.383 12 12 12 12-5.383 12-12S18.617 0 12 0zm5.959 14.588c-.12 3.517-2.998 6.353-6.515 6.353-3.59 0-6.5-2.91-6.5-6.5s2.91-6.5 6.5-6.5c1.696 0 3.232.638 4.406 1.685l-1.787 1.724c-.49-.47-1.322-1.02-2.619-1.02-2.241 0-4.065 1.857-4.065 4.111s1.824 4.111 4.065 4.111c2.075 0 3.195-1.287 3.502-3.089h-3.502v-2.263h5.834c.057.303.09.616.09.963z" />
      </svg>
      {showText && (
        <span className="hidden sm:inline">Google Calendar</span>
      )}
    </Button>
  );
}
