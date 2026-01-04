import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * GET /api/promotions
 * Get all active promotions (public endpoint)
 */
export async function GET() {
  try {
    const promotions = await prisma.promotion.findMany({
      where: {
        status: 'ACTIVE',
        startDate: {
          lte: new Date()
        },
        endDate: {
          gte: new Date()
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json({ promotions });
  } catch (error) {
    console.error('Error fetching promotions:', error);
    return NextResponse.json(
      { error: 'Error al obtener promociones' },
      { status: 500 }
    );
  }
}
