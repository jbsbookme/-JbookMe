import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { prisma } from '@/lib/db';
import { ExpenseCategory } from '@prisma/client';

// GET - List all expenses (Admin only)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') as ExpenseCategory | null;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const expenses = await prisma.expense.findMany({
      where: {
        ...(category && { category }),
        ...(startDate && endDate && {
          date: {
            gte: new Date(startDate),
            lte: new Date(endDate),
          },
        }),
      },
      orderBy: {
        date: 'desc',
      },
    });

    return NextResponse.json(expenses);
  } catch (error) {
    console.error('Error fetching expenses:', error);
    return NextResponse.json(
      { error: 'Failed to fetch expenses' },
      { status: 500 }
    );
  }
}

// POST - Create a new expense (Admin only)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { category, customCategory, amount, description, date, notes } = body;

    if (!category || !amount || !date) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate that customCategory is provided when category is OTHER
    if (category === 'OTHER' && !customCategory) {
      return NextResponse.json(
        { error: 'Custom category is required when selecting "Other"' },
        { status: 400 }
      );
    }

    // Save custom category for future use if it's new
    if (category === 'OTHER' && customCategory) {
      await prisma.customExpenseCategory.upsert({
        where: { name: customCategory },
        update: {},
        create: { name: customCategory },
      });
    }

    const expense = await prisma.expense.create({
      data: {
        category,
        customCategory: category === 'OTHER' ? customCategory : null,
        amount: parseFloat(amount),
        description,
        date: new Date(date),
        notes,
      },
    });

    return NextResponse.json(expense, { status: 201 });
  } catch (error) {
    console.error('Error creating expense:', error);
    return NextResponse.json(
      { error: 'Failed to create expense' },
      { status: 500 }
    );
  }
}
