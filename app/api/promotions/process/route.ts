import { NextResponse } from 'next/server';
import { processPromotions } from '@/lib/cron/promotions';

export const dynamic = 'force-dynamic';

function isAuthorizedCron(req: Request): boolean {
  // Vercel Cron requests include this header.
  const vercelCron = req.headers.get('x-vercel-cron');
  if (vercelCron === '1' || vercelCron === 'true') return true;

  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const authHeader = req.headers.get('authorization');
  if (authHeader === `Bearer ${secret}`) return true;

  try {
    const url = new URL(req.url);
    const token = url.searchParams.get('token');
    if (token && token === secret) return true;
  } catch {
    // ignore
  }

  return false;
}

export async function GET(req: Request) {
  try {
    if (!isAuthorizedCron(req)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();
    const result = await processPromotions(now);
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('Error processing promotions:', error);
    return NextResponse.json(
      { error: 'Failed to process promotions' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  return GET(req);
}
