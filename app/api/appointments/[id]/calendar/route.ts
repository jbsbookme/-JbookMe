import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { prisma } from '@/lib/db';
import { generateAppointmentICS } from '@/lib/calendar';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const appointmentId = params.id;

    // Fetch appointment with all related data
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
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

    if (!appointment) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
    }

    // Verify user has access to this appointment
    const isClient = appointment.clientId === session.user.id;
    const isBarber = appointment.barber?.userId === session.user.id;
    const isAdmin = session.user.role === 'ADMIN';

    if (!isClient && !isBarber && !isAdmin) {
      return NextResponse.json({ error: 'You do not have access to this appointment' }, { status: 403 });
    }

    // Generate ICS content
    const icsContent = generateAppointmentICS({
      id: appointment.id,
      date: appointment.date.toISOString(),
      time: appointment.time,
      service: {
        name: appointment.service?.name || 'Service',
        duration: appointment.service?.duration || 60,
      },
      barber: {
        name: appointment.barber?.user?.name || 'Barber',
        email: appointment.barber?.user?.email,
      },
      client: {
        name: appointment.client?.name || 'Client',
        email: appointment.client?.email,
      },
      location: 'JBookMe Barbershop',
    });

    // Return as downloadable file
    return new NextResponse(icsContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `attachment; filename="bookme-appointment-${appointment.id}.ics"`,
      },
    });
  } catch (error) {
    console.error('Error generating calendar file:', error);
    return NextResponse.json(
      { error: 'Failed to generate calendar file' },
      { status: 500 }
    );
  }
}
