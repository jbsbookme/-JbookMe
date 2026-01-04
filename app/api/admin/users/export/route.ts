import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/users/export
 * Export users to CSV format (admin only)
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        barber: {
          select: {
            specialties: true,
          },
        },
        _count: {
          select: {
            appointmentsAsClient: true,
            posts: true,
          },
        },
      },
      orderBy: [
        { role: 'asc' },
        { createdAt: 'desc' },
      ],
    });

    // Create CSV content
    const headers = [
      'ID',
      'Name',
      'Email',
      'Role',
      'Is Barber',
      'Specialties',
      'Total Appointments',
      'Total Reviews',
      'Total Posts',
      'Created At',
      'Updated At',
      'Last Login',
    ];

    const rows = users.map((user) => [
      user.id,
      user.name || 'Unnamed',
      user.email,
      user.role,
      user.barber ? 'Yes' : 'No',
      user.barber?.specialties || 'N/A',
      user._count.appointmentsAsClient,
      0, // reviews count not available in this query
      user._count.posts,
      new Date(user.createdAt).toLocaleDateString('en-US'),
      new Date(user.updatedAt).toLocaleDateString('en-US'),
      'N/A', // lastLoginAt not in schema
    ]);

    // Combine headers and rows
    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    // Return CSV file
    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="users_${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error('Error exporting users:', error);
    return NextResponse.json({ error: 'Failed to export users' }, { status: 500 });
  }
}
