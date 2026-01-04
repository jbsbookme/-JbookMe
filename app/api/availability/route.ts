import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { format, parse, addMinutes, isBefore, isAfter, isEqual } from 'date-fns';
import { DayOfWeek } from '@prisma/client';

export const dynamic = 'force-dynamic';

const BUFFER_MINUTES = 5; // Buffer time between appointments
const SLOT_INTERVAL = 15; // Generate slots every 15 minutes for precision

/**
 * GET /api/availability - Get available time slots for a barber on a specific date
 * 
 * Query Parameters:
 * - barberId: Barber ID
 * - date: Date in yyyy-MM-dd format
 * - serviceDuration: Service duration in minutes (REQUIRED)
 * 
 * This endpoint considers:
 * 1. Barber working hours
 * 2. Already-booked appointments
 * 3. Selected service duration
 * 4. A 5-minute buffer between appointments
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const barberId = searchParams.get('barberId');
    const date = searchParams.get('date');
    const serviceDurationParam = searchParams.get('serviceDuration');
    const serviceId = searchParams.get('serviceId');

    console.log('[AVAILABILITY] Request received:', { barberId, date, serviceDuration: serviceDurationParam, serviceId });

    if (!barberId || !date) {
      return NextResponse.json(
        { error: 'barberId and date are required' },
        { status: 400 }
      );
    }

    // Buffer time between appointments (fixed)
    const bufferMinutes = BUFFER_MINUTES;

    // Validate service duration
    const serviceDuration = serviceDurationParam ? parseInt(serviceDurationParam) : 30;
    if (isNaN(serviceDuration) || serviceDuration <= 0) {
      return NextResponse.json(
        { error: 'serviceDuration must be a positive number' },
        { status: 400 }
      );
    }

    // Parse the date and get day of week
    const selectedDate = parse(date, 'yyyy-MM-dd', new Date());
    const dayOfWeekNum = selectedDate.getDay();
    
    // Convert JavaScript day (0=Sunday) to DayOfWeek enum
    const dayMapping: Record<number, DayOfWeek> = {
      0: DayOfWeek.SUNDAY,
      1: DayOfWeek.MONDAY,
      2: DayOfWeek.TUESDAY,
      3: DayOfWeek.WEDNESDAY,
      4: DayOfWeek.THURSDAY,
      5: DayOfWeek.FRIDAY,
      6: DayOfWeek.SATURDAY,
    };
    
    const dayOfWeek = dayMapping[dayOfWeekNum];

    // Get barber's availability for this day of week
    const availability = await prisma.availability.findFirst({
      where: {
        barberId: barberId,
        dayOfWeek: dayOfWeek,
        isAvailable: true,
      },
    });

    if (!availability) {
      console.log('[AVAILABILITY] No availability found for this barber on this day');
      return NextResponse.json({ 
        availableTimes: [],
        message: 'This barber does not work on this day of the week' 
      });
    }

    // Check if this date is marked as a day off
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const dayOff = await prisma.dayOff.findFirst({
      where: {
        barberId: barberId,
        date: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    });

    if (dayOff) {
      console.log('[AVAILABILITY] This date is marked as day off');
      return NextResponse.json({ 
        availableTimes: [], 
        message: 'Day off' 
      });
    }

    // Get existing appointments for this barber on this date
    const existingAppointments = await prisma.appointment.findMany({
      where: {
        barberId: barberId,
        date: {
          gte: startOfDay,
          lte: endOfDay,
        },
        status: {
          in: ['PENDING', 'CONFIRMED'],
        },
      },
      include: {
        service: true,
      },
    });

    console.log(`[AVAILABILITY] Found ${existingAppointments.length} existing appointments`);

    // Parse availability times
    const workStartTime = parse(availability.startTime, 'HH:mm', new Date());
    const workEndTime = parse(availability.endTime, 'HH:mm', new Date());

    // Generate all possible time slots (every 15 minutes for precision)
    const allSlots: Date[] = [];
    let currentSlot = workStartTime;
    
    while (isBefore(currentSlot, workEndTime)) {
      allSlots.push(currentSlot);
      currentSlot = addMinutes(currentSlot, SLOT_INTERVAL);
    }

    console.log(`[AVAILABILITY] Generated ${allSlots.length} time slots`);

    // Create blocked time ranges from existing appointments
    const blockedRanges: { start: Date; end: Date }[] = existingAppointments.map(apt => {
      let aptTime: Date;
      
      try {
        // Try parsing as 12-hour format first (new appointments)
        aptTime = parse(apt.time, 'h:mm a', new Date());
      } catch {
        try {
          // Try parsing as 24-hour format (old appointments)
          aptTime = parse(apt.time, 'HH:mm', new Date());
        } catch {
          console.error(`[AVAILABILITY] Could not parse appointment time: ${apt.time}`);
          // Default to start of day if parsing fails
          aptTime = workStartTime;
        }
      }

      const aptDuration = apt.service?.duration || 30; // Default to 30 minutes if service not found
      const aptEnd = addMinutes(aptTime, aptDuration + bufferMinutes); // Add buffer from service

      return {
        start: aptTime,
        end: aptEnd,
      };
    });

    console.log(`[AVAILABILITY] Created ${blockedRanges.length} blocked ranges with ${bufferMinutes}min buffer`);

    // Filter available slots
    // A slot is available if:
    // 1. The service can fit completely within working hours (including buffer)
    // 2. The service time doesn't overlap with any existing appointment (including buffer)
    const availableSlots = allSlots.filter(slot => {
      const serviceEnd = addMinutes(slot, serviceDuration + bufferMinutes);

      // Check if service fits within working hours
      if (isAfter(serviceEnd, workEndTime)) {
        return false;
      }

      // Check if service overlaps with any blocked range
      const hasOverlap = blockedRanges.some(blocked => {
        // Overlap occurs if:
        // - Service starts before blocked range ends AND
        // - Service ends after blocked range starts
        const startsBeforeBlockedEnds = isBefore(slot, blocked.end) || isEqual(slot, blocked.end);
        const endsAfterBlockedStarts = isAfter(serviceEnd, blocked.start) || isEqual(serviceEnd, blocked.start);
        
        return startsBeforeBlockedEnds && endsAfterBlockedStarts;
      });

      return !hasOverlap;
    });

    // Convert to 12-hour format strings
    const availableTimes = availableSlots.map(slot => format(slot, 'h:mm a'));

    console.log(`[AVAILABILITY] ${availableTimes.length} slots available for ${serviceDuration}min service with ${bufferMinutes}min buffer`);

    return NextResponse.json({ 
      availableTimes,
      serviceDuration,
      bufferMinutes: bufferMinutes,
    });
  } catch (error) {
    console.error('[AVAILABILITY] Error fetching available times:', error);
    return NextResponse.json(
      { error: 'Failed to fetch available times' },
      { status: 500 }
    );
  }
}
