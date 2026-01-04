import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { prisma } from '@/lib/db';
import { isBarberOrStylist } from '@/lib/auth/role-utils';
import { AppointmentStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const barberId = searchParams.get('barberId');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const appointmentWhere: any = {};

    // Filter by barber if specified or if user is a barber
    if (barberId) {
      appointmentWhere.barberId = barberId;
    } else if (isBarberOrStylist(session.user.role) && session.user.barberId) {
      appointmentWhere.barberId = session.user.barberId;
    }

    // Total appointments
    const totalAppointments = await prisma.appointment.count({
      where: appointmentWhere,
    });

    // Completed appointments
    const completedAppointments = await prisma.appointment.count({
      where: {
        ...appointmentWhere,
        status: AppointmentStatus.COMPLETED,
      },
    });

    // Pending appointments
    const pendingAppointments = await prisma.appointment.count({
      where: {
        ...appointmentWhere,
        status: {
          in: [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED],
        },
      },
    });

    // Total revenue (from services)
    const appointments = await prisma.appointment.findMany({
      where: {
        ...appointmentWhere,
        status: AppointmentStatus.COMPLETED,
      },
      include: {
        service: true,
      },
    });

    const totalRevenue = appointments.reduce(
      (sum, appointment) => sum + (appointment.service?.price ?? 0),
      0
    );

    // Average rating
    let avgRating = 0;
    let totalReviews = 0;

    if (barberId || (isBarberOrStylist(session.user.role) && session.user.barberId)) {
      const barberIdToUse = barberId || session.user.barberId!;
      const reviews = await prisma.review.findMany({
        where: { barberId: barberIdToUse },
        select: { rating: true },
      });

      totalReviews = reviews.length;
      if (totalReviews > 0) {
        const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
        avgRating = totalRating / totalReviews;
      }
    } else {
      // Admin: all reviews
      const reviews = await prisma.review.findMany({
        select: { rating: true },
      });

      totalReviews = reviews.length;
      if (totalReviews > 0) {
        const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
        avgRating = totalRating / totalReviews;
      }
    }

    // Total clients (unique)
    const uniqueClients = await prisma.appointment.findMany({
      where: appointmentWhere,
      select: { clientId: true },
      distinct: ['clientId'],
    });

    const stats = {
      totalAppointments,
      completedAppointments,
      pendingAppointments,
      totalRevenue: Number(totalRevenue.toFixed(2)),
      avgRating: Number(avgRating.toFixed(1)),
      totalReviews,
      totalClients: uniqueClients.length,
    };

    return NextResponse.json({ stats });
  } catch (error) {
    console.error('Error fetching stats:', error);
    return NextResponse.json({ error: 'Error al obtener estadísticas' }, { status: 500 });
  }
}
