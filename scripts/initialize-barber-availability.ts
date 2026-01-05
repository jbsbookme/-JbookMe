import { PrismaClient, DayOfWeek } from '@prisma/client';
import { config } from 'dotenv';

// Cargar variables de entorno
config();

const prisma = new PrismaClient();

// Horarios por defecto: Lunes a Sábado, 9:00 AM - 8:00 PM
const DEFAULT_SCHEDULE = [
  { dayOfWeek: DayOfWeek.MONDAY, startTime: '09:00', endTime: '20:00', isAvailable: true },
  { dayOfWeek: DayOfWeek.TUESDAY, startTime: '09:00', endTime: '20:00', isAvailable: true },
  { dayOfWeek: DayOfWeek.WEDNESDAY, startTime: '09:00', endTime: '20:00', isAvailable: true },
  { dayOfWeek: DayOfWeek.THURSDAY, startTime: '09:00', endTime: '20:00', isAvailable: true },
  { dayOfWeek: DayOfWeek.FRIDAY, startTime: '09:00', endTime: '20:00', isAvailable: true },
  { dayOfWeek: DayOfWeek.SATURDAY, startTime: '09:00', endTime: '20:00', isAvailable: true },
  { dayOfWeek: DayOfWeek.SUNDAY, startTime: '09:00', endTime: '20:00', isAvailable: false },
];

async function initializeBarberAvailability() {
  console.log('🚀 Iniciando configuración de horarios...\n');

  try {
    // Obtener todos los barberos
    const barbers = await prisma.barber.findMany({
      include: {
        availability: true,
      },
    });

    console.log(`📊 Total de barberos encontrados: ${barbers.length}\n`);

    let barbersUpdated = 0;
    let barbersSkipped = 0;

    for (const barber of barbers) {
      const userName = await prisma.user.findUnique({
        where: { id: barber.userId },
        select: { name: true },
      });

      console.log(`👤 Procesando: ${userName?.name || 'Sin nombre'}`);

      // Verificar si ya tiene horarios configurados
      if (barber.availability.length > 0) {
        console.log(`   ⏭️  Ya tiene ${barber.availability.length} horarios configurados. Saltando...\n`);
        barbersSkipped++;
        continue;
      }

      // Crear horarios por defecto
      for (const schedule of DEFAULT_SCHEDULE) {
        await prisma.availability.create({
          data: {
            barberId: barber.id,
            ...schedule,
          },
        });
      }

      console.log(`   ✅ Horarios configurados exitosamente (Lun-Sáb: 9:00-18:00, Dom: Cerrado)\n`);
      barbersUpdated++;
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 RESUMEN:');
    console.log('='.repeat(60));
    console.log(`✅ Barberos actualizados: ${barbersUpdated}`);
    console.log(`⏭️  Barberos saltados (ya tenían horarios): ${barbersSkipped}`);
    console.log(`📋 Total procesados: ${barbers.length}`);
    console.log('='.repeat(60) + '\n');

  } catch (error) {
    console.error('❌ Error al configurar horarios:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

initializeBarberAvailability()
  .then(() => {
    console.log('✅ Script completado exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script falló:', error);
    process.exit(1);
  });
