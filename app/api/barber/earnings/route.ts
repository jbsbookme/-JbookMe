import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { prisma } from '@/lib/db';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { isBarberOrStylist } from '@/lib/auth/role-utils';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || !isBarberOrStylist(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get barber record
    const barber = await prisma.barber.findUnique({
      where: { userId: session.user.id },
    });

    if (!barber) {
      return NextResponse.json({ error: 'Barber not found' }, { status: 404 });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'week'; // week, month, custom
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Calculate date range
    let dateFilter: { gte: Date; lte: Date };
    const now = new Date();

    if (period === 'week') {
      dateFilter = {
        gte: startOfWeek(now, { weekStartsOn: 1 }), // Monday
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
      // Default to current week
      dateFilter = {
        gte: startOfWeek(now, { weekStartsOn: 1 }),
        lte: endOfWeek(now, { weekStartsOn: 1 }),
      };
    }

    // Get completed appointments with payment info
    const appointments = await prisma.appointment.findMany({
      where: {
        barberId: barber.id,
        status: 'COMPLETED',
        paymentStatus: 'PAID',
        date: dateFilter,
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
      orderBy: {
        date: 'desc',
      },
    });

    // Get manual payments in the same period
    const manualPayments = await prisma.manualPayment.findMany({
      where: {
        barberId: barber.id,
        date: dateFilter,
      },
      orderBy: {
        date: 'desc',
      },
    });

    // Calculate statistics combining both sources
    const appointmentEarnings = appointments.reduce((sum, apt) => sum + apt.service.price, 0);
    const manualEarnings = manualPayments.reduce((sum, payment) => sum + payment.amount, 0);
    const totalEarnings = appointmentEarnings + manualEarnings;
    
    const totalClients = appointments.length + manualPayments.length;
    const averagePerClient = totalClients > 0 ? totalEarnings / totalClients : 0;

    // Breakdown by payment method (combining appointments and manual payments)
    const byPaymentMethod = appointments.reduce((acc, apt) => {
      const method = apt.paymentMethod || 'CASH';
      if (!acc[method]) {
        acc[method] = { count: 0, total: 0 };
      }
      acc[method].count += 1;
      acc[method].total += apt.service.price;
      return acc;
    }, {} as Record<string, { count: number; total: number }>);

    // Add manual payments to breakdown
    manualPayments.forEach((payment) => {
      const method = payment.paymentMethod;
      if (!byPaymentMethod[method]) {
        byPaymentMethod[method] = { count: 0, total: 0 };
      }
      byPaymentMethod[method].count += 1;
      byPaymentMethod[method].total += payment.amount;
    });

    // Recent payments list (combining both sources)
    const appointmentPayments = appointments.map((apt) => ({
      id: apt.id,
      type: 'appointment' as const,
      clientName: apt.client.name || apt.client.email,
      serviceName: apt.service.name,
      amount: apt.service.price,
      paymentMethod: apt.paymentMethod,
      date: apt.date,
      time: apt.time,
    }));

    const manualPaymentsList = manualPayments.map((payment) => ({
      id: payment.id,
      type: 'manual' as const,
      clientName: payment.clientName || 'Unregistered client',
      serviceName: payment.description || 'Manual payment',
      amount: payment.amount,
      paymentMethod: payment.paymentMethod,
      date: payment.date,
      time: '', // Manual payments don't have time
    }));

    // Combine and sort by date
    const allPayments = [...appointmentPayments, ...manualPaymentsList]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10);

    const recentPayments = allPayments;

    return NextResponse.json({
      period,
      dateRange: {
        start: dateFilter.gte,
        end: dateFilter.lte,
      },
      summary: {
        totalEarnings,
        totalClients,
        averagePerClient,
      },
      byPaymentMethod,
      recentPayments,
    });
  } catch (error) {
    console.error('Error fetching barber earnings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch earnings' },
      { status: 500 }
    );
  }
}
