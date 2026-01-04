import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { prisma } from '@/lib/db';
import { sendEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/users/notify
 * Send mass notifications to users (admin only)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { userIds, subject, message, notificationType = 'email' } = body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json(
        { error: 'You must select at least one user' },
        { status: 400 }
      );
    }

    if (!message || message.trim() === '') {
      return NextResponse.json(
        { error: 'Message cannot be empty' },
        { status: 400 }
      );
    }

    // Fetch users
    const users = await prisma.user.findMany({
      where: {
        id: {
          in: userIds,
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    if (users.length === 0) {
      return NextResponse.json(
        { error: 'No valid users found' },
        { status: 404 }
      );
    }

    let emailsSent = 0;
    let notificationsCreated = 0;
    const errors: string[] = [];

    // Send emails
    if (notificationType === 'email' || notificationType === 'both') {
      for (const user of users) {
        try {
          const ok = await sendEmail({
            to: user.email,
            subject: subject || 'JBookMe Notification',
            body: `Hello ${user.name || 'User'},\n\n${message}\n\n---\nThis message was sent by the JBookMe admin.`,
          });
          if (ok) {
            emailsSent++;
          } else {
            errors.push(`Email to ${user.email} failed`);
          }
        } catch (error) {
          console.error(`Error sending email to ${user.email}:`, error);
          errors.push(`Email to ${user.email} failed`);
        }
      }
    }

    // Create in-app notifications
    if (notificationType === 'notification' || notificationType === 'both') {
      for (const user of users) {
        try {
          await prisma.notification.create({
            data: {
              userId: user.id,
              type: 'NEW_MESSAGE',
              title: subject || 'Admin Notification',
              message: message,
              isRead: false,
            },
          });
          notificationsCreated++;
        } catch (error) {
          console.error(`Error creating notification for ${user.id}:`, error);
          errors.push(`Notification for ${user.name || user.id} failed`);
        }
      }
    }

    return NextResponse.json({
      message: 'Notifications sent successfully',
      stats: {
        totalUsers: users.length,
        emailsSent,
        notificationsCreated,
        errors: errors.length,
      },
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('Error sending notifications:', error);
    return NextResponse.json(
      { error: 'Failed to send notifications' },
      { status: 500 }
    );
  }
}
