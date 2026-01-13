import { prisma } from '@/lib/db';
import { PromotionStatus } from '@prisma/client';
import type { Prisma } from '@prisma/client';
import webpush from 'web-push';

export type PromotionsProcessResult = {
  now: string;
  activated: number;
  expired: number;
  notificationsCreated: number;
  promotionsNotified: number;
  pushConfigured: boolean;
  pushSent: number;
  pushFailed: number;
  usersWithSubscriptions: number;
  usersNotSubscribed: number;
};

function ensureWebPushConfigured(): boolean {
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

async function sendPushToUsers(
  userIds: string[],
  payload: string
): Promise<{
  usersWithSubscriptions: number;
  usersNotSubscribed: number;
  pushSent: number;
  pushFailed: number;
}> {
  let usersWithSubscriptions = 0;
  let usersNotSubscribed = 0;
  let pushSent = 0;
  let pushFailed = 0;

  for (const userId of userIds) {
    const subscriptions = await prisma.pushSubscription.findMany({
      where: { userId },
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

  return { usersWithSubscriptions, usersNotSubscribed, pushSent, pushFailed };
}

export async function processPromotions(now: Date): Promise<PromotionsProcessResult> {
  const pushConfigured = ensureWebPushConfigured();

  // 1) Expire promotions that ended (but never touch CANCELLED)
  const expiredResult = await prisma.promotion.updateMany({
    where: {
      status: { in: [PromotionStatus.SCHEDULED, PromotionStatus.ACTIVE] },
      endDate: { lte: now },
    },
    data: { status: PromotionStatus.EXPIRED },
  });

  // 2) Activate promotions within window (SCHEDULED -> ACTIVE)
  const toActivate = await prisma.promotion.findMany({
    where: {
      status: PromotionStatus.SCHEDULED,
      startDate: { lte: now },
      endDate: { gt: now },
    },
    select: {
      id: true,
      title: true,
      message: true,
      discount: true,
      targetRole: true,
      sentCount: true,
    },
  });

  let activated = 0;
  let notificationsCreated = 0;
  let promotionsNotified = 0;
  let pushSent = 0;
  let pushFailed = 0;
  let usersWithSubscriptions = 0;
  let usersNotSubscribed = 0;

  for (const promo of toActivate) {
    // Only notify once; sentCount is our idempotency guard.
    if (promo.sentCount > 0) {
      const didActivate = await prisma.promotion.updateMany({
        where: {
          id: promo.id,
          status: PromotionStatus.SCHEDULED,
        },
        data: { status: PromotionStatus.ACTIVE },
      });
      if (didActivate.count) activated += didActivate.count;
      continue;
    }

    const whereClause: Prisma.UserWhereInput = {};
    if (promo.targetRole) {
      whereClause.role = promo.targetRole;
    }

    const users = await prisma.user.findMany({
      where: whereClause,
      select: { id: true },
    });

    const userIds = users.map((u) => u.id);

    const title = `🎉 ${promo.title}`;
    const message = `${promo.message}${promo.discount ? ` - ${promo.discount}` : ''}`;
    const link = '/inicio';

    const pushPayload = JSON.stringify({
      title,
      body: message,
      icon: '/icon-192.png',
      badge: '/icon-96.png',
      data: {
        url: link,
        promotionId: promo.id,
      },
    });

    // Transactionally flip to ACTIVE (only if still SCHEDULED and not sent yet), then create notifications, then set sentCount.
    const result = await prisma.$transaction(async (tx) => {
      const flip = await tx.promotion.updateMany({
        where: {
          id: promo.id,
          status: PromotionStatus.SCHEDULED,
          sentCount: 0,
        },
        data: { status: PromotionStatus.ACTIVE },
      });

      if (flip.count === 0) {
        return { flipCount: 0, notifCount: 0 };
      }

      const notifResult = userIds.length
        ? await tx.notification.createMany({
            data: userIds.map((userId) => ({
              userId,
              type: 'NEW_MESSAGE',
              title,
              message,
              link,
              isRead: false,
            })),
          })
        : { count: 0 };

      await tx.promotion.update({
        where: { id: promo.id },
        data: { sentCount: notifResult.count },
      });

      return { flipCount: flip.count, notifCount: notifResult.count };
    });

    if (result.flipCount > 0) {
      activated += result.flipCount;
      promotionsNotified += 1;
      notificationsCreated += result.notifCount;

      // Best-effort push sending. In-app notification is the guaranteed fallback.
      if (pushConfigured && userIds.length > 0) {
        const pushStats = await sendPushToUsers(userIds, pushPayload);
        pushSent += pushStats.pushSent;
        pushFailed += pushStats.pushFailed;
        usersWithSubscriptions += pushStats.usersWithSubscriptions;
        usersNotSubscribed += pushStats.usersNotSubscribed;
      }
    }
  }

  return {
    now: now.toISOString(),
    activated,
    expired: expiredResult.count,
    notificationsCreated,
    promotionsNotified,
    pushConfigured,
    pushSent,
    pushFailed,
    usersWithSubscriptions,
    usersNotSubscribed,
  };
}
