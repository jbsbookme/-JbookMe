import { prisma } from '@/lib/db';
import { sendEmail } from '@/lib/email';
import { NotificationType } from '@prisma/client';

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

  if (data.clientEmail) {
    results.clientEmail = await sendEmail({
      to: data.clientEmail,
      subject: 'Appointment booked',
      text: `Hi ${data.clientName}, your appointment for ${data.serviceName} was booked for ${data.date.toDateString()} at ${data.time}.`,
    });
  }

  if (data.barberEmail) {
    results.barberEmail = await sendEmail({
      to: data.barberEmail,
      subject: 'New appointment',
      text: `Hi ${data.barberName}, you have a new appointment (${data.serviceName}) for ${data.date.toDateString()} at ${data.time}.\n\n⭐ Thanks for being part of JBBarbershop.`,
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
