const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function processNotifications() {
  try {
    const now = new Date();
    const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const in12Hours = new Date(now.getTime() + 12 * 60 * 60 * 1000);
    const in2Hours = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    const in30Minutes = new Date(now.getTime() + 30 * 60 * 1000);

    let sentCount = 0;

    // 24-HOUR REMINDERS
    const appointments24h = await prisma.appointment.findMany({
      where: {
        date: {
          gte: in24Hours,
          lte: new Date(in24Hours.getTime() + 60 * 60 * 1000),
        },
        status: { in: ['CONFIRMED', 'PENDING'] },
        notification24hSent: false,
      },
      include: {
        client: true,
        barber: { include: { user: true } },
        service: true,
      },
    });

    for (const appointment of appointments24h) {
      await prisma.appointment.update({
        where: { id: appointment.id },
        data: { notification24hSent: true },
      });
      sentCount++;
    }

    // 12-HOUR REMINDERS
    const appointments12h = await prisma.appointment.findMany({
      where: {
        date: {
          gte: in12Hours,
          lte: new Date(in12Hours.getTime() + 60 * 60 * 1000),
        },
        status: { in: ['CONFIRMED', 'PENDING'] },
        notification12hSent: false,
      },
      include: {
        client: true,
        barber: { include: { user: true } },
        service: true,
      },
    });

    for (const appointment of appointments12h) {
      await prisma.appointment.update({
        where: { id: appointment.id },
        data: { notification12hSent: true },
      });
      sentCount++;
    }

    // 2-HOUR REMINDERS
    const appointments2h = await prisma.appointment.findMany({
      where: {
        date: {
          gte: in2Hours,
          lte: new Date(in2Hours.getTime() + 30 * 60 * 1000),
        },
        status: { in: ['CONFIRMED', 'PENDING'] },
        notification2hSent: false,
      },
      include: {
        client: true,
        barber: { include: { user: true } },
        service: true,
      },
    });

    for (const appointment of appointments2h) {
      await prisma.appointment.update({
        where: { id: appointment.id },
        data: { notification2hSent: true },
      });
      sentCount++;
    }

    // 30-MINUTE REMINDERS
    const appointments30m = await prisma.appointment.findMany({
      where: {
        date: {
          gte: in30Minutes,
          lte: new Date(in30Minutes.getTime() + 15 * 60 * 1000),
        },
        status: { in: ['CONFIRMED', 'PENDING'] },
        notification30mSent: false,
      },
      include: {
        client: true,
        barber: { include: { user: true } },
        service: true,
      },
    });

    for (const appointment of appointments30m) {
      await prisma.appointment.update({
        where: { id: appointment.id },
        data: { notification30mSent: true },
      });
      sentCount++;
    }

    // THANK YOU MESSAGES
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);

    const completedAppointments = await prisma.appointment.findMany({
      where: {
        date: { gte: startOfDay, lte: now },
        status: 'COMPLETED',
        thankYouSent: false,
      },
      include: {
        client: true,
        barber: { include: { user: true } },
        service: true,
      },
    });

    for (const appointment of completedAppointments) {
      await prisma.appointment.update({
        where: { id: appointment.id },
        data: { thankYouSent: true },
      });
      sentCount++;
    }

    console.log(JSON.stringify({
      success: true,
      message: `Procesadas exitosamente ${sentCount} notificaciones`,
      details: {
        reminders24h: appointments24h.length,
        reminders12h: appointments12h.length,
        reminders2h: appointments2h.length,
        reminders30m: appointments30m.length,
        thankYou: completedAppointments.length,
      },
    }));

    await prisma.$disconnect();
    process.exit(0);
  } catch (error) {
    console.error(JSON.stringify({ error: error.message }));
    await prisma.$disconnect();
    process.exit(1);
  }
}

processNotifications();
