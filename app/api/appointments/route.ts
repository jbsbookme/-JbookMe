import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { prisma } from '@/lib/db';
import { AppointmentStatus } from '@prisma/client';
import { sendAppointmentCreatedNotifications } from '@/lib/notifications';
import { isBarberOrStylist } from '@/lib/auth/role-utils';

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
    } else if (isBarberOrStylist(session.user.role) && session.user.barberId) {
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

    // Check for conflicting appointments
    const appointmentDate = new Date(date + 'T00:00:00');
    const existingAppointment = await prisma.appointment.findFirst({
      where: {
        barberId,
        date: appointmentDate,
        time,
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

    const appointment = await prisma.appointment.create({
      data: {
        clientId: session.user.id,
        barberId,
        serviceId,
        date: appointmentDate,
        time,
        paymentMethod: paymentMethod || null,
        paymentReference: paymentReference || null,
        notes: notes || null,
        status: AppointmentStatus.CONFIRMED,
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

    // Send notifications to client, barber, and admin
    try {
      const notificationData = {
        clientName: appointment.client.name || 'Client',
        clientEmail: appointment.client.email || '',
        clientPhone: appointment.client.phone || '',
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
