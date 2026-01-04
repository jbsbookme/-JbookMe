import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { prisma } from '@/lib/db';
import type { Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';

/**
 * PUT /api/admin/promotions/[id]
 * Update promotion (admin only)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    const body = await request.json();
    const { title, message, description, discount, startDate, endDate, isActive, status } = body;

    const updateData: Prisma.PromotionUpdateInput = {};
    if (title !== undefined) updateData.title = title;
    if (message !== undefined) updateData.message = message;
    if (message === undefined && description !== undefined) updateData.message = description;
    if (discount !== undefined) updateData.discount = discount;
    if (startDate !== undefined) updateData.startDate = new Date(startDate);
    if (endDate !== undefined) updateData.endDate = new Date(endDate);
    if (status !== undefined) updateData.status = status;
    if (status === undefined && isActive !== undefined) {
      updateData.status = Boolean(isActive) ? 'ACTIVE' : 'CANCELLED';
    }

    const promotion = await prisma.promotion.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ promotion });
  } catch (error) {
    console.error('Error updating promotion:', error);
    return NextResponse.json(
      { error: 'Failed to update promotion' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/promotions/[id]
 * Delete promotion (admin only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;

    await prisma.promotion.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Promotion deleted successfully' });
  } catch (error) {
    console.error('Error deleting promotion:', error);
    return NextResponse.json(
      { error: 'Failed to delete promotion' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/promotions/[id]
 * Cancel promotion (admin only)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    const body = await request.json();
    const { action } = body;

    if (action === 'cancel') {
      const promotion = await prisma.promotion.update({
        where: { id },
        data: { status: 'CANCELLED' },
      });

      return NextResponse.json({
        message: 'Promotion cancelled successfully',
        promotion,
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Error canceling promotion:', error);
    return NextResponse.json(
      { error: 'Failed to cancel promotion' },
      { status: 500 }
    );
  }
}
