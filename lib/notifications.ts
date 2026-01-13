import { prisma } from '@/lib/db';
import { sendEmail } from '@/lib/email';
import { NotificationType } from '@prisma/client';
import { formatTime12h } from '@/lib/time';

export type CreateNotificationInput = {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string | null;
  postId?: string | null;
  commentId?: string | null;
  // Optional fields used by some callers; not persisted in current schema.
  priority?: string;
  metadata?: unknown;
};

export async function createNotification(input: CreateNotificationInput) {
  return prisma.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      title: input.title,
      message: input.message,
      link: input.link ?? null,
      postId: input.postId ?? null,
      commentId: input.commentId ?? null,
    },
  });
}

export type AppointmentNotificationData = {
  clientName: string;
  clientEmail: string;
  clientPhone?: string;
  barberName: string;
  barberEmail: string;
  barberPhone?: string;
  serviceName: string;
  date: Date;
  time: string;
  price: number;
  appointmentId: string;
};

export async function sendAppointmentCreatedNotifications(data: AppointmentNotificationData) {
  const results: { clientEmail: boolean; barberEmail: boolean } = {
    clientEmail: false,
    barberEmail: false,
  };

  const timeDisplay = formatTime12h(data.time);

  if (data.clientEmail) {
    results.clientEmail = await sendEmail({
      to: data.clientEmail,
      subject: 'Appointment request received',
      text: `Hi ${data.clientName}, we received your appointment request for ${data.serviceName} on ${data.date.toDateString()} at ${timeDisplay}.\n\nPlease confirm by replying YES to the SMS we sent you (or reply NO to cancel).`,
    });
  }

  if (data.barberEmail) {
    results.barberEmail = await sendEmail({
      to: data.barberEmail,
      subject: 'New appointment (pending confirmation)',
      text: `Hi ${data.barberName}, a new appointment request (${data.serviceName}) was created for ${data.date.toDateString()} at ${timeDisplay}.\n\nStatus: PENDING (awaiting client SMS confirmation).`,
    });
  }

  return results;
}

export async function sendAppointmentCancelledNotifications(data: AppointmentNotificationData) {
  const results: { clientEmail: boolean; barberEmail: boolean } = {
    clientEmail: false,
    barberEmail: false,
  };

  if (data.clientEmail) {
    results.clientEmail = await sendEmail({
      to: data.clientEmail,
      subject: 'Appointment cancelled',
      text: `Hi ${data.clientName}, your appointment for ${data.serviceName} has been cancelled.`,
    });
  }

  if (data.barberEmail) {
    results.barberEmail = await sendEmail({
      to: data.barberEmail,
      subject: 'Appointment cancelled',
      text: `Hi ${data.barberName}, an appointment (${data.serviceName}) was cancelled.`,
    });
  }

  return results;
}
