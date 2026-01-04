import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    // Obtener estadísticas generales (cada fila = 1 click)
    const totalClicks = await prisma.socialMediaClick.count();
    
    // Clicks por red social
    const clicksByNetwork = await prisma.socialMediaClick.groupBy({
      by: ['network'],
      _count: { _all: true },
    });

    clicksByNetwork.sort((a, b) => b._count._all - a._count._all);

    // Total de usuarios en la plataforma
    const totalUsers = await prisma.user.count({
      where: {
        role: 'CLIENT',
      },
    });

    // No userId tracking in current schema
    const engagementPercentage = 0;

    // Clicks de los últimos 30 días
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentClicks = await prisma.socialMediaClick.count({
      where: {
        createdAt: {
          gte: thirtyDaysAgo,
        },
      },
    });

    // Red social más popular
    const mostPopularNetwork = clicksByNetwork[0] || null;

    return NextResponse.json({
      totalClicks,
      clicksByNetwork: clicksByNetwork.map((item) => ({
        network: item.network,
        count: item._count._all,
      })),
      uniqueUsers: 0,
      totalUsers,
      engagementPercentage,
      recentClicks,
      mostPopularNetwork: mostPopularNetwork ? {
        network: mostPopularNetwork.network,
        count: mostPopularNetwork._count._all,
      } : null,
    });
  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    return NextResponse.json(
      { error: 'Error al obtener estadísticas' },
      { status: 500 }
    );
  }
}
