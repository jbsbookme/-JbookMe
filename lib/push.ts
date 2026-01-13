import webpush from 'web-push';
import { prisma } from '@/lib/db';

const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || '';
const vapidSubject =
  process.env.NEXT_PUBLIC_APP_URL ||
  `mailto:${process.env.VAPID_EMAIL || 'info@jbbarbershop.com'}`;

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
}

export function isWebPushConfigured(): boolean {
  return !!(vapidPublicKey && vapidPrivateKey);
}

export async function sendWebPushToUser(params: {
  userId: string;
  title: string;
  body: string;
  url?: string;
  data?: Record<string, unknown>;
}) {
  if (!isWebPushConfigured()) return;

  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId: params.userId },
  });

  if (subscriptions.length === 0) return;

  const resolvedUrl = params.url || (typeof params.data?.url === 'string' ? (params.data.url as string) : '/');

  const payload = JSON.stringify({
    title: params.title,
    body: params.body,
    icon: '/icon-192.png',
    badge: '/icon-96.png',
    url: resolvedUrl,
    data: {
      ...(params.data || {}),
      url: resolvedUrl,
    },
  });

  const results = await Promise.allSettled(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth,
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
          await prisma.pushSubscription.delete({ where: { id: sub.id } });
        }

        throw error;
      }
    })
  );

  const failed = results.filter((r) => r.status === 'rejected').length;
  if (failed > 0) {
    console.warn(`[push] failed for ${failed} subscription(s) (userId=${params.userId})`);
  }
}
