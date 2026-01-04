import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { prisma } from '@/lib/db';
import { PaymentStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

// GET - Get accounting summary (Admin only)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const dateFilter = startDate && endDate ? {
      gte: new Date(startDate),
      lte: new Date(endDate),
    } : undefined;

    // Get total income from barber payments (PAID status only)
    const barberPayments = await prisma.barberPayment.findMany({
      where: {
        status: PaymentStatus.PAID,
        ...(dateFilter && { paidAt: dateFilter }),
      },
    });

    const barberPaymentsIncome = barberPayments.reduce((sum, payment) => sum + payment.amount, 0);

    // Get total income from PAID invoices
    const paidInvoices = await prisma.invoice.findMany({
      where: {
        isPaid: true,
        type: 'BARBER_PAYMENT',
        ...(dateFilter && { paidAt: dateFilter }),
      },
    });

    const invoicesIncome = paidInvoices.reduce((sum, invoice) => sum + invoice.amount, 0);

    // Total income is sum of both
    const totalIncome = barberPaymentsIncome + invoicesIncome;

    // Get pending payments from BarberPayment
    const pendingPayments = await prisma.barberPayment.findMany({
      where: {
        status: { in: [PaymentStatus.PENDING, PaymentStatus.OVERDUE] },
      },
    });

    const pendingPaymentsAmount = pendingPayments.reduce((sum, payment) => sum + payment.amount, 0);

    // Get pending invoices
    const pendingInvoices = await prisma.invoice.findMany({
      where: {
        isPaid: false,
        type: 'BARBER_PAYMENT',
      },
    });

    const pendingInvoicesAmount = pendingInvoices.reduce((sum, invoice) => sum + invoice.amount, 0);

    // Total pending is sum of both
    const totalPending = pendingPaymentsAmount + pendingInvoicesAmount;
    const pendingPaymentsCount = pendingPayments.length + pendingInvoices.length;

    // Get total expenses
    const expenses = await prisma.expense.findMany({
      where: {
        ...(dateFilter && { date: dateFilter }),
      },
    });

    const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);

    // Calculate balance
    const balance = totalIncome - totalExpenses;

    // Get expenses by category
    const expensesByCategory = await prisma.expense.groupBy({
      by: ['category'],
      _sum: {
        amount: true,
      },
      where: {
        ...(dateFilter && { date: dateFilter }),
      },
    });

    // Get monthly trends (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyIncome = await prisma.$queryRaw`
      SELECT 
        DATE_TRUNC('month', "paidAt") as month,
        SUM(amount) as total
      FROM "BarberPayment"
      WHERE status = 'PAID' AND "paidAt" >= ${sixMonthsAgo}
      GROUP BY month
      ORDER BY month ASC
    `;

    const monthlyExpenses = await prisma.$queryRaw`
      SELECT 
        DATE_TRUNC('month', date) as month,
        SUM(amount) as total
      FROM "Expense"
      WHERE date >= ${sixMonthsAgo}
      GROUP BY month
      ORDER BY month ASC
    `;

    return NextResponse.json({
      totalIncome,
      totalExpenses,
      balance,
      totalPending,
      pendingPaymentsCount,
      barberPaymentsIncome,
      invoicesIncome,
      pendingPaymentsAmount,
      pendingInvoicesAmount,
      expensesByCategory: expensesByCategory.map((item) => ({
        category: item.category,
        total: item._sum.amount || 0,
      })),
      monthlyIncome,
      monthlyExpenses,
    });
  } catch (error) {
    console.error('Error fetching accounting summary:', error);
    return NextResponse.json(
      { error: 'Failed to fetch accounting summary' },
      { status: 500 }
    );
  }
}
