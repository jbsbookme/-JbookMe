import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { prisma } from '@/lib/db';
import { AppointmentStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get statistics
    const totalAppointments = await prisma.appointment.count();
    const completedAppointments = await prisma.appointment.count({
      where: { status: AppointmentStatus.COMPLETED },
    });
    const pendingAppointments = await prisma.appointment.count({
      where: { status: { in: [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED] } },
    });

    const totalClients = await prisma.user.count({
      where: { role: 'CLIENT' },
    });

    const totalBarbers = await prisma.barber.count({
      where: { isActive: true },
    });

    const totalReviews = await prisma.review.count();

    const pendingPosts = await prisma.post.count({
      where: { status: 'PENDING' },
    });

    const reviews = await prisma.review.findMany({
      select: { rating: true },
    });

    const avgRating = reviews.length > 0
      ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
      : 0;

    const completedAppointmentsWithServices = await prisma.appointment.findMany({
      where: { status: AppointmentStatus.COMPLETED },
      include: { service: true },
    });

    const totalRevenue = completedAppointmentsWithServices.reduce(
      (sum, apt) => sum + (apt.service?.price ?? 0),
      0
    );

    // Calculate monthly revenue (current month)
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthlyCompletedAppointments = await prisma.appointment.findMany({
      where: {
        status: AppointmentStatus.COMPLETED,
        updatedAt: {
          gte: startOfMonth,
        },
      },
      include: { service: true },
    });

    const monthlyRevenue = monthlyCompletedAppointments.reduce(
      (sum, apt) => sum + (apt.service?.price ?? 0),
      0
    );

    // Recent appointments
    const recentAppointments = await prisma.appointment.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        client: { select: { name: true, email: true } },
        barber: { include: { user: { select: { name: true } } } },
        service: true,
      },
    });

    // New clients (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const newClients = await prisma.user.findMany({
      where: {
        role: 'CLIENT',
        createdAt: {
          gte: thirtyDaysAgo,
        },
      },
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: { 
        id: true,
        name: true, 
        email: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      totalAppointments,
      completedAppointments,
      pendingAppointments,
      totalClients,
      totalBarbers,
      totalReviews,
      pendingPosts,
      averageRating: avgRating.toFixed(1),
      totalRevenue: totalRevenue.toFixed(2),
      monthlyRevenue: monthlyRevenue.toFixed(2),
      recentAppointments: recentAppointments || [],
      newClients: newClients || [],
    });
  } catch (error) {
    console.error('Error fetching admin stats:', error);

    // When the database is down/unreachable, Prisma throws a PrismaClientInitializationError.
    // Return 503 so the UI can treat it as a temporary service issue.
    if (
      error &&
      typeof error === 'object' &&
      'name' in error &&
      (error as { name?: unknown }).name === 'PrismaClientInitializationError'
    ) {
      return NextResponse.json(
        {
          error: 'Database unavailable',
          detail: 'Cannot reach database server. Check DATABASE_URL / local Postgres.',
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch statistics' },
      { status: 500 }
    );
  }
}
