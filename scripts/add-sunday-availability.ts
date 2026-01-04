import { config } from 'dotenv';
import { PrismaClient, DayOfWeek } from '@prisma/client';

config();
const prisma = new PrismaClient();

async function addSundayAvailability() {
  try {
    const barbers = await prisma.barber.findMany({
      include: {
        user: true,
        availability: true,
      },
    });

    console.log(`\n=== AGREGANDO DOMINGO A TODOS LOS BARBEROS ===\n`);
    
    for (const barber of barbers) {
      console.log(`📌 Barbero: ${barber.user.name}`);
      console.log(`   ID: ${barber.id}`);
      
      // Check if barber already has Sunday availability
      const hasSunday = barber.availability.some(av => av.dayOfWeek === DayOfWeek.SUNDAY);
      
      if (hasSunday) {
        console.log(`   ✓ Ya tiene disponibilidad para DOMINGO\n`);
      } else {
        console.log(`   ⚠️  NO tiene DOMINGO, agregando...`);
        
        await prisma.availability.create({
          data: {
            barberId: barber.id,
            dayOfWeek: DayOfWeek.SUNDAY,
            startTime: '09:00',
            endTime: '18:00',
            isAvailable: true,
          },
        });
        
        console.log(`   ✅ DOMINGO agregado (9 AM - 6 PM)\n`);
      }
    }
    
    console.log('✅ Proceso completado!\n');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addSundayAvailability();
