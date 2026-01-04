import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { prisma } from '@/lib/db';
import { AppointmentStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

type Params = {
  params: Promise<{ id: string }>;
};

// POST mark appointment as NO_SHOW
export async function POST(request: NextRequest, context: Params) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;

    // Get appointment
    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: {
        barber: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!appointment) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
    }

    // Only barber or admin can mark as NO_SHOW
    const isBarber = appointment.barber.userId === session.user.id;
    const isAdmin = session.user.role === 'ADMIN';

    if (!isBarber && !isAdmin) {
      return NextResponse.json(
        { error: 'Only the barber or an admin can mark this as no-show' },
        { status: 403 }
      );
    }

    // Update appointment status
    const updatedAppointment = await prisma.appointment.update({
      where: { id },
      data: {
        status: AppointmentStatus.NO_SHOW,
      },
      include: {
        client: true,
        service: true,
        barber: {
          include: {
            user: true,
          },
        },
      },
    });

    return NextResponse.json({
      message: 'Appointment marked as no-show',
      appointment: updatedAppointment,
    });
  } catch (error) {
    console.error('Error marking appointment as NO_SHOW:', error);
    return NextResponse.json(
      { error: 'Failed to mark appointment as no-show' },
      { status: 500 }
    );
  }
}
