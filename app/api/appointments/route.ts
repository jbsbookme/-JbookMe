import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { prisma } from '@/lib/db';
import { AppointmentStatus } from '@prisma/client';
import { sendAppointmentCreatedNotifications } from '@/lib/notifications';
import { isBarberOrAdmin } from '@/lib/auth/role-utils';
import { isTwilioConfigured, isTwilioSmsEnabled, sendSMS } from '@/lib/twilio';
import { createNotification } from '@/lib/notifications';
import { sendWebPushToUser } from '@/lib/push';
import { buildAppointmentDateTime, normalizeTimeToHHmm, formatTime12h } from '@/lib/time';

export const dynamic = 'force-dynamic';

// GET appointments (filtered by user role)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const barberId = searchParams.get('barberId');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};

    // Filter based on user role
    if (session.user.role === 'CLIENT') {
      where.clientId = session.user.id;
    } else if (isBarberOrAdmin(session.user.role) && session.user.barberId) {
      where.barberId = session.user.barberId;
    }
    // ADMIN sees all

    // Handle special "upcoming" status
    if (status === 'upcoming') {
      where.status = { in: ['PENDING', 'CONFIRMED'] };
      where.date = { gte: new Date() };
    } else if (status) {
      where.status = status as AppointmentStatus;
    }

    if (barberId) {
      where.barberId = barberId;
    }

    // Get limit from query params if provided
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam, 10) : undefined;

    const appointments = await prisma.appointment.findMany({
      where,
      ...(limit && { take: limit }),
      select: {
        id: true,
        barberId: true,
        serviceId: true,
        clientId: true,
        date: true,
        time: true,
        status: true,
        paymentMethod: true,
        paymentStatus: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
        client: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            image: true,
          },
        },
        barber: {
          select: {
            id: true,
            profileImage: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
              },
            },
          },
        },
        service: true,
        review: true,
      },
      orderBy: {
        date: 'desc',
      },
    });

    return NextResponse.json({ appointments });
  } catch (error) {
    console.error('Error fetching appointments:', error);
    return NextResponse.json({ error: 'Failed to fetch appointments' }, { status: 500 });
  }
}

// POST create a new appointment
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { barberId, serviceId, date, time, paymentMethod, paymentReference, notes } = body;

    if (!barberId || !serviceId || !date || !time) {
      return NextResponse.json(
        { error: 'Barber, service, date, and time are required' },
        { status: 400 }
      );
    }

    const normalizedTime = normalizeTimeToHHmm(time);
    if (!normalizedTime) {
      return NextResponse.json({ error: 'Invalid time format' }, { status: 400 });
    }

    // Build exact appointment start datetime
    const appointmentDateTime = buildAppointmentDateTime(date, normalizedTime);

    // Check for conflicting appointments (exact datetime)
    const existingAppointment = await prisma.appointment.findFirst({
      where: {
        barberId,
        date: appointmentDateTime,
        status: {
          in: [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED],
        },
      },
    });

    if (existingAppointment) {
      return NextResponse.json(
        { error: 'This time slot is already booked' },
        { status: 409 }
      );
    }

    const smsEnabled = isTwilioSmsEnabled();
    const appointmentStatus = smsEnabled ? AppointmentStatus.PENDING : AppointmentStatus.CONFIRMED;

    const appointment = await prisma.appointment.create({
      data: {
        clientId: session.user.id,
        barberId,
        serviceId,
        date: appointmentDateTime,
        time: normalizedTime,
        paymentMethod: paymentMethod || null,
        paymentReference: paymentReference || null,
        notes: notes || null,
        status: appointmentStatus,
      },
      include: {
        client: true,
        barber: {
          select: {
            id: true,
            profileImage: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
              },
            },
          },
        },
        service: true,
      },
    });

    // Notify barber about the appointment status
    try {
      const barberUserId = appointment.barber?.user?.id;
      if (barberUserId) {
        const dateShort = new Date(appointment.date).toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
        });
        const timeDisplay = formatTime12h(appointment.time);
        const title = appointmentStatus === AppointmentStatus.CONFIRMED
          ? 'Appointment confirmed'
          : 'Appointment pending confirmation';
        const body = `${appointmentStatus === AppointmentStatus.CONFIRMED ? 'Confirmed' : 'Pending'}: ${dateShort} at ${timeDisplay} (${appointment.service?.name || 'Service'})`;

        await createNotification({
          userId: barberUserId,
          type: 'APPOINTMENT_REMINDER',
          title,
          message: body,
          link: '/dashboard/barbero',
        });

        await sendWebPushToUser({
          userId: barberUserId,
          title,
          body,
          url: '/dashboard/barbero',
          data: { appointmentId: appointment.id },
        });
      }
    } catch (error) {
      console.error('[appointments] error notifying barber:', error);
    }

    // Send ONE confirmation SMS to the client (YES/NO) if enabled.
    try {
      const clientPhone = appointment.client?.phone;
      if (clientPhone && smsEnabled && isTwilioConfigured()) {
        const claimed = await prisma.appointment.updateMany({
          where: { id: appointment.id, smsConfirmationSent: false },
          data: { smsConfirmationSent: true },
        });

        if (claimed.count > 0) {
          const dateLong = new Date(appointment.date).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          });

          const msg = `JB's Barbershop 💈\nPlease confirm your appointment for ${dateLong} at ${formatTime12h(appointment.time)}.\nReply YES to confirm or NO to cancel.`;
          const res = await sendSMS(clientPhone, msg);
          console.log('[SMS][confirm][create]', {
            appointmentId: appointment.id,
            to: clientPhone,
            success: res.success,
            sid: (res as any).sid,
          });
        }
      }
    } catch (error) {
      console.error('[appointments] error sending confirmation SMS:', error);
    }

    // Send notifications to client and barber
    try {
      const acceptLanguage = request.headers.get('accept-language') || '';
      const clientLocale = acceptLanguage.toLowerCase().startsWith('es') ? 'es' : 'en';
      const notificationData = {
        clientName: appointment.client.name || 'Client',
        clientEmail: appointment.client.email || '',
        clientPhone: appointment.client.phone || '',
        clientLocale,
        barberName: appointment.barber.user.name || 'Barber',
        barberEmail: appointment.barber.user.email || '',
        barberPhone: '', // Add barber phone if available in your schema
        serviceName: appointment.service.name,
        date: appointment.date,
        time: appointment.time,
        price: appointment.service.price,
        appointmentId: appointment.id,
      };

      const notificationResults = await sendAppointmentCreatedNotifications(notificationData);
      console.log('Notification results:', notificationResults);
    } catch (notificationError) {
      // Log notification errors but don't fail the appointment creation
      console.error('Error sending notifications:', notificationError);
    }

    return NextResponse.json({ appointment }, { status: 201 });
  } catch (error) {
    console.error('Error creating appointment:', error);
    return NextResponse.json({ error: 'Error creating appointment' }, { status: 500 });
  }
}
