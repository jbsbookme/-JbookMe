import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { prisma } from '@/lib/db';
import { AppointmentStatus } from '@prisma/client';
import { sendAppointmentCreatedNotifications } from '@/lib/notifications';

export const dynamic = 'force-dynamic';

type Params = {
  params: Promise<{ id: string }>;
};

// POST reschedule appointment
export async function POST(request: NextRequest, context: Params) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;
    const body = await request.json();
    const { date, time } = body;

    if (!date || !time) {
      return NextResponse.json(
        { error: 'Date and time are required' },
        { status: 400 }
      );
    }

    // Get original appointment
    const originalAppointment = await prisma.appointment.findUnique({
      where: { id },
      include: {
        service: true,
        barber: {
          include: {
            user: true,
          },
        },
        client: true,
      },
    });

    if (!originalAppointment) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
    }

    // Verify user has permission to reschedule
    const isClient = originalAppointment.clientId === session.user.id;
    const isBarber = originalAppointment.barber.userId === session.user.id;
    const isAdmin = session.user.role === 'ADMIN';

    if (!isClient && !isBarber && !isAdmin) {
      return NextResponse.json(
        { error: 'You do not have permission to reschedule this appointment' },
        { status: 403 }
      );
    }

    // Check if new time slot is available
    const conflictingAppointment = await prisma.appointment.findFirst({
      where: {
        barberId: originalAppointment.barberId,
        date: new Date(date),
        time,
        id: { not: id }, // Exclude current appointment
        status: {
          in: [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED],
        },
      },
    });

    if (conflictingAppointment) {
      return NextResponse.json(
        { error: 'This time slot is already booked' },
        { status: 409 }
      );
    }

    // Cancel original appointment and create new one
    // We keep the original for history and link them
    await prisma.appointment.update({
      where: { id },
      data: {
        status: AppointmentStatus.CANCELLED,
        cancelledAt: new Date(),
        cancellationReason: 'Rescheduled by user',
      },
    });

    // Create new appointment - parse date correctly to avoid timezone issues
    const appointmentDate = new Date(date + 'T00:00:00');
    
    const newAppointment = await prisma.appointment.create({
      data: {
        clientId: originalAppointment.clientId,
        barberId: originalAppointment.barberId,
        serviceId: originalAppointment.serviceId,
        date: appointmentDate,
        time,
        paymentMethod: originalAppointment.paymentMethod,
        paymentStatus: originalAppointment.paymentStatus,
        notes: originalAppointment.notes,
        status: AppointmentStatus.CONFIRMED,
      },
      include: {
        client: true,
        barber: {
          include: {
            user: true,
          },
        },
        service: true,
      },
    });

    // Send notifications
    try {
      const notificationData = {
        clientName: newAppointment.client.name || 'Client',
        clientEmail: newAppointment.client.email || '',
        clientPhone: newAppointment.client.phone || '',
        barberName: newAppointment.barber.user.name || 'Barber',
        barberEmail: newAppointment.barber.user.email || '',
        barberPhone: '',
        serviceName: newAppointment.service.name,
        date: newAppointment.date,
        time: newAppointment.time,
        price: newAppointment.service.price,
        appointmentId: newAppointment.id,
      };

      await sendAppointmentCreatedNotifications(notificationData);
    } catch (notificationError) {
      console.error('Error sending rescheduled appointment notifications:', notificationError);
    }

    return NextResponse.json({
      message: 'Appointment rescheduled successfully',
      appointment: newAppointment,
      originalAppointmentId: id,
    });
  } catch (error) {
    console.error('Error rescheduling appointment:', error);
    return NextResponse.json(
      { error: 'Failed to reschedule appointment' },
      { status: 500 }
    );
  }
}
