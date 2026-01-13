import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import {
  sendEmail,
  generate24HourReminderEmail,
  generate12HourReminderEmail,
  generate2HourReminderEmail,
  generate30MinuteReminderEmail,
  generateThankYouEmail,
} from '@/lib/email';
import { AppointmentStatus } from '@prisma/client';
import webpush from 'web-push';
import { isTwilioConfigured, sendSMS } from '@/lib/twilio';
import { formatTime12h } from '@/lib/time';

export const dynamic = 'force-dynamic';

function isCronAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;

  // Vercel Cron requests include this user-agent.
  const ua = request.headers.get('user-agent') || '';
  if (ua.includes('vercel-cron/1.0')) return true;

  const headerSecret = request.headers.get('x-cron-secret');
  if (headerSecret && headerSecret === secret) return true;

  try {
    const url = new URL(request.url);
    const querySecret = url.searchParams.get('secret');
    return querySecret === secret;
  } catch {
    return false;
  }
}

// Configure web-push with VAPID keys
const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || '';
const vapidSubject =
  process.env.NEXT_PUBLIC_APP_URL ||
  `mailto:${process.env.VAPID_EMAIL || 'info@jbbarbershop.com'}`;

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
}

/**
 * Send push notification to a user
 */
async function sendPushNotification(
  userId: string,
  title: string,
  body: string,
  data?: Record<string, unknown>,
  url?: string
) {
  try {
    const subscriptions = await prisma.pushSubscription.findMany({
      where: { userId },
    });

    const promises = subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth,
            },
          },
          JSON.stringify({
            title,
            body,
            icon: '/icon-192.png',
            badge: '/icon-96.png',
            url: url || (typeof data?.url === 'string' ? (data.url as string) : undefined) || '/reservar',
            data: {
              ...(data || {}),
              url: url || (typeof data?.url === 'string' ? (data.url as string) : undefined) || '/reservar',
            },
          })
        );
      } catch (error: unknown) {
        const statusCode =
          typeof error === 'object' && error !== null && 'statusCode' in error
            ? (error as { statusCode?: unknown }).statusCode
            : undefined;

        // If subscription is invalid, delete it
        if (statusCode === 410) {
          await prisma.pushSubscription.delete({ where: { id: sub.id } });
        }
        console.error('Error sending push to subscription:', error);
      }
    });

    await Promise.all(promises);
  } catch (error) {
    console.error('Error sending push notifications:', error);
  }
}

/**
 * Process and send appointment notifications
 * This endpoint checks for appointments that need notifications and sends them
 */
async function processNotifications() {
  try {
    const now = new Date();
    console.log('[Cron][notifications/process] start', { now: now.toISOString() });
    const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const in12Hours = new Date(now.getTime() + 12 * 60 * 60 * 1000);
    const in2Hours = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    const in30Minutes = new Date(now.getTime() + 30 * 60 * 1000);

    let sentCount = 0;
    let smsSentCount = 0;

    const adminUser = await prisma.user.findFirst({
      where: { role: 'ADMIN' },
      select: { id: true, name: true, phone: true, email: true },
    });

    const formatDateShort = (dateValue: Date) =>
      new Date(dateValue).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });

    // ===== 24-HOUR REMINDERS =====
    // Find appointments that are 24 hours away and haven't been notified yet
    const appointments24h = await prisma.appointment.findMany({
      where: {
        date: {
          gte: in24Hours,
          lte: new Date(in24Hours.getTime() + 60 * 60 * 1000), // Within 1-hour window
        },
        status: {
          in: [AppointmentStatus.CONFIRMED, AppointmentStatus.PENDING],
        },
        OR: [{ notification24hSent: false }, { sms24hSent: false }],
      },
      include: {
        client: true,
        barber: {
          include: {
            user: true,
          },
        },
        service: true,
      },
    });

    for (const appointment of appointments24h) {
      const needsEmailPush = !appointment.notification24hSent;
      const clientEmail = appointment.client?.email;
      const barberEmail = appointment.barber?.user?.email;
      const clientName = appointment.client?.name || 'Client';
      const barberName = appointment.barber?.user?.name || 'Barber';
      const serviceName = appointment.service?.name || 'Service';
      const date = new Date(appointment.date).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      const dateShort = formatDateShort(appointment.date);
      const time = appointment.time;
      const timeDisplay = formatTime12h(time);

      // ===== SMS (24h) =====
      if (!appointment.sms24hSent) {
        // Only send the 24h SMS if the appointment is still PENDING (push confirmation).
        // If already CONFIRMED, we mark it as handled to avoid repeated evaluation.
        if (appointment.status !== AppointmentStatus.PENDING) {
          const handled = await prisma.appointment.updateMany({
            where: { id: appointment.id, sms24hSent: false },
            data: { sms24hSent: true },
          });

          if (handled.count > 0) {
            console.log('[SMS][24h] skipped: appointment not pending', {
              appointmentId: appointment.id,
              status: appointment.status,
            });
          }
        } else {
        const claimed = await prisma.appointment.updateMany({
          where: { id: appointment.id, sms24hSent: false },
          data: { sms24hSent: true },
        });

        if (claimed.count === 0) {
          console.log('[SMS][24h] skipped: already claimed', { appointmentId: appointment.id });
        } else if (!isTwilioConfigured()) {
          console.log('[SMS][24h] Twilio not configured; skipped', { appointmentId: appointment.id });
        } else {
          const clientPhone = appointment.client?.phone;
          if (!clientPhone) {
            console.log('[SMS][24h][client] skipped: client phone missing', { appointmentId: appointment.id, clientId: appointment.clientId });
          } else {
            const msg = `JB's Barbershop 💈\nReminder: you have an appointment tomorrow at ${timeDisplay}.\nReply YES to confirm or NO to cancel.`;
            const res = await sendSMS(clientPhone, msg);
            console.log('[SMS][24h][client]', { appointmentId: appointment.id, to: clientPhone, success: res.success, sid: (res as any).sid });
            if (res.success) smsSentCount++;
          }
        }
        }
      }

      // Send to client
      if (needsEmailPush && clientEmail) {
        const emailBody = generate24HourReminderEmail(
          clientName,
          barberName,
          serviceName,
          date,
          timeDisplay
        );
        await sendEmail({
          to: clientEmail,
          subject: '⏰ Reminder: Your appointment is tomorrow',
          body: emailBody,
        });
        
        // Send push notification to client
        if (appointment.clientId) {
          await sendPushNotification(
            appointment.clientId,
            '⏰ Appointment Reminder',
            `Tomorrow (${dateShort}) at ${timeDisplay}: ${serviceName} with ${barberName}`,
            { appointmentId: appointment.id },
            '/reservar'
          );
        }
        
        sentCount++;
      }

      // Send to barber
      if (needsEmailPush && barberEmail) {
        const emailBody = generate24HourReminderEmail(
          barberName,
          clientName,
          serviceName,
          date,
          timeDisplay
        );
        await sendEmail({
          to: barberEmail,
          subject: '⏰ Reminder: Appointment scheduled for tomorrow',
          body: emailBody,
        });
        
        // Send push notification to barber
        if (appointment.barberId) {
          const barberUserId = appointment.barber?.userId;
          if (barberUserId) {
            await sendPushNotification(
              barberUserId,
              '⏰ Appointment Reminder',
              `Tomorrow (${dateShort}) at ${timeDisplay}: ${serviceName} with ${clientName}`,
              { appointmentId: appointment.id },
              '/reservar'
            );
          }
        }
        
        sentCount++;
      }

      // Admin push (24h)
      if (needsEmailPush && adminUser?.id) {
        await sendPushNotification(
          adminUser.id,
          '⏰ Recordatorio de cita (24h)',
          `Mañana (${dateShort}) ${timeDisplay}: ${serviceName} • ${clientName} con ${barberName}`,
          { appointmentId: appointment.id },
          '/dashboard/admin/citas'
        );
      }

      // Mark email/push as sent
      if (needsEmailPush) {
        await prisma.appointment.update({
          where: { id: appointment.id },
          data: { notification24hSent: true },
        });
      }
    }

    // ===== 12-HOUR REMINDERS =====
    // Find appointments that are 12 hours away and haven't been notified yet
    const appointments12h = await prisma.appointment.findMany({
      where: {
        date: {
          gte: in12Hours,
          lte: new Date(in12Hours.getTime() + 60 * 60 * 1000), // Within 1-hour window
        },
        status: {
          in: [AppointmentStatus.CONFIRMED, AppointmentStatus.PENDING],
        },
        notification12hSent: false,
      },
      include: {
        client: true,
        barber: {
          include: {
            user: true,
          },
        },
        service: true,
      },
    });

    for (const appointment of appointments12h) {
      const clientEmail = appointment.client?.email;
      const barberEmail = appointment.barber?.user?.email;
      const clientName = appointment.client?.name || 'Client';
      const barberName = appointment.barber?.user?.name || 'Barber';
      const serviceName = appointment.service?.name || 'Service';
      const date = new Date(appointment.date).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      const dateShort = formatDateShort(appointment.date);
      const time = appointment.time;
      const timeDisplay = formatTime12h(time);

      // Send to client
      if (clientEmail) {
        const emailBody = generate12HourReminderEmail(
          clientName,
          barberName,
          serviceName,
          date,
          timeDisplay
        );
        await sendEmail({
          to: clientEmail,
          subject: '⏰ Your appointment is in 12 hours',
          body: emailBody,
        });
        
        // Send push notification to client
        if (appointment.clientId) {
          await sendPushNotification(
            appointment.clientId,
            '⏰ Appointment Reminder',
            `Your appointment with ${barberName} is in 12 hours (${timeDisplay})`,
            { appointmentId: appointment.id }
          );
        }
        
        sentCount++;
      }

      // Send to barber
      if (barberEmail) {
        const emailBody = generate12HourReminderEmail(
          barberName,
          clientName,
          serviceName,
          date,
          timeDisplay
        );
        await sendEmail({
          to: barberEmail,
          subject: '⏰ Appointment in 12 hours',
          body: emailBody,
        });
        
        // Send push notification to barber
        if (appointment.barberId) {
          const barberUserId = appointment.barber?.userId;
          if (barberUserId) {
            await sendPushNotification(
              barberUserId,
              '⏰ Appointment Reminder',
              `Appointment with ${clientName} is in 12 hours (${timeDisplay})`,
              { appointmentId: appointment.id }
            );
          }
        }
        
        sentCount++;
      }

      // Mark as sent
      await prisma.appointment.update({
        where: { id: appointment.id },
        data: { notification12hSent: true },
      });
    }

    // ===== 2-HOUR REMINDERS =====
    // Find appointments that are 2 hours away and haven't been notified yet
    const appointments2h = await prisma.appointment.findMany({
      where: {
        date: {
          gte: in2Hours,
          lte: new Date(in2Hours.getTime() + 30 * 60 * 1000), // Within 30-minute window
        },
        status: {
          in: [AppointmentStatus.CONFIRMED, AppointmentStatus.PENDING],
        },
        OR: [{ notification2hSent: false }, { sms2hSent: false }],
      },
      include: {
        client: true,
        barber: {
          include: {
            user: true,
          },
        },
        service: true,
      },
    });

    for (const appointment of appointments2h) {
      const needsEmailPush = !appointment.notification2hSent;
      const clientEmail = appointment.client?.email;
      const barberEmail = appointment.barber?.user?.email;
      const clientName = appointment.client?.name || 'Client';
      const barberName = appointment.barber?.user?.name || 'Barber';
      const serviceName = appointment.service?.name || 'Service';
      const date = new Date(appointment.date).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      const dateShort = formatDateShort(appointment.date);
      const time = appointment.time;
      const timeDisplay = formatTime12h(time);

      // ===== SMS (2h) =====
      if (!appointment.sms2hSent) {
        const claimed = await prisma.appointment.updateMany({
          where: { id: appointment.id, sms2hSent: false },
          data: { sms2hSent: true },
        });

        if (claimed.count === 0) {
          console.log('[SMS][2h] skipped: already claimed', { appointmentId: appointment.id });
        } else if (!isTwilioConfigured()) {
          console.log('[SMS][2h] Twilio not configured; skipped', { appointmentId: appointment.id });
        } else {
          const clientPhone = appointment.client?.phone;
          const barberPhone = appointment.barber?.user?.phone || appointment.barber?.phone;
          const adminPhone = adminUser?.phone;

          if (clientPhone) {
            const msg = `JB's Barbershop 💈\nYour appointment is in 2 hours at ${timeDisplay}.\nWe'll be ready for you ✂️`;
            const res = await sendSMS(clientPhone, msg);
            console.log('[SMS][2h][client]', { appointmentId: appointment.id, to: clientPhone, success: res.success, sid: (res as any).sid });
            if (res.success) smsSentCount++;
          } else {
            console.log('[SMS][2h][client] skipped: client phone missing', { appointmentId: appointment.id, clientId: appointment.clientId });
          }

          if (barberPhone) {
            const msg = `JBookMe 💈\nYou have an appointment today at ${timeDisplay} with ${clientName}.`;
            const res = await sendSMS(barberPhone, msg);
            console.log('[SMS][2h][barber]', { appointmentId: appointment.id, to: barberPhone, success: res.success, sid: (res as any).sid });
            if (res.success) smsSentCount++;
          } else {
            console.log('[SMS][2h][barber] skipped: barber phone missing', { appointmentId: appointment.id, barberId: appointment.barberId });
          }

          if (adminPhone) {
            const adminName = (adminUser?.name || 'Jorge').trim() || 'Jorge';
            const msg = `${adminName}, you have an appointment today at ${timeDisplay} with ${clientName} 💈`;
            const res = await sendSMS(adminPhone, msg);
            console.log('[SMS][2h][admin]', { appointmentId: appointment.id, to: adminPhone, success: res.success, sid: (res as any).sid });
            if (res.success) smsSentCount++;
          } else {
            console.log('[SMS][2h][admin] skipped: admin phone missing', { appointmentId: appointment.id, adminEmail: adminUser?.email });
          }
        }
      }

      // Send to client
      if (needsEmailPush && clientEmail) {
        const emailBody = generate2HourReminderEmail(
          clientName,
          barberName,
          serviceName,
          date,
          timeDisplay
        );
        await sendEmail({
          to: clientEmail,
          subject: '⏰ Your appointment is in 2 hours',
          body: emailBody,
        });
        
        // Send push notification to client
        if (appointment.clientId) {
          await sendPushNotification(
            appointment.clientId,
            '⏰ Upcoming Appointment',
            `In 2 hours (${dateShort} at ${timeDisplay}): ${serviceName} with ${barberName}`,
            { appointmentId: appointment.id },
            '/reservar'
          );
        }
        
        sentCount++;
      }

      // Send to barber
      if (needsEmailPush && barberEmail) {
        const emailBody = generate2HourReminderEmail(
          barberName,
          clientName,
          serviceName,
          date,
          timeDisplay
        );
        await sendEmail({
          to: barberEmail,
          subject: '⏰ Appointment in 2 hours',
          body: emailBody,
        });
        
        // Send push notification to barber
        if (appointment.barberId) {
          const barberUserId = appointment.barber?.userId;
          if (barberUserId) {
            await sendPushNotification(
              barberUserId,
              '⏰ Upcoming Appointment',
              `In 2 hours (${dateShort} at ${timeDisplay}): ${serviceName} with ${clientName}`,
              { appointmentId: appointment.id },
              '/reservar'
            );
          }
        }
        
        sentCount++;
      }

      // Admin push (2h)
      if (needsEmailPush && adminUser?.id) {
        await sendPushNotification(
          adminUser.id,
          '⏰ Cita en 2 horas',
          `En 2 horas (${dateShort}) ${timeDisplay}: ${serviceName} • ${clientName} con ${barberName}`,
          { appointmentId: appointment.id },
          '/dashboard/admin/citas'
        );
      }

      // Mark email/push as sent
      if (needsEmailPush) {
        await prisma.appointment.update({
          where: { id: appointment.id },
          data: { notification2hSent: true },
        });
      }
    }

    // ===== 30-MINUTE REMINDERS =====
    // Find appointments that are 30 minutes away and haven't been notified yet
    const appointments30m = await prisma.appointment.findMany({
      where: {
        date: {
          gte: in30Minutes,
          lte: new Date(in30Minutes.getTime() + 15 * 60 * 1000), // Within 15-minute window
        },
        status: {
          in: [AppointmentStatus.CONFIRMED, AppointmentStatus.PENDING],
        },
        notification30mSent: false,
      },
      include: {
        client: true,
        barber: {
          include: {
            user: true,
          },
        },
        service: true,
      },
    });

    for (const appointment of appointments30m) {
      const clientEmail = appointment.client?.email;
      const barberEmail = appointment.barber?.user?.email;
      const clientName = appointment.client?.name || 'Client';
      const barberName = appointment.barber?.user?.name || 'Barber';
      const serviceName = appointment.service?.name || 'Service';
      const date = new Date(appointment.date).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      const time = appointment.time;
      const timeDisplay = formatTime12h(time);

      // Send to client
      if (clientEmail) {
        const emailBody = generate30MinuteReminderEmail(
          clientName,
          barberName,
          serviceName,
          date,
          timeDisplay
        );
        await sendEmail({
          to: clientEmail,
          subject: '🚨 URGENT: Your appointment is in 30 minutes',
          body: emailBody,
        });
        
        // Send push notification to client
        if (appointment.clientId) {
          await sendPushNotification(
            appointment.clientId,
            '🚨 URGENT: Appointment in 30 Minutes',
            `Your appointment with ${barberName} is at ${timeDisplay}. Please don’t be late!`,
            { appointmentId: appointment.id, urgent: true }
          );
        }
        
        sentCount++;
      }

      // Send to barber
      if (barberEmail) {
        const emailBody = generate30MinuteReminderEmail(
          barberName,
          clientName,
          serviceName,
          date,
          timeDisplay
        );
        await sendEmail({
          to: barberEmail,
          subject: '🚨 Appointment in 30 minutes',
          body: emailBody,
        });
        
        // Send push notification to barber
        if (appointment.barberId) {
          const barberUserId = appointment.barber?.userId;
          if (barberUserId) {
            await sendPushNotification(
              barberUserId,
              '🚨 Imminent Appointment',
              `Appointment with ${clientName} in 30 minutes (${timeDisplay})`,
              { appointmentId: appointment.id, urgent: true }
            );
          }
        }
        
        sentCount++;
      }

      // Mark as sent
      await prisma.appointment.update({
        where: { id: appointment.id },
        data: { notification30mSent: true },
      });
    }

    // ===== THANK YOU MESSAGES =====
    // Find completed appointments from today that haven't received thank you
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);

    const completedAppointments = await prisma.appointment.findMany({
      where: {
        date: {
          gte: startOfDay,
          lte: now,
        },
        status: AppointmentStatus.COMPLETED,
        thankYouSent: false,
      },
      include: {
        client: true,
        barber: {
          include: {
            user: true,
          },
        },
        service: true,
      },
    });

    for (const appointment of completedAppointments) {
      const clientEmail = appointment.client?.email;
      const clientName = appointment.client?.name || 'Client';
      const barberName = appointment.barber?.user?.name || 'Barber';
      const serviceName = appointment.service?.name || 'Service';

      if (clientEmail) {
        const emailBody = generateThankYouEmail(clientName, barberName, serviceName);
        await sendEmail({
          to: clientEmail,
          subject: '💈 Thank you for your visit!',
          body: emailBody,
        });
        sentCount++;

        // Mark as sent
        await prisma.appointment.update({
          where: { id: appointment.id },
          data: { thankYouSent: true },
        });
      }
    }

    const summary = {
      sentCount,
      smsSentCount,
      reminders24h: appointments24h.length,
      reminders12h: appointments12h.length,
      reminders2h: appointments2h.length,
      reminders30m: appointments30m.length,
      thankYou: completedAppointments.length,
    };

    console.log('[Cron][notifications/process] done', {
      now: new Date().toISOString(),
      ...summary,
    });

    return NextResponse.json({
      success: true,
      message: `Successfully processed ${sentCount} notifications and sent ${smsSentCount} SMS`,
      details: {
        reminders24h: appointments24h.length,
        reminders12h: appointments12h.length,
        reminders2h: appointments2h.length,
        reminders30m: appointments30m.length,
        thankYou: completedAppointments.length,
        smsSent: smsSentCount,
      },
    });
  } catch (error) {
    console.error('Error processing notifications:', error);
    return NextResponse.json(
      { error: 'Failed to process notifications' },
      { status: 500 }
    );
  }
}

// Vercel Cron hits endpoints with GET. Keep POST for manual triggering.
export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return processNotifications();
}

export async function POST(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return processNotifications();
}
