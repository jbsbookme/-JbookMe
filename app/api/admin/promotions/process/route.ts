import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { processPromotions } from '@/lib/cron/promotions';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/promotions/process
 * Manually process promotions (admin only)
 */
export async function POST() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();
    const result = await processPromotions(now);

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('Error processing promotions (admin):', error);
    return NextResponse.json(
      { error: 'Failed to process promotions' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return POST();
}
