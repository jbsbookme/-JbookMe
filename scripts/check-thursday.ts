import { config } from 'dotenv';
import { PrismaClient } from '@prisma/client';

config();
const prisma = new PrismaClient();

async function checkThursday() {
  try {
    const barbers = await prisma.barber.findMany({
      include: {
        user: true,
        availability: {
          where: {
            dayOfWeek: 'THURSDAY'
          }
        },
      },
    });

    console.log('\n=== DISPONIBILIDAD PARA JUEVES (THURSDAY) ===\n');
    
    for (const barber of barbers) {
      console.log(`📌 ${barber.user.name} (${barber.user.email})`);
      console.log(`   ID: ${barber.id}`);
      
      if (barber.availability.length > 0) {
        barber.availability.forEach(av => {
          console.log(`   ✅ JUEVES: ${av.startTime} - ${av.endTime} ${av.isAvailable ? '(Disponible)' : '(NO disponible)'}`);
        });
      } else {
        console.log('   ❌ NO TRABAJA LOS JUEVES');
      }
      console.log('');
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkThursday();
