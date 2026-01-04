import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { prisma } from '@/lib/db';
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin only' },
        { status: 403 }
      );
    }

    // Get current date ranges
    const now = new Date();
    const currentMonthStart = startOfMonth(now);
    const currentMonthEnd = endOfMonth(now);
    const lastMonthStart = startOfMonth(subMonths(now, 1));
    const lastMonthEnd = endOfMonth(subMonths(now, 1));

    // 1. REVENUE ANALYTICS
    // Get all completed appointments with service prices
    const completedAppointments = await prisma.appointment.findMany({
      where: {
        status: 'COMPLETED',
      },
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

    // Calculate total revenue
    const totalRevenue = completedAppointments.reduce(
      (sum, apt) => sum + (apt.service?.price || 0),
      0
    );

    // Current month revenue
    const currentMonthRevenue = completedAppointments
      .filter((apt) => apt.date >= currentMonthStart && apt.date <= currentMonthEnd)
      .reduce((sum, apt) => sum + (apt.service?.price || 0), 0);

    // Last month revenue
    const lastMonthRevenue = completedAppointments
      .filter((apt) => apt.date >= lastMonthStart && apt.date <= lastMonthEnd)
      .reduce((sum, apt) => sum + (apt.service?.price || 0), 0);

    // Revenue by month for chart (last 6 months)
    const revenueByMonth: { [key: string]: number } = {};
    for (let i = 5; i >= 0; i--) {
      const monthDate = subMonths(now, i);
      const monthKey = format(monthDate, 'MMM yyyy');
      const monthStart = startOfMonth(monthDate);
      const monthEnd = endOfMonth(monthDate);

      const monthRevenue = completedAppointments
        .filter((apt) => apt.date >= monthStart && apt.date <= monthEnd)
        .reduce((sum, apt) => sum + (apt.service?.price || 0), 0);

      revenueByMonth[monthKey] = monthRevenue;
    }

    // 2. APPOINTMENTS ANALYTICS
    const totalAppointments = await prisma.appointment.count();
    const completedCount = await prisma.appointment.count({
      where: { status: 'COMPLETED' },
    });
    const pendingCount = await prisma.appointment.count({
      where: { status: 'PENDING' },
    });
    const cancelledCount = await prisma.appointment.count({
      where: { status: 'CANCELLED' },
    });

    // Current month appointments
    const currentMonthAppointments = await prisma.appointment.count({
      where: {
        date: {
          gte: currentMonthStart,
          lte: currentMonthEnd,
        },
      },
    });

    // 3. TOP SERVICES
    const servicesWithCount = await prisma.service.findMany({
      where: { isActive: true },
      include: {
        _count: {
          select: {
            appointments: {
              where: {
                status: 'COMPLETED',
              },
            },
          },
        },
      },
    });

    const topServices = servicesWithCount
      .map((service) => ({
        id: service.id,
        name: service.name,
        price: service.price,
        bookings: service._count.appointments,
        revenue: service.price * service._count.appointments,
      }))
      .sort((a, b) => b.bookings - a.bookings)
      .slice(0, 5);

    // 4. TOP BARBERS
    const barbersWithStats = await prisma.barber.findMany({
      where: { isActive: true },
      include: {
        user: true,
        _count: {
          select: {
            appointments: {
              where: {
                status: 'COMPLETED',
              },
            },
            reviews: true,
          },
        },
        appointments: {
          where: {
            status: 'COMPLETED',
          },
          include: {
            service: true,
          },
        },
      },
    });

    const topBarbers = barbersWithStats
      .map((barber) => ({
        id: barber.id,
        name: barber.user.name || 'Unknown',
        appointments: barber._count.appointments,
        reviews: barber._count.reviews,
        rating: barber.rating || 0,
        revenue: barber.appointments.reduce(
          (sum, apt) => sum + (apt.service?.price || 0),
          0
        ),
      }))
      .sort((a, b) => b.appointments - a.appointments)
      .slice(0, 5);

    // 5. CLIENT ANALYTICS
    const totalClients = await prisma.user.count({
      where: { role: 'CLIENT' },
    });

    const newClientsThisMonth = await prisma.user.count({
      where: {
        role: 'CLIENT',
        createdAt: {
          gte: currentMonthStart,
          lte: currentMonthEnd,
        },
      },
    });

    // 6. REVIEW ANALYTICS
    const totalReviews = await prisma.review.count();
    const reviews = await prisma.review.findMany();
    const averageRating =
      reviews.length > 0
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
        : 0;

    // 7. PEAK HOURS (most booked times)
    const appointmentsByHour: { [key: string]: number } = {};
    completedAppointments.forEach((apt) => {
      const hour = apt.time.split(':')[0] + ':00';
      appointmentsByHour[hour] = (appointmentsByHour[hour] || 0) + 1;
    });

    const peakHours = Object.entries(appointmentsByHour)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([time, count]) => ({ time, count }));

    // 8. GROWTH METRICS
    const revenueGrowth =
      lastMonthRevenue > 0
        ? ((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100
        : 0;

    return NextResponse.json({
      revenue: {
        total: totalRevenue,
        currentMonth: currentMonthRevenue,
        lastMonth: lastMonthRevenue,
        growth: revenueGrowth,
        byMonth: Object.entries(revenueByMonth).map(([month, amount]) => ({
          month,
          amount,
        })),
      },
      appointments: {
        total: totalAppointments,
        completed: completedCount,
        pending: pendingCount,
        cancelled: cancelledCount,
        currentMonth: currentMonthAppointments,
      },
      services: {
        top: topServices,
      },
      barbers: {
        top: topBarbers,
      },
      clients: {
        total: totalClients,
        newThisMonth: newClientsThisMonth,
      },
      reviews: {
        total: totalReviews,
        averageRating: Math.round(averageRating * 10) / 10,
      },
      peakHours,
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics data' },
      { status: 500 }
    );
  }
}
