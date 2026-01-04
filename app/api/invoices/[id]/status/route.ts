import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { prisma } from '@/lib/db';
import type { Prisma } from '@prisma/client';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Only admins can update invoice status
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    type PatchBody = {
      status?: 'PENDING' | 'PAID' | 'CANCELLED';
      paidAt?: string;
    };
    const body = (await req.json()) as PatchBody;
    const { status, paidAt } = body;

    if (!status || !['PENDING', 'PAID', 'CANCELLED'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be PENDING, PAID, or CANCELLED' },
        { status: 400 }
      );
    }

    const invoiceId = params.id;

    // Check if invoice exists
    const existingInvoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
    });

    if (!existingInvoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }

    const updateData: Prisma.InvoiceUpdateInput = {};

    // If marking as paid, set paidAt and isPaid
    if (status === 'PAID') {
      // Use provided paidAt date or current date
      if (paidAt) {
        const paidAtDate = new Date(paidAt);
        if (Number.isNaN(paidAtDate.getTime())) {
          return NextResponse.json(
            { error: 'Invalid paidAt. Must be an ISO date string.' },
            { status: 400 }
          );
        }
        updateData.paidAt = paidAtDate;
      } else {
        updateData.paidAt = new Date();
      }
      updateData.isPaid = true;
    } else {
      // If not paid, clear paidAt and set isPaid to false
      updateData.paidAt = null;
      updateData.isPaid = false;
    }

    const updatedInvoice = await prisma.invoice.update({
      where: { id: invoiceId },
      data: updateData,
      include: {
        recipient: true,
        barberPayment: true,
        appointment: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Invoice status updated to ${status}`,
      invoice: updatedInvoice,
    });

  } catch (error) {
    console.error('Error updating invoice status:', error);
    return NextResponse.json(
      { error: 'Failed to update invoice status' },
      { status: 500 }
    );
  }
}
