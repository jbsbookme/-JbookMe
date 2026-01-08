import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { prisma } from '@/lib/db';
import { isBarberOrAdmin } from '@/lib/auth/role-utils';

type DayOfWeek =
  | 'MONDAY'
  | 'TUESDAY'
  | 'WEDNESDAY'
  | 'THURSDAY'
  | 'FRIDAY'
  | 'SATURDAY'
  | 'SUNDAY';

type AvailabilityDayPayload = {
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
};

// GET /api/barber/availability - Get barber's availability schedule
export async function GET(_req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !isBarberOrAdmin(session.user.role)) {
      return NextResponse.json(
        { error: 'Unauthorized. Only barbers can view their availability.' },
        { status: 401 }
      );
    }

    // Find the barber record
    const barber = await prisma.barber.findUnique({
      where: { userId: session.user.id },
      include: {
        availability: {
          orderBy: {
            dayOfWeek: 'asc',
          },
        },
      },
    });

    if (!barber) {
      return NextResponse.json(
        { error: 'Barber profile not found.' },
        { status: 404 }
      );
    }

    // If barber has no availability records, create default schedule
    if (!barber.availability || barber.availability.length === 0) {
      const daysOfWeek: DayOfWeek[] = [
        'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'
      ];
      
      const defaultAvailability = await Promise.all(
        daysOfWeek.map((day) =>
          prisma.availability.create({
            data: {
              barberId: barber.id,
              dayOfWeek: day,
              startTime: '09:00',
              endTime: '18:00',
              isAvailable: day !== 'SUNDAY', // Closed on Sunday by default
            },
          })
        )
      );

      return NextResponse.json({ availability: defaultAvailability });
    }

    return NextResponse.json({ availability: barber.availability });
  } catch (error) {
    console.error('Error fetching availability:', error);
    return NextResponse.json(
      { error: 'Failed to fetch availability.' },
      { status: 500 }
    );
  }
}

// POST /api/barber/availability - Update barber's availability schedule
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !isBarberOrAdmin(session.user.role)) {
      return NextResponse.json(
        { error: 'Unauthorized. Only barbers can update their availability.' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { availability } = body;

    if (!availability || !Array.isArray(availability)) {
      return NextResponse.json(
        { error: 'Invalid availability data.' },
        { status: 400 }
      );
    }

    // Find the barber record
    const barber = await prisma.barber.findUnique({
      where: { userId: session.user.id },
    });

    if (!barber) {
      return NextResponse.json(
        { error: 'Barber profile not found.' },
        { status: 404 }
      );
    }

    // Update availability for each day
    const updatePromises = availability.map(async (day: AvailabilityDayPayload) => {
      return prisma.availability.upsert({
        where: {
          barberId_dayOfWeek: {
            barberId: barber.id,
            dayOfWeek: day.dayOfWeek,
          },
        },
        update: {
          startTime: day.startTime,
          endTime: day.endTime,
          isAvailable: day.isAvailable,
        },
        create: {
          barberId: barber.id,
          dayOfWeek: day.dayOfWeek,
          startTime: day.startTime,
          endTime: day.endTime,
          isAvailable: day.isAvailable,
        },
      });
    });

    await Promise.all(updatePromises);

    // Fetch updated availability
    const updatedAvailability = await prisma.availability.findMany({
      where: { barberId: barber.id },
      orderBy: { dayOfWeek: 'asc' },
    });

    return NextResponse.json({
      message: 'Availability updated successfully.',
      availability: updatedAvailability,
    });
  } catch (error) {
    console.error('Error updating availability:', error);
    return NextResponse.json(
      { error: 'Failed to update availability.' },
      { status: 500 }
    );
  }
}
