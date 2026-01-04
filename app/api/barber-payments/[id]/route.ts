import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { prisma } from '@/lib/db';
import { PaymentStatus } from '@prisma/client';
import type { Prisma } from '@prisma/client';

// PATCH - Update a barber payment (Admin only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { amount, status, notes } = body;

    const updateData: Prisma.BarberPaymentUpdateInput = {};
    
    if (amount !== undefined) updateData.amount = parseFloat(amount);
    if (status !== undefined) {
      updateData.status = status as PaymentStatus;
      if (status === PaymentStatus.PAID) {
        updateData.paidAt = new Date();
      }
    }
    if (notes !== undefined) updateData.notes = notes;

    const payment = await prisma.barberPayment.update({
      where: { id: params.id },
      data: updateData,
      include: {
        barber: {
          include: {
            user: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json(payment);
  } catch (error) {
    console.error('Error updating barber payment:', error);
    return NextResponse.json(
      { error: 'Failed to update barber payment' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a barber payment (Admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await prisma.barberPayment.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ message: 'Payment deleted successfully' });
  } catch (error) {
    console.error('Error deleting barber payment:', error);
    return NextResponse.json(
      { error: 'Failed to delete barber payment' },
      { status: 500 }
    );
  }
}
