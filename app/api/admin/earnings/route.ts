import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { prisma } from '@/lib/db';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import type { Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';

type BarberEarnings = {
  barberId: string;
  barberName: string;
  barberEmail: string;
  totalEarnings: number;
  totalClients: number;
  byPaymentMethod: Record<string, { count: number; total: number }>;
};

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'week';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const barberId = searchParams.get('barberId'); // Optional filter by barber

    // Calculate date range
    let dateFilter: { gte: Date; lte: Date };
    const now = new Date();

    if (period === 'week') {
      dateFilter = {
        gte: startOfWeek(now, { weekStartsOn: 1 }),
        lte: endOfWeek(now, { weekStartsOn: 1 }),
      };
    } else if (period === 'month') {
      dateFilter = {
        gte: startOfMonth(now),
        lte: endOfMonth(now),
      };
    } else if (period === 'custom' && startDate && endDate) {
      dateFilter = {
        gte: parseISO(startDate),
        lte: parseISO(endDate),
      };
    } else {
      dateFilter = {
        gte: startOfWeek(now, { weekStartsOn: 1 }),
        lte: endOfWeek(now, { weekStartsOn: 1 }),
      };
    }

    // Build where clause
    const whereClause: Prisma.AppointmentWhereInput = {
      status: 'COMPLETED',
      paymentStatus: 'PAID',
      date: dateFilter,
    };

    if (barberId) {
      whereClause.barberId = barberId;
    }

    // Get all completed paid appointments
    const appointments = await prisma.appointment.findMany({
      where: whereClause,
      include: {
        barber: {
          include: {
            user: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
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
      orderBy: {
        date: 'desc',
      },
    });

    // Calculate global totals
    const totalEarnings = appointments.reduce((sum, apt) => sum + apt.service.price, 0);
    const totalClients = appointments.length;

    // Group by barber
    const earningsByBarber = appointments.reduce((acc, apt) => {
      const barberId = apt.barberId;
      const barberName = apt.barber.user.name || apt.barber.user.email;

      if (!acc[barberId]) {
        acc[barberId] = {
          barberId,
          barberName,
          barberEmail: apt.barber.user.email,
          totalEarnings: 0,
          totalClients: 0,
          byPaymentMethod: {} as Record<string, { count: number; total: number }>,
        };
      }

      acc[barberId].totalEarnings += apt.service.price;
      acc[barberId].totalClients += 1;

      const method = apt.paymentMethod || 'CASH';
      if (!acc[barberId].byPaymentMethod[method]) {
        acc[barberId].byPaymentMethod[method] = { count: 0, total: 0 };
      }
      acc[barberId].byPaymentMethod[method].count += 1;
      acc[barberId].byPaymentMethod[method].total += apt.service.price;

      return acc;
    }, {} as Record<string, BarberEarnings>);

    // Convert to array
    const barbersList = Object.values(earningsByBarber);

    // Recent transactions
    const recentTransactions = appointments.slice(0, 20).map((apt) => ({
      id: apt.id,
      barberName: apt.barber.user.name || apt.barber.user.email,
      clientName: apt.client.name || apt.client.email,
      serviceName: apt.service.name,
      amount: apt.service.price,
      paymentMethod: apt.paymentMethod,
      date: apt.date,
      time: apt.time,
    }));

    return NextResponse.json({
      period,
      dateRange: {
        start: dateFilter.gte,
        end: dateFilter.lte,
      },
      summary: {
        totalEarnings,
        totalClients,
        totalBarbers: barbersList.length,
      },
      barbers: barbersList,
      recentTransactions,
    });
  } catch (error) {
    console.error('Error fetching admin earnings:', error);
    return NextResponse.json(
      { error: 'Error al obtener ganancias' },
      { status: 500 }
    );
  }
}
