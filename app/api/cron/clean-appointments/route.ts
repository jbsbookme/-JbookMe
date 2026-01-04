import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * Cron job to clean up old completed/cancelled appointments
 * Should be called daily (e.g., via Vercel Cron or external scheduler)
 */
export async function GET(req: NextRequest) {
  try {
    // Verify cron secret (optional security)
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Calculate date 1 day ago
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);
    oneDayAgo.setHours(23, 59, 59, 999);

    // Delete old completed/cancelled appointments (older than 1 day)
    const result = await prisma.appointment.deleteMany({
      where: {
        date: {
          lt: oneDayAgo
        },
        status: {
          in: ['COMPLETED', 'CANCELLED']
        }
      }
    });

    return NextResponse.json({
      success: true,
      deletedCount: result.count,
      message: `Deleted ${result.count} old appointments`
    });
  } catch (error) {
    console.error('[CRON] Error cleaning appointments:', error);
    return NextResponse.json(
      { error: 'Error cleaning appointments' },
      { status: 500 }
    );
  }
}
