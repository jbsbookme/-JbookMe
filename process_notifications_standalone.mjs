import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config({ path: join(__dirname, '.env') });

const prisma = new PrismaClient();

async function processNotifications() {
  try {
    const now = new Date();
    console.log(`\n=== Processing notifications at: ${now.toISOString()} ===\n`);
    
    const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const in12Hours = new Date(now.getTime() + 12 * 60 * 60 * 1000);
    const in2Hours = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    const in30Minutes = new Date(now.getTime() + 30 * 60 * 1000);

    let sentCount = 0;
    const results = {
      reminders24h: 0,
      reminders12h: 0,
      reminders2h: 0,
      reminders30m: 0,
      thankYou: 0,
    };

    // ===== 24-HOUR REMINDERS =====
    console.log('Checking for 24-hour reminders...');
    const appointments24h = await prisma.appointment.findMany({
      where: {
        date: {
          gte: in24Hours,
          lte: new Date(in24Hours.getTime() + 60 * 60 * 1000),
        },
        status: {
          in: ['CONFIRMED', 'PENDING'],
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

    console.log(`Found ${appointments24h.length} appointments needing 24h reminders`);
    
    for (const appointment of appointments24h) {
      const clientEmail = appointment.client?.email;
      const barberEmail = appointment.barber?.user?.email;
      
      if (clientEmail || barberEmail) {
        console.log(`  - Appointment ${appointment.id}: ${appointment.client?.name} with ${appointment.barber?.user?.name} at ${appointment.time}`);
        
        // In a real scenario, emails would be sent here
        // For now, we just mark as sent
        await prisma.appointment.update({
          where: { id: appointment.id },
          data: { notification24hSent: true },
        });
        
        sentCount += (clientEmail ? 1 : 0) + (barberEmail ? 1 : 0);
        results.reminders24h++;
      }
    }

    // ===== 12-HOUR REMINDERS =====
    console.log('\nChecking for 12-hour reminders...');
    const appointments12h = await prisma.appointment.findMany({
      where: {
        date: {
          gte: in12Hours,
          lte: new Date(in12Hours.getTime() + 60 * 60 * 1000),
        },
        status: {
          in: ['CONFIRMED', 'PENDING'],
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

    console.log(`Found ${appointments12h.length} appointments needing 12h reminders`);
    
    for (const appointment of appointments12h) {
      const clientEmail = appointment.client?.email;
      const barberEmail = appointment.barber?.user?.email;
      
      if (clientEmail || barberEmail) {
        console.log(`  - Appointment ${appointment.id}: ${appointment.client?.name} with ${appointment.barber?.user?.name} at ${appointment.time}`);
        
        await prisma.appointment.update({
          where: { id: appointment.id },
          data: { notification12hSent: true },
        });
        
        sentCount += (clientEmail ? 1 : 0) + (barberEmail ? 1 : 0);
        results.reminders12h++;
      }
    }

    // ===== 2-HOUR REMINDERS =====
    console.log('\nChecking for 2-hour reminders...');
    const appointments2h = await prisma.appointment.findMany({
      where: {
        date: {
          gte: in2Hours,
          lte: new Date(in2Hours.getTime() + 30 * 60 * 1000),
        },
        status: {
          in: ['CONFIRMED', 'PENDING'],
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

    console.log(`Found ${appointments2h.length} appointments needing 2h reminders`);
    
    for (const appointment of appointments2h) {
      const clientEmail = appointment.client?.email;
      const barberEmail = appointment.barber?.user?.email;
      
      if (clientEmail || barberEmail) {
        console.log(`  - Appointment ${appointment.id}: ${appointment.client?.name} with ${appointment.barber?.user?.name} at ${appointment.time}`);
        
        await prisma.appointment.update({
          where: { id: appointment.id },
          data: { notification2hSent: true },
        });
        
        sentCount += (clientEmail ? 1 : 0) + (barberEmail ? 1 : 0);
        results.reminders2h++;
      }
    }

    // ===== 30-MINUTE REMINDERS =====
    console.log('\nChecking for 30-minute reminders...');
    const appointments30m = await prisma.appointment.findMany({
      where: {
        date: {
          gte: in30Minutes,
          lte: new Date(in30Minutes.getTime() + 15 * 60 * 1000),
        },
        status: {
          in: ['CONFIRMED', 'PENDING'],
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

    console.log(`Found ${appointments30m.length} appointments needing 30m reminders`);
    
    for (const appointment of appointments30m) {
      const clientEmail = appointment.client?.email;
      const barberEmail = appointment.barber?.user?.email;
      
      if (clientEmail || barberEmail) {
        console.log(`  - Appointment ${appointment.id}: ${appointment.client?.name} with ${appointment.barber?.user?.name} at ${appointment.time}`);
        
        await prisma.appointment.update({
          where: { id: appointment.id },
          data: { notification30mSent: true },
        });
        
        sentCount += (clientEmail ? 1 : 0) + (barberEmail ? 1 : 0);
        results.reminders30m++;
      }
    }

    // ===== THANK YOU MESSAGES =====
    console.log('\nChecking for thank you messages...');
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);

    const completedAppointments = await prisma.appointment.findMany({
      where: {
        date: {
          gte: startOfDay,
          lte: now,
        },
        status: 'COMPLETED',
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

    console.log(`Found ${completedAppointments.length} completed appointments needing thank you messages`);
    
    for (const appointment of completedAppointments) {
      const clientEmail = appointment.client?.email;
      
      if (clientEmail) {
        console.log(`  - Appointment ${appointment.id}: Sending thank you to ${appointment.client?.name}`);
        
        await prisma.appointment.update({
          where: { id: appointment.id },
          data: { thankYouSent: true },
        });
        
        sentCount++;
        results.thankYou++;
      }
    }

    console.log(`\n=== Processing Complete ===`);
    console.log(`Total notifications processed: ${sentCount}`);
    console.log(`Details:`, results);
    
    return {
      success: true,
      message: `Procesadas exitosamente ${sentCount} notificaciones`,
      details: results,
      timestamp: now.toISOString(),
    };
    
  } catch (error) {
    console.error('\n=== Error processing notifications ===');
    console.error(error);
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    };
  } finally {
    await prisma.$disconnect();
  }
}

// Run the processor
processNotifications()
  .then(result => {
    console.log('\n=== Final Result ===');
    console.log(JSON.stringify(result, null, 2));
    process.exit(result.success ? 0 : 1);
  })
  .catch(error => {
    console.error('\n=== Fatal Error ===');
    console.error(error);
    process.exit(1);
  });
