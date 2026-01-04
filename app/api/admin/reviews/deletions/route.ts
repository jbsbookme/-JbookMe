import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get('limit');
    const limit = Math.min(Math.max(parseInt(limitParam || '50', 10) || 50, 1), 200);

    const logs = await prisma.reviewDeletionLog.findMany({
      orderBy: { deletedAt: 'desc' },
      take: limit,
      select: {
        id: true,
        reviewId: true,
        appointmentId: true,
        barberId: true,
        clientId: true,
        rating: true,
        comment: true,
        googleReviewId: true,
        reviewCreatedAt: true,
        deletedAt: true,
        reason: true,
        admin: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    const barberIds = Array.from(new Set(logs.map((l) => l.barberId)));
    const clientIds = Array.from(new Set(logs.map((l) => l.clientId)));

    const [barbers, clients] = await Promise.all([
      prisma.barber.findMany({
        where: { id: { in: barberIds } },
        select: {
          id: true,
          user: { select: { name: true } },
        },
      }),
      prisma.user.findMany({
        where: { id: { in: clientIds } },
        select: { id: true, name: true, email: true },
      }),
    ]);

    const barberNameById = new Map(
      barbers.map((b) => [b.id, b.user?.name || 'Unknown'])
    );
    const clientNameById = new Map(
      clients.map((c) => [c.id, c.name || c.email || 'Unknown'])
    );

    const transformed = logs.map((l) => ({
      id: l.id,
      reviewId: l.reviewId,
      appointmentId: l.appointmentId,
      rating: l.rating,
      comment: l.comment,
      reason: l.reason,
      googleReviewId: l.googleReviewId,
      reviewCreatedAt: l.reviewCreatedAt.toISOString(),
      deletedAt: l.deletedAt.toISOString(),
      admin: {
        id: l.admin.id,
        name: l.admin.name || l.admin.email || 'Admin',
      },
      barber: {
        id: l.barberId,
        name: barberNameById.get(l.barberId) || 'Unknown',
      },
      client: {
        id: l.clientId,
        name: clientNameById.get(l.clientId) || 'Unknown',
      },
    }));

    return NextResponse.json({ logs: transformed });
  } catch (error) {
    console.error('Error fetching review deletion logs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch deletion logs' },
      { status: 500 }
    );
  }
}
