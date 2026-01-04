import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// DELETE permanently deletes a review (ADMIN-only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Only admins can delete reviews' },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({} as unknown));
    const reasonRaw = (body as { reason?: unknown })?.reason;
    const reason =
      typeof reasonRaw === 'string' && reasonRaw.trim().length > 0
        ? reasonRaw.trim()
        : 'No reason provided';

    const existingReview = await prisma.review.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        barberId: true,
        appointmentId: true,
        clientId: true,
        rating: true,
        comment: true,
        googleReviewId: true,
        createdAt: true,
      },
    });

    if (!existingReview) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 });
    }

    const { barberId, appointmentId } = existingReview;

    const result = await prisma.$transaction(async (tx) => {
      await tx.reviewDeletionLog.create({
        data: {
          reviewId: existingReview.id,
          appointmentId: existingReview.appointmentId,
          barberId: existingReview.barberId,
          clientId: existingReview.clientId,
          adminUserId: session.user.id,
          rating: existingReview.rating,
          comment: existingReview.comment,
          googleReviewId: existingReview.googleReviewId,
          reviewCreatedAt: existingReview.createdAt,
          reason,
        },
      });

      await tx.review.delete({
        where: { id: params.id },
      });

      // If this review came from the "quick rating" flow, also delete the placeholder appointment.
      if (appointmentId.startsWith('quick-')) {
        await tx.appointment.delete({
          where: { id: appointmentId },
        });
      }

      const agg = await tx.review.aggregate({
        where: { barberId },
        _avg: { rating: true },
      });

      const nextRating = agg._avg.rating ?? 0;

      await tx.barber.update({
        where: { id: barberId },
        data: { rating: nextRating },
      });

      return { nextRating };
    });

    return NextResponse.json({
      success: true,
      deletedReviewId: params.id,
      barberRating: result.nextRating,
    });
  } catch (error) {
    console.error('Error deleting review:', error);
    return NextResponse.json(
      { error: 'Failed to delete review' },
      { status: 500 }
    );
  }
}
