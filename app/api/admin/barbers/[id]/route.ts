import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const barberId = params.id;
    const body = await request.json();
    const { featured } = body as { featured?: boolean };

    if (typeof featured !== 'boolean') {
      return NextResponse.json({ error: 'Invalid featured value' }, { status: 400 });
    }

    const existingBarber = await prisma.barber.findUnique({
      where: { id: barberId },
      select: { id: true },
    });

    if (!existingBarber) {
      return NextResponse.json({ error: 'Barber not found' }, { status: 404 });
    }

    const updatedBarber = await prisma.barber.update({
      where: { id: barberId },
      data: { featured },
      select: {
        id: true,
        featured: true,
      },
    });

    return NextResponse.json({ barber: updatedBarber });
  } catch (error) {
    console.error('Error updating barber featured flag:', error);
    return NextResponse.json({ error: 'Failed to update barber' }, { status: 500 });
  }
}
