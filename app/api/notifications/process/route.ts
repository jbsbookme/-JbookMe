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

export const dynamic = 'force-dynamic';

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
  data?: Record<string, unknown>
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
            data: data || {},
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
export async function POST() {
  try {
    const now = new Date();
    const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const in12Hours = new Date(now.getTime() + 12 * 60 * 60 * 1000);
    const in2Hours = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    const in30Minutes = new Date(now.getTime() + 30 * 60 * 1000);

    let sentCount = 0;

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
        notification24hSent: false,
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

      // Send to client
      if (clientEmail) {
        const emailBody = generate24HourReminderEmail(
          clientName,
          barberName,
          serviceName,
          date,
          time
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
            `Your appointment with ${barberName} is tomorrow at ${time}`,
            { appointmentId: appointment.id }
          );
        }
        
        sentCount++;
      }

      // Send to barber
      if (barberEmail) {
        const emailBody = generate24HourReminderEmail(
          barberName,
          clientName,
          serviceName,
          date,
          time
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
              `Appointment with ${clientName} is tomorrow at ${time}`,
              { appointmentId: appointment.id }
            );
          }
        }
        
        sentCount++;
      }

      // Mark as sent
      await prisma.appointment.update({
        where: { id: appointment.id },
        data: { notification24hSent: true },
      });
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
      const time = appointment.time;

      // Send to client
      if (clientEmail) {
        const emailBody = generate12HourReminderEmail(
          clientName,
          barberName,
          serviceName,
          date,
          time
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
            `Your appointment with ${barberName} is in 12 hours (${time})`,
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
          time
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
              `Appointment with ${clientName} is in 12 hours (${time})`,
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
        notification2hSent: false,
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

      // Send to client
      if (clientEmail) {
        const emailBody = generate2HourReminderEmail(
          clientName,
          barberName,
          serviceName,
          date,
          time
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
            `Your appointment with ${barberName} is in 2 hours (${time})`,
            { appointmentId: appointment.id }
          );
        }
        
        sentCount++;
      }

      // Send to barber
      if (barberEmail) {
        const emailBody = generate2HourReminderEmail(
          barberName,
          clientName,
          serviceName,
          date,
          time
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
              `Appointment with ${clientName} is in 2 hours (${time})`,
              { appointmentId: appointment.id }
            );
          }
        }
        
        sentCount++;
      }

      // Mark as sent
      await prisma.appointment.update({
        where: { id: appointment.id },
        data: { notification2hSent: true },
      });
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

      // Send to client
      if (clientEmail) {
        const emailBody = generate30MinuteReminderEmail(
          clientName,
          barberName,
          serviceName,
          date,
          time
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
            `Your appointment with ${barberName} is at ${time}. Please don’t be late!`,
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
          time
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
              `Appointment with ${clientName} in 30 minutes (${time})`,
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

    return NextResponse.json({
      success: true,
      message: `Successfully processed ${sentCount} notifications`,
      details: {
        reminders24h: appointments24h.length,
        reminders12h: appointments12h.length,
        reminders2h: appointments2h.length,
        reminders30m: appointments30m.length,
        thankYou: completedAppointments.length,
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
