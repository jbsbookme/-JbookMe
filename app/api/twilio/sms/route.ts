import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { AppointmentStatus } from '@prisma/client';
import { createNotification } from '@/lib/notifications';
import { sendWebPushToUser } from '@/lib/push';
import { formatTime12h } from '@/lib/time';

export const dynamic = 'force-dynamic';

function isWebhookAuthorized(request: Request): boolean {
  const secret = process.env.TWILIO_WEBHOOK_SECRET;
  if (!secret) return true;

  try {
    const url = new URL(request.url);
    return url.searchParams.get('secret') === secret;
  } catch {
    return false;
  }
}

function digitsOnly(input: string): string {
  return String(input || '').replace(/\D/g, '');
}

function toTwiml(message: string) {
  const escaped = message
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  return `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escaped}</Message></Response>`;
}

export async function POST(request: Request) {
  if (!isWebhookAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const form = await request.formData();
    const fromRaw = String(form.get('From') || '').trim();
    const bodyRaw = String(form.get('Body') || '').trim();

    const bodyUpper = bodyRaw.toUpperCase();

    console.log('[Twilio][InboundSMS]', { from: fromRaw, body: bodyRaw });

    const fromDigits = digitsOnly(fromRaw);
    const last10 = fromDigits.length >= 10 ? fromDigits.slice(-10) : fromDigits;

    const user = await prisma.user.findFirst({
      where: {
        phone: {
          not: null,
        },
        OR: [
          { phone: { endsWith: last10 } },
          { phone: { equals: `+1${last10}` } },
          { phone: { equals: last10 } },
        ],
      },
      select: { id: true, phone: true },
    });

    if (!user) {
      const message = "JB's Barbershop 💈\nPlease reply YES to confirm or NO to cancel your appointment.";
      return new NextResponse(toTwiml(message), {
        status: 200,
        headers: { 'Content-Type': 'text/xml' },
      });
    }

    const now = new Date();
    const in48h = new Date(now.getTime() + 48 * 60 * 60 * 1000);
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    const appointment = await prisma.appointment.findFirst({
      where: {
        clientId: user.id,
        date: { gte: oneHourAgo, lte: in48h },
        status: { in: [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED] },
      },
      orderBy: { date: 'asc' },
      select: {
        id: true,
        status: true,
        time: true,
        date: true,
        barber: { select: { userId: true, user: { select: { name: true } } } },
        client: { select: { name: true } },
      },
    });

    if (!appointment) {
      const message = "JB's Barbershop 💈\nPlease reply YES to confirm or NO to cancel your appointment.";
      return new NextResponse(toTwiml(message), {
        status: 200,
        headers: { 'Content-Type': 'text/xml' },
      });
    }

    if (bodyUpper === 'YES') {
      await prisma.appointment.update({
        where: { id: appointment.id },
        data: {
          status: AppointmentStatus.CONFIRMED,
          autoConfirmed: true,
        },
      });

      console.log('[Twilio][InboundSMS] confirmed', { appointmentId: appointment.id });

      try {
        const barberUserId = appointment.barber?.userId;
        if (barberUserId) {
          const dateShort = new Date(appointment.date).toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
          });
          const clientName = appointment.client?.name || 'Client';
          const timeDisplay = formatTime12h(appointment.time);

          await createNotification({
            userId: barberUserId,
            type: 'APPOINTMENT_REMINDER',
            title: 'Appointment confirmed',
            message: `Confirmed: ${dateShort} at ${timeDisplay} with ${clientName}`,
            link: '/dashboard/barbero',
          });

          await sendWebPushToUser({
            userId: barberUserId,
            title: 'Appointment confirmed',
            body: `Confirmed: ${dateShort} at ${timeDisplay}`,
            url: '/dashboard/barbero',
            data: { appointmentId: appointment.id },
          });
        }
      } catch (error) {
        console.error('[Twilio][InboundSMS] notify barber confirmed error', error);
      }

      const message = 'Thank you! Your appointment is confirmed 💈';
      return new NextResponse(toTwiml(message), {
        status: 200,
        headers: { 'Content-Type': 'text/xml' },
      });
    }

    if (bodyUpper === 'NO') {
      await prisma.appointment.update({
        where: { id: appointment.id },
        data: {
          status: AppointmentStatus.CANCELLED,
          cancelledAt: new Date(),
          cancellationReason: 'Cancelled via SMS',
          autoConfirmed: false,
        },
      });

      console.log('[Twilio][InboundSMS] cancelled', { appointmentId: appointment.id });

      try {
        const barberUserId = appointment.barber?.userId;
        if (barberUserId) {
          const dateShort = new Date(appointment.date).toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
          });
          const clientName = appointment.client?.name || 'Client';
          const timeDisplay = formatTime12h(appointment.time);

          await createNotification({
            userId: barberUserId,
            type: 'APPOINTMENT_REMINDER',
            title: 'Appointment cancelled',
            message: `Cancelled: ${dateShort} at ${timeDisplay} (${clientName})`,
            link: '/dashboard/barbero',
          });

          await sendWebPushToUser({
            userId: barberUserId,
            title: 'Appointment cancelled',
            body: `Cancelled: ${dateShort} at ${timeDisplay}`,
            url: '/dashboard/barbero',
            data: { appointmentId: appointment.id },
          });
        }
      } catch (error) {
        console.error('[Twilio][InboundSMS] notify barber cancelled error', error);
      }

      const message =
        'Your appointment has been canceled.\nYou can book again anytime at jbsbookme.com';
      return new NextResponse(toTwiml(message), {
        status: 200,
        headers: { 'Content-Type': 'text/xml' },
      });
    }

    const message = "JB's Barbershop 💈\nPlease reply YES to confirm or NO to cancel your appointment.";
    return new NextResponse(toTwiml(message), {
      status: 200,
      headers: { 'Content-Type': 'text/xml' },
    });
  } catch (error) {
    console.error('[Twilio][InboundSMS] error', error);

    const message = "JB's Barbershop 💈\nPlease reply YES to confirm or NO to cancel your appointment.";
    return new NextResponse(toTwiml(message), {
      status: 200,
      headers: { 'Content-Type': 'text/xml' },
    });
  }
}
