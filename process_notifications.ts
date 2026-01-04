import { PrismaClient, AppointmentStatus } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

const prisma = new PrismaClient();

// Email sending function (mock for now since we don't have SMTP configured)
async function sendEmail(options: { to: string; subject: string; body: string }) {
  console.log(`📧 Email sent to ${options.to}: ${options.subject}`);
  return true;
}

function generate24HourReminderEmail(
  recipientName: string,
  otherPartyName: string,
  serviceName: string,
  date: string,
  time: string
): string {
  return `Hola ${recipientName},\n\nTe recordamos que tienes una cita mañana:\n- Servicio: ${serviceName}\n- Con: ${otherPartyName}\n- Fecha: ${date}\n- Hora: ${time}\n\n¡Te esperamos!`;
}

function generate2HourReminderEmail(
  recipientName: string,
  otherPartyName: string,
  serviceName: string,
  date: string,
  time: string
): string {
  return `Hola ${recipientName},\n\n¡Tu cita es en 2 horas!\n- Servicio: ${serviceName}\n- Con: ${otherPartyName}\n- Fecha: ${date}\n- Hora: ${time}\n\n¡Nos vemos pronto!`;
}

function generateThankYouEmail(
  clientName: string,
  barberName: string,
  serviceName: string
): string {
  return `Hola ${clientName},\n\n¡Gracias por visitarnos!\n\nEsperamos que hayas disfrutado de tu ${serviceName} con ${barberName}.\n\n¡Esperamos verte pronto!`;
}

async function processNotifications() {
  try {
    const now = new Date();
    const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const in2Hours = new Date(now.getTime() + 2 * 60 * 60 * 1000);

    let sentCount = 0;
    const results = {
      reminders24h: 0,
      reminders2h: 0,
      thankYou: 0,
    };

    // ===== 24-HOUR REMINDERS =====
    const appointments24h = await prisma.appointment.findMany({
      where: {
        date: {
          gte: in24Hours,
          lte: new Date(in24Hours.getTime() + 60 * 60 * 1000),
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
      const clientName = appointment.client?.name || 'Cliente';
      const barberName = appointment.barber?.user?.name || 'Barbero';
      const serviceName = appointment.service?.name || 'Servicio';
      const date = new Date(appointment.date).toLocaleDateString('es-ES', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      const time = appointment.time;

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
          subject: '⏰ Recordatorio: Tu cita es mañana',
          body: emailBody,
        });
        sentCount++;
      }

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
          subject: '⏰ Recordatorio: Cita programada mañana',
          body: emailBody,
        });
        sentCount++;
      }

      await prisma.appointment.update({
        where: { id: appointment.id },
        data: { notification24hSent: true },
      });
      results.reminders24h++;
    }

    // ===== 2-HOUR REMINDERS =====
    const appointments2h = await prisma.appointment.findMany({
      where: {
        date: {
          gte: in2Hours,
          lte: new Date(in2Hours.getTime() + 30 * 60 * 1000),
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
      const clientName = appointment.client?.name || 'Cliente';
      const barberName = appointment.barber?.user?.name || 'Barbero';
      const serviceName = appointment.service?.name || 'Servicio';
      const date = new Date(appointment.date).toLocaleDateString('es-ES', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      const time = appointment.time;

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
          subject: '⏰ ¡Tu cita es en 2 horas!',
          body: emailBody,
        });
        sentCount++;
      }

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
          subject: '⏰ Cita en 2 horas',
          body: emailBody,
        });
        sentCount++;
      }

      await prisma.appointment.update({
        where: { id: appointment.id },
        data: { notification2hSent: true },
      });
      results.reminders2h++;
    }

    // ===== THANK YOU MESSAGES =====
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
      const clientName = appointment.client?.name || 'Cliente';
      const barberName = appointment.barber?.user?.name || 'Barbero';
      const serviceName = appointment.service?.name || 'Servicio';

      if (clientEmail) {
        const emailBody = generateThankYouEmail(clientName, barberName, serviceName);
        await sendEmail({
          to: clientEmail,
          subject: '💈 ¡Gracias por tu visita!',
          body: emailBody,
        });
        sentCount++;

        await prisma.appointment.update({
          where: { id: appointment.id },
          data: { thankYouSent: true },
        });
        results.thankYou++;
      }
    }

    return {
      success: true,
      message: `Procesadas exitosamente ${sentCount} notificaciones`,
      details: results,
    };
  } catch (error) {
    console.error('Error processing notifications:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
processNotifications()
  .then((result) => {
    console.log('\n✅ Proceso completado exitosamente');
    console.log(JSON.stringify(result, null, 2));
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error en el proceso:', error);
    process.exit(1);
  });
