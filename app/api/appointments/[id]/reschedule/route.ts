import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { prisma } from '@/lib/db';
import { AppointmentStatus } from '@prisma/client';
import { sendAppointmentCreatedNotifications } from '@/lib/notifications';
import { isTwilioConfigured, isTwilioSmsEnabled, sendSMS } from '@/lib/twilio';
import { createNotification } from '@/lib/notifications';
import { sendWebPushToUser } from '@/lib/push';
import { buildAppointmentDateTime, normalizeTimeToHHmm, formatTime12h } from '@/lib/time';

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
    const normalizedTime = normalizeTimeToHHmm(time);
    if (!normalizedTime) {
      return NextResponse.json({ error: 'Invalid time format' }, { status: 400 });
    }

    const conflictingAppointment = await prisma.appointment.findFirst({
      where: {
        barberId: originalAppointment.barberId,
        date: buildAppointmentDateTime(date, normalizedTime),
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

    // Create new appointment with exact datetime
    const appointmentDateTime = buildAppointmentDateTime(date, normalizedTime);
    
    const smsEnabled = isTwilioSmsEnabled();
    const appointmentStatus = smsEnabled ? AppointmentStatus.PENDING : AppointmentStatus.CONFIRMED;

    const newAppointment = await prisma.appointment.create({
      data: {
        clientId: originalAppointment.clientId,
        barberId: originalAppointment.barberId,
        serviceId: originalAppointment.serviceId,
        date: appointmentDateTime,
        time: normalizedTime,
        paymentMethod: originalAppointment.paymentMethod,
        paymentStatus: originalAppointment.paymentStatus,
        notes: originalAppointment.notes,
        status: appointmentStatus,
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

    // Notify barber about the rescheduled appointment status
    try {
      const barberUserId = newAppointment.barber?.userId;
      if (barberUserId) {
        const dateShort = new Date(newAppointment.date).toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
        });
        const timeDisplay = formatTime12h(newAppointment.time);
        const title = appointmentStatus === AppointmentStatus.CONFIRMED
          ? 'Appointment confirmed'
          : 'Appointment pending confirmation';
        const message = `${appointmentStatus === AppointmentStatus.CONFIRMED ? 'Confirmed' : 'Pending'}: ${dateShort} at ${timeDisplay} (${newAppointment.service?.name || 'Service'})`;

        await createNotification({
          userId: barberUserId,
          type: 'APPOINTMENT_REMINDER',
          title,
          message,
          link: '/dashboard/barbero',
        });

        await sendWebPushToUser({
          userId: barberUserId,
          title,
          body: message,
          url: '/dashboard/barbero',
          data: { appointmentId: newAppointment.id },
        });
      }
    } catch (error) {
      console.error('[appointments][reschedule] error notifying barber:', error);
    }

    // Send ONE confirmation SMS to the client (YES/NO) if enabled
    try {
      const clientPhone = newAppointment.client?.phone;
      if (clientPhone && smsEnabled && isTwilioConfigured()) {
        const claimed = await prisma.appointment.updateMany({
          where: { id: newAppointment.id, smsConfirmationSent: false },
          data: { smsConfirmationSent: true },
        });

        if (claimed.count > 0) {
          const dateLong = new Date(newAppointment.date).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          });

          const msg = `JB's Barbershop 💈\nPlease confirm your appointment for ${dateLong} at ${formatTime12h(newAppointment.time)}.\nReply YES to confirm or NO to cancel.`;
          const res = await sendSMS(clientPhone, msg);
          console.log('[SMS][confirm][reschedule]', {
            appointmentId: newAppointment.id,
            to: clientPhone,
            success: res.success,
            sid: (res as any).sid,
          });
        }
      }
    } catch (error) {
      console.error('[appointments][reschedule] error sending confirmation SMS:', error);
    }

    // Send notifications
    try {
      const acceptLanguage = request.headers.get('accept-language') || '';
      const clientLocale = acceptLanguage.toLowerCase().startsWith('es') ? 'es' : 'en';
      const notificationData = {
        clientName: newAppointment.client.name || 'Client',
        clientEmail: newAppointment.client.email || '',
        clientPhone: newAppointment.client.phone || '',
        clientLocale,
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
