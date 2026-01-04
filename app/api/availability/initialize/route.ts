import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { prisma } from '@/lib/db';
import { DayOfWeek } from '@prisma/client';

export const dynamic = 'force-dynamic';

/**
 * POST /api/availability/initialize
 * 
 * Initializes or re-initializes a barber's availability schedule
 * Admin-only
 * 
 * Body:
 * - barberId: Barber ID
 * - resetExisting: If true, deletes existing schedules before creating new ones
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { barberId, resetExisting = false } = body;

    if (!barberId) {
      return NextResponse.json({ error: 'barberId is required' }, { status: 400 });
    }

    // Verify barber exists
    const barber = await prisma.barber.findUnique({
      where: { id: barberId },
    });

    if (!barber) {
      return NextResponse.json({ error: 'Barber not found' }, { status: 404 });
    }

    // Check if barber already has availability
    const existingAvailability = await prisma.availability.findMany({
      where: { barberId },
    });

    if (existingAvailability.length > 0 && !resetExisting) {
      return NextResponse.json(
        {
          error: 'This barber already has schedules configured. Use resetExisting=true to re-initialize.',
          existing: existingAvailability,
        },
        { status: 400 }
      );
    }

    // Delete existing availability if resetExisting is true
    if (resetExisting && existingAvailability.length > 0) {
      await prisma.availability.deleteMany({
        where: { barberId },
      });
      console.log(`[AVAILABILITY] Deleted ${existingAvailability.length} existing schedules for barber ${barberId}`);
    }

    // Create default schedule
    const defaultSchedule = [
      { dayOfWeek: DayOfWeek.MONDAY, startTime: '09:00', endTime: '20:00', isAvailable: true },
      { dayOfWeek: DayOfWeek.TUESDAY, startTime: '09:00', endTime: '20:00', isAvailable: true },
      { dayOfWeek: DayOfWeek.WEDNESDAY, startTime: '09:00', endTime: '20:00', isAvailable: true },
      { dayOfWeek: DayOfWeek.THURSDAY, startTime: '09:00', endTime: '20:00', isAvailable: true },
      { dayOfWeek: DayOfWeek.FRIDAY, startTime: '09:00', endTime: '20:00', isAvailable: true },
      { dayOfWeek: DayOfWeek.SATURDAY, startTime: '09:00', endTime: '20:00', isAvailable: true },
      { dayOfWeek: DayOfWeek.SUNDAY, startTime: '09:00', endTime: '20:00', isAvailable: false }, // Closed on Sunday by default
    ];

    const created = await prisma.availability.createMany({
      data: defaultSchedule.map(schedule => ({
        barberId,
        ...schedule,
      })),
    });

    console.log(`[AVAILABILITY] Created ${created.count} availability schedules for barber ${barberId}`);

    // Fetch and return the created schedules
    const newAvailability = await prisma.availability.findMany({
      where: { barberId },
      orderBy: { dayOfWeek: 'asc' },
    });

    return NextResponse.json({
      message: 'Schedules initialized successfully',
      availability: newAvailability,
    }, { status: 201 });
  } catch (error) {
    console.error('[AVAILABILITY] Error initializing schedule:', error);
    return NextResponse.json(
      { error: 'Failed to initialize schedules' },
      { status: 500 }
    );
  }
}
