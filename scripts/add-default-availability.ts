import { config } from 'dotenv';
import { PrismaClient, DayOfWeek } from '@prisma/client';

// Load environment variables
config();

const prisma = new PrismaClient();

async function addDefaultAvailability() {
  try {
    // Get all barbers
    const barbers = await prisma.barber.findMany({
      include: {
        availability: true,
      },
    });

    console.log(`Found ${barbers.length} barbers`);

    for (const barber of barbers) {
      console.log(`\nChecking barber: ${barber.id}`);
      console.log(`Current availability count: ${barber.availability.length}`);

      if (barber.availability.length === 0) {
        console.log(`Adding default availability for barber ${barber.id}...`);

        // Add availability for ALL 7 days (Monday to Sunday, 9 AM - 8 PM)
        const daysToAdd: DayOfWeek[] = [
          DayOfWeek.MONDAY,
          DayOfWeek.TUESDAY,
          DayOfWeek.WEDNESDAY,
          DayOfWeek.THURSDAY,
          DayOfWeek.FRIDAY,
          DayOfWeek.SATURDAY,
          DayOfWeek.SUNDAY,
        ];

        for (const day of daysToAdd) {
          await prisma.availability.create({
            data: {
              barberId: barber.id,
              dayOfWeek: day,
              startTime: '09:00',
              endTime: '20:00',
              isAvailable: true,
            },
          });
          console.log(`  ✓ Added ${day}`);
        }

        console.log(`✅ Default availability added for barber ${barber.id}`);
      } else {
        console.log(`✓ Barber ${barber.id} already has availability configured`);
      }
    }

    console.log('\n✅ Done!');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addDefaultAvailability();
