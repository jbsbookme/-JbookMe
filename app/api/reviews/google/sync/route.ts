import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { syncBarberGoogleReviews, syncAllGoogleReviews } from '@/lib/google-reviews';
import { prisma } from '@/lib/db';
import { getAutoAdminResponseForReview, isReviewsAutoResponseEnabled } from '@/lib/reviews-auto-response';

export const dynamic = 'force-dynamic';

async function applyAutoReplyToGoogleReviews(barberId?: string) {
  if (!isReviewsAutoResponseEnabled()) return 0;

  const where = {
    googleReviewId: { not: null },
    adminResponse: null,
    ...(barberId ? { barberId } : {}),
  } as const;

  const reviews = await prisma.review.findMany({
    where,
    select: {
      id: true,
      rating: true,
    },
  });

  let updated = 0;
  for (const review of reviews) {
    const { adminResponse, adminRespondedAt } = getAutoAdminResponseForReview(review.rating);
    if (!adminResponse) continue;

    await prisma.review.update({
      where: { id: review.id },
      data: {
        adminResponse,
        adminRespondedAt,
      },
    });
    updated += 1;
  }

  return updated;
}

/**
 * GET /api/reviews/google/sync
 * Sincroniza reviews de Google para un barbero específico o todos
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Solo admin puede sincronizar
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const barberId = searchParams.get('barberId');

    let syncedCount = 0;

    if (barberId) {
      // Sincronizar un barbero específico
      syncedCount = await syncBarberGoogleReviews(barberId);
      const autoRepliedCount = await applyAutoReplyToGoogleReviews(barberId);
      return NextResponse.json({ 
        success: true,
        message: `${syncedCount} reviews sincronizadas`,
        barberId,
        autoRepliedCount,
      });
    } else {
      // Sincronizar todos los barberos
      await syncAllGoogleReviews();
      const autoRepliedCount = await applyAutoReplyToGoogleReviews();
      return NextResponse.json({ 
        success: true,
        message: 'Sincronización completa iniciada',
        autoRepliedCount,
      });
    }
  } catch (error) {
    console.error('Error syncing Google reviews:', error);
    return NextResponse.json(
      { error: 'Error al sincronizar reviews' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/reviews/google/sync
 * Configura la sincronización de Google para un barbero
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const body = await request.json();
    const { barberId, googlePlaceId, syncEnabled } = body;

    if (!barberId) {
      return NextResponse.json(
        { error: 'barberId es requerido' },
        { status: 400 }
      );
    }

    return NextResponse.json({ 
      success: true,
      barberId,
      googlePlaceId: googlePlaceId || null,
      syncEnabled: syncEnabled ?? null
    });
  } catch (error) {
    console.error('Error configuring Google sync:', error);
    return NextResponse.json(
      { error: 'Error al configurar sincronización' },
      { status: 500 }
    );
  }
}
