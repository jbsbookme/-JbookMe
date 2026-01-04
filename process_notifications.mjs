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
    console.log(`Processing notifications at: ${now.toISOString()}`);
    
    // Get all pending appointments
    const appointments = await prisma.appointment.findMany({
      where: {
        status: 'CONFIRMED',
        dateTime: {
          gte: now
        }
      },
      include: {
        user: true,
        barber: true,
        service: true
      }
    });
    
    console.log(`Found ${appointments.length} confirmed appointments`);
    
    let notificationsSent = 0;
    
    for (const appointment of appointments) {
      const appointmentTime = new Date(appointment.dateTime);
      const timeDiff = appointmentTime - now;
      const hoursDiff = timeDiff / (1000 * 60 * 60);
      
      // Check if we need to send 24h reminder
      if (hoursDiff <= 24 && hoursDiff > 23) {
        console.log(`24h reminder needed for appointment ${appointment.id}`);
        notificationsSent++;
      }
      
      // Check if we need to send 2h reminder
      if (hoursDiff <= 2 && hoursDiff > 1) {
        console.log(`2h reminder needed for appointment ${appointment.id}`);
        notificationsSent++;
      }
    }
    
    console.log(`Notifications processed: ${notificationsSent}`);
    
    return {
      success: true,
      appointmentsChecked: appointments.length,
      notificationsSent: notificationsSent
    };
    
  } catch (error) {
    console.error('Error processing notifications:', error);
    return {
      success: false,
      error: error.message
    };
  } finally {
    await prisma.$disconnect();
  }
}

processNotifications()
  .then(result => {
    console.log('Result:', JSON.stringify(result, null, 2));
    process.exit(result.success ? 0 : 1);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
