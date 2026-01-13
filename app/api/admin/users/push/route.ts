import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { prisma } from '@/lib/db';
import webpush from 'web-push';

export const dynamic = 'force-dynamic';

function ensureWebPushConfigured() {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return false;

  webpush.setVapidDetails(
    'mailto:' + (process.env.VAPID_EMAIL || 'info@jbbarbershop.com'),
    publicKey,
    privateKey
  );
  return true;
}

/**
 * POST /api/admin/users/push
 * Send push notifications to selected users (admin only)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!ensureWebPushConfigured()) {
      return NextResponse.json(
        { error: 'Push notifications are not configured (missing VAPID keys)' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const {
      userIds,
      title,
      message,
      link,
    }: {
      userIds?: string[];
      title?: string;
      message?: string;
      link?: string;
    } = body;

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

    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true },
    });

    if (users.length === 0) {
      return NextResponse.json(
        { error: 'No valid users found' },
        { status: 404 }
      );
    }

    const payload = JSON.stringify({
      title: title?.trim() ? title.trim() : 'JBookMe',
      body: message,
      icon: '/icon-192.png',
      badge: '/icon-96.png',
      url: link?.trim() ? link.trim() : '/notificaciones',
      data: {
        url: link?.trim() ? link.trim() : '/notificaciones',
      },
    });

    // Always create in-app notifications (so users can see it even if push is blocked)
    try {
      await prisma.notification.createMany({
        data: users.map((u) => ({
          userId: u.id,
          type: 'NEW_MESSAGE',
          title: title?.trim() ? title.trim() : 'JBookMe',
          message,
          link: link?.trim() ? link.trim() : '/notificaciones',
          isRead: false,
        })),
      });
    } catch (error) {
      console.error('Error creating in-app notifications for push:', error);
      // Continue; push sending can still proceed.
    }

    let usersWithSubscriptions = 0;
    let usersNotSubscribed = 0;
    let pushSent = 0;
    let pushFailed = 0;

    for (const user of users) {
      const subscriptions = await prisma.pushSubscription.findMany({
        where: { userId: user.id },
      });

      if (subscriptions.length === 0) {
        usersNotSubscribed++;
        continue;
      }

      usersWithSubscriptions++;

      const results = await Promise.allSettled(
        subscriptions.map(async (subscription) => {
          try {
            await webpush.sendNotification(
              {
                endpoint: subscription.endpoint,
                keys: {
                  p256dh: subscription.p256dh,
                  auth: subscription.auth,
                },
              },
              payload
            );
          } catch (error: unknown) {
            const statusCode =
              typeof error === 'object' && error !== null && 'statusCode' in error
                ? (error as { statusCode?: unknown }).statusCode
                : undefined;

            if (statusCode === 410 || statusCode === 404) {
              await prisma.pushSubscription.delete({
                where: { id: subscription.id },
              });
            }
            throw error;
          }
        })
      );

      for (const r of results) {
        if (r.status === 'fulfilled') pushSent++;
        else pushFailed++;
      }
    }

    return NextResponse.json({
      message: 'Push notifications sent',
      stats: {
        totalUsers: users.length,
        usersWithSubscriptions,
        usersNotSubscribed,
        pushSent,
        pushFailed,
      },
    });
  } catch (error) {
    console.error('Error sending push notifications:', error);
    return NextResponse.json(
      { error: 'Failed to send push notifications' },
      { status: 500 }
    );
  }
}
