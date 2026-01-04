import { config } from 'dotenv';
import { PrismaClient } from '@prisma/client';

config();
const prisma = new PrismaClient();

async function checkBarbers() {
  try {
    const barbers = await prisma.barber.findMany({
      include: {
        user: true,
        availability: true,
      },
    });

    console.log('\n=== TODOS LOS BARBEROS ===\n');
    
    for (const barber of barbers) {
      console.log(`📌 Barbero: ${barber.user.name}`);
      console.log(`   ID: ${barber.id}`);
      console.log(`   Email: ${barber.user.email}`);
      console.log(`   Disponibilidad configurada: ${barber.availability.length} días`);
      
      if (barber.availability.length > 0) {
        console.log('   Días:');
        barber.availability.forEach(av => {
          console.log(`     - ${av.dayOfWeek}: ${av.startTime} - ${av.endTime} (${av.isAvailable ? 'Disponible' : 'No disponible'})`);
        });
      } else {
        console.log('   ⚠️  SIN DISPONIBILIDAD CONFIGURADA');
      }
      console.log('');
    }
    
    console.log(`\nTotal de barberos: ${barbers.length}`);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkBarbers();
