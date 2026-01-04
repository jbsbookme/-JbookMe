import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { prisma } from '@/lib/db';
import { isBarberOrStylist } from '@/lib/auth/role-utils';

// GET /api/barber/days-off - Get barber's days off
export async function GET(_req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !isBarberOrStylist(session.user.role)) {
      return NextResponse.json(
        { error: 'Unauthorized. Only barbers can view their days off.' },
        { status: 401 }
      );
    }

    // Find the barber record
    const barber = await prisma.barber.findUnique({
      where: { userId: session.user.id },
      include: {
        daysOff: {
          where: {
            date: {
              gte: new Date(), // Only future days off
            },
          },
          orderBy: {
            date: 'asc',
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

    return NextResponse.json(barber.daysOff);
  } catch (error) {
    console.error('Error fetching days off:', error);
    return NextResponse.json(
      { error: 'Failed to fetch days off.' },
      { status: 500 }
    );
  }
}

// POST /api/barber/days-off - Create a new day off
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !isBarberOrStylist(session.user.role)) {
      return NextResponse.json(
        { error: 'Unauthorized. Only barbers can add days off.' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { date, reason } = body;

    if (!date) {
      return NextResponse.json(
        { error: 'Date is required.' },
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

    // Check if day off already exists
    const existingDayOff = await prisma.dayOff.findUnique({
      where: {
        barberId_date: {
          barberId: barber.id,
          date: new Date(date),
        },
      },
    });

    if (existingDayOff) {
      return NextResponse.json(
        { error: 'A day off is already registered for this date.' },
        { status: 409 }
      );
    }

    // Create day off
    const dayOff = await prisma.dayOff.create({
      data: {
        barberId: barber.id,
        date: new Date(date),
        reason: reason || null,
      },
    });

    return NextResponse.json(
      {
        message: 'Day off added successfully.',
        dayOff,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating day off:', error);
    return NextResponse.json(
      { error: 'Failed to add day off.' },
      { status: 500 }
    );
  }
}

// DELETE /api/barber/days-off?id=xxx - Delete a day off
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !isBarberOrStylist(session.user.role)) {
      return NextResponse.json(
        { error: 'Unauthorized. Only barbers can delete days off.' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const dayOffId = searchParams.get('id');

    if (!dayOffId) {
      return NextResponse.json(
        { error: 'Day off ID is required.' },
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

    // Verify the day off belongs to this barber
    const dayOff = await prisma.dayOff.findUnique({
      where: { id: dayOffId },
    });

    if (!dayOff) {
      return NextResponse.json(
        { error: 'Day off not found.' },
        { status: 404 }
      );
    }

    if (dayOff.barberId !== barber.id) {
      return NextResponse.json(
        { error: 'You do not have permission to delete this day off.' },
        { status: 403 }
      );
    }

    // Delete the day off
    await prisma.dayOff.delete({
      where: { id: dayOffId },
    });

    return NextResponse.json({
      message: 'Day off deleted successfully.',
    });
  } catch (error) {
    console.error('Error deleting day off:', error);
    return NextResponse.json(
      { error: 'Failed to delete day off.' },
      { status: 500 }
    );
  }
}
