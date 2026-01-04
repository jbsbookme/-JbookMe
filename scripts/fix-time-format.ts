import { config } from 'dotenv';
import { PrismaClient } from '@prisma/client';

config();
const prisma = new PrismaClient();

async function fixTimeFormat() {
  try {
    console.log('\n=== BUSCANDO HORARIOS INVÁLIDOS ===\n');
    
    const allAvailability = await prisma.availability.findMany({
      include: {
        barber: {
          include: {
            user: true,
          },
        },
      },
    });

    let fixedCount = 0;
    
    for (const av of allAvailability) {
      // Parse hours
      const startHour = parseInt(av.startTime.split(':')[0]);
      const endHour = parseInt(av.endTime.split(':')[0]);
      
      // Check if end time is before start time OR end time is 08:00 (common error)
      if (endHour < startHour || endHour === 8) {
        console.log(`\n❌ HORARIO INVÁLIDO DETECTADO:`);
        console.log(`   Barbero: ${av.barber.user.name}`);
        console.log(`   Día: ${av.dayOfWeek}`);
        console.log(`   Horario actual: ${av.startTime} - ${av.endTime}`);
        
        // Fix: Change 08:00 to 20:00 (8 PM)
        const newEndTime = '20:00';
        
        await prisma.availability.update({
          where: { id: av.id },
          data: { endTime: newEndTime },
        });
        
        console.log(`   ✅ CORREGIDO A: ${av.startTime} - ${newEndTime}`);
        fixedCount++;
      }
    }
    
    if (fixedCount === 0) {
      console.log('✅ No se encontraron horarios inválidos\n');
    } else {
      console.log(`\n✅ Total de horarios corregidos: ${fixedCount}\n`);
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixTimeFormat();
