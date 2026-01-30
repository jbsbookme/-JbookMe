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
  clientLocale?: 'en' | 'es';
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
  const isSpanish = data.clientLocale === 'es';
  const dateDisplay = data.date.toLocaleDateString(isSpanish ? 'es-US' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  if (data.clientEmail) {
    results.clientEmail = await sendEmail({
      to: data.clientEmail,
      subject: isSpanish ? 'Cita Confirmada – JBookMe' : 'Appointment Confirmed – JBookMe',
      text: isSpanish
        ? `Hola ${data.clientName},\n\nTu cita ha sido confirmada.\n\nDetalles:\n• Barbero: ${data.barberName}\n• Servicio: ${data.serviceName}\n• Fecha: ${dateDisplay}\n• Hora: ${timeDisplay}\n\nPuedes ver o administrar tu cita en cualquier momento desde la app JBookMe.\n\nLas notificaciones por SMS estarán disponibles próximamente.\n\nGracias por usar JBookMe.`
        : `Hello ${data.clientName},\n\nYour appointment is confirmed.\n\nDetails:\n• Barber: ${data.barberName}\n• Service: ${data.serviceName}\n• Date: ${dateDisplay}\n• Time: ${timeDisplay}\n\nYou can manage or view your appointment anytime in the JBookMe app.\n\nSMS notifications will be enabled soon.\n\nThank you for using JBookMe.`,
    });
  }

  if (data.barberEmail) {
    results.barberEmail = await sendEmail({
      to: data.barberEmail,
      subject: isSpanish ? 'Nueva cita confirmada – JBookMe' : 'New appointment confirmed – JBookMe',
      text: isSpanish
        ? `Hola ${data.barberName},\n\nSe ha confirmado una nueva cita.\n\nDetalles:\n• Cliente: ${data.clientName}\n• Servicio: ${data.serviceName}\n• Fecha: ${dateDisplay}\n• Hora: ${timeDisplay}\n\nLas notificaciones por SMS estarán disponibles próximamente.`
        : `Hello ${data.barberName},\n\nA new appointment has been confirmed.\n\nDetails:\n• Client: ${data.clientName}\n• Service: ${data.serviceName}\n• Date: ${dateDisplay}\n• Time: ${timeDisplay}\n\nSMS notifications will be enabled soon.`,
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
