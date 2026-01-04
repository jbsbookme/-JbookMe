import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/users/cleanup
 * 
 * Deletes ALL test users ("Test User") from the system
 * Admin-only
 * 
 * This endpoint:
 * 1. Automatically cancels all pending/confirmed appointments
 * 2. Deletes all related records
 * 3. Deletes test users
 * 
 * ⚠️ THIS ACTION IS PERMANENT AND IRREVERSIBLE
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Read request body to check if we should include barbers
    const body = await request.json().catch(() => ({}));
    const includeBarbers = body.includeBarbers === true;

    // Find all test users (name contains "Test User" or "test")
    const testUsers = await prisma.user.findMany({
      where: {
        OR: [
          { name: { contains: 'Test User', mode: 'insensitive' } },
          { name: { contains: 'test', mode: 'insensitive' } },
          { email: { contains: 'test', mode: 'insensitive' } },
        ],
        role: { not: 'ADMIN' }, // Don't delete admin users
      },
      include: {
        barber: true,
        appointmentsAsClient: true,
      },
    });

    if (testUsers.length === 0) {
      return NextResponse.json(
        {
          message: 'No test users found to delete',
          deletedCount: 0,
        },
        { status: 200 }
      );
    }

    // Filter based on includeBarbers flag
    const usersToDelete = includeBarbers 
      ? testUsers // Include everyone if flag is set
      : testUsers.filter(user => !user.barber); // Exclude barbers by default

    if (usersToDelete.length === 0) {
      return NextResponse.json(
        {
          message: 'All test users are barbers. Please delete them manually from Barbers/Stylists.',
          skippedCount: testUsers.length,
        },
        { status: 200 }
      );
    }

    let deletedCount = 0;
    let skippedCount = 0;
    const errors: string[] = [];

    for (const user of usersToDelete) {
      try {
        // STEP 1: Cancel all appointments (as client AND as barber if applicable)
        await prisma.appointment.updateMany({
          where: {
            OR: [
              { clientId: user.id },
              { barberId: user.barber?.id || '' },
            ],
            status: {
              in: ['PENDING', 'CONFIRMED'],
            },
          },
          data: {
            status: 'CANCELLED',
            notes: 'Appointment automatically cancelled - Test user deleted',
          },
        });

        // STEP 2: If user is a barber, delete barber-specific records FIRST
        if (user.barber) {
          const barberId = user.barber.id;

          // Delete barber media (gallery items)
          await prisma.barberMedia.deleteMany({
            where: { barberId },
          });

          // Delete barber availability
          await prisma.availability.deleteMany({
            where: { barberId },
          });

          // Delete barber days off
          await prisma.dayOff.deleteMany({
            where: { barberId },
          });

          // Delete all appointments where this barber is the service provider
          await prisma.appointment.deleteMany({
            where: { barberId },
          });

          // Delete reviews received by this barber
          await prisma.review.deleteMany({
            where: { barberId },
          });

          // Delete barber payments
          await prisma.barberPayment.deleteMany({
            where: { barberId },
          });

          // Delete manual payments
          await prisma.manualPayment.deleteMany({
            where: { barberId },
          });

          // Update services to remove barber association (set to null)
          await prisma.service.updateMany({
            where: { barberId },
            data: { barberId: null },
          });

          // Finally, delete the barber record
          await prisma.barber.delete({
            where: { id: barberId },
          });
        }

        // STEP 3: Delete all user-related records
        // OAuth accounts
        await prisma.account.deleteMany({
          where: { userId: user.id },
        });

        // Sessions
        await prisma.session.deleteMany({
          where: { userId: user.id },
        });

        // All remaining appointments as client (now all are cancelled or completed)
        await prisma.appointment.deleteMany({
          where: { clientId: user.id },
        });

        // Reviews given by this client
        await prisma.review.deleteMany({
          where: { clientId: user.id },
        });

        // Posts
        await prisma.post.deleteMany({
          where: { authorId: user.id },
        });

        // Comments
        await prisma.comment.deleteMany({
          where: { authorId: user.id },
        });

        // Messages
        await prisma.message.deleteMany({
          where: {
            OR: [
              { senderId: user.id },
              { recipientId: user.id },
            ],
          },
        });

        // Notifications
        await prisma.notification.deleteMany({
          where: { userId: user.id },
        });

        // Push subscriptions
        await prisma.pushSubscription.deleteMany({
          where: { userId: user.id },
        });

        // Invoices
        await prisma.invoice.deleteMany({
          where: { recipientId: user.id },
        });

        // STEP 4: Delete the user
        await prisma.user.delete({
          where: { id: user.id },
        });

        deletedCount++;
        console.log(`[CLEANUP] Deleted test user${user.barber ? ' (BARBER)' : ''}: ${user.name} (${user.email})`);
      } catch (error) {
        console.error(`[CLEANUP] Error deleting user ${user.name}:`, error);
        errors.push(`${user.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        skippedCount++;
      }
    }

    return NextResponse.json({
      message: 'Cleanup completed',
      deletedCount,
      skippedCount,
      totalTestUsers: testUsers.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('[CLEANUP] Error in cleanup process:', error);
    return NextResponse.json(
      { error: 'Cleanup process failed' },
      { status: 500 }
    );
  }
}
