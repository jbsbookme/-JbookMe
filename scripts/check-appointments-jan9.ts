import { config } from 'dotenv';
import { PrismaClient } from '@prisma/client';

config();
const prisma = new PrismaClient();

async function checkAppointments() {
  try {
    // January 9, 2026
    const targetDate = new Date('2026-01-09');
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const appointments = await prisma.appointment.findMany({
      where: {
        date: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      include: {
        barber: {
          include: {
            user: true,
          },
        },
        client: true,
        service: true,
      },
    });

    console.log('\n=== CITAS PARA JUEVES 9 DE ENERO 2026 ===\n');
    
    if (appointments.length === 0) {
      console.log('✅ NO HAY CITAS RESERVADAS PARA ESTE DÍA');
      console.log('✅ TODOS LOS HORARIOS DEBERÍAN ESTAR DISPONIBLES\n');
    } else {
      console.log(`📌 Se encontraron ${appointments.length} citas:\n`);
      
      appointments.forEach(apt => {
        console.log(`- ${apt.barber.user.name}: ${apt.time} (${apt.service.name})`);
        console.log(`  Cliente: ${apt.client.name}`);
        console.log(`  Estado: ${apt.status}\n`);
      });
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAppointments();
