import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { prisma } from '@/lib/db';
import { isBarberOrStylist } from '@/lib/auth/role-utils';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || !isBarberOrStylist(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const appointmentId = params.id;

    // Verify appointment exists and belongs to this barber
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        barber: {
          select: {
            userId: true,
          },
        },
      },
    });

    if (!appointment) {
      return NextResponse.json(
        { error: 'Appointment not found' },
        { status: 404 }
      );
    }

    // Verify this barber owns the appointment
    if (appointment.barber.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'You do not have permission to modify this appointment' },
        { status: 403 }
      );
    }

    // Verify appointment is completed
    if (appointment.status !== 'COMPLETED') {
      return NextResponse.json(
        { error: 'Only completed appointments can be marked as paid' },
        { status: 400 }
      );
    }

    // Update payment status
    const updated = await prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        paymentStatus: 'PAID',
        updatedAt: new Date(),
      },
      include: {
        client: {
          select: {
            name: true,
            email: true,
          },
        },
        service: {
          select: {
            name: true,
            price: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Payment recorded successfully',
      appointment: updated,
    });
  } catch (error) {
    console.error('Error marking appointment as paid:', error);
    return NextResponse.json(
      { error: 'Failed to record payment' },
      { status: 500 }
    );
  }
}
