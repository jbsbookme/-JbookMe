import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Calculate date 7 days ago
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    // Get appointments: upcoming + recent (last 7 days)
    const appointments = await prisma.appointment.findMany({
      where: {
        clientId: session.user.id,
        OR: [
          // Upcoming appointments
          {
            date: {
              gte: new Date()
            }
          },
          // Recent completed/cancelled (last 7 days)
          {
            date: {
              gte: sevenDaysAgo,
              lt: new Date()
            }
          }
        ]
      },
      include: {
        service: {
          select: {
            name: true,
            price: true,
            duration: true
          }
        },
        barber: {
          select: {
            profileImage: true,
            user: {
              select: {
                name: true,
                email: true,
                image: true
              }
            }
          }
        },
        review: {
          select: {
            id: true,
            rating: true,
            comment: true
          }
        }
      },
      orderBy: {
        date: 'desc'
      },
      take: 5 // Maximum 5 appointments
    });

    return NextResponse.json(appointments);
  } catch (error) {
    console.error('[API] Error fetching user appointments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch appointments' },
      { status: 500 }
    );
  }
}
