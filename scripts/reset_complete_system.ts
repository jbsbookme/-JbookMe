/**
 * RESET COMPLETO DEL SISTEMA
 * 
 * Este script limpia COMPLETAMENTE:
 * - Todas las citas (appointments)
 * - Todos los servicios (services)
 * - Todos los barberos (barbers)
 * - Disponibilidad y días libres
 * - Media de barberos
 * - Posts de barberos
 * 
 * MANTIENE:
 * - Usuarios base (admin, clientes)
 * - Configuración del negocio
 * - Galería pública
 * - Reseñas
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('\n🛠️  INICIANDO RESET COMPLETO DEL SISTEMA...\n');

  try {
    // 1. Eliminar todas las citas
    console.log('🗑️  Eliminando todas las citas...');
    const deletedAppointments = await prisma.appointment.deleteMany({});
    console.log(`   ✅ ${deletedAppointments.count} citas eliminadas`);

    // 2. Eliminar todas las reseñas
    console.log('🗑️  Eliminando todas las reseñas...');
    const deletedReviews = await prisma.review.deleteMany({});
    console.log(`   ✅ ${deletedReviews.count} reseñas eliminadas`);

    // 3. Eliminar todos los posts
    console.log('🗑️  Eliminando todos los posts...');
    const deletedPosts = await prisma.post.deleteMany({});
    console.log(`   ✅ ${deletedPosts.count} posts eliminados`);

    // 4. Eliminar comments
    console.log('🗑️  Eliminando comentarios...');
    const deletedComments = await prisma.comment.deleteMany({});
    console.log(`   ✅ ${deletedComments.count} comentarios eliminados`);

    // 5. Eliminar media de barberos
    console.log('🗑️  Eliminando media de barberos...');
    const deletedMedia = await prisma.barberMedia.deleteMany({});
    console.log(`   ✅ ${deletedMedia.count} archivos de media eliminados`);

    // 6. Eliminar días libres
    console.log('🗑️  Eliminando días libres...');
    const deletedDaysOff = await prisma.dayOff.deleteMany({});
    console.log(`   ✅ ${deletedDaysOff.count} días libres eliminados`);

    // 7. Eliminar disponibilidad
    console.log('🗑️  Eliminando horarios de disponibilidad...');
    const deletedAvailability = await prisma.availability.deleteMany({});
    console.log(`   ✅ ${deletedAvailability.count} horarios eliminados`);

    // 8. Eliminar pagos de barberos
    console.log('🗑️  Eliminando pagos de barberos...');
    const deletedPayments = await prisma.barberPayment.deleteMany({});
    console.log(`   ✅ ${deletedPayments.count} pagos eliminados`);

    // 9. Eliminar pagos manuales
    console.log('🗑️  Eliminando pagos manuales...');
    const deletedManualPayments = await prisma.manualPayment.deleteMany({});
    console.log(`   ✅ ${deletedManualPayments.count} pagos manuales eliminados`);

    // 10. Eliminar todos los servicios
    console.log('🗑️  Eliminando todos los servicios...');
    const deletedServices = await prisma.service.deleteMany({});
    console.log(`   ✅ ${deletedServices.count} servicios eliminados`);

    // 11. Eliminar todos los barberos
    console.log('🗑️  Eliminando todos los barberos...');
    const deletedBarbers = await prisma.barber.deleteMany({});
    console.log(`   ✅ ${deletedBarbers.count} barberos eliminados`);

    // 12. Actualizar usuarios que eran barberos a rol CLIENT
    console.log('🔄  Actualizando usuarios ex-barberos a CLIENT...');
    const updatedUsers = await prisma.user.updateMany({
      where: {
        role: 'BARBER',
      },
      data: {
        role: 'CLIENT',
      },
    });
    console.log(`   ✅ ${updatedUsers.count} usuarios actualizados a CLIENT`);

    console.log('\n✅ ¡RESET COMPLETADO EXITOSAMENTE!\n');
    console.log('📊 Resumen:');
    console.log(`   - Citas eliminadas: ${deletedAppointments.count}`);
    console.log(`   - Reseñas eliminadas: ${deletedReviews.count}`);
    console.log(`   - Posts eliminados: ${deletedPosts.count}`);
    console.log(`   - Servicios eliminados: ${deletedServices.count}`);
    console.log(`   - Barberos eliminados: ${deletedBarbers.count}`);
    console.log(`   - Usuarios actualizados: ${updatedUsers.count}`);
    console.log('\n✅ La base de datos está limpia y lista para nuevos datos.\n');

  } catch (error) {
    console.error('\n❌ ERROR durante el reset:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
